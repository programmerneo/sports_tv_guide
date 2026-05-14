"""
NCAA API — FastAPI application entry point.
"""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from api import discover_routers
from config import settings
from utils.client import close_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hook."""
    yield
    await close_client()


app = FastAPI(
    title="NCAA API",
    version="0.1.0",
    lifespan=lifespan,
)

# --- BETTER CORS SOLUTION ---
# Define allowed origins explicitly.
# This covers Localhost (Web), 10.0.2.2 (Android Emulator), and common Expo ports.
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
    "http://10.0.2.2:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Or use allow_origin_regex if you want to be very flexible in dev:
    # allow_origin_regex=r"http://(localhost|127\.0\.0\.1|10\.0\.2\.2):.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -----------------------------

for _router in discover_routers():
    app.include_router(_router, prefix="/api")


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


def cli() -> None:
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload="--reload" in sys.argv,
    )


if __name__ == "__main__":
    cli()
