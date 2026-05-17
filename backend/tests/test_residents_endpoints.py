"""P1.6.3-6 — /residents/{user_id}/* endpoints.

Covers all 4 endpoints + scope guard + happy/sad paths + audit rows.
"""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import text

from app.db.session import engine


async def _login(client: AsyncClient, role: str = "resident") -> tuple[str, uuid.UUID]:
    email = f"p163-{role}-{uuid.uuid4().hex[:8]}@emappa.test"
    r = await client.post("/auth/verify-otp", json={"email": email, "code": "000000"})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    user_id = uuid.UUID(r.json()["user"]["id"])
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE users SET role = :r WHERE id = :id"),
            {"r": role, "id": user_id},
        )
    return token, user_id


async def _link_user_to_building(user_id: uuid.UUID) -> uuid.UUID:
    bid = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO buildings (id, name, address, lat, lon, unit_count, "
                "kind, stage, data_source) VALUES "
                "(:id, :name, 'addr', 0, 0, 4, 'apartment', 'qualifying', 'synthetic')"
            ),
            {"id": bid, "name": f"p163-bld-{bid}"},
        )
        await conn.execute(
            text("UPDATE users SET building_id = :b WHERE id = :u"),
            {"b": bid, "u": user_id},
        )
    return bid


# ---- P1.6.3 load-profile ---------------------------------------------------

async def test_capture_load_profile_persists_and_returns_serialized_row(client):
    token, user_id = await _login(client)
    r = await client.post(
        f"/residents/{user_id}/load-profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "level": "L1",
            "appliances": [
                {"name": "fridge", "watts": 150, "hoursPerDay": 24},
                {"name": "lights", "watts": 60, "hoursPerDay": 5},
            ],
            "daytimeKwh": 3.0,
            "eveningKwh": 2.5,
            "confidence": 0.6,
            "reason": "initial L1 capture at onboarding",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()["loadProfile"]
    assert body["level"] == "L1"
    assert body["daytimeKwh"] == 3.0
    assert body["confidence"] == 0.6
    assert len(body["appliances"]) == 2


async def test_capture_load_profile_writes_audit_row(client):
    token, user_id = await _login(client)
    await client.post(
        f"/residents/{user_id}/load-profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "level": "L2",
            "appliances": [],
            "daytimeKwh": 4,
            "eveningKwh": 3,
            "confidence": 0.7,
            "reason": "L2 capture",
        },
    )
    async with engine.begin() as conn:
        reason = (
            await conn.execute(
                text(
                    "SELECT reason FROM audit_log WHERE action = "
                    "'resident.load_profile.capture' AND actor_user_id = :u"
                ),
                {"u": user_id},
            )
        ).scalar_one()
    assert reason == "L2 capture"


async def test_capture_load_profile_blocks_cross_user_access(client):
    token_a, _ = await _login(client)
    _, user_b = await _login(client)
    r = await client.post(
        f"/residents/{user_b}/load-profile",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "level": "L1",
            "appliances": [],
            "daytimeKwh": 1,
            "eveningKwh": 1,
            "confidence": 0.5,
            "reason": "trying to capture for someone else",
        },
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "not_your_resource"


async def test_capture_load_profile_validates_confidence_range(client):
    token, user_id = await _login(client)
    r = await client.post(
        f"/residents/{user_id}/load-profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "level": "L1",
            "appliances": [],
            "daytimeKwh": 1,
            "eveningKwh": 1,
            "confidence": 1.5,  # out of range
            "reason": "bad confidence",
        },
    )
    assert r.status_code == 422  # pydantic ge=0/le=1


# ---- P1.6.4 + P1.6.5 queue-position + queue-request ------------------------

async def test_queue_position_returns_unqueued_state_initially(client):
    token, user_id = await _login(client)
    bid = await _link_user_to_building(user_id)
    r = await client.get(
        f"/residents/{user_id}/queue-position",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["queued"] is False
    assert body["position"] is None
    assert body["priorityFactors"] == []


async def test_queue_request_then_position_reflects_join(client):
    token, user_id = await _login(client)
    bid = await _link_user_to_building(user_id)

    r = await client.post(
        f"/residents/{user_id}/queue-request",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "buildingId": str(bid),
            "priorityFactors": ["pledge_amount", "early_signup"],
            "reason": "joining queue at onboarding",
        },
    )
    assert r.status_code == 201, r.text
    join_body = r.json()
    assert join_body["position"] == 1
    assert join_body["status"] == "interested"
    assert set(join_body["priorityFactors"]) == {"pledge_amount", "early_signup"}

    r = await client.get(
        f"/residents/{user_id}/queue-position",
        headers={"Authorization": f"Bearer {token}"},
    )
    body = r.json()
    assert body["queued"] is True
    assert body["position"] == 1


async def test_queue_request_rejects_unknown_priority_factor(client):
    token, user_id = await _login(client)
    bid = await _link_user_to_building(user_id)
    r = await client.post(
        f"/residents/{user_id}/queue-request",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "buildingId": str(bid),
            "priorityFactors": ["pledge_amount", "made_up"],
            "reason": "should fail validation",
        },
    )
    assert r.status_code == 400
    assert "unknown priority factor" in r.json()["detail"]


async def test_queue_position_400_when_building_id_required_and_missing(client):
    """User without building_id, no ?building_id= query."""
    token, user_id = await _login(client)
    r = await client.get(
        f"/residents/{user_id}/queue-position",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "building_id_required"


async def test_queue_request_writes_audit_row(client):
    token, user_id = await _login(client)
    bid = await _link_user_to_building(user_id)
    await client.post(
        f"/residents/{user_id}/queue-request",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bid), "reason": "audit row check"},
    )
    async with engine.begin() as conn:
        reason = (
            await conn.execute(
                text(
                    "SELECT reason FROM audit_log WHERE action = "
                    "'resident.queue.join' AND actor_user_id = :u"
                ),
                {"u": user_id},
            )
        ).scalar_one()
    assert reason == "audit row check"


# ---- P1.6.6 ats-state ------------------------------------------------------

async def test_ats_state_returns_unknown_for_missing_row(client):
    token, user_id = await _login(client)
    bid = await _link_user_to_building(user_id)
    r = await client.get(
        f"/residents/{user_id}/ats-state",
        headers={"Authorization": f"Bearer {token}"},
        params={"apartment_label": "Apt 9Z"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["known"] is False
    assert body["state"] is None


async def test_ats_state_returns_known_state_when_row_exists(client):
    token, user_id = await _login(client)
    bid = await _link_user_to_building(user_id)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO apartment_ats_state (building_id, apartment_label, "
                "state, last_transition_reason) VALUES (:b, 'Apt 3B', 'active_solar', "
                "'commissioning ok')"
            ),
            {"b": bid},
        )
    r = await client.get(
        f"/residents/{user_id}/ats-state",
        headers={"Authorization": f"Bearer {token}"},
        params={"apartment_label": "Apt 3B"},
    )
    body = r.json()
    assert body["known"] is True
    assert body["state"] == "active_solar"
    assert body["lastTransitionReason"] == "commissioning ok"


async def test_ats_state_400_when_apartment_label_missing(client):
    token, user_id = await _login(client)
    bid = await _link_user_to_building(user_id)
    r = await client.get(
        f"/residents/{user_id}/ats-state",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "apartment_label_required"


async def test_ats_state_blocks_cross_user_access(client):
    token_a, _ = await _login(client)
    _, user_b = await _login(client)
    bid = await _link_user_to_building(user_b)
    r = await client.get(
        f"/residents/{user_b}/ats-state",
        headers={"Authorization": f"Bearer {token_a}"},
        params={"apartment_label": "Apt 1", "building_id": str(bid)},
    )
    assert r.status_code == 403


# ---- scope: admin bypass --------------------------------------------------

async def test_admin_can_read_any_users_queue_position(client):
    token_admin, _ = await _login(client, role="admin")
    _, user_b = await _login(client)
    bid = await _link_user_to_building(user_b)
    r = await client.get(
        f"/residents/{user_b}/queue-position",
        headers={"Authorization": f"Bearer {token_admin}"},
        params={"building_id": str(bid)},
    )
    assert r.status_code == 200
