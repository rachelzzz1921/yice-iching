#!/usr/bin/env bash
# 检查共享 VPS 上两个站点是否都正常（本机执行即可）
# 用法：./deploy/check-sites.sh

set -euo pipefail

ICHING_IP="${ICHING_IP:-47.237.68.213}"
ICHING_HTTPS_HOST="${ICHING_HTTPS_HOST:-yice.47-237-68-213.sslip.io}"
YINGYAN_HOST="${YINGYAN_HOST:-yingyan.47-237-68-213.sslip.io}"
LC_HOST="${LC_HOST:-47-237-68-213.sslip.io}"

check() {
  local name="$1"
  local url="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -m 15 -L "$url" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^2 ]]; then
    echo "  ✓ $name  → HTTP $code"
    return 0
  fi
  echo "  ✗ $name  → HTTP $code  ($url)"
  return 1
}

failed=0
echo "==> 易测 iching (http://${ICHING_IP})"
check "API 健康" "http://${ICHING_IP}/api/health" || failed=1
check "首页" "http://${ICHING_IP}/" || failed=1
check "起卦页" "http://${ICHING_IP}/divine" || failed=1

echo ""
echo "==> 易测 HTTPS (https://${ICHING_HTTPS_HOST}) — 微信支付用此入口"
check "HTTPS API" "https://${ICHING_HTTPS_HOST}/api/health" || failed=1
check "HTTPS 首页" "https://${ICHING_HTTPS_HOST}/" || failed=1

echo ""
echo "==> LoveCompass (https://${LC_HOST})"
check "HTTPS 首页" "https://${LC_HOST}/" || failed=1
check "API health" "https://${LC_HOST}/health" || failed=1

echo ""
echo "==> 鹰眼 EagleEye (https://${YINGYAN_HOST})"
check "HTTPS 首页" "https://${YINGYAN_HOST}/" || failed=1
check "API health" "https://${YINGYAN_HOST}/api/health" || failed=1

echo ""
if [[ "$failed" -eq 0 ]]; then
  echo "全部通过"
else
  echo "存在失败 — 在服务器执行: cd /opt/iching && sudo ./deploy/nginx-sync.sh"
  exit 1
fi
