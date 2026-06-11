# 轻量应用服务器一键上线（约 3 分钟）

## 前提

- 已购买 **轻量应用服务器**（1 台）
- 本机已构建好（`deploy.sh` 会自动 build）
- **智谱 API Key（可选）**：https://open.bigmodel.cn/ — 仅润色分析段；不配也能用本地解读

## 第 1 步：绑定 SSH 公钥（只需做一次）

在阿里云控制台：

**轻量应用服务器 → 你的实例 → 远程连接 / 密钥对 → 绑定 SSH 公钥**

粘贴本机公钥（整行）：

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICpBNOKcKg71Xro2ipsu9WKIZs7x6IGlZ0fiug2HgWit chenzhiwei@chenzhiweideMacBook-Air.local
```

或在终端查看：`cat ~/.ssh/id_ed25519.pub`

> 若实例用的是「密码登录」，可在控制台 **重置 root 密码**，然后告诉我密码，或自行执行下面命令时输入密码。

## 第 2 步：确认公网 IP

控制台实例详情页复制 **公网 IP**（上次尝试的是 `47.237.68.213`，以控制台为准）。

## 第 3 步：配置环境变量

```bash
cp deploy/.env.prod.example deploy/.env.prod
# 编辑 deploy/.env.prod：
#   - POSTGRES_PASSWORD / JWT_SECRET / ADMIN_KEY 改为随机长字符串
#   - CORS_ORIGIN 改成 http://你的公网IP
#   - （可选）ZHIPU_API_KEY=你的智谱 Key，启用 AI 润色
```

## 第 4 步：一键部署

```bash
cd /Users/chenzhiwei/Desktop/易数/code
SERVER_IP=你的公网IP ./deploy/deploy.sh
```

完成后浏览器打开：**http://你的公网IP/**

双站共存说明见 [deploy/MULTI-SITE.md](MULTI-SITE.md)。LoveCompass 走 `https://47-237-68-213.sslip.io/`，部署后执行 `./deploy/check-sites.sh` 自检。

---

## 架构（全在一台轻量服务器上）

```
浏览器 → Nginx:80
           ├─ /      → 前端 SSR (Docker :3000) — 起卦解读在此（需 ZHIPU_API_KEY 才润色）
           └─ /api/  → Express 后端 (Docker :3001) — 登录/注册/游客/历史
                        ├─ Postgres (Docker，数据存服务器磁盘)
                        └─ Redis (Docker)
```

后端不可用时，游客可离线体验解读；云端历史需后端在线。

无 RDS / OSS 时，数据库在服务器 Docker 卷里，定期备份即可。

## 常用运维

```bash
ssh root@你的IP
cd /opt/iching
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml restart
```

## 安全组

确保轻量服务器 **防火墙** 已放行 **80** 端口（HTTP）。
