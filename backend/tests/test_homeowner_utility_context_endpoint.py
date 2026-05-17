"""P2.6.2 — POST /homeowner/{user_id}/utility-context endpoint.

Storage = user.profile['utilityContext'] JSONB sub-key (no dedicated
table; matches P1.6.1 resident-profile pattern). Tests cover:
- happy path: prepaid meter with number + photos persisted into profile
- happy path: 'unknown' meter_type accepted without meter_number
- merge semantics: prior profile keys preserved across the update
- doctrine: meter_type='prepaid' or 'postpaid' without meter_number → 422
- doctrine: monthly_spend_kes < 0 → 422
- middleware: missing `reason` → 400
- scope: resident → 403 only_homeowners_or_admins
- scope: homeowner submitting for another → 403 not_your_resource
- admin can submit on behalf of homeowner
- audit row written with the reason
- prepaid_usage_pattern silently dropped when meter_type != 'prepaid'
"""
from __future__ import annotations

import uuid

from httpx import AsyncClient
from sqlalchemy import text

from app.db.session import engine


async def _login(client: AsyncClient, role: str) -> tuple[str, uuid.UUID]:
    email = f"p262-{role}-{uuid.uuid4().hex[:8]}@emappa.test"
    r = await client.post("/auth/verify-otp", json={"email": email, "code": "000000"})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    user_id = uuid.UUID(r.json()["user"]["id"])
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "UPDATE users SET role = :role, onboarding_complete = true "
                "WHERE id = :id"
            ),
            {"role": role, "id": user_id},
        )
    return token, user_id


async def _read_profile(user_id: uuid.UUID) -> dict:
    async with engine.begin() as conn:
        row = (
            await conn.execute(
                text("SELECT profile FROM users WHERE id = :u"),
                {"u": user_id},
            )
        ).scalar_one()
    return row or {}


# ---- happy path ------------------------------------------------------------


async def test_prepaid_meter_with_number_and_photos_persists(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/utility-context",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "meterType": "prepaid",
            "meterNumber": "37291XYZ",
            "meterAreaPhotoUrls": ["s3://photos/meter1.jpg"],
            "dbPhotoUrls": ["s3://photos/db1.jpg", "s3://photos/db2.jpg"],
            "monthlySpendKes": 3500,
            "prepaidUsagePattern": "tops up 500 KES every Friday",
            "reason": "onboarding step 6 capture",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()["utilityContext"]
    assert body["meterType"] == "prepaid"
    assert body["meterNumber"] == "37291XYZ"
    assert body["meterAreaPhotoUrls"] == ["s3://photos/meter1.jpg"]
    assert len(body["dbPhotoUrls"]) == 2
    assert body["monthlySpendKes"] == 3500
    assert body["prepaidUsagePattern"] == "tops up 500 KES every Friday"

    persisted = (await _read_profile(user_id)).get("utilityContext")
    assert persisted is not None
    assert persisted["meterNumber"] == "37291XYZ"


async def test_unknown_meter_type_accepts_no_number(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/utility-context",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "meterType": "unknown",
            "monthlySpendKes": 0,
            "reason": "new build, no meter yet",
        },
    )
    assert r.status_code == 201
    assert r.json()["utilityContext"]["meterNumber"] is None


async def test_prepaid_usage_pattern_dropped_when_meter_type_not_prepaid(client):
    """The field is only meaningful for prepaid meters; the endpoint silently
    nulls it for postpaid/unknown to avoid bad downstream queries."""
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/utility-context",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "meterType": "postpaid",
            "meterNumber": "ABC123",
            "prepaidUsagePattern": "this should be ignored",
            "reason": "postpaid capture",
        },
    )
    assert r.status_code == 201
    assert r.json()["utilityContext"]["prepaidUsagePattern"] is None


async def test_merge_preserves_existing_profile_keys(client):
    token, user_id = await _login(client, role="homeowner")
    # Seed an existing profile key that should NOT get clobbered.
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "UPDATE users SET profile = profile || :patch::jsonb "
                "WHERE id = :u"
            ),
            {"u": user_id, "patch": '{"apartmentLabel":"Apt 4B"}'},
        )
    r = await client.post(
        f"/homeowner/{user_id}/utility-context",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "meterType": "prepaid",
            "meterNumber": "Z999",
            "reason": "merge check",
        },
    )
    assert r.status_code == 201
    profile = await _read_profile(user_id)
    assert profile.get("apartmentLabel") == "Apt 4B"
    assert profile.get("utilityContext", {}).get("meterNumber") == "Z999"


# ---- bad input -------------------------------------------------------------


async def test_prepaid_without_meter_number_rejected_422(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/utility-context",
        headers={"Authorization": f"Bearer {token}"},
        json={"meterType": "prepaid", "reason": "missing num"},
    )
    assert r.status_code == 422
    assert "meter_number" in r.text


async def test_postpaid_with_blank_meter_number_rejected_422(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/utility-context",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "meterType": "postpaid",
            "meterNumber": "   ",
            "reason": "blank num",
        },
    )
    assert r.status_code == 422


async def test_negative_monthly_spend_rejected_422(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/utility-context",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "meterType": "unknown",
            "monthlySpendKes": -10,
            "reason": "neg spend",
        },
    )
    assert r.status_code == 422


async def test_missing_reason_rejected_at_middleware(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/utility-context",
        headers={"Authorization": f"Bearer {token}"},
        json={"meterType": "unknown"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "audit_reason_required"


# ---- scope -----------------------------------------------------------------


async def test_resident_cannot_submit(client):
    token, user_id = await _login(client, role="resident")
    r = await client.post(
        f"/homeowner/{user_id}/utility-context",
        headers={"Authorization": f"Bearer {token}"},
        json={"meterType": "unknown", "reason": "wrong role"},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "only_homeowners_or_admins"


async def test_homeowner_cannot_submit_for_another(client):
    t1, _ = await _login(client, role="homeowner")
    _, other = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{other}/utility-context",
        headers={"Authorization": f"Bearer {t1}"},
        json={"meterType": "unknown", "reason": "stranger"},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "not_your_resource"


async def test_admin_can_submit_on_behalf_of_homeowner(client):
    admin_token, _ = await _login(client, role="admin")
    _, ho = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{ho}/utility-context",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "meterType": "prepaid",
            "meterNumber": "ADMIN-1",
            "reason": "admin entered on call",
        },
    )
    assert r.status_code == 201, r.text


# ---- audit row -------------------------------------------------------------


async def test_submission_writes_audit_row(client):
    token, user_id = await _login(client, role="homeowner")
    await client.post(
        f"/homeowner/{user_id}/utility-context",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "meterType": "unknown",
            "monthlySpendKes": 1200,
            "reason": "audit-trail reason",
        },
    )
    async with engine.begin() as conn:
        row = (
            await conn.execute(
                text(
                    "SELECT reason FROM audit_log WHERE action = "
                    "'homeowner.utility_context.submit' "
                    "AND actor_user_id = :u ORDER BY at DESC LIMIT 1"
                ),
                {"u": user_id},
            )
        ).scalar_one()
    assert row == "audit-trail reason"
