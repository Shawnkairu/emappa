"""P9.1.20 — audit_log append-only invariant (CR-2 / ADR 0001).

Asserts the BEFORE UPDATE / BEFORE DELETE triggers installed by
migration 0003 actually raise. This is the DB-layer half of the
DONE_DEFINITION CR-2 gate; the app-layer half (no UPDATE call sites)
is enforced by grep + code review.
"""
from __future__ import annotations

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db.session import engine


async def _insert_one_row() -> int:
    async with engine.begin() as conn:
        result = await conn.execute(
            text(
                "INSERT INTO audit_log (action, target_type, target_id, reason, "
                "actor_kind, surface) "
                "VALUES (:action, :tt, :tid, :reason, :kind, :surface) RETURNING id"
            ),
            {
                "action": "test:insert",
                "tt": "test_target",
                "tid": "fixture-row",
                "reason": "immutability fixture",
                "kind": "system",
                "surface": "pytest",
            },
        )
        row_id = result.scalar_one()
    return int(row_id)


async def test_audit_log_update_is_blocked():
    row_id = await _insert_one_row()
    with pytest.raises(DBAPIError) as exc:
        async with engine.begin() as conn:
            await conn.execute(
                text("UPDATE audit_log SET action = :a WHERE id = :id"),
                {"a": "tampered", "id": row_id},
            )
    assert "append-only" in str(exc.value).lower() or "audit_log" in str(exc.value).lower()


async def test_audit_log_delete_is_blocked():
    row_id = await _insert_one_row()
    with pytest.raises(DBAPIError) as exc:
        async with engine.begin() as conn:
            await conn.execute(
                text("DELETE FROM audit_log WHERE id = :id"), {"id": row_id}
            )
    assert "append-only" in str(exc.value).lower() or "audit_log" in str(exc.value).lower()


async def test_agent_attribution_required_when_actor_kind_is_agent():
    # CHECK constraint: actor_kind='agent' AND agent_attribution IS NULL → reject.
    with pytest.raises(DBAPIError):
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    "INSERT INTO audit_log (action, actor_kind, agent_attribution, reason) "
                    "VALUES ('test:agent', 'agent', NULL, 'should-fail')"
                )
            )


async def test_agent_attribution_accepted_when_provided():
    async with engine.begin() as conn:
        result = await conn.execute(
            text(
                "INSERT INTO audit_log (action, actor_kind, agent_attribution, reason) "
                "VALUES ('test:agent', 'agent', 'drs', 'ok') RETURNING id"
            )
        )
        assert result.scalar_one() > 0
