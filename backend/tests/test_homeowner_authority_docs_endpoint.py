"""P2.6.1 — POST /homeowner/{user_id}/authority-docs endpoint.

Covers:
- Happy path: homeowner self-submits with title only → 201, row persisted,
  audit row written with reason
- Variants: lease only / owner_authorization only also accepted
- Bad input: no ownership-proof field → 422 (pydantic model_validator)
- Bad input: missing `reason` → 400 (middleware AUDIT_REQUIRED_PATHS)
- Scope: resident-role user cannot submit → 403
- Scope: homeowner cannot submit on behalf of another homeowner → 403
  (not_your_resource)
- Admin can submit on behalf of any homeowner → 201
- Invalid user_id path param → 400
"""
from __future__ import annotations

import uuid

from httpx import AsyncClient
from sqlalchemy import text

from app.db.session import engine


async def _login(client: AsyncClient, role: str) -> tuple[str, uuid.UUID]:
    email = f"p261-{role}-{uuid.uuid4().hex[:8]}@emappa.test"
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


# ---- happy path ------------------------------------------------------------


async def test_homeowner_self_submits_title_only(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/authority-docs",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "titleUrl": "s3://docs/title.pdf",
            "reason": "initial authority verification",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()["authority"]
    assert body["titleUrl"] == "s3://docs/title.pdf"
    assert body["status"] == "pending"
    assert body["reviewedAt"] is None


async def test_homeowner_submits_lease_only(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/authority-docs",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "leaseUrl": "s3://docs/lease.pdf",
            "reason": "rental authority",
        },
    )
    assert r.status_code == 201
    assert r.json()["authority"]["leaseUrl"] == "s3://docs/lease.pdf"


async def test_homeowner_submits_owner_authorization_only(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/authority-docs",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "ownerAuthorizationUrl": "s3://docs/owner-authz.pdf",
            "reason": "managing on owner's behalf",
        },
    )
    assert r.status_code == 201
    assert r.json()["authority"]["ownerAuthorizationUrl"] == "s3://docs/owner-authz.pdf"


async def test_homeowner_submits_all_supporting_docs(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/authority-docs",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "titleUrl": "s3://t.pdf",
            "utilityAccountEvidenceUrl": "s3://u.pdf",
            "nationalIdUrl": "s3://n.pdf",
            "siteInspectionConsentUrl": "s3://c.pdf",
            "reason": "full submission",
        },
    )
    assert r.status_code == 201
    body = r.json()["authority"]
    assert body["titleUrl"] and body["nationalIdUrl"] and body["siteInspectionConsentUrl"]


# ---- audit row -------------------------------------------------------------


async def test_submission_writes_audit_row(client):
    token, user_id = await _login(client, role="homeowner")
    await client.post(
        f"/homeowner/{user_id}/authority-docs",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "titleUrl": "s3://docs/title.pdf",
            "reason": "audit-trail-check reason",
        },
    )
    async with engine.begin() as conn:
        row = (
            await conn.execute(
                text(
                    "SELECT reason FROM audit_log WHERE action = "
                    "'homeowner.authority_docs.submit' "
                    "AND actor_user_id = :u ORDER BY at DESC LIMIT 1"
                ),
                {"u": user_id},
            )
        ).scalar_one()
    assert row == "audit-trail-check reason"


# ---- bad input -------------------------------------------------------------


async def test_no_ownership_proof_rejected_at_pydantic(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/authority-docs",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "utilityAccountEvidenceUrl": "s3://u.pdf",
            "nationalIdUrl": "s3://n.pdf",
            "reason": "missing ownership proof",
        },
    )
    assert r.status_code == 422
    # The pydantic validator surfaces the field name in the error envelope.
    assert "title" in r.text and "lease" in r.text and "owner_authorization" in r.text


async def test_missing_reason_rejected_at_middleware(client):
    token, user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{user_id}/authority-docs",
        headers={"Authorization": f"Bearer {token}"},
        json={"titleUrl": "s3://t.pdf"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "audit_reason_required"


async def test_invalid_user_id_path_returns_400(client):
    token, _ = await _login(client, role="homeowner")
    r = await client.post(
        "/homeowner/not-a-uuid/authority-docs",
        headers={"Authorization": f"Bearer {token}"},
        json={"titleUrl": "s3://t.pdf", "reason": "x"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "invalid_user_id"


# ---- scope -----------------------------------------------------------------


async def test_resident_role_cannot_submit_even_for_self(client):
    token, user_id = await _login(client, role="resident")
    r = await client.post(
        f"/homeowner/{user_id}/authority-docs",
        headers={"Authorization": f"Bearer {token}"},
        json={"titleUrl": "s3://t.pdf", "reason": "resident trying"},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "only_homeowners_or_admins"


async def test_homeowner_cannot_submit_for_another_homeowner(client):
    t1, _ = await _login(client, role="homeowner")
    _, other_user_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{other_user_id}/authority-docs",
        headers={"Authorization": f"Bearer {t1}"},
        json={"titleUrl": "s3://t.pdf", "reason": "stranger"},
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "not_your_resource"


async def test_admin_can_submit_on_behalf_of_homeowner(client):
    admin_token, _ = await _login(client, role="admin")
    _, ho_id = await _login(client, role="homeowner")
    r = await client.post(
        f"/homeowner/{ho_id}/authority-docs",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "titleUrl": "s3://docs/admin-uploaded.pdf",
            "reason": "admin manual submission for HO",
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["authority"]["userId"] == str(ho_id)
