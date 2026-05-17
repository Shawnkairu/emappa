"""AuditLog — append-only audit trail.

Schema mirrors AuditLogEntry in packages/shared/src/types.ts.
Append-only invariant is enforced at the DB layer by BEFORE UPDATE /
BEFORE DELETE triggers created in migration 0003. Per CR-2 + ADR 0001
no application code should ever UPDATE or DELETE rows in this table.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("idx_audit_target_at", "target_type", "target_id", "at"),
        Index("idx_audit_actor_at", "actor_user_id", "at"),
        CheckConstraint(
            "actor_kind IS NULL OR actor_kind IN ('user','agent','system')",
            name="audit_log_actor_kind_check",
        ),
        CheckConstraint(
            "actor_kind <> 'agent' OR agent_attribution IS NOT NULL",
            name="audit_log_agent_attribution_when_agent",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # Legacy columns — kept for back-compat with existing callers.
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(Text, nullable=False)
    target_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # CR-2 columns (P0.3.1). All nullable for back-compat with legacy
    # callers; new mutation paths populate them via the audit middleware.
    actor_kind: Mapped[str | None] = mapped_column(Text, nullable=True)
    before: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    after: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_attribution: Mapped[str | None] = mapped_column(Text, nullable=True)
    surface: Mapped[str | None] = mapped_column(Text, nullable=True)
