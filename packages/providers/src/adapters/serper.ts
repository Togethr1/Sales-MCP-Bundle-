import type { AccountQuery, ProviderMode, ProviderAccountContext } from "@sales-mcp/core";
import { BaseProviderAdapter } from "./base.js";
import { HttpRequestError, requestJson } from "../shared/http.js";
import { toAccountKey } from "../shared/identity.js";

interface SerperLiveAdapterOptions {
  mode?: ProviderMode;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
  pageSize?: number;
  maxPages?: number;
}

interface SerperResult {
  title: string;
  snippet?: string;
  date?: string;
  link?: string;
}

interface SerperSearchResponse {
  organic?: SerperResult[];
  news?: SerperResult[];
}

function inferSignalCategory(title: string, snippet: string | undefined) {
  const haystack = `${title} ${snippet ?? ""}`.toLowerCase();

  if (haystack.includes("hiring") || haystack.includes("job")) {
    return "hiring" as const;
  }

  if (haystack.includes("funding") || haystack.includes("series")) {
    return "funding" as const;
  }

  if (haystack.includes("launch") || haystack.includes("announce")) {
    return "news" as const;
  }

  return "intent" as const;
}

export function normalizeSerperResponse(
  payload: SerperSearchResponse,
  query: AccountQuery,
  retrievedAt: string,
): ProviderAccountContext {
  const accountId = toAccountKey(query.accountName);
  const provider = "serper" as const;
  const dedupedItems = [
    ...(payload.news ?? []).map((item) => ({ ...item, source: "news" as const })),
    ...(payload.organic ?? []).map((item) => ({ ...item, source: "organic" as const })),
  ].filter(
    (item, index, items) =>
      items.findIndex(
        (candidate) => (candidate.link || candidate.title) === (item.link || item.title),
      ) === index,
  );

  return {
    provider: "serper",
    people: [],
    opportunities: [],
    interactions: [],
    signals: dedupedItems.slice(0, 6).map((item, index) => ({
      id: `serper-${index}`,
      accountId,
      category: inferSignalCategory(item.title, item.snippet),
      title: item.title,
      summary: item.snippet ?? item.link ?? "Matched search result from Serper.",
      happenedAt: item.date ?? retrievedAt,
      score:
        (item.source === "news" ? 0.62 : 0.55) + Math.max(0, 0.03 * (5 - index)),
      attributions: [
        {
          provider,
          sourceRecordId: item.link ?? `result-${index}`,
          retrievedAt,
          confidence: item.source === "news" ? 0.66 : 0.61,
        },
      ],
    })),
    techStack: [],
  };
}

export class SerperLiveAdapter extends BaseProviderAdapter {
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly pageSize: number;
  private readonly maxPages: number;

  constructor(options: SerperLiveAdapterOptions) {
    super("serper", options.mode ?? "live");
    this.baseUrl = options.baseUrl ?? "https://google.serper.dev";
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.retries = options.retries ?? 2;
    this.pageSize = options.pageSize ?? 5;
    this.maxPages = options.maxPages ?? 2;
  }

  override isConfigured(): boolean {
    return this.mode === "live" && Boolean(this.apiKey);
  }

  private async requestEndpoint(
    endpoint: "search" | "news",
    query: AccountQuery,
    page: number,
  ): Promise<SerperSearchResponse> {
    return requestJson<SerperSearchResponse>({
      url: `${this.baseUrl}/${endpoint}`,
      method: "POST",
      apiKey: this.apiKey,
      authStrategy: "x-api-key",
      timeoutMs: this.timeoutMs,
      retries: this.retries,
      body: {
        q: query.accountName,
        page,
        num: this.pageSize,
      },
    });
  }

  async getAccountContext(query: AccountQuery): Promise<ProviderAccountContext | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const retrievedAt = new Date().toISOString();
    const aggregatePayload: SerperSearchResponse = {
      organic: [],
      news: [],
    };
    let succeeded = false;

    for (let page = 1; page <= this.maxPages; page += 1) {
      const [searchResult, newsResult] = await Promise.allSettled([
        this.requestEndpoint("search", query, page),
        this.requestEndpoint("news", query, page),
      ]);

      if (searchResult.status === "fulfilled") {
        aggregatePayload.organic?.push(...(searchResult.value.organic ?? []));
        succeeded = true;
      }

      if (newsResult.status === "fulfilled") {
        aggregatePayload.news?.push(...(newsResult.value.news ?? []));
        succeeded = true;
      }

      if (
        searchResult.status === "fulfilled" &&
        newsResult.status === "fulfilled" &&
        !(searchResult.value.organic?.length || newsResult.value.news?.length)
      ) {
        break;
      }
    }

    if (!succeeded) {
      throw new Error(`Serper adapter failed while retrieving ${query.accountName}.`);
    }

    try {
      return normalizeSerperResponse(aggregatePayload, query, retrievedAt);
    } catch (error) {
      if (error instanceof HttpRequestError) {
        throw new Error(`Serper adapter failed while retrieving ${query.accountName}: ${error.message}`);
      }

      throw error;
    }
  }
}
