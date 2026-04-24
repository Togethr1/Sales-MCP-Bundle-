import type {
  Account,
  AccountHealthAssessment,
  AccountQuery,
  AccountSnapshot,
  AccountTimeline,
  IntelligenceClient,
  Interaction,
  Opportunity,
  Person,
  ProviderCatalog,
  RecommendedAction,
  Risk,
  Signal,
  TechStackItem,
  TimelineEntry,
} from "@sales-mcp/core";
export {
  createIntelligenceClientFromEnv,
  FixtureIntelligenceClient,
  HttpIntelligenceClient,
} from "./intelligence.js";
export { getOutboundSenderConfig } from "./config.js";
export { buildNextActionRecommendation } from "./next-action.js";
export { buildOutboundEmailDraft } from "./outbound.js";
export { buildAccountResearchBrief } from "./research.js";
import { rankSignals, resolvePeople } from "./synthesis.js";

function pickAccount(accounts: Account[]): Account {
  const preferred =
    accounts.find((account) => account.attributions[0]?.provider === "salesforce") ??
    accounts[0];

  if (!preferred) {
    throw new Error("No canonical account record was available for the requested snapshot.");
  }

  return preferred;
}

function sortByTimeDescending<T extends { happenedAt?: string; lastUpdatedAt?: string }>(
  records: T[],
): T[] {
  return [...records].sort((left, right) => {
    const leftTimestamp = left.happenedAt ?? left.lastUpdatedAt ?? "";
    const rightTimestamp = right.happenedAt ?? right.lastUpdatedAt ?? "";
    return rightTimestamp.localeCompare(leftTimestamp);
  });
}

function calculateDaysSinceLastTouch(interactions: Interaction[]): number {
  const mostRecentInteraction = sortByTimeDescending(interactions)[0];

  if (!mostRecentInteraction) {
    return 999;
  }

  const now = Date.parse("2026-04-23T19:15:00.000Z");
  const happenedAt = Date.parse(mostRecentInteraction.happenedAt);
  const differenceInMs = Math.max(0, now - happenedAt);
  return Math.floor(differenceInMs / (1000 * 60 * 60 * 24));
}

function toTimelineEntries(interactions: Interaction[], signals: Signal[]): TimelineEntry[] {
  const interactionEntries: TimelineEntry[] = interactions.map((interaction) => ({
    id: interaction.id,
    type: "interaction",
    title: interaction.channel,
    summary: interaction.summary,
    happenedAt: interaction.happenedAt,
    provider: interaction.attributions[0]?.provider ?? "salesforce",
  }));

  const signalEntries: TimelineEntry[] = signals.map((signal) => ({
    id: signal.id,
    type: "signal",
    title: signal.title,
    summary: signal.summary,
    happenedAt: signal.happenedAt,
    provider: signal.attributions[0]?.provider ?? "serper",
  }));

  return sortByTimeDescending([...interactionEntries, ...signalEntries]);
}

function buildRisks(
  opportunity: Opportunity | undefined,
  people: Person[],
  interactions: Interaction[],
): Risk[] {
  const risks: Risk[] = [];
  const mostRecentInteraction = sortByTimeDescending(interactions)[0];

  if (opportunity && opportunity.lastUpdatedAt < "2026-04-14T00:00:00.000Z") {
    risks.push({
      id: "risk-stage-stale",
      severity: "high",
      title: "Opportunity stage may be stale",
      summary:
        "The deal is still in Proposal, but the opportunity has not been updated in nearly two weeks.",
      attributions: opportunity.attributions,
    });
  }

  if (!people.some((person) => person.role === "decision_maker")) {
    risks.push({
      id: "risk-no-decision-maker",
      severity: "medium",
      title: "No confirmed decision maker",
      summary:
        "The account has a champion and influencer, but the buying authority is not yet verified.",
      attributions: mostRecentInteraction?.attributions ?? [],
    });
  }

  if (!mostRecentInteraction || mostRecentInteraction.happenedAt < "2026-04-16T00:00:00.000Z") {
    risks.push({
      id: "risk-recent-touch-gap",
      severity: "medium",
      title: "Recent touch gap",
      summary: "There has been no logged interaction during the last seven days.",
      attributions: mostRecentInteraction?.attributions ?? [],
    });
  }

  return risks;
}

function buildRecommendedActions(
  risks: Risk[],
  signals: Signal[],
  champion: Person | undefined,
  assessment: AccountHealthAssessment | undefined,
): RecommendedAction[] {
  const strongestSignal = sortByTimeDescending(signals)[0];

  return [
    {
      id: "action-reengage-champion",
      priority: risks.some((risk) => risk.severity === "high") ? "high" : "medium",
      summary: `Re-engage ${champion?.fullName ?? "the champion"} with a proof-focused follow-up.`,
      rationale:
        assessment?.recommendation ??
        "Use the current engagement signal and recent company momentum to address ROI and security objections while requesting access to the decision maker.",
      attributions: strongestSignal?.attributions ?? champion?.attributions ?? [],
    },
  ];
}

function mergeAssessmentRisks(
  risks: Risk[],
  assessment: AccountHealthAssessment | undefined,
  fallbackAttributions: Risk["attributions"],
): Risk[] {
  if (!assessment) {
    return risks;
  }

  const merged = [...risks];

  for (const scoredRisk of assessment.risks) {
    const existing = merged.find((risk) => risk.title === scoredRisk.label);
    if (existing) {
      continue;
    }

    merged.push({
      id: `risk-${scoredRisk.label.toLowerCase().replace(/\s+/g, "-")}`,
      severity: scoredRisk.severity,
      title: scoredRisk.label,
      summary: scoredRisk.rationale,
      attributions: fallbackAttributions,
    });
  }

  return merged;
}

export async function buildAccountStatusSnapshot(
  query: AccountQuery,
  catalog: ProviderCatalog,
  intelligenceClient?: IntelligenceClient,
): Promise<AccountSnapshot> {
  const contexts = await catalog.getAccountContexts(query);
  const accounts = contexts.flatMap((context) => (context.account ? [context.account] : []));
  const people = await resolvePeople(
    contexts.flatMap((context) => context.people),
    intelligenceClient,
  );
  const opportunities = sortByTimeDescending(
    contexts.flatMap((context) => context.opportunities),
  );
  const interactions = sortByTimeDescending(
    contexts.flatMap((context) => context.interactions),
  );
  const signals = await rankSignals(
    contexts.flatMap((context) => context.signals),
    intelligenceClient,
  );
  const techStack = contexts.flatMap((context) => context.techStack);
  const account = pickAccount(accounts);
  const primaryOpportunity = opportunities[0];
  const baselineRisks = buildRisks(primaryOpportunity, people, interactions);
  const champion = people.find((person) => person.role === "champion");
  const healthAssessment = intelligenceClient
    ? await intelligenceClient.scoreAccountHealth({
        accountName: account.name,
        opportunityStage: primaryOpportunity?.stage,
        daysSinceLastTouch: calculateDaysSinceLastTouch(interactions),
        hasConfirmedDecisionMaker: people.some((person) => person.role === "decision_maker"),
        signals: signals.map((signal) => ({
          title: signal.title,
          category: signal.category,
          score: signal.score ?? 0.5,
        })),
      })
    : undefined;
  const risks = mergeAssessmentRisks(
    baselineRisks,
    healthAssessment,
    champion?.attributions ?? account.attributions,
  );
  const recommendedActions = buildRecommendedActions(
    risks,
    signals,
    champion,
    healthAssessment,
  );

  return {
    account,
    people,
    primaryOpportunity,
    interactions,
    signals,
    techStack,
    healthScore: healthAssessment?.healthScore,
    risks,
    recommendedActions,
    provenance: contexts.map((context) => context.provider),
  };
}

export async function buildAccountTimeline(
  query: AccountQuery,
  catalog: ProviderCatalog,
): Promise<AccountTimeline> {
  const contexts = await catalog.getAccountContexts(query);
  const accounts = contexts.flatMap((context) => (context.account ? [context.account] : []));
  const interactions = sortByTimeDescending(
    contexts.flatMap((context) => context.interactions),
  );
  const signals = sortByTimeDescending(contexts.flatMap((context) => context.signals));

  return {
    account: pickAccount(accounts),
    entries: toTimelineEntries(interactions, signals),
    provenance: contexts.map((context) => context.provider),
  };
}
