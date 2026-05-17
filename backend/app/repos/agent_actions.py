"""agent_action repository — pending propose / accept / reject lifecycle.

Per CR-4: agent_action rows land in `pending_admin_approval` and only
move to `accepted` or `rejected` via an explicit admin decision. Each
decision MUST carry a reason; we mirror that into the linked audit_log
row via the optional audit_log_id back-reference.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.agent_action import AgentAction

AgentId = Literal["drs", "lbrs", "settlement", "alert_triage", "eligibility"]
Decision = Literal["accepted", "rejected"]

REQUIRED_PROPOSAL_KEYS = {
    "agent_id",
    "agent_version",
    "proposed_action",
    "confidence",
    "evidence_uris",
    "rationale",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _validate_proposal(proposal: dict) -> None:
    missing = REQUIRED_PROPOSAL_KEYS - proposal.keys()
    if missing:
        raise ValueError(f"proposal missing keys: {sorted(missing)}")
    confidence = proposal["confidence"]
    if not isinstance(confidence, (int, float)) or not 0.0 <= float(confidence) <= 1.0:
        raise ValueError("proposal.confidence must be in [0.0, 1.0]")


async def propose(
    session: AsyncSession,
    *,
    agent_id: AgentId,
    proposal: dict,
) -> AgentAction:
    _validate_proposal(proposal)
    if proposal["agent_id"] != agent_id:
        raise ValueError("proposal.agent_id must match arg agent_id")
    row = AgentAction(
        agent_id=agent_id,
        agent_version=proposal["agent_version"],
        proposal=proposal,
    )
    session.add(row)
    await session.flush()
    return row


async def decide(
    session: AsyncSession,
    *,
    action_id: uuid.UUID,
    decision: Decision,
    decided_by: uuid.UUID,
    reason: str,
    audit_log_id: int | None = None,
) -> AgentAction | None:
    if not reason or not reason.strip():
        raise ValueError("decision reason required (CR-4)")
    action = await session.get(AgentAction, action_id)
    if action is None:
        return None
    if action.status != "pending_admin_approval":
        raise ValueError(
            f"agent_action {action_id} already decided as {action.status!r}"
        )
    action.status = decision
    action.decided_by = decided_by
    action.decided_at = _now()
    action.decision_reason = reason.strip()
    if audit_log_id is not None:
        action.audit_log_id = audit_log_id
    await session.flush()
    return action


async def list_pending(
    session: AsyncSession,
    *,
    agent_id: AgentId | None = None,
    limit: int = 100,
) -> list[AgentAction]:
    stmt = select(AgentAction).where(AgentAction.status == "pending_admin_approval")
    if agent_id is not None:
        stmt = stmt.where(AgentAction.agent_id == agent_id)
    stmt = stmt.order_by(AgentAction.created_at.asc()).limit(limit)
    return list((await session.execute(stmt)).scalars().all())
