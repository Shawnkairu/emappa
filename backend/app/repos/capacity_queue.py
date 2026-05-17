"""capacity_queue repository — join/list/transition."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.capacity_queue import CapacityQueue

QueueStatus = Literal[
    "interested",
    "pledged",
    "capacity_review",
    "capacity_cleared",
    "queued",
    "waitlisted",
    "activated",
]

PRIORITY_FACTORS: frozenset[str] = frozenset(
    {"pledge_amount", "load_profile_fit", "early_signup", "geographic_cluster"}
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def next_position(session: AsyncSession, *, building_id: uuid.UUID) -> int:
    """Returns position to assign to a new joiner (1-based, append-to-tail)."""
    stmt = select(func.coalesce(func.max(CapacityQueue.position), 0)).where(
        CapacityQueue.building_id == building_id
    )
    current = (await session.execute(stmt)).scalar_one()
    return int(current) + 1


async def join(
    session: AsyncSession,
    *,
    building_id: uuid.UUID,
    user_id: uuid.UUID,
    priority_factors: list[str] | None = None,
) -> CapacityQueue:
    """Insert a new queue entry. Idempotent on (building_id, user_id)."""
    factors = list(priority_factors or [])
    unknown = [f for f in factors if f not in PRIORITY_FACTORS]
    if unknown:
        raise ValueError(f"unknown priority factor(s): {unknown}")

    stmt = (
        select(CapacityQueue)
        .where(CapacityQueue.building_id == building_id)
        .where(CapacityQueue.user_id == user_id)
    )
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing is not None:
        return existing

    position = await next_position(session, building_id=building_id)
    row = CapacityQueue(
        building_id=building_id,
        user_id=user_id,
        position=position,
        priority_factors=factors,
    )
    session.add(row)
    await session.flush()
    return row


async def advance_status(
    session: AsyncSession,
    *,
    queue_id: uuid.UUID,
    status: QueueStatus,
) -> CapacityQueue | None:
    row = await session.get(CapacityQueue, queue_id)
    if row is None:
        return None
    row.status = status
    now = _now()
    if status == "capacity_cleared" and row.cleared_at is None:
        row.cleared_at = now
    if status == "activated" and row.activated_at is None:
        row.activated_at = now
    await session.flush()
    return row


async def list_for_building(
    session: AsyncSession, *, building_id: uuid.UUID
) -> list[CapacityQueue]:
    stmt = (
        select(CapacityQueue)
        .where(CapacityQueue.building_id == building_id)
        .order_by(CapacityQueue.position)
    )
    return list((await session.execute(stmt)).scalars().all())


async def position_for_user(
    session: AsyncSession, *, building_id: uuid.UUID, user_id: uuid.UUID
) -> CapacityQueue | None:
    stmt = (
        select(CapacityQueue)
        .where(CapacityQueue.building_id == building_id)
        .where(CapacityQueue.user_id == user_id)
    )
    return (await session.execute(stmt)).scalar_one_or_none()
