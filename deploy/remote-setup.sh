#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/iching}"
cd "$APP_DIR"

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

echo "==> 安装 Docker（如未安装）..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | $SUDO sh
  $SUDO systemctl enable docker
  $SUDO systemctl start docker
fi

if ! docker compose version >/dev/null 2>&1 && ! $SUDO docker compose version >/dev/null 2>&1; then
  $SUDO apt-get update -qq && $SUDO apt-get install -y docker-compose-plugin nginx 2>/dev/null || true
fi

dc() {
  if [[ -n "$SUDO" ]]; then
    $SUDO docker compose "$@"
  else
    docker compose "$@"
  fi
}

echo "==> 配置 Nginx（共享 VPS · 按 Host 分流，不覆盖 LoveCompass）..."
chmod +x deploy/nginx-sync.sh deploy/check-sites.sh 2>/dev/null || true
$SUDO ./deploy/nginx-sync.sh

echo "==> 启动应用栈..."
if [[ -f deploy/.env.prod ]]; then
  set -a
  # shellcheck disable=SC1091
  source deploy/.env.prod
  set +a
fi
dc -f docker-compose.prod.yml up -d --build --remove-orphans

echo "==> 等待健康检查..."
sleep 12
curl -sf http://127.0.0.1:3001/health && echo " backend OK" || echo " backend 未就绪，请 docker compose logs backend"
curl -sf -o /dev/null http://127.0.0.1:3000/ && echo " frontend OK" || echo " frontend 未就绪，请 docker compose logs frontend"

if [[ -f deploy/.env.prod ]]; then
  ADMIN_KEY=$(grep -E '^ADMIN_KEY=' deploy/.env.prod | cut -d= -f2- || true)
  if [[ -n "${ADMIN_KEY:-}" ]]; then
    echo "==> 会员表迁移 + 默认兑换码..."
    curl -sf "http://127.0.0.1:3001/admin/migrate-membership" -H "x-admin-key: ${ADMIN_KEY}" >/dev/null \
      && echo "    migrate OK" \
      || echo "    migrate 跳过（请手动 ./deploy/bootstrap-membership.sh）"
    curl -sf -X POST "http://127.0.0.1:3001/admin/redemption-codes/bootstrap" \
      -H "x-admin-key: ${ADMIN_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"code":"YICE2026","kind":"lifetime","maxRedemptions":100,"note":"默认永久会员码"}' >/dev/null \
      && echo "    兑换码 YICE2026 OK" \
      || echo "    兑换码已存在或创建失败"
  fi
fi

PUBLIC_IP=$(curl -sf ifconfig.me || curl -sf ip.sb || hostname -I | awk '{print $1}')
echo ""
echo "部署完成。浏览器访问: http://${PUBLIC_IP}/"
echo "API 健康检查: http://${PUBLIC_IP}/api/health"
echo "双站自检: ./deploy/check-sites.sh"
echo "LoveCompass: https://47-237-68-213.sslip.io/ （Nginx 由 deploy/nginx-shared.conf 统一管理）"
