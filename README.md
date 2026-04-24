# sales-mcp-bundle

Public, developer-first MCP server and demo workspace for sales operations workflows across CRM, outbound, enrichment, and account status synthesis.

## What it is

Most sales integration demos stop at provider-specific API wrappers. This repo is intentionally more opinionated:

- workflow-oriented MCP tools instead of raw API passthroughs
- normalized account, contact, opportunity, interaction, and signal records
- provenance and confidence on merged provider data
- TypeScript orchestration with a Python heuristic scoring and resolution service
- fixture-backed demo scenarios for reviewers without live credentials
- hardened live adapters for `Salesforce`, `Gmail`, `Apollo`, and `Serper`

The flagship question this project answers is:

`Where are we at with this account?`

That answer is synthesized from CRM state, recent comms, external signals, resolved stakeholders, and next-best-action reasoning.

## Repo layout

- `apps/mcp-server`
  TypeScript MCP server exposing workflow-oriented tools and resources
- `apps/demo-web`
  React/Vite operator workspace for reviewing account state, risks, and recommended actions
- `packages/core`
  Canonical types, provider contracts, and scoring interfaces
- `packages/providers`
  Provider registry, runtime config, implemented live adapters, scaffolded placeholders, and fixture adapters
- `packages/workflows`
  Account synthesis, timeline, next-action, and outbound draft workflows
- `packages/fixtures`
  Deterministic demo scenarios and provider payloads
- `python/intelligence`
  FastAPI heuristic scoring and resolution service for entity resolution, signal ranking, account health, and deal-risk scoring
- `docs/BUILD_SPEC.md`
  Implementation-grade build spec and architecture plan
- `docs/PROVIDER_MATRIX.md`
  Provider coverage, auth model, and capability matrix
- `docs/AUTH_DESIGN.md`
  Production OAuth design for future `Salesforce` and `Gmail` support

## Supported workflows

- `get_account_status`
- `get_account_timeline`
- `research_account`
- `recommend_next_action`
- `draft_outbound_email`
- `push_account_to_salesforce`

The demo UI exposes those workflows as an operator workspace. The MCP server is still the primary product artifact.

## Provider coverage

Implemented live adapters:

- `Salesforce`
- `Gmail`
- `Apollo.io`
- `Serper.dev`

Scaffolded live adapters:

- `Smartlead`
- `Clay`
- `ZoomInfo`
- `Crunchbase`
- `BuiltWith`
- `Apify`

Fixture-backed adapters:

- `PitchBook`
- `Trigify`

Workflows may incorporate implemented, scaffolded, or fixture-backed providers depending on runtime mode.

## Adapter hardening

The implemented live adapters are not just raw fetch wrappers. The hardened path includes:

- provider-specific auth assumptions
  - `Salesforce`, `Gmail`: pre-fetched OAuth 2.0 access token
  - `Apollo`, `Serper`: `x-api-key`
- retry and timeout handling in the shared HTTP client
- page-size and max-page runtime controls per provider
- pagination-aware live reads for `Salesforce`, `Gmail`, `Apollo`, and `Serper`
- provider-specific normalization into canonical records
- partial-failure isolation so one failing provider does not take down the entire synthesis workflow

## Auth model

`Salesforce` and `Gmail` do **not** implement full OAuth flows in this version. The adapters expect a pre-fetched OAuth 2.0 access token and send it as a bearer token.

That keeps local demos simple while staying honest about current capability. The full production auth design is documented in [docs/AUTH_DESIGN.md](docs/AUTH_DESIGN.md).

## Local setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure provider modes and any live credentials:

```bash
cp .env.example .env
```

Provider modes:

- `fixture`: deterministic demo data
- `live`: use the live adapter for that provider
- `disabled`: omit the provider entirely

Key live adapter environment variables:

- `SALES_MCP_SALESFORCE_ACCESS_TOKEN`
- `SALES_MCP_SALESFORCE_BASE_URL`
- `SALES_MCP_GMAIL_ACCESS_TOKEN`
- `SALES_MCP_APOLLO_API_KEY`
- `SALES_MCP_SERPER_API_KEY`

Compatibility note:

- `SALES_MCP_SALESFORCE_API_KEY` and `SALES_MCP_GMAIL_API_KEY` are still read as legacy fallbacks, but new setups should use `*_ACCESS_TOKEN`.

Optional hardening controls:

- `SALES_MCP_<PROVIDER>_PAGE_SIZE`
- `SALES_MCP_<PROVIDER>_MAX_PAGES`
- `SALES_MCP_<PROVIDER>_TIMEOUT_MS`
- `SALES_MCP_<PROVIDER>_RETRY_COUNT`

Optional outbound sender config:

- `SALES_MCP_OUTBOUND_SENDER_NAME`
- `SALES_MCP_OUTBOUND_SENDER_TITLE`
- `SALES_MCP_OUTBOUND_SENDER_COMPANY`

## Running it

Run the Python heuristic scoring and resolution service:

```bash
pnpm dev:intelligence
```

Run the demo stack:

```bash
pnpm dev:demo-stack
```

Run the MCP server demo workflow:

```bash
pnpm demo:account-status
```

## Verification

Current repo verification:

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `python3 -m unittest discover -s python/intelligence/tests`
- `python3 -m compileall python/intelligence/src`

## MCP notes

The stdio server scaffold follows the official MCP TypeScript SDK server pattern:

- [MCP TypeScript SDK README](https://github.com/modelcontextprotocol/typescript-sdk)
- [Server docs](https://ts.sdk.modelcontextprotocol.io/documents/server.html)
