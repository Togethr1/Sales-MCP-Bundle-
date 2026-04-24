import type { AccountQuery, ProviderAccountContext, ProviderAdapter, ProviderMode, ProviderName } from "@sales-mcp/core";

export abstract class BaseProviderAdapter implements ProviderAdapter {
  readonly provider: ProviderName;
  readonly mode: ProviderMode;

  protected constructor(provider: ProviderName, mode: ProviderMode) {
    this.provider = provider;
    this.mode = mode;
  }

  isConfigured(): boolean {
    return this.mode !== "disabled";
  }

  abstract getAccountContext(query: AccountQuery): Promise<ProviderAccountContext | null>;
}

