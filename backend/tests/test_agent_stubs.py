"""P0.0.3 agent skeleton verification.

Asserts every stub agent satisfies the AgentProposal contract from
docs/DONE_DEFINITION.md §AI agent backend skeleton (A2) and the
zero-PII-claim invariant from docs/adr/0001-pii-view-claims.md §6.

This is also the P8.0 verification gate, brought forward.
"""

from app.agents import (
    alert_triage_agent,
    eligibility_agent,
    lbrs_agent,
    settlement_agent,
)

AGENTS = [lbrs_agent, settlement_agent, alert_triage_agent, eligibility_agent]
EXPECTED_IDS = {"lbrs", "settlement", "alert_triage", "eligibility"}
PROPOSAL_KEYS = {
    "agent_id",
    "agent_version",
    "proposed_action",
    "confidence",
    "evidence_uris",
    "rationale",
}


def test_agent_ids_match_module_set():
    assert {a.AGENT_ID for a in AGENTS} == EXPECTED_IDS


def test_every_agent_holds_zero_pii_claims():
    # ADR 0001 §6 — agents are PII-blind by design
    for agent in AGENTS:
        assert agent.AGENT_PII_CLAIMS == [], (
            f"{agent.AGENT_ID} must hold zero pii:view:* claims"
        )


def test_assess_returns_canonical_proposal_shape():
    for agent in AGENTS:
        proposal = agent.assess(project_id="p-test", evidence={})
        assert set(proposal.keys()) == PROPOSAL_KEYS
        assert proposal["agent_id"] == agent.AGENT_ID
        assert proposal["agent_version"] == "0.0.1-stub"
        assert proposal["proposed_action"] == "no-op"
        assert isinstance(proposal["confidence"], float)
        assert 0.0 <= proposal["confidence"] <= 1.0
        assert proposal["evidence_uris"] == []
        assert proposal["rationale"] == "stub"
