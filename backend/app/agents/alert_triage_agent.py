"""Alert-triage agent skeleton.

Implements the AgentProposal contract from
docs/DONE_DEFINITION.md §AI agent backend skeleton A2.
Real implementation lands in P8 alongside the Alerts dashboard + eval
suite. Per docs/adr/0001-pii-view-claims.md §6, agent JWTs hold zero
`pii:view:*` scopes — codified by AGENT_PII_CLAIMS.
"""

AGENT_ID = "alert_triage"
AGENT_VERSION = "0.0.1-stub"
AGENT_PII_CLAIMS: list[str] = []


def assess(project_id: str, evidence: dict) -> dict:
    return {
        "agent_id": AGENT_ID,
        "agent_version": AGENT_VERSION,
        "proposed_action": "no-op",
        "confidence": 0.0,
        "evidence_uris": [],
        "rationale": "stub",
    }
