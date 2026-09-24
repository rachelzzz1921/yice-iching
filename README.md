# 易测

让天下没有难做的决策。易经六爻在线问卜：问事 → 起卦 → 解读 → 追问。

**在线演示：** [http://47.237.68.213](http://47.237.68.213)

本仓库用于产品展示与源码查阅。演示站是完整版（Pitch、账号、会员、AI 解读），不是静态页。

## 产品能力

- **沿路一览**：流程、样例解读、四式起卦说明
- **四式起卦**：铜钱、蓍草、梅花、直书
- **五类问事**：事业、家庭、情感、健康、际遇
- **解读**：本地卦辞引擎秒出；可选云端大模型润色 / 深入追问 / 全 AI 解读
- **账号**：游客试用、邮箱注册、会员兑换、管理后台 `/admin`

## 技术栈

| 部分 | 方案 |
|------|------|
| 前端 | React 19 · TanStack Start / Router · Vite |
| 后端 | Express · Postgres · Redis · JWT |
| 解读 | 本地卦辞库 + 硅基流动 DeepSeek（可选） |
| 部署 | Docker Compose · Nginx |

```
iching-oracle/   前端（问卜主流程、Pitch、会员、后台）
backend/         认证、额度、会员、管理 API
deploy/          生产部署脚本与 Nginx
```

## 本地运行

```bash
cd iching-oracle
npm install
npm run build          # 生成卦辞库，并打后端解读包

cp ../backend/.env.example ../backend/.env
# 可选：填 STEP_API_KEY（硅基流动）。不填则纯本地解读。

cd ..
docker compose up -d postgres redis
cd backend && npm install && npm run dev

cd ../iching-oracle
cp .env.example .env
npm run dev
```

- 前端：http://localhost:8080
- 后端：http://localhost:3001

生产部署见 `deploy/LIGHTWEIGHT.md`。密钥只写在 `.env` / `deploy/.env.prod`，不要提交。
