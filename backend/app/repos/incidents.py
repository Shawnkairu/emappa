"""Incident repository — open + close, with alert linking helper."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.alert import Alert
from ..models.incident import Incident

Severity = Literal["info", "warning", "critical", "page"]
Status = Literal["open", "investigating", "remediating", "resolved", "postmortem"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def open_incident(
    session: AsyncSession,
    *,
    severity: Severity,
) -> Incident:
    incident = Incident(severity=severity, status="open")
    session.add(incident)
    await session.flush()
    return incident


async def link_alerts(
    session: AsyncSession,
    *,
    incident_id: uuid.UUID,
    alert_ids: list[uuid.UUID],
) -> int:
    if not alert_ids:
        return 0
    result = await session.execute(
        update(Alert).where(Alert.id.in_(alert_ids)).values(incident_id=incident_id)
    )
    return result.rowcount or 0


async def advance_status(
    session: AsyncSession,
    *,
    incident_id: uuid.UUID,
    status: Status,
    root_cause: str | None = None,
    postmortem_uri: str | None = None,
) -> Incident | None:
    incident = await session.get(Incident, incident_id)
    if incident is None:
        return None
    incident.status = status
    if status in ("resolved", "postmortem"):
        incident.closed_at = _now()
    else:
        incident.closed_at = None
    if root_cause is not None:
        incident.root_cause = root_cause
    if postmortem_uri is not None:
        incident.postmortem_uri = postmortem_uri
    await session.flush()
    return incident


async def list_open(session: AsyncSession, *, limit: int = 100) -> list[Incident]:
    stmt = (
        select(Incident)
        .where(Incident.status.in_(("open", "investigating", "remediating")))
        .order_by(Incident.opened_at.desc())
        .limit(limit)
    )
    return list((await session.execute(stmt)).scalars().all())
