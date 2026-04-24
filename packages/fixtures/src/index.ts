import type { ProviderAccountContext } from "@sales-mcp/core";

const retrievedAt = "2026-04-23T19:15:00.000Z";

export const accountStatusFixture: ProviderAccountContext[] = [
  {
    provider: "salesforce",
    account: {
      id: "acct-acme",
      name: "Acme Analytics",
      domain: "acmeanalytics.io",
      industry: "Data Infrastructure",
      headquarters: "Chicago, IL",
      attributions: [
        {
          provider: "salesforce",
          sourceRecordId: "001ACME",
          retrievedAt,
          confidence: 0.96,
        },
      ],
    },
    people: [
      {
        id: "person-jane",
        fullName: "Jane Rivers",
        title: "VP of Revenue Operations",
        email: "jane.rivers@acmeanalytics.io",
        role: "champion",
        accountId: "acct-acme",
        attributions: [
          {
            provider: "salesforce",
            sourceRecordId: "003JANE",
            retrievedAt,
            confidence: 0.94,
          },
        ],
      },
    ],
    opportunities: [
      {
        id: "opp-acme-1",
        accountId: "acct-acme",
        name: "Acme Analytics Expansion",
        stage: "Proposal",
        amount: 42000,
        closeDate: "2026-05-19",
        lastUpdatedAt: "2026-04-09T16:00:00.000Z",
        attributions: [
          {
            provider: "salesforce",
            sourceRecordId: "006OPP",
            retrievedAt,
            confidence: 0.97,
          },
        ],
      },
    ],
    interactions: [
      {
        id: "sf-note-1",
        accountId: "acct-acme",
        channel: "crm_note",
        summary: "AE noted pricing concerns after procurement review.",
        happenedAt: "2026-04-11T14:00:00.000Z",
        attributions: [
          {
            provider: "salesforce",
            sourceRecordId: "00TNOTE1",
            retrievedAt,
            confidence: 0.9,
          },
        ],
      },
    ],
    signals: [],
    techStack: [],
  },
  {
    provider: "gmail",
    people: [],
    opportunities: [],
    interactions: [
      {
        id: "gmail-1",
        accountId: "acct-acme",
        channel: "email",
        summary: "Jane asked for ROI validation and security documentation.",
        happenedAt: "2026-04-15T10:30:00.000Z",
        contactEmail: "jane.rivers@acmeanalytics.io",
        attributions: [
          {
            provider: "gmail",
            sourceRecordId: "18c32a",
            retrievedAt,
            confidence: 0.91,
          },
        ],
      },
    ],
    signals: [
      {
        id: "gmail-engagement",
        accountId: "acct-acme",
        category: "engagement",
        title: "Champion still engaged",
        summary: "Recent email thread indicates Jane remains active in evaluation.",
        happenedAt: "2026-04-15T10:30:00.000Z",
        score: 0.73,
        attributions: [
          {
            provider: "gmail",
            sourceRecordId: "18c32a",
            retrievedAt,
            confidence: 0.87,
          },
        ],
      },
    ],
    techStack: [],
  },
  {
    provider: "apollo",
    people: [
      {
        id: "person-marcus",
        fullName: "Marcus Lee",
        title: "Director of Sales Operations",
        email: "marcus.lee@acmeanalytics.io",
        role: "influencer",
        accountId: "acct-acme",
        attributions: [
          {
            provider: "apollo",
            sourceRecordId: "apollo-people-1",
            retrievedAt,
            confidence: 0.82,
          },
        ],
      },
    ],
    opportunities: [],
    interactions: [],
    signals: [],
    techStack: [],
  },
  {
    provider: "clay",
    people: [
      {
        id: "person-jane-clay",
        fullName: "Jane Rivers",
        title: "VP of Revenue Operations",
        email: "jane.rivers@acmeanalytics.io",
        role: "champion",
        accountId: "acct-acme",
        attributions: [
          {
            provider: "clay",
            sourceRecordId: "clay-row-12",
            retrievedAt,
            confidence: 0.79,
          },
        ],
      },
    ],
    opportunities: [],
    interactions: [],
    signals: [],
    techStack: [],
  },
  {
    provider: "zoominfo",
    account: {
      id: "acct-acme-zoominfo",
      name: "Acme Analytics",
      domain: "acmeanalytics.io",
      employeeRange: "201-500",
      revenueRange: "$25M-$50M",
      attributions: [
        {
          provider: "zoominfo",
          sourceRecordId: "zi-acc-22",
          retrievedAt,
          confidence: 0.8,
        },
      ],
    },
    people: [],
    opportunities: [],
    interactions: [],
    signals: [
      {
        id: "zi-intent",
        accountId: "acct-acme",
        category: "intent",
        title: "Revenue operations intent spike",
        summary: "Third-party intent rose for categories tied to pipeline analytics.",
        happenedAt: "2026-04-21T08:00:00.000Z",
        score: 0.78,
        attributions: [
          {
            provider: "zoominfo",
            sourceRecordId: "zi-signal-5",
            retrievedAt,
            confidence: 0.76,
          },
        ],
      },
    ],
    techStack: [],
  },
  {
    provider: "crunchbase",
    account: {
      id: "acct-acme-crunchbase",
      name: "Acme Analytics",
      domain: "acmeanalytics.io",
      description: "Revenue analytics platform for mid-market SaaS teams.",
      attributions: [
        {
          provider: "crunchbase",
          sourceRecordId: "cb-org-1",
          retrievedAt,
          confidence: 0.77,
        },
      ],
    },
    people: [],
    opportunities: [],
    interactions: [],
    signals: [
      {
        id: "cb-funding",
        accountId: "acct-acme",
        category: "funding",
        title: "Series B announced",
        summary: "Acme Analytics announced a Series B round three months ago.",
        happenedAt: "2026-01-18T13:00:00.000Z",
        score: 0.71,
        attributions: [
          {
            provider: "crunchbase",
            sourceRecordId: "cb-funding-9",
            retrievedAt,
            confidence: 0.81,
          },
        ],
      },
    ],
    techStack: [],
  },
  {
    provider: "builtwith",
    people: [],
    opportunities: [],
    interactions: [],
    signals: [],
    techStack: [
      {
        id: "tech-salesforce",
        accountId: "acct-acme",
        name: "Salesforce",
        category: "crm",
        attributions: [
          {
            provider: "builtwith",
            sourceRecordId: "bw-technology-1",
            retrievedAt,
            confidence: 0.83,
          },
        ],
      },
      {
        id: "tech-hubspot",
        accountId: "acct-acme",
        name: "HubSpot Forms",
        category: "marketing",
        attributions: [
          {
            provider: "builtwith",
            sourceRecordId: "bw-technology-2",
            retrievedAt,
            confidence: 0.74,
          },
        ],
      },
    ],
  },
  {
    provider: "smartlead",
    people: [],
    opportunities: [],
    interactions: [
      {
        id: "smartlead-campaign",
        accountId: "acct-acme",
        channel: "campaign",
        summary: "Sequence paused after champion replied in Gmail.",
        happenedAt: "2026-04-14T09:00:00.000Z",
        attributions: [
          {
            provider: "smartlead",
            sourceRecordId: "sl-campaign-44",
            retrievedAt,
            confidence: 0.88,
          },
        ],
      },
    ],
    signals: [
      {
        id: "smartlead-positive-reply",
        accountId: "acct-acme",
        category: "campaign",
        title: "Positive campaign reply",
        summary: "Outbound sequence generated a reply from the champion.",
        happenedAt: "2026-04-14T09:00:00.000Z",
        score: 0.69,
        attributions: [
          {
            provider: "smartlead",
            sourceRecordId: "sl-reply-1",
            retrievedAt,
            confidence: 0.86,
          },
        ],
      },
    ],
    techStack: [],
  },
  {
    provider: "serper",
    people: [],
    opportunities: [],
    interactions: [],
    signals: [
      {
        id: "serper-news",
        accountId: "acct-acme",
        category: "news",
        title: "Acme launches analytics assistant",
        summary: "Product launch suggests new budget and urgency around data infrastructure.",
        happenedAt: "2026-04-20T12:00:00.000Z",
        score: 0.67,
        attributions: [
          {
            provider: "serper",
            sourceRecordId: "search-result-91",
            retrievedAt,
            confidence: 0.7,
          },
        ],
      },
    ],
    techStack: [],
  },
  {
    provider: "apify",
    people: [],
    opportunities: [],
    interactions: [],
    signals: [
      {
        id: "apify-hiring",
        accountId: "acct-acme",
        category: "hiring",
        title: "Hiring analytics engineers",
        summary: "Career page shows expansion in data engineering and RevOps roles.",
        happenedAt: "2026-04-18T15:00:00.000Z",
        score: 0.63,
        attributions: [
          {
            provider: "apify",
            sourceRecordId: "crawler-job-18",
            retrievedAt,
            confidence: 0.66,
          },
        ],
      },
    ],
    techStack: [],
  },
  {
    provider: "pitchbook",
    people: [],
    opportunities: [],
    interactions: [],
    signals: [
      {
        id: "pitchbook-strategy",
        accountId: "acct-acme",
        category: "news",
        title: "Private market expansion note",
        summary: "Analyst note suggests accelerated enterprise packaging after funding.",
        happenedAt: "2026-03-27T12:00:00.000Z",
        score: 0.54,
        attributions: [
          {
            provider: "pitchbook",
            sourceRecordId: "pb-note-3",
            retrievedAt,
            confidence: 0.58,
          },
        ],
      },
    ],
    techStack: [],
  },
  {
    provider: "trigify",
    people: [],
    opportunities: [],
    interactions: [],
    signals: [
      {
        id: "trigify-growth",
        accountId: "acct-acme",
        category: "intent",
        title: "Website messaging shifted toward enterprise",
        summary: "Recent messaging changes point to enterprise expansion and reporting maturity.",
        happenedAt: "2026-04-19T12:00:00.000Z",
        score: 0.59,
        attributions: [
          {
            provider: "trigify",
            sourceRecordId: "trg-change-4",
            retrievedAt,
            confidence: 0.61,
          },
        ],
      },
    ],
    techStack: [],
  },
];
