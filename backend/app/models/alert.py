"""Alert — single-event row emitted by anomaly agents + ops health checks.

Shape mirrors AlertRecord in packages/shared/src/types.ts.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class Alert(Base):
    __tablename__ = "alert"
    __table_args__ = (
        Index("idx_alert_status_severity", "status", "severity"),
        Index("idx_alert_building", "building_id"),
        Index("idx_alert_incident", "incident_id"),
        CheckConstraint(
            "severity IN ('info','warning','critical','page')",
            name="alert_severity_check",
        ),
        CheckConstraint(
            "status IN ('open','acknowledged','remediating','resolved')",
            name="alert_status_check",
        ),
        CheckConstraint(
            "owner_role IN ('resident','homeowner','building_owner','provider',"
            "'financier','electrician','admin')",
            name="alert_owner_role_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    severity: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="open")
    source: Mapped[str] = mapped_column(Text, nullable=False)
    owner_role: Mapped[str] = mapped_column(Text, nullable=False)
    building_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("buildings.id"), nullable=True
    )
    incident_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("incident.id", ondelete="SET NULL"), nullable=True
    )
    remediation_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    ts: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
