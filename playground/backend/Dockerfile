FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安装 timesfm + torch（从本地仓库源码）
# 构建上下文是仓库根目录，所以 COPY 整个源码
COPY pyproject.toml README.md ./
COPY src/ src/
RUN pip install --no-cache-dir ".[torch]"

# 安装后端额外依赖
COPY playground/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY playground/backend/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
