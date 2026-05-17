"""P1.6.7 — AUDIT_REQUIRED_PATHS enrollment integration test.

Exercises the *real* `app.middleware.audit.AUDIT_REQUIRED_PATHS` tuple
(not an injected one) by POSTing to each enrolled mutation route with a
reason-less body and asserting the middleware short-circuits with
`400 audit_reason_required` BEFORE the route handler runs.

This is the belt-and-suspenders guarantee: even if a future handler is
refactored in a way that accidentally drops the pydantic `reason` field,
the middleware still rejects malformed requests at the edge.
"""
from __future__ import annotations

import re
import uuid

from sqlalchemy import text

from app.db.session import engine
from app.middleware.audit import AUDIT_REQUIRED_PATHS


async def _insert_building(stage: str = "qualifying") -> uuid.UUID:
    new_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO buildings (id, name, address, lat, lon, unit_count, "
                "kind, stage, data_source, invite_code) "
                "VALUES (:id, :name, :addr, 0.0, 0.0, 1, 'apartment', :stage, "
                "'synthetic', :code)"
            ),
            {
                "id": new_id,
                "name": f"p167-{new_id}",
                "addr": "test",
                "stage": stage,
                "code": f"P{str(new_id).replace('-', '')[:5].upper()}",
            },
        )
    return new_id


async def _login_resident(client, building_id: uuid.UUID) -> tuple[str, uuid.UUID]:
    email = f"p167-{uuid.uuid4().hex[:8]}@emappa.test"
    r = await client.post("/auth/verify-otp", json={"email": email, "code": "000000"})
    token = r.json()["token"]
    user_id = uuid.UUID(r.json()["user"]["id"])
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "UPDATE users SET role = 'resident', building_id = :bid, "
                "onboarding_complete = true WHERE id = :id"
            ),
            {"bid": building_id, "id": user_id},
        )
    return token, user_id


def test_required_paths_covers_expected_routes():
    """Lock the enrollment set against accidental shrinkage in future PRs."""
    expected = {
        r"^/pledges$",
        r"^/pledges/[^/]+/cancel$",
        r"^/tokens/purchase$",
        r"^/residents/[^/]+/load-profile$",
        r"^/residents/[^/]+/queue-request$",
        # P2.6.1 — homeowner authority docs.
        r"^/homeowner/[^/]+/authority-docs$",
    }
    actual = {p.pattern for p in AUDIT_REQUIRED_PATHS}
    missing = expected - actual
    assert not missing, f"AUDIT_REQUIRED_PATHS missing: {missing}"


async def test_pledges_post_rejects_missing_reason_at_middleware(client):
    bld = await _insert_building()
    token, _ = await _login_resident(client, bld)
    r = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 100},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "audit_reason_required"


async def test_pledge_cancel_rejects_missing_reason_at_middleware(client):
    bld = await _insert_building()
    token, _ = await _login_resident(client, bld)
    created = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 50, "reason": "setup"},
    )
    pid = created.json()["pledge"]["id"]
    r = await client.post(
        f"/pledges/{pid}/cancel",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "audit_reason_required"


async def test_tokens_purchase_rejects_missing_reason_at_middleware(client):
    bld = await _insert_building(stage="live")
    token, _ = await _login_resident(client, bld)
    r = await client.post(
        "/tokens/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 100, "paymentMethod": "mpesa"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "audit_reason_required"


async def test_residents_load_profile_rejects_missing_reason_at_middleware(client):
    bld = await _insert_building()
    token, user_id = await _login_resident(client, bld)
    r = await client.post(
        f"/residents/{user_id}/load-profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"tier": "L1", "confidence": 0.5, "appliances": []},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "audit_reason_required"


async def test_residents_queue_request_rejects_missing_reason_at_middleware(client):
    bld = await _insert_building()
    token, user_id = await _login_resident(client, bld)
    r = await client.post(
        f"/residents/{user_id}/queue-request",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld)},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "audit_reason_required"


async def test_prepaid_commit_NOT_enrolled(client):
    """Legacy façade has no `reason` field; ADR 0002 PR 2 returns 410 Gone."""
    # Sanity: the regex set must NOT cover /prepaid/commit, or the legacy
    # parity tests would all flip to 400.
    assert not any(p.search("/prepaid/commit") for p in AUDIT_REQUIRED_PATHS)
