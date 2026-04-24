import type {
  ProviderAuthStrategy,
  ProviderMode,
  ProviderName,
  ProviderRuntimeConfig,
  RuntimeEnvironment,
} from "@sales-mcp/core";

const providerNames: ProviderName[] = [
  "gmail",
  "smartlead",
  "clay",
  "zoominfo",
  "salesforce",
  "pitchbook",
  "crunchbase",
  "builtwith",
  "apollo",
  "trigify",
  "apify",
  "serper",
];

interface ProviderDefaults {
  authStrategy: ProviderAuthStrategy;
  defaultBaseUrl?: string;
  timeoutMs: number;
  retryCount: number;
  pagination: {
    pageSize: number;
    maxPages: number;
  };
}

const defaultProviderSettings: ProviderDefaults = {
  authStrategy: "bearer",
  timeoutMs: 10_000,
  retryCount: 1,
  pagination: {
    pageSize: 5,
    maxPages: 2,
  },
};

const providerDefaults: Record<ProviderName, ProviderDefaults> = {
  gmail: {
    authStrategy: "bearer",
    defaultBaseUrl: "https://gmail.googleapis.com/gmail/v1",
    timeoutMs: 8_000,
    retryCount: 2,
    pagination: {
      pageSize: 10,
      maxPages: 3,
    },
  },
  smartlead: {
    ...defaultProviderSettings,
    authStrategy: "x-api-key",
  },
  clay: {
    ...defaultProviderSettings,
    authStrategy: "bearer",
  },
  zoominfo: {
    ...defaultProviderSettings,
    authStrategy: "bearer",
  },
  salesforce: {
    authStrategy: "bearer",
    timeoutMs: 12_000,
    retryCount: 2,
    pagination: {
      pageSize: 10,
      maxPages: 3,
    },
  },
  pitchbook: {
    ...defaultProviderSettings,
    authStrategy: "bearer",
  },
  crunchbase: {
    ...defaultProviderSettings,
    authStrategy: "bearer",
  },
  builtwith: {
    ...defaultProviderSettings,
    authStrategy: "x-api-key",
  },
  apollo: {
    authStrategy: "x-api-key",
    defaultBaseUrl: "https://api.apollo.io/api/v1",
    timeoutMs: 8_000,
    retryCount: 2,
    pagination: {
      pageSize: 10,
      maxPages: 3,
    },
  },
  trigify: {
    ...defaultProviderSettings,
    authStrategy: "bearer",
  },
  apify: {
    ...defaultProviderSettings,
    authStrategy: "bearer",
  },
  serper: {
    authStrategy: "x-api-key",
    defaultBaseUrl: "https://google.serper.dev",
    timeoutMs: 8_000,
    retryCount: 2,
    pagination: {
      pageSize: 5,
      maxPages: 2,
    },
  },
};

function toEnvKey(provider: ProviderName): string {
  return provider.toUpperCase().replace(".", "_");
}

function readProviderMode(value: string | undefined): ProviderMode {
  if (value === "live" || value === "fixture" || value === "disabled") {
    return value;
  }

  return "fixture";
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function getProviderRuntimeConfig(
  env: RuntimeEnvironment = process.env,
): ProviderRuntimeConfig[] {
  return providerNames.map((provider) => {
    const envKey = toEnvKey(provider);
    const defaults = providerDefaults[provider];

    return {
      provider,
      mode: readProviderMode(env[`SALES_MCP_${envKey}_MODE`]),
      apiKeyEnvVar:
        provider === "salesforce" || provider === "gmail"
          ? undefined
          : `SALES_MCP_${envKey}_API_KEY`,
      accessTokenEnvVar:
        provider === "salesforce" || provider === "gmail"
          ? `SALES_MCP_${envKey}_ACCESS_TOKEN`
          : undefined,
      legacyApiKeyEnvVar:
        provider === "salesforce" || provider === "gmail"
          ? `SALES_MCP_${envKey}_API_KEY`
          : undefined,
      baseUrlEnvVar: `SALES_MCP_${envKey}_BASE_URL`,
      authStrategy: defaults.authStrategy,
      defaultBaseUrl: env[`SALES_MCP_${envKey}_BASE_URL`] ?? defaults.defaultBaseUrl,
      timeoutMs: readPositiveInteger(
        env[`SALES_MCP_${envKey}_TIMEOUT_MS`],
        defaults.timeoutMs,
      ),
      retryCount: readPositiveInteger(
        env[`SALES_MCP_${envKey}_RETRY_COUNT`],
        defaults.retryCount,
      ),
      pagination: {
        pageSize: readPositiveInteger(
          env[`SALES_MCP_${envKey}_PAGE_SIZE`],
          defaults.pagination.pageSize,
        ),
        maxPages: readPositiveInteger(
          env[`SALES_MCP_${envKey}_MAX_PAGES`],
          defaults.pagination.maxPages,
        ),
      },
    };
  });
}
