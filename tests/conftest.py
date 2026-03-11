"""
Shared pytest fixtures for the NCAA API test suite.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture()
def client():
    """Synchronous test client for the FastAPI app."""
    return TestClient(app)
