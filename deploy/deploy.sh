#!/usr/bin/env bash
# 从本机打包并部署到阿里云轻量应用服务器
# 用法：SERVER_IP=47.x.x.x ./deploy/deploy.sh
# 可选：SSH_KEY=~/.ssh/id_ed25519 SSH_USER=root

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVER_IP="${SERVER_IP:?请设置 SERVER_IP=你的公网IP}"
SSH_USER="${SSH_USER:-admin}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
APP_DIR="${APP_DIR:-/opt/iching}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4 -o AddressFamily=inet -i "$SSH_KEY")

echo "==> 目标: ${SSH_USER}@${SERVER_IP}:${APP_DIR}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "未找到 SSH 密钥 $SSH_KEY"
  echo "请先在阿里云控制台 → 轻量服务器 → 远程连接/密钥 → 绑定本机公钥"
  echo "或运行: ssh-keygen -t ed25519 -f $SSH_KEY -N \"\""
  exit 1
fi

if [[ ! -f deploy/.env.prod ]]; then
  echo "==> 生成 deploy/.env.prod（请编辑填入 STEP_API_KEY，可选）"
  SECRET=$(openssl rand -hex 24)
  ADMIN_PASS=$(openssl rand -hex 12)
  PG_PASS=$(openssl rand -hex 16)
  STEP_KEY=""
  if [[ -f backend/.env ]]; then
    STEP_KEY=$(grep -E '^(STEP_API_KEY|ZHIPU_API_KEY)=' backend/.env 2>/dev/null | head -n1 | cut -d= -f2- || true)
  fi
  cat > deploy/.env.prod <<EOF
POSTGRES_PASSWORD=${PG_PASS}
JWT_SECRET=${SECRET}
ADMIN_KEY=${SECRET}
ADMIN_PASSWORD=${ADMIN_PASS}
STEP_API_KEY=${STEP_KEY}
STEP_API_URL=https://api.siliconflow.cn/v1/chat/completions
STEP_MODEL=deepseek-ai/DeepSeek-V4-Flash
STEP_FULL_AI_MODEL=deepseek-ai/DeepSeek-V4-Pro
# 旧变量名保留给历史代码/脚本兼容
ZHIPU_API_KEY=${STEP_KEY}
ZHIPU_MODEL=deepseek-ai/DeepSeek-V4-Flash
ZHIPU_FULL_AI_MODEL=deepseek-ai/DeepSeek-V4-Pro
CORS_ORIGIN=http://${SERVER_IP}
PORT=3001
EOF
  echo "⚠️  可选：编辑 deploy/.env.prod 填入 STEP_API_KEY（未填则纯本地解读，不报错）"
  echo "🔑  管理后台密码已写入 deploy/.env.prod 的 ADMIN_PASSWORD（访问 /admin）"
fi

if ! grep -Eq '^(STEP_API_KEY|ZHIPU_API_KEY)=.+' deploy/.env.prod 2>/dev/null; then
  echo "ℹ️  deploy/.env.prod 未配置 STEP_API_KEY，上线后使用纯本地解读（无 AI 润色）"
fi

echo "==> 构建卦辞库 + 前端..."
(cd iching-oracle && node scripts/build-guaci-db.mjs)
echo "VITE_API_URL=/api" > iching-oracle/.env.production
(cd iching-oracle && VITE_API_URL=/api npm run build)

echo "==> 打包..."
TAR="/tmp/iching-deploy-$(date +%s).tar.gz"
tar -czf "$TAR" \
  --exclude='node_modules' \
  --exclude='.npm-cache' \
  --exclude='.git' \
  backend iching-oracle/dist iching-oracle/prod-server.mjs iching-oracle/Dockerfile \
  iching-oracle/package.json iching-oracle/package-lock.json \
  docker-compose.prod.yml deploy

echo "==> 上传..."
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SERVER_IP}" "mkdir -p ${APP_DIR}"
scp "${SSH_OPTS[@]}" "$TAR" "${SSH_USER}@${SERVER_IP}:${APP_DIR}/release.tar.gz"

echo "==> 远程解压并启动..."
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SERVER_IP}" bash -s <<REMOTE
set -euo pipefail
APP_DIR="${APP_DIR}"
mkdir -p "\$APP_DIR"
cd "\$APP_DIR"
tar -xzf release.tar.gz
chmod +x deploy/remote-setup.sh
./deploy/remote-setup.sh
REMOTE

rm -f "$TAR"
echo "完成。打开 http://${SERVER_IP}/"
