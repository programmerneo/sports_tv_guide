"""
Auto-discovery of FastAPI routers.

Every Python module in the ``api/`` package that exposes a module-level
``router`` attribute (an ``APIRouter`` instance) is automatically imported
and included in the application — no manual registration required.

To add a new endpoint group:
    1. Create ``api/my_feature.py``
    2. Define ``router = APIRouter(tags=["my_feature"])``
    3. Add your ``@router.get(...)`` / ``@router.post(...)`` handlers
    4. Done — it will be picked up on the next server start.
"""

from __future__ import annotations

import importlib
import pkgutil
from pathlib import Path

from fastapi import APIRouter


def discover_routers() -> list[APIRouter]:
    """Scan this package for modules that expose an ``APIRouter``."""
    routers: list[APIRouter] = []
    package_dir = Path(__file__).resolve().parent

    for module_info in pkgutil.iter_modules([str(package_dir)]):
        module = importlib.import_module(f"{__name__}.{module_info.name}")
        obj = getattr(module, "router", None)
        if isinstance(obj, APIRouter):
            routers.append(obj)

    return routers
