# TimesFM Playground

TimesFM 的 Web 可视化界面，支持拖拽上传 CSV、一键预测、置信区间可视化。

## 快速开始

### Docker 一键启动（推荐）

```bash
cd playground
docker compose up
```

- 前端：http://localhost:3000
- 后端 API：http://localhost:8000

首次启动需要下载 TimesFM 模型（约 800MB），后续启动会使用缓存，约 30 秒就绪。

### 本地开发

**后端：**

```bash
# 在项目根目录，激活虚拟环境
source .venv/bin/activate
uv pip install -e ".[torch]"
uv pip install fastapi "uvicorn[standard]" python-multipart pandas

# 启动后端
cd playground/backend
PYTHONPATH=. uvicorn main:app --port 8000
```

**前端：**

```bash
cd playground/frontend
npm install
npm run dev
```

- 前端：http://localhost:5173（Vite 自动代理 `/api` 到后端 8000 端口）

## 功能

- **拖拽上传 CSV** — 自动识别数值列和时间列
- **内置示例数据** — 3 个数据集可直接体验，无需准备数据
- **可调预测步长** — Horizon 支持 1-512 步
- **置信区间图表** — 显示 q10-q90（外层）和 q30-q70（内层）两个置信带
- **导出** — 支持导出预测结果 CSV 和图表 SVG

## 技术栈

- **后端**：FastAPI + TimesFM 2.5 (PyTorch)
- **前端**：React + TypeScript + Vite + Recharts
- **部署**：Docker Compose（后端 PyTorch CPU + 前端 Nginx）

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 模型加载状态 |
| `/api/forecast` | POST | 预测（FormData: file, value_column, horizon, time_column） |

## 目录结构

```
playground/
├── docker-compose.yml
├── backend/
│   ├── main.py          # FastAPI 入口
│   ├── model.py         # TimesFM 模型封装
│   ├── parser.py        # CSV 解析
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx       # 主应用
    │   ├── components/   # UI 组件
    │   └── lib/api.ts    # API 类型定义
    └── vite.config.ts    # 开发代理配置
```
