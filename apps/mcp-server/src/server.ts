import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import {
  buildSalesforceAccountUpsertPreview,
  createProviderCatalogFromEnv,
  providerRegistry,
} from "@sales-mcp/providers";
import {
  buildAccountResearchBrief,
  buildNextActionRecommendation,
  buildAccountStatusSnapshot,
  buildAccountTimeline,
  buildOutboundEmailDraft,
  createIntelligenceClientFromEnv,
} from "@sales-mcp/workflows";

function toStructuredContent(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export function createSalesMcpServer() {
  const server = new McpServer({
    name: "sales-mcp-bundle",
    version: "0.1.0",
  });

  server.registerTool(
    "get_account_status",
    {
      title: "Get account status",
      description:
        "Synthesize CRM state, interactions, enrichment, and external signals into a unified account status snapshot.",
      inputSchema: z.object({
        accountName: z.string().min(1),
        domain: z.string().optional(),
      }),
    },
    async ({ accountName, domain }) => {
      const catalog = createProviderCatalogFromEnv();
      const intelligence = createIntelligenceClientFromEnv();
      const snapshot = await buildAccountStatusSnapshot(
        { accountName, domain },
        catalog,
        intelligence,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(snapshot, null, 2),
          },
        ],
        structuredContent: toStructuredContent(snapshot),
      };
    },
  );

  server.registerTool(
    "research_account",
    {
      title: "Research account",
      description:
        "Produce a research brief using enrichment, CRM context, technology signals, and external news.",
      inputSchema: z.object({
        accountName: z.string().min(1),
        domain: z.string().optional(),
      }),
    },
    async ({ accountName, domain }) => {
      const catalog = createProviderCatalogFromEnv();
      const intelligence = createIntelligenceClientFromEnv();
      const brief = await buildAccountResearchBrief(
        { accountName, domain },
        catalog,
        intelligence,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(brief, null, 2),
          },
        ],
        structuredContent: toStructuredContent(brief),
      };
    },
  );

  server.registerTool(
    "get_account_timeline",
    {
      title: "Get account timeline",
      description:
        "Merge CRM interactions, email activity, campaign events, and external signals into a chronological account timeline.",
      inputSchema: z.object({
        accountName: z.string().min(1),
        domain: z.string().optional(),
      }),
    },
    async ({ accountName, domain }) => {
      const catalog = createProviderCatalogFromEnv();
      const timeline = await buildAccountTimeline({ accountName, domain }, catalog);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(timeline, null, 2),
          },
        ],
        structuredContent: toStructuredContent(timeline),
      };
    },
  );

  server.registerTool(
    "recommend_next_action",
    {
      title: "Recommend next action",
      description:
        "Recommend the highest-value next action based on merged account risks, signals, and recent interactions.",
      inputSchema: z.object({
        accountName: z.string().min(1),
        domain: z.string().optional(),
      }),
    },
    async ({ accountName, domain }) => {
      const catalog = createProviderCatalogFromEnv();
      const intelligence = createIntelligenceClientFromEnv();
      const recommendation = await buildNextActionRecommendation(
        { accountName, domain },
        catalog,
        intelligence,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(recommendation, null, 2),
          },
        ],
        structuredContent: toStructuredContent(recommendation),
      };
    },
  );

  server.registerTool(
    "draft_outbound_email",
    {
      title: "Draft outbound email",
      description:
        "Generate a personalized outbound follow-up draft from the merged account snapshot.",
      inputSchema: z.object({
        accountName: z.string().min(1),
        domain: z.string().optional(),
      }),
    },
    async ({ accountName, domain }) => {
      const catalog = createProviderCatalogFromEnv();
      const intelligence = createIntelligenceClientFromEnv();
      const draft = await buildOutboundEmailDraft(
        { accountName, domain },
        catalog,
        intelligence,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(draft, null, 2),
          },
        ],
        structuredContent: toStructuredContent(draft),
      };
    },
  );

  server.registerTool(
    "push_account_to_salesforce",
    {
      title: "Push account to Salesforce",
      description:
        "Prepare a Salesforce account upsert payload from the merged account snapshot. Defaults to dry-run preview.",
      inputSchema: z.object({
        accountName: z.string().min(1),
        domain: z.string().optional(),
        mode: z.enum(["dry-run", "execute"]).default("dry-run"),
      }),
    },
    async ({ accountName, domain, mode }) => {
      const catalog = createProviderCatalogFromEnv();
      const intelligence = createIntelligenceClientFromEnv();
      const snapshot = await buildAccountStatusSnapshot(
        { accountName, domain },
        catalog,
        intelligence,
      );
      const preview = buildSalesforceAccountUpsertPreview(snapshot, mode);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(preview, null, 2),
          },
        ],
        structuredContent: toStructuredContent(preview),
      };
    },
  );

  server.registerResource(
    "provider-catalog",
    "sales-mcp://providers",
    {
      title: "Provider Catalog",
      description: "Lists supported providers, tiers, and capability coverage.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "sales-mcp://providers",
          mimeType: "application/json",
          text: JSON.stringify(providerRegistry, null, 2),
        },
      ],
    }),
  );

  return server;
}

export async function runStdioServer() {
  const server = createSalesMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
