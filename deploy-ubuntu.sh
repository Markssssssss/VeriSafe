#!/bin/bash

# VeriSafe Ubuntu 服务器一键部署脚本
# 使用方法: bash deploy-ubuntu.sh

set -e  # 遇到错误立即退出

echo "========================================="
echo "🚀 VeriSafe Ubuntu 部署脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ 请不要使用 root 用户运行此脚本${NC}"
   echo "请使用普通用户，脚本会在需要时使用 sudo"
   exit 1
fi

# 检查操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo -e "${RED}❌ 无法检测操作系统版本${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 检测到系统: $OS $VER${NC}"
echo ""

# 设置项目路径
PROJECT_DIR="/var/www/verisafe"
FRONTEND_DIR="$PROJECT_DIR/VeriSafe-Final/frontend"

# 步骤 1: 更新系统
echo "========================================="
echo "📦 步骤 1: 更新系统软件包"
echo "========================================="
read -p "是否更新系统软件包? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo apt update
    sudo apt upgrade -y
    echo -e "${GREEN}✅ 系统更新完成${NC}"
else
    echo -e "${YELLOW}⚠️  跳过系统更新${NC}"
fi
echo ""

# 步骤 2: 安装 Node.js
echo "========================================="
echo "📦 步骤 2: 安装 Node.js 20.x"
echo "========================================="

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js 已安装: $NODE_VERSION${NC}"
    
    # 检查版本是否 >= 20
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 20 ]; then
        echo -e "${YELLOW}⚠️  Node.js 版本过低，需要 >= 20${NC}"
        read -p "是否重新安装 Node.js 20? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            INSTALL_NODE=true
        else
            INSTALL_NODE=false
        fi
    else
        INSTALL_NODE=false
    fi
else
    INSTALL_NODE=true
fi

if [ "$INSTALL_NODE" = true ]; then
    echo "正在安装 Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}✅ Node.js 安装完成${NC}"
fi

node --version
npm --version
echo ""

# 步骤 3: 安装 Nginx
echo "========================================="
echo "📦 步骤 3: 安装和配置 Nginx"
echo "========================================="

if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ Nginx 已安装${NC}"
else
    echo "正在安装 Nginx..."
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo -e "${GREEN}✅ Nginx 安装完成${NC}"
fi

# 检查 Nginx 状态
sudo systemctl is-active --quiet nginx && echo -e "${GREEN}✅ Nginx 正在运行${NC}" || echo -e "${RED}❌ Nginx 未运行${NC}"
echo ""

# 步骤 4: 配置防火墙
echo "========================================="
echo "🔐 步骤 4: 配置防火墙"
echo "========================================="

if command -v ufw &> /dev/null; then
    read -p "是否配置防火墙? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo ufw allow 22/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable
        echo -e "${GREEN}✅ 防火墙配置完成${NC}"
        sudo ufw status
    else
        echo -e "${YELLOW}⚠️  跳过防火墙配置${NC}"
    fi
else
    echo "正在安装 UFW..."
    sudo apt install -y ufw
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
    echo -e "${GREEN}✅ 防火墙配置完成${NC}"
fi
echo ""

# 步骤 5: 克隆/准备项目
echo "========================================="
echo "📥 步骤 5: 准备项目文件"
echo "========================================="

if [ -d "$PROJECT_DIR" ]; then
    echo -e "${GREEN}✅ 项目目录已存在: $PROJECT_DIR${NC}"
    read -p "是否更新代码? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd $PROJECT_DIR
        if [ -d ".git" ]; then
            git pull || echo -e "${YELLOW}⚠️  Git pull 失败，继续使用当前代码${NC}"
        else
            echo -e "${YELLOW}⚠️  不是 Git 仓库，跳过更新${NC}"
        fi
    fi
else
    read -p "请输入 Git 仓库地址 (留空跳过): " GIT_REPO
    if [ ! -z "$GIT_REPO" ]; then
        sudo mkdir -p /var/www
        sudo git clone $GIT_REPO $PROJECT_DIR
        sudo chown -R $USER:$USER $PROJECT_DIR
        echo -e "${GREEN}✅ 项目克隆完成${NC}"
    else
        echo -e "${YELLOW}⚠️  请手动上传项目到 $PROJECT_DIR${NC}"
        echo "然后重新运行此脚本"
        exit 1
    fi
fi
echo ""

# 步骤 6: 安装依赖和构建
echo "========================================="
echo "🔨 步骤 6: 安装依赖和构建项目"
echo "========================================="

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ 前端目录不存在: $FRONTEND_DIR${NC}"
    exit 1
fi

cd $FRONTEND_DIR

echo "正在安装前端依赖..."
npm install

echo "正在构建项目..."
npm run build

if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ 构建失败: 找不到 index.html${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 构建完成${NC}"
echo ""

# 步骤 7: 配置 Nginx
echo "========================================="
echo "⚙️  步骤 7: 配置 Nginx"
echo "========================================="

read -p "请输入域名或IP地址 (留空使用IP): " DOMAIN_OR_IP
if [ -z "$DOMAIN_OR_IP" ]; then
    DOMAIN_OR_IP="_"
fi

NGINX_CONFIG="/etc/nginx/sites-available/verisafe"

# 创建 Nginx 配置
sudo tee $NGINX_CONFIG > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN_OR_IP;

    root $FRONTEND_DIR/dist;
    index index.html;

    access_log /var/log/nginx/verisafe-access.log;
    error_log /var/log/nginx/verisafe-error.log;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin *;
    }

    location ~* \.wasm\$ {
        add_header Content-Type application/wasm;
        add_header Cross-Origin-Embedder-Policy require-corp;
        add_header Cross-Origin-Opener-Policy same-origin;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json application/wasm;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;
}
EOF

# 启用配置
sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/verisafe
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx 配置有效${NC}"
    sudo systemctl reload nginx
else
    echo -e "${RED}❌ Nginx 配置错误${NC}"
    exit 1
fi

# 设置文件权限
sudo chown -R www-data:www-data $FRONTEND_DIR/dist
sudo chmod -R 755 $FRONTEND_DIR/dist

echo -e "${GREEN}✅ Nginx 配置完成${NC}"
echo ""

# 步骤 8: SSL 证书（可选）
echo "========================================="
echo "🔒 步骤 8: SSL 证书配置（可选）"
echo "========================================="

read -p "是否配置 SSL 证书? (需要域名) (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ "$DOMAIN_OR_IP" = "_" ]; then
        read -p "请输入域名: " DOMAIN
    else
        DOMAIN=$DOMAIN_OR_IP
    fi
    
    if command -v certbot &> /dev/null; then
        echo "Certbot 已安装"
    else
        echo "正在安装 Certbot..."
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    echo "正在获取 SSL 证书..."
    sudo certbot --nginx -d $DOMAIN
    
    echo -e "${GREEN}✅ SSL 证书配置完成${NC}"
else
    echo -e "${YELLOW}⚠️  跳过 SSL 配置${NC}"
    echo -e "${YELLOW}   注意: MetaMask 连接需要 HTTPS${NC}"
fi
echo ""

# 完成
echo "========================================="
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "========================================="
echo ""
echo "📍 访问地址:"
if [ "$DOMAIN_OR_IP" != "_" ]; then
    echo "   HTTP:  http://$DOMAIN_OR_IP"
    echo "   HTTPS: https://$DOMAIN_OR_IP (如果已配置SSL)"
else
    echo "   http://$(hostname -I | awk '{print $1}')"
fi
echo ""
echo "📝 有用的命令:"
echo "   查看日志: sudo tail -f /var/log/nginx/verisafe-error.log"
echo "   重新部署: cd $FRONTEND_DIR && npm run build && sudo systemctl reload nginx"
echo "   测试配置: sudo nginx -t"
echo ""
echo -e "${GREEN}✅ 所有步骤完成！${NC}"

