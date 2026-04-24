export type ProviderName =
  | "gmail"
  | "smartlead"
  | "clay"
  | "zoominfo"
  | "salesforce"
  | "pitchbook"
  | "crunchbase"
  | "builtwith"
  | "apollo"
  | "trigify"
  | "apify"
  | "serper";

export interface SourceAttribution {
  provider: ProviderName;
  sourceRecordId: string;
  retrievedAt: string;
  confidence: number;
}

export type RuntimeEnvironment = Record<string, string | undefined>;

export type ProviderMode = "disabled" | "fixture" | "live";

export type ProviderAuthStrategy = "bearer" | "x-api-key" | "none";

export interface ProviderPaginationConfig {
  pageSize: number;
  maxPages: number;
}

export interface ProviderRuntimeConfig {
  provider: ProviderName;
  mode: ProviderMode;
  apiKeyEnvVar?: string;
  accessTokenEnvVar?: string;
  legacyApiKeyEnvVar?: string;
  baseUrlEnvVar?: string;
  authStrategy: ProviderAuthStrategy;
  defaultBaseUrl?: string;
  timeoutMs: number;
  retryCount: number;
  pagination: ProviderPaginationConfig;
}

export interface AccountQuery {
  accountName: string;
  domain?: string;
}

export interface Account {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  industry?: string;
  employeeRange?: string;
  revenueRange?: string;
  headquarters?: string;
  attributions: SourceAttribution[];
}

export interface Person {
  id: string;
  fullName: string;
  title: string;
  email?: string;
  role?: "champion" | "decision_maker" | "influencer" | "unknown";
  accountId?: string;
  canonicalEntityLabel?: string;
  resolutionConfidence?: number;
  attributions: SourceAttribution[];
}

export interface Opportunity {
  id: string;
  accountId: string;
  name: string;
  stage: string;
  amount?: number;
  closeDate?: string;
  lastUpdatedAt: string;
  attributions: SourceAttribution[];
}

export interface Interaction {
  id: string;
  accountId: string;
  channel: "email" | "crm_note" | "call" | "meeting" | "campaign";
  summary: string;
  happenedAt: string;
  contactEmail?: string;
  attributions: SourceAttribution[];
}

export interface Signal {
  id: string;
  accountId: string;
  category:
    | "funding"
    | "hiring"
    | "technology"
    | "intent"
    | "campaign"
    | "news"
    | "engagement";
  title: string;
  summary: string;
  happenedAt: string;
  score?: number;
  rankingRationale?: string;
  attributions: SourceAttribution[];
}

export interface TechStackItem {
  id: string;
  accountId: string;
  name: string;
  category: string;
  attributions: SourceAttribution[];
}

export interface Risk {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  summary: string;
  attributions: SourceAttribution[];
}

export interface RecommendedAction {
  id: string;
  priority: "low" | "medium" | "high";
  summary: string;
  rationale: string;
  attributions: SourceAttribution[];
}

export type WriteMode = "dry-run" | "execute";

export interface ProviderAccountContext {
  provider: ProviderName;
  account?: Account;
  people: Person[];
  opportunities: Opportunity[];
  interactions: Interaction[];
  signals: Signal[];
  techStack: TechStackItem[];
}

export interface ProviderAdapter {
  provider: ProviderName;
  mode: ProviderMode;
  isConfigured(): boolean;
  getAccountContext(query: AccountQuery): Promise<ProviderAccountContext | null>;
}

export interface ProviderCatalog {
  getAccountContexts(query: AccountQuery): Promise<ProviderAccountContext[]>;
}

export interface AccountHealthInput {
  accountName: string;
  opportunityStage?: string;
  daysSinceLastTouch: number;
  hasConfirmedDecisionMaker: boolean;
  signals: Array<{
    title: string;
    category: Signal["category"];
    score: number;
  }>;
}

export interface IntelligenceRiskScore {
  label: string;
  severity: Risk["severity"];
  score: number;
  rationale: string;
}

export interface AccountHealthAssessment {
  accountName: string;
  healthScore: number;
  risks: IntelligenceRiskScore[];
  recommendation: string;
}

export interface DealRiskInput {
  accountName: string;
  opportunityStage?: string;
  daysSinceLastTouch: number;
  hasConfirmedDecisionMaker: boolean;
  hasChampion: boolean;
  signals: Array<{
    title: string;
    category: Signal["category"];
    score: number;
  }>;
}

export interface DealRiskFactor {
  label: string;
  severity: Risk["severity"];
  score: number;
  rationale: string;
}

export interface DealRiskAssessment {
  accountName: string;
  stallRiskScore: number;
  nextStepType:
    | "reengage_champion"
    | "confirm_decision_maker"
    | "share_proof"
    | "schedule_review";
  recommendation: string;
  factors: DealRiskFactor[];
}

export interface EntityResolutionInput {
  records: Array<{
    provider: ProviderName;
    externalId: string;
    label: string;
    email?: string;
    domain?: string;
  }>;
}

export interface ResolvedEntityCluster {
  canonicalLabel: string;
  confidence: number;
  strategy: "email" | "domain" | "label";
  aliases: string[];
  members: string[];
}

export interface SignalRankingInput {
  signals: Array<{
    title: string;
    category: Signal["category"];
    score: number;
    happenedAt?: string;
  }>;
}

export interface SignalRankingResult {
  rankedSignals: Array<{
    title: string;
    category: Signal["category"];
    adjustedScore: number;
    rationale: string;
  }>;
}

export interface IntelligenceClient {
  scoreAccountHealth(input: AccountHealthInput): Promise<AccountHealthAssessment>;
  assessDealRisk(input: DealRiskInput): Promise<DealRiskAssessment>;
  resolveEntities(input: EntityResolutionInput): Promise<ResolvedEntityCluster[]>;
  rankSignals(input: SignalRankingInput): Promise<SignalRankingResult>;
}

export interface AccountSnapshot {
  account: Account;
  people: Person[];
  primaryOpportunity?: Opportunity;
  interactions: Interaction[];
  signals: Signal[];
  techStack: TechStackItem[];
  healthScore?: number;
  risks: Risk[];
  recommendedActions: RecommendedAction[];
  provenance: ProviderName[];
}

export interface AccountResearchBrief {
  account: Account;
  people: Person[];
  signals: Signal[];
  techStack: TechStackItem[];
  highlights: string[];
  provenance: ProviderName[];
}

export interface TimelineEntry {
  id: string;
  type: "interaction" | "signal";
  title: string;
  summary: string;
  happenedAt: string;
  provider: ProviderName;
}

export interface AccountTimeline {
  account: Account;
  entries: TimelineEntry[];
  provenance: ProviderName[];
}

export interface OutboundEmailDraft {
  account: Account;
  recipients: string[];
  subject: string;
  body: string;
  rationale: string;
  provenance: ProviderName[];
}

export interface NextActionRecommendation {
  account: Account;
  healthScore?: number;
  recommendedAction: RecommendedAction;
  supportingSignals: Signal[];
  supportingRisks: Risk[];
  provenance: ProviderName[];
}

export interface SalesforceAccountUpsertPreview {
  provider: "salesforce";
  mode: WriteMode;
  summary: string;
  accountName: string;
  payload: {
    name: string;
    website?: string;
    description?: string;
    industry?: string;
    contactEmails: string[];
    primaryOpportunityName?: string;
    primaryOpportunityStage?: string;
  };
}
