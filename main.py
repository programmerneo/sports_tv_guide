"""
NCAA API — FastAPI application entry point.

Routers are auto-discovered from the ``api/`` package: any module in that
directory that exposes a ``router`` attribute (an ``APIRouter``) is
automatically included.  To add a new endpoint group, simply create a new
file in ``api/`` — no changes here are needed.
"""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from api import discover_routers
from utils.client import close_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hook — tears down the shared HTTP client."""
    yield
    await close_client()


app = FastAPI(
    title="NCAA API",
    description=(
        "API to return consumable data from ncaa.com.\n\n"
        "Python port using FastAPI. Routers are auto-discovered from the "
        "`api/` package."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── Register all auto-discovered routers ──────────────────────────────────
for _router in discover_routers():
    app.include_router(_router, prefix="/api")


# ── Root redirect ─────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


# ── CLI entry point (used by ``uv run ncaa-api``) ────────────────────────
def cli() -> None:
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 3000)),
        reload="--reload" in sys.argv,
    )


if __name__ == "__main__":
    cli()
