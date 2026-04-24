# Provider Matrix

This matrix documents the current implementation depth for each provider in the bundle. The workflow surface is broader than the set of implemented live adapters, so workflows may incorporate implemented, scaffolded, or fixture-backed providers depending on runtime mode.

| Provider | Tier | Primary role | Current depth | Auth |
| --- | --- | --- | --- | --- |
| Salesforce | Deep | CRM, opportunities, tasks, account state | Implemented | OAuth 2.0 access token (pre-fetched) |
| Gmail | Deep | Email threads, interaction state | Implemented | OAuth 2.0 access token (pre-fetched) |
| Apollo.io | Deep | People and account enrichment | Implemented | `x-api-key` |
| Clay | Deep | Contact enrichment and data operations | Scaffolded | Scaffolded placeholder |
| Serper.dev | Deep | Search and news retrieval | Implemented | `x-api-key` |
| Apify | Deep | Crawled signals and structured extraction | Scaffolded | Scaffolded placeholder |
| Smartlead | Thin | Campaign state and outbound signals | Scaffolded | Scaffolded placeholder |
| Crunchbase | Thin | Company profile and funding signals | Scaffolded | Scaffolded placeholder |
| BuiltWith | Thin | Technology footprint | Scaffolded | Scaffolded placeholder |
| ZoomInfo | Thin | Firmographics and intent signals | Scaffolded | Scaffolded placeholder |
| PitchBook | Fixture-first | Private-market context | Fixture-backed | Fixture-backed |
| Trigify | Fixture-first | Trigger event detection | Fixture-backed | Fixture-backed |

## Workflow coverage

- `get_account_status`
  Uses any configured provider contexts that can supply account, contact, interaction, or signal data. In fixture mode this covers the full portfolio demo path. In live mode, only `Salesforce`, `Gmail`, `Apollo`, and `Serper` currently have implemented adapters.
- `research_account`
  Uses live `Apollo` and `Serper` when configured, plus any fixture-backed or scaffolded provider contexts enabled for the selected mode.
- `draft_outbound_email`
  Uses the merged workflow snapshot. That snapshot may include implemented, scaffolded, or fixture-backed provider contexts depending on runtime mode.
- `push_account_to_salesforce`
  Uses `Salesforce` for the dry-run upsert preview and can incorporate normalized data from any other configured provider context.
