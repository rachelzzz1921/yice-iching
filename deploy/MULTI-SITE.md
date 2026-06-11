# 共享 VPS：易测 + LoveCompass 共存指南

同一台轻量服务器（`47.237.68.213`）跑两个站点。**Nginx 只维护一份配置**，按域名分流，避免互相覆盖。

## 路由表

| 访问地址 | 站点 | Docker 端口 |
|----------|------|-------------|
| `http://47.237.68.213/` | **易测 iching** | 3000 / 3001 |
| `http://47.237.68.213:8080/` | 易测备用 | 3000 / 3001 |
| `http(s)://47-237-68-213.sslip.io/` | **LoveCompass 镜像** | 3002 + Vercel API |

## 唯一 Nginx 配置

```
deploy/nginx-shared.conf  →  /etc/nginx/conf.d/00-shared-vhosts.conf
```

**不要**再单独部署：

- ~~`deploy/nginx-single.conf` → iching.conf~~（已废弃）
- ~~`lovecompass-mirror/mirror/nginx-shared.conf` → lovecompass-shared.conf~~

## 部署后必做

### 易测部署

```bash
SERVER_IP=47.237.68.213 ./deploy/deploy.sh
# remote-setup.sh 会自动执行 nginx-sync.sh
```

### LoveCompass 部署后

LoveCompass 更新 Docker 后，**不要**复制它自带的 nginx 配置，只需：

```bash
ssh admin@47.237.68.213
cd /opt/iching && sudo ./deploy/nginx-sync.sh
```

或本机：

```bash
SERVER_IP=47.237.68.213 ./deploy/nginx-sync.sh --remote
```

## 自检

```bash
./deploy/check-sites.sh
```

应看到易测 API、首页、LoveCompass HTTPS 均 200。

## 故障排查

| 现象 | 原因 | 处理 |
|------|------|------|
| `duplicate default server` | 两个 conf 都写了 `default_server` | `sudo ./deploy/nginx-sync.sh` |
| 裸 IP 打开是 LoveCompass | 旧 lovecompass-shared 覆盖了 iching | 同上 |
| sslip.io 502 | lovecompass 容器 :3002 未启动 | `cd /opt/lovecompass-mirror && docker compose up -d` |
| 易测 502 | iching 容器未启动 | `cd /opt/iching && docker compose -f docker-compose.prod.yml up -d` |

## 端口约定（勿改）

| 端口 | 用途 |
|------|------|
| 3000 | iching 前端 |
| 3001 | iching 后端 |
| 3002 | LoveCompass 镜像 |
| 80 / 443 | Nginx 入口 |
| 8080 | 易测备用 HTTP |

## 修改路由

只改 `deploy/nginx-shared.conf`，然后：

```bash
sudo ./deploy/nginx-sync.sh
./deploy/check-sites.sh
```
