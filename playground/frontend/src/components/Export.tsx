import type { ForecastResponse } from "../lib/api";

interface ExportProps {
  result: ForecastResponse | null;
  chartRef: React.RefObject<HTMLDivElement | null>;
}

export default function Export({ result, chartRef }: ExportProps) {
  const disabled = !result;

  // 导出 CSV
  const handleExportCsv = () => {
    if (!result) return;
    const len = result.actual.length + result.forecast.length;
    const lines = ["index,actual,forecast,q10,q30,q70,q90"];
    for (let i = 0; i < len; i++) {
      const isActual = i < result.actual.length;
      const forecastIdx = i - result.actual.length;
      const row = [
        result.dates ? result.dates[i] ?? i : i,
        isActual ? result.actual[i] : "",
        !isActual ? result.forecast[forecastIdx] : "",
        !isActual ? result.quantiles.q10[forecastIdx] : "",
        !isActual ? result.quantiles.q30[forecastIdx] : "",
        !isActual ? result.quantiles.q70[forecastIdx] : "",
        !isActual ? result.quantiles.q90[forecastIdx] : "",
      ];
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forecast.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 截图保存（使用 canvas API）
  const handleScreenshot = async () => {
    if (!chartRef.current) return;
    try {
      // 动态导入 html2canvas 较重，这里用简单的 SVG 序列化方式
      const svg = chartRef.current.querySelector("svg");
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "forecast-chart.svg";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // 降级：提示用户手动截图
      alert("请使用系统截图功能保存图表");
    }
  };

  return (
    <div className="card">
      <div className="card-title">Export</div>
      <div className="export-buttons">
        <button
          className="btn-secondary"
          disabled={disabled}
          onClick={handleExportCsv}
        >
          Export CSV
        </button>
        <button
          className="btn-secondary"
          disabled={disabled}
          onClick={handleScreenshot}
        >
          Screenshot
        </button>
      </div>
    </div>
  );
}
