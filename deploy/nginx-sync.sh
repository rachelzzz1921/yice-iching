#!/usr/bin/env bash
# 安装共享 VPS 的 canonical Nginx 配置（易测 + LoveCompass 按 Host 分流）
# 幂等：可重复执行；iching / lovecompass 任一项目部署后都应跑此脚本
#
# 用法（服务器上）：
#   cd /opt/iching && sudo ./deploy/nginx-sync.sh
# 或本机：
#   SERVER_IP=47.237.68.213 ./deploy/nginx-sync.sh --remote

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CANONICAL="/etc/nginx/conf.d/00-shared-vhosts.conf"
LEGACY_FILES=(
  /etc/nginx/conf.d/iching.conf
  /etc/nginx/conf.d/lovecompass-shared.conf
)

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

run_remote() {
  local server_ip="${SERVER_IP:?请设置 SERVER_IP}"
  local ssh_user="${SSH_USER:-admin}"
  local ssh_key="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
  local app_dir="${APP_DIR:-/opt/iching}"
  ssh -i "$ssh_key" -o StrictHostKeyChecking=accept-new "${ssh_user}@${server_ip}" \
    "mkdir -p ${app_dir}/deploy/snippets"
  scp -i "$ssh_key" -o StrictHostKeyChecking=accept-new \
    "$SCRIPT_DIR/nginx-shared.conf" \
    "$SCRIPT_DIR/snippets/lovecompass-proxy-params.conf" \
    "$SCRIPT_DIR/nginx-sync.sh" \
    "$SCRIPT_DIR/check-sites.sh" \
    "${ssh_user}@${server_ip}:${app_dir}/deploy/"
  scp -i "$ssh_key" -o StrictHostKeyChecking=accept-new \
    "$SCRIPT_DIR/snippets/lovecompass-proxy-params.conf" \
    "${ssh_user}@${server_ip}:${app_dir}/deploy/snippets/"
  ssh -i "$ssh_key" -o StrictHostKeyChecking=accept-new "${ssh_user}@${server_ip}" \
    "chmod +x ${app_dir}/deploy/nginx-sync.sh ${app_dir}/deploy/check-sites.sh && cd ${app_dir} && sudo ./deploy/nginx-sync.sh"
}

if [[ "${1:-}" == "--remote" ]]; then
  run_remote
  exit 0
fi

echo "==> 安装 Nginx snippets..."
$SUDO mkdir -p /etc/nginx/snippets
SNIPPET_SRC="$SCRIPT_DIR/snippets/lovecompass-proxy-params.conf"
if [[ ! -f "$SNIPPET_SRC" ]]; then
  SNIPPET_SRC="$SCRIPT_DIR/lovecompass-proxy-params.conf"
fi
if [[ ! -f "$SNIPPET_SRC" ]]; then
  echo "缺少 lovecompass-proxy-params.conf" >&2
  exit 1
fi
$SUDO cp -f "$SNIPPET_SRC" /etc/nginx/snippets/lovecompass-proxy-params.conf

echo "==> 安装 canonical 配置 → ${CANONICAL}"
$SUDO cp -f "$SCRIPT_DIR/nginx-shared.conf" "$CANONICAL"

echo "==> 禁用/归档旧的分站配置（避免 default_server 冲突）..."
for f in "${LEGACY_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    $SUDO mv "$f" "${f}.disabled.$(date +%Y%m%d%H%M%S)" 2>/dev/null || $SUDO rm -f "$f"
    echo "    已移除 $f"
  fi
  if [[ -f "${f}.disabled" ]]; then
    echo "    已存在 ${f}.disabled（保留）"
  fi
done

if [[ -L /etc/nginx/sites-enabled/lovecompass-api-proxy ]]; then
  $SUDO mv /etc/nginx/sites-enabled/lovecompass-api-proxy \
    /etc/nginx/sites-enabled/lovecompass-api-proxy.disabled 2>/dev/null || true
  echo "    已禁用 sites-enabled/lovecompass-api-proxy"
fi
$SUDO rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

echo "==> 校验并重载 Nginx..."
$SUDO nginx -t
$SUDO systemctl enable nginx
$SUDO systemctl reload nginx

echo "==> Nginx 共享配置已同步"
echo "    易测 HTTP:  http://47.237.68.213/"
echo "    易测 HTTPS: https://yice.47-237-68-213.sslip.io/  （微信支付用）"
echo "    LoveCompass: https://47-237-68-213.sslip.io/"
