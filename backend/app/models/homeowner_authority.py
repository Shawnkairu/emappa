"""HomeownerAuthority — title/lease/ID + review status (Scenario C §6 step 5).

Append-only per submission. Repo helpers read the latest row per user;
admin review writes a terminal-status row that replaces the pending one.
Doctrine A.7 case 1: status != 'verified' must block the P2.6.4
initiate-project gate.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    TIMESTAMP,
    Text,
    func,
    text as sa_text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class HomeownerAuthority(Base):
    __tablename__ = "homeowner_authority"
    __table_args__ = (
        Index(
            "idx_homeowner_authority_user_submitted",
            "user_id",
            sa_text("submitted_at DESC"),
        ),
        CheckConstraint(
            "status IN ('pending','verified','rejected','more_info_required')",
            name="homeowner_authority_status_check",
        ),
        CheckConstraint(
            "title_url IS NOT NULL "
            "OR lease_url IS NOT NULL "
            "OR owner_authorization_url IS NOT NULL",
            name="homeowner_authority_ownership_proof_required",
        ),
        CheckConstraint(
            "(status = 'pending' AND reviewed_at IS NULL) "
            "OR (status IN ('verified','rejected','more_info_required') "
            "    AND reviewed_at IS NOT NULL)",
            name="homeowner_authority_reviewed_at_atomicity",
        ),
        CheckConstraint(
            "(reviewed_at IS NULL AND reviewed_by_user_id IS NULL) "
            "OR (reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL)",
            name="homeowner_authority_reviewer_atomicity",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    lease_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_authorization_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    utility_account_evidence_url: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    national_id_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    site_inspection_consent_url: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default="pending"
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
