import {
  buildSalesforceAccountUpsertPreview,
  createProviderCatalogFromEnv,
} from "@sales-mcp/providers";
import {
  buildNextActionRecommendation,
  buildOutboundEmailDraft,
  buildAccountStatusSnapshot,
  buildAccountTimeline,
  createIntelligenceClientFromEnv,
} from "@sales-mcp/workflows";
import type {
  AccountSnapshot,
  AccountTimeline,
  NextActionRecommendation,
  OutboundEmailDraft,
  SalesforceAccountUpsertPreview,
} from "@sales-mcp/core";

export interface DemoData {
  snapshot: AccountSnapshot;
  recommendation: NextActionRecommendation;
  draft: OutboundEmailDraft;
  salesforcePreview: SalesforceAccountUpsertPreview;
  timeline: AccountTimeline;
}

export async function loadDemoData(): Promise<DemoData> {
  const catalog = createProviderCatalogFromEnv(
    import.meta.env as Record<string, string | undefined>,
  );
  const intelligence = createIntelligenceClientFromEnv({
    SALES_MCP_INTELLIGENCE_BASE_URL: import.meta.env.VITE_INTELLIGENCE_BASE_URL,
  });
  const query = { accountName: "Acme Analytics", domain: "acmeanalytics.io" };

  const [snapshot, recommendation, draft, timeline] = await Promise.all([
    buildAccountStatusSnapshot(query, catalog, intelligence),
    buildNextActionRecommendation(query, catalog, intelligence),
    buildOutboundEmailDraft(query, catalog, intelligence),
    buildAccountTimeline(query, catalog),
  ]);
  const salesforcePreview = buildSalesforceAccountUpsertPreview(snapshot, "dry-run");

  return { snapshot, recommendation, draft, salesforcePreview, timeline };
}
