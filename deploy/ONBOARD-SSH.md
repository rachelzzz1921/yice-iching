# 无法 SSH 时的上线步骤（约 2 分钟）

当前 `deploy.sh` 会在 **上传** 阶段失败：`Permission denied (publickey)`。  
本地构建包已打好，只差把包推上服务器。

## 方案 A：绑定 SSH 公钥（推荐）

阿里云控制台 → **轻量应用服务器** → 实例 → **密钥对 / 远程连接** → **绑定 SSH 公钥**

粘贴（整行）：

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICpBNOKcKg71Xro2ipsu9WKIZs7x6IGlZ0fiug2HgWit chenzhiwei@chenzhiweideMacBook-Air.local
```

绑定后在本机执行：

```bash
cd /Users/chenzhiwei/Desktop/易数/code
SERVER_IP=47.237.68.213 ./deploy/deploy.sh
# 默认 SSH 用户为 admin（非 root）
```

`deploy.sh` 会自动：构建 → 上传 → Docker 重启 → **会员表迁移** → 创建兑换码 `YICE2026`。

---

## 方案 B：浏览器终端手动加公钥

若控制台支持 **密码登录** 的 Web 终端，登录后执行：

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICpBNOKcKg71Xro2ipsu9WKIZs7x6IGlZ0fiug2HgWit chenzhiwei@chenzhiweideMacBook-Air.local' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

然后回到本机运行上面的 `deploy.sh`。

---

## 方案 C：已在服务器上、只有 Web 终端

若无法从本机 SSH，可在服务器 Web 终端里手动解压**已构建包**（需先把 tar 传到服务器，例如用 scp 从另一台已授权机器）：

```bash
cd /opt/iching
# 假设 release.tar.gz 已在当前目录
tar -xzf release.tar.gz
chmod +x deploy/remote-setup.sh
./deploy/remote-setup.sh
```

本地最新包路径示例：`/tmp/iching-deploy-1779828611.tar.gz`（每次 deploy 会生成新文件名）。

---

## 部署完成后验证

```bash
curl -s http://47.237.68.213/api/health
curl -s http://47.237.68.213/api/admin/migrate-membership -H 'x-admin-key: 你的ADMIN_KEY'
# 应返回 {"success":true}

curl -s -X POST http://47.237.68.213/api/admin/redemption-codes/bootstrap \
  -H 'x-admin-key: 你的ADMIN_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"code":"YICE2026","kind":"lifetime","maxRedemptions":100}'
```

或在项目根目录：

```bash
SERVER_IP=47.237.68.213 ./deploy/bootstrap-membership.sh
```

浏览器打开：`http://47.237.68.213/profile/membership` 测试兑换码 **YICE2026**。
