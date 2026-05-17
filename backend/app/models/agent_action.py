"""AgentAction — proposal lifecycle row (AI-native §4 / CR-4)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Index, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class AgentAction(Base):
    __tablename__ = "agent_action"
    __table_args__ = (
        Index(
            "idx_agent_action_pending",
            "agent_id",
            "created_at",
        ),
        Index("idx_agent_action_decided", "decided_at"),
        CheckConstraint(
            "agent_id IN ('drs','lbrs','settlement','alert_triage','eligibility')",
            name="agent_action_agent_id_check",
        ),
        CheckConstraint(
            "status IN ('pending_admin_approval','accepted','rejected')",
            name="agent_action_status_check",
        ),
        CheckConstraint(
            "(status = 'pending_admin_approval' AND decided_by IS NULL "
            "AND decided_at IS NULL AND decision_reason IS NULL) "
            "OR (status <> 'pending_admin_approval' AND decided_by IS NOT NULL "
            "AND decided_at IS NOT NULL AND decision_reason IS NOT NULL)",
            name="agent_action_decision_atomicity",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    agent_id: Mapped[str] = mapped_column(Text, nullable=False)
    agent_version: Mapped[str] = mapped_column(Text, nullable=False)
    proposal: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="pending_admin_approval"
    )
    audit_log_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("audit_log.id"), nullable=True
    )
    decided_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
