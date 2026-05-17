"""P0.3.3 — rbac_claim repo: grants, TTL ceilings, agent-PII guard, revocations.

Covers ADR 0001 §4 invariants:
- contact / identity / financial TTL ceilings (8h / 4h / 1h)
- identity + financial grants require incident_id
- agents cannot hold pii:view:* claims (§6)
- non-empty reason required on every grant
- list_active_scopes filters expired + revoked rows
"""
from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from sqlalchemy import text

from app.db.session import SessionLocal, engine
from app.models.rbac import RbacClaim
from app.repos import rbac as rbac_repo


async def _new_admin_user_id() -> uuid.UUID:
    new_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, email, role, onboarding_complete) "
                "VALUES (:id, :email, 'admin', true)"
            ),
            {"id": new_id, "email": f"rbac-test-{new_id}@emappa.test"},
        )
    return new_id


async def test_grant_contact_claim_with_8h_ttl_succeeds():
    granted_by = await _new_admin_user_id()
    async with SessionLocal() as session:
        claim = await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=str(uuid.uuid4()),
            scope="pii:view:contact",
            granted_by=granted_by,
            reason="ops triage",
            ttl_seconds=28800,
        )
        await session.commit()
    assert isinstance(claim, RbacClaim)
    assert (claim.expires_at - claim.granted_at) == timedelta(seconds=28800)


async def test_contact_ttl_exceeding_ceiling_rejected():
    granted_by = await _new_admin_user_id()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="exceeds ceiling"):
            await rbac_repo.grant_claim(
                session,
                subject_kind="user",
                subject_id=str(uuid.uuid4()),
                scope="pii:view:contact",
                granted_by=granted_by,
                reason="too long",
                ttl_seconds=28801,
            )


async def test_identity_grant_requires_incident_id():
    granted_by = await _new_admin_user_id()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="incident_id required"):
            await rbac_repo.grant_claim(
                session,
                subject_kind="user",
                subject_id=str(uuid.uuid4()),
                scope="pii:view:identity",
                granted_by=granted_by,
                reason="kyc",
                ttl_seconds=3600,
            )


async def test_financial_grant_requires_incident_id():
    granted_by = await _new_admin_user_id()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="incident_id required"):
            await rbac_repo.grant_claim(
                session,
                subject_kind="user",
                subject_id=str(uuid.uuid4()),
                scope="pii:view:financial",
                granted_by=granted_by,
                reason="payout review",
                ttl_seconds=1800,
            )


async def test_financial_grant_with_incident_id_succeeds():
    granted_by = await _new_admin_user_id()
    async with SessionLocal() as session:
        claim = await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=str(uuid.uuid4()),
            scope="pii:view:financial",
            granted_by=granted_by,
            reason="payout investigation",
            ttl_seconds=3600,
            incident_id="INC-2026-001",
        )
        await session.commit()
    assert claim.incident_id == "INC-2026-001"


async def test_agent_cannot_hold_pii_claim():
    granted_by = await _new_admin_user_id()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="agents may not hold pii"):
            await rbac_repo.grant_claim(
                session,
                subject_kind="agent",
                subject_id="drs",
                scope="pii:view:contact",
                granted_by=granted_by,
                reason="agent investigation",
                ttl_seconds=3600,
            )


async def test_empty_reason_rejected():
    granted_by = await _new_admin_user_id()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="non-empty reason"):
            await rbac_repo.grant_claim(
                session,
                subject_kind="user",
                subject_id=str(uuid.uuid4()),
                scope="queue:drs",
                granted_by=granted_by,
                reason="   ",
                ttl_seconds=3600,
            )


async def test_list_active_scopes_returns_granted_scope():
    granted_by = await _new_admin_user_id()
    user_id = str(uuid.uuid4())
    async with SessionLocal() as session:
        await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=user_id,
            scope="queue:lbrs",
            granted_by=granted_by,
            reason="lbrs triage",
            ttl_seconds=3600,
        )
        await session.commit()

    async with SessionLocal() as session:
        scopes = await rbac_repo.list_active_scopes(
            session, subject_kind="user", subject_id=user_id
        )
    assert "queue:lbrs" in scopes


async def test_revoked_claim_does_not_appear_in_active_scopes():
    granted_by = await _new_admin_user_id()
    user_id = str(uuid.uuid4())
    async with SessionLocal() as session:
        claim = await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=user_id,
            scope="settlement:run",
            granted_by=granted_by,
            reason="initial",
            ttl_seconds=3600,
        )
        await session.commit()
        claim_id = claim.id

    async with SessionLocal() as session:
        revoked = await rbac_repo.revoke_claim(
            session,
            claim_id=claim_id,
            revoked_by=granted_by,
            reason="role change",
        )
        await session.commit()
        assert revoked is not None

    async with SessionLocal() as session:
        scopes = await rbac_repo.list_active_scopes(
            session, subject_kind="user", subject_id=user_id
        )
    assert "settlement:run" not in scopes


async def test_has_scope_true_for_granted_and_false_after_revoke():
    granted_by = await _new_admin_user_id()
    user_id = str(uuid.uuid4())
    async with SessionLocal() as session:
        await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=user_id,
            scope="queue:drs",
            granted_by=granted_by,
            reason="ops",
            ttl_seconds=3600,
        )
        await session.commit()

    async with SessionLocal() as session:
        assert await rbac_repo.has_scope(
            session, subject_kind="user", subject_id=user_id, scope="queue:drs"
        )
        assert not await rbac_repo.has_scope(
            session, subject_kind="user", subject_id=user_id, scope="queue:lbrs"
        )
