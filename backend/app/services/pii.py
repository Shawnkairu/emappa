"""PII service — masking + claim-check helpers per ADR 0001 (stricter variant).

Three field classes:

- `contact`   — phone, email, physical address          | TTL 8h
- `identity`  — national ID, passport, ID images        | TTL 4h, incident_id required
- `financial` — M-Pesa #, bank/payout account, tax PIN  | TTL 1h, incident_id + step-up required

This module owns:
1. The canonical `class_for_field` mapping (single source of truth used by the
   middleware, repos, and any handler that opts an unmasked field into the
   masking pipeline).
2. Idempotent masking helpers — return the masked string given the plaintext;
   used both when a claim is absent (no unmask) and when an unmask flow logs
   the partial render in client telemetry.
3. `check_claim(...)` — the policy oracle. Returns a `ClaimDecision` carrying
   the outcome + reason code; the middleware writes the audit row + raises
   403 on deny outcomes. Centralizing the decision keeps the four denial
   reasons consistent across surfaces.

Step-up requirement (financial): callers pass the timestamp of the most recent
re-authentication (`step_up_verified_at`). The service rejects if the value is
missing or older than `STEP_UP_WINDOW_SECONDS` (5 minutes per §5).

This module never writes to the DB itself — the middleware orchestrates the
audit write so that the audit row is paired with the actual request that
triggered the check (path, surface, actor).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from ..repos import rbac as rbac_repo

PiiClass = Literal["contact", "identity", "financial"]

# Mirrors PII_CLAIM_TTL_SECONDS in packages/shared/src/types.ts.
TTL_SECONDS: dict[PiiClass, int] = {
    "contact": 28800,
    "identity": 14400,
    "financial": 3600,
}

STEP_UP_WINDOW_SECONDS = 300  # ADR 0001 §5

# Field-name → class map. Keys match SQLAlchemy column names + camelCase API
# field names so handlers can pass either form.
_FIELD_CLASS_MAP: dict[str, PiiClass] = {
    # contact
    "phone": "contact",
    "email": "contact",
    "address": "contact",
    "physical_address": "contact",
    "physicalAddress": "contact",
    # identity
    "national_id": "identity",
    "nationalId": "identity",
    "passport": "identity",
    "id_document_uri": "identity",
    "idDocumentUri": "identity",
    "beneficial_ownership_uri": "identity",
    # financial
    "mpesa": "financial",
    "mpesa_number": "financial",
    "mpesaNumber": "financial",
    "payout_account": "financial",
    "payoutAccount": "financial",
    "account_number": "financial",
    "accountNumber": "financial",
    "iban": "financial",
    "tax_pin": "financial",
    "taxPin": "financial",
}


DenialReason = Literal[
    "granted",
    "no_pii_claim",
    "claim_expired",
    "step_up_required",
    "agent_blocked",
]


@dataclass(frozen=True)
class ClaimDecision:
    allowed: bool
    reason: DenialReason
    pii_class: PiiClass


def class_for_field(field_name: str) -> PiiClass | None:
    """Returns the PII class for a known field, or None if not PII-tagged."""
    return _FIELD_CLASS_MAP.get(field_name)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---- Masking helpers --------------------------------------------------------

def mask_phone(value: str | None) -> str:
    if not value:
        return "•••"
    digits = "".join(c for c in value if c.isdigit())
    if len(digits) <= 4:
        return "•" * len(digits)
    return f"••• {digits[-4:]}"


def mask_email(value: str | None) -> str:
    if not value or "@" not in value:
        return "•••"
    local, _, domain = value.partition("@")
    if len(local) <= 1:
        return f"•@{domain}"
    return f"{local[0]}•••@{domain}"


def mask_id(value: str | None) -> str:
    if not value:
        return "•••"
    if len(value) <= 4:
        return "•" * len(value)
    return f"••• {value[-4:]}"


def mask_account(value: str | None) -> str:
    if not value:
        return "•••"
    digits = "".join(c for c in value if c.isalnum())
    if len(digits) <= 4:
        return "•" * len(digits)
    return f"••••{digits[-4:]}"


_MASKERS = {
    "contact": {"phone": mask_phone, "email": mask_email, "address": mask_id},
    "identity": {"default": mask_id},
    "financial": {"default": mask_account},
}


def mask_field(field_name: str, value: str | None) -> str:
    cls = class_for_field(field_name)
    if cls is None:
        return value or ""
    handlers = _MASKERS[cls]
    masker = handlers.get(field_name, handlers.get("default", mask_id))
    return masker(value)


# ---- Policy check -----------------------------------------------------------

async def check_claim(
    session: AsyncSession,
    *,
    subject_kind: Literal["user", "agent", "system"],
    subject_id: str,
    pii_class: PiiClass,
    step_up_verified_at: datetime | None = None,
) -> ClaimDecision:
    """Return whether `subject` may unmask a `pii_class` field right now.

    Outcomes (always one of):
    - granted             — all checks passed
    - agent_blocked       — subject is an agent (ADR 0001 §6, structural)
    - no_pii_claim        — no active rbac_claim matching `pii:view:<class>`
    - claim_expired       — would have matched, but expires_at <= now
                            (note: list_active_scopes already filters these,
                             so callers see `no_pii_claim` for both cases;
                             we surface 'claim_expired' only if a future
                             integrator hands us a pre-fetched claim. Kept
                             in the decision shape for completeness.)
    - step_up_required    — financial class without a fresh step-up token
    """
    if subject_kind == "agent":
        return ClaimDecision(allowed=False, reason="agent_blocked", pii_class=pii_class)

    scope = f"pii:view:{pii_class}"
    scopes = await rbac_repo.list_active_scopes(
        session, subject_kind=subject_kind, subject_id=subject_id
    )
    if scope not in scopes:
        return ClaimDecision(allowed=False, reason="no_pii_claim", pii_class=pii_class)

    if pii_class == "financial":
        if step_up_verified_at is None:
            return ClaimDecision(
                allowed=False, reason="step_up_required", pii_class=pii_class
            )
        # Normalize naive datetimes to UTC for the freshness comparison.
        if step_up_verified_at.tzinfo is None:
            step_up_verified_at = step_up_verified_at.replace(tzinfo=timezone.utc)
        if (_now() - step_up_verified_at) > timedelta(seconds=STEP_UP_WINDOW_SECONDS):
            return ClaimDecision(
                allowed=False, reason="step_up_required", pii_class=pii_class
            )

    return ClaimDecision(allowed=True, reason="granted", pii_class=pii_class)
