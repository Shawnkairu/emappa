"""P0.3.10-12 — apartment_ats_state + capacity_queue + load_profile repos."""
from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db.session import SessionLocal, engine
from app.models.ats import ApartmentAtsState
from app.models.capacity_queue import CapacityQueue
from app.models.load_profile import LoadProfile
from app.repos import ats as ats_repo
from app.repos import capacity_queue as queue_repo
from app.repos import load_profile as lp_repo


async def _insert_building() -> uuid.UUID:
    new_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO buildings (id, name, address, lat, lon, unit_count, "
                "kind, stage, data_source) "
                "VALUES (:id, :name, :addr, 0.0, 0.0, 1, 'apartment', 'listed', "
                "'synthetic')"
            ),
            {"id": new_id, "name": f"scen-a-{new_id}", "addr": "test"},
        )
    return new_id


async def _insert_user(role: str = "resident") -> uuid.UUID:
    new_id = uuid.uuid4()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, email, role, onboarding_complete) "
                "VALUES (:id, :email, :role, true)"
            ),
            {"id": new_id, "email": f"scen-a-{new_id}@emappa.test", "role": role},
        )
    return new_id


# ---- apartment_ats_state ----------------------------------------------------

async def test_ats_upsert_creates_then_no_op_on_same_state():
    bld = await _insert_building()
    async with SessionLocal() as session:
        first = await ats_repo.upsert(
            session,
            building_id=bld,
            apartment_label="Apt 3B",
            state="installed_not_activated",
            reason="post-install",
        )
        await session.commit()
        first_transition = first.last_transition_at

    async with SessionLocal() as session:
        # Same state → no transition timestamp bump.
        second = await ats_repo.upsert(
            session,
            building_id=bld,
            apartment_label="Apt 3B",
            state="installed_not_activated",
        )
        await session.commit()
    assert second.id == first.id
    assert second.last_transition_at == first_transition


async def test_ats_upsert_transitions_records_reason():
    bld = await _insert_building()
    async with SessionLocal() as session:
        await ats_repo.upsert(
            session,
            building_id=bld,
            apartment_label="Apt 5A",
            state="installed_not_activated",
        )
        await session.commit()

    async with SessionLocal() as session:
        updated = await ats_repo.upsert(
            session,
            building_id=bld,
            apartment_label="Apt 5A",
            state="active_solar",
            reason="capacity cleared",
        )
        await session.commit()
    assert updated.state == "active_solar"
    assert updated.last_transition_reason == "capacity cleared"


async def test_ats_invalid_state_rejected_by_check():
    bld = await _insert_building()
    async with SessionLocal() as session:
        session.add(
            ApartmentAtsState(
                building_id=bld, apartment_label="X", state="bogus_state"
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_ats_unique_per_building_apartment_pair():
    bld = await _insert_building()
    async with SessionLocal() as session:
        await ats_repo.upsert(
            session, building_id=bld, apartment_label="Apt 1", state="pre_install"
        )
        await session.commit()
    async with SessionLocal() as session:
        # Same label — the unique constraint forces upsert path, no dupe.
        session.add(
            ApartmentAtsState(
                building_id=bld, apartment_label="Apt 1", state="active_solar"
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


# ---- capacity_queue ---------------------------------------------------------

async def test_capacity_queue_join_assigns_sequential_positions():
    bld = await _insert_building()
    u1 = await _insert_user()
    u2 = await _insert_user()
    async with SessionLocal() as session:
        r1 = await queue_repo.join(
            session,
            building_id=bld,
            user_id=u1,
            priority_factors=["pledge_amount", "early_signup"],
        )
        r2 = await queue_repo.join(
            session,
            building_id=bld,
            user_id=u2,
            priority_factors=["geographic_cluster"],
        )
        await session.commit()
    assert r1.position == 1
    assert r2.position == 2


async def test_capacity_queue_join_is_idempotent_per_user():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        first = await queue_repo.join(session, building_id=bld, user_id=user)
        await session.commit()
    async with SessionLocal() as session:
        again = await queue_repo.join(session, building_id=bld, user_id=user)
        await session.commit()
    assert first.id == again.id


async def test_capacity_queue_join_rejects_unknown_priority_factor():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="unknown priority factor"):
            await queue_repo.join(
                session,
                building_id=bld,
                user_id=user,
                priority_factors=["pledge_amount", "made_up_one"],
            )


async def test_capacity_queue_advance_stamps_timestamps():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        entry = await queue_repo.join(session, building_id=bld, user_id=user)
        await session.commit()
        eid = entry.id

    async with SessionLocal() as session:
        cleared = await queue_repo.advance_status(
            session, queue_id=eid, status="capacity_cleared"
        )
        await session.commit()
    assert cleared.cleared_at is not None
    assert cleared.activated_at is None

    async with SessionLocal() as session:
        activated = await queue_repo.advance_status(
            session, queue_id=eid, status="activated"
        )
        await session.commit()
    assert activated.activated_at is not None


async def test_capacity_queue_invalid_status_rejected_by_check():
    bld = await _insert_building()
    user = await _insert_user()
    async with SessionLocal() as session:
        session.add(
            CapacityQueue(
                building_id=bld, user_id=user, status="not_a_state", position=1
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


# ---- load_profile -----------------------------------------------------------

async def test_load_profile_capture_persists_decimals_and_appliances():
    user = await _insert_user()
    async with SessionLocal() as session:
        row = await lp_repo.capture(
            session,
            user_id=user,
            level="L1",
            appliances=[{"name": "lighting", "watts": 60, "hours_per_day": 5}],
            daytime_kwh=2.5,
            evening_kwh=3.0,
            confidence=0.4,
        )
        await session.commit()
    assert row.level == "L1"
    assert row.appliances == [
        {"name": "lighting", "watts": 60, "hours_per_day": 5}
    ]
    assert row.confidence == Decimal("0.400")


async def test_load_profile_invalid_confidence_rejected_by_repo():
    user = await _insert_user()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="confidence"):
            await lp_repo.capture(
                session,
                user_id=user,
                level="L1",
                appliances=[],
                daytime_kwh=1,
                evening_kwh=1,
                confidence=1.5,
            )


async def test_load_profile_negative_kwh_rejected_by_repo():
    user = await _insert_user()
    async with SessionLocal() as session:
        with pytest.raises(ValueError, match="non-negative"):
            await lp_repo.capture(
                session,
                user_id=user,
                level="L1",
                appliances=[],
                daytime_kwh=-1,
                evening_kwh=1,
                confidence=0.5,
            )


async def test_load_profile_invalid_level_rejected_by_db():
    user = await _insert_user()
    async with SessionLocal() as session:
        session.add(
            LoadProfile(
                user_id=user,
                level="L4",
                appliances=[],
                daytime_kwh=Decimal("0"),
                evening_kwh=Decimal("0"),
                confidence=Decimal("0.5"),
            )
        )
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_load_profile_latest_returns_most_recent_capture():
    user = await _insert_user()
    async with SessionLocal() as session:
        await lp_repo.capture(
            session,
            user_id=user,
            level="L1",
            appliances=[],
            daytime_kwh=1,
            evening_kwh=1,
            confidence=0.3,
        )
        await session.commit()

    async with SessionLocal() as session:
        await lp_repo.capture(
            session,
            user_id=user,
            level="L2",
            appliances=[{"name": "fridge", "watts": 150, "hours_per_day": 24}],
            daytime_kwh=4,
            evening_kwh=2,
            confidence=0.7,
        )
        await session.commit()

    async with SessionLocal() as session:
        latest = await lp_repo.latest_for_user(session, user_id=user)
        history = await lp_repo.history_for_user(session, user_id=user)
    assert latest.level == "L2"
    assert len(history) == 2
    assert history[0].level == "L2"
    assert history[1].level == "L1"
