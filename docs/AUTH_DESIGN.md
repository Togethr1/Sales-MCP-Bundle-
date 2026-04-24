# Auth Design

This document describes the production auth design for `Salesforce` and `Gmail`.

Current state in `v0.1`:

- `Salesforce` and `Gmail` adapters expect a **pre-fetched OAuth 2.0 access token**
- the repo does **not** implement token acquisition, refresh, or secure token storage
- this tradeoff keeps the portfolio artifact focused on workflow coverage, normalization, and MCP ergonomics while still allowing honest live demos against already-authenticated tenants

## Why full OAuth is not in `v0.1`

The initial release prioritizes workflow breadth, fixture-backed evaluation, and cross-provider normalization over provider-specific auth depth. A partial OAuth implementation would be worse than explicit pre-fetched token support because it would imply production readiness without handling token refresh, credential rotation, or failure recovery correctly.

## Shared design

Both providers should eventually authenticate through a shared TypeScript token abstraction rather than embedding auth logic inside each adapter.

```ts
export interface TokenProvider {
  getAccessToken(provider: "salesforce" | "gmail"): Promise<{
    accessToken: string;
    expiresAt: string;
  }>;
  invalidate(provider: "salesforce" | "gmail"): Promise<void>;
}
```

Adapter integration model:

1. adapter requests an access token from `TokenProvider`
2. adapter sends the token as `Authorization: Bearer <token>`
3. on `401`, adapter invalidates the cached token and retries once with a fresh token
4. token refresh behavior remains outside adapter code

This keeps provider adapters focused on request mapping, normalization, retry, and pagination rather than auth orchestration.

## Salesforce design

Recommended production auth path: **OAuth 2.0 JWT Bearer flow**

Assumptions:

- a Salesforce Connected App exists
- the Connected App has a consumer key
- an RSA public certificate is uploaded to the Connected App
- the app has API scopes required for account, contact, opportunity, and task reads
- the integration user is a dedicated service principal or automation user

JWT claims:

- `iss`: Connected App consumer key
- `sub`: Salesforce integration username
- `aud`: `https://login.salesforce.com` or sandbox audience as appropriate
- `exp`: short-lived timestamp, typically less than 5 minutes

Token exchange:

- sign the JWT with RS256 using the integration private key
- `POST /services/oauth2/token`
- `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`
- `assertion=<signed-jwt>`

Returned token handling:

- cache the access token in memory with its expiration time
- refresh proactively when near expiry or reactively after a `401`
- do not persist the raw token in repo-managed files

Adapter changes when implemented:

- inject `TokenProvider` into `SalesforceLiveAdapter`
- replace direct env-token reads with `await tokenProvider.getAccessToken("salesforce")`
- on `401`, invalidate and retry once

Failure modes and handling:

- expired or invalid certificate: surface configuration error immediately
- revoked Connected App or user: surface auth failure, do not retry repeatedly
- token endpoint rate limiting or outage: use bounded retry with backoff
- sandbox vs production audience mismatch: fail fast with explicit auth context in the error

## Gmail design

Recommended production auth path: **OAuth 2.0 authorization code flow with refresh tokens**

Assumptions:

- a Google Cloud project exists
- Gmail API is enabled
- OAuth consent screen is configured
- the application requests only the scopes needed for read-only workflow support

Recommended initial scope:

- `https://www.googleapis.com/auth/gmail.readonly`

Flow:

1. authorize an operator/admin once through the Google OAuth consent screen
2. store the returned refresh token in a secure secret store
3. exchange refresh token for short-lived access tokens as needed
4. cache access tokens in memory with TTL and refresh before expiry

Adapter changes when implemented:

- inject `TokenProvider` into `GmailLiveAdapter`
- fetch the current access token before Gmail API calls
- on `401`, invalidate and retry once

Failure modes and handling:

- refresh token revocation: fail fast and require re-consent
- scope mismatch: surface explicit permission error
- invalid client credentials: fail as configuration error
- quota exhaustion: rely on existing request retry logic only for retryable statuses, not auth failures

## Token storage expectations

`v0.2` should use an in-memory cache backed by environment-provided secrets for local/dev usage. A later release should move to encrypted secret storage for long-lived refresh tokens or private signing keys.

Local demo guidance before full OAuth exists:

- `Salesforce`: generate an access token outside the app and set `SALES_MCP_SALESFORCE_ACCESS_TOKEN`
- `Gmail`: generate an access token outside the app and set `SALES_MCP_GMAIL_ACCESS_TOKEN`

## Rollout plan

- `v0.2`
  - add `TokenProvider`
  - implement Salesforce JWT Bearer token acquisition
  - wire token refresh/invalidation into `SalesforceLiveAdapter`
- `v0.3`
  - implement Gmail refresh-token flow
  - add secure refresh-token loading from env/secret store
- `v0.4`
  - replace in-memory token handling with encrypted token storage
  - add provider auth telemetry and structured auth error reporting
