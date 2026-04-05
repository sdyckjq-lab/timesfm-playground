import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from model import model
from parser import parse_csv

logger = logging.getLogger(__name__)
MAX_HORIZON = 512


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时加载模型
    try:
        model.load()
    except Exception:
        logger.exception("Failed to load TimesFM model during startup")
    yield


app = FastAPI(title="TimesFM Playground Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite 开发服务器
        "http://localhost:3000",  # Docker 部署
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def error_response(status_code: int, message: str, code: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": message, "code": code})


def unpack_value_error(exc: ValueError) -> tuple[str, str]:
    if len(exc.args) >= 2 and isinstance(exc.args[1], str):
        return str(exc.args[0]), exc.args[1]
    if exc.args:
        return str(exc.args[0]), "INVALID_CSV"
    return "Invalid request", "INVALID_CSV"


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"status": "ready" if model.ready else "loading", "model_loaded": model.ready}


@app.post("/api/forecast")
async def forecast(
    file: UploadFile = File(...),
    value_column: str = Form(...),
    time_column: str | None = Form(None),
    horizon: int = Form(...),
) -> Any:
    if not model.ready:
        return error_response(503, "Model not loaded yet", "MODEL_NOT_READY")

    if not 1 <= horizon <= MAX_HORIZON:
        return error_response(
            422,
            f"Horizon must be between 1 and {MAX_HORIZON}",
            "INVALID_HORIZON",
        )

    file_bytes = await file.read()

    try:
        values, actual, dates = parse_csv(file_bytes, time_column, value_column)
    except ValueError as exc:
        message, code = unpack_value_error(exc)
        return error_response(422, message, code)

    result = model.forecast(values, horizon)
    return {
        "dates": dates,
        "actual": actual,
        "forecast": result["forecast"],
        "quantiles": result["quantiles"],
    }
