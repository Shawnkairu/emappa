"""ConservativeHeaderMiddleware (CR-5 / P0.3.7).

Attaches `request.state.conservative` (a `ConservativeContext` bag)
before the route runs, then — after the response is built — stamps
two headers based on what the route handler pushed onto the bag:

    X-Emappa-Conservative: true|false
    X-Emappa-Conservative-Reasons: <comma-separated reasons>   (when active)

The frontend `<ConservativeBanner>` primitive checks
`X-Emappa-Conservative === 'true'` to render the banner; CR-5 says it
must also disable mutation CTAs while the flag is up.

The header is ALWAYS set (not just when active) so the frontend can
distinguish "endpoint has not been instrumented" (header absent) from
"endpoint computed against good data" (header = false). This is the
no-silent-fallback discipline from CR-8.
"""
from __future__ import annotations

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from ..services.conservative import ConservativeContext

HEADER_FLAG = "X-Emappa-Conservative"
HEADER_REASONS = "X-Emappa-Conservative-Reasons"


class ConservativeHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        ctx = ConservativeContext()
        request.state.conservative = ctx

        response = await call_next(request)

        response.headers[HEADER_FLAG] = "true" if ctx.active else "false"
        if ctx.active:
            response.headers[HEADER_REASONS] = ",".join(ctx.reasons)
        return response
