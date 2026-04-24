export const toolManifest = [
  {
    name: "get_account_status",
    title: "Get account status",
    description:
      "Synthesize CRM state, recent interactions, signals, and recommended next actions for an account.",
    providers: [
      "salesforce",
      "gmail",
      "apollo",
      "clay",
      "zoominfo",
      "crunchbase",
      "builtwith",
      "smartlead",
      "serper",
      "apify",
      "pitchbook",
      "trigify",
    ],
  },
  {
    name: "research_account",
    title: "Research account",
    description:
      "Build a research brief using enrichment, search, and signal providers.",
    providers: [
      "apollo",
      "clay",
      "zoominfo",
      "crunchbase",
      "builtwith",
      "serper",
      "apify",
      "pitchbook",
      "trigify",
    ],
  },
  {
    name: "get_account_timeline",
    title: "Get account timeline",
    description:
      "Merge interactions and external signals into a single chronological account timeline.",
    providers: [
      "salesforce",
      "gmail",
      "smartlead",
      "serper",
      "apify",
      "crunchbase",
      "zoominfo",
      "pitchbook",
      "trigify",
    ],
  },
  {
    name: "recommend_next_action",
    title: "Recommend next action",
    description:
      "Recommend the highest-value next action using merged account risks, signals, and recent activity.",
    providers: [
      "salesforce",
      "gmail",
      "apollo",
      "smartlead",
      "serper",
      "crunchbase",
      "zoominfo",
      "trigify",
    ],
  },
  {
    name: "draft_outbound_email",
    title: "Draft outbound email",
    description:
      "Generate an outbound draft using account context, stakeholder details, and recent signals.",
    providers: ["gmail", "smartlead", "salesforce", "apollo", "clay", "serper"],
  },
  {
    name: "push_account_to_salesforce",
    title: "Push to Salesforce",
    description:
      "Build a dry-run Salesforce upsert payload from normalized account data. Execution is scaffolded but not implemented yet.",
    providers: ["salesforce"],
  },
] as const;
