import type { AccountQuery, ProviderMode, ProviderAccountContext } from "@sales-mcp/core";
import { BaseProviderAdapter } from "./base.js";
import { HttpRequestError, getJson } from "../shared/http.js";
import {
  extractDisplayName,
  extractEmailAddress,
  pickRoleFromTitle,
  toAccountKey,
} from "../shared/identity.js";

interface GmailLiveAdapterOptions {
  mode?: ProviderMode;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
  pageSize?: number;
  maxPages?: number;
}

interface GmailListResponse {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessageDetailResponse {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
  };
}

function getHeaderValue(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value;
}

function parseParticipants(headers: GmailHeader[] | undefined): string[] {
  return ["From", "To", "Cc", "Bcc"]
    .map((name) => getHeaderValue(headers, name))
    .flatMap((value) => (value ? value.split(",").map((item) => item.trim()) : []));
}

function buildSearchTerm(query: AccountQuery): string {
  if (!query.domain) {
    return query.accountName;
  }

  return [
    `from:${query.domain}`,
    `to:${query.domain}`,
    `cc:${query.domain}`,
    `bcc:${query.domain}`,
  ].join(" OR ");
}

export function normalizeGmailMessages(
  messages: GmailMessageDetailResponse[],
  query: AccountQuery,
  retrievedAt: string,
): ProviderAccountContext {
  const accountId = toAccountKey(query.accountName);
  const provider = "gmail" as const;
  const people = new Map<string, ProviderAccountContext["people"][number]>();
  const interactions: ProviderAccountContext["interactions"] = [];

  for (const message of messages) {
    const headers = message.payload?.headers;
    const from = getHeaderValue(headers, "From");
    const subject = getHeaderValue(headers, "Subject") ?? "No subject";
    const participants = parseParticipants(headers);

    for (const participant of participants) {
      const email = extractEmailAddress(participant);
      if (!email) {
        continue;
      }

      const existing = people.get(email);
      const attribution = {
        provider,
        sourceRecordId: message.id,
        retrievedAt,
        confidence: 0.62,
      };

      if (existing) {
        existing.attributions.push(attribution);
        continue;
      }

      people.set(email, {
        id: `gmail-${email}`,
        fullName: extractDisplayName(participant) ?? email,
        title: "Unknown title",
        email,
        role:
          query.domain && email.endsWith(`@${query.domain}`)
            ? "champion"
            : pickRoleFromTitle(undefined),
        accountId,
        attributions: [attribution],
      });
    }

    interactions.push({
      id: message.id,
      accountId,
      channel: "email",
      summary: `${subject}: ${message.snippet ?? "Email interaction matched the account domain."}`,
      happenedAt: message.internalDate
        ? new Date(Number(message.internalDate)).toISOString()
        : retrievedAt,
      contactEmail: extractEmailAddress(from) ?? undefined,
      attributions: [
        {
          provider,
          sourceRecordId: message.id,
          retrievedAt,
          confidence: 0.66,
        },
      ],
    });
  }

  interactions.sort((left, right) => right.happenedAt.localeCompare(left.happenedAt));

  return {
    provider: "gmail",
    people: [...people.values()],
    opportunities: [],
    interactions,
    signals:
      interactions.length > 0
        ? [
            {
              id: `gmail-engagement-${accountId}`,
              accountId,
              category: "engagement",
              title: "Recent email activity detected",
              summary: `Matched Gmail threads show ${interactions.length} recent conversation touchpoints for this account.`,
              happenedAt: interactions[0]?.happenedAt ?? retrievedAt,
              score: 0.64,
              attributions: interactions.flatMap((interaction) => interaction.attributions).slice(0, 5),
            },
          ]
        : [],
    techStack: [],
  };
}

export class GmailLiveAdapter extends BaseProviderAdapter {
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly pageSize: number;
  private readonly maxPages: number;

  constructor(options: GmailLiveAdapterOptions) {
    super("gmail", options.mode ?? "live");
    this.baseUrl = options.baseUrl ?? "https://gmail.googleapis.com/gmail/v1";
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.retries = options.retries ?? 2;
    this.pageSize = options.pageSize ?? 10;
    this.maxPages = options.maxPages ?? 3;
  }

  override isConfigured(): boolean {
    return this.mode === "live" && Boolean(this.apiKey);
  }

  private async listMessageIds(query: AccountQuery) {
    const messageIds: Array<{ id: string; threadId: string }> = [];
    let pageToken: string | undefined;
    let pageCount = 0;

    do {
      const payload = await getJson<GmailListResponse>({
        url: `${this.baseUrl}/users/me/messages`,
        apiKey: this.apiKey,
        authStrategy: "bearer",
        timeoutMs: this.timeoutMs,
        retries: this.retries,
        query: {
          q: buildSearchTerm(query),
          maxResults: this.pageSize,
          pageToken,
        },
      });

      messageIds.push(...(payload.messages ?? []));
      pageToken = payload.nextPageToken;
      pageCount += 1;
    } while (pageToken && pageCount < this.maxPages);

    return [...new Map(messageIds.map((message) => [message.id, message])).values()];
  }

  private async loadMessageDetails(messages: Array<{ id: string; threadId: string }>) {
    const results = await Promise.allSettled(
      messages.map((message) =>
        getJson<GmailMessageDetailResponse>({
          url: `${this.baseUrl}/users/me/messages/${message.id}`,
          apiKey: this.apiKey,
          authStrategy: "bearer",
          timeoutMs: this.timeoutMs,
          retries: this.retries,
          query: {
            format: "metadata",
          },
        }),
      ),
    );

    return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  }

  async getAccountContext(query: AccountQuery): Promise<ProviderAccountContext | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const messageIds = await this.listMessageIds(query);

      if (messageIds.length === 0) {
        return null;
      }

      const messages = await this.loadMessageDetails(messageIds);

      if (messages.length === 0) {
        return null;
      }

      return normalizeGmailMessages(messages, query, new Date().toISOString());
    } catch (error) {
      if (error instanceof HttpRequestError) {
        throw new Error(`Gmail adapter failed while retrieving ${query.accountName}: ${error.message}`);
      }

      throw error;
    }
  }
}
