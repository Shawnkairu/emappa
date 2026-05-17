"""/homeowner/{user_id}/* endpoints — Scenario C homeowner-flow backend.

Endpoints landing in P2.6.x:

- POST /homeowner/{user_id}/authority-docs   — title/lease + supporting docs (§6 step 5) ← THIS PR
- POST /homeowner/{user_id}/utility-context  — KPLC meter/photos (§6 step 6)
- POST /homeowner/{user_id}/site-preview     — photos + access notes (§6 step 8)
- POST /homeowner/{user_id}/initiate-project — DRS start gate (§6 step 10)
- GET  /homeowner/{user_id}/lbrs             — LBRS view (§10)

Scope policy (parity with /residents/*):
- Any user can read or write their OWN /homeowner/{user_id}/*.
- Admins can read or write any user's.
- All other cross-user access → 403 not_your_resource.

Mutations write audit rows via repos.audit.log_mutation with required
reason per CR-2. The middleware AUDIT_REQUIRED_PATHS enrolment runs the
reason check BEFORE the handler (belt + suspenders against pydantic-drift).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from ..middleware.jwt import get_current_user
from ..models.homeowner_authority import HomeownerAuthority
from ..models.user import User
from ..repos import audit as audit_repo
from ..repos import homeowner_authority as ha_repo
from ..repos import users as users_repo

router = APIRouter(prefix="/homeowner", tags=["homeowner"])


def _parse_user_id(raw: str) -> uuid.UUID:
    try:
        return uuid.UUID(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_user_id")


def _check_scope(actor: User, target_user_id: uuid.UUID) -> None:
    if actor.role == "admin":
        return
    if actor.id != target_user_id:
        raise HTTPException(status_code=403, detail="not_your_resource")


def _serialize_authority(row: HomeownerAuthority) -> dict:
    return {
        "id": str(row.id),
        "userId": str(row.user_id),
        "titleUrl": row.title_url,
        "leaseUrl": row.lease_url,
        "ownerAuthorizationUrl": row.owner_authorization_url,
        "utilityAccountEvidenceUrl": row.utility_account_evidence_url,
        "nationalIdUrl": row.national_id_url,
        "siteInspectionConsentUrl": row.site_inspection_consent_url,
        "status": row.status,
        "reviewNotes": row.review_notes,
        "submittedAt": (row.submitted_at or datetime.utcnow()).isoformat(),
        "reviewedAt": row.reviewed_at.isoformat() if row.reviewed_at else None,
        "reviewedByUserId": (
            str(row.reviewed_by_user_id) if row.reviewed_by_user_id else None
        ),
    }


# ---- P2.6.1 — POST /homeowner/{user_id}/authority-docs ----------------------


class AuthorityDocsBody(BaseModel):
    title_url: str | None = Field(default=None, alias="titleUrl")
    lease_url: str | None = Field(default=None, alias="leaseUrl")
    owner_authorization_url: str | None = Field(
        default=None, alias="ownerAuthorizationUrl"
    )
    utility_account_evidence_url: str | None = Field(
        default=None, alias="utilityAccountEvidenceUrl"
    )
    national_id_url: str | None = Field(default=None, alias="nationalIdUrl")
    site_inspection_consent_url: str | None = Field(
        default=None, alias="siteInspectionConsentUrl"
    )
    reason: str = Field(min_length=1, description="Required for audit (CR-2)")

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def at_least_one_ownership_proof(self) -> "AuthorityDocsBody":
        # Doctrine: Scenario C §6 step 5 + A.7 case 1 — without title /
        # lease / owner-authorization we have no claim that this homeowner
        # controls the property, so the submission is incomplete. Pydantic
        # rejects at 422 BEFORE the repo would; both layers enforce the
        # same rule.
        if not any(
            (
                self.title_url,
                self.lease_url,
                self.owner_authorization_url,
            )
        ):
            raise ValueError(
                "at_least_one_of_title_lease_or_owner_authorization_required"
            )
        return self


@router.post("/{user_id}/authority-docs", status_code=status.HTTP_201_CREATED)
async def submit_authority_docs(
    user_id: str,
    body: AuthorityDocsBody,
    request: Request,
    actor: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    target = _parse_user_id(user_id)
    _check_scope(actor, target)

    # Doctrine: this endpoint is for homeowners (and admins acting on their
    # behalf). Other roles should not be writing into the homeowner_authority
    # table — they have no property to claim. A self-write actor must have
    # role='homeowner'; admin-on-behalf-of is unrestricted.
    if actor.role != "admin" and actor.role != "homeowner":
        raise HTTPException(
            status_code=403, detail="only_homeowners_or_admins"
        )

    row = await ha_repo.submit(
        session,
        user_id=target,
        title_url=body.title_url,
        lease_url=body.lease_url,
        owner_authorization_url=body.owner_authorization_url,
        utility_account_evidence_url=body.utility_account_evidence_url,
        national_id_url=body.national_id_url,
        site_inspection_consent_url=body.site_inspection_consent_url,
    )
    await audit_repo.log_mutation(
        session,
        actor_user_id=actor.id,
        actor_kind="user",
        action="homeowner.authority_docs.submit",
        target_type="homeowner_authority",
        target_id=str(row.id),
        before=None,
        after={
            "user_id": str(target),
            "has_title": body.title_url is not None,
            "has_lease": body.lease_url is not None,
            "has_owner_authorization": body.owner_authorization_url is not None,
            "has_utility_evidence": body.utility_account_evidence_url is not None,
            "has_national_id": body.national_id_url is not None,
            "has_site_consent": body.site_inspection_consent_url is not None,
        },
        reason=body.reason,
        surface=request.headers.get("X-Emappa-Surface", "api"),
    )
    await session.commit()
    return {"authority": _serialize_authority(row)}


# ---- P2.6.2 — POST /homeowner/{user_id}/utility-context ---------------------
#
# Storage: user.profile['utilityContext'] JSONB sub-key. No dedicated table —
# BUILD_PLAN lists no migration for this step, the data is per-homeowner
# free-form context (not transactional ledger), and the audit_log captures
# the change history. Same pattern P1.6.1 established for the resident
# `profile` field.

_METER_TYPES = ("prepaid", "postpaid", "unknown")


class UtilityContextBody(BaseModel):
    meter_type: Literal["prepaid", "postpaid", "unknown"] = Field(alias="meterType")
    meter_number: str | None = Field(default=None, alias="meterNumber")
    meter_area_photo_urls: list[str] = Field(
        default_factory=list, alias="meterAreaPhotoUrls"
    )
    db_photo_urls: list[str] = Field(default_factory=list, alias="dbPhotoUrls")
    monthly_spend_kes: float | None = Field(
        default=None, ge=0, alias="monthlySpendKes"
    )
    prepaid_usage_pattern: str | None = Field(
        default=None, alias="prepaidUsagePattern"
    )
    reason: str = Field(min_length=1, description="Required for audit (CR-2)")

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def meter_number_required_for_known_meter(self) -> "UtilityContextBody":
        # Doctrine: a 'prepaid' or 'postpaid' meter_type without a meter_number
        # is meaningless — the meter can't be looked up against KPLC. 'unknown'
        # is allowed without a number (e.g. fresh build with no meter yet).
        if self.meter_type in ("prepaid", "postpaid") and not (
            self.meter_number and self.meter_number.strip()
        ):
            raise ValueError(
                "meter_number_required_when_meter_type_is_prepaid_or_postpaid"
            )
        # Same scope rule for prepaid_usage_pattern — only meaningful for prepaid.
        # Don't reject; just silently ignore in storage if irrelevant (less
        # client-side friction than a 4xx for a misplaced optional field).
        return self


def _serialize_utility_context(profile: dict[str, Any]) -> dict | None:
    """Pull the utilityContext sub-key out of a user's profile JSONB."""
    if not isinstance(profile, dict):
        return None
    ctx = profile.get("utilityContext")
    return ctx if isinstance(ctx, dict) else None


@router.post("/{user_id}/utility-context", status_code=status.HTTP_201_CREATED)
async def submit_utility_context(
    user_id: str,
    body: UtilityContextBody,
    request: Request,
    actor: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    target = _parse_user_id(user_id)
    _check_scope(actor, target)

    if actor.role != "admin" and actor.role != "homeowner":
        raise HTTPException(
            status_code=403, detail="only_homeowners_or_admins"
        )

    target_user = await users_repo.get_by_id(session, target)
    if target_user is None:
        raise HTTPException(status_code=404, detail="user_not_found")

    # Merge into existing profile JSONB so other onboarding-step keys
    # (e.g. apartmentLabel from P1, future siteContext from P2.6.3) survive.
    merged: dict[str, Any] = dict(target_user.profile or {})
    before_ctx = _serialize_utility_context(merged)
    new_ctx: dict[str, Any] = {
        "meterType": body.meter_type,
        "meterNumber": body.meter_number,
        "meterAreaPhotoUrls": list(body.meter_area_photo_urls),
        "dbPhotoUrls": list(body.db_photo_urls),
        "monthlySpendKes": body.monthly_spend_kes,
        "prepaidUsagePattern": (
            body.prepaid_usage_pattern if body.meter_type == "prepaid" else None
        ),
        "capturedAt": datetime.utcnow().isoformat(),
    }
    merged["utilityContext"] = new_ctx

    await session.execute(
        update(User).where(User.id == target).values(profile=merged)
    )
    await audit_repo.log_mutation(
        session,
        actor_user_id=actor.id,
        actor_kind="user",
        action="homeowner.utility_context.submit",
        target_type="user",
        target_id=str(target),
        before={"utilityContext": before_ctx},
        after={"utilityContext": new_ctx},
        reason=body.reason,
        surface=request.headers.get("X-Emappa-Surface", "api"),
    )
    await session.commit()
    return {"utilityContext": new_ctx}
