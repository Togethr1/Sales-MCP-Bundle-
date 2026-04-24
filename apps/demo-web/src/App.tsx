import { useEffect, useState } from "react";
import type { DemoData } from "./data.js";
import { loadDemoData } from "./data.js";

type ViewMode = "next-action" | "draft" | "salesforce" | "timeline";

const viewLabels: Record<ViewMode, string> = {
  "next-action": "Recommend next step",
  draft: "Draft outbound email",
  salesforce: "Preview Salesforce sync",
  timeline: "Open account timeline",
};

export function App() {
  const [data, setData] = useState<DemoData | null>(null);
  const [view, setView] = useState<ViewMode>("next-action");

  useEffect(() => {
    loadDemoData().then(setData);
  }, []);

  if (!data) {
    return <main className="shell">Loading fixture-backed account scoring workspace...</main>;
  }

  const { snapshot, recommendation, draft, salesforcePreview, timeline } = data;

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">sales-mcp-bundle</p>
          <h1>Sales Ops Workspace</h1>
        </div>
        <div className="command-bar">
          <label className="command-label" htmlFor="account-query">
            Ask the MCP
          </label>
          <input
            id="account-query"
            className="command-input"
            value="Where are we at with Acme Analytics?"
            readOnly
          />
        </div>
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <article className="side-panel">
            <p className="eyebrow">Active Account</p>
            <h2>{snapshot.account.name}</h2>
            <p className="meta-block">
              Stage {snapshot.primaryOpportunity?.stage ?? "Unknown"} · Health{" "}
              {snapshot.healthScore?.toFixed(2) ?? "N/A"}
            </p>
            <p className="meta-block">
              {snapshot.people.length} contacts · {snapshot.signals.length} signals ·{" "}
              {snapshot.interactions.length} interactions
            </p>
          </article>

          <article className="side-panel">
            <p className="eyebrow">Actions</p>
            <div className="action-list">
              {(Object.keys(viewLabels) as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={view === mode ? "action-button active" : "action-button"}
                  onClick={() => setView(mode)}
                >
                  {viewLabels[mode]}
                </button>
              ))}
            </div>
          </article>

          <article className="side-panel">
            <p className="eyebrow">Provider Provenance</p>
            <div className="chips">
              {recommendation.provenance.map((provider) => (
                <span key={provider} className="chip">
                  {provider}
                </span>
              ))}
            </div>
          </article>
        </aside>

        <section className="main-column">
          <article className="workspace-card hero-card">
            <p className="eyebrow">Current Recommendation</p>
            <h2>{recommendation.recommendedAction.summary}</h2>
            <p>{recommendation.recommendedAction.rationale}</p>
          </article>

          <div className="summary-grid">
            <article className="workspace-card">
              <h3>Deal Risk</h3>
              {recommendation.supportingRisks.slice(0, 3).map((risk) => (
                <p key={risk.id}>
                  <strong>{risk.title}</strong>
                  <br />
                  {risk.summary}
                </p>
              ))}
            </article>

            <article className="workspace-card">
              <h3>Resolved Contacts</h3>
              {snapshot.people.slice(0, 3).map((person) => (
                <p key={person.id}>
                  <strong>{person.fullName}</strong> · {person.role ?? "unknown"}
                  <br />
                  {person.email ?? "No email"}
                  <br />
                  <span className="meta">
                    {person.canonicalEntityLabel ?? "No canonical label"} · confidence{" "}
                    {person.resolutionConfidence?.toFixed(2) ?? "n/a"}
                  </span>
                </p>
              ))}
            </article>
          </div>

          <article className="workspace-card main-panel">
            {view === "next-action" && (
              <>
                <h3>Recommended Next Step</h3>
                <p className="lead">{recommendation.recommendedAction.summary}</p>
                <p>{recommendation.recommendedAction.rationale}</p>
                <div className="subgrid">
                  <div>
                    <h4>Supporting Signals</h4>
                    {recommendation.supportingSignals.map((signal) => (
                      <p key={signal.id}>
                        <strong>{signal.title}</strong>
                        <br />
                        {signal.summary}
                        <br />
                        <span className="meta">{signal.rankingRationale}</span>
                      </p>
                    ))}
                  </div>
                  <div>
                    <h4>Why This Matters</h4>
                    {recommendation.supportingRisks.map((risk) => (
                      <p key={risk.id}>
                        <strong>{risk.title}</strong>
                        <br />
                        {risk.summary}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            )}

            {view === "draft" && (
              <>
                <h3>Outbound Draft</h3>
                <p className="meta-block">
                  To: {draft.recipients.join(", ") || "No resolved recipient"}
                </p>
                <p className="meta-block">Subject: {draft.subject}</p>
                <pre className="text-surface">{draft.body}</pre>
                <p className="meta">{draft.rationale}</p>
              </>
            )}

            {view === "salesforce" && (
              <>
                <h3>Salesforce Upsert Preview</h3>
                <p className="meta-block">{salesforcePreview.summary}</p>
                <div className="subgrid">
                  <div>
                    <h4>Account Payload</h4>
                    <p>Name: {salesforcePreview.payload.name}</p>
                    <p>Website: {salesforcePreview.payload.website ?? "n/a"}</p>
                    <p>Industry: {salesforcePreview.payload.industry ?? "n/a"}</p>
                    <p>
                      Opportunity:{" "}
                      {salesforcePreview.payload.primaryOpportunityName ?? "n/a"} (
                      {salesforcePreview.payload.primaryOpportunityStage ?? "n/a"})
                    </p>
                  </div>
                  <div>
                    <h4>Contacts to Sync</h4>
                    {salesforcePreview.payload.contactEmails.map((email) => (
                      <p key={email}>{email}</p>
                    ))}
                  </div>
                </div>
              </>
            )}

            {view === "timeline" && (
              <>
                <h3>Account Timeline</h3>
                {timeline.entries.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="timeline-row">
                    <div className="timeline-dot" />
                    <div>
                      <p className="timeline-head">
                        {entry.title} · {entry.provider}
                      </p>
                      <p>{entry.summary}</p>
                      <p className="meta">{entry.happenedAt}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </article>

          <article className="workspace-card">
            <h3>Signal Feed</h3>
            <div className="signal-grid">
              {snapshot.signals.slice(0, 4).map((signal) => (
                <div key={signal.id} className="signal-card">
                  <p className="signal-label">{signal.category}</p>
                  <strong>{signal.title}</strong>
                  <p>{signal.summary}</p>
                  <p className="meta">
                    score {signal.score?.toFixed(2) ?? "n/a"} ·{" "}
                    {signal.rankingRationale ?? "No rationale"}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
