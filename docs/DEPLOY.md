# 易数 · 阿里云部署指南

前后端分离架构：

| 组件 | 技术 | 部署位置 |
|------|------|----------|
| 前端 | React + TanStack Start（静态/Node） | OSS + CDN 或 ECS Nginx |
| 后端 | Express + PostgreSQL + Redis | ECS |
| AI | 阿里云百炼 DashScope（通义千问） | API 调用 |
| 数据库 | PostgreSQL | 本地 Docker / 上线 RDS |

---

## 一、本地开发

### 1. 生成卦辞数据

```bash
cd iching-oracle
npm install --cache ./.npm-cache
npm run build   # 同时生成 backend/src/data/guaci-db.json
```

### 2. 配置后端

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入 DASHSCOPE_API_KEY
```

在 [百炼控制台](https://bailian.console.aliyun.com/) 创建 API Key，写入 `DASHSCOPE_API_KEY`。

### 3. 启动数据库 + 后端

```bash
docker compose up -d postgres redis
cd backend && npm install && npm run dev
```

### 4. 启动前端

```bash
cp iching-oracle/.env.example iching-oracle/.env
cd iching-oracle && npm run dev
```

- 前端：http://localhost:8080
- 后端：http://localhost:3001/health

---

## 二、阿里云上线清单（需你操作）

### 必买资源

1. **ECS**（2核2G，Ubuntu 22.04）— 跑后端
2. **域名** + **ICP 备案**
3. **RDS PostgreSQL** — 生产数据库（推荐，与 ECS 同地域同 VPC）
4. **OSS + CDN** — 前端静态资源（可选 Redis 云数据库 Tair）

### 后端部署（ECS）

```bash
# 在 ECS 上
git clone <你的仓库>
cd code/backend
cp .env.example .env
# 编辑 .env：
#   DATABASE_URL=postgresql://user:pass@RDS内网地址:5432/iching
#   REDIS_URL=redis://Tair内网地址:6379
#   DASHSCOPE_API_KEY=sk-xxx
#   JWT_SECRET=随机长字符串
#   CORS_ORIGIN=https://www.yourdomain.com

npm install --omit=dev
# 先生成 guaci-db.json（在本地 build 后一并上传，或在 ECS 装 iching-oracle 跑 build）
node src/index.js
# 或用 pm2 / docker compose
```

Nginx 反代 API（`api.yourdomain.com` → `:3001`）：

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 前端部署（OSS + CDN）

```bash
cd iching-oracle
echo "VITE_API_URL=https://api.yourdomain.com" > .env.production
npm run build
# 将 dist/client 或 .output/public 上传到 OSS Bucket
# CDN 绑定 www.yourdomain.com，开启 SPA 回源（404 → index.html）
```

### 环境变量对照

| 变量 | 本地 | 生产 |
|------|------|------|
| `VITE_API_URL` | http://localhost:3001 | https://api.yourdomain.com |
| `DATABASE_URL` | docker postgres | RDS 内网连接串 |
| `DASHSCOPE_API_KEY` | 百炼 API Key | 同上 |
| `CORS_ORIGIN` | http://localhost:8080 | https://www.yourdomain.com |

---

## 三、API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/upgrade | 游客升级正式账号（保留历史，需登录） |
| POST | /auth/guest | 游客登录（按设备 ID 创建/恢复账号） |
| POST | /auth/register | 注册 |
| POST | /auth/login | 登录 |
| GET | /auth/me | 当前用户 |
| POST | /divination/interpret | AI 解读（需登录） |
| POST | /divination/follow-up | 追问（需登录） |
| GET | /divination/history | 历史列表 |
| DELETE | /divination/history/:id | 删除记录 |

---

## 四、故障排查

- **解读报 500**：检查 `DASHSCOPE_API_KEY` 是否有效、账户余额
- **历史为空**：确认已登录且 interpret 成功返回 `recordId`
- **CORS 错误**：`CORS_ORIGIN` 必须包含前端完整 origin（含 https）
- **guaci-db.json 缺失**：在 `iching-oracle` 目录运行 `npm run build`
