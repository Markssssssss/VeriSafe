# Ubuntu服务器完整部署指南 - VeriSafe

这是一个从零开始的详细部署指南，适合没有服务器部署经验的新手。

---

## 📋 目录

1. [准备工作](#准备工作)
2. [连接服务器](#连接服务器)
3. [系统环境配置](#系统环境配置)
4. [项目部署](#项目部署)
5. [Web服务器配置](#web服务器配置)
6. [SSL证书配置](#ssl证书配置-可选但推荐)
7. [自动化部署](#自动化部署)
8. [常见问题排查](#常见问题排查)
9. [安全建议](#安全建议)
10. [维护指南](#维护指南)

---

## 准备工作

### 你需要准备的东西：

1. **Ubuntu服务器**
   - Ubuntu 20.04 LTS 或更高版本
   - 至少 1GB RAM
   - 至少 10GB 磁盘空间
   - 公网IP地址或域名

2. **SSH访问权限**
   - 服务器的IP地址
   - 用户名和密码（或SSH密钥）

3. **域名（可选）**
   - 如果没有域名，可以使用IP地址访问
   - 推荐购买域名（如从 Namecheap, GoDaddy 等）

---

## 连接服务器

### Windows用户

使用 **PuTTY** 或 **Windows Terminal**：

```bash
# 在Windows Terminal中
ssh username@your-server-ip

# 例如：
ssh root@192.168.1.100
```

### Mac/Linux用户

直接使用终端：

```bash
ssh username@your-server-ip

# 例如：
ssh ubuntu@123.45.67.89
```

**首次连接会提示确认指纹，输入 `yes` 即可。**

---

## 系统环境配置

### 步骤 1: 更新系统

```bash
# 更新软件包列表
sudo apt update

# 升级已安装的软件包
sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git build-essential
```

### 步骤 2: 安装 Node.js 20.x

VeriSafe 需要 Node.js 20 或更高版本。

```bash
# 方法1: 使用 NodeSource（推荐）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应该显示 v20.x.x
npm --version   # 应该显示 10.x.x 或更高
```

如果遇到问题，也可以使用 nvm：

```bash
# 方法2: 使用 NVM（Node Version Manager）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载shell配置
source ~/.bashrc

# 安装 Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# 验证
node --version
npm --version
```

### 步骤 3: 安装 Nginx

Nginx 是用于托管前端应用的Web服务器。

```bash
# 安装 Nginx
sudo apt install -y nginx

# 启动 Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 检查状态
sudo systemctl status nginx
```

**测试**: 在浏览器访问 `http://your-server-ip`，应该能看到 Nginx 默认页面。

### 步骤 4: 配置防火墙

```bash
# 安装 UFW（如果还没安装）
sudo apt install -y ufw

# 允许SSH（重要！先允许SSH，否则可能无法连接）
sudo ufw allow 22/tcp

# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

---

## 项目部署

### 步骤 1: 克隆项目

```bash
# 进入合适的目录
cd /var/www

# 如果没有 /var/www 目录，创建它
sudo mkdir -p /var/www

# 克隆仓库（替换为你的仓库地址）
sudo git clone https://github.com/Markssssssss/VeriSafe.git verisafe

# 如果仓库是私有的，需要配置SSH密钥或使用HTTPS + 个人访问令牌

# 修改所有权（替换 username 为你的用户名）
sudo chown -R $USER:$USER /var/www/verisafe

# 进入项目目录
cd /var/www/verisafe
```

**如果没有Git仓库，可以手动上传文件：**

```bash
# 1. 在你的本地电脑，打包项目
# 2. 使用 scp 上传到服务器
# scp -r /path/to/VeriSafe-Final username@server-ip:/var/www/verisafe
```

### 步骤 2: 安装项目依赖

```bash
# 进入项目根目录
cd /var/www/verisafe/VeriSafe-Final

# 安装后端依赖（可选，如果需要部署合约）
npm install

# 进入前端目录
cd frontend

# 安装前端依赖
npm install
```

**注意**: 如果 `npm install` 很慢，可以使用国内镜像：

```bash
# 使用淘宝镜像（临时）
npm install --registry=https://registry.npmmirror.com

# 或永久设置
npm config set registry https://registry.npmmirror.com
```

### 步骤 3: 构建前端

```bash
# 确保在 frontend 目录
cd /var/www/verisafe/VeriSafe-Final/frontend

# 构建生产版本
npm run build

# 检查构建结果
ls -la dist/

# 应该看到 index.html 和 assets/ 目录
```

**常见问题**:
- 如果构建失败，检查 `package.json` 中的脚本
- 确保 Node.js 版本 >= 20
- 查看错误日志定位问题

---

## Web服务器配置

### 步骤 1: 创建 Nginx 配置文件

```bash
# 创建配置文件
sudo nano /etc/nginx/sites-available/verisafe
```

**将以下内容粘贴进去**（根据你的情况修改）：

```nginx
server {
    listen 80;
    server_name your-domain.com your-server-ip;

    # 如果只有IP没有域名，使用：
    # server_name _;

    # 网站根目录指向构建后的前端文件
    root /var/www/verisafe/VeriSafe-Final/frontend/dist;
    index index.html;

    # 日志文件
    access_log /var/log/nginx/verisafe-access.log;
    error_log /var/log/nginx/verisafe-error.log;

    # 支持单页应用（React Router）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存（JS, CSS等）
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # CORS headers (如果需要)
        add_header Access-Control-Allow-Origin *;
    }

    # WASM文件特殊处理（FHEVM需要）
    location ~* \.wasm$ {
        add_header Content-Type application/wasm;
        add_header Cross-Origin-Embedder-Policy require-corp;
        add_header Cross-Origin-Opener-Policy same-origin;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types 
        text/plain 
        text/css 
        text/xml 
        text/javascript 
        application/javascript 
        application/xml+rss 
        application/json 
        application/wasm;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 文件大小限制（如果需要上传大文件）
    client_max_body_size 10M;
}
```

**保存文件**: 按 `Ctrl+O`，然后 `Enter`，最后 `Ctrl+X` 退出。

### 步骤 2: 启用配置

```bash
# 创建符号链接（启用站点）
sudo ln -s /etc/nginx/sites-available/verisafe /etc/nginx/sites-enabled/

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置是否正确
sudo nginx -t

# 如果看到 "test is successful"，继续下一步

# 重载 Nginx
sudo systemctl reload nginx
```

### 步骤 3: 设置文件权限

```bash
# 确保 Nginx 可以读取文件
sudo chown -R www-data:www-data /var/www/verisafe/VeriSafe-Final/frontend/dist
sudo chmod -R 755 /var/www/verisafe/VeriSafe-Final/frontend/dist
```

### 步骤 4: 测试访问

在浏览器中访问：
- `http://your-server-ip` 或
- `http://your-domain.com`

如果看到 VeriSafe 页面，说明部署成功！🎉

---

## SSL证书配置（可选但推荐）

HTTPS 是必须的，特别是处理区块链交互的应用。

### 使用 Let's Encrypt（免费）

**前提条件**: 需要有域名，并且域名已经指向服务器IP。

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书（替换为你的域名）
sudo certbot --nginx -d your-domain.com

# 或者如果有多个域名
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

**Certbot 会询问**:
- Email地址（用于证书到期提醒）
- 是否同意服务条款（输入 `A` 同意）
- 是否分享Email给EFF（可选，输入 `Y` 或 `N`）
- 是否将所有HTTP流量重定向到HTTPS（推荐输入 `2`）

### 自动续期

Let's Encrypt 证书每90天过期，Certbot 会自动续期。验证自动续期：

```bash
# 测试自动续期
sudo certbot renew --dry-run

# 查看证书状态
sudo certbot certificates
```

**完成后，你的网站应该可以通过 HTTPS 访问了！**

---

## 自动化部署

创建一个部署脚本，方便后续更新。

### 创建部署脚本

```bash
# 进入项目目录
cd /var/www/verisafe/VeriSafe-Final

# 创建脚本
nano deploy.sh
```

**添加以下内容**：

```bash
#!/bin/bash

# VeriSafe 自动部署脚本
set -e  # 遇到错误立即退出

echo "🚀 开始部署 VeriSafe..."

# 进入项目目录
cd /var/www/verisafe/VeriSafe-Final

# 拉取最新代码（如果使用Git）
echo "📥 拉取最新代码..."
git pull origin main || echo "⚠️  Git pull 失败，继续使用当前代码..."

# 进入前端目录
cd frontend

# 安装依赖（如果需要）
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🔨 构建前端..."
npm run build

# 检查构建结果
if [ ! -f "dist/index.html" ]; then
    echo "❌ 构建失败: 找不到 index.html"
    exit 1
fi

# 设置文件权限
echo "🔐 设置文件权限..."
sudo chown -R www-data:www-data dist
sudo chmod -R 755 dist

# 重载 Nginx
echo "🔄 重载 Nginx..."
sudo systemctl reload nginx

echo "✅ 部署完成！"
echo "📍 网站地址: https://your-domain.com"
```

**保存并设置执行权限**：

```bash
chmod +x deploy.sh
```

### 使用方法

```bash
# 运行部署脚本
./deploy.sh
```

---

## 常见问题排查

### 问题 1: 502 Bad Gateway

**可能原因**: Nginx 配置错误或服务未运行

**解决方法**:
```bash
# 检查 Nginx 配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 重启 Nginx
sudo systemctl restart nginx
```

### 问题 2: 403 Forbidden

**可能原因**: 文件权限问题

**解决方法**:
```bash
# 设置正确的权限
sudo chown -R www-data:www-data /var/www/verisafe/VeriSafe-Final/frontend/dist
sudo chmod -R 755 /var/www/verisafe/VeriSafe-Final/frontend/dist

# 检查目录权限
ls -la /var/www/verisafe/VeriSafe-Final/frontend/
```

### 问题 3: 空白页面

**可能原因**: 
- 构建失败
- JavaScript 文件路径错误
- WASM 文件未正确加载

**解决方法**:
```bash
# 检查构建输出
ls -la /var/www/verisafe/VeriSafe-Final/frontend/dist/assets/

# 检查浏览器控制台错误
# 在浏览器按 F12，查看 Console 标签

# 重新构建
cd /var/www/verisafe/VeriSafe-Final/frontend
rm -rf dist node_modules
npm install
npm run build
```

### 问题 4: WASM 文件加载失败

**可能原因**: CORS 或 Content-Type 头设置错误

**解决方法**: 确保 Nginx 配置中包含 WASM 文件的特殊处理（见上文配置）

### 问题 5: 无法连接 MetaMask

**可能原因**: 
- 网站未使用 HTTPS（MetaMask 要求 HTTPS）
- 网络配置错误

**解决方法**: 
- 配置 SSL 证书（见上文）
- 检查 MetaMask 网络设置

### 问题 6: 构建时内存不足

**解决方法**:
```bash
# 增加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久启用（添加到 /etc/fstab）
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 安全建议

### 1. 定期更新系统

```bash
# 设置自动安全更新（可选）
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 2. 配置 SSH 密钥认证

```bash
# 在本地生成密钥对（如果还没有）
ssh-keygen -t ed25519

# 复制公钥到服务器
ssh-copy-id username@server-ip

# 禁用密码登录（在服务器上）
sudo nano /etc/ssh/sshd_config
# 设置: PasswordAuthentication no

# 重启 SSH 服务
sudo systemctl restart sshd
```

### 3. 使用 Fail2Ban 防止暴力破解

```bash
# 安装 Fail2Ban
sudo apt install -y fail2ban

# 启动并启用
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# 查看状态
sudo fail2ban-client status
```

### 4. 定期备份

```bash
# 创建备份脚本
nano /home/username/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/username/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/verisafe-$DATE.tar.gz /var/www/verisafe
# 保留最近7天的备份
find $BACKUP_DIR -name "verisafe-*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x /home/username/backup.sh

# 添加到 crontab（每天凌晨2点备份）
crontab -e
# 添加: 0 2 * * * /home/username/backup.sh
```

---

## 维护指南

### 查看日志

```bash
# Nginx 访问日志
sudo tail -f /var/log/nginx/verisafe-access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/verisafe-error.log

# 系统日志
sudo journalctl -u nginx -f
```

### 监控资源使用

```bash
# 安装 htop（更好的 top）
sudo apt install -y htop

# 查看资源使用
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 更新项目

```bash
# 使用部署脚本（推荐）
cd /var/www/verisafe/VeriSafe-Final
./deploy.sh

# 或手动步骤
cd /var/www/verisafe/VeriSafe-Final
git pull
cd frontend
npm install
npm run build
sudo systemctl reload nginx
```

### 重启服务

```bash
# 重启 Nginx
sudo systemctl restart nginx

# 查看服务状态
sudo systemctl status nginx
```

---

## 快速命令参考

```bash
# 部署项目
cd /var/www/verisafe/VeriSafe-Final && ./deploy.sh

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/verisafe-error.log

# 测试 Nginx 配置
sudo nginx -t

# 重载 Nginx（不中断服务）
sudo systemctl reload nginx

# 重启 Nginx
sudo systemctl restart nginx

# 查看服务状态
sudo systemctl status nginx

# 查看证书过期时间
sudo certbot certificates

# 手动更新证书
sudo certbot renew
```

---

## 完成检查清单

- [ ] 服务器已连接
- [ ] Node.js 20+ 已安装
- [ ] Nginx 已安装并运行
- [ ] 防火墙已配置（端口 22, 80, 443）
- [ ] 项目已克隆到服务器
- [ ] 前端依赖已安装
- [ ] 前端已构建（dist 目录存在）
- [ ] Nginx 配置已创建并启用
- [ ] 网站可以通过 HTTP 访问
- [ ] SSL 证书已配置（HTTPS 可用）
- [ ] 部署脚本已创建
- [ ] MetaMask 可以连接（需要 HTTPS）

---

## 获取帮助

如果遇到问题：

1. **查看日志**: 检查 Nginx 错误日志和浏览器控制台
2. **检查配置**: 确保所有路径和域名正确
3. **测试步骤**: 逐步验证每个步骤是否成功
4. **社区支持**: 在项目的 GitHub Issues 提问

---

## 🎉 完成！

恭喜！你的 VeriSafe 应用现在应该已经在 Ubuntu 服务器上运行了。

**下一步**:
- 分享你的网站链接给朋友测试
- 配置自定义域名
- 设置监控和告警
- 定期更新和维护

祝部署顺利！🚀

