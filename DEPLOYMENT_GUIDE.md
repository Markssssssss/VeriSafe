# VeriSafe Deployment Guide - Vercel

This guide will help you deploy VeriSafe MVP to Vercel so remote friends can experience it.

## 📋 Prerequisites

1. **GitHub Account** (If you don't have one, register at: https://github.com)
2. **Vercel Account** (Free registration at: https://vercel.com)

---

## 🚀 Deployment Steps

### Method 1: Via Vercel CLI (Recommended, Fastest)

#### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Enter Frontend Directory and Deploy

```bash
cd VeriSafe-Final/frontend
vercel
```

Follow prompts:
- ✅ Link existing project to Vercel? Enter `N` (first deployment)
- ✅ Project name: Enter `verisafe` or press Enter for default name
- ✅ Directory: Press Enter (use current directory `frontend`)
- ✅ Override settings: Press Enter to use defaults

#### Step 4: Wait for Deployment

After deployment, Vercel will display:
```
✅ Production: https://verisafe.vercel.app
```

---

### Method 2: Via Vercel Website (Beginner-Friendly)

#### Step 1: Push Code to GitHub

```bash
# In VeriSafe-Final directory
cd /Users/mark/Desktop/cursor/zama/VeriSafe-Final

# Initialize Git (if not already done)
git init

# Create .gitignore (if not already exists)
# Ensure .gitignore includes node_modules, dist, .env, etc.

# Add all files
git add .

# Commit
git commit -m "Initial commit: VeriSafe MVP"

# Create new repository on GitHub, then push
git remote add origin https://github.com/YOUR_USERNAME/verisafe.git
git branch -M main
git push -u origin main
```

#### Step 2: Import Project in Vercel

1. Visit https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your GitHub repository
4. **Configure Project:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend` ⚠️ Important!
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. Click **"Deploy"**

#### Step 3: Wait for Deployment

Vercel will automatically:
- Install dependencies
- Build project
- Deploy to global CDN

---

## ⚙️ Configuration

### Vercel Project Settings (If Using Method 2)

In Vercel project settings, ensure:

```
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Environment Variables (If Needed)

Current project doesn't require environment variables (contract address is hardcoded), but if needed in the future, you can add them in Vercel project settings:

1. Go to Project Settings → Environment Variables
2. Add variables:
   - `VITE_CONTRACT_ADDRESS` = `0xc26042fd8F8fbE521814fE98C27B66003FD0553f`
   - `VITE_SEPOLIA_CHAIN_ID` = `11155111`

---

## 🔍 Verify Deployment

After deployment completes, visit your Vercel URL (e.g., `https://verisafe.vercel.app`) and confirm:

1. ✅ Page loads normally
2. ✅ Can connect wallet (MetaMask)
3. ✅ Network automatically switches to Sepolia
4. ✅ Can input age and verify
5. ✅ Transactions execute successfully

---

## 📝 Common Issues

### 1. Build Failed: Module Not Found

**Solution:**
Ensure all dependencies in `package.json` are correctly installed.

### 2. WebAssembly Files Not Loading

**Solution:**
Check if WASM header configuration in `vercel.json` is correct.

### 3. Route 404 Errors

**Solution:**
Ensure `rewrites` configuration in `vercel.json` is correct, all routes redirect to `index.html`.

### 4. FHEVM SDK Initialization Failed

**Possible Causes:**
- Browser incompatibility
- MetaMask not installed
- Network connection issues

**Solution:**
- Use Chrome or Firefox
- Ensure MetaMask is installed
- Check browser console for error messages

---

## 🔄 Update Deployment

After each push to GitHub, Vercel will automatically:
1. Detect new commits
2. Automatically rebuild
3. Deploy to production

Or manually trigger:
```bash
cd frontend
vercel --prod
```

---

## 🌐 Custom Domain (Optional)

1. In Vercel Project Settings → Domains
2. Add your custom domain
3. Follow prompts to configure DNS records

---

## 📊 Monitoring and Analytics

Vercel provides:
- **Analytics:** Access statistics
- **Speed Insights:** Performance monitoring
- **Logs:** Real-time log viewing

---

## ✅ Deployment Checklist

- [ ] GitHub repository created and code pushed
- [ ] Vercel account registered
- [ ] Project imported to Vercel
- [ ] Root Directory set to `frontend`
- [ ] Build Command set to `npm run build`
- [ ] Output Directory set to `dist`
- [ ] Deployment successful, URL accessible
- [ ] Feature testing passed (connect wallet, verify age)

---

## 🎉 After Completion

Share with friends:
```
🎊 VeriSafe MVP is now live!

Experience URL: https://verisafe.vercel.app

Usage Instructions:
1. Open the link
2. Connect MetaMask wallet
3. Switch to Sepolia testnet
4. Enter age to verify

⚠️ Note: Requires Sepolia testnet ETH (can get from faucet)
```

---

## 📚 Reference Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Example Project](https://nexus-social-dapp.vercel.app/)

---

## 💡 Tips

1. **First deployment may take 2-5 minutes**
2. **Subsequent updates only take 30 seconds - 1 minute**
3. **Vercel free tier is sufficient** (supports unlimited projects, automatic HTTPS, global CDN)
4. **Recommend using Vercel CLI** for faster and more convenient deployment

Happy deploying! 🚀
