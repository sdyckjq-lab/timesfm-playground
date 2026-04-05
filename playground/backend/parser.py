from io import BytesIO

import numpy as np
import pandas as pd

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_DISPLAY_POINTS = 512


def _raise_csv_error(message: str, code: str) -> None:
    raise ValueError(message, code)


def parse_csv(
    file_bytes: bytes,
    time_column: str | None,
    value_column: str,
) -> tuple[np.ndarray, list[float], list[str] | None]:
    """Parse CSV, extract the full series, display window, and optional dates."""
    if len(file_bytes) > MAX_FILE_SIZE:
        _raise_csv_error("File exceeds 10MB limit", "FILE_TOO_LARGE")

    try:
        df = pd.read_csv(BytesIO(file_bytes))
    except Exception as exc:  # pragma: no cover - pandas formats vary by version
        _raise_csv_error(f"Invalid CSV: {exc}", "INVALID_CSV")

    if value_column not in df.columns:
        _raise_csv_error(
            f"Column '{value_column}' not found. Available: {list(df.columns)}",
            "COLUMN_NOT_FOUND",
        )

    numeric_values = pd.to_numeric(df[value_column], errors="coerce")
    valid_rows = numeric_values.notna()
    values = numeric_values.loc[valid_rows].astype(np.float32).to_numpy()

    if len(values) < 3:
        _raise_csv_error(
            "Need at least 3 data points after removing NaN",
            "INSUFFICIENT_DATA",
        )

    actual = values[-MAX_DISPLAY_POINTS:].tolist()

    dates = None
    if time_column and time_column in df.columns:
        try:
            parsed_dates = pd.to_datetime(df.loc[valid_rows, time_column])
            dates = parsed_dates.iloc[-MAX_DISPLAY_POINTS:].dt.strftime("%Y-%m-%d").tolist()
        except Exception:
            dates = None

    return values, actual, dates
