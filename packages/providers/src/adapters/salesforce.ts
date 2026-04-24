import type { AccountQuery, ProviderMode, ProviderAccountContext } from "@sales-mcp/core";
import { BaseProviderAdapter } from "./base.js";
import { HttpRequestError, getJson } from "../shared/http.js";
import { normalizeDomain, pickRoleFromTitle } from "../shared/identity.js";

interface SalesforceLiveAdapterOptions {
  mode?: ProviderMode;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
  pageSize?: number;
  maxPages?: number;
}

interface SalesforceQueryResponse {
  records?: SalesforceAccountRecord[];
  nextRecordsUrl?: string;
}

interface SalesforceChildRecords<T> {
  records?: T[];
}

interface SalesforceContactRecord {
  Id: string;
  Name: string;
  Email?: string;
  Title?: string;
  LastModifiedDate?: string;
}

interface SalesforceOpportunityRecord {
  Id: string;
  Name: string;
  StageName: string;
  Amount?: number;
  CloseDate?: string;
  LastModifiedDate?: string;
}

interface SalesforceTaskRecord {
  Id: string;
  Subject?: string;
  ActivityDate?: string;
  Status?: string;
  Description?: string;
  LastModifiedDate?: string;
}

interface SalesforceAccountRecord {
  Id: string;
  Name: string;
  Website?: string;
  Industry?: string;
  Description?: string;
  BillingCity?: string;
  BillingState?: string;
  LastModifiedDate?: string;
  Contacts?: SalesforceChildRecords<SalesforceContactRecord>;
  Opportunities?: SalesforceChildRecords<SalesforceOpportunityRecord>;
  Tasks?: SalesforceChildRecords<SalesforceTaskRecord>;
}

function sanitizeSoqlLiteral(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeSoqlLiteral(value: string): string {
  return sanitizeSoqlLiteral(value);
}

export function escapeSoqlLikeFragment(value: string): string {
  return sanitizeSoqlLiteral(value).replace(/[%_]/g, "\\$&");
}

function normalizeSalesforceTaskSummary(task: SalesforceTaskRecord): string {
  return [task.Subject, task.Status, task.Description].filter(Boolean).join(" | ");
}

function scoreSalesforceRecord(record: SalesforceAccountRecord, query: AccountQuery): number {
  let score = 0;
  const normalizedRecordDomain = normalizeDomain(record.Website);
  const normalizedQueryName = query.accountName.trim().toLowerCase();
  const normalizedRecordName = record.Name.trim().toLowerCase();

  if (query.domain && normalizedRecordDomain === query.domain.toLowerCase()) {
    score += 5;
  } else if (query.domain && normalizedRecordDomain?.includes(query.domain.toLowerCase())) {
    score += 3;
  }

  if (normalizedRecordName === normalizedQueryName) {
    score += 4;
  } else if (normalizedRecordName.startsWith(normalizedQueryName)) {
    score += 2;
  }

  return score;
}

function buildSearchQueries(query: AccountQuery, pageSize: number): string[] {
  // This remains a controlled query builder: only fixed fields and operators are
  // interpolated, and user input is limited to escaped string literals.
  const baseSelect = [
    "SELECT Id, Name, Website, Industry, Description, BillingCity, BillingState, LastModifiedDate,",
    `(SELECT Id, Name, Email, Title, LastModifiedDate FROM Contacts ORDER BY LastModifiedDate DESC LIMIT ${pageSize}),`,
    `(SELECT Id, Name, StageName, Amount, CloseDate, LastModifiedDate FROM Opportunities ORDER BY LastModifiedDate DESC LIMIT ${Math.max(3, Math.min(pageSize, 10))}),`,
    `(SELECT Id, Subject, ActivityDate, Status, Description, LastModifiedDate FROM Tasks ORDER BY ActivityDate DESC LIMIT ${pageSize})`,
    "FROM Account",
  ];

  const queries: string[] = [];

  if (query.domain) {
    queries.push(
      [
        ...baseSelect,
        `WHERE Website LIKE '%${escapeSoqlLikeFragment(query.domain)}%'`,
        "ORDER BY LastModifiedDate DESC",
        `LIMIT ${pageSize}`,
      ].join(" "),
    );
  }

  queries.push(
    [
      ...baseSelect,
      `WHERE Name = '${escapeSoqlLiteral(query.accountName)}'`,
      "ORDER BY LastModifiedDate DESC",
      `LIMIT ${pageSize}`,
    ].join(" "),
  );

  queries.push(
    [
      ...baseSelect,
      `WHERE Name LIKE '${escapeSoqlLikeFragment(query.accountName)}%'`,
      "ORDER BY LastModifiedDate DESC",
      `LIMIT ${pageSize}`,
    ].join(" "),
  );

  return queries;
}

export function normalizeSalesforceAccountContext(
  record: SalesforceAccountRecord,
  query: AccountQuery,
  retrievedAt: string,
): ProviderAccountContext {
  const accountId = record.Id;
  const provider = "salesforce" as const;
  const normalizedContacts =
    record.Contacts?.records?.map((contact) => ({
      id: contact.Id,
      fullName: contact.Name,
      title: contact.Title ?? "Unknown title",
      email: contact.Email?.toLowerCase(),
      role: pickRoleFromTitle(contact.Title),
      accountId,
      attributions: [
        {
          provider,
          sourceRecordId: contact.Id,
          retrievedAt,
          confidence: 0.88,
        },
      ],
    })) ?? [];

  const normalizedOpportunities =
    record.Opportunities?.records?.map((opportunity) => ({
      id: opportunity.Id,
      accountId,
      name: opportunity.Name,
      stage: opportunity.StageName,
      amount: opportunity.Amount,
      closeDate: opportunity.CloseDate,
      lastUpdatedAt: opportunity.LastModifiedDate ?? retrievedAt,
      attributions: [
        {
          provider,
          sourceRecordId: opportunity.Id,
          retrievedAt,
          confidence: 0.91,
        },
      ],
    })) ?? [];

  const normalizedInteractions =
    record.Tasks?.records?.map((task) => ({
      id: task.Id,
      accountId,
      channel: "crm_note" as const,
      summary: normalizeSalesforceTaskSummary(task),
      happenedAt: task.ActivityDate ?? task.LastModifiedDate ?? retrievedAt,
      attributions: [
        {
          provider,
          sourceRecordId: task.Id,
          retrievedAt,
          confidence: 0.8,
        },
      ],
    })) ?? [];

  return {
    provider: "salesforce",
    account: {
      id: accountId,
      name: record.Name,
      domain: query.domain ?? normalizeDomain(record.Website),
      description: record.Description,
      industry: record.Industry,
      headquarters:
        [record.BillingCity, record.BillingState].filter(Boolean).join(", ") || undefined,
      attributions: [
        {
          provider,
          sourceRecordId: record.Id,
          retrievedAt,
          confidence: 0.92,
        },
      ],
    },
    people: normalizedContacts,
    opportunities: normalizedOpportunities,
    interactions: normalizedInteractions,
    signals: [],
    techStack: [],
  };
}

export class SalesforceLiveAdapter extends BaseProviderAdapter {
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly pageSize: number;
  private readonly maxPages: number;

  constructor(options: SalesforceLiveAdapterOptions) {
    super("salesforce", options.mode ?? "live");
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 12_000;
    this.retries = options.retries ?? 2;
    this.pageSize = options.pageSize ?? 10;
    this.maxPages = options.maxPages ?? 3;
  }

  override isConfigured(): boolean {
    return this.mode === "live" && Boolean(this.baseUrl && this.apiKey);
  }

  private buildQueryUrl(soql: string): string {
    return `${this.baseUrl}/services/data/v61.0/query?q=${encodeURIComponent(soql)}`;
  }

  private async requestQueryPage(url: string): Promise<SalesforceQueryResponse> {
    return getJson<SalesforceQueryResponse>({
      url,
      apiKey: this.apiKey,
      authStrategy: "bearer",
      timeoutMs: this.timeoutMs,
      retries: this.retries,
    });
  }

  async getAccountContext(query: AccountQuery): Promise<ProviderAccountContext | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const retrievedAt = new Date().toISOString();
    let bestRecord: SalesforceAccountRecord | undefined;
    let bestScore = -1;

    try {
      for (const soql of buildSearchQueries(query, this.pageSize)) {
        let pageUrl: string | undefined = this.buildQueryUrl(soql);
        let pageCount = 0;

        while (pageUrl && pageCount < this.maxPages) {
          const payload = await this.requestQueryPage(pageUrl);

          for (const record of payload.records ?? []) {
            const score = scoreSalesforceRecord(record, query);

            if (score > bestScore) {
              bestScore = score;
              bestRecord = record;
            }

            if (score >= 6) {
              return normalizeSalesforceAccountContext(record, query, retrievedAt);
            }
          }

          pageUrl = payload.nextRecordsUrl
            ? `${this.baseUrl}${payload.nextRecordsUrl}`
            : undefined;
          pageCount += 1;
        }
      }
    } catch (error) {
      if (error instanceof HttpRequestError) {
        throw new Error(
          `Salesforce adapter failed while retrieving ${query.accountName}: ${error.message}`,
        );
      }

      throw error;
    }

    return bestRecord
      ? normalizeSalesforceAccountContext(bestRecord, query, retrievedAt)
      : null;
  }
}
