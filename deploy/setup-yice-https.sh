#!/usr/bin/env bash
# 在阿里云服务器上为易测申请 HTTPS 证书（yice.47-237-68-213.sslip.io）
# 本机执行：SERVER_IP=47.237.68.213 ./deploy/setup-yice-https.sh --remote
# 或 SSH 进服务器：cd /opt/iching && sudo ./deploy/setup-yice-https.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="yice.47-237-68-213.sslip.io"
SERVER_IP="${SERVER_IP:-47.237.68.213}"
SSH_USER="${SSH_USER:-admin}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE="${1:-}"

run_remote() {
  ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "${SSH_USER}@${SERVER_IP}" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/iching
sudo ./deploy/nginx-sync.sh || true
echo "==> 扩展现有 sslip.io 证书，加入易测子域名 yice.47-237-68-213.sslip.io ..."
sudo certbot certonly --nginx \
  -d 47-237-68-213.sslip.io \
  -d yice.47-237-68-213.sslip.io \
  --expand --non-interactive --agree-tos -m admin@localhost \
  || sudo certbot certonly --webroot -w /var/www/html \
  -d yice.47-237-68-213.sslip.io \
  --non-interactive --agree-tos -m admin@localhost
sudo ./deploy/nginx-sync.sh
sudo nginx -t && sudo systemctl reload nginx
curl -sf "https://yice.47-237-68-213.sslip.io/api/health" && echo " 易测 HTTPS OK"
REMOTE
}

if [[ "$REMOTE" == "--remote" ]]; then
  echo "==> 同步 nginx 配置并申请证书: ${HOST}"
  scp -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" \
    "$ROOT/deploy/nginx-shared.conf" \
    "${SSH_USER}@${SERVER_IP}:/opt/iching/deploy/nginx-shared.conf"
  run_remote
  exit 0
fi

# 在服务器本机执行
cd "${APP_DIR:-/opt/iching}"
sudo ./deploy/nginx-sync.sh || true
sudo certbot certonly --nginx \
  -d 47-237-68-213.sslip.io \
  -d yice.47-237-68-213.sslip.io \
  --expand --non-interactive --agree-tos -m admin@localhost \
  || sudo certbot certonly --webroot -w /var/www/html \
  -d yice.47-237-68-213.sslip.io \
  --non-interactive --agree-tos -m admin@localhost
sudo ./deploy/nginx-sync.sh
sudo nginx -t && sudo systemctl reload nginx
echo "完成: https://${HOST}/"
