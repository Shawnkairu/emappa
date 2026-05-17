"""RBAC claim repository — grants, lookups, revocations.

Per ADR 0001 §4, claims must be time-bounded. TTL ceilings per PII
class are enforced here against PII_CLAIM_TTL_SECONDS so a caller
cannot grant a longer-lived `pii:view:*` claim than the spec allows.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.rbac import RbacClaim

SubjectKind = Literal["user", "agent", "system"]

# Mirrors PII_CLAIM_TTL_SECONDS in packages/shared/src/types.ts.
PII_CLAIM_TTL_SECONDS: dict[str, int] = {
    "contact": 28800,
    "identity": 14400,
    "financial": 3600,
}


def _pii_class_from_scope(scope: str) -> str | None:
    if not scope.startswith("pii:view:"):
        return None
    return scope.split(":", 2)[2]


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def grant_claim(
    session: AsyncSession,
    *,
    subject_kind: SubjectKind,
    subject_id: str,
    scope: str,
    granted_by: uuid.UUID,
    reason: str,
    ttl_seconds: int,
    resource_kind: str | None = None,
    resource_id: str | None = None,
    incident_id: str | None = None,
) -> RbacClaim:
    if not reason or not reason.strip():
        raise ValueError("rbac grant requires non-empty reason (ADR 0001 §4)")
    if subject_kind == "agent" and scope.startswith("pii:view:"):
        # ADR 0001 §6 — agents hold zero pii:view:* claims, ever.
        raise ValueError("agents may not hold pii:view:* claims (ADR 0001 §6)")

    pii_class = _pii_class_from_scope(scope)
    if pii_class is not None:
        ceiling = PII_CLAIM_TTL_SECONDS.get(pii_class)
        if ceiling is None:
            raise ValueError(f"unknown pii class in scope {scope!r}")
        if ttl_seconds > ceiling:
            raise ValueError(
                f"ttl_seconds {ttl_seconds} exceeds ceiling {ceiling} for pii:view:{pii_class}"
            )
        if pii_class in ("identity", "financial") and not incident_id:
            raise ValueError(
                f"incident_id required for pii:view:{pii_class} grants (ADR 0001 §4)"
            )

    if ttl_seconds <= 0:
        raise ValueError("ttl_seconds must be positive")

    now = _now()
    claim = RbacClaim(
        subject_kind=subject_kind,
        subject_id=subject_id,
        scope=scope,
        resource_kind=resource_kind,
        resource_id=resource_id,
        granted_by=granted_by,
        granted_at=now,
        expires_at=now + timedelta(seconds=ttl_seconds),
        reason=reason.strip(),
        incident_id=incident_id,
    )
    session.add(claim)
    await session.flush()
    return claim


async def list_active_scopes(
    session: AsyncSession,
    *,
    subject_kind: SubjectKind,
    subject_id: str,
) -> list[str]:
    """Returns the scope strings currently in effect (non-expired, non-revoked)."""
    now = _now()
    stmt = (
        select(RbacClaim.scope)
        .where(RbacClaim.subject_kind == subject_kind)
        .where(RbacClaim.subject_id == subject_id)
        .where(RbacClaim.expires_at > now)
        .where(RbacClaim.revoked_at.is_(None))
    )
    result = await session.execute(stmt)
    return list(dict.fromkeys(result.scalars().all()))


async def has_scope(
    session: AsyncSession,
    *,
    subject_kind: SubjectKind,
    subject_id: str,
    scope: str,
) -> bool:
    scopes = await list_active_scopes(
        session, subject_kind=subject_kind, subject_id=subject_id
    )
    return scope in scopes


async def revoke_claim(
    session: AsyncSession,
    *,
    claim_id: uuid.UUID,
    revoked_by: uuid.UUID,
    reason: str,
) -> RbacClaim | None:
    if not reason or not reason.strip():
        raise ValueError("revoke requires non-empty reason")
    claim = await session.get(RbacClaim, claim_id)
    if claim is None or claim.revoked_at is not None:
        return None
    claim.revoked_at = _now()
    claim.revoked_by = revoked_by
    claim.revoked_reason = reason.strip()
    await session.flush()
    return claim
