"""P0.3.5 — `require_pii_view` dependency integration tests.

Mounts a tiny FastAPI router that uses the dependency, drives requests through
the real auth stack (verify-otp → JWT → user fetch), and asserts:

- grant: 200 + audit row with granted=True
- deny no claim: 403 + audit row with granted=False, reason='no_pii_claim'
- deny financial without step-up: 403 + audit row reason='step_up_required'

Each test uses a uuid-suffixed email so runs never collide with prior test
state. We deliberately do NOT clean up the user row — audit_log immutability
(migration 0003) prevents nulling the actor_user_id FK, and the audit-count
queries are scoped to each test's freshly-minted user_id so accumulation
across runs is harmless.
"""
from __future__ import annotations

import uuid

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.db.session import SessionLocal, engine
from app.middleware.pii import require_pii_view
from app.repos import rbac as rbac_repo


def _make_app() -> FastAPI:
    from app.main import app as real_app

    sub = FastAPI()

    @sub.get("/__test/contact")
    async def unmask_contact(user=Depends(require_pii_view("contact"))):
        return {"ok": True, "user_id": str(user.id)}

    @sub.get("/__test/financial")
    async def unmask_financial(user=Depends(require_pii_view("financial"))):
        return {"ok": True, "user_id": str(user.id)}

    real_app.include_router(sub.router)
    return real_app


@pytest.fixture
async def pii_client():
    app = _make_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


def _unique_email(label: str) -> str:
    return f"pii-{label}-{uuid.uuid4().hex[:8]}@emappa.test"


async def _admin_token(pii_client: AsyncClient, email: str) -> tuple[str, uuid.UUID]:
    r = await pii_client.post(
        "/auth/verify-otp", json={"email": email, "code": "000000"}
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    user_id = uuid.UUID(r.json()["user"]["id"])

    # Promote to admin so the dependency picks up an actor with FK target.
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE users SET role='admin' WHERE id=:id"), {"id": user_id}
        )
    return token, user_id


async def _audit_count_for_action(action: str, user_id: uuid.UUID) -> int:
    async with engine.begin() as conn:
        row = await conn.execute(
            text(
                "SELECT count(*) FROM audit_log "
                "WHERE action = :a AND actor_user_id = :u"
            ),
            {"a": action, "u": user_id},
        )
        return int(row.scalar_one())


async def test_contact_unmask_denied_without_claim_writes_audit(pii_client):
    email = _unique_email("deny")
    token, user_id = await _admin_token(pii_client, email)

    r = await pii_client.get(
        "/__test/contact", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 403
    detail = r.json()["detail"]
    assert detail["error"] == "pii_view_denied"
    assert detail["reason"] == "no_pii_claim"

    assert await _audit_count_for_action("pii:unmask:contact", user_id) == 1


async def test_contact_unmask_granted_with_active_claim_writes_audit(pii_client):
    email = _unique_email("grant")
    token, user_id = await _admin_token(pii_client, email)

    async with SessionLocal() as session:
        await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=str(user_id),
            scope="pii:view:contact",
            granted_by=user_id,
            reason="self-test",
            ttl_seconds=28800,
        )
        await session.commit()

    r = await pii_client.get(
        "/__test/contact", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True

    assert await _audit_count_for_action("pii:unmask:contact", user_id) == 1


async def test_financial_unmask_without_step_up_denied_even_with_claim(pii_client):
    email = _unique_email("fin")
    token, user_id = await _admin_token(pii_client, email)

    async with SessionLocal() as session:
        await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=str(user_id),
            scope="pii:view:financial",
            granted_by=user_id,
            reason="payout review",
            ttl_seconds=3600,
            incident_id="INC-test",
        )
        await session.commit()

    r = await pii_client.get(
        "/__test/financial", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 403
    assert r.json()["detail"]["reason"] == "step_up_required"

    assert await _audit_count_for_action("pii:unmask:financial", user_id) == 1
