export type AgentAttributionRecord = {
  agent_id: string;
  agent_version: string;
  confidence: number;
  evidence_uris: string[];
  recommended_action: string;
  rationale?: string;
  status?: "pending_admin_approval" | "accepted" | "rejected" | "modified";
};

type AgentAttributionProps = {
  attribution: AgentAttributionRecord;
  compact?: boolean;
};

export function AgentAttribution({ attribution, compact = false }: AgentAttributionProps) {
  const status = attribution.status ?? "pending_admin_approval";

  return (
    <aside className={compact ? "agent-attribution compact" : "agent-attribution"} aria-label="Agent attribution">
      <div className="agent-attribution-header">
        <div>
          <span>Agent action</span>
          <strong>
            {attribution.agent_id} · {attribution.agent_version}
          </strong>
        </div>
        <span className={`agent-status ${status}`}>{status.replace(/_/g, " ")}</span>
      </div>
      <dl>
        <div>
          <dt>Confidence</dt>
          <dd>{formatConfidence(attribution.confidence)}</dd>
        </div>
        <div>
          <dt>Recommended action</dt>
          <dd>{attribution.recommended_action}</dd>
        </div>
      </dl>
      {attribution.rationale && <p>{attribution.rationale}</p>}
      <div className="agent-evidence">
        <span>Evidence</span>
        {attribution.evidence_uris.length ? (
          attribution.evidence_uris.map((uri) => (
            <a href={uri} key={uri}>
              {shortEvidenceLabel(uri)}
            </a>
          ))
        ) : (
          <em>No evidence URI supplied</em>
        )}
      </div>
    </aside>
  );
}

function formatConfidence(confidence: number) {
  const normalized = confidence > 1 ? confidence : confidence * 100;
  return `${Math.round(normalized)}%`;
}

function shortEvidenceLabel(uri: string) {
  try {
    const parsed = new URL(uri);
    return parsed.pathname.split("/").filter(Boolean).at(-1) ?? parsed.hostname;
  } catch {
    return uri.split("/").filter(Boolean).at(-1) ?? uri;
  }
}
