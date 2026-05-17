"""LBRS agent skeleton.

Implements the AgentProposal contract from
docs/DONE_DEFINITION.md §AI agent backend skeleton A2.
Real implementation lands in P8 when the eval suite + cockpit Agent
Panel UI ship together. This stub exists so the P8 UI can call into a
real Python module with the canonical signature.

Per docs/adr/0001-pii-view-claims.md §6, agent JWTs hold zero
`pii:view:*` scopes. AGENT_PII_CLAIMS codifies that contract at the
module level; the PII middleware (P0.3.5) reads it.
"""

AGENT_ID = "lbrs"
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
