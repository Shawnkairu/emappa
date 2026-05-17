"""homeowner_authority repository (P2.6.6).

Doctrine guards landed here so the endpoint half (P2.6.1) and the
initiate-project gate (P2.6.4) inherit them.

The table is append-only — every submit lands a new row. `latest_for_user`
is the canonical reader; `has_verified` is the gate that P2.6.4 uses.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.homeowner_authority import HomeownerAuthority

Status = Literal["pending", "verified", "rejected", "more_info_required"]
_TERMINAL_STATUSES: frozenset[str] = frozenset(
    {"verified", "rejected", "more_info_required"}
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def submit(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    title_url: str | None = None,
    lease_url: str | None = None,
    owner_authorization_url: str | None = None,
    utility_account_evidence_url: str | None = None,
    national_id_url: str | None = None,
    site_inspection_consent_url: str | None = None,
) -> HomeownerAuthority:
    """Create a new pending submission. At least one ownership-proof URL
    is required — enforced both here and by the DB CHECK so callers
    fail fast in app code without hitting the database round-trip."""
    if not any((title_url, lease_url, owner_authorization_url)):
        raise ValueError(
            "homeowner_authority requires at least one of "
            "title_url / lease_url / owner_authorization_url"
        )
    row = HomeownerAuthority(
        user_id=user_id,
        title_url=title_url,
        lease_url=lease_url,
        owner_authorization_url=owner_authorization_url,
        utility_account_evidence_url=utility_account_evidence_url,
        national_id_url=national_id_url,
        site_inspection_consent_url=site_inspection_consent_url,
    )
    session.add(row)
    await session.flush()
    return row


async def latest_for_user(
    session: AsyncSession, *, user_id: uuid.UUID
) -> HomeownerAuthority | None:
    stmt = (
        select(HomeownerAuthority)
        .where(HomeownerAuthority.user_id == user_id)
        .order_by(desc(HomeownerAuthority.submitted_at))
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def has_verified(
    session: AsyncSession, *, user_id: uuid.UUID
) -> bool:
    """The doctrine gate (A.7 case 1, used by P2.6.4): does this homeowner
    have any row in 'verified' status? A pending or rejected latest row
    means deployment must be blocked."""
    latest = await latest_for_user(session, user_id=user_id)
    return latest is not None and latest.status == "verified"


async def review(
    session: AsyncSession,
    *,
    authority_id: uuid.UUID,
    reviewer_user_id: uuid.UUID,
    new_status: Status,
    review_notes: str | None = None,
) -> HomeownerAuthority:
    """Admin path: stamp a pending row terminal. Raises ValueError if the
    target row isn't pending or if new_status isn't terminal."""
    row = await session.get(HomeownerAuthority, authority_id)
    if row is None:
        raise ValueError(f"homeowner_authority {authority_id} not found")
    if row.status != "pending":
        raise ValueError(
            f"homeowner_authority {authority_id} already {row.status!r}"
        )
    if new_status not in _TERMINAL_STATUSES:
        raise ValueError(
            f"review target status must be terminal; got {new_status!r}"
        )
    row.status = new_status
    row.reviewed_at = _now()
    row.reviewed_by_user_id = reviewer_user_id
    row.review_notes = review_notes
    await session.flush()
    return row


async def pending_review_queue(
    session: AsyncSession, *, limit: int = 50
) -> list[HomeownerAuthority]:
    """Admin review feed — oldest pending first (FIFO)."""
    stmt = (
        select(HomeownerAuthority)
        .where(HomeownerAuthority.status == "pending")
        .order_by(HomeownerAuthority.submitted_at.asc())
        .limit(limit)
    )
    return list((await session.execute(stmt)).scalars().all())
