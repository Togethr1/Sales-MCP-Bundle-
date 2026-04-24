import type { AccountQuery, ProviderAccountContext, ProviderAdapter, ProviderCatalog } from "@sales-mcp/core";

export class AdapterBackedProviderCatalog implements ProviderCatalog {
  constructor(private readonly adapters: ProviderAdapter[]) {}

  async getAccountContexts(query: AccountQuery): Promise<ProviderAccountContext[]> {
    const contexts = await Promise.allSettled(
      this.adapters
        .filter((adapter) => adapter.isConfigured())
        .map((adapter) => adapter.getAccountContext(query)),
    );

    return contexts.flatMap((result) => {
      if (result.status === "rejected") {
        console.warn(`Provider adapter request failed: ${String(result.reason)}`);
        return [];
      }

      return result.value ? [result.value] : [];
    });
  }
}
