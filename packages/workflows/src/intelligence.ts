import type {
  AccountHealthAssessment,
  AccountHealthInput,
  DealRiskAssessment,
  DealRiskInput,
  EntityResolutionInput,
  IntelligenceClient,
  RuntimeEnvironment,
  SignalRankingInput,
  SignalRankingResult,
} from "@sales-mcp/core";

interface HttpIntelligenceClientOptions {
  baseUrl: string;
}

export class HttpIntelligenceClient implements IntelligenceClient {
  constructor(private readonly options: HttpIntelligenceClientOptions) {}

  async scoreAccountHealth(input: AccountHealthInput): Promise<AccountHealthAssessment> {
    const response = await fetch(`${this.options.baseUrl}/score/account-health`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        account_name: input.accountName,
        opportunity_stage: input.opportunityStage,
        days_since_last_touch: input.daysSinceLastTouch,
        has_confirmed_decision_maker: input.hasConfirmedDecisionMaker,
        signals: input.signals,
      }),
    });

    if (!response.ok) {
      throw new Error(`Intelligence scoring request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      account_name: string;
      health_score: number;
      risks: Array<{
        label: string;
        severity: "low" | "medium" | "high";
        score: number;
        rationale: string;
      }>;
      recommendation: string;
    };

    return {
      accountName: payload.account_name,
      healthScore: payload.health_score,
      risks: payload.risks,
      recommendation: payload.recommendation,
    };
  }

  async assessDealRisk(input: DealRiskInput): Promise<DealRiskAssessment> {
    const response = await fetch(`${this.options.baseUrl}/score/deal-risk`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        account_name: input.accountName,
        opportunity_stage: input.opportunityStage,
        days_since_last_touch: input.daysSinceLastTouch,
        has_confirmed_decision_maker: input.hasConfirmedDecisionMaker,
        has_champion: input.hasChampion,
        signals: input.signals,
      }),
    });

    if (!response.ok) {
      throw new Error(`Deal risk request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      account_name: string;
      stall_risk_score: number;
      next_step_type:
        | "reengage_champion"
        | "confirm_decision_maker"
        | "share_proof"
        | "schedule_review";
      recommendation: string;
      factors: Array<{
        label: string;
        severity: "low" | "medium" | "high";
        score: number;
        rationale: string;
      }>;
    };

    return {
      accountName: payload.account_name,
      stallRiskScore: payload.stall_risk_score,
      nextStepType: payload.next_step_type,
      recommendation: payload.recommendation,
      factors: payload.factors,
    };
  }

  async resolveEntities(input: EntityResolutionInput) {
    const response = await fetch(`${this.options.baseUrl}/resolve/entities`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        records: input.records.map((record) => ({
          provider: record.provider,
          external_id: record.externalId,
          label: record.label,
          email: record.email,
          domain: record.domain,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Entity resolution request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      clusters: Array<{
        canonical_label: string;
        confidence: number;
        strategy: "email" | "domain" | "label";
        aliases: string[];
        members: string[];
      }>;
    };

    return payload.clusters.map((cluster) => ({
      canonicalLabel: cluster.canonical_label,
      confidence: cluster.confidence,
      strategy: cluster.strategy,
      aliases: cluster.aliases,
      members: cluster.members,
    }));
  }

  async rankSignals(input: SignalRankingInput): Promise<SignalRankingResult> {
    const response = await fetch(`${this.options.baseUrl}/rank/signals`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        signals: input.signals,
      }),
    });

    if (!response.ok) {
      throw new Error(`Signal ranking request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      ranked_signals: Array<{
        title: string;
        category: SignalRankingInput["signals"][number]["category"];
        adjusted_score: number;
        rationale: string;
      }>;
    };

    return {
      rankedSignals: payload.ranked_signals.map((signal) => ({
        title: signal.title,
        category: signal.category,
        adjustedScore: signal.adjusted_score,
        rationale: signal.rationale,
      })),
    };
  }
}

export class FixtureIntelligenceClient implements IntelligenceClient {
  async scoreAccountHealth(input: AccountHealthInput): Promise<AccountHealthAssessment> {
    const signalLift = input.signals.slice(0, 3).reduce((sum, signal) => sum + signal.score, 0) * 0.08;
    const base = input.hasConfirmedDecisionMaker ? 0.72 : 0.58;
    const touchPenalty = input.daysSinceLastTouch >= 7 ? 0.16 : 0;
    const stagePenalty = input.opportunityStage === "Proposal" ? 0.1 : 0;
    const healthScore = Math.max(0, Math.min(1, base - touchPenalty - stagePenalty + signalLift));

    return {
      accountName: input.accountName,
      healthScore,
      risks: [
        ...(input.daysSinceLastTouch >= 7
          ? [
              {
                label: "Recent touch gap",
                severity: "medium" as const,
                score: 0.7,
                rationale: "The account has gone at least a week without a logged interaction.",
              },
            ]
          : []),
        ...(!input.hasConfirmedDecisionMaker
          ? [
              {
                label: "Missing decision maker",
                severity: "medium" as const,
                score: 0.68,
                rationale: "No confirmed buying authority is present in the merged account view.",
              },
            ]
          : []),
      ],
      recommendation:
        healthScore < 0.65
          ? "Re-engage the champion with proof-driven follow-up and request access to the decision maker."
          : "Maintain momentum with a concise follow-up and align on success criteria.",
    };
  }

  async assessDealRisk(input: DealRiskInput): Promise<DealRiskAssessment> {
    const factors: DealRiskAssessment["factors"] = [];
    let risk = 0.2;

    if (input.opportunityStage === "Proposal") {
      risk += 0.2;
      factors.push({
        label: "Proposal-stage stall risk",
        severity: "high",
        score: 0.76,
        rationale: "Proposal-stage deals need proof and active stakeholder alignment to keep moving.",
      });
    }

    if (input.daysSinceLastTouch >= 7) {
      risk += 0.18;
      factors.push({
        label: "Recent touch gap",
        severity: "medium",
        score: 0.7,
        rationale: "No recent touch increases the chance that the deal quietly stalls.",
      });
    }

    if (!input.hasConfirmedDecisionMaker) {
      risk += 0.16;
      factors.push({
        label: "Unconfirmed decision maker",
        severity: "medium",
        score: 0.69,
        rationale: "Champion engagement alone is not enough if buying authority is still unclear.",
      });
    }

    if (!input.hasChampion) {
      risk += 0.12;
      factors.push({
        label: "No active champion",
        severity: "high",
        score: 0.74,
        rationale: "Without a champion the deal is more likely to lose momentum internally.",
      });
    }

    const engagementLift = input.signals
      .filter((signal) => signal.category === "engagement" || signal.category === "campaign")
      .slice(0, 2)
      .reduce((sum, signal) => sum + signal.score, 0) * 0.08;

    const stallRiskScore = Math.max(0, Math.min(1, risk - engagementLift));
    const nextStepType = !input.hasConfirmedDecisionMaker
      ? "confirm_decision_maker"
      : input.opportunityStage === "Proposal"
        ? "share_proof"
        : "reengage_champion";

    const recommendation =
      nextStepType === "confirm_decision_maker"
        ? "Re-engage the champion and ask for access to the decision maker so the proposal does not stall."
        : nextStepType === "share_proof"
          ? "Send proof-oriented follow-up with ROI and security material to move the proposal forward."
          : "Re-engage the champion with a concise follow-up and confirm next review timing.";

    return {
      accountName: input.accountName,
      stallRiskScore,
      nextStepType,
      recommendation,
      factors,
    };
  }

  async resolveEntities(input: EntityResolutionInput) {
    const grouped = new Map<string, string[]>();

    for (const record of input.records) {
      const key = (record.email ?? record.domain ?? record.label).toLowerCase();
      const members = grouped.get(key) ?? [];
      members.push(`${record.provider}:${record.externalId}`);
      grouped.set(key, members);
    }

    return [...grouped.entries()].map(([canonicalLabel, members]) => ({
      canonicalLabel,
      confidence: members.length > 1 ? 0.74 : 0.52,
      strategy: canonicalLabel.includes("@") ? ("email" as const) : ("label" as const),
      aliases: members,
      members,
    }));
  }

  async rankSignals(input: SignalRankingInput): Promise<SignalRankingResult> {
    return {
      rankedSignals: [...input.signals]
        .sort((left, right) => right.score - left.score)
        .map((signal) => ({
          title: signal.title,
          category: signal.category,
          adjustedScore: signal.score,
          rationale: `Fixture ranking retained the base score for ${signal.category} signal.`,
        })),
    };
  }
}

export function createIntelligenceClientFromEnv(
  env: RuntimeEnvironment = process.env,
): IntelligenceClient {
  const baseUrl = env.SALES_MCP_INTELLIGENCE_BASE_URL;
  return baseUrl ? new HttpIntelligenceClient({ baseUrl }) : new FixtureIntelligenceClient();
}
