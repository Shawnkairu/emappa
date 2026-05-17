"""P0.3.7 — conservative-by-default service + header middleware.

Two layers:

1. Pure service tests (`is_degraded`, `is_conservative`, `reasons_for`,
   `ConservativeContext.flag*`).
2. Header middleware end-to-end — mount a tiny route that either does
   nothing OR pushes a reason onto `request.state.conservative`, then
   assert the response headers reflect that choice. Also asserts the
   header is set on EVERY response from the production app (`/health`).
"""
from __future__ import annotations

import pytest
from fastapi import FastAPI, Request
from httpx import ASGITransport, AsyncClient

from app.main import app as production_app
from app.middleware.conservative import (
    HEADER_FLAG,
    HEADER_REASONS,
    ConservativeHeaderMiddleware,
)
from app.services import conservative as cons


# ---- service ---------------------------------------------------------------

@pytest.mark.parametrize(
    "flag,expected",
    [
        ("verified", False),
        ("estimated", False),
        ("missing", True),
        ("delayed", True),
        ("disputed", True),
        ("conservative", True),
        (None, False),
        ("unknown_value", False),
    ],
)
def test_is_degraded(flag, expected):
    assert cons.is_degraded(flag) is expected


def test_is_conservative_empty_iterable_is_false():
    assert cons.is_conservative([]) is False


def test_is_conservative_any_degraded_returns_true():
    assert cons.is_conservative(["verified", "estimated", "missing"]) is True


def test_is_conservative_all_clean_returns_false():
    assert cons.is_conservative(["verified", "verified", "estimated"]) is False


def test_reasons_for_dedupes_and_preserves_order():
    out = cons.reasons_for(["verified", "missing", "delayed", "missing"])
    assert out == ["missing", "delayed"]


def test_context_flag_dedupes():
    ctx = cons.ConservativeContext()
    ctx.flag("reading_gap")
    ctx.flag("reading_gap")
    ctx.flag("reading_gap")
    assert ctx.reasons == ["reading_gap"]
    assert ctx.active


def test_context_flag_quality_ignores_clean_flag():
    ctx = cons.ConservativeContext()
    ctx.flag_quality("verified")
    ctx.flag_quality("estimated")
    ctx.flag_quality(None)
    assert not ctx.active


def test_context_flag_quality_records_degraded_only():
    ctx = cons.ConservativeContext()
    ctx.flag_quality("missing")
    ctx.flag_qualities(["verified", "disputed", "delayed", "missing"])
    assert ctx.active
    assert ctx.reasons == [
        "data_quality:missing",
        "data_quality:disputed",
        "data_quality:delayed",
    ]


# ---- middleware ------------------------------------------------------------

def _make_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(ConservativeHeaderMiddleware)

    @app.get("/clean")
    async def clean():
        return {"ok": True}

    @app.get("/dirty")
    async def dirty(request: Request):
        request.state.conservative.flag("test_reason")
        request.state.conservative.flag_quality("missing")
        return {"ok": True}

    return app


@pytest.fixture
async def test_client():
    async with AsyncClient(
        transport=ASGITransport(app=_make_app()), base_url="http://t"
    ) as ac:
        yield ac


async def test_clean_endpoint_emits_false_header(test_client):
    r = await test_client.get("/clean")
    assert r.headers.get(HEADER_FLAG) == "false"
    assert HEADER_REASONS not in r.headers


async def test_dirty_endpoint_emits_true_header_with_reasons(test_client):
    r = await test_client.get("/dirty")
    assert r.headers.get(HEADER_FLAG) == "true"
    reasons = r.headers.get(HEADER_REASONS, "").split(",")
    assert "test_reason" in reasons
    assert "data_quality:missing" in reasons


@pytest.fixture
async def prod_client():
    async with AsyncClient(
        transport=ASGITransport(app=production_app), base_url="http://test"
    ) as ac:
        yield ac


async def test_production_app_emits_header_on_health_endpoint(prod_client):
    """Per CR-8 — the header is set on EVERY response so the frontend
    can tell 'instrumented + clean' from 'not instrumented'."""
    r = await prod_client.get("/health")
    assert r.status_code == 200
    assert r.headers.get(HEADER_FLAG) == "false"
