"""apartment_ats_state repository — get/upsert/transition."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.ats import ApartmentAtsState

AtsState = Literal[
    "pre_install",
    "installed_not_activated",
    "active_solar",
    "active_kplc",
    "throttled",
    "isolated",
    "fault",
    "suspended",
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def get_for_apartment(
    session: AsyncSession,
    *,
    building_id: uuid.UUID,
    apartment_label: str,
) -> ApartmentAtsState | None:
    stmt = (
        select(ApartmentAtsState)
        .where(ApartmentAtsState.building_id == building_id)
        .where(ApartmentAtsState.apartment_label == apartment_label)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def upsert(
    session: AsyncSession,
    *,
    building_id: uuid.UUID,
    apartment_label: str,
    state: AtsState,
    reason: str | None = None,
) -> ApartmentAtsState:
    existing = await get_for_apartment(
        session, building_id=building_id, apartment_label=apartment_label
    )
    now = _now()
    if existing is None:
        row = ApartmentAtsState(
            building_id=building_id,
            apartment_label=apartment_label,
            state=state,
            last_transition_reason=reason,
            last_transition_at=now,
            updated_at=now,
        )
        session.add(row)
    else:
        if existing.state != state:
            existing.state = state
            existing.last_transition_reason = reason
            existing.last_transition_at = now
        existing.updated_at = now
        row = existing
    await session.flush()
    return row


async def list_for_building(
    session: AsyncSession, *, building_id: uuid.UUID
) -> list[ApartmentAtsState]:
    stmt = (
        select(ApartmentAtsState)
        .where(ApartmentAtsState.building_id == building_id)
        .order_by(ApartmentAtsState.apartment_label)
    )
    return list((await session.execute(stmt)).scalars().all())
