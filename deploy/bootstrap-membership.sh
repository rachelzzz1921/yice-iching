#!/usr/bin/env bash
# 部署后执行：数据库会员表迁移 + 创建默认兑换码（仅需 ADMIN_KEY，无需 SSH）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVER_IP="${SERVER_IP:-47.237.68.213}"
BASE="${API_BASE:-http://${SERVER_IP}/api}"

if [[ -f deploy/.env.prod ]]; then
  ADMIN_KEY="$(grep -E '^ADMIN_KEY=' deploy/.env.prod | cut -d= -f2- | tr -d '\r' || true)"
  export ADMIN_KEY
fi

ADMIN_KEY="${ADMIN_KEY:?请设置 ADMIN_KEY 或在 deploy/.env.prod 中配置}"
REDEEM_CODE="${REDEEM_CODE:-YICE2026}"
REDEEM_MAX="${REDEEM_MAX:-100}"

echo "==> 目标 API: ${BASE}"
echo "==> 1/2 会员表迁移 migrate-membership.sql"
MIGRATE=$(curl -s "${BASE}/admin/migrate-membership" -H "x-admin-key: ${ADMIN_KEY}" || true)
if echo "$MIGRATE" | grep -q '"success":true'; then
  echo "    OK"
else
  echo "    migrate 端点不可用（可能仍是旧后端），尝试 init-db…"
  INIT=$(curl -s "${BASE}/admin/init-db" -H "x-admin-key: ${ADMIN_KEY}" || true)
  if echo "$INIT" | grep -q '"success":true'; then
    echo "    init-db OK（若未部署新后端，会员表可能仍未创建，请先 deploy）"
  else
    echo "    失败: ${MIGRATE:-$INIT}"
    echo "    请先部署新后端（./deploy/deploy.sh），或确认 ADMIN_KEY 与 deploy/.env.prod 一致"
    exit 1
  fi
fi

echo "==> 2/2 创建兑换码 ${REDEEM_CODE}（${REDEEM_MAX} 次）"
SEED=$(curl -s -X POST "${BASE}/admin/redemption-codes/bootstrap" \
  -H "x-admin-key: ${ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"${REDEEM_CODE}\",\"kind\":\"lifetime\",\"maxRedemptions\":${REDEEM_MAX},\"note\":\"默认永久会员码\"}" \
  || true)

if echo "$SEED" | grep -q '"code"'; then
  echo "    OK — 兑换码: ${REDEEM_CODE}"
elif echo "$SEED" | grep -q '兑换码已存在'; then
  echo "    已存在，跳过"
elif echo "$SEED" | grep -q 'Cannot POST'; then
  echo "    失败: 线上仍是旧后端，缺少 bootstrap 接口。请先执行 deploy.sh"
  exit 1
else
  echo "    响应: ${SEED}"
  exit 1
fi

echo ""
echo "完成。用户可在 /profile/membership 输入兑换码: ${REDEEM_CODE}"
