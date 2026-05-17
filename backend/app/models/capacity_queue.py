"""CapacityQueue — 7-state queue with priority factors (Scenario A §6.2/§6.3)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, Text, TIMESTAMP, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class CapacityQueue(Base):
    __tablename__ = "capacity_queue"
    __table_args__ = (
        Index("idx_capacity_queue_building_pos", "building_id", "position"),
        UniqueConstraint(
            "building_id", "user_id", name="uq_capacity_queue_building_user"
        ),
        CheckConstraint(
            "status IN ('interested','pledged','capacity_review','capacity_cleared',"
            "'queued','waitlisted','activated')",
            name="capacity_queue_status_check",
        ),
        CheckConstraint("position > 0", name="capacity_queue_position_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    building_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("buildings.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="interested")
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    priority_factors: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=func.array([], type_=Text)
    )
    joined_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    cleared_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    activated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
