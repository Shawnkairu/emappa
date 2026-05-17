"""FastAPI app — wiring."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import (
    auth,
    buildings,
    discover,
    drs,
    electricians,
    energy,
    financiers,
    geocode,
    health,
    homeowner,
    me,
    ownership,
    pledges,
    prepaid,
    projects,
    providers,
    residents,
    roles,
    settlement,
    tokens,
    waitlist,
    wallet,
    websocket,
)
from .config import get_settings
from .middleware.audit import MutationAuditMiddleware
from .middleware.conservative import ConservativeHeaderMiddleware

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")
# Starlette wraps last-added as outermost. ConservativeHeader needs to
# be outermost so it can stamp X-Emappa-Conservative on EVERY response,
# including ones short-circuited by inner middleware (CR-8).
app.add_middleware(MutationAuditMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ConservativeHeaderMiddleware)

for router in [
    health.router,
    auth.router,
    me.router,
    roles.router,
    projects.router,
    buildings.router,
    energy.router,
    discover.router,
    waitlist.router,
    geocode.router,
    prepaid.router,
    pledges.router,
    tokens.router,
    drs.router,
    settlement.router,
    ownership.router,
    providers.router,
    residents.router,
    homeowner.router,
    electricians.router,
    financiers.router,
    wallet.router,
    websocket.router,
]:
    app.include_router(router)
