// API 类型定义和请求函数

export interface HealthResponse {
  status: "loading" | "ready";
  model_loaded: boolean;
}

export interface ForecastResponse {
  dates: string[] | null;
  actual: number[];
  forecast: number[];
  quantiles: {
    q10: number[];
    q20: number[];
    q30: number[];
    q40: number[];
    q50: number[];
    q60: number[];
    q70: number[];
    q80: number[];
    q90: number[];
  };
}

export interface ForecastError {
  error: string;
  code: string;
}

const API_BASE = "/api";

// 检查模型加载状态
export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

// 发送预测请求
export async function forecast(
  file: File,
  valueColumn: string,
  horizon: number,
  timeColumn?: string
): Promise<ForecastResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("value_column", valueColumn);
  formData.append("horizon", String(horizon));
  if (timeColumn) {
    formData.append("time_column", timeColumn);
  }

  const res = await fetch(`${API_BASE}/forecast`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err: ForecastError = await res.json();
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// 内置示例数据集
export interface SampleDataset {
  name: string;
  description: string;
  csv: string;
  valueColumn: string;
  timeColumn: string;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    name: "Monthly Sales",
    description: "36 个月的销售数据",
    valueColumn: "sales",
    timeColumn: "month",
    csv: `month,sales
2022-01,1200
2022-02,1350
2022-03,1500
2022-04,1420
2022-05,1680
2022-06,1750
2022-07,1820
2022-08,1900
2022-09,1650
2022-10,1580
2022-11,2100
2022-12,2400
2023-01,1380
2023-02,1520
2023-03,1700
2023-04,1620
2023-05,1880
2023-06,1950
2023-07,2020
2023-08,2100
2023-09,1800
2023-10,1750
2023-11,2300
2023-12,2650
2024-01,1550
2024-02,1700
2024-03,1900
2024-04,1820
2024-05,2080
2024-06,2150
2024-07,2250
2024-08,2350
2024-09,2000
2024-10,1950
2024-11,2500
2024-12,2900`,
  },
  {
    name: "Daily Temperature",
    description: "90 天的温度数据（摄氏度）",
    valueColumn: "temp",
    timeColumn: "date",
    csv: `date,temp
2024-01-01,2.1
2024-01-02,1.8
2024-01-03,3.2
2024-01-04,2.5
2024-01-05,1.0
2024-01-06,0.5
2024-01-07,-0.3
2024-01-08,0.8
2024-01-09,1.5
2024-01-10,2.8
2024-01-11,3.5
2024-01-12,4.2
2024-01-13,3.8
2024-01-14,2.9
2024-01-15,1.6
2024-01-16,2.3
2024-01-17,3.7
2024-01-18,4.5
2024-01-19,5.1
2024-01-20,4.8
2024-01-21,3.2
2024-01-22,2.0
2024-01-23,1.5
2024-01-24,3.0
2024-01-25,4.2
2024-01-26,5.5
2024-01-27,6.0
2024-01-28,5.3
2024-01-29,4.1
2024-01-30,3.6
2024-01-31,4.8
2024-02-01,5.2
2024-02-02,6.1
2024-02-03,5.8
2024-02-04,4.5
2024-02-05,5.9
2024-02-06,7.0
2024-02-07,7.5
2024-02-08,6.8
2024-02-09,5.5
2024-02-10,6.2
2024-02-11,7.8
2024-02-12,8.5
2024-02-13,8.0
2024-02-14,7.2
2024-02-15,6.5
2024-02-16,7.9
2024-02-17,9.0
2024-02-18,9.5
2024-02-19,8.8
2024-02-20,7.5
2024-02-21,8.2
2024-02-22,9.8
2024-02-23,10.5
2024-02-24,10.0
2024-02-25,9.2
2024-02-26,8.5
2024-02-27,9.8
2024-02-28,11.0
2024-02-29,11.5
2024-03-01,10.8
2024-03-02,9.5
2024-03-03,10.2
2024-03-04,11.8
2024-03-05,12.5
2024-03-06,12.0
2024-03-07,11.2
2024-03-08,10.5
2024-03-09,11.8
2024-03-10,13.0
2024-03-11,13.5
2024-03-12,12.8
2024-03-13,11.5
2024-03-14,12.2
2024-03-15,13.8
2024-03-16,14.5
2024-03-17,14.0
2024-03-18,13.2
2024-03-19,12.5
2024-03-20,13.8
2024-03-21,15.0
2024-03-22,15.5
2024-03-23,14.8
2024-03-24,13.5
2024-03-25,14.2
2024-03-26,15.8
2024-03-27,16.5
2024-03-28,16.0
2024-03-29,15.2
2024-03-30,14.5
2024-03-31,15.8`,
  },
  {
    name: "Weekly Traffic",
    description: "52 周的网站流量数据",
    valueColumn: "visits",
    timeColumn: "week",
    csv: `week,visits
2023-W01,4500
2023-W02,4800
2023-W03,5200
2023-W04,5100
2023-W05,5500
2023-W06,5800
2023-W07,5600
2023-W08,6000
2023-W09,6200
2023-W10,6500
2023-W11,6300
2023-W12,6800
2023-W13,7000
2023-W14,6800
2023-W15,7200
2023-W16,7500
2023-W17,7300
2023-W18,7800
2023-W19,8000
2023-W20,7800
2023-W21,8200
2023-W22,8500
2023-W23,8300
2023-W24,8800
2023-W25,9000
2023-W26,8800
2023-W27,7500
2023-W28,7200
2023-W29,7000
2023-W30,7500
2023-W31,7800
2023-W32,7600
2023-W33,8000
2023-W34,8500
2023-W35,9000
2023-W36,9500
2023-W37,9800
2023-W38,10000
2023-W39,10200
2023-W40,10500
2023-W41,10800
2023-W42,11000
2023-W43,11200
2023-W44,11500
2023-W45,11800
2023-W46,12000
2023-W47,12500
2023-W48,13000
2023-W49,13500
2023-W50,14000
2023-W51,12000
2023-W52,10000`,
  },
];

// 将 CSV 字符串转为 File 对象
export function csvStringToFile(csv: string, name: string): File {
  const blob = new Blob([csv], { type: "text/csv" });
  return new File([blob], `${name}.csv`, { type: "text/csv" });
}
