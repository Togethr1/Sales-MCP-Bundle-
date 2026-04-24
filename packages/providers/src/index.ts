import type { AccountQuery, ProviderCatalog, ProviderAccountContext } from "@sales-mcp/core";
import { accountStatusFixture } from "@sales-mcp/fixtures";
import { AdapterBackedProviderCatalog } from "./catalog.js";
import { FixtureProviderAdapter } from "./adapters/fixture.js";
import { providerRegistry } from "./registry.js";
export { createProviderCatalogFromEnv } from "./factory.js";
export { getProviderRuntimeConfig } from "./config.js";
export { providerRegistry } from "./registry.js";
export { buildSalesforceAccountUpsertPreview } from "./salesforce-preview.js";

class FixtureProviderCatalog implements ProviderCatalog {
  async getAccountContexts(query: AccountQuery): Promise<ProviderAccountContext[]> {
    return accountStatusFixture.filter((context) => {
      const matchedName = context.account?.name ?? "Acme Analytics";
      return matchedName.toLowerCase() === query.accountName.toLowerCase();
    });
  }
}

export function createFixtureProviderCatalog(): ProviderCatalog {
  return new FixtureProviderCatalog();
}

export function createFixtureProviderCatalogForAllProviders(): ProviderCatalog {
  return new AdapterBackedProviderCatalog(
    providerRegistry.map((descriptor) => new FixtureProviderAdapter(descriptor.name)),
  );
}
