import type { ProviderName } from "@sales-mcp/core";

export type ProviderTier = "deep" | "thin" | "fixture-first";
export type ProviderInitialDepth = "implemented" | "scaffolded" | "fixture-backed";

export interface ProviderDescriptor {
  name: ProviderName;
  tier: ProviderTier;
  primaryRole: string;
  capabilities: string[];
  initialDepth: ProviderInitialDepth;
  authModel: string;
}

export const providerRegistry: ProviderDescriptor[] = [
  {
    name: "salesforce",
    tier: "deep",
    primaryRole: "CRM, opportunities, notes, and account state",
    capabilities: ["accounts", "contacts", "opportunities", "activities", "writes"],
    initialDepth: "implemented",
    authModel: "OAuth 2.0 access token (pre-fetched)",
  },
  {
    name: "gmail",
    tier: "deep",
    primaryRole: "Email threads and interaction state",
    capabilities: ["threads", "messages", "engagement", "drafting"],
    initialDepth: "implemented",
    authModel: "OAuth 2.0 access token (pre-fetched)",
  },
  {
    name: "apollo",
    tier: "deep",
    primaryRole: "People and account enrichment",
    capabilities: ["people-search", "company-search", "enrichment"],
    initialDepth: "implemented",
    authModel: "x-api-key",
  },
  {
    name: "clay",
    tier: "deep",
    primaryRole: "Contact enrichment and data operations",
    capabilities: ["enrichment", "lookups", "data-workflows"],
    initialDepth: "scaffolded",
    authModel: "Scaffolded placeholder",
  },
  {
    name: "serper",
    tier: "deep",
    primaryRole: "Search and news retrieval",
    capabilities: ["web-search", "news", "site-discovery"],
    initialDepth: "implemented",
    authModel: "x-api-key",
  },
  {
    name: "apify",
    tier: "deep",
    primaryRole: "Crawled signals and structured extraction",
    capabilities: ["crawling", "extraction", "jobs"],
    initialDepth: "scaffolded",
    authModel: "Scaffolded placeholder",
  },
  {
    name: "smartlead",
    tier: "thin",
    primaryRole: "Campaign state and outbound signals",
    capabilities: ["campaigns", "replies", "engagement"],
    initialDepth: "scaffolded",
    authModel: "Scaffolded placeholder",
  },
  {
    name: "crunchbase",
    tier: "thin",
    primaryRole: "Company profile and funding signals",
    capabilities: ["company-profile", "funding", "news"],
    initialDepth: "scaffolded",
    authModel: "Scaffolded placeholder",
  },
  {
    name: "builtwith",
    tier: "thin",
    primaryRole: "Technology footprint",
    capabilities: ["tech-stack", "site-intelligence"],
    initialDepth: "scaffolded",
    authModel: "Scaffolded placeholder",
  },
  {
    name: "zoominfo",
    tier: "thin",
    primaryRole: "Firmographics and intent signals",
    capabilities: ["firmographics", "intent", "contacts"],
    initialDepth: "scaffolded",
    authModel: "Scaffolded placeholder",
  },
  {
    name: "pitchbook",
    tier: "fixture-first",
    primaryRole: "Private-market context",
    capabilities: ["investor-context", "market-notes"],
    initialDepth: "fixture-backed",
    authModel: "Fixture-backed",
  },
  {
    name: "trigify",
    tier: "fixture-first",
    primaryRole: "Trigger event detection",
    capabilities: ["trigger-events", "site-change-signals"],
    initialDepth: "fixture-backed",
    authModel: "Fixture-backed",
  },
];
