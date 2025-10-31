# VeriSafe 部署指南 - Vercel

本指南将帮助您将 VeriSafe MVP 部署到 Vercel，让远程朋友可以体验。

## 📋 前置要求

1. **GitHub 账号**（如果没有，请先注册：https://github.com）
2. **Vercel 账号**（可以免费注册：https://vercel.com）

---

## 🚀 部署步骤

### 方法一：通过 Vercel CLI（推荐，最快）

#### 步骤 1：安装 Vercel CLI

```bash
npm i -g vercel
```

#### 步骤 2：登录 Vercel

```bash
vercel login
```

#### 步骤 3：进入前端目录并部署

```bash
cd VeriSafe-Final/frontend
vercel
```

按照提示：
- ✅ 是否要将现有项目链接到 Vercel？输入 `N`（首次部署）
- ✅ 项目名称：输入 `verisafe` 或直接回车使用默认名称
- ✅ 目录：直接回车（使用当前目录 `frontend`）
- ✅ 覆盖设置：直接回车使用默认

#### 步骤 4：等待部署完成

部署完成后，Vercel 会显示：
```
✅ Production: https://verisafe.vercel.app
```

---

### 方法二：通过 Vercel 网站（适合初学者）

#### 步骤 1：将代码推送到 GitHub

```bash
# 在 VeriSafe-Final 目录下
cd /Users/mark/Desktop/cursor/zama/VeriSafe-Final

# 初始化 Git（如果还没有）
git init

# 创建 .gitignore（如果还没有）
# 确保 .gitignore 包含 node_modules, dist, .env 等

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: VeriSafe MVP"

# 在 GitHub 创建新仓库，然后推送
git remote add origin https://github.com/YOUR_USERNAME/verisafe.git
git branch -M main
git push -u origin main
```

#### 步骤 2：在 Vercel 导入项目

1. 访问 https://vercel.com/new
2. 点击 **"Import Git Repository"**
3. 选择您的 GitHub 仓库
4. **配置项目：**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend` ⚠️ 重要！
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. 点击 **"Deploy"**

#### 步骤 3：等待部署完成

Vercel 会自动：
- 安装依赖
- 构建项目
- 部署到全球 CDN

---

## ⚙️ 配置说明

### Vercel 项目设置（如果使用方法二）

在 Vercel 项目设置中，确保：

```
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 环境变量（如果需要）

当前项目不需要环境变量（合约地址已硬编码），但如果将来需要，可以在 Vercel 项目设置中添加：

1. 进入项目设置 → Environment Variables
2. 添加变量：
   - `VITE_CONTRACT_ADDRESS` = `0xc26042fd8F8fbE521814fE98C27B66003FD0553f`
   - `VITE_SEPOLIA_CHAIN_ID` = `11155111`

---

## 🔍 验证部署

部署完成后，访问您的 Vercel URL（如 `https://verisafe.vercel.app`），确认：

1. ✅ 页面正常加载
2. ✅ 可以连接钱包（MetaMask）
3. ✅ 网络自动切换到 Sepolia
4. ✅ 可以输入年龄并验证
5. ✅ 交易可以成功执行

---

## 📝 常见问题

### 1. 构建失败：找不到模块

**解决方案：**
确保 `package.json` 中所有依赖都已正确安装。

### 2. WebAssembly 文件未加载

**解决方案：**
检查 `vercel.json` 中的 WASM 头部配置是否正确。

### 3. 路由 404 错误

**解决方案：**
确保 `vercel.json` 中的 `rewrites` 配置正确，所有路由都重定向到 `index.html`。

### 4. FHEVM SDK 初始化失败

**可能原因：**
- 浏览器不兼容
- MetaMask 未安装
- 网络连接问题

**解决方案：**
- 使用 Chrome 或 Firefox
- 确保安装了 MetaMask
- 检查浏览器控制台错误信息

---

## 🔄 更新部署

每次推送代码到 GitHub 后，Vercel 会自动：
1. 检测到新的提交
2. 自动重新构建
3. 部署到生产环境

或者手动触发：
```bash
cd frontend
vercel --prod
```

---

## 🌐 自定义域名（可选）

1. 在 Vercel 项目设置 → Domains
2. 添加您的自定义域名
3. 按照提示配置 DNS 记录

---

## 📊 监控和分析

Vercel 提供：
- **Analytics：** 访问统计
- **Speed Insights：** 性能监控
- **Logs：** 实时日志查看

---

## ✅ 部署检查清单

- [ ] GitHub 仓库已创建并推送代码
- [ ] Vercel 账号已注册
- [ ] 项目已在 Vercel 导入
- [ ] Root Directory 设置为 `frontend`
- [ ] Build Command 设置为 `npm run build`
- [ ] Output Directory 设置为 `dist`
- [ ] 部署成功，可以访问 URL
- [ ] 功能测试通过（连接钱包、验证年龄）

---

## 🎉 完成后

分享给朋友：
```
🎊 VeriSafe MVP 已上线！

体验地址：https://verisafe.vercel.app

使用说明：
1. 打开链接
2. 连接 MetaMask 钱包
3. 切换到 Sepolia 测试网
4. 输入年龄进行验证

⚠️ 注意：需要使用 Sepolia 测试网 ETH（可以从水龙头获取）
```

---

## 📚 参考资源

- [Vercel 文档](https://vercel.com/docs)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html#vercel)
- [示例项目](https://nexus-social-dapp.vercel.app/)

---

## 💡 提示

1. **首次部署可能需要 2-5 分钟**
2. **后续更新部署只需 30 秒-1 分钟**
3. **Vercel 免费版完全够用**（支持无限项目、自动 HTTPS、全球 CDN）
4. **建议使用 Vercel CLI**，部署更快更方便

祝部署顺利！🚀

