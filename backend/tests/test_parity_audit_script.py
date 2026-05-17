"""P1.6.2a — scripts/audit_pledge_token_parity.py exit codes + outputs.

Exercises the script as a callable (avoids spawning a subprocess), drives
the SQL queries through real DB state set up inline, and asserts:
- exit 0 when parity holds for every inspected user
- exit 1 when drift is present (and prints to stdout/stderr)
- --user-id restricts to a single user
- --json emits valid JSON with the in_parity_overall flag
- invalid --user-id exits 2
"""
from __future__ import annotations

import io
import json
import uuid
from contextlib import redirect_stdout, redirect_stderr
from decimal import Decimal

import pytest
from sqlalchemy import text

from app.db.session import engine
from scripts import audit_pledge_token_parity as script


async def _insert_building(stage: str = "qualifying") -> uuid.UUID:
    new_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO buildings (id, name, address, lat, lon, unit_count, "
                "kind, stage, data_source) "
                "VALUES (:id, :name, :addr, 0.0, 0.0, 1, 'apartment', :stage, "
                "'synthetic')"
            ),
            {"id": new_id, "name": f"parity-{new_id}", "addr": "x", "stage": stage},
        )
    return new_id


async def _insert_user() -> uuid.UUID:
    new_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, email, role, onboarding_complete) "
                "VALUES (:id, :email, 'resident', true)"
            ),
            {"id": new_id, "email": f"parity-{new_id}@emappa.test"},
        )
    return new_id


async def _seed_user_in_parity(bld_pre: uuid.UUID, bld_live: uuid.UUID) -> uuid.UUID:
    """Seed legacy 600 (pre-live) + 400 (live) and matching new-table rows."""
    user = await _insert_user()
    async with engine.begin() as conn:
        # Legacy: two confirmed rows summing to 1000
        await conn.execute(
            text(
                "INSERT INTO prepaid_commitments (building_id, user_id, amount_kes, "
                "payment_method, status) VALUES (:b1, :u, 600, 'pledge', 'confirmed'),"
                "(:b2, :u, 400, 'mpesa', 'confirmed')"
            ),
            {"b1": bld_pre, "b2": bld_live, "u": user},
        )
        # New tables: pledge 600 + token_purchase 400 = 1000 (matches)
        await conn.execute(
            text(
                "INSERT INTO pledge (building_id, user_id, amount_kes, status) "
                "VALUES (:b, :u, 600, 'active')"
            ),
            {"b": bld_pre, "u": user},
        )
        await conn.execute(
            text(
                "INSERT INTO token_purchase (building_id, user_id, amount_kes, "
                "payment_method) VALUES (:b, :u, 400, 'mpesa')"
            ),
            {"b": bld_live, "u": user},
        )
    return user


async def _seed_user_in_drift(bld_pre: uuid.UUID) -> uuid.UUID:
    """Legacy 500, but only 250 in pledge → 250 drift."""
    user = await _insert_user()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO prepaid_commitments (building_id, user_id, amount_kes, "
                "payment_method, status) VALUES (:b, :u, 500, 'pledge', 'confirmed')"
            ),
            {"b": bld_pre, "u": user},
        )
        await conn.execute(
            text(
                "INSERT INTO pledge (building_id, user_id, amount_kes, status) "
                "VALUES (:b, :u, 250, 'active')"
            ),
            {"b": bld_pre, "u": user},
        )
    return user


async def test_script_exits_0_when_parity_holds_for_one_user():
    bld_pre = await _insert_building(stage="qualifying")
    bld_live = await _insert_building(stage="live")
    user = await _seed_user_in_parity(bld_pre, bld_live)

    out = io.StringIO()
    with redirect_stdout(out):
        rc = await script._run(user, as_json=False)
    assert rc == 0
    assert "parity holds" in out.getvalue()


async def test_script_exits_1_when_drift_present():
    bld_pre = await _insert_building(stage="qualifying")
    user = await _seed_user_in_drift(bld_pre)

    out = io.StringIO()
    with redirect_stdout(out):
        rc = await script._run(user, as_json=False)
    assert rc == 1
    assert "DRIFT" in out.getvalue()
    assert "DO NOT PROMOTE" in out.getvalue()


async def test_script_json_output_is_valid_json_when_in_parity():
    bld_pre = await _insert_building(stage="qualifying")
    bld_live = await _insert_building(stage="live")
    user = await _seed_user_in_parity(bld_pre, bld_live)

    out = io.StringIO()
    with redirect_stdout(out):
        rc = await script._run(user, as_json=True)
    assert rc == 0
    payload = json.loads(out.getvalue())
    assert payload["in_parity_overall"] is True
    assert payload["users_inspected"] == 1
    assert payload["rows"][0]["in_parity"] is True


async def test_script_json_output_flags_drift():
    bld_pre = await _insert_building(stage="qualifying")
    user = await _seed_user_in_drift(bld_pre)

    out = io.StringIO()
    with redirect_stdout(out):
        rc = await script._run(user, as_json=True)
    assert rc == 1
    payload = json.loads(out.getvalue())
    assert payload["in_parity_overall"] is False
    assert payload["drift_count"] == 1
    drift_row = payload["rows"][0]
    assert drift_row["delta"] == 250.0  # 500 legacy - 250 pledge - 0 token


def test_invalid_user_id_exits_2():
    err = io.StringIO()
    with redirect_stderr(err):
        rc = script.main(["--user-id", "not-a-uuid"])
    assert rc == 2
    assert "invalid --user-id" in err.getvalue()
