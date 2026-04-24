import type {
  AccountQuery,
  IntelligenceClient,
  OutboundEmailDraft,
  ProviderCatalog,
  RuntimeEnvironment,
  Signal,
} from "@sales-mcp/core";
import { buildAccountStatusSnapshot } from "./index.js";
import { getOutboundSenderConfig } from "./config.js";

function pickBestSignals(signals: Signal[]) {
  return [...signals]
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 2);
}

export async function buildOutboundEmailDraft(
  query: AccountQuery,
  catalog: ProviderCatalog,
  intelligenceClient?: IntelligenceClient,
  env?: RuntimeEnvironment,
): Promise<OutboundEmailDraft> {
  const snapshot = await buildAccountStatusSnapshot(query, catalog, intelligenceClient);
  const champion =
    snapshot.people.find((person) => person.role === "champion" && person.email) ??
    snapshot.people.find((person) => person.email);
  const topSignals = pickBestSignals(snapshot.signals);
  const firstRisk = snapshot.risks[0];
  const firstAction = snapshot.recommendedActions[0];
  const sender = getOutboundSenderConfig(env);
  const senderLine = [sender.senderTitle, sender.senderCompany].filter(Boolean).join(", ");

  const subject = champion?.fullName
    ? `${champion.fullName.split(" ")[0]}, quick follow-up on ${snapshot.account.name}`
    : `Quick follow-up on ${snapshot.account.name}`;

  const body = [
    `Hi ${champion?.fullName?.split(" ")[0] ?? "there"},`,
    "",
    `Following up on ${snapshot.account.name} while the opportunity is still in ${snapshot.primaryOpportunity?.stage ?? "review"}.`,
    topSignals.length > 0
      ? `I noticed ${topSignals.map((signal) => signal.title.toLowerCase()).join(" and ")}.`
      : "I wanted to keep momentum going on the evaluation.",
    firstRisk
      ? `The main thing I want to help unblock is ${firstRisk.title.toLowerCase()}.`
      : "I’d like to help remove any blockers on your side.",
    "",
    "If helpful, I can send a concise ROI breakdown and the security documentation your team asked for.",
    "",
    `${firstAction?.summary ?? "Would next week be a good time to compare notes?"}`,
    "",
    "Best,",
    sender.senderName,
    ...(senderLine ? [senderLine] : []),
  ].join("\n");

  return {
    account: snapshot.account,
    recipients: champion?.email ? [champion.email] : [],
    subject,
    body,
    rationale:
      firstAction?.rationale ??
      "Draft built from the merged account snapshot using the strongest current signals and top visible risk.",
    provenance: snapshot.provenance,
  };
}
