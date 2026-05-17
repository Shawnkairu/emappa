"""Pledge — pre-activation, non-binding, cancellable (ADR 0002, Scenario A §5)."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class Pledge(Base):
    __tablename__ = "pledge"
    __table_args__ = (
        Index("idx_pledge_building", "building_id"),
        CheckConstraint(
            "status IN ('active','cancelled','converted')",
            name="pledge_status_check",
        ),
        CheckConstraint(
            "amount_kes IS NULL OR amount_kes >= 0",
            name="pledge_amount_non_negative",
        ),
        CheckConstraint(
            "(status = 'active' AND closed_at IS NULL) "
            "OR (status IN ('cancelled','converted') AND closed_at IS NOT NULL)",
            name="pledge_closed_at_atomicity",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    building_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("buildings.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    amount_kes: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="active")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
