# 生产环境部署问题排查指南

## 问题：本地正常，服务器上没有 UI（只有背景图）

### 🔍 排查步骤

#### 1. 检查构建后的 `index.html`

在服务器上执行：
```bash
cat /var/www/VeriSafe/frontend/dist/index.html
```

**关键检查点：**
- ✅ `<script type="module" src="/assets/xxx.js">` (应该是 `/assets/` 路径，**不是** `/src/main.tsx`)
- ❌ 如果看到 `/src/main.tsx`，说明构建有问题

#### 2. 检查构建输出目录结构

```bash
ls -la /var/www/VeriSafe/frontend/dist/
ls -la /var/www/VeriSafe/frontend/dist/assets/
```

**应该看到：**
- `index.html`
- `assets/` 目录
- `assets/*.js` 文件
- `assets/*.wasm` 文件（至少应该有 `tfhe_bg.wasm` 和 `kms_lib_bg.wasm`）

#### 3. 检查 Nginx 配置的 root 路径

```bash
cat /etc/nginx/sites-available/verisafe | grep root
```

**应该显示：**
```
root /var/www/VeriSafe/frontend/dist;
```

#### 4. 检查浏览器控制台的网络请求

在浏览器中打开开发者工具（F12）：
- **Network 标签**：检查哪些文件加载失败（红色）
- **Console 标签**：查看具体错误信息

**常见问题：**
- ❌ `404 Not Found` - 路径问题
- ❌ `Failed to load module script` - MIME 类型问题
- ❌ `CORS error` - 跨域问题
- ❌ `WASM loading failed` - WASM 文件路径或 headers 问题

#### 5. 检查 Nginx 错误日志

```bash
sudo tail -f /var/log/nginx/error.log
```

然后在浏览器中刷新页面，查看是否有错误记录。

#### 6. 测试静态文件访问

直接在浏览器中访问：
- `http://your-server-ip/assets/index.xxx.js` （替换 xxx 为实际 hash）
- `http://your-server-ip/assets/tfhe_bg.wasm`

如果这些文件无法访问，说明 Nginx 配置有问题。

---

## 🐛 常见问题及解决方案

### 问题 1: 构建后的 index.html 仍包含 `/src/main.tsx`

**原因：** Vite 构建时没有正确替换路径

**解决：**
```bash
cd /var/www/VeriSafe/frontend
rm -rf dist node_modules/.vite
npm install
npm run build
```

### 问题 2: WASM 文件 404 或无法加载

**原因：** WASM 文件路径不正确或缺少必要的 HTTP headers

**检查 Nginx 配置：**
```bash
# 确认 WASM 文件的 location 配置
grep -A 5 "\.wasm" /etc/nginx/sites-available/verisafe
```

**应该包含：**
```nginx
location ~* \.wasm$ {
    add_header Content-Type application/wasm;
    add_header Cross-Origin-Embedder-Policy require-corp;
    add_header Cross-Origin-Opener-Policy same-origin;
    expires 1y;
}
```

### 问题 3: JavaScript 文件 404

**原因：** Nginx root 路径配置错误或文件不存在

**检查：**
```bash
# 确认文件存在
ls -lh /var/www/VeriSafe/frontend/dist/assets/*.js

# 确认 Nginx 可以读取
sudo -u www-data ls /var/www/VeriSafe/frontend/dist/assets/
```

**如果无法读取，修复权限：**
```bash
sudo chown -R www-data:www-data /var/www/VeriSafe/frontend/dist
sudo chmod -R 755 /var/www/VeriSafe/frontend/dist
```

### 问题 4: 路径前缀问题（如果部署在子目录）

**如果部署在子目录（如 `/verisafe/`）：**

修改 `vite.config.ts`：
```typescript
export default defineConfig({
  base: '/verisafe/',  // 添加这行
  // ... 其他配置
})
```

然后重新构建。

---

## 📋 完整检查清单

在服务器上执行以下命令，收集诊断信息：

```bash
# 1. 检查构建输出
echo "=== 构建输出检查 ==="
ls -lah /var/www/VeriSafe/frontend/dist/
echo ""
ls -lah /var/www/VeriSafe/frontend/dist/assets/ | head -10

# 2. 检查 index.html 内容
echo ""
echo "=== index.html 内容（前 50 行）==="
head -50 /var/www/VeriSafe/frontend/dist/index.html

# 3. 检查 Nginx 配置
echo ""
echo "=== Nginx 配置 ==="
cat /etc/nginx/sites-available/verisafe

# 4. 检查文件权限
echo ""
echo "=== 文件权限 ==="
ls -ld /var/www/VeriSafe/frontend/dist
ls -ld /var/www/VeriSafe/frontend/dist/assets

# 5. 测试 Nginx 配置
echo ""
echo "=== Nginx 配置测试 ==="
sudo nginx -t

# 6. 检查 Nginx 状态
echo ""
echo "=== Nginx 状态 ==="
sudo systemctl status nginx --no-pager -l
```

将输出结果发送给技术支持，可以快速定位问题。

---

## 🔧 快速修复命令

如果确定是权限问题：

```bash
sudo chown -R www-data:www-data /var/www/VeriSafe/frontend/dist
sudo chmod -R 755 /var/www/VeriSafe/frontend/dist
sudo systemctl restart nginx
```

如果确定是构建问题：

```bash
cd /var/www/VeriSafe/frontend
rm -rf dist node_modules/.vite
npm install
npm run build
sudo systemctl restart nginx
```

---

## 📞 如果问题仍然存在

请提供以下信息：
1. 浏览器控制台的完整错误信息（截图或文本）
2. Network 标签中失败的请求列表
3. 上述诊断命令的输出结果
4. Nginx 错误日志（`/var/log/nginx/error.log`）的相关部分

