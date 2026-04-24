import type {
  AccountQuery,
  IntelligenceClient,
  NextActionRecommendation,
  ProviderCatalog,
} from "@sales-mcp/core";
import { buildAccountStatusSnapshot } from "./index.js";

export async function buildNextActionRecommendation(
  query: AccountQuery,
  catalog: ProviderCatalog,
  intelligenceClient?: IntelligenceClient,
): Promise<NextActionRecommendation> {
  const snapshot = await buildAccountStatusSnapshot(query, catalog, intelligenceClient);
  const supportingSignals = [...snapshot.signals]
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 3);
  const dealRisk = intelligenceClient
    ? await intelligenceClient.assessDealRisk({
        accountName: snapshot.account.name,
        opportunityStage: snapshot.primaryOpportunity?.stage,
        daysSinceLastTouch:
          snapshot.interactions[0]?.happenedAt
            ? Math.floor(
                (Date.parse("2026-04-23T19:15:00.000Z") -
                  Date.parse(snapshot.interactions[0].happenedAt)) /
                  (1000 * 60 * 60 * 24),
              )
            : 999,
        hasConfirmedDecisionMaker: snapshot.people.some(
          (person) => person.role === "decision_maker",
        ),
        hasChampion: snapshot.people.some((person) => person.role === "champion"),
        signals: supportingSignals.map((signal) => ({
          title: signal.title,
          category: signal.category,
          score: signal.score ?? 0.5,
        })),
      })
    : undefined;
  const supportingRisks = [
    ...snapshot.risks.slice(0, 2),
    ...(dealRisk?.factors.map((factor, index) => ({
      id: `deal-risk-${index}`,
      severity: factor.severity,
      title: factor.label,
      summary: factor.rationale,
        attributions: snapshot.account.attributions,
      })) ?? []),
  ];
  const dealRiskPriority: "medium" | "high" =
    dealRisk && dealRisk.stallRiskScore >= 0.6 ? "high" : "medium";
  const recommendedAction = dealRisk
    ? {
        id: `action-${dealRisk.nextStepType}`,
        priority: dealRiskPriority,
        summary: dealRisk.recommendation,
        rationale: `Deal-risk assessment selected ${dealRisk.nextStepType} with score ${dealRisk.stallRiskScore.toFixed(2)}.`,
        attributions: snapshot.account.attributions,
      }
    : snapshot.recommendedActions[0] ??
      ({
        id: "action-follow-up",
        priority: "medium",
        summary: "Follow up on the account with a concise next-step request.",
        rationale: "No stronger action was inferred from the merged account state.",
        attributions: snapshot.account.attributions,
      } as const);

  return {
    account: snapshot.account,
    healthScore: snapshot.healthScore,
    recommendedAction,
    supportingSignals,
    supportingRisks,
    provenance: snapshot.provenance,
  };
}
