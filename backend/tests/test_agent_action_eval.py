"""P0.3.13 + P0.3.14 — agent_action + agent_eval_run repos + invariants.

CR-4 doctrine covered:
- agent_action lands in pending_admin_approval (silent default)
- only an explicit admin decide() with a reason advances the row
- decide on an already-decided action raises
- decision atomicity CHECK blocks malformed updates DB-side
- agent_eval_run compute_delta returns the per-metric Δ shape
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db.session import SessionLocal, engine
from app.models.agent_action import AgentAction
from app.models.agent_eval import AgentEvalRun
from app.repos import agent_actions as aa_repo
from app.repos import agent_evals as ae_repo


def _proposal(agent_id: str = "drs", confidence: float = 0.0) -> dict:
    return {
        "agent_id": agent_id,
        "agent_version": "0.0.1-stub",
        "proposed_action": "no-op",
        "confidence": confidence,
        "evidence_uris": [],
        "rationale": "stub",
    }


async def _insert_admin() -> uuid.UUID:
    new_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, email, role, onboarding_complete) "
                "VALUES (:id, :email, 'admin', true)"
            ),
            {"id": new_id, "email": f"aa-admin-{new_id}@emappa.test"},
        )
    return new_id


# ---- agent_action -----------------------------------------------------------

async def test_propose_creates_pending_row():
    async with SessionLocal() as session:
        row = await aa_repo.propose(
            session, agent_id="drs", proposal=_proposal("drs")
        )
        await session.commit()
    assert row.status == "pending_admin_approval"
    assert row.decided_by is None
    assert row.decided_at is None


async def test_propose_validates_proposal_shape():
    bad = _proposal()
    bad.pop("rationale")
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="missing keys"):
            await aa_repo.propose(session, agent_id="drs", proposal=bad)


async def test_propose_validates_confidence_range():
    bad = _proposal(confidence=1.5)
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="confidence"):
            await aa_repo.propose(session, agent_id="drs", proposal=bad)


async def test_propose_rejects_mismatched_agent_id():
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="must match"):
            await aa_repo.propose(
                session, agent_id="lbrs", proposal=_proposal("drs")
            )


async def test_invalid_agent_id_blocked_by_db_check():
    async with SessionLocal() as session:
        session.add(
            AgentAction(
                agent_id="bogus",
                agent_version="0.0.1",
                proposal=_proposal(),
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_decide_advances_to_accepted_with_reason():
    admin = await _insert_admin()
    async with SessionLocal() as session:
        row = await aa_repo.propose(
            session, agent_id="lbrs", proposal=_proposal("lbrs")
        )
        await session.commit()
        rid = row.id

    async with SessionLocal() as session:
        decided = await aa_repo.decide(
            session,
            action_id=rid,
            decision="accepted",
            decided_by=admin,
            reason="manual review passed",
        )
        await session.commit()
    assert decided.status == "accepted"
    assert decided.decided_by == admin
    assert decided.decided_at is not None
    assert decided.decision_reason == "manual review passed"


async def test_decide_requires_non_empty_reason():
    admin = await _insert_admin()
    async with SessionLocal() as session:
        row = await aa_repo.propose(
            session, agent_id="drs", proposal=_proposal("drs")
        )
        await session.commit()
        rid = row.id

    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="reason required"):
            await aa_repo.decide(
                session,
                action_id=rid,
                decision="rejected",
                decided_by=admin,
                reason="   ",
            )


async def test_decide_twice_raises():
    admin = await _insert_admin()
    async with SessionLocal() as session:
        row = await aa_repo.propose(
            session, agent_id="settlement", proposal=_proposal("settlement")
        )
        await session.commit()
        rid = row.id

    async with SessionLocal() as session:
        await aa_repo.decide(
            session,
            action_id=rid,
            decision="accepted",
            decided_by=admin,
            reason="first",
        )
        await session.commit()

    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="already decided"):
            await aa_repo.decide(
                session,
                action_id=rid,
                decision="rejected",
                decided_by=admin,
                reason="second",
            )


async def test_decision_atomicity_db_check_blocks_malformed_insert():
    """status='accepted' but decided_by NULL → CHECK constraint fires."""
    async with SessionLocal() as session:
        session.add(
            AgentAction(
                agent_id="drs",
                agent_version="0.0.1",
                proposal=_proposal(),
                status="accepted",
                decided_by=None,
                decided_at=datetime.now(timezone.utc),
                decision_reason="missing decided_by",
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_list_pending_filters_by_agent():
    async with SessionLocal() as session:
        await aa_repo.propose(
            session, agent_id="drs", proposal=_proposal("drs")
        )
        await aa_repo.propose(
            session, agent_id="lbrs", proposal=_proposal("lbrs")
        )
        await session.commit()

    async with SessionLocal() as session:
        drs_only = await aa_repo.list_pending(session, agent_id="drs")
    assert all(a.agent_id == "drs" for a in drs_only)


# ---- agent_eval_run ---------------------------------------------------------

async def test_record_persists_scorecard_and_delta():
    async with SessionLocal() as session:
        row = await ae_repo.record(
            session,
            agent_id="drs",
            agent_version="0.0.1-stub",
            scorecard={"precision": 0.85, "recall": 0.7},
            regression_delta={"precision": 0.05, "recall": -0.02},
            pass_=True,
        )
        await session.commit()
    assert row.scorecard["precision"] == 0.85
    assert row.regression_delta["recall"] == -0.02
    assert row.pass_ is True


async def test_latest_for_version_returns_most_recent():
    async with SessionLocal() as session:
        await ae_repo.record(
            session,
            agent_id="alert_triage",
            agent_version="0.0.1-stub",
            scorecard={"f1": 0.6},
            pass_=False,
        )
        await session.commit()

    async with SessionLocal() as session:
        latest = await ae_repo.record(
            session,
            agent_id="alert_triage",
            agent_version="0.0.1-stub",
            scorecard={"f1": 0.8},
            pass_=True,
        )
        await session.commit()

    async with SessionLocal() as session:
        got = await ae_repo.latest_for_version(
            session, agent_id="alert_triage", agent_version="0.0.1-stub"
        )
    assert got.id == latest.id


def test_compute_delta_handles_no_previous():
    out = ae_repo.compute_delta({"a": 0.5, "b": 0.7}, previous=None)
    assert out == {"a": 0.0, "b": 0.0}


def test_compute_delta_diffs_each_metric():
    out = ae_repo.compute_delta(
        {"a": 0.8, "b": 0.6, "c": 0.5},
        previous={"a": 0.5, "b": 0.6, "d": 0.9},
    )
    assert out["a"] == pytest.approx(0.3)
    assert out["b"] == pytest.approx(0.0)
    assert out["c"] == pytest.approx(0.5)  # new metric vs missing previous
    assert out["d"] == pytest.approx(-0.9)  # dropped metric


async def test_invalid_eval_agent_id_blocked_by_check():
    async with SessionLocal() as session:
        session.add(
            AgentEvalRun(
                agent_id="bogus",
                agent_version="0.0.1",
                scorecard={},
                regression_delta={},
                pass_=True,
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()
