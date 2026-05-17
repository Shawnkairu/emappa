"""POST /pledges + GET /pledges/{building_id} — ADR 0002 PR 1 (endpoint half).

Pledges are non-binding, cancellable, pre-activation declarations of intent.
Scenario A §5 doctrine:
- amount is OPTIONAL (residents can signal interest before settling on a number)
- only legal when the building is NOT live (pre-activation)
- cancellable until the building goes live

Doctrine guards enforced server-side:
- 409 if building.stage == 'live' (post-activation; use POST /tokens/purchase)
- 403 if resident/homeowner pledges into a building that isn't theirs
- 400 if amount provided but <= 0

Audit: every mutation writes via repos.audit.log_mutation with reason.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from ..middleware.jwt import get_current_user
from ..models.pledge import Pledge
from ..models.user import User
from ..repos import audit as audit_repo
from ..repos import buildings as buildings_repo
from ..repos import pledges as pledges_repo

router = APIRouter(prefix="/pledges", tags=["pledges"])


def _serialize(p: Pledge) -> dict:
    return {
        "id": str(p.id),
        "buildingId": str(p.building_id),
        "userId": str(p.user_id),
        "amountKes": float(p.amount_kes) if p.amount_kes is not None else None,
        "status": p.status,
        "createdAt": (p.created_at or datetime.utcnow()).isoformat(),
        "closedAt": p.closed_at.isoformat() if p.closed_at else None,
    }


class CreatePledgeBody(BaseModel):
    building_id: str = Field(alias="buildingId")
    amount_kes: float | None = Field(default=None, alias="amountKes")
    reason: str = Field(min_length=1, description="Free-text reason for audit (CR-2)")

    model_config = ConfigDict(populate_by_name=True)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_pledge(
    body: CreatePledgeBody,
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

    # Doctrine: pledges only pre-activation (Scenario A §5, P9.1.6 CI gate).
    if building.stage == "live":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="pledge_post_activation_forbidden",
        )

    # Scope: residents + homeowners only pledge into their own building.
    if user.role in {"resident", "homeowner"} and user.building_id != building_id:
        raise HTTPException(status_code=403, detail="not_your_building")

    if body.amount_kes is not None and body.amount_kes < 0:
        raise HTTPException(status_code=400, detail="negative_amount")

    pledge = await pledges_repo.create(
        session,
        building_id=building_id,
        user_id=user.id,
        amount_kes=body.amount_kes,
    )
    await audit_repo.log_mutation(
        session,
        actor_user_id=user.id,
        actor_kind="user",
        action="pledge.create",
        target_type="pledge",
        target_id=str(pledge.id),
        before=None,
        after={
            "building_id": str(building_id),
            "amount_kes": body.amount_kes,
        },
        reason=body.reason,
        surface=request.headers.get("X-Emappa-Surface", "api"),
    )
    await session.commit()
    return {"pledge": _serialize(pledge)}


class CancelPledgeBody(BaseModel):
    reason: str = Field(min_length=1)


@router.post("/{pledge_id}/cancel")
async def cancel_pledge(
    pledge_id: str,
    body: CancelPledgeBody,
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        pid = uuid.UUID(pledge_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_pledge_id")

    pledge = await session.get(Pledge, pid)
    if pledge is None:
        raise HTTPException(status_code=404, detail="pledge_not_found")
    if pledge.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="not_your_pledge")
    if pledge.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=f"pledge_already_{pledge.status}"
        )

    try:
        cancelled = await pledges_repo.cancel(session, pledge_id=pid)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    assert cancelled is not None

    await audit_repo.log_mutation(
        session,
        actor_user_id=user.id,
        actor_kind="user",
        action="pledge.cancel",
        target_type="pledge",
        target_id=str(pid),
        before={"status": "active"},
        after={"status": "cancelled"},
        reason=body.reason,
        surface=request.headers.get("X-Emappa-Surface", "api"),
    )
    await session.commit()
    return {"pledge": _serialize(cancelled)}


@router.get("/building/{building_id}")
async def list_pledges_for_building(
    building_id: str,
    _: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        bid = uuid.UUID(building_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_building_id")
    from sqlalchemy import select

    stmt = (
        select(Pledge)
        .where(Pledge.building_id == bid)
        .order_by(Pledge.created_at.desc())
    )
    rows = list((await session.execute(stmt)).scalars().all())
    return {"pledges": [_serialize(p) for p in rows]}
