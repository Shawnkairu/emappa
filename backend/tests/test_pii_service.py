"""P0.3.5 — PII service unit tests.

Covers:
- class_for_field mapping (snake + camelCase)
- masking helpers (phone, email, id, account)
- check_claim decisions: granted, no_pii_claim, step_up_required,
  agent_blocked, and the financial freshness window
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from app.db.session import SessionLocal, engine
from app.repos import rbac as rbac_repo
from app.services import pii


# ---- field mapping ----------------------------------------------------------

@pytest.mark.parametrize(
    "field,expected",
    [
        ("phone", "contact"),
        ("email", "contact"),
        ("physicalAddress", "contact"),
        ("national_id", "identity"),
        ("nationalId", "identity"),
        ("passport", "identity"),
        ("mpesa_number", "financial"),
        ("payoutAccount", "financial"),
        ("tax_pin", "financial"),
        ("unrelated_field", None),
    ],
)
def test_class_for_field(field, expected):
    assert pii.class_for_field(field) == expected


# ---- masking ----------------------------------------------------------------

def test_mask_phone_keeps_last_4():
    assert pii.mask_phone("+254712345678") == "••• 5678"


def test_mask_phone_short_input():
    assert pii.mask_phone("123") == "•••"


def test_mask_email_keeps_first_char_and_domain():
    assert pii.mask_email("alice@example.com") == "a•••@example.com"


def test_mask_email_handles_short_local():
    assert pii.mask_email("a@example.com") == "•@example.com"


def test_mask_id_keeps_last_4():
    assert pii.mask_id("12345678") == "••• 5678"


def test_mask_account_keeps_last_4_digits():
    assert pii.mask_account("ACME-123456789") == "••••6789"


def test_mask_field_routes_to_correct_handler():
    assert pii.mask_field("email", "alice@x.io") == "a•••@x.io"
    assert pii.mask_field("payoutAccount", "ACME-99887766") == "••••7766"
    assert pii.mask_field("nationalId", "12345678") == "••• 5678"


def test_mask_field_passthrough_for_unknown_field():
    assert pii.mask_field("unrelated", "plain") == "plain"


# ---- policy oracle ----------------------------------------------------------

async def _new_admin_user() -> uuid.UUID:
    new_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, email, role, onboarding_complete) "
                "VALUES (:id, :email, 'admin', true)"
            ),
            {"id": new_id, "email": f"pii-svc-{new_id}@emappa.test"},
        )
    return new_id


async def test_check_claim_agent_always_blocked():
    async with SessionLocal() as session:
        decision = await pii.check_claim(
            session,
            subject_kind="agent",
            subject_id="drs",
            pii_class="contact",
        )
    assert not decision.allowed
    assert decision.reason == "agent_blocked"


async def test_check_claim_no_claim_returns_no_pii_claim():
    user_id = await _new_admin_user()
    async with SessionLocal() as session:
        decision = await pii.check_claim(
            session,
            subject_kind="user",
            subject_id=str(user_id),
            pii_class="contact",
        )
    assert not decision.allowed
    assert decision.reason == "no_pii_claim"


async def test_check_claim_contact_granted_when_active():
    admin = await _new_admin_user()
    target = uuid.uuid4()
    async with SessionLocal() as session:
        await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=str(target),
            scope="pii:view:contact",
            granted_by=admin,
            reason="ops triage",
            ttl_seconds=28800,
        )
        await session.commit()
    async with SessionLocal() as session:
        decision = await pii.check_claim(
            session,
            subject_kind="user",
            subject_id=str(target),
            pii_class="contact",
        )
    assert decision.allowed
    assert decision.reason == "granted"


async def test_check_claim_financial_without_step_up_denied():
    admin = await _new_admin_user()
    target = uuid.uuid4()
    async with SessionLocal() as session:
        await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=str(target),
            scope="pii:view:financial",
            granted_by=admin,
            reason="payout investigation",
            ttl_seconds=3600,
            incident_id="INC-1",
        )
        await session.commit()
    async with SessionLocal() as session:
        decision = await pii.check_claim(
            session,
            subject_kind="user",
            subject_id=str(target),
            pii_class="financial",
            step_up_verified_at=None,
        )
    assert not decision.allowed
    assert decision.reason == "step_up_required"


async def test_check_claim_financial_with_stale_step_up_denied():
    admin = await _new_admin_user()
    target = uuid.uuid4()
    async with SessionLocal() as session:
        await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=str(target),
            scope="pii:view:financial",
            granted_by=admin,
            reason="payout investigation",
            ttl_seconds=3600,
            incident_id="INC-2",
        )
        await session.commit()
    stale = datetime.now(timezone.utc) - timedelta(seconds=pii.STEP_UP_WINDOW_SECONDS + 1)
    async with SessionLocal() as session:
        decision = await pii.check_claim(
            session,
            subject_kind="user",
            subject_id=str(target),
            pii_class="financial",
            step_up_verified_at=stale,
        )
    assert not decision.allowed
    assert decision.reason == "step_up_required"


async def test_check_claim_financial_with_fresh_step_up_granted():
    admin = await _new_admin_user()
    target = uuid.uuid4()
    async with SessionLocal() as session:
        await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=str(target),
            scope="pii:view:financial",
            granted_by=admin,
            reason="payout investigation",
            ttl_seconds=3600,
            incident_id="INC-3",
        )
        await session.commit()
    fresh = datetime.now(timezone.utc) - timedelta(seconds=30)
    async with SessionLocal() as session:
        decision = await pii.check_claim(
            session,
            subject_kind="user",
            subject_id=str(target),
            pii_class="financial",
            step_up_verified_at=fresh,
        )
    assert decision.allowed
    assert decision.reason == "granted"
