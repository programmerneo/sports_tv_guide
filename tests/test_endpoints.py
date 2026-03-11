"""
Smoke tests for API endpoints using the FastAPI test client.

These tests verify that routes are reachable and return the correct status
codes.  They hit the real NCAA upstream, so they may be slow or flaky in
CI — mark with ``@pytest.mark.integration`` if you want to skip them in
fast runs.
"""

from __future__ import annotations


def test_root_redirects_to_docs(client):
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code in (301, 302, 307)
    assert "/docs" in resp.headers.get("location", "")


def test_unknown_route_returns_404(client):
    resp = client.get("/this-does-not-exist")
    assert resp.status_code == 404
