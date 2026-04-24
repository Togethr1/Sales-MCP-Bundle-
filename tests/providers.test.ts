import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildSalesforceAccountUpsertPreview,
  createProviderCatalogFromEnv,
  getProviderRuntimeConfig,
} from "@sales-mcp/providers";
import type { ProviderAdapter } from "@sales-mcp/core";
import { buildAccountStatusSnapshot, FixtureIntelligenceClient } from "@sales-mcp/workflows";
import { normalizeApolloContext } from "../packages/providers/src/adapters/apollo.js";
import {
  escapeSoqlLikeFragment,
  escapeSoqlLiteral,
  normalizeSalesforceAccountContext,
} from "../packages/providers/src/adapters/salesforce.js";
import { normalizeGmailMessages } from "../packages/providers/src/adapters/gmail.js";
import { normalizeSerperResponse } from "../packages/providers/src/adapters/serper.js";
import { AdapterBackedProviderCatalog } from "../packages/providers/src/catalog.js";
import { requestJson } from "../packages/providers/src/shared/http.js";

const originalFetch = globalThis.fetch;

describe("providers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("builds fixture adapters from environment modes", async () => {
    const catalog = createProviderCatalogFromEnv({
      SALES_MCP_SALESFORCE_MODE: "fixture",
      SALES_MCP_GMAIL_MODE: "fixture",
      SALES_MCP_APOLLO_MODE: "fixture",
      SALES_MCP_CLAY_MODE: "disabled",
      SALES_MCP_ZOOMINFO_MODE: "disabled",
      SALES_MCP_CRUNCHBASE_MODE: "disabled",
      SALES_MCP_BUILTWITH_MODE: "disabled",
      SALES_MCP_SMARTLEAD_MODE: "disabled",
      SALES_MCP_SERPER_MODE: "fixture",
      SALES_MCP_APIFY_MODE: "disabled",
      SALES_MCP_PITCHBOOK_MODE: "disabled",
      SALES_MCP_TRIGIFY_MODE: "disabled",
    });

    const contexts = await catalog.getAccountContexts({
      accountName: "Acme Analytics",
      domain: "acmeanalytics.io",
    });

    expect(contexts.map((context) => context.provider)).toEqual([
      "gmail",
      "salesforce",
      "apollo",
      "serper",
    ]);
  });

  it("builds a salesforce dry-run preview from a normalized snapshot", async () => {
    const snapshot = await buildAccountStatusSnapshot(
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      createProviderCatalogFromEnv({
        SALES_MCP_SALESFORCE_MODE: "fixture",
        SALES_MCP_GMAIL_MODE: "fixture",
        SALES_MCP_APOLLO_MODE: "fixture",
        SALES_MCP_CLAY_MODE: "fixture",
        SALES_MCP_ZOOMINFO_MODE: "fixture",
        SALES_MCP_CRUNCHBASE_MODE: "fixture",
        SALES_MCP_BUILTWITH_MODE: "fixture",
        SALES_MCP_SMARTLEAD_MODE: "fixture",
        SALES_MCP_SERPER_MODE: "fixture",
        SALES_MCP_APIFY_MODE: "fixture",
        SALES_MCP_PITCHBOOK_MODE: "fixture",
        SALES_MCP_TRIGIFY_MODE: "fixture",
      }),
      new FixtureIntelligenceClient(),
    );

    const preview = buildSalesforceAccountUpsertPreview(snapshot, "dry-run");

    expect(preview.mode).toBe("dry-run");
    expect(preview.payload.name).toBe("Acme Analytics");
    expect(preview.payload.contactEmails).toContain("jane.rivers@acmeanalytics.io");
    expect(preview.payload.primaryOpportunityStage).toBe("Proposal");
  });

  it("normalizes salesforce account responses into canonical records", () => {
    const context = normalizeSalesforceAccountContext(
      {
        Id: "001ACME",
        Name: "Acme Analytics",
        Website: "https://acmeanalytics.io",
        Industry: "Data Infrastructure",
        Description: "Revenue analytics platform",
        BillingCity: "Chicago",
        BillingState: "IL",
        Contacts: {
          records: [
            {
              Id: "003JANE",
              Name: "Jane Rivers",
              Email: "jane.rivers@acmeanalytics.io",
              Title: "VP Revenue Operations",
            },
          ],
        },
        Opportunities: {
          records: [
            {
              Id: "006OPP",
              Name: "Acme Expansion",
              StageName: "Proposal",
              Amount: 42000,
              CloseDate: "2026-05-19",
            },
          ],
        },
        Tasks: {
          records: [
            {
              Id: "00TNOTE",
              Subject: "Follow-up",
              Status: "Completed",
              Description: "Shared ROI model",
              ActivityDate: "2026-04-20",
            },
          ],
        },
      },
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      "2026-04-23T19:15:00.000Z",
    );

    expect(context.account?.domain).toBe("acmeanalytics.io");
    expect(context.people[0]?.role).toBe("decision_maker");
    expect(context.opportunities[0]?.stage).toBe("Proposal");
    expect(context.interactions[0]?.summary).toContain("Shared ROI model");
  });

  it("normalizes gmail messages into people, interactions, and engagement signals", () => {
    const context = normalizeGmailMessages(
      [
        {
          id: "older-message",
          threadId: "thread-1",
          snippet: "Looping in procurement.",
          internalDate: "1776940100000",
          payload: {
            headers: [
              { name: "From", value: "Jane Rivers <jane.rivers@acmeanalytics.io>" },
              { name: "To", value: "Michael <michael@example.com>" },
              { name: "Cc", value: "Procurement <buying@acmeanalytics.io>" },
              { name: "Subject", value: "Commercial review" },
            ],
          },
        },
        {
          id: "18c32a",
          threadId: "thread-1",
          snippet: "Thanks for sending the security documentation.",
          internalDate: "1776940200000",
          payload: {
            headers: [
              { name: "From", value: "Jane Rivers <jane.rivers@acmeanalytics.io>" },
              { name: "To", value: "Michael <michael@example.com>" },
              { name: "Subject", value: "Security follow-up" },
            ],
          },
        },
      ],
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      "2026-04-23T19:15:00.000Z",
    );

    expect(context.people[0]?.email).toBe("jane.rivers@acmeanalytics.io");
    expect(context.people.find((person) => person.email === "jane.rivers@acmeanalytics.io")?.attributions).toHaveLength(2);
    expect(context.interactions[0]?.summary).toContain("Security follow-up");
    expect(context.interactions[0]?.happenedAt >= context.interactions[1]?.happenedAt).toBe(true);
    expect(context.signals[0]?.category).toBe("engagement");
  });

  it("normalizes apollo company and people enrichment into canonical records", () => {
    const context = normalizeApolloContext(
      {
        id: "apollo-org-1",
        name: "Acme Analytics",
        website_url: "https://acmeanalytics.io",
        short_description: "Revenue analytics platform",
        estimated_num_employees: 240,
        industry: "Data Infrastructure",
      },
      [
        {
          id: "apollo-person-1",
          name: "Marcus Lee",
          title: "Director of Sales Operations",
          email: "marcus.lee@acmeanalytics.io",
          organization_id: "apollo-org-1",
        },
        {
          id: "apollo-person-2",
          name: "Other Person",
          title: "Advisor",
          email: "other@example.com",
          organization_id: "other-org",
        },
      ],
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      "2026-04-23T19:15:00.000Z",
    );

    expect(context.account?.employeeRange).toBe("240+");
    expect(context.people).toHaveLength(1);
    expect(context.people[0]?.role).toBe("influencer");
    expect(context.signals[0]?.category).toBe("intent");
  });

  it("normalizes serper responses into scored account signals", () => {
    const context = normalizeSerperResponse(
      {
        news: [
          {
            title: "Acme Analytics announces enterprise launch",
            snippet: "The company launched a new enterprise analytics assistant.",
            date: "2026-04-20T12:00:00.000Z",
            link: "https://example.com/acme-launch",
          },
        ],
        organic: [
          {
            title: "Acme Analytics hiring data engineers",
            snippet: "New roles suggest growth across analytics and infrastructure.",
            date: "2026-04-18T12:00:00.000Z",
            link: "https://example.com/acme-hiring",
          },
          {
            title: "Acme Analytics hiring data engineers",
            snippet: "Duplicate result should be deduped.",
            date: "2026-04-18T12:00:00.000Z",
            link: "https://example.com/acme-hiring",
          },
        ],
      },
      { accountName: "Acme Analytics", domain: "acmeanalytics.io" },
      "2026-04-23T19:15:00.000Z",
    );

    expect(context.signals.length).toBe(2);
    expect(context.signals[0]?.category).toBe("news");
    expect(context.signals[1]?.category).toBe("hiring");
  });

  it("exposes provider auth and pagination defaults through runtime config", () => {
    const runtimeConfig = getProviderRuntimeConfig({
      SALES_MCP_APOLLO_MODE: "live",
      SALES_MCP_APOLLO_PAGE_SIZE: "25",
      SALES_MCP_APOLLO_MAX_PAGES: "4",
    });
    const apollo = runtimeConfig.find((config) => config.provider === "apollo");
    const gmail = runtimeConfig.find((config) => config.provider === "gmail");

    expect(apollo?.authStrategy).toBe("x-api-key");
    expect(apollo?.pagination.pageSize).toBe(25);
    expect(apollo?.pagination.maxPages).toBe(4);
    expect(gmail?.accessTokenEnvVar).toBe("SALES_MCP_GMAIL_ACCESS_TOKEN");
    expect(gmail?.legacyApiKeyEnvVar).toBe("SALES_MCP_GMAIL_API_KEY");
    expect(gmail?.defaultBaseUrl).toBe("https://gmail.googleapis.com/gmail/v1");
  });

  it("accepts new access-token env vars with API-key fallback for bearer-token providers", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("salesforce.com")) {
        return Promise.resolve(
          new Response(JSON.stringify({ records: [] }), {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }),
        );
      }

      if (url.includes("gmail.googleapis.com")) {
        return Promise.resolve(
          new Response(JSON.stringify({ messages: [] }), {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }),
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    globalThis.fetch = fetchMock as typeof fetch;

    const liveCatalog = createProviderCatalogFromEnv({
      SALES_MCP_SALESFORCE_MODE: "live",
      SALES_MCP_SALESFORCE_BASE_URL: "https://example.my.salesforce.com",
      SALES_MCP_SALESFORCE_ACCESS_TOKEN: "new-token",
      SALES_MCP_GMAIL_MODE: "live",
      SALES_MCP_GMAIL_API_KEY: "legacy-token",
      SALES_MCP_APOLLO_MODE: "disabled",
      SALES_MCP_SERPER_MODE: "disabled",
      SALES_MCP_CLAY_MODE: "disabled",
      SALES_MCP_ZOOMINFO_MODE: "disabled",
      SALES_MCP_CRUNCHBASE_MODE: "disabled",
      SALES_MCP_BUILTWITH_MODE: "disabled",
      SALES_MCP_SMARTLEAD_MODE: "disabled",
      SALES_MCP_APIFY_MODE: "disabled",
      SALES_MCP_PITCHBOOK_MODE: "disabled",
      SALES_MCP_TRIGIFY_MODE: "disabled",
    });

    const contextsPromise = liveCatalog.getAccountContexts({
      accountName: "Acme Analytics",
      domain: "acmeanalytics.io",
    });

    await expect(contextsPromise).resolves.toEqual([]);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(
      fetchMock.mock.calls.some(
        ([, init]) =>
          (init as RequestInit | undefined)?.headers &&
          (init as RequestInit).headers &&
          JSON.stringify((init as RequestInit).headers).includes("Bearer new-token"),
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        ([, init]) =>
          (init as RequestInit | undefined)?.headers &&
          (init as RequestInit).headers &&
          JSON.stringify((init as RequestInit).headers).includes("Bearer legacy-token"),
      ),
    ).toBe(true);
  });

  it("retries transient HTTP failures and applies provider auth headers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "rate limited" }), {
          status: 429,
          headers: {
            "content-type": "application/json",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      );

    globalThis.fetch = fetchMock as typeof fetch;

    const response = await requestJson<{ ok: boolean }>({
      url: "https://example.com/provider",
      method: "POST",
      apiKey: "secret-token",
      authStrategy: "x-api-key",
      retries: 1,
      body: { q: "Acme" },
    });

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        "x-api-key": "secret-token",
      }),
    });
  });

  it("isolates failing provider adapters inside the catalog", async () => {
    const failingAdapter: ProviderAdapter = {
      provider: "gmail",
      mode: "live",
      isConfigured: () => true,
      getAccountContext: async () => {
        throw new Error("simulated provider outage");
      },
    };
    const healthyAdapter: ProviderAdapter = {
      provider: "serper",
      mode: "fixture",
      isConfigured: () => true,
      getAccountContext: async () => ({
        provider: "serper",
        people: [],
        opportunities: [],
        interactions: [],
        signals: [],
        techStack: [],
      }),
    };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const catalog = new AdapterBackedProviderCatalog([failingAdapter, healthyAdapter]);
    const contexts = await catalog.getAccountContexts({ accountName: "Acme Analytics" });

    expect(contexts).toHaveLength(1);
    expect(contexts[0]?.provider).toBe("serper");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("escapes SOQL literals and LIKE fragments defensively", () => {
    expect(escapeSoqlLiteral("O'Reilly\nAccounts\\West")).toBe("O\\'Reilly Accounts\\\\West");
    expect(escapeSoqlLikeFragment("100% growth_team")).toBe("100\\% growth\\_team");
    expect(escapeSoqlLiteral("Acme\u0000Corp")).toBe("Acme Corp");
  });
});
