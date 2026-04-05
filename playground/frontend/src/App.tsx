import { useState, useEffect, useCallback, useRef } from "react";
import Upload, { type CsvData } from "./components/Upload";
import Controls from "./components/Controls";
import Chart from "./components/Chart";
import Export from "./components/Export";
import {
  checkHealth,
  forecast,
  csvStringToFile,
  SAMPLE_DATASETS,
  type ForecastResponse,
  type SampleDataset,
} from "./lib/api";
import Papa from "papaparse";

type ModelStatus = "loading" | "ready";

export default function App() {
  // 模型状态
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  // CSV 数据
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  // 列选择
  const [valueColumn, setValueColumn] = useState("");
  const [timeColumn, setTimeColumn] = useState("");
  // 预测参数和结果
  const [horizon, setHorizon] = useState(24);
  const [forecastResult, setForecastResult] = useState<ForecastResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 示例数据选择器
  const [showSamplePicker, setShowSamplePicker] = useState(false);
  // 图表引用（用于截图）
  const chartRef = useRef<HTMLDivElement>(null);

  // 轮询模型状态
  useEffect(() => {
    if (modelStatus === "ready") return;
    const timer = setInterval(async () => {
      try {
        const res = await checkHealth();
        if (res.status === "ready") {
          setModelStatus("ready");
        }
      } catch {
        // 忽略网络错误，继续轮询
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [modelStatus]);

  // 清除数据
  const handleRemove = useCallback(() => {
    setCsvData(null);
    setValueColumn("");
    setTimeColumn("");
    setForecastResult(null);
    setError(null);
  }, []);

  // 选择示例数据集
  const handleSampleSelect = useCallback(
    (sample: SampleDataset) => {
      setShowSamplePicker(false);
      const file = csvStringToFile(sample.csv, sample.name);
      // 解析 CSV 内容
      Papa.parse(sample.csv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Record<string, string>[];
          const columns = results.meta.fields || [];
          const numericColumns = columns.filter((col) =>
            rows.some((row) => {
              const v = row[col];
              return v !== "" && v != null && !isNaN(Number(v));
            })
          );
          setCsvData({ columns, numericColumns, rows, fileName: file.name, file });
          setValueColumn(sample.valueColumn);
          setTimeColumn(sample.timeColumn);
          setForecastResult(null);
          setError(null);
        },
      });
    },
    []
  );

  // 发起预测
  const handleForecast = useCallback(async () => {
    if (!csvData || !valueColumn) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await forecast(
        csvData.file,
        valueColumn,
        horizon,
        timeColumn || undefined
      );
      setForecastResult(res);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "预测失败");
    } finally {
      setIsLoading(false);
    }
  }, [csvData, valueColumn, timeColumn, horizon]);

  // 模型加载中
  if (modelStatus === "loading") {
    return (
      <div className="loading-screen">
        <span className="spinner spinner-lg" />
        <div className="loading-screen-title">TimesFM Playground</div>
        <div className="loading-screen-text">Loading TimesFM model...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-title">TimesFM Playground</div>
        <div className="header-links">
          <a
            href="https://github.com/google-research/timesfm"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://github.com/google-research/timesfm#readme"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
        </div>
      </header>

      {/* Main */}
      <div className="main">
        {/* Sidebar */}
        <aside className="sidebar">
          <Upload
            csvData={csvData}
            onUpload={(data) => {
              setCsvData(data);
              setValueColumn("");
              setTimeColumn("");
              setForecastResult(null);
              setError(null);
            }}
            onRemove={handleRemove}
            valueColumn={valueColumn}
            onValueColumnChange={setValueColumn}
            timeColumn={timeColumn}
            onTimeColumnChange={setTimeColumn}
          />

          <Controls
            horizon={horizon}
            onHorizonChange={setHorizon}
            canForecast={!!csvData && !!valueColumn}
            isLoading={isLoading}
            success={success}
            onForecast={handleForecast}
          />

          {error && <div className="error-banner">{error}</div>}

          <Export result={forecastResult} chartRef={chartRef} />
        </aside>

        {/* Chart Area */}
        <div className="chart-area">
          {forecastResult ? (
            <Chart
              result={forecastResult}
              isLoading={isLoading}
              chartRef={chartRef}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">TimesFM</div>
              <div className="empty-state-subtitle">
                Upload a CSV to start forecasting
              </div>
              <button
                className="sample-btn"
                onClick={() => setShowSamplePicker(true)}
              >
                Try sample data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 示例数据选择弹窗 */}
      {showSamplePicker && (
        <div
          className="sample-picker-overlay"
          onClick={() => setShowSamplePicker(false)}
        >
          <div
            className="sample-picker"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Select sample dataset</h3>
            {SAMPLE_DATASETS.map((s) => (
              <button
                key={s.name}
                className="sample-picker-item"
                onClick={() => handleSampleSelect(s)}
              >
                <strong>{s.name}</strong>
                <span>{s.description}</span>
              </button>
            ))}
            <button
              className="sample-picker-close"
              onClick={() => setShowSamplePicker(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
