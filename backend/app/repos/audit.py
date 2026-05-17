"""Audit log repository — append-only."""
from __future__ import annotations

import uuid
from typing import Any, Literal

from sqlalchemy.ext.asyncio import AsyncSession

from ..models.audit import AuditLog

ActorKind = Literal["user", "agent", "system"]


async def log_event(
    session: AsyncSession,
    *,
    actor_user_id: uuid.UUID | None,
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    """Legacy helper — kept for back-compat with pre-CR-2 callers.

    New mutation endpoints should call `log_mutation` instead so that
    reason/before/after/surface land in their dedicated columns.
    """
    session.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            payload=payload,
        )
    )
    await session.flush()


async def log_mutation(
    session: AsyncSession,
    *,
    actor_user_id: uuid.UUID | None,
    actor_kind: ActorKind,
    action: str,
    target_type: str,
    target_id: str,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    reason: str,
    surface: str,
    agent_attribution: str | None = None,
) -> None:
    """CR-2 compliant audit write.

    Required by every state-changing endpoint. `reason` must be a
    non-empty string. When `actor_kind == 'agent'`, `agent_attribution`
    must be one of the AgentId values (validated server-side by the
    CHECK constraint added in migration 0003).
    """
    if not reason or not reason.strip():
        raise ValueError("audit reason is required (CR-2)")
    if actor_kind == "agent" and not agent_attribution:
        raise ValueError("agent_attribution required when actor_kind='agent'")
    session.add(
        AuditLog(
            actor_user_id=actor_user_id,
            actor_kind=actor_kind,
            action=action,
            target_type=target_type,
            target_id=target_id,
            before=before,
            after=after,
            reason=reason.strip(),
            agent_attribution=agent_attribution,
            surface=surface,
        )
    )
    await session.flush()
