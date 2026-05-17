"""Incident — investigation grouping 1+ correlated alerts.

Shape mirrors IncidentRecord in packages/shared/src/types.ts.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, Index, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class Incident(Base):
    __tablename__ = "incident"
    __table_args__ = (
        Index("idx_incident_status_severity", "status", "severity"),
        CheckConstraint(
            "severity IN ('info','warning','critical','page')",
            name="incident_severity_check",
        ),
        CheckConstraint(
            "status IN ('open','investigating','remediating','resolved','postmortem')",
            name="incident_status_check",
        ),
        CheckConstraint(
            "(status = 'resolved' OR status = 'postmortem') = (closed_at IS NOT NULL)",
            name="incident_closed_at_atomic_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    severity: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="open")
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    postmortem_uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    opened_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
