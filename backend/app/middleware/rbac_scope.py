"""RBAC-scoped queue filter (CR-7 / P0.3.6).

Cockpit ops surfaces 7 decision queues — DRS, LBRS, Provider Verification,
Electrician Certification, Financier Eligibility, Document Review,
Counterparties. Per IA_SPEC §Universal Cockpit Rules CR-7, each queue
endpoint filters its rows by the requester's JWT-side claim scopes:

> "Queue page filters by JWT scope (jurisdiction, severity ceiling).
>  Out-of-scope items hidden, not greyed. Backend test asserts
>  GET /queues/{kind} returns 0 items when scope excludes all."

So queues never return 403 — they return the subset of rows the claim
scope admits, possibly empty. This module gives every queue endpoint a
uniform input contract: a `QueueScope` dataclass summarizing what the
caller may see, derived from the live `rbac_claim` rows.

Scope-string grammar (subset of the namespace documented in
packages/shared/src/types.ts RbacScope):

    queue:{kind}                         — unrestricted access
    queue:{kind}:jurisdiction:{code}     — restrict to one jurisdiction
    queue:{kind}:severity:{ceiling}      — restrict to severity ≤ ceiling
    queue:{kind}:jurisdiction:{code}:severity:{ceiling}   — both

Where `kind` ∈ {drs, lbrs, provider, electrician, financier, doc, counterparties}.
Multiple grants for the same kind are unioned: jurisdictions accumulate;
the severity ceiling takes the max (most permissive). Unrestricted +
qualified = unrestricted wins (the broadest grant is honored).

Per ADR 0001 §6 / repos.rbac, agents structurally cannot hold queue:*
scopes either (defense in depth — keeps the cockpit queue interaction
loop a human-only space).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Literal

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from ..middleware.jwt import get_current_user
from ..models.user import User
from ..repos import rbac as rbac_repo

QueueKind = Literal[
    "drs",
    "lbrs",
    "provider",
    "electrician",
    "financier",
    "doc",
    "counterparties",
]

QUEUE_KINDS: frozenset[QueueKind] = frozenset(
    ["drs", "lbrs", "provider", "electrician", "financier", "doc", "counterparties"]
)

# Severity strict ordering (low → high). Used to compare "≤ ceiling".
_SEVERITY_RANK: dict[str, int] = {"info": 0, "warning": 1, "critical": 2, "page": 3}


@dataclass(frozen=True)
class QueueScope:
    """The compiled view of a user's grants for one queue kind.

    Empty (`grants_any=False`) means the user has no `queue:{kind}` claims
    at all — endpoints should return [] not 403.
    """

    kind: QueueKind
    grants_any: bool = False
    unrestricted: bool = False
    jurisdictions: frozenset[str] = field(default_factory=frozenset)
    severity_ceiling: str | None = None  # one of _SEVERITY_RANK keys

    def admits_jurisdiction(self, jurisdiction: str | None) -> bool:
        if not self.grants_any:
            return False
        if self.unrestricted or not self.jurisdictions:
            # `unrestricted=True` always; or `jurisdictions=∅` only when
            # there was no jurisdiction qualifier at all → no filter.
            return True
        if jurisdiction is None:
            return False
        return jurisdiction in self.jurisdictions

    def admits_severity(self, severity: str | None) -> bool:
        if not self.grants_any:
            return False
        if self.severity_ceiling is None:
            return True
        if severity is None:
            return True  # untagged items always visible to anyone who can see the queue
        sev_rank = _SEVERITY_RANK.get(severity)
        ceil_rank = _SEVERITY_RANK[self.severity_ceiling]
        if sev_rank is None:
            return True
        return sev_rank <= ceil_rank


def _parse_scope_for_kind(scope: str, kind: QueueKind) -> dict | None:
    """Parse one rbac_claim.scope string into qualifier dict, or None if
    it doesn't pertain to `kind`."""
    prefix = f"queue:{kind}"
    if scope != prefix and not scope.startswith(prefix + ":"):
        return None
    if scope == prefix:
        return {"unrestricted": True}

    qualifier = scope[len(prefix) + 1 :]
    parsed: dict = {"jurisdiction": None, "severity": None}
    parts = qualifier.split(":")
    # Walk pairs (key, value)
    i = 0
    while i < len(parts) - 1:
        key, value = parts[i], parts[i + 1]
        if key in ("jurisdiction", "severity"):
            parsed[key] = value
            i += 2
        else:
            # unknown qualifier — be conservative, treat as no grant
            return None
    return parsed


def compile_queue_scope(kind: QueueKind, scopes: Iterable[str]) -> QueueScope:
    """Pure function — given a list of active scope strings, return the
    compiled QueueScope for the given queue kind.

    Exposed so tests + future stress harnesses can exercise the parser
    without touching the DB.
    """
    grants_any = False
    unrestricted = False
    jurisdictions: set[str] = set()
    severity_ceiling: str | None = None

    for scope in scopes:
        parsed = _parse_scope_for_kind(scope, kind)
        if parsed is None:
            continue
        grants_any = True
        if parsed.get("unrestricted"):
            unrestricted = True
            continue
        j = parsed.get("jurisdiction")
        if j:
            jurisdictions.add(j)
        s = parsed.get("severity")
        if s is not None and s in _SEVERITY_RANK:
            current_rank = (
                _SEVERITY_RANK[severity_ceiling] if severity_ceiling else -1
            )
            if _SEVERITY_RANK[s] > current_rank:
                severity_ceiling = s

    if unrestricted:
        # broadest grant wipes qualifiers
        return QueueScope(kind=kind, grants_any=True, unrestricted=True)

    return QueueScope(
        kind=kind,
        grants_any=grants_any,
        unrestricted=False,
        jurisdictions=frozenset(jurisdictions),
        severity_ceiling=severity_ceiling,
    )


def get_queue_scope(kind: QueueKind):
    """FastAPI dependency factory.

    Usage:

        @router.get("/queues/drs")
        async def list_drs(
            scope: QueueScope = Depends(get_queue_scope("drs")),
            session: AsyncSession = Depends(get_session),
        ):
            return await drs_repo.list_scoped(session, scope)
    """
    if kind not in QUEUE_KINDS:
        raise ValueError(f"unknown queue kind: {kind!r}")

    async def _dep(
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session),
    ) -> QueueScope:
        # Agents PII-blind extends to queues (defense-in-depth).
        if user.role == "agent":  # pragma: no cover — User.role never 'agent' today
            return QueueScope(kind=kind, grants_any=False)

        scopes = await rbac_repo.list_active_scopes(
            session, subject_kind="user", subject_id=str(user.id)
        )
        return compile_queue_scope(kind, scopes)

    return _dep
