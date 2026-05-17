"""LoadProfile — L1/L2/L3 capture with appliance list (Scenario A §7)."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class LoadProfile(Base):
    __tablename__ = "load_profile"
    __table_args__ = (
        Index("idx_load_profile_user", "user_id"),
        CheckConstraint(
            "level IN ('L1','L2','L3')", name="load_profile_level_check"
        ),
        CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="load_profile_confidence_range",
        ),
        CheckConstraint(
            "daytime_kwh >= 0 AND evening_kwh >= 0",
            name="load_profile_kwh_non_negative",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    level: Mapped[str] = mapped_column(Text, nullable=False)
    appliances: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    daytime_kwh: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    evening_kwh: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    receipt_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
