"""/residents/{user_id}/* endpoints — Scenario A resident-flow backend.

Endpoints landed in P1.6.3-6:

- POST   /residents/{user_id}/load-profile   — L1/L2/L3 capture (§7)
- POST   /residents/{user_id}/queue-request  — join capacity queue (§6)
- GET    /residents/{user_id}/queue-position — current position + factors (§6.3)
- GET    /residents/{user_id}/ats-state      — 8-state machine read (§2.1)

Scope policy:
- Any user can read or write their OWN /residents/{user_id}/*.
- Admins can read or write any user's.
- All other cross-user access → 403 not_your_resource.

Mutations write audit rows via repos.audit.log_mutation with required reason
per CR-2. Reads bypass audit (no state change).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from ..middleware.jwt import get_current_user
from ..models.user import User
from ..repos import ats as ats_repo
from ..repos import audit as audit_repo
from ..repos import capacity_queue as queue_repo
from ..repos import load_profile as lp_repo

router = APIRouter(prefix="/residents", tags=["residents"])


def _parse_user_id(raw: str) -> uuid.UUID:
    try:
        return uuid.UUID(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_user_id")


def _check_scope(actor: User, target_user_id: uuid.UUID) -> None:
    if actor.role == "admin":
        return
    if actor.id != target_user_id:
        raise HTTPException(status_code=403, detail="not_your_resource")


# ---- P1.6.3 — POST /residents/{user_id}/load-profile ------------------------


class LoadProfileApplianceBody(BaseModel):
    name: str
    watts: float = Field(ge=0)
    hours_per_day: float = Field(ge=0, le=24, alias="hoursPerDay")

    model_config = ConfigDict(populate_by_name=True)


class CaptureLoadProfileBody(BaseModel):
    level: Literal["L1", "L2", "L3"]
    appliances: list[LoadProfileApplianceBody] = Field(default_factory=list)
    daytime_kwh: float = Field(ge=0, alias="daytimeKwh")
    evening_kwh: float = Field(ge=0, alias="eveningKwh")
    confidence: float = Field(ge=0, le=1)
    receipt_url: str | None = Field(default=None, alias="receiptUrl")
    reason: str = Field(min_length=1)

    model_config = ConfigDict(populate_by_name=True)


def _serialize_load_profile(row: Any) -> dict:
    return {
        "id": str(row.id),
        "userId": str(row.user_id),
        "level": row.level,
        "appliances": row.appliances,
        "daytimeKwh": float(row.daytime_kwh),
        "eveningKwh": float(row.evening_kwh),
        "confidence": float(row.confidence),
        "receiptUrl": row.receipt_url,
        "capturedAt": (row.captured_at or datetime.utcnow()).isoformat(),
    }


@router.post("/{user_id}/load-profile", status_code=status.HTTP_201_CREATED)
async def capture_load_profile(
    user_id: str,
    body: CaptureLoadProfileBody,
    request: Request,
    actor: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    target = _parse_user_id(user_id)
    _check_scope(actor, target)

    appliances = [a.model_dump() for a in body.appliances]
    row = await lp_repo.capture(
        session,
        user_id=target,
        level=body.level,
        appliances=appliances,
        daytime_kwh=body.daytime_kwh,
        evening_kwh=body.evening_kwh,
        confidence=body.confidence,
        receipt_url=body.receipt_url,
    )
    await audit_repo.log_mutation(
        session,
        actor_user_id=actor.id,
        actor_kind="user",
        action="resident.load_profile.capture",
        target_type="load_profile",
        target_id=str(row.id),
        before=None,
        after={
            "level": body.level,
            "daytime_kwh": body.daytime_kwh,
            "evening_kwh": body.evening_kwh,
            "confidence": body.confidence,
            "appliance_count": len(appliances),
        },
        reason=body.reason,
        surface=request.headers.get("X-Emappa-Surface", "api"),
    )
    await session.commit()
    return {"loadProfile": _serialize_load_profile(row)}


# ---- P1.6.4 — GET /residents/{user_id}/queue-position -----------------------


@router.get("/{user_id}/queue-position")
async def get_queue_position(
    user_id: str,
    building_id: str | None = None,
    actor: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    target = _parse_user_id(user_id)
    _check_scope(actor, target)

    # If the user has a building_id, resolve queue position there. Otherwise
    # the caller MUST pass ?building_id=… so we know which building's queue.
    resolved_bid: uuid.UUID | None = None
    if building_id:
        try:
            resolved_bid = uuid.UUID(building_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="invalid_building_id")
    elif actor.building_id is not None and actor.id == target:
        resolved_bid = actor.building_id
    else:
        raise HTTPException(status_code=400, detail="building_id_required")

    entry = await queue_repo.position_for_user(
        session, building_id=resolved_bid, user_id=target
    )
    if entry is None:
        # Not queued yet — explicit empty state, not a 404 (per CR-8: no
        # silent fallback; the absence is a real product state).
        return {
            "buildingId": str(resolved_bid),
            "userId": str(target),
            "queued": False,
            "position": None,
            "status": None,
            "priorityFactors": [],
        }
    return {
        "buildingId": str(resolved_bid),
        "userId": str(target),
        "queued": True,
        "position": entry.position,
        "status": entry.status,
        "priorityFactors": list(entry.priority_factors or []),
        "joinedAt": (entry.joined_at or datetime.utcnow()).isoformat(),
        "clearedAt": entry.cleared_at.isoformat() if entry.cleared_at else None,
        "activatedAt": entry.activated_at.isoformat() if entry.activated_at else None,
    }


# ---- P1.6.5 — POST /residents/{user_id}/queue-request -----------------------


class QueueRequestBody(BaseModel):
    building_id: str = Field(alias="buildingId")
    priority_factors: list[str] = Field(default_factory=list, alias="priorityFactors")
    reason: str = Field(min_length=1)

    model_config = ConfigDict(populate_by_name=True)


@router.post("/{user_id}/queue-request", status_code=status.HTTP_201_CREATED)
async def queue_request(
    user_id: str,
    body: QueueRequestBody,
    request: Request,
    actor: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    target = _parse_user_id(user_id)
    _check_scope(actor, target)
    try:
        bid = uuid.UUID(body.building_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_building_id")

    try:
        entry = await queue_repo.join(
            session,
            building_id=bid,
            user_id=target,
            priority_factors=body.priority_factors,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await audit_repo.log_mutation(
        session,
        actor_user_id=actor.id,
        actor_kind="user",
        action="resident.queue.join",
        target_type="capacity_queue",
        target_id=str(entry.id),
        before=None,
        after={
            "building_id": str(bid),
            "position": entry.position,
            "priority_factors": list(entry.priority_factors or []),
        },
        reason=body.reason,
        surface=request.headers.get("X-Emappa-Surface", "api"),
    )
    await session.commit()
    return {
        "buildingId": body.building_id,
        "userId": str(target),
        "queued": True,
        "position": entry.position,
        "status": entry.status,
        "priorityFactors": list(entry.priority_factors or []),
    }


# ---- P1.6.6 — GET /residents/{user_id}/ats-state ----------------------------


@router.get("/{user_id}/ats-state")
async def get_ats_state(
    user_id: str,
    building_id: str | None = None,
    apartment_label: str | None = None,
    actor: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Read the 8-state ATS machine for one apartment (Scenario A §2.1).

    The apartment is keyed by (building_id, apartment_label). Both must be
    supplied — there's no per-user assignment table yet, so the caller is
    responsible for telling us which apartment they're asking about. (Once
    P1.x lands the apartments table this defaults to "the apartment linked
    to the user".)
    """
    target = _parse_user_id(user_id)
    _check_scope(actor, target)

    resolved_bid: uuid.UUID
    if building_id:
        try:
            resolved_bid = uuid.UUID(building_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="invalid_building_id")
    elif actor.building_id is not None and actor.id == target:
        resolved_bid = actor.building_id
    else:
        raise HTTPException(status_code=400, detail="building_id_required")

    if not apartment_label:
        raise HTTPException(status_code=400, detail="apartment_label_required")

    row = await ats_repo.get_for_apartment(
        session, building_id=resolved_bid, apartment_label=apartment_label
    )
    if row is None:
        # CR-8: no silent fallback. Caller distinguishes "no row" from a
        # specific state by reading `known: false`.
        return {
            "buildingId": str(resolved_bid),
            "apartmentLabel": apartment_label,
            "known": False,
            "state": None,
        }
    return {
        "buildingId": str(resolved_bid),
        "apartmentLabel": apartment_label,
        "known": True,
        "state": row.state,
        "lastTransitionReason": row.last_transition_reason,
        "lastTransitionAt": (row.last_transition_at or datetime.utcnow()).isoformat(),
        "updatedAt": (row.updated_at or datetime.utcnow()).isoformat(),
    }
