"""Email-OTP auth endpoints. Pilot mode — see docs/PILOT_SCOPE.md §1."""
from __future__ import annotations

import re
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

# Loose email validator that accepts dev .test TLDs which Pydantic's EmailStr
# rejects as reserved-use. Per RFC the format check is purely structural.
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_DEV_SEED_OTP = "000000"

from ..config import get_settings
from ..db.session import get_session
from ..middleware.jwt import get_current_user
from ..models.user import User
from ..repos import otp as otp_repo
from ..repos import users as users_repo
from ..services.email import send_otp_email
from ..services.jwt import issue_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _serialize_user(user: User) -> dict:
    """Wire shape matches packages/shared/src/types.ts `User`.

    Fields kept in sync with the shared type via P1.6.1 verification — adding a
    field here without updating the shared type breaks the type contract
    locked in P0.0.4.
    """
    return {
        "id": str(user.id),
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "businessType": user.business_type,
        "buildingId": str(user.building_id) if user.building_id else None,
        "onboardingComplete": bool(user.onboarding_complete),
        "displayName": user.display_name,
        "profile": dict(user.profile or {}),
        "createdAt": (user.created_at or datetime.now(timezone.utc)).isoformat(),
        "lastSeenAt": user.last_seen_at.isoformat() if user.last_seen_at else None,
    }


class RequestOtpBody(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v.strip()):
            raise ValueError("invalid email")
        return v.strip()


class VerifyOtpBody(BaseModel):
    email: str
    code: str = Field(min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v.strip()):
            raise ValueError("invalid email")
        return v.strip()


@router.post("/request-otp")
async def request_otp(
    body: RequestOtpBody,
    session: AsyncSession = Depends(get_session),
):
    email = body.email.lower().strip()

    # Rate limit: max 3 codes per email per 10 min
    recent = await otp_repo.recent_count(session, email)
    if recent >= otp_repo.RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited"
        )

    code = f"{secrets.randbelow(1_000_000):06d}"
    await otp_repo.create_code(session, email, code)
    await session.commit()

    try:
        await send_otp_email(email, code)
    except Exception:
        # Email delivery failure: still return 200; the dev console fallback
        # is the safety net. Production failure is captured by Sentry separately.
        pass

    return {"ok": True}


@router.post("/verify-otp")
async def verify_otp(
    body: VerifyOtpBody,
    session: AsyncSession = Depends(get_session),
):
    email = body.email.lower().strip()
    dev_seed_bypass = _allows_dev_seed_otp(email, body.code)

    if not dev_seed_bypass:
        record = await otp_repo.get_active_for_email(session, email)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_code"
            )

        if otp_repo.is_expired(record):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="expired")

        if otp_repo.is_locked_out(record):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="too_many_attempts"
            )

        if record.code_hash != otp_repo.hash_code(body.code):
            await otp_repo.increment_attempts(session, record)
            await session.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_code"
            )

        await otp_repo.consume_code(session, record)

    # Fetch or auto-provision the user. Auto-provisioning is allowed for the pilot;
    # in production the post-OTP step would require a sign-up form.
    user = await users_repo.get_by_email(session, email)
    if user is None:
        # New user: default to resident with onboarding pending. They pick role
        # next via the (auth)/role-select screen, which calls /me/onboarding-complete.
        user = await users_repo.create(
            session, email=email, role="resident", onboarding_complete=False
        )
    await users_repo.touch_last_seen(session, user.id)
    await session.commit()

    token = issue_token(user)
    return {"token": token, "user": _serialize_user(user)}


def _allows_dev_seed_otp(email: str, code: str) -> bool:
    """Allow stable smoke-test login for seeded pilot accounts in dev only."""

    settings = get_settings()
    return (
        settings.allow_dev_otp_console
        and email.endswith("@emappa.test")
        and code == _DEV_SEED_OTP
    )


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return _serialize_user(user)
