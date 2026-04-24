import type { AccountSnapshot, SalesforceAccountUpsertPreview, WriteMode } from "@sales-mcp/core";

export function buildSalesforceAccountUpsertPreview(
  snapshot: AccountSnapshot,
  mode: WriteMode = "dry-run",
): SalesforceAccountUpsertPreview {
  return {
    provider: "salesforce",
    mode,
    summary:
      mode === "dry-run"
        ? `Preview Salesforce account upsert for ${snapshot.account.name}.`
        : `Execution path is not implemented yet; returning the Salesforce upsert payload preview for ${snapshot.account.name}.`,
    accountName: snapshot.account.name,
    payload: {
      name: snapshot.account.name,
      website: snapshot.account.domain,
      description: snapshot.account.description,
      industry: snapshot.account.industry,
      contactEmails: snapshot.people.flatMap((person) => (person.email ? [person.email] : [])),
      primaryOpportunityName: snapshot.primaryOpportunity?.name,
      primaryOpportunityStage: snapshot.primaryOpportunity?.stage,
    },
  };
}
