import type { AccountQuery, ProviderMode, ProviderAccountContext } from "@sales-mcp/core";
import { BaseProviderAdapter } from "./base.js";
import { HttpRequestError, getJson } from "../shared/http.js";
import { normalizeDomain, pickRoleFromTitle } from "../shared/identity.js";

interface ApolloLiveAdapterOptions {
  mode?: ProviderMode;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
  pageSize?: number;
  maxPages?: number;
}

interface ApolloOrganizationResponse {
  organizations?: ApolloOrganizationRecord[];
  people?: ApolloPersonRecord[];
  pagination?: {
    page?: number;
    total_pages?: number;
  };
}

interface ApolloOrganizationRecord {
  id: string;
  name: string;
  website_url?: string;
  short_description?: string;
  estimated_num_employees?: number;
  industry?: string;
}

interface ApolloPersonRecord {
  id: string;
  name: string;
  title?: string;
  email?: string;
  organization_id?: string;
}

function scoreOrganization(record: ApolloOrganizationRecord, query: AccountQuery): number {
  let score = 0;
  const normalizedRecordDomain = normalizeDomain(record.website_url);
  const normalizedQueryName = query.accountName.trim().toLowerCase();
  const normalizedRecordName = record.name.trim().toLowerCase();

  if (query.domain && normalizedRecordDomain === query.domain.toLowerCase()) {
    score += 5;
  }

  if (normalizedRecordName === normalizedQueryName) {
    score += 4;
  } else if (normalizedRecordName.includes(normalizedQueryName)) {
    score += 2;
  }

  return score;
}

export function normalizeApolloContext(
  organization: ApolloOrganizationRecord,
  people: ApolloPersonRecord[],
  query: AccountQuery,
  retrievedAt: string,
): ProviderAccountContext {
  const accountId = organization.id;
  const provider = "apollo" as const;
  const normalizedPeople = people
    .filter((person) => !person.organization_id || person.organization_id === organization.id)
    .map((person) => ({
      id: person.id,
      fullName: person.name,
      title: person.title ?? "Unknown title",
      email: person.email?.toLowerCase(),
      role: pickRoleFromTitle(person.title),
      accountId,
      attributions: [
        {
          provider,
          sourceRecordId: person.id,
          retrievedAt,
          confidence: 0.78,
        },
      ],
    }));

  return {
    provider: "apollo",
    account: {
      id: accountId,
      name: organization.name,
      domain: query.domain ?? normalizeDomain(organization.website_url),
      description: organization.short_description,
      industry: organization.industry,
      employeeRange:
        organization.estimated_num_employees !== undefined
          ? `${organization.estimated_num_employees}+`
          : undefined,
      attributions: [
        {
          provider,
          sourceRecordId: organization.id,
          retrievedAt,
          confidence: 0.84,
        },
      ],
    },
    people: normalizedPeople,
    opportunities: [],
    interactions: [],
    signals: [
      {
        id: `apollo-enrichment-${organization.id}`,
        accountId,
        category: "intent",
        title: "Apollo organization fit identified",
        summary: `Apollo returned company enrichment and ${normalizedPeople.length} matched people for this account.`,
        happenedAt: retrievedAt,
        score: 0.57,
        attributions: [
          {
            provider,
            sourceRecordId: organization.id,
            retrievedAt,
            confidence: 0.65,
          },
        ],
      },
    ],
    techStack: [],
  };
}

export class ApolloLiveAdapter extends BaseProviderAdapter {
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly pageSize: number;
  private readonly maxPages: number;

  constructor(options: ApolloLiveAdapterOptions) {
    super("apollo", options.mode ?? "live");
    this.baseUrl = options.baseUrl ?? "https://api.apollo.io/api/v1";
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.retries = options.retries ?? 2;
    this.pageSize = options.pageSize ?? 10;
    this.maxPages = options.maxPages ?? 3;
  }

  override isConfigured(): boolean {
    return this.mode === "live" && Boolean(this.apiKey);
  }

  private async requestOrganizationPage(
    query: AccountQuery,
    page: number,
  ): Promise<ApolloOrganizationResponse> {
    return getJson<ApolloOrganizationResponse>({
      url: `${this.baseUrl}/organizations/search`,
      apiKey: this.apiKey,
      authStrategy: "x-api-key",
      timeoutMs: this.timeoutMs,
      retries: this.retries,
      query: {
        organization_name: query.accountName,
        q_website: query.domain,
        page,
        per_page: this.pageSize,
      },
    });
  }

  async getAccountContext(query: AccountQuery): Promise<ProviderAccountContext | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const retrievedAt = new Date().toISOString();
    let bestRecord: ApolloOrganizationRecord | undefined;
    let bestPeople: ApolloPersonRecord[] = [];
    let bestScore = -1;

    try {
      for (let page = 1; page <= this.maxPages; page += 1) {
        const payload = await this.requestOrganizationPage(query, page);

        for (const organization of payload.organizations ?? []) {
          const score = scoreOrganization(organization, query);

          if (score > bestScore) {
            bestScore = score;
            bestRecord = organization;
            bestPeople = payload.people ?? [];
          }

          if (score >= 6) {
            return normalizeApolloContext(
              organization,
              payload.people ?? [],
              query,
              retrievedAt,
            );
          }
        }

        if (payload.pagination?.total_pages && page >= payload.pagination.total_pages) {
          break;
        }

        if (!(payload.organizations?.length)) {
          break;
        }
      }
    } catch (error) {
      if (error instanceof HttpRequestError) {
        throw new Error(`Apollo adapter failed while retrieving ${query.accountName}: ${error.message}`);
      }

      throw error;
    }

    return bestRecord ? normalizeApolloContext(bestRecord, bestPeople, query, retrievedAt) : null;
  }
}
