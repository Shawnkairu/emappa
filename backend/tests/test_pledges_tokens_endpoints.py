"""P1.6.2a — POST /pledges + POST /tokens/purchase + façade dual-write.

Covers the doctrine guards baked into the new endpoint contract:
- POST /pledges rejects when building.stage == 'live'           (Scenario A §5)
- POST /tokens/purchase rejects when building.stage != 'live'   (Scenario A §5)
- POST /tokens/purchase rejects when no capacity_cleared row    (P9.1.5)
- residents/homeowners restricted to their own building          (scope)
- POST /pledges + cancel writes audit rows with reason           (CR-2)
- POST /tokens/purchase writes audit row with reason             (CR-2)

The dual-write façade is exercised in a separate test that POSTs to
/prepaid/commit and asserts BOTH the legacy `prepaid_commitments` row AND
the new pledge OR token_purchase row land. Parity audit script is
covered in its own test file.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import text

from app.db.session import engine


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
                "name": f"p162a-{new_id}",
                "addr": "test",
                "stage": stage,
                "code": f"P{str(new_id).replace('-', '')[:5].upper()}",
            },
        )
    return new_id


async def _login_and_link(
    client: AsyncClient, *, role: str, building_id: uuid.UUID
) -> tuple[str, uuid.UUID]:
    email = f"p162a-{role}-{uuid.uuid4().hex[:8]}@emappa.test"
    r = await client.post("/auth/verify-otp", json={"email": email, "code": "000000"})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    user_id = uuid.UUID(r.json()["user"]["id"])
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "UPDATE users SET role = :role, building_id = :bid, "
                "onboarding_complete = true WHERE id = :id"
            ),
            {"role": role, "bid": building_id, "id": user_id},
        )
    return token, user_id


# ---- /pledges ---------------------------------------------------------------

async def test_create_pledge_succeeds_pre_activation(client):
    bld = await _insert_building(stage="qualifying")
    token, _ = await _login_and_link(client, role="resident", building_id=bld)
    r = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 500, "reason": "intent to participate"},
    )
    assert r.status_code == 201, r.text
    pledge = r.json()["pledge"]
    assert pledge["status"] == "active"
    assert pledge["amountKes"] == 500


async def test_create_pledge_with_null_amount_accepted(client):
    bld = await _insert_building(stage="qualifying")
    token, _ = await _login_and_link(client, role="resident", building_id=bld)
    r = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "reason": "interest, amount tbd"},
    )
    assert r.status_code == 201
    assert r.json()["pledge"]["amountKes"] is None


async def test_create_pledge_rejected_when_building_is_live(client):
    bld = await _insert_building(stage="live")
    token, _ = await _login_and_link(client, role="resident", building_id=bld)
    r = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 100, "reason": "should fail"},
    )
    assert r.status_code == 409
    assert r.json()["detail"] == "pledge_post_activation_forbidden"


async def test_create_pledge_rejects_other_building_for_resident(client):
    own = await _insert_building(stage="qualifying")
    other = await _insert_building(stage="qualifying")
    token, _ = await _login_and_link(client, role="resident", building_id=own)
    r = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(other), "amountKes": 100, "reason": "wrong building"},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "not_your_building"


async def test_create_pledge_writes_audit_row(client):
    bld = await _insert_building(stage="qualifying")
    token, user_id = await _login_and_link(client, role="resident", building_id=bld)
    await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 200, "reason": "audit-test reason"},
    )
    async with engine.begin() as conn:
        result = await conn.execute(
            text(
                "SELECT reason FROM audit_log WHERE action = 'pledge.create' "
                "AND actor_user_id = :u ORDER BY at DESC LIMIT 1"
            ),
            {"u": user_id},
        )
        row = result.scalar_one()
    assert row == "audit-test reason"


async def test_create_pledge_requires_reason(client):
    # P1.6.7: middleware now enforces `reason` BEFORE the route handler runs
    # (belt + suspenders against the pydantic min_length=1 in CreatePledgeBody).
    # Net behavior: 400 from middleware instead of 422 from pydantic.
    bld = await _insert_building(stage="qualifying")
    token, _ = await _login_and_link(client, role="resident", building_id=bld)
    r = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 100},  # no reason
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "audit_reason_required"


async def test_create_pledge_writes_wallet_transaction_row(client):
    # P1.6.7: parity with legacy /prepaid/commit — a pledge with a concrete
    # amount records a negative wallet_transactions row of kind='pledge'.
    bld = await _insert_building(stage="qualifying")
    token, user_id = await _login_and_link(client, role="resident", building_id=bld)
    r = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 450, "reason": "wallet parity test"},
    )
    assert r.status_code == 201, r.text
    async with engine.begin() as conn:
        row = (
            await conn.execute(
                text(
                    "SELECT kind, amount_kes, reference FROM wallet_transactions "
                    "WHERE user_id = :u ORDER BY at DESC LIMIT 1"
                ),
                {"u": user_id},
            )
        ).one()
    assert row.kind == "pledge"
    assert Decimal(row.amount_kes) == Decimal("-450")
    assert "Pledge to" in row.reference


async def test_null_amount_pledge_writes_no_wallet_transaction(client):
    # Pledges of intent (null amount) intentionally write no wallet row —
    # there is no legacy /prepaid/commit precedent for null amounts.
    bld = await _insert_building(stage="qualifying")
    token, user_id = await _login_and_link(client, role="resident", building_id=bld)
    r = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "reason": "intent only"},
    )
    assert r.status_code == 201, r.text
    async with engine.begin() as conn:
        count = (
            await conn.execute(
                text("SELECT COUNT(*) FROM wallet_transactions WHERE user_id = :u"),
                {"u": user_id},
            )
        ).scalar_one()
    assert count == 0


async def test_cancel_pledge_transitions_to_cancelled(client):
    bld = await _insert_building(stage="qualifying")
    token, _ = await _login_and_link(client, role="resident", building_id=bld)
    create = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 300, "reason": "to be cancelled"},
    )
    pid = create.json()["pledge"]["id"]
    r = await client.post(
        f"/pledges/{pid}/cancel",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "changed my mind"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["pledge"]["status"] == "cancelled"


async def test_cannot_cancel_other_users_pledge(client):
    bld = await _insert_building(stage="qualifying")
    t1, _ = await _login_and_link(client, role="resident", building_id=bld)
    t2, _ = await _login_and_link(client, role="resident", building_id=bld)
    create = await client.post(
        "/pledges",
        headers={"Authorization": f"Bearer {t1}"},
        json={"buildingId": str(bld), "amountKes": 100, "reason": "alice's"},
    )
    pid = create.json()["pledge"]["id"]
    r = await client.post(
        f"/pledges/{pid}/cancel",
        headers={"Authorization": f"Bearer {t2}"},
        json={"reason": "trying to cancel bob's pledge"},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "not_your_pledge"


# ---- /tokens/purchase -------------------------------------------------------

async def _grant_capacity_cleared(user_id: uuid.UUID, building_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO capacity_queue (building_id, user_id, position, status) "
                "VALUES (:b, :u, 1, 'capacity_cleared')"
            ),
            {"b": building_id, "u": user_id},
        )


async def test_token_purchase_succeeds_post_activation_when_capacity_cleared(client):
    bld = await _insert_building(stage="live")
    token, user_id = await _login_and_link(client, role="resident", building_id=bld)
    await _grant_capacity_cleared(user_id, bld)

    r = await client.post(
        "/tokens/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "buildingId": str(bld),
            "amountKes": 750,
            "paymentMethod": "mpesa",
            "reason": "monthly top-up",
        },
    )
    assert r.status_code == 201, r.text
    tp = r.json()["tokenPurchase"]
    assert tp["amountKes"] == 750
    assert tp["paymentMethod"] == "mpesa"


async def test_token_purchase_rejected_pre_activation(client):
    bld = await _insert_building(stage="qualifying")
    token, user_id = await _login_and_link(client, role="resident", building_id=bld)
    await _grant_capacity_cleared(user_id, bld)
    r = await client.post(
        "/tokens/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "buildingId": str(bld),
            "amountKes": 100,
            "paymentMethod": "mpesa",
            "reason": "should fail pre-live",
        },
    )
    assert r.status_code == 409
    assert r.json()["detail"] == "token_purchase_pre_activation_forbidden"


async def test_token_purchase_rejected_when_capacity_not_cleared(client):
    bld = await _insert_building(stage="live")
    token, _ = await _login_and_link(client, role="resident", building_id=bld)
    r = await client.post(
        "/tokens/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "buildingId": str(bld),
            "amountKes": 100,
            "paymentMethod": "mpesa",
            "reason": "no queue clearance",
        },
    )
    assert r.status_code == 409
    assert r.json()["detail"] == "capacity_not_cleared"


async def test_token_purchase_writes_audit_row_with_reason(client):
    bld = await _insert_building(stage="live")
    token, user_id = await _login_and_link(client, role="resident", building_id=bld)
    await _grant_capacity_cleared(user_id, bld)
    await client.post(
        "/tokens/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "buildingId": str(bld),
            "amountKes": 200,
            "paymentMethod": "card",
            "reason": "card top-up",
        },
    )
    async with engine.begin() as conn:
        result = await conn.execute(
            text(
                "SELECT reason FROM audit_log WHERE action = 'token.purchase' "
                "AND actor_user_id = :u"
            ),
            {"u": user_id},
        )
        assert result.scalar_one() == "card top-up"


# ---- /prepaid/commit dual-write façade --------------------------------------

async def test_facade_pre_live_writes_to_pledge_table(client):
    bld = await _insert_building(stage="qualifying")
    token, user_id = await _login_and_link(client, role="resident", building_id=bld)
    r = await client.post(
        "/prepaid/commit",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 100},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dualWrite"]["classifiedAs"] == "pledge"

    # New-table row exists
    async with engine.begin() as conn:
        rows = (
            await conn.execute(
                text(
                    "SELECT COUNT(*) FROM pledge WHERE user_id = :u "
                    "AND amount_kes = 100"
                ),
                {"u": user_id},
            )
        ).scalar_one()
    assert rows == 1


async def test_facade_live_writes_to_token_purchase_table(client):
    bld = await _insert_building(stage="live")
    token, user_id = await _login_and_link(client, role="resident", building_id=bld)
    r = await client.post(
        "/prepaid/commit",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 200},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dualWrite"]["classifiedAs"] == "token_purchase"

    async with engine.begin() as conn:
        rows = (
            await conn.execute(
                text(
                    "SELECT COUNT(*) FROM token_purchase WHERE user_id = :u "
                    "AND amount_kes = 200"
                ),
                {"u": user_id},
            )
        ).scalar_one()
    assert rows == 1


async def test_facade_keeps_legacy_table_in_sync(client):
    """Critical invariant for parity audit: the legacy row still lands."""
    bld = await _insert_building(stage="qualifying")
    token, user_id = await _login_and_link(client, role="resident", building_id=bld)
    await client.post(
        "/prepaid/commit",
        headers={"Authorization": f"Bearer {token}"},
        json={"buildingId": str(bld), "amountKes": 333},
    )
    async with engine.begin() as conn:
        legacy = (
            await conn.execute(
                text(
                    "SELECT amount_kes FROM prepaid_commitments WHERE user_id = :u"
                ),
                {"u": user_id},
            )
        ).scalar_one()
    assert float(legacy) == 333.0
