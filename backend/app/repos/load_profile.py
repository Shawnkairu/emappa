"""load_profile repository — capture + latest-for-user.

We keep every capture (immutable history); `latest_for_user` returns the
most recent row. Editing means appending a new row, not UPDATEing.
"""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.load_profile import LoadProfile

LoadLevel = Literal["L1", "L2", "L3"]


async def capture(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    level: LoadLevel,
    appliances: list[dict[str, Any]],
    daytime_kwh: float | Decimal,
    evening_kwh: float | Decimal,
    confidence: float | Decimal,
    receipt_url: str | None = None,
) -> LoadProfile:
    if not 0 <= float(confidence) <= 1:
        raise ValueError("confidence must be in [0, 1]")
    if float(daytime_kwh) < 0 or float(evening_kwh) < 0:
        raise ValueError("kwh values must be non-negative")
    row = LoadProfile(
        user_id=user_id,
        level=level,
        appliances=appliances,
        daytime_kwh=Decimal(str(daytime_kwh)),
        evening_kwh=Decimal(str(evening_kwh)),
        confidence=Decimal(str(confidence)),
        receipt_url=receipt_url,
    )
    session.add(row)
    await session.flush()
    return row


async def latest_for_user(
    session: AsyncSession, *, user_id: uuid.UUID
) -> LoadProfile | None:
    stmt = (
        select(LoadProfile)
        .where(LoadProfile.user_id == user_id)
        .order_by(LoadProfile.captured_at.desc())
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def history_for_user(
    session: AsyncSession, *, user_id: uuid.UUID
) -> list[LoadProfile]:
    stmt = (
        select(LoadProfile)
        .where(LoadProfile.user_id == user_id)
        .order_by(LoadProfile.captured_at.desc())
    )
    return list((await session.execute(stmt)).scalars().all())
