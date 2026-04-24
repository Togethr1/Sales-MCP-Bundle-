import { describe, expect, it } from "vitest";
import { createFixtureProviderCatalogForAllProviders } from "@sales-mcp/providers";
import {
  buildAccountResearchBrief,
  buildNextActionRecommendation,
  buildAccountStatusSnapshot,
  buildAccountTimeline,
  buildOutboundEmailDraft,
  FixtureIntelligenceClient,
} from "@sales-mcp/workflows";

describe("workflows", () => {
  it("builds an account status snapshot with health and recommendations", async () => {
    const snapshot = await buildAccountStatusSnapshot(
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      createFixtureProviderCatalogForAllProviders(),
      new FixtureIntelligenceClient(),
    );

    expect(snapshot.account.name).toBe("Acme Analytics");
    expect(snapshot.primaryOpportunity?.stage).toBe("Proposal");
    expect(snapshot.healthScore).toBeDefined();
    expect(snapshot.risks.length).toBeGreaterThan(0);
    expect(snapshot.recommendedActions[0]?.summary).toContain("Jane Rivers");
    expect(snapshot.people.filter((person) => person.email === "jane.rivers@acmeanalytics.io")).toHaveLength(1);
    expect(snapshot.people[0]?.resolutionConfidence).toBeDefined();
    expect(snapshot.signals[0]?.rankingRationale).toBeDefined();
    expect(snapshot.provenance).toContain("salesforce");
    expect(snapshot.provenance).toContain("gmail");
  });

  it("builds a research brief with ranked signals and highlights", async () => {
    const brief = await buildAccountResearchBrief(
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      createFixtureProviderCatalogForAllProviders(),
      new FixtureIntelligenceClient(),
    );

    expect(brief.account.name).toBe("Acme Analytics");
    expect(brief.highlights.length).toBe(3);
    expect(brief.signals[0]?.score).toBeGreaterThanOrEqual(brief.signals[1]?.score ?? 0);
    expect(brief.signals[0]?.rankingRationale).toBeDefined();
    expect(brief.techStack.some((item) => item.name === "Salesforce")).toBe(true);
  });

  it("builds a merged account timeline ordered by recency", async () => {
    const timeline = await buildAccountTimeline(
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      createFixtureProviderCatalogForAllProviders(),
    );

    expect(timeline.account.name).toBe("Acme Analytics");
    expect(timeline.entries.length).toBeGreaterThan(5);
    expect(timeline.entries[0]?.happenedAt >= timeline.entries[1]?.happenedAt).toBe(true);
    expect(timeline.entries.some((entry) => entry.type === "interaction")).toBe(true);
    expect(timeline.entries.some((entry) => entry.type === "signal")).toBe(true);
  });

  it("builds an outbound draft from the merged account snapshot", async () => {
    const draft = await buildOutboundEmailDraft(
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      createFixtureProviderCatalogForAllProviders(),
      new FixtureIntelligenceClient(),
    );

    expect(draft.recipients).toContain("jane.rivers@acmeanalytics.io");
    expect(draft.subject).toContain("Acme Analytics");
    expect(draft.body).toContain("ROI breakdown");
    expect(draft.body).toContain("Your name");
    expect(draft.provenance).toContain("salesforce");
  });

  it("builds an outbound draft with configured sender identity", async () => {
    const draft = await buildOutboundEmailDraft(
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      createFixtureProviderCatalogForAllProviders(),
      new FixtureIntelligenceClient(),
      {
        SALES_MCP_OUTBOUND_SENDER_NAME: "Alex Morgan",
        SALES_MCP_OUTBOUND_SENDER_TITLE: "Solutions Engineer",
        SALES_MCP_OUTBOUND_SENDER_COMPANY: "Sales MCP Labs",
      },
    );

    expect(draft.body).toContain("Alex Morgan");
    expect(draft.body).toContain("Solutions Engineer, Sales MCP Labs");
  });

  it("builds a next action recommendation with supporting risks and signals", async () => {
    const recommendation = await buildNextActionRecommendation(
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      createFixtureProviderCatalogForAllProviders(),
      new FixtureIntelligenceClient(),
    );

    expect(recommendation.account.name).toBe("Acme Analytics");
    expect(recommendation.recommendedAction.summary).toContain("decision maker");
    expect(recommendation.recommendedAction.rationale).toContain("Deal-risk assessment selected");
    expect(recommendation.supportingSignals.length).toBeGreaterThan(0);
    expect(recommendation.supportingRisks.length).toBeGreaterThan(0);
    expect(
      recommendation.supportingRisks.some((risk) => risk.title === "Proposal-stage stall risk"),
    ).toBe(true);
  });
});
