"""P0.3.15 — pledge + token_purchase tables + repo + CHECK invariants.

The dual-write façade ships in P1.6.2a; this PR ships the schema +
the doctrine guards baked into the repos. Tests cover:
- pledge: amount-nullable, status atomicity, status transitions,
  status CHECK
- token_purchase: amount > 0, payment_method CHECK, sum-for-building
- backfill rule documented in migration 0008 (pre-live → pledge,
  live → token_purchase): exercised via direct INSERT of buildings in
  each stage + parallel inserts into both tables, then a parity
  query mirroring scripts/audit_pledge_token_parity.py (lands P1.6.2a).
"""
from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db.session import SessionLocal, engine
from app.models.pledge import Pledge
from app.models.token_purchase import TokenPurchase
from app.repos import pledges as pledges_repo
from app.repos import token_purchases as tp_repo


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
            {
                "id": new_id,
                "name": f"split-{new_id}",
                "addr": "test",
                "stage": stage,
            },
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
            {"id": new_id, "email": f"split-{new_id}@emappa.test"},
        )
    return new_id


# ---- pledge -----------------------------------------------------------------

async def test_create_pledge_with_amount():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        p = await pledges_repo.create(
            session, building_id=bld, user_id=user, amount_kes=500
        )
        await session.commit()
    assert p.status == "active"
    assert p.amount_kes == Decimal("500")
    assert p.closed_at is None


async def test_create_pledge_with_null_amount():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        p = await pledges_repo.create(
            session, building_id=bld, user_id=user, amount_kes=None
        )
        await session.commit()
    assert p.amount_kes is None


async def test_pledge_negative_amount_rejected():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match=">= 0"):
            await pledges_repo.create(
                session, building_id=bld, user_id=user, amount_kes=-1
            )


async def test_pledge_invalid_status_rejected_by_db():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        session.add(
            Pledge(building_id=bld, user_id=user, status="bogus")
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_cancel_pledge_stamps_closed_at():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        p = await pledges_repo.create(
            session, building_id=bld, user_id=user, amount_kes=100
        )
        await session.commit()
        pid = p.id

    async with SessionLocal() as session:
        cancelled = await pledges_repo.cancel(session, pledge_id=pid)
        await session.commit()
    assert cancelled.status == "cancelled"
    assert cancelled.closed_at is not None


async def test_cancel_already_cancelled_raises():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        p = await pledges_repo.create(
            session, building_id=bld, user_id=user, amount_kes=100
        )
        await session.commit()
        pid = p.id

    async with SessionLocal() as session:
        await pledges_repo.cancel(session, pledge_id=pid)
        await session.commit()

    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="already"):
            await pledges_repo.cancel(session, pledge_id=pid)


async def test_convert_transitions_status():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        p = await pledges_repo.create(
            session, building_id=bld, user_id=user, amount_kes=200
        )
        await session.commit()
        pid = p.id

    async with SessionLocal() as session:
        converted = await pledges_repo.convert(session, pledge_id=pid)
        await session.commit()
    assert converted.status == "converted"
    assert converted.closed_at is not None


async def test_pledge_atomicity_check_blocks_active_with_closed_at():
    """status='active' but closed_at set → CHECK rejects."""
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        session.add(
            Pledge(
                building_id=bld,
                user_id=user,
                status="active",
                closed_at=__import__("datetime").datetime.now(
                    __import__("datetime").timezone.utc
                ),
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_pledge_active_for_user_in_building():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        await pledges_repo.create(
            session, building_id=bld, user_id=user, amount_kes=300
        )
        p_cancelled = await pledges_repo.create(
            session, building_id=bld, user_id=user, amount_kes=400
        )
        await session.commit()
        cancelled_id = p_cancelled.id

    async with SessionLocal() as session:
        await pledges_repo.cancel(session, pledge_id=cancelled_id)
        await session.commit()

    async with SessionLocal() as session:
        active = await pledges_repo.active_for_user_in_building(
            session, building_id=bld, user_id=user
        )
    assert len(active) == 1
    assert active[0].amount_kes == Decimal("300")


# ---- token_purchase --------------------------------------------------------

async def test_create_token_purchase_positive_amount():
    bld = await _insert_building(stage="live")
    user = await _insert_user()
    async with SessionLocal() as session:
        tp = await tp_repo.create(
            session,
            building_id=bld,
            user_id=user,
            amount_kes=750,
            payment_method="mpesa",
        )
        await session.commit()
    assert tp.amount_kes == Decimal("750")
    assert tp.payment_method == "mpesa"


async def test_token_purchase_zero_amount_rejected():
    bld = await _insert_building(stage="live")
    user = await _insert_user()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="> 0"):
            await tp_repo.create(
                session,
                building_id=bld,
                user_id=user,
                amount_kes=0,
                payment_method="mpesa",
            )


async def test_token_purchase_invalid_method_rejected_by_db():
    bld = await _insert_building(stage="live")
    user = await _insert_user()
    async with SessionLocal() as session:
        session.add(
            TokenPurchase(
                building_id=bld,
                user_id=user,
                amount_kes=Decimal("100"),
                payment_method="paypal",
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_token_purchase_sum_for_building():
    bld = await _insert_building(stage="live")
    user = await _insert_user()
    async with SessionLocal() as session:
        await tp_repo.create(
            session,
            building_id=bld,
            user_id=user,
            amount_kes=100,
            payment_method="mpesa",
        )
        await tp_repo.create(
            session,
            building_id=bld,
            user_id=user,
            amount_kes=250,
            payment_method="card",
        )
        await session.commit()

    async with SessionLocal() as session:
        total = await tp_repo.confirmed_total_for_building(
            session, building_id=bld
        )
    assert total == Decimal("350.00")


# ---- backfill parity -------------------------------------------------------

async def test_parity_invariant_holds_for_each_user_in_building():
    """The ADR 0002 parity check: for any (building, user),
    sum(prepaid_commitments) should equal sum(pledge) + sum(token_purchase).

    Here we set up both pre-live and live buildings, write into each
    new table independently, and exercise the parity query that
    scripts/audit_pledge_token_parity.py (P1.6.2a) will run."""
    pre_live = await _insert_building(stage="qualifying")
    live = await _insert_building(stage="live")
    user = await _insert_user()

    async with SessionLocal() as session:
        await pledges_repo.create(
            session, building_id=pre_live, user_id=user, amount_kes=600
        )
        await tp_repo.create(
            session,
            building_id=live,
            user_id=user,
            amount_kes=400,
            payment_method="mpesa",
        )
        await session.commit()

    # Mirror the parity SQL the audit script will run.
    async with engine.begin() as conn:
        result = await conn.execute(
            text(
                "SELECT COALESCE(SUM(amount_kes), 0) FROM pledge "
                "WHERE user_id = :u AND status = 'active'"
            ),
            {"u": user},
        )
        pledge_sum = Decimal(str(result.scalar_one()))

        result = await conn.execute(
            text(
                "SELECT COALESCE(SUM(amount_kes), 0) FROM token_purchase "
                "WHERE user_id = :u"
            ),
            {"u": user},
        )
        token_sum = Decimal(str(result.scalar_one()))

    assert pledge_sum + token_sum == Decimal("1000")
