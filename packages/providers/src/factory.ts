import type { ProviderAdapter, ProviderName, RuntimeEnvironment } from "@sales-mcp/core";
import { ApolloLiveAdapter } from "./adapters/apollo.js";
import { AdapterBackedProviderCatalog } from "./catalog.js";
import { GmailLiveAdapter } from "./adapters/gmail.js";
import { getProviderRuntimeConfig } from "./config.js";
import { FixtureProviderAdapter } from "./adapters/fixture.js";
import { LiveProviderAdapter } from "./adapters/live.js";
import { SalesforceLiveAdapter } from "./adapters/salesforce.js";
import { SerperLiveAdapter } from "./adapters/serper.js";

function toEnvKey(provider: ProviderName): string {
  return provider.toUpperCase().replace(".", "_");
}

function readProviderCredential(
  env: RuntimeEnvironment,
  config: ReturnType<typeof getProviderRuntimeConfig>[number],
  envKey: string,
) {
  if (config.accessTokenEnvVar) {
    return (
      env[config.accessTokenEnvVar] ??
      (config.legacyApiKeyEnvVar ? env[config.legacyApiKeyEnvVar] : undefined)
    );
  }

  return env[config.apiKeyEnvVar ?? `SALES_MCP_${envKey}_API_KEY`];
}

export function createProviderCatalogFromEnv(env: RuntimeEnvironment = process.env) {
  const adapters: ProviderAdapter[] = getProviderRuntimeConfig(env).flatMap((config) => {
    if (config.mode === "disabled") {
      return [];
    }

    if (config.mode === "live") {
      const envKey = toEnvKey(config.provider);
      const baseUrl =
        env[config.baseUrlEnvVar ?? `SALES_MCP_${envKey}_BASE_URL`] ?? config.defaultBaseUrl;
      const apiKey = readProviderCredential(env, config, envKey);
      const adapterOptions = {
        baseUrl,
        apiKey,
        timeoutMs: config.timeoutMs,
        retries: config.retryCount,
        pageSize: config.pagination.pageSize,
        maxPages: config.pagination.maxPages,
      };

      switch (config.provider) {
        case "salesforce":
          return [new SalesforceLiveAdapter(adapterOptions)];
        case "gmail":
          return [new GmailLiveAdapter(adapterOptions)];
        case "apollo":
          return [new ApolloLiveAdapter(adapterOptions)];
        case "serper":
          return [new SerperLiveAdapter(adapterOptions)];
        default:
          return [
            new LiveProviderAdapter({
              provider: config.provider,
              baseUrl,
              apiKey,
            }),
          ];
      }
    }

    return [new FixtureProviderAdapter(config.provider, "fixture")];
  });

  return new AdapterBackedProviderCatalog(adapters);
}
