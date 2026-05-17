"""POST /tokens/purchase + GET /tokens/building/{id} — ADR 0002 PR 1 (endpoint half).

Token purchases are real money, post-activation, IMMUTABLE on creation.
Scenario A §5 doctrine:
- amount is REQUIRED, must be > 0
- only legal when building.stage == 'live' AND capacity_status == 'cleared'
- no cancellation (refunds are separate ledger entries, not in scope here)

Doctrine guards (P9.1.5 + P9.1.6 CI gates):
- 409 if building.stage != 'live' (pre-activation; use POST /pledges)
- 409 if user has no capacity_queue entry with status='capacity_cleared'
- 403 if resident/homeowner purchases for a building that isn't theirs
- 400 if amount <= 0 or payment_method invalid
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal

from ..db.session import get_session
from ..middleware.jwt import get_current_user
from ..models.capacity_queue import CapacityQueue
from ..models.token_purchase import TokenPurchase
from ..models.user import User
from ..repos import audit as audit_repo
from ..repos import buildings as buildings_repo
from ..repos import token_purchases as tp_repo

router = APIRouter(prefix="/tokens", tags=["tokens"])


def _serialize(tp: TokenPurchase) -> dict:
    return {
        "id": str(tp.id),
        "buildingId": str(tp.building_id),
        "userId": str(tp.user_id),
        "amountKes": float(tp.amount_kes),
        "paymentMethod": tp.payment_method,
        "createdAt": (tp.created_at or datetime.utcnow()).isoformat(),
    }


class PurchaseBody(BaseModel):
    building_id: str = Field(alias="buildingId")
    amount_kes: float = Field(alias="amountKes", gt=0)
    payment_method: Literal["mpesa", "card", "bank"] = Field(alias="paymentMethod")
    reason: str = Field(min_length=1, description="Free-text reason for audit (CR-2)")

    model_config = ConfigDict(populate_by_name=True)


async def _user_capacity_cleared(
    session: AsyncSession, *, user_id: uuid.UUID, building_id: uuid.UUID
) -> bool:
    stmt = (
        select(CapacityQueue)
        .where(CapacityQueue.building_id == building_id)
        .where(CapacityQueue.user_id == user_id)
        .where(CapacityQueue.status.in_(("capacity_cleared", "activated")))
    )
    return (await session.execute(stmt)).scalar_one_or_none() is not None


@router.post("/purchase", status_code=status.HTTP_201_CREATED)
async def purchase(
    body: PurchaseBody,
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        building_id = uuid.UUID(body.building_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_building_id")

    building = await buildings_repo.get(session, building_id)
    if building is None:
        raise HTTPException(status_code=404, detail="building_not_found")

    # Doctrine: token purchase only post-activation (Scenario A §5, P9.1.6 gate).
    if building.stage != "live":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="token_purchase_pre_activation_forbidden",
        )

    # Scope: residents + homeowners only buy for their own building.
    if user.role in {"resident", "homeowner"} and user.building_id != building_id:
        raise HTTPException(status_code=403, detail="not_your_building")

    # Doctrine: capacity-cleared prereq (Scenario A §6 + §5, P9.1.5 CI gate).
    cleared = await _user_capacity_cleared(
        session, user_id=user.id, building_id=building_id
    )
    if not cleared:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="capacity_not_cleared",
        )

    tp = await tp_repo.create(
        session,
        building_id=building_id,
        user_id=user.id,
        amount_kes=body.amount_kes,
        payment_method=body.payment_method,
    )
    await audit_repo.log_mutation(
        session,
        actor_user_id=user.id,
        actor_kind="user",
        action="token.purchase",
        target_type="token_purchase",
        target_id=str(tp.id),
        before=None,
        after={
            "building_id": str(building_id),
            "amount_kes": body.amount_kes,
            "payment_method": body.payment_method,
        },
        reason=body.reason,
        surface=request.headers.get("X-Emappa-Surface", "api"),
    )
    await session.commit()
    return {"tokenPurchase": _serialize(tp)}


@router.get("/building/{building_id}/total")
async def building_total(
    building_id: str,
    _: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        bid = uuid.UUID(building_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_building_id")
    total = await tp_repo.confirmed_total_for_building(session, building_id=bid)
    return {"buildingId": building_id, "totalKes": float(total)}
