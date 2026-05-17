"""admin_allowlist repository.

Replaces the env-var-only allowlist with a DB-backed source of truth.
On bootstrap (seed.py / grant_admin.py), entries from
EMAPPA_ADMIN_EMAILS are upserted as `granted_by=NULL,
reason='bootstrap from env'` rows; subsequent grants require an actor.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.admin import AdminAllowlist


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def is_allowlisted(session: AsyncSession, email: str) -> bool:
    email_lc = email.strip().lower()
    stmt = (
        select(AdminAllowlist)
        .where(AdminAllowlist.email == email_lc)
        .where(AdminAllowlist.revoked_at.is_(None))
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    return row is not None


async def list_active_emails(session: AsyncSession) -> list[str]:
    stmt = (
        select(AdminAllowlist.email)
        .where(AdminAllowlist.revoked_at.is_(None))
        .order_by(AdminAllowlist.email)
    )
    return list((await session.execute(stmt)).scalars().all())


async def upsert(
    session: AsyncSession,
    *,
    email: str,
    granted_by: uuid.UUID | None,
    reason: str,
) -> AdminAllowlist:
    """Insert or reactivate a row for `email`.

    - If a non-revoked row exists, returns it unchanged (idempotent).
    - If only a revoked row exists, inserts a new active row (the
      historical revoked row is preserved as audit trail).
    """
    if not reason or not reason.strip():
        raise ValueError("admin_allowlist upsert requires non-empty reason")
    email_lc = email.strip().lower()

    existing = (
        await session.execute(
            select(AdminAllowlist)
            .where(AdminAllowlist.email == email_lc)
            .where(AdminAllowlist.revoked_at.is_(None))
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    row = AdminAllowlist(
        email=email_lc,
        granted_by=granted_by,
        reason=reason.strip(),
    )
    session.add(row)
    await session.flush()
    return row


async def revoke(
    session: AsyncSession,
    *,
    email: str,
    revoked_by: uuid.UUID,
    reason: str,
) -> AdminAllowlist | None:
    if not reason or not reason.strip():
        raise ValueError("revoke requires non-empty reason")
    email_lc = email.strip().lower()
    row = (
        await session.execute(
            select(AdminAllowlist)
            .where(AdminAllowlist.email == email_lc)
            .where(AdminAllowlist.revoked_at.is_(None))
        )
    ).scalar_one_or_none()
    if row is None:
        return None
    row.revoked_at = _now()
    row.revoked_by = revoked_by
    row.revoked_reason = reason.strip()
    await session.flush()
    return row
