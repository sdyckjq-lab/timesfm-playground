interface ControlsProps {
  horizon: number;
  onHorizonChange: (v: number) => void;
  canForecast: boolean;
  isLoading: boolean;
  success: boolean;
  onForecast: () => void;
}

export default function Controls({
  horizon,
  onHorizonChange,
  canForecast,
  isLoading,
  success,
  onForecast,
}: ControlsProps) {
  const btnClass = `btn-primary${isLoading ? " loading" : ""}${success ? " success" : ""}`;

  return (
    <div className="card">
      <div className="card-title">Forecast</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="controls-slider">
          <div className="controls-slider-header">
            <label>Horizon</label>
            <span>{horizon} steps</span>
          </div>
          <input
            type="range"
            min={1}
            max={512}
            value={horizon}
            onChange={(e) => onHorizonChange(Number(e.target.value))}
          />
        </div>

        <button
          className={btnClass}
          disabled={!canForecast || isLoading}
          onClick={onForecast}
        >
          {isLoading && <span className="spinner" />}
          {isLoading ? "Forecasting..." : success ? "Done!" : "Forecast"}
        </button>
      </div>
    </div>
  );
}
