"""
Tests for the router auto-discovery mechanism.
"""

from __future__ import annotations

from fastapi import APIRouter

from api import discover_routers


def test_discover_routers_returns_list():
    routers = discover_routers()
    assert isinstance(routers, list)
    assert len(routers) > 0


def test_all_discovered_are_api_routers():
    for r in discover_routers():
        assert isinstance(r, APIRouter)


def test_expected_routes_present(client):
    """The app should have routes for each auto-discovered module."""
    routes = [r.path for r in client.app.routes]
    # Spot-check a few key paths.
    assert "/api/march-madness/brackets" in routes
    assert "/api/game/basketball-college/{event_id}" in routes
    assert "/api/golf/pga/scoreboard" in routes
    assert "/api/golf/pga/summary/{event_id}" in routes
