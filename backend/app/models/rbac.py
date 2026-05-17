"""RbacClaim — time-bounded JWT scope grant (CR-7, ADR 0001 §4)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class RbacClaim(Base):
    __tablename__ = "rbac_claim"
    __table_args__ = (
        Index(
            "idx_rbac_claim_subject_active",
            "subject_kind",
            "subject_id",
            "scope",
            "expires_at",
        ),
        CheckConstraint(
            "subject_kind IN ('user','agent','system')",
            name="rbac_claim_subject_kind_check",
        ),
        CheckConstraint(
            "expires_at > granted_at",
            name="rbac_claim_ttl_positive_check",
        ),
        CheckConstraint(
            "(revoked_at IS NULL AND revoked_by IS NULL AND revoked_reason IS NULL) "
            "OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL "
            "AND revoked_reason IS NOT NULL)",
            name="rbac_claim_revoke_atomicity_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    subject_kind: Mapped[str] = mapped_column(Text, nullable=False)
    subject_id: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    resource_kind: Mapped[str | None] = mapped_column(Text, nullable=True)
    resource_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    granted_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    granted_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    incident_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    revoked_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    revoked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
