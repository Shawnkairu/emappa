"""ApartmentAtsState — 8-state per-apartment ATS machine (Scenario A §2.1)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, TIMESTAMP, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class ApartmentAtsState(Base):
    __tablename__ = "apartment_ats_state"
    __table_args__ = (
        Index("idx_ats_building_state", "building_id", "state"),
        UniqueConstraint(
            "building_id", "apartment_label", name="uq_ats_building_apartment"
        ),
        CheckConstraint(
            "state IN ('pre_install','installed_not_activated','active_solar',"
            "'active_kplc','throttled','isolated','fault','suspended')",
            name="apartment_ats_state_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    building_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("buildings.id", ondelete="CASCADE"),
        nullable=False,
    )
    apartment_label: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False, server_default="pre_install")
    last_transition_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_transition_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
