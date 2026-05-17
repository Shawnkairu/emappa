"""P0.3.2 — MutationAuditMiddleware unit tests.

Verifies the middleware in isolation (no DB) using a tiny FastAPI app
with a hand-injected required-paths set, so these tests are independent
of which production routes have been enrolled into AUDIT_REQUIRED_PATHS.
"""
from __future__ import annotations

import re

import pytest
from fastapi import FastAPI, Request
from httpx import ASGITransport, AsyncClient

from app.middleware.audit import MutationAuditMiddleware


def _make_app(required: tuple[re.Pattern[str], ...]) -> FastAPI:
    app = FastAPI()
    app.add_middleware(MutationAuditMiddleware, required_paths=required)

    @app.get("/widgets")
    async def list_widgets():
        return {"ok": True}

    @app.post("/widgets")
    async def create_widget(req: Request):
        ctx = req.state.audit
        return {
            "reason": ctx.reason,
            "surface": ctx.surface,
        }

    @app.post("/auth/login")
    async def login():
        # exempt — middleware must NOT require reason here
        return {"ok": True}

    return app


@pytest.fixture
def client_required():
    app = _make_app((re.compile(r"^/widgets$"),))
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://t")


@pytest.fixture
def client_unrestricted():
    return AsyncClient(
        transport=ASGITransport(app=_make_app(())),
        base_url="http://t",
    )


async def test_get_bypasses_middleware(client_required):
    async with client_required as c:
        r = await c.get("/widgets")
    assert r.status_code == 200


async def test_post_without_reason_rejected_when_required(client_required):
    async with client_required as c:
        r = await c.post("/widgets", json={"name": "x"})
    assert r.status_code == 400
    assert r.json()["detail"] == "audit_reason_required"


async def test_post_with_blank_reason_rejected(client_required):
    async with client_required as c:
        r = await c.post("/widgets", json={"name": "x", "reason": "   "})
    assert r.status_code == 400


async def test_post_with_reason_passes_and_stashes_context(client_required):
    async with client_required as c:
        r = await c.post(
            "/widgets",
            json={"name": "x", "reason": "ops triage"},
            headers={"X-Emappa-Surface": "cockpit"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["reason"] == "ops triage"
    assert body["surface"] == "cockpit"


async def test_auth_paths_exempt_even_when_required(client_required):
    async with client_required as c:
        # /auth/login is in the exemption regex; reason not required
        r = await c.post("/auth/login", json={"email": "a@b"})
    assert r.status_code == 200


async def test_unrestricted_post_does_not_require_reason(client_unrestricted):
    async with client_unrestricted as c:
        r = await c.post("/widgets", json={"name": "x"})
    assert r.status_code == 200
    # context is still attached, just with reason=None
    assert r.json()["reason"] is None


async def test_invalid_json_body_rejected_with_clear_error(client_required):
    async with client_required as c:
        r = await c.post(
            "/widgets",
            content=b"{not json",
            headers={"Content-Type": "application/json"},
        )
    assert r.status_code == 400
    assert "audit_reason_required" in r.json()["detail"]
