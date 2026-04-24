import type { RuntimeEnvironment } from "@sales-mcp/core";

export interface OutboundSenderConfig {
  senderName: string;
  senderTitle?: string;
  senderCompany?: string;
}

function readTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getDefaultEnv(): RuntimeEnvironment {
  return typeof process !== "undefined" ? process.env : {};
}

export function getOutboundSenderConfig(
  env: RuntimeEnvironment = getDefaultEnv(),
): OutboundSenderConfig {
  return {
    senderName: readTrimmed(env.SALES_MCP_OUTBOUND_SENDER_NAME) ?? "Your name",
    senderTitle: readTrimmed(env.SALES_MCP_OUTBOUND_SENDER_TITLE),
    senderCompany: readTrimmed(env.SALES_MCP_OUTBOUND_SENDER_COMPANY),
  };
}
