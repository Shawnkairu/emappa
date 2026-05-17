"""AdminAllowlist — DB-side store of emails eligible for admin grant.

Replaces the EMAPPA_ADMIN_EMAILS env-var-only allowlist so grants and
revokes are audit-tracked. The env var is still consumed at bootstrap
to seed this table (see scripts/seed.py / grant_admin.py).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db.session import Base


class AdminAllowlist(Base):
    __tablename__ = "admin_allowlist"
    __table_args__ = (
        CheckConstraint(
            "(revoked_at IS NULL AND revoked_by IS NULL AND revoked_reason IS NULL) "
            "OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL "
            "AND revoked_reason IS NOT NULL)",
            name="admin_allowlist_revoke_atomicity_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    granted_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    granted_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    revoked_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    revoked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
