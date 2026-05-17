"""pledge repository — create / list / cancel / convert.

Doctrine guards landed here in P0.3.15 so the dual-write façade in
P1.6.2a (and the eventual hard-cut endpoint in P1.6.2b) inherit them.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.pledge import Pledge

PledgeStatus = Literal["active", "cancelled", "converted"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create(
    session: AsyncSession,
    *,
    building_id: uuid.UUID,
    user_id: uuid.UUID,
    amount_kes: Decimal | float | None,
) -> Pledge:
    if amount_kes is not None and float(amount_kes) < 0:
        raise ValueError("pledge amount must be >= 0 or None")
    row = Pledge(
        building_id=building_id,
        user_id=user_id,
        amount_kes=Decimal(str(amount_kes)) if amount_kes is not None else None,
    )
    session.add(row)
    await session.flush()
    return row


async def cancel(
    session: AsyncSession, *, pledge_id: uuid.UUID
) -> Pledge | None:
    row = await session.get(Pledge, pledge_id)
    if row is None:
        return None
    if row.status != "active":
        raise ValueError(f"pledge {pledge_id} already {row.status!r}")
    row.status = "cancelled"
    row.closed_at = _now()
    await session.flush()
    return row


async def convert(
    session: AsyncSession, *, pledge_id: uuid.UUID
) -> Pledge | None:
    """Mark as converted when the building goes live and the resident's
    intent becomes a token purchase. Doctrine: never directly editable
    post-conversion."""
    row = await session.get(Pledge, pledge_id)
    if row is None:
        return None
    if row.status != "active":
        raise ValueError(f"pledge {pledge_id} already {row.status!r}")
    row.status = "converted"
    row.closed_at = _now()
    await session.flush()
    return row


async def active_for_user_in_building(
    session: AsyncSession, *, building_id: uuid.UUID, user_id: uuid.UUID
) -> list[Pledge]:
    stmt = (
        select(Pledge)
        .where(Pledge.building_id == building_id)
        .where(Pledge.user_id == user_id)
        .where(Pledge.status == "active")
        .order_by(Pledge.created_at.desc())
    )
    return list((await session.execute(stmt)).scalars().all())
