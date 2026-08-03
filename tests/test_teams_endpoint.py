"""Endpoint-level tests for GET /api/teams/{sport}."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from services.teams_service import TeamsService


def test_teams_route_returns_expected_shape(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """A supported sport returns 200 with sport + teams."""

    async def _fake_list_teams(sport: str) -> dict:
        return {
            "sport": sport,
            "teams": [
                {
                    "id": "22",
                    "name": "Arizona Cardinals",
                    "abbreviation": "ARI",
                    "logo": "https://example.com/ari.png",
                },
            ],
        }

    monkeypatch.setattr(TeamsService, "list_teams", _fake_list_teams)

    resp = client.get("/api/teams/nfl")

    assert resp.status_code == 200
    body = resp.json()
    assert body["sport"] == "nfl"
    assert body["teams"][0]["abbreviation"] == "ARI"


def test_teams_route_unsupported_sport_returns_404(client: TestClient) -> None:
    """An unsupported sport path has no matching route, so FastAPI 404s."""
    resp = client.get("/api/teams/not-a-sport")

    assert resp.status_code == 404
