#!/bin/bash

# VeriSafe Ubuntu 一键部署脚本
# 使用方法: bash deploy-ubuntu.sh

set -e  # 遇到错误立即退出

echo "🚀 VeriSafe Ubuntu 一键部署脚本"
echo "=================================="

# 检查是否以 root 或 sudo 运行
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  需要使用 sudo 权限运行此脚本"
    echo "   请运行: sudo bash deploy-ubuntu.sh"
    exit 1
fi

# 1. 更新系统
echo ""
echo "📦 步骤 1/7: 更新系统软件包..."
apt update -qq
apt upgrade -y -qq

# 2. 安装基础工具
echo ""
echo "🔧 步骤 2/7: 安装基础工具..."
apt install -y curl wget git build-essential -qq

# 3. 安装 Node.js 20
echo ""
echo "📦 步骤 3/7: 安装 Node.js 20..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        echo "✅ Node.js 已安装 (版本 >= 20)"
    else
        echo "⚠️  Node.js 版本过低，正在更新..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
    fi
else
    echo "📥 安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# 验证 Node.js 安装
node --version
npm --version

# 4. 安装 Nginx
echo ""
echo "🌐 步骤 4/7: 安装 Nginx..."
if command -v nginx &> /dev/null; then
    echo "✅ Nginx 已安装"
else
    apt install -y nginx -qq
    systemctl start nginx
    systemctl enable nginx
fi

# 5. 配置防火墙
echo ""
echo "🔥 步骤 5/7: 配置防火墙..."
if command -v ufw &> /dev/null; then
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    echo "✅ 防火墙已配置"
else
    echo "⚠️  UFW 未安装，跳过防火墙配置"
fi

# 6. 部署项目
echo ""
echo "📥 步骤 6/7: 部署项目..."

# 检查项目目录是否存在
PROJECT_DIR="/var/www/verisafe"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📂 创建项目目录..."
    mkdir -p $PROJECT_DIR
    cd /var/www
    echo "📥 从 GitHub 克隆项目..."
    git clone https://github.com/Markssssssss/VeriSafe.git verisafe || {
        echo "❌ Git 克隆失败"
        echo "   请手动克隆项目: git clone https://github.com/Markssssssss/VeriSafe.git verisafe"
        exit 1
    }
fi

cd $PROJECT_DIR/VeriSafe-Final

# 拉取最新代码（如果使用 Git）
if [ -d ".git" ]; then
    echo "🔄 更新代码..."
    git pull origin main || echo "⚠️  Git pull 失败，继续使用当前代码..."
fi

# 安装依赖
echo "📦 安装后端依赖..."
npm install --silent

echo "📦 安装前端依赖..."
cd frontend
npm install --silent

# 构建前端
echo "🔨 构建前端..."
npm run build

# 检查构建结果
if [ ! -f "dist/index.html" ]; then
    echo "❌ 构建失败: 找不到 dist/index.html"
    exit 1
fi

# 设置文件权限
echo "🔐 设置文件权限..."
chown -R www-data:www-data dist
chmod -R 755 dist

# 7. 配置 Nginx
echo ""
echo "⚙️  步骤 7/7: 配置 Nginx..."

NGINX_CONFIG="/etc/nginx/sites-available/verisafe"
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "📝 创建 Nginx 配置文件..."
    
    read -p "请输入域名（直接回车使用 IP 地址）: " DOMAIN
    
    if [ -z "$DOMAIN" ]; then
        SERVER_NAME="_"
    else
        SERVER_NAME="$DOMAIN www.$DOMAIN"
    fi
    
    cat > $NGINX_CONFIG <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;
    
    root $PROJECT_DIR/VeriSafe-Final/frontend/dist;
    index index.html;
    
    access_log /var/log/nginx/verisafe_access.log;
    error_log /var/log/nginx/verisafe_error.log;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json application/wasm;
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.wasm$ {
        add_header Content-Type application/wasm;
        add_header Cross-Origin-Embedder-Policy require-corp;
        add_header Cross-Origin-Opener-Policy same-origin;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.js$ {
        add_header Content-Type application/javascript;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF
    
    # 启用站点
    ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
    
    # 删除默认站点（如果存在）
    [ -f /etc/nginx/sites-enabled/default ] && rm /etc/nginx/sites-enabled/default
    
    # 测试配置
    nginx -t
    
    # 重载 Nginx
    systemctl reload nginx
    
    echo "✅ Nginx 配置完成"
else
    echo "✅ Nginx 配置已存在"
    systemctl reload nginx
fi

echo ""
echo "=================================="
echo "✅ 部署完成！"
echo ""
echo "📍 访问地址:"
if [ "$SERVER_NAME" != "_" ]; then
    echo "   http://$DOMAIN"
else
    echo "   http://$(hostname -I | awk '{print $1}')"
fi
echo ""
echo "💡 如需配置 SSL 证书，请运行:"
echo "   sudo certbot --nginx -d your-domain.com"
echo ""
