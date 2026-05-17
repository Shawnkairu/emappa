"""agent_eval_run repository — record + latest-per-version + regression_delta."""
from __future__ import annotations

from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.agent_eval import AgentEvalRun

AgentId = Literal["drs", "lbrs", "settlement", "alert_triage", "eligibility"]


async def record(
    session: AsyncSession,
    *,
    agent_id: AgentId,
    agent_version: str,
    scorecard: dict[str, Any],
    regression_delta: dict[str, Any] | None = None,
    pass_: bool,
) -> AgentEvalRun:
    row = AgentEvalRun(
        agent_id=agent_id,
        agent_version=agent_version,
        scorecard=scorecard,
        regression_delta=regression_delta or {},
        pass_=pass_,
    )
    session.add(row)
    await session.flush()
    return row


async def latest_for_version(
    session: AsyncSession,
    *,
    agent_id: AgentId,
    agent_version: str,
) -> AgentEvalRun | None:
    stmt = (
        select(AgentEvalRun)
        .where(AgentEvalRun.agent_id == agent_id)
        .where(AgentEvalRun.agent_version == agent_version)
        .order_by(AgentEvalRun.ts.desc())
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def history(
    session: AsyncSession,
    *,
    agent_id: AgentId,
    limit: int = 50,
) -> list[AgentEvalRun]:
    stmt = (
        select(AgentEvalRun)
        .where(AgentEvalRun.agent_id == agent_id)
        .order_by(AgentEvalRun.ts.desc())
        .limit(limit)
    )
    return list((await session.execute(stmt)).scalars().all())


def compute_delta(
    current: dict[str, float], previous: dict[str, float] | None
) -> dict[str, float]:
    """Per-metric Δ vs previous scorecard. Missing metrics treated as 0.

    Helper kept here so the CI eval runner can compute deltas before
    calling `record(... regression_delta=...)`.
    """
    if not previous:
        return {k: 0.0 for k in current}
    out: dict[str, float] = {}
    keys = set(current) | set(previous)
    for k in keys:
        out[k] = float(current.get(k, 0)) - float(previous.get(k, 0))
    return out
