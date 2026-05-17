"""Pledge endpoints — pilot mode of /prepaid/*. See docs/PILOT_SCOPE.md §2.

ADR 0002 PR 1 status (2026-05-17): POST /prepaid/commit is now a dual-write
façade. It still accepts the legacy payload and writes to prepaid_commitments
(unchanged), but ALSO writes to either the new `pledge` table or the new
`token_purchase` table depending on `building.stage` ('live' → token_purchase,
otherwise → pledge). PR 2 (P1.6.2b) will return 410 Gone after the parity
observation window closes — see scripts/audit_pledge_token_parity.py.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from ..middleware.jwt import get_current_user
from ..models.prepaid import PrepaidCommitment
from ..models.user import User
from ..repos import audit as audit_repo
from ..repos import buildings as buildings_repo
from ..repos import pledges as pledges_repo
from ..repos import prepaid as prepaid_repo
from ..repos import token_purchases as tp_repo
from ..repos import wallet as wallet_repo

router = APIRouter(prefix="/prepaid", tags=["prepaid"])


def _serialize(c: PrepaidCommitment) -> dict:
    return {
        "id": str(c.id),
        "buildingId": str(c.building_id),
        "userId": str(c.user_id),
        "amountKes": float(c.amount_kes),
        "paymentMethod": c.payment_method,
        "status": c.status,
        "createdAt": (c.created_at or datetime.utcnow()).isoformat(),
        "confirmedAt": c.confirmed_at.isoformat() if c.confirmed_at else None,
    }


class CommitBody(BaseModel):
    building_id: str = Field(alias="buildingId")
    amount_kes: float = Field(alias="amountKes", gt=0)

    model_config = ConfigDict(populate_by_name=True)


@router.post("/commit")
async def commit_pledge(
    body: CommitBody,
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

    # Scope: residents and homeowners can only pledge into their own building.
    if user.role in {"resident", "homeowner"} and user.building_id != building_id:
        raise HTTPException(status_code=403, detail="not_your_building")

    # Legacy write (preserved for backwards-compat during ADR 0002 PR 1 window).
    pledge = await prepaid_repo.create_pledge(
        session,
        building_id=building_id,
        user_id=user.id,
        amount_kes=Decimal(str(body.amount_kes)),
    )
    await wallet_repo.record(
        session,
        user_id=user.id,
        kind="pledge",
        amount_kes=Decimal(f"-{body.amount_kes}"),
        reference=f"Pledge to {building.name}",
    )

    # ADR 0002 PR 1 dual-write: classify by building.stage. Pre-live →
    # pledge (non-binding). Live → token_purchase (real money). The new-table
    # row carries the same economic meaning + the same created_at so the
    # parity audit script can reconcile by (building_id, user_id, period).
    classified_as: str
    new_row_id: str
    if building.stage == "live":
        new_row = await tp_repo.create(
            session,
            building_id=building_id,
            user_id=user.id,
            amount_kes=body.amount_kes,
            payment_method="mpesa",  # legacy default; ADR 0002 PR 2 deletes this path
        )
        classified_as = "token_purchase"
        new_row_id = str(new_row.id)
    else:
        new_row = await pledges_repo.create(
            session,
            building_id=building_id,
            user_id=user.id,
            amount_kes=body.amount_kes,
        )
        classified_as = "pledge"
        new_row_id = str(new_row.id)

    await audit_repo.log_event(
        session,
        actor_user_id=user.id,
        action="prepaid.commit",
        target_type="building",
        target_id=str(building_id),
        payload={
            "amount_kes": body.amount_kes,
            "commitment_id": str(pledge.id),
            "classified_as": classified_as,
            "new_row_id": new_row_id,
            "building_stage_at_write": building.stage,
        },
    )
    await session.commit()
    return {
        "commitment": _serialize(pledge),
        "dualWrite": {
            "classifiedAs": classified_as,
            "newRowId": new_row_id,
        },
    }


@router.get("/{building_id}/balance")
async def balance(
    building_id: str,
    _: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        bid = uuid.UUID(building_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_building_id")
    total = await prepaid_repo.confirmed_total(session, bid)
    return {"confirmedTotalKes": float(total)}


@router.get("/{building_id}/history")
async def history(
    building_id: str,
    _: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        bid = uuid.UUID(building_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_building_id")
    rows = await prepaid_repo.history(session, bid)
    return [_serialize(r) for r in rows]
