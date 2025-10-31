# Ubuntu Server Deployment Guide

## Prerequisites

- Ubuntu 20.04 or higher
- User with sudo privileges
- Server public IP or domain
- (Optional) Domain and SSL certificate

---

## Step 1: Install Required Software

### 1.1 Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Install Node.js (Recommended v20.x)
```bash
# Install Node.js 20 using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### 1.3 Install Nginx
```bash
sudo apt install -y nginx

# Start and enable on boot
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify status
sudo systemctl status nginx
```

### 1.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2

# Set PM2 to start on boot
pm2 startup
# Follow the prompt to execute the generated command (usually sudo env PATH=...)
```

---

## Step 2: Clone and Build Project

### 2.1 Clone Repository
```bash
# Navigate to appropriate directory
cd /var/www  # or your preferred directory

# Clone repository
sudo git clone https://github.com/Markssssssss/VeriSafe.git
sudo chown -R $USER:$USER VeriSafe
cd VeriSafe
```

### 2.2 Build Frontend
```bash
cd frontend

# Install dependencies
npm install

# Build production version
npm run build

# Verify build output
ls -la dist/
# Should see index.html and assets/ directory
```

---

## Step 3: Configure Nginx

### 3.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/verisafe
```

### 3.2 Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP
    
    # If you need to allow IP access, use:
    # server_name _;
    
    root /var/www/VeriSafe/frontend/dist;
    index index.html;

    # Support Single Page Application (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static asset caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WASM file special handling (FHEVM SDK requires)
    location ~* \.wasm$ {
        add_header Content-Type application/wasm;
        add_header Cross-Origin-Embedder-Policy require-corp;
        add_header Cross-Origin-Opener-Policy same-origin;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 3.3 Enable Configuration and Test
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/verisafe /etc/nginx/sites-enabled/

# Remove default configuration (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 4: Configure Firewall

### 4.1 Allow HTTP/HTTPS Ports
```bash
# UFW firewall
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS (if using SSL)
sudo ufw allow 22/tcp   # SSH (ensure you won't lock yourself out)
sudo ufw enable

# Verify
sudo ufw status
```

---

## Step 5: Configure SSL/HTTPS (Optional but Recommended)

### 5.1 Use Let's Encrypt (Free SSL)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (requires domain to point to server)
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 5.2 Certbot Will Automatically Update Nginx Configuration
Certificates will be in `/etc/letsencrypt/` directory, Nginx configuration will automatically update to HTTPS.

---

## Step 6: Automated Deployment Script

### 6.1 Create Deployment Script
```bash
cd /var/www/VeriSafe
nano deploy.sh
```

### 6.2 Add the following content:

```bash
#!/bin/bash

set -e  # Exit immediately on error

echo "🚀 Starting VeriSafe deployment..."

# Enter project directory
cd /var/www/VeriSafe

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Enter frontend directory
cd frontend

# Install dependencies (if needed)
echo "📦 Installing dependencies..."
npm install

# Build project
echo "🔨 Building frontend..."
npm run build

# Verify build
if [ ! -f "dist/index.html" ]; then
    echo "❌ Build failed: index.html not found"
    exit 1
fi

# Restart Nginx (if needed)
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "📍 Site should be available at: http://your-domain.com"
```

### 6.3 Set Execute Permissions
```bash
chmod +x deploy.sh
```

### 6.4 Use Deployment Script
```bash
./deploy.sh
```

---

## Step 7: Monitoring and Maintenance

### 7.1 View Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### 7.2 Check System Resources
```bash
# CPU and memory
htop  # Requires installation: sudo apt install htop

# Disk space
df -h
```

### 7.3 Set Up Auto-Updates (Optional)
```bash
# Create cron job to check for updates daily
crontab -e

# Add the following line (check and pull updates daily at 3 AM, but requires manual deployment execution)
0 3 * * * cd /var/www/VeriSafe && git fetch && git log HEAD..origin/main --oneline
```

---

## Troubleshooting

### Issue 1: 403 Forbidden
**Cause:** File permission issues
```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/VeriSafe/frontend/dist
sudo chmod -R 755 /var/www/VeriSafe/frontend/dist
```

### Issue 2: 502 Bad Gateway
**Cause:** Nginx configuration error or service not running
```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx
```

### Issue 3: Blank Page or Background Only
**Cause:** JavaScript file path errors
```bash
# Check build output
ls -la /var/www/VeriSafe/frontend/dist/assets/

# Check root path in Nginx configuration is correct
# Ensure root points to dist directory
```

### Issue 4: WASM Files Not Loading
**Cause:** Missing CORS headers
- Ensure Nginx configuration has special handling for WASM files (see Step 3.2)

---

## Quick Command Reference

```bash
# Deploy
cd /var/www/VeriSafe && ./deploy.sh

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx

# Test Nginx configuration
sudo nginx -t

# Check service status
sudo systemctl status nginx
```

---

## Performance Optimization Suggestions

### 1. Enable Nginx Caching
Add to Nginx configuration:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m;
```

### 2. Use CDN (Optional)
Consider using Cloudflare or AWS CloudFront to accelerate static assets.

### 3. Enable HTTP/2
Ensure SSL configuration includes `http2`:
```nginx
listen 443 ssl http2;
```

---

## Security Recommendations

1. **Regular System Updates**
   ```bash
   sudo apt update && sudo apt upgrade
   ```

2. **Configure SSH Key Authentication**
   ```bash
   # Disable password login (after ensuring key works)
   sudo nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   ```

3. **Set Firewall Rules**
   - Only open necessary ports (80, 443, 22)

4. **Regular Backups**
   ```bash
   # Backup build output
   tar -czf verisafe-backup-$(date +%Y%m%d).tar.gz /var/www/VeriSafe/frontend/dist
   ```

---

Done! Your VeriSafe application should now be accessible via HTTP.

If you want to configure domain and HTTPS, follow Step 5.
