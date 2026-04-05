from typing import Any

import numpy as np


class TimesFMModel:
    def __init__(self) -> None:
        self.model: Any | None = None
        self.ready = False

    def load(self) -> None:
        """Load and compile the TimesFM 2.5 PyTorch model."""
        import torch
        import timesfm

        torch.set_float32_matmul_precision("high")

        self.model = timesfm.TimesFM_2p5_200M_torch.from_pretrained(
            "google/timesfm-2.5-200m-pytorch"
        )
        self.model.compile(
            timesfm.ForecastConfig(
                max_context=1024,
                max_horizon=512,
                normalize_inputs=True,
                use_continuous_quantile_head=True,
                force_flip_invariance=True,
                infer_is_positive=True,
                fix_quantile_crossing=True,
            )
        )
        self.ready = True

    def forecast(self, values: np.ndarray, horizon: int) -> dict[str, Any]:
        """Run forecast and return point plus quantile predictions."""
        if self.model is None:
            raise RuntimeError("Model is not loaded")

        point, quantiles = self.model.forecast(horizon=horizon, inputs=[values])
        return {
            "forecast": point[0].tolist(),
            "quantiles": {
                "q10": quantiles[0, :, 1].tolist(),
                "q20": quantiles[0, :, 2].tolist(),
                "q30": quantiles[0, :, 3].tolist(),
                "q40": quantiles[0, :, 4].tolist(),
                "q50": quantiles[0, :, 5].tolist(),
                "q60": quantiles[0, :, 6].tolist(),
                "q70": quantiles[0, :, 7].tolist(),
                "q80": quantiles[0, :, 8].tolist(),
                "q90": quantiles[0, :, 9].tolist(),
            },
        }


model = TimesFMModel()
