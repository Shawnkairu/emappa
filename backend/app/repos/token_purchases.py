"""token_purchase repository — create-only (immutable per ADR 0002)."""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.token_purchase import TokenPurchase

PaymentMethod = Literal["mpesa", "card", "bank"]


async def create(
    session: AsyncSession,
    *,
    building_id: uuid.UUID,
    user_id: uuid.UUID,
    amount_kes: Decimal | float,
    payment_method: PaymentMethod,
) -> TokenPurchase:
    amount = Decimal(str(amount_kes))
    if amount <= 0:
        raise ValueError("token_purchase amount must be > 0")
    row = TokenPurchase(
        building_id=building_id,
        user_id=user_id,
        amount_kes=amount,
        payment_method=payment_method,
    )
    session.add(row)
    await session.flush()
    return row


async def confirmed_total_for_building(
    session: AsyncSession, *, building_id: uuid.UUID
) -> Decimal:
    stmt = select(func.coalesce(func.sum(TokenPurchase.amount_kes), 0)).where(
        TokenPurchase.building_id == building_id
    )
    return Decimal(str((await session.execute(stmt)).scalar_one()))


async def history_for_user(
    session: AsyncSession, *, user_id: uuid.UUID
) -> list[TokenPurchase]:
    stmt = (
        select(TokenPurchase)
        .where(TokenPurchase.user_id == user_id)
        .order_by(TokenPurchase.created_at.desc())
    )
    return list((await session.execute(stmt)).scalars().all())
