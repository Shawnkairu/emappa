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

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from ..middleware.jwt import get_current_user
from ..models.homeowner_authority import HomeownerAuthority
from ..models.user import User
from ..repos import audit as audit_repo
from ..repos import homeowner_authority as ha_repo

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
