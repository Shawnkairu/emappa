"""P1.6.1 — verify /me/* returns resident-shaped data across the full
resident happy path.

Drives: verify-otp → select-role 'resident' → onboarding-complete →
join-building. Asserts each response carries the shared User shape
(see packages/shared/src/types.ts) and that the resident-specific
field transitions land as IA_SPEC §Resident · Onboarding expects.

Also asserts the response shape contract — every field the shared
`User` type promises is present, no fields the type doesn't promise
leak through. This is the regression guard against schema drift
between backend and shared.
"""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from app.db.session import engine
from sqlalchemy import text


EXPECTED_USER_FIELDS = {
    "id",
    "email",
    "phone",
    "role",
    "businessType",
    "buildingId",
    "onboardingComplete",
    "displayName",
    "profile",
    "createdAt",
    "lastSeenAt",
}

# Seeded by backend/scripts/seed.py — one of the pilot buildings.
SEEDED_INVITE_CODE = "NYERI1"


async def _verify_otp(client: AsyncClient, email: str) -> tuple[str, dict]:
    r = await client.post(
        "/auth/verify-otp", json={"email": email, "code": "000000"}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    return body["token"], body["user"]


def _assert_user_shape(user: dict) -> None:
    """Every field the shared User type promises is present."""
    missing = EXPECTED_USER_FIELDS - user.keys()
    extra = user.keys() - EXPECTED_USER_FIELDS
    assert not missing, f"user response missing fields: {missing}"
    assert not extra, f"user response has unexpected fields: {extra}"


async def test_verify_otp_returns_shape_compliant_user(client):
    email = f"p161-shape-{uuid.uuid4().hex[:8]}@emappa.test"
    _, user = await _verify_otp(client, email)
    _assert_user_shape(user)
    assert user["email"] == email
    assert user["onboardingComplete"] is False
    assert isinstance(user["profile"], dict)


async def test_resident_select_role_transitions_user_to_resident_role(client):
    email = f"p161-select-{uuid.uuid4().hex[:8]}@emappa.test"
    token, _ = await _verify_otp(client, email)
    r = await client.post(
        "/me/select-role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "resident", "displayName": "Test Resident"},
    )
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    _assert_user_shape(user)
    assert user["role"] == "resident"
    assert user["displayName"] == "Test Resident"
    assert user["onboardingComplete"] is False, (
        "select-role must NOT mark onboarding complete (multi-step flow)"
    )


async def test_resident_onboarding_complete_sets_flag_and_merges_profile(client):
    email = f"p161-onb-{uuid.uuid4().hex[:8]}@emappa.test"
    token, _ = await _verify_otp(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: pick role.
    r = await client.post(
        "/me/select-role",
        headers=headers,
        json={"role": "resident"},
    )
    assert r.status_code == 200

    # Step 2: complete onboarding with a profile bag.
    r = await client.post(
        "/me/onboarding-complete",
        headers=headers,
        json={
            "displayName": "Alice Resident",
            "profile": {
                "preferredContactMethod": "email",
                "notificationsEnabled": True,
            },
        },
    )
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    _assert_user_shape(user)
    assert user["role"] == "resident"
    assert user["onboardingComplete"] is True
    assert user["displayName"] == "Alice Resident"
    assert user["profile"]["preferredContactMethod"] == "email"
    assert user["profile"]["notificationsEnabled"] is True


async def test_resident_join_building_links_user_to_seeded_building(client):
    email = f"p161-join-{uuid.uuid4().hex[:8]}@emappa.test"
    token, _ = await _verify_otp(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    await client.post("/me/select-role", headers=headers, json={"role": "resident"})

    r = await client.post(
        "/me/join-building",
        headers=headers,
        json={"code": SEEDED_INVITE_CODE},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "building" in body
    assert body["building"]["kind"] in ("apartment", "small_compound")
    assert "id" in body["building"]
    assert "name" in body["building"]
    assert "unitCount" in body["building"]


async def test_join_building_writes_audit_row(client):
    """CR-2 — every mutation must produce an audit row.

    This endpoint pre-dates the log_mutation helper and uses the legacy
    log_event call. We assert the row lands; upgrading to log_mutation
    with a reason field is queued for the audit-middleware adoption pass.
    """
    email = f"p161-audit-{uuid.uuid4().hex[:8]}@emappa.test"
    token, user = await _verify_otp(client, email)
    headers = {"Authorization": f"Bearer {token}"}
    user_id = uuid.UUID(user["id"])

    await client.post("/me/select-role", headers=headers, json={"role": "resident"})
    r = await client.post(
        "/me/join-building", headers=headers, json={"code": SEEDED_INVITE_CODE}
    )
    assert r.status_code == 200

    async with engine.begin() as conn:
        result = await conn.execute(
            text(
                "SELECT count(*) FROM audit_log "
                "WHERE action = 'me.join-building' AND actor_user_id = :u"
            ),
            {"u": user_id},
        )
        assert int(result.scalar_one()) >= 1


async def test_join_building_with_invalid_code_returns_404(client):
    email = f"p161-bad-{uuid.uuid4().hex[:8]}@emappa.test"
    token, _ = await _verify_otp(client, email)
    headers = {"Authorization": f"Bearer {token}"}
    await client.post("/me/select-role", headers=headers, json={"role": "resident"})
    r = await client.post(
        "/me/join-building", headers=headers, json={"code": "NOPE99"}
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "invite_code_not_found"


async def test_select_role_admin_returns_403(client):
    """P9.1.12 doctrine guard — admin never publicly assignable."""
    email = f"p161-admin-{uuid.uuid4().hex[:8]}@emappa.test"
    token, _ = await _verify_otp(client, email)
    r = await client.post(
        "/me/select-role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "admin"},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "admin_role_forbidden"


async def test_onboarding_complete_admin_returns_403(client):
    """Same doctrine guard on the second endpoint."""
    email = f"p161-admin2-{uuid.uuid4().hex[:8]}@emappa.test"
    token, _ = await _verify_otp(client, email)
    r = await client.post(
        "/me/onboarding-complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "admin"},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "admin_onboarding_forbidden"
