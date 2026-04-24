import type { RuntimeEnvironment } from "@sales-mcp/core";

export interface McpServerRuntimeConfig {
  intelligenceBaseUrl?: string;
}

export function getMcpServerRuntimeConfig(
  env: RuntimeEnvironment = process.env,
): McpServerRuntimeConfig {
  return {
    intelligenceBaseUrl: env.SALES_MCP_INTELLIGENCE_BASE_URL,
  };
}
