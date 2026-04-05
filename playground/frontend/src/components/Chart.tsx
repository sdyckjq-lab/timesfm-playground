import { useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { ForecastResponse } from "../lib/api";

interface ChartProps {
  result: ForecastResponse;
  isLoading: boolean;
  chartRef: React.Ref<HTMLDivElement>;
}

interface ChartDataPoint {
  index: number;
  label: string;
  actual?: number;
  forecast?: number;
  q10q90?: [number, number];
  q30q70?: [number, number];
}

// 自定义 Tooltip
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | [number, number] }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data: Record<string, number | [number, number] | undefined> = {};
  for (const p of payload) {
    data[p.dataKey] = p.value;
  }

  const actualVal = data["actual"] as number | undefined;
  const forecastVal = data["forecast"] as number | undefined;
  const q10q90 = data["q10q90"] as [number, number] | undefined;

  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{label}</div>
      {actualVal != null && (
        <div className="custom-tooltip-row">
          <span className="label" style={{ color: "#fff" }}>Actual</span>
          <span className="value" style={{ color: "#fff" }}>
            {actualVal.toFixed(2)}
          </span>
        </div>
      )}
      {forecastVal != null && (
        <div className="custom-tooltip-row">
          <span className="label" style={{ color: "#8b5cf6" }}>Forecast</span>
          <span className="value" style={{ color: "#8b5cf6" }}>
            {forecastVal.toFixed(2)}
          </span>
        </div>
      )}
      {q10q90 && (
        <div className="custom-tooltip-row">
          <span className="label">CI width</span>
          <span className="value">
            {(q10q90[1] - q10q90[0]).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Chart({ result, isLoading, chartRef }: ChartProps) {
  // 构建图表数据：actual + forecast 合并到同一时间轴
  const { chartData, splitIndex } = useMemo(() => {
    const actualLen = result.actual.length;
    const forecastLen = result.forecast.length;
    const totalLen = actualLen + forecastLen;
    const points: ChartDataPoint[] = [];

    for (let i = 0; i < totalLen; i++) {
      const label =
        result.dates && result.dates[i] ? result.dates[i] : String(i);

      if (i < actualLen) {
        // actual 区域
        const point: ChartDataPoint = {
          index: i,
          label,
          actual: result.actual[i],
        };
        // actual 最后一个点同时也是 forecast 的起点（保证连续）
        if (i === actualLen - 1) {
          point.forecast = result.actual[i];
        }
        points.push(point);
      } else {
        // forecast 区域
        const fi = i - actualLen;
        points.push({
          index: i,
          label,
          forecast: result.forecast[fi],
          q10q90: [result.quantiles.q10[fi], result.quantiles.q90[fi]],
          q30q70: [result.quantiles.q30[fi], result.quantiles.q70[fi]],
        });
      }
    }

    return { chartData: points, splitIndex: actualLen - 1 };
  }, [result]);

  const splitLabel = chartData[splitIndex]?.label;

  return (
    <div className="chart-container" ref={chartRef}>
      <div className="chart-wrapper">
        {isLoading && (
          <div className="chart-loading-overlay">
            <span className="spinner spinner-lg" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <defs>
              <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="label"
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              width={60}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* 分界线 */}
            {splitLabel && (
              <ReferenceLine
                x={splitLabel}
                stroke="#ffffff"
                strokeDasharray="4 4"
                strokeOpacity={0.15}
              />
            )}

            {/* q10-q90 置信区间 */}
            <Area
              dataKey="q10q90"
              fill="url(#purpleGradient)"
              stroke="none"
              fillOpacity={0.12}
              isAnimationActive={false}
            />

            {/* q30-q70 置信区间 */}
            <Area
              dataKey="q30q70"
              fill="url(#purpleGradient)"
              stroke="none"
              fillOpacity={0.25}
              isAnimationActive={false}
            />

            {/* actual 数据线 */}
            <Line
              dataKey="actual"
              stroke="#ffffff"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* forecast 预测线 */}
            <Line
              dataKey="forecast"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
