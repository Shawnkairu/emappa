"""AgentEvalRun — per-version eval scorecard (AI-native §9 Phase 4)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, Index, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class AgentEvalRun(Base):
    __tablename__ = "agent_eval_run"
    __table_args__ = (
        Index(
            "idx_agent_eval_agent_version_ts",
            "agent_id",
            "agent_version",
            "ts",
        ),
        CheckConstraint(
            "agent_id IN ('drs','lbrs','settlement','alert_triage','eligibility')",
            name="agent_eval_run_agent_id_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    agent_id: Mapped[str] = mapped_column(Text, nullable=False)
    agent_version: Mapped[str] = mapped_column(Text, nullable=False)
    scorecard: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    regression_delta: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    pass_: Mapped[bool] = mapped_column("pass", Boolean, nullable=False)
    ts: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
