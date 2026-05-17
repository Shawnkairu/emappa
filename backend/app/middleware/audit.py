"""Mutation audit middleware (CR-2 / P0.3.2).

Every state-changing HTTP request (POST/PATCH/PUT/DELETE) flows through
this middleware. Two responsibilities:

1. **Enforce `reason`.** For paths in `AUDIT_REQUIRED_PATHS`, the
   request body must be JSON and must contain a non-empty `reason`
   field. Missing → 400 `{detail: "audit_reason_required"}`.

2. **Expose `request.state.audit`.** A small helper carrying the
   resolved actor (when JWT auth has already run downstream — note
   middleware runs before route handlers, so actor info is filled in
   by the handler), the surface, and the parsed reason. Endpoint
   handlers call `request.state.audit.set_actor(...)` then write rows
   via `repos.audit.log_mutation(...)` using the stashed reason.

`AUDIT_REQUIRED_PATHS` is intentionally empty at P0.3.2 — per-endpoint
adoption is a phase-by-phase rollout starting at P0.3.5 (PII unmask),
P0.3.7 (conservative-default mutations), P1.6.x (resident endpoints),
P2.6.x (homeowner), P3.6.x (BO), and so on. Each phase PR adds its own
path patterns. By P9.1.20 the set must cover every mutation route.

Auth endpoints (`/auth/*`) and webhooks are exempt by design — they
run pre-authentication and have no actor to attribute.

Reads (GET/HEAD/OPTIONS) bypass entirely.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Iterable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

MUTATION_METHODS = frozenset({"POST", "PATCH", "PUT", "DELETE"})

# Paths excluded from reason enforcement even when listed below — pre-auth
# flows and infrastructure pings. Match anywhere in the path.
_EXEMPT_PATH_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^/auth/"),
    re.compile(r"^/health"),
    re.compile(r"^/waitlist"),  # public lead capture; no JWT
    re.compile(r"^/webhooks/"),
)

# Paths that REQUIRE a `reason` body field. Grow this as endpoints
# adopt the CR-2 contract per phase plan.
AUDIT_REQUIRED_PATHS: tuple[re.Pattern[str], ...] = (
    # Populated by later P0.3.x / P1.6.x / ... PRs.
)


@dataclass
class AuditContext:
    """Carried on `request.state.audit` for handlers to consume."""

    surface: str
    reason: str | None = None
    actor_user_id: str | None = None
    actor_kind: str | None = None
    agent_attribution: str | None = None
    # Free-form bag for handlers to stash before/after diffs; the
    # repos.audit.log_mutation call is still the only writer.
    extras: dict[str, object] = field(default_factory=dict)

    def set_actor(
        self,
        *,
        user_id: str | None,
        kind: str,
        agent_attribution: str | None = None,
    ) -> None:
        self.actor_user_id = user_id
        self.actor_kind = kind
        self.agent_attribution = agent_attribution


def _is_exempt(path: str) -> bool:
    return any(p.search(path) for p in _EXEMPT_PATH_PATTERNS)


def _requires_reason(path: str) -> bool:
    return any(p.search(path) for p in AUDIT_REQUIRED_PATHS)


def _resolve_surface(request: Request) -> str:
    # Surface is named by the calling client via header; defaults to "api".
    return request.headers.get("X-Emappa-Surface", "api")


class MutationAuditMiddleware(BaseHTTPMiddleware):
    """Reason enforcement + AuditContext attachment for mutation routes."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        required_paths: Iterable[re.Pattern[str]] | None = None,
    ) -> None:
        super().__init__(app)
        # Allow tests to inject a path set without touching the module-level tuple.
        self._required_paths: tuple[re.Pattern[str], ...] = (
            tuple(required_paths) if required_paths is not None else AUDIT_REQUIRED_PATHS
        )

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ):
        method = request.method.upper()
        path = request.url.path

        if method not in MUTATION_METHODS:
            return await call_next(request)

        surface = _resolve_surface(request)
        ctx = AuditContext(surface=surface)
        reason: str | None = None

        needs_reason = (
            not _is_exempt(path)
            and any(p.search(path) for p in self._required_paths)
        )

        if needs_reason:
            body_bytes = await request.body()
            try:
                body = json.loads(body_bytes) if body_bytes else {}
            except json.JSONDecodeError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "audit_reason_required_invalid_body"},
                )
            if not isinstance(body, dict) or not str(body.get("reason", "")).strip():
                return JSONResponse(
                    status_code=400,
                    content={"detail": "audit_reason_required"},
                )
            reason = str(body["reason"]).strip()
            # Re-attach the body so downstream handlers can still parse it.
            request._body = body_bytes  # type: ignore[attr-defined]

        ctx.reason = reason
        request.state.audit = ctx
        return await call_next(request)
