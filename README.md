# 易数 · 易经测算平台

前后端分离：`iching-oracle/`（前端）+ `backend/`（Express API）。

## 快速开始

```bash
# 1. 生成卦辞库（前端 + 后端共用）
cd iching-oracle && npm install --cache ./.npm-cache && npm run build

# 2. 后端
cp ../backend/.env.example ../backend/.env   # 填入 DASHSCOPE_API_KEY
docker compose up -d postgres redis
cd ../backend && npm install && npm run dev

# 3. 前端
cp .env.example .env
npm run dev
```

- 前端 http://localhost:8080
- 后端 http://localhost:3001

详细部署见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 目录

| 路径 | 说明 |
|------|------|
| `iching-oracle/` | React 前端（TanStack Start + Vite） |
| `backend/` | Express API、JWT 认证、阿里云 AI |
| `docker-compose.yml` | 本地 Postgres + Redis + 后端 |
| `deploy/nginx.conf` | 生产 Nginx 配置模板 |
