"""PII view-claim enforcement (ADR 0001 / CR-3).

Provides `require_pii_view(pii_class)` — a FastAPI dependency factory that
endpoints attach to any route serving unmasked PII. Behavior:

1. Calls `services.pii.check_claim(...)` for the current user + class.
2. Writes a row to `audit_log` for every attempt — granted AND denied — so
   the regulator-facing audit story is complete (per ADR 0001 §4 "audit log
   captures every grant + every denial + every unmask attempt").
3. On `granted`, returns the user (so the route handler can keep working).
4. On any denial, raises HTTP 403 with a structured `detail` carrying the
   reason code. The matching audit row is still written first.

Step-up freshness for `financial`: handlers pass the timestamp of the most
recent re-authentication via the `X-Emappa-StepUp-At` header (ISO 8601). The
dedicated step-up endpoint that ISSUES this header lands in a later phase;
for now the header is the contract and tests inject it directly.

This dependency does NOT mask the response body — the route handler is still
responsible for returning unmasked vs masked fields based on whether the
dependency raised. The pattern is: attach `require_pii_view('identity')` to
the unmask endpoint; for partial-mask responses, call `services.pii.check_claim`
directly and call `services.pii.mask_field` for any class that came back
denied.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from ..middleware.jwt import get_current_user
from ..models.user import User
from ..repos import audit as audit_repo
from ..services import pii as pii_service

PiiClass = Literal["contact", "identity", "financial"]

_STEP_UP_HEADER = "X-Emappa-StepUp-At"


def _parse_step_up(request: Request) -> datetime | None:
    raw = request.headers.get(_STEP_UP_HEADER)
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def require_pii_view(pii_class: PiiClass):
    """Returns a FastAPI dependency that enforces the PII view-claim.

    Use:

        @router.get("/admin/users/{id}/unmask")
        async def unmask(id: str, _=Depends(require_pii_view("identity")), ...):
            ...
    """

    async def _dep(
        request: Request,
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session),
    ) -> User:
        decision = await pii_service.check_claim(
            session,
            subject_kind="user",
            subject_id=str(user.id),
            pii_class=pii_class,
            step_up_verified_at=_parse_step_up(request),
        )

        # CR-2 / ADR 0001 §4: every unmask attempt — granted or denied —
        # writes a row. Surface defaults to the calling client's header.
        surface = request.headers.get("X-Emappa-Surface", "api")
        await audit_repo.log_mutation(
            session,
            actor_user_id=user.id,
            actor_kind="user",
            action=f"pii:unmask:{pii_class}",
            target_type="pii_claim_check",
            target_id=str(user.id),
            before=None,
            after={
                "pii_class": pii_class,
                "granted": decision.allowed,
                "reason": decision.reason,
            },
            reason=f"pii unmask attempt ({decision.reason})",
            surface=surface,
        )
        await session.commit()

        if not decision.allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "pii_view_denied", "reason": decision.reason},
            )
        return user

    return _dep
