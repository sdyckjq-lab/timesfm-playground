import asyncio
from contextlib import asynccontextmanager
from io import BytesIO

import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient

from main import app, load_model_on_startup
from model import model
from parser import MAX_FILE_SIZE


class MockForecastBackend:
    def forecast(self, horizon: int, inputs: list[np.ndarray]) -> tuple[np.ndarray, np.ndarray]:
        base = np.asarray(inputs[0], dtype=np.float32)
        start = float(base[-1])
        point = np.array(
            [[start + step + 1 for step in range(horizon)]],
            dtype=np.float32,
        )
        quantiles = np.zeros((1, horizon, 10), dtype=np.float32)
        quantiles[0, :, 0] = point[0]
        for index in range(1, 10):
            quantiles[0, :, index] = point[0] - 0.5 + (index * 0.1)
        return point, quantiles


def make_csv(rows: int = 24) -> bytes:
    lines = ["date,sales"]
    for offset in range(rows):
        lines.append(f"2024-01-{offset + 1:02d},{100 + offset * 5}")
    return "\n".join(lines).encode("utf-8")


def install_mock_model(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_load() -> None:
        model.model = MockForecastBackend()
        model.ready = True

    monkeypatch.setattr(model, "load", fake_load)
    model.model = None
    model.ready = False


@asynccontextmanager
async def api_client():
    load_model_on_startup()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
    model.model = None
    model.ready = False


def test_health_check(monkeypatch: pytest.MonkeyPatch) -> None:
    install_mock_model(monkeypatch)

    async def run() -> None:
        async with api_client() as client:
            response = await client.get("/api/health")

        assert response.status_code == 200
        payload = response.json()
        assert "status" in payload
        assert payload["status"] == "ready"
        assert payload["model_loaded"] is True

    asyncio.run(run())


def test_forecast_happy_path(monkeypatch: pytest.MonkeyPatch) -> None:
    install_mock_model(monkeypatch)

    async def run() -> None:
        async with api_client() as client:
            response = await client.post(
                "/api/forecast",
                data={
                    "value_column": "sales",
                    "time_column": "date",
                    "horizon": "12",
                },
                files={"file": ("sales.csv", BytesIO(make_csv()), "text/csv")},
            )

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["actual"]) <= 512
        assert len(payload["forecast"]) == 12
        assert len(payload["dates"]) == len(payload["actual"])
        assert set(payload["quantiles"]) == {
            "q10",
            "q20",
            "q30",
            "q40",
            "q50",
            "q60",
            "q70",
            "q80",
            "q90",
        }
        assert all(len(series) == 12 for series in payload["quantiles"].values())

    asyncio.run(run())


def test_forecast_without_time_column(monkeypatch: pytest.MonkeyPatch) -> None:
    install_mock_model(monkeypatch)

    async def run() -> None:
        async with api_client() as client:
            response = await client.post(
                "/api/forecast",
                data={
                    "value_column": "sales",
                    "horizon": "6",
                },
                files={"file": ("sales.csv", BytesIO(make_csv()), "text/csv")},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["dates"] is None
        assert len(payload["forecast"]) == 6

    asyncio.run(run())


@pytest.mark.parametrize("horizon", [1, 512])
def test_forecast_horizon_boundaries(
    monkeypatch: pytest.MonkeyPatch, horizon: int
) -> None:
    install_mock_model(monkeypatch)

    async def run() -> None:
        async with api_client() as client:
            response = await client.post(
                "/api/forecast",
                data={
                    "value_column": "sales",
                    "time_column": "date",
                    "horizon": str(horizon),
                },
                files={"file": ("sales.csv", BytesIO(make_csv(40)), "text/csv")},
            )

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["forecast"]) == horizon

    asyncio.run(run())


def test_file_too_large(monkeypatch: pytest.MonkeyPatch) -> None:
    install_mock_model(monkeypatch)
    oversized_file = b"0" * (MAX_FILE_SIZE + 1)

    async def run() -> None:
        async with api_client() as client:
            response = await client.post(
                "/api/forecast",
                data={
                    "value_column": "sales",
                    "time_column": "date",
                    "horizon": "12",
                },
                files={"file": ("big.csv", BytesIO(oversized_file), "text/csv")},
            )

        assert response.status_code == 422
        payload = response.json()
        assert payload["code"] == "FILE_TOO_LARGE"

    asyncio.run(run())


def test_column_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    install_mock_model(monkeypatch)

    async def run() -> None:
        async with api_client() as client:
            response = await client.post(
                "/api/forecast",
                data={
                    "value_column": "nonexistent",
                    "time_column": "date",
                    "horizon": "12",
                },
                files={"file": ("sales.csv", BytesIO(make_csv()), "text/csv")},
            )

        assert response.status_code == 422
        payload = response.json()
        assert payload["code"] == "COLUMN_NOT_FOUND"

    asyncio.run(run())


def test_invalid_csv(monkeypatch: pytest.MonkeyPatch) -> None:
    install_mock_model(monkeypatch)

    async def run() -> None:
        async with api_client() as client:
            response = await client.post(
                "/api/forecast",
                data={
                    "value_column": "sales",
                    "time_column": "date",
                    "horizon": "12",
                },
                files={"file": ("broken.csv", BytesIO(b"\xff\xfe\xfa\xfb"), "text/csv")},
            )

        assert response.status_code == 422
        payload = response.json()
        assert payload["code"] == "INVALID_CSV"

    asyncio.run(run())
