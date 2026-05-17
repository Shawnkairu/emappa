"""P0.3.6 — RBAC-scoped queue filter middleware tests.

Two layers:

1. `compile_queue_scope` pure function — drives the scope-string parser
   with hand-built scope lists. Fast, no DB.

2. `get_queue_scope(kind)` dependency — mounted on a tiny route, drives
   the full path via verify-otp → JWT → user fetch → live rbac_claim
   read. Confirms the DI plumbing actually compiles a non-empty scope
   when a matching claim exists.
"""
from __future__ import annotations

import uuid

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.db.session import SessionLocal, engine
from app.middleware.rbac_scope import (
    QUEUE_KINDS,
    QueueScope,
    compile_queue_scope,
    get_queue_scope,
)
from app.repos import rbac as rbac_repo


# ---- parser unit tests ------------------------------------------------------

def test_no_scopes_returns_empty():
    s = compile_queue_scope("drs", [])
    assert s == QueueScope(kind="drs")
    assert not s.grants_any
    assert not s.unrestricted


def test_unrelated_scopes_ignored():
    s = compile_queue_scope("drs", ["pii:view:contact", "settlement:run", "queue:lbrs"])
    assert not s.grants_any


def test_bare_queue_scope_is_unrestricted():
    s = compile_queue_scope("drs", ["queue:drs"])
    assert s.grants_any
    assert s.unrestricted
    assert s.jurisdictions == frozenset()
    assert s.severity_ceiling is None


def test_jurisdiction_qualifier_narrows():
    s = compile_queue_scope("drs", ["queue:drs:jurisdiction:KE"])
    assert s.grants_any
    assert not s.unrestricted
    assert s.jurisdictions == frozenset({"KE"})


def test_multiple_jurisdiction_grants_union():
    s = compile_queue_scope(
        "lbrs",
        ["queue:lbrs:jurisdiction:KE", "queue:lbrs:jurisdiction:TZ"],
    )
    assert s.jurisdictions == frozenset({"KE", "TZ"})


def test_severity_qualifier_takes_most_permissive():
    s = compile_queue_scope(
        "lbrs",
        ["queue:lbrs:severity:warning", "queue:lbrs:severity:critical"],
    )
    assert s.severity_ceiling == "critical"


def test_unrestricted_wipes_qualifiers():
    s = compile_queue_scope(
        "drs",
        ["queue:drs:jurisdiction:KE", "queue:drs:severity:warning", "queue:drs"],
    )
    assert s.unrestricted
    assert s.jurisdictions == frozenset()
    assert s.severity_ceiling is None


def test_admits_jurisdiction_unrestricted():
    s = compile_queue_scope("drs", ["queue:drs"])
    assert s.admits_jurisdiction("KE")
    assert s.admits_jurisdiction(None)
    assert s.admits_jurisdiction("TZ")


def test_admits_jurisdiction_filtered():
    s = compile_queue_scope("drs", ["queue:drs:jurisdiction:KE"])
    assert s.admits_jurisdiction("KE")
    assert not s.admits_jurisdiction("TZ")
    assert not s.admits_jurisdiction(None)


def test_admits_severity_within_ceiling():
    s = compile_queue_scope("lbrs", ["queue:lbrs:severity:warning"])
    assert s.admits_severity("info")
    assert s.admits_severity("warning")
    assert not s.admits_severity("critical")


def test_admits_severity_when_ceiling_none():
    s = compile_queue_scope("lbrs", ["queue:lbrs"])
    assert s.admits_severity("page")


def test_no_grants_admits_nothing():
    s = compile_queue_scope("drs", [])
    assert not s.admits_jurisdiction("KE")
    assert not s.admits_severity("info")


@pytest.mark.parametrize("kind", sorted(QUEUE_KINDS))
def test_every_queue_kind_round_trips_unrestricted(kind):
    s = compile_queue_scope(kind, [f"queue:{kind}"])
    assert s.unrestricted


def test_unknown_kind_rejected():
    with pytest.raises(ValueError, match="unknown queue kind"):
        get_queue_scope("not_a_queue")  # type: ignore[arg-type]


# ---- dependency integration -------------------------------------------------

def _make_app() -> FastAPI:
    from app.main import app as real_app

    sub = FastAPI()

    @sub.get("/__test/queues/drs")
    async def drs_endpoint(scope: QueueScope = Depends(get_queue_scope("drs"))):
        return {
            "grants_any": scope.grants_any,
            "unrestricted": scope.unrestricted,
            "jurisdictions": sorted(scope.jurisdictions),
            "severity_ceiling": scope.severity_ceiling,
        }

    real_app.include_router(sub.router)
    return real_app


@pytest.fixture
async def queue_client():
    app = _make_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


def _email(label: str) -> str:
    return f"queue-{label}-{uuid.uuid4().hex[:8]}@emappa.test"


async def _login_admin(client: AsyncClient, email: str) -> tuple[str, uuid.UUID]:
    r = await client.post(
        "/auth/verify-otp", json={"email": email, "code": "000000"}
    )
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    user_id = uuid.UUID(r.json()["user"]["id"])
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE users SET role='admin' WHERE id=:id"), {"id": user_id}
        )
    return token, user_id


async def test_user_with_no_claim_returns_empty_scope(queue_client):
    token, _ = await _login_admin(queue_client, _email("none"))
    r = await queue_client.get(
        "/__test/queues/drs", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["grants_any"] is False
    assert body["unrestricted"] is False


async def test_user_with_bare_queue_scope_is_unrestricted(queue_client):
    token, user_id = await _login_admin(queue_client, _email("full"))
    async with SessionLocal() as session:
        await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=str(user_id),
            scope="queue:drs",
            granted_by=user_id,
            reason="ops grant",
            ttl_seconds=3600,
        )
        await session.commit()
    r = await queue_client.get(
        "/__test/queues/drs", headers={"Authorization": f"Bearer {token}"}
    )
    body = r.json()
    assert body["grants_any"] is True
    assert body["unrestricted"] is True


async def test_user_with_jurisdiction_qualifier_compiled(queue_client):
    token, user_id = await _login_admin(queue_client, _email("ke"))
    async with SessionLocal() as session:
        await rbac_repo.grant_claim(
            session,
            subject_kind="user",
            subject_id=str(user_id),
            scope="queue:drs:jurisdiction:KE",
            granted_by=user_id,
            reason="ke ops",
            ttl_seconds=3600,
        )
        await session.commit()
    r = await queue_client.get(
        "/__test/queues/drs", headers={"Authorization": f"Bearer {token}"}
    )
    body = r.json()
    assert body["grants_any"] is True
    assert body["unrestricted"] is False
    assert body["jurisdictions"] == ["KE"]
