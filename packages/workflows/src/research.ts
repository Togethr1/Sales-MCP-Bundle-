import type {
  Account,
  AccountQuery,
  AccountResearchBrief,
  IntelligenceClient,
  ProviderCatalog,
} from "@sales-mcp/core";
import { rankSignals, resolvePeople } from "./synthesis.js";

function pickAccount(accounts: Account[]): Account {
  const preferred =
    accounts.find((account) => account.attributions[0]?.provider === "salesforce") ??
    accounts[0];

  if (!preferred) {
    throw new Error("No canonical account record was available for the requested research brief.");
  }

  return preferred;
}

export async function buildAccountResearchBrief(
  query: AccountQuery,
  catalog: ProviderCatalog,
  intelligenceClient?: IntelligenceClient,
): Promise<AccountResearchBrief> {
  const contexts = await catalog.getAccountContexts(query);
  const account = pickAccount(
    contexts.flatMap((context) => (context.account ? [context.account] : [])),
  );
  const people = await resolvePeople(
    contexts.flatMap((context) => context.people),
    intelligenceClient,
  );
  const signals = await rankSignals(
    contexts.flatMap((context) => context.signals),
    intelligenceClient,
  );
  const techStack = contexts.flatMap((context) => context.techStack);
  const rankedSignalTitles = signals.slice(0, 3).map((signal) => signal.title);
  const highlights = [
    account.description
      ? `${account.name}: ${account.description}`
      : `${account.name} is an active target account with multi-provider context available.`,
    people.some((person) => person.role === "champion")
      ? "A likely champion is already identified in the merged contact graph."
      : "No champion is clearly established yet.",
    rankedSignalTitles.length > 0
      ? `Top current signals: ${rankedSignalTitles.join("; ")}.`
      : "No high-confidence external signals have been ranked yet.",
  ];

  return {
    account,
    people,
    signals,
    techStack,
    highlights,
    provenance: contexts.map((context) => context.provider),
  };
}
