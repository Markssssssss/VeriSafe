# Ubuntu 服务器部署指南

## 前置要求

- Ubuntu 20.04 或更高版本
- 具有 sudo 权限的用户
- 服务器公网 IP 或域名
- （可选）域名和 SSL 证书

---

## 步骤 1: 安装必要软件

### 1.1 更新系统
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 安装 Node.js (推荐 v20.x)
```bash
# 使用 NodeSource 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应该显示 v20.x.x
npm --version
```

### 1.3 安装 Nginx
```bash
sudo apt install -y nginx

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证状态
sudo systemctl status nginx
```

### 1.4 安装 PM2 (进程管理器)
```bash
sudo npm install -g pm2

# 设置 PM2 开机自启
pm2 startup
# 按照提示执行生成的命令（通常是 sudo env PATH=...）
```

---

## 步骤 2: 克隆和构建项目

### 2.1 克隆项目
```bash
# 进入合适的目录
cd /var/www  # 或你喜欢的目录

# 克隆仓库
sudo git clone https://github.com/Markssssssss/VeriSafe.git
sudo chown -R $USER:$USER VeriSafe
cd VeriSafe
```

### 2.2 构建前端
```bash
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 验证构建产物
ls -la dist/
# 应该看到 index.html 和 assets/ 目录
```

---

## 步骤 3: 配置 Nginx

### 3.1 创建 Nginx 配置
```bash
sudo nano /etc/nginx/sites-available/verisafe
```

### 3.2 添加以下配置内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或 IP
    
    # 如果需要允许 IP 访问，使用：
    # server_name _;
    
    root /var/www/VeriSafe/frontend/dist;
    index index.html;

    # 支持单页应用（React Router）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WASM 文件特殊处理（FHEVM SDK 需要）
    location ~* \.wasm$ {
        add_header Content-Type application/wasm;
        add_header Cross-Origin-Embedder-Policy require-corp;
        add_header Cross-Origin-Opener-Policy same-origin;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 3.3 启用配置并测试
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/verisafe /etc/nginx/sites-enabled/

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

---

## 步骤 4: 配置防火墙

### 4.1 允许 HTTP/HTTPS 端口
```bash
# UFW 防火墙
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS (如果使用 SSL)
sudo ufw allow 22/tcp   # SSH (确保不会锁在外面)
sudo ufw enable

# 验证
sudo ufw status
```

---

## 步骤 5: 配置 SSL/HTTPS (可选但推荐)

### 5.1 使用 Let's Encrypt (免费 SSL)
```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书（需要域名已指向服务器）
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 5.2 Certbot 会自动更新 Nginx 配置
证书会在 `/etc/letsencrypt/` 目录，Nginx 配置会自动更新为 HTTPS。

---

## 步骤 6: 自动化部署脚本

### 6.1 创建部署脚本
```bash
cd /var/www/VeriSafe
nano deploy.sh
```

### 6.2 添加以下内容：

```bash
#!/bin/bash

set -e  # 遇到错误立即退出

echo "🚀 Starting VeriSafe deployment..."

# 进入项目目录
cd /var/www/VeriSafe

# 拉取最新代码
echo "📥 Pulling latest code..."
git pull origin main

# 进入前端目录
cd frontend

# 安装依赖（如果需要）
echo "📦 Installing dependencies..."
npm install

# 构建项目
echo "🔨 Building frontend..."
npm run build

# 验证构建
if [ ! -f "dist/index.html" ]; then
    echo "❌ Build failed: index.html not found"
    exit 1
fi

# 重启 Nginx（如果需要）
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "📍 Site should be available at: http://your-domain.com"
```

### 6.3 设置执行权限
```bash
chmod +x deploy.sh
```

### 6.4 使用部署脚本
```bash
./deploy.sh
```

---

## 步骤 7: 监控和维护

### 7.1 查看 Nginx 日志
```bash
# 访问日志
sudo tail -f /var/log/nginx/access.log

# 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 7.2 查看系统资源
```bash
# CPU 和内存
htop  # 需要先安装: sudo apt install htop

# 磁盘空间
df -h
```

### 7.3 设置自动更新（可选）
```bash
# 创建 cron 任务每天检查更新
crontab -e

# 添加以下行（每天凌晨 3 点检查并拉取更新，但需要手动执行部署）
0 3 * * * cd /var/www/VeriSafe && git fetch && git log HEAD..origin/main --oneline
```

---

## 常见问题排查

### 问题 1: 403 Forbidden
**原因：** 文件权限问题
```bash
# 修复权限
sudo chown -R www-data:www-data /var/www/VeriSafe/frontend/dist
sudo chmod -R 755 /var/www/VeriSafe/frontend/dist
```

### 问题 2: 502 Bad Gateway
**原因：** Nginx 配置错误或服务未运行
```bash
# 检查 Nginx 配置
sudo nginx -t

# 检查 Nginx 状态
sudo systemctl status nginx

# 重启 Nginx
sudo systemctl restart nginx
```

### 问题 3: 页面空白或只显示背景
**原因：** JavaScript 文件路径错误
```bash
# 检查构建产物
ls -la /var/www/VeriSafe/frontend/dist/assets/

# 检查 Nginx 配置中的 root 路径是否正确
# 确保 root 指向 dist 目录
```

### 问题 4: WASM 文件加载失败
**原因：** CORS 头缺失
- 确保 Nginx 配置中有 WASM 文件的特殊处理（见步骤 3.2）

---

## 快速命令参考

```bash
# 部署
cd /var/www/VeriSafe && ./deploy.sh

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log

# 重启 Nginx
sudo systemctl restart nginx

# 测试 Nginx 配置
sudo nginx -t

# 查看服务状态
sudo systemctl status nginx
```

---

## 性能优化建议

### 1. 启用 Nginx 缓存
在 Nginx 配置中添加：
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m;
```

### 2. 使用 CDN（可选）
考虑使用 Cloudflare 或 AWS CloudFront 加速静态资源。

### 3. 启用 HTTP/2
确保 SSL 配置中包含 `http2`：
```nginx
listen 443 ssl http2;
```

---

## 安全建议

1. **定期更新系统**
   ```bash
   sudo apt update && sudo apt upgrade
   ```

2. **配置 SSH 密钥认证**
   ```bash
   # 禁用密码登录（在确保密钥可用后）
   sudo nano /etc/ssh/sshd_config
   # 设置: PasswordAuthentication no
   ```

3. **设置防火墙规则**
   - 只开放必要端口（80, 443, 22）

4. **定期备份**
   ```bash
   # 备份构建产物
   tar -czf verisafe-backup-$(date +%Y%m%d).tar.gz /var/www/VeriSafe/frontend/dist
   ```

---

完成！你的 VeriSafe 应用现在应该可以通过 HTTP 访问了。

如果要配置域名和 HTTPS，按照步骤 5 操作即可。

