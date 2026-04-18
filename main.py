"""
NCAA API — FastAPI application entry point.
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
    "http://localhost:8081",  # Default Expo Metro port
    "http://127.0.0.1:8081",
    "http://localhost:19006",  # Common Expo Web port
    "http://10.0.2.2:3000",  # Android Emulator access
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
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 3000)),
        reload="--reload" in sys.argv,
    )


if __name__ == "__main__":
    cli()
