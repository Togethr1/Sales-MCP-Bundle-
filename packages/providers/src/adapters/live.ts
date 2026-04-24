import type { AccountQuery, ProviderAccountContext, ProviderMode, ProviderName } from "@sales-mcp/core";
import { BaseProviderAdapter } from "./base.js";

interface LiveProviderAdapterOptions {
  provider: ProviderName;
  mode?: ProviderMode;
  baseUrl?: string;
  apiKey?: string;
}

export class LiveProviderAdapter extends BaseProviderAdapter {
  private readonly baseUrl?: string;
  private readonly apiKey?: string;

  constructor(options: LiveProviderAdapterOptions) {
    super(options.provider, options.mode ?? "live");
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
  }

  override isConfigured(): boolean {
    return this.mode === "live" && Boolean(this.baseUrl || this.apiKey);
  }

  async getAccountContext(query: AccountQuery): Promise<ProviderAccountContext | null> {
    if (!this.isConfigured()) {
      return null;
    }

    return {
      provider: this.provider,
      account: {
        id: `${this.provider}-${query.accountName.toLowerCase().replace(/\s+/g, "-")}`,
        name: query.accountName,
        domain: query.domain,
        attributions: [
          {
            provider: this.provider,
            sourceRecordId: "live-adapter-placeholder",
            retrievedAt: new Date().toISOString(),
            confidence: 0.35,
          },
        ],
      },
      people: [],
      opportunities: [],
      interactions: [],
      signals: [
        {
          id: `${this.provider}-availability`,
          accountId: `${this.provider}-${query.accountName.toLowerCase().replace(/\s+/g, "-")}`,
          category: "news",
          title: `${this.provider} scaffolded placeholder`,
          summary:
            "This provider is configured for live mode, but it currently returns a scaffolded placeholder context rather than a concrete API mapping.",
          happenedAt: new Date().toISOString(),
          score: 0.25,
          attributions: [
            {
              provider: this.provider,
              sourceRecordId: "live-adapter-placeholder",
              retrievedAt: new Date().toISOString(),
              confidence: 0.35,
            },
          ],
        },
      ],
      techStack: [],
    };
  }
}
