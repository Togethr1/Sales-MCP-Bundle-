# Build Spec

## Product framing

`sales-mcp-bundle` is a public, developer-first MCP server template for sales operations. Its primary differentiator is cross-provider synthesis: the system should answer workflow questions using data blended from CRM, outbound, enrichment, search, and signal providers.

The project is being optimized for portfolio signal, which means:

- strong architectural boundaries
- visible workflow value
- breadth across providers
- credible production concerns
- polished documentation and demo fixtures

## Primary user stories

### 1. Account status

Prompt:

`Where are we at with Acme Analytics?`

Expected output:

- account summary
- stakeholder map
- active opportunity status
- recent interactions
- external company signals
- key risks
- recommended next action
- provenance for major facts

### 2. Account research

Prompt:

`Research this target account before outreach.`

Expected output:

- company profile
- market context
- funding and growth signals
- technology footprint
- relevant people
- recent news and triggers

### 3. Outbound preparation

Prompt:

`Draft an email to re-engage the champion on this account.`

Expected output:

- personalized draft
- recent context summary
- trigger-aware talking points
- CRM-safe next-step recommendation

### 4. CRM sync

Prompt:

`Push this research and interaction summary into Salesforce.`

Expected output:

- normalized write payload
- dry-run preview
- write confirmation

## Architecture

### TypeScript responsibilities

- MCP tool definitions and transport
- provider adapters and auth/config
- workflow orchestration
- shared schemas and validation
- demo web app
- fixture packages and local development flows

### Python responsibilities

- entity resolution across providers
- record fusion and conflict scoring
- account and deal health scoring
- signal ranking and prioritization
- recommendation support inputs

### Boundary contract

TypeScript calls Python through a narrow service boundary. The boundary should be stable and typed, with deterministic fixture responses for local demos.

Initial endpoints:

- `POST /score/account-health`
- `POST /resolve/entities`
- `POST /rank/signals`

## Repo layout

```text
apps/
  mcp-server/
  demo-web/
packages/
  core/
  providers/
  workflows/
  fixtures/
python/
  intelligence/
docs/
```

## Canonical entities

- `Account`
- `Person`
- `Opportunity`
- `Interaction`
- `Signal`
- `TechStackItem`
- `Risk`
- `RecommendedAction`
- `AccountSnapshot`

Every normalized record should preserve:

- `source`
- `source_record_id`
- `retrieved_at`
- `confidence`

## Provider capability tiers

### Tier 1: deep adapters

- Salesforce
- Gmail
- Apollo.io
- Serper.dev

Current implementation note:

- `Salesforce`, `Gmail`, `Apollo.io`, and `Serper.dev` have implemented live adapters
- `Clay`, `Apify`, `Smartlead`, `Crunchbase`, `BuiltWith`, and `ZoomInfo` remain scaffolded placeholders in `v0.1`

### Tier 2: thin but live-capable adapters

- Smartlead
- Crunchbase
- BuiltWith
- ZoomInfo

### Tier 3: fixture-first adapters

- PitchBook
- Trigify

## Workflow sequencing

### `get_account_status`

1. resolve account identity
2. fetch provider contexts in parallel
3. normalize records into canonical models
4. merge overlapping entities
5. score risks and deal health
6. build unified snapshot
7. emit provenance-aware response

### `research_account`

1. resolve company
2. gather firmographic and market data
3. gather people and stakeholder signals
4. gather technology and news signals
5. rank relevance
6. produce account brief

## Initial deliverables

### Phase 1

- monorepo scaffold
- canonical model package
- fixture-backed providers
- first workflow implementation for account status
- Python heuristic scoring stub with scoring endpoint
- demo app shell
- top-level docs

### Phase 2

- real provider auth and config layer
- Salesforce and Gmail live adapters
- Apollo, Clay, Serper, Apify live adapters
- richer workflow synthesis
- dry-run write paths
- higher-quality demo scenarios

### Phase 3

- second-wave providers
- stronger entity resolution
- account timeline visualization
- outbound drafting support
- CI and release workflows

## Quality bar

- deterministic fixtures for every flagship workflow
- no provider-specific fields leaking into workflow outputs without attribution
- write actions default to dry-run
- rate limits and retries designed into adapter contracts
- docs explain both architecture and demo usage
