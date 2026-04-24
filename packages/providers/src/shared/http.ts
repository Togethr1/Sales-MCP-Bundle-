import type { ProviderAuthStrategy } from "@sales-mcp/core";

export class HttpRequestError extends Error {
  readonly status?: number;
  readonly url: string;
  readonly responseBody?: string;

  constructor(message: string, options: { status?: number; url: string; responseBody?: string }) {
    super(message);
    this.name = "HttpRequestError";
    this.status = options.status;
    this.url = options.url;
    this.responseBody = options.responseBody;
  }
}

interface JsonRequestOptions {
  url: string;
  method?: "GET" | "POST";
  apiKey?: string;
  authStrategy?: ProviderAuthStrategy;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
}

const RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function appendQueryParams(
  url: string,
  query: Record<string, string | number | boolean | undefined> | undefined,
): string {
  if (!query) {
    return url;
  }

  const parsedUrl = new URL(url);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    parsedUrl.searchParams.set(key, String(value));
  }

  return parsedUrl.toString();
}

function buildAuthHeaders(
  apiKey: string | undefined,
  authStrategy: ProviderAuthStrategy,
): Record<string, string> {
  if (!apiKey || authStrategy === "none") {
    return {};
  }

  if (authStrategy === "x-api-key") {
    return {
      "x-api-key": apiKey,
    };
  }

  return {
    authorization: `Bearer ${apiKey}`,
  };
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof HttpRequestError)) {
    return false;
  }

  return error.status !== undefined && RETRYABLE_STATUSES.has(error.status);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requestJson<T>({
  url,
  method = "GET",
  apiKey,
  authStrategy = "bearer",
  headers = {},
  query,
  body,
  timeoutMs = 10_000,
  retries = 1,
}: JsonRequestOptions): Promise<T> {
  const requestUrl = appendQueryParams(url, query);
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(requestUrl, {
        method,
        headers: {
          accept: "application/json",
          ...(body ? { "content-type": "application/json" } : {}),
          ...buildAuthHeaders(apiKey, authStrategy),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text();

        throw new HttpRequestError(
          `Request failed with status ${response.status} for ${requestUrl}`,
          {
            status: response.status,
            url: requestUrl,
            responseBody: responseBody.slice(0, 500) || undefined,
          },
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      const shouldRetry =
        attempt < retries && (isRetryableError(error) || isAbortError(error));

      if (!shouldRetry) {
        if (isAbortError(error)) {
          throw new HttpRequestError(`Request timed out after ${timeoutMs}ms for ${requestUrl}`, {
            url: requestUrl,
          });
        }

        throw error;
      }

      attempt += 1;
      await delay(150 * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export async function getJson<T>(options: JsonRequestOptions): Promise<T> {
  return requestJson<T>({
    ...options,
    method: "GET",
  });
}
