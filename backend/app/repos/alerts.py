"""Alert repository — create + list, with optional building/incident filter."""
from __future__ import annotations

import uuid
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.alert import Alert

Severity = Literal["info", "warning", "critical", "page"]
Status = Literal["open", "acknowledged", "remediating", "resolved"]
OwnerRole = Literal[
    "resident",
    "homeowner",
    "building_owner",
    "provider",
    "financier",
    "electrician",
    "admin",
]


async def create(
    session: AsyncSession,
    *,
    severity: Severity,
    source: str,
    owner_role: OwnerRole,
    building_id: uuid.UUID | None = None,
    incident_id: uuid.UUID | None = None,
    remediation_status: str | None = None,
) -> Alert:
    if not source.strip():
        raise ValueError("alert source is required")
    alert = Alert(
        severity=severity,
        source=source,
        owner_role=owner_role,
        building_id=building_id,
        incident_id=incident_id,
        remediation_status=remediation_status,
    )
    session.add(alert)
    await session.flush()
    return alert


async def list_open(
    session: AsyncSession,
    *,
    building_id: uuid.UUID | None = None,
    severity: Severity | None = None,
    limit: int = 100,
) -> list[Alert]:
    stmt = select(Alert).where(Alert.status == "open")
    if building_id is not None:
        stmt = stmt.where(Alert.building_id == building_id)
    if severity is not None:
        stmt = stmt.where(Alert.severity == severity)
    stmt = stmt.order_by(Alert.ts.desc()).limit(limit)
    return list((await session.execute(stmt)).scalars().all())


async def mark_status(
    session: AsyncSession,
    *,
    alert_id: uuid.UUID,
    status: Status,
) -> Alert | None:
    alert = await session.get(Alert, alert_id)
    if alert is None:
        return None
    alert.status = status
    await session.flush()
    return alert
