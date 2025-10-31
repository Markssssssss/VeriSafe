# 如何在 Etherscan 上验证 FHE 使用

## 📍 步骤指南

### 步骤1：找到您的交易

1. **获取交易哈希（Transaction Hash）**
   - 在浏览器控制台查看：`Transaction sent: 0x...`
   - 或者在 MetaMask 中查看交易历史
   - 示例：`0x484fe6943c5269a2c7e4bc9d3301057eb099618b9cff8e555b8e121b57b2ac12`

2. **访问 Sepolia Etherscan**
   - 打开：https://sepolia.etherscan.io/tx/YOUR_TX_HASH
   - 将 `YOUR_TX_HASH` 替换为您的实际交易哈希

### 步骤2：查看交易详情

在交易详情页面，查看以下部分：

#### 2.1 查看 "To" 地址
- **应该显示：** `0xc26042fd8F8fbE521814fE98C27B66003FD0553f`（您的 VeriSafe 合约地址）
- **这表明：** 交易是调用您的合约

#### 2.2 查看 "Input Data"
- **点击 "Decode Input Data" 或查看原始数据**
- **应该看到：**
  - `inputEuint32`: `0x...`（32字节的 handle，这是加密数据）
  - `inputProof`: `0x...`（约100字节的零知识证明）
  - **不应该看到：** 明文年龄值（如 `0x00000014` 表示20）

### 步骤3：查看内部交易（Internal Transactions）- 关键！

这是查看 FHEVM 预编译合约调用的关键步骤：

1. **滚动到交易详情页面的 "Internal Transactions" 部分**
   - 或者直接访问：https://sepolia.etherscan.io/tx/YOUR_TX_HASH#internal

2. **查找预编译合约调用**
   - FHEVM 预编译合约地址格式：`0x00000000000000000000000000000000000000XX`
   - 常见地址：
     - `0x0000000000000000000000000000000000000044` (FHE 预编译合约)
     - `0x0000000000000000000000000000000000000045` (FHE 预编译合约)

3. **验证调用**
   - **From:** `0xc26042fd8F8fbE521814fE98C27B66003FD0553f` (您的合约)
   - **To:** `0x0000000000000000000000000000000000000044` (FHEVM 预编译合约)
   - **Value:** 0 ETH
   - **Input:** 包含加密数据的操作码

### 步骤4：查看合约状态（State）

1. **访问合约页面**
   - https://sepolia.etherscan.io/address/0xc26042fd8F8fbE521814fE98C27B66003FD0553f

2. **查看 "Read Contract"**
   - 调用 `getLastVerificationResult()`
   - **结果应该显示：** `0x...`（加密的 handle，不是明文 true/false）

3. **查看 "Write Contract" → 查看交易历史**
   - 查看 `verifyAge` 函数的调用记录
   - 输入数据应该是加密的 handle

---

## 🔍 识别 FHE 操作的标志

### ✅ 表明使用了 FHE 的标志：

1. **高 Gas 消耗**
   - FHE 运算：200,000+ Gas
   - 普通运算：~21,000 Gas
   - **查看位置：** 交易详情页面的 "Gas Used"

2. **预编译合约调用**
   - 在 "Internal Transactions" 中看到对 `0x0000...0044` 的调用
   - **这表明：** 执行了 FHE 同态运算

3. **加密数据格式**
   - 输入数据是 32 字节的随机数据（handle）
   - 不是明文的数字（如 `0x00000014` 表示 20）

4. **零知识证明**
   - `inputProof` 字段存在且约 100 字节
   - **这表明：** 使用了 ZK 证明验证加密输入的有效性

---

## 📊 实际示例

### 正常交易的对比

**传统方式（不使用 FHE）：**
```
Input Data: 0x00000014  // 明文：20
Gas Used: ~21,000
```

**FHE 方式（本项目）：**
```
Input Data: 0x2460e5c65698492360c9fda3a0c7b55cc17ab11121000000000000aa36a70400  // 加密 handle
Gas Used: ~217,000
Internal Transaction to: 0x0000000000000000000000000000000000000044  // FHEVM 预编译
```

---

## 🛠️ 快速验证命令

### 在终端查看交易（需要 ALCHEMY_API_KEY 或 INFURA_API_KEY）

```bash
# 查看交易详情
curl "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "eth_getTransactionReceipt",
    "params": ["YOUR_TX_HASH"]
  }'
```

### 使用 Hardhat 验证

```bash
cd VeriSafe-Final
npx hardhat verify --network sepolia 0xc26042fd8F8fbE521814fE98C27B66003FD0553f
```

---

## 📸 视觉化检查清单

在 Etherscan 交易页面，确认以下内容：

- [ ] **交易状态：** Success ✅
- [ ] **Gas Used：** > 200,000（表明使用了 FHE）
- [ ] **To 地址：** 您的合约地址 `0xc26042...`
- [ ] **Input Data：** 包含加密 handle（32字节）和 proof（~100字节）
- [ ] **Internal Transactions：** 包含对 `0x0000...0044` 的调用（FHEVM 预编译）
- [ ] **合约存储：** 查看合约状态，存储的是加密的 handle，不是明文

---

## 🔗 有用的链接

- **Sepolia Etherscan：** https://sepolia.etherscan.io
- **您的合约：** https://sepolia.etherscan.io/address/0xc26042fd8F8fbE521814fE98C27B66003FD0553f
- **FHEVM 文档：** https://docs.zama.ai/fhevm

---

## 💡 提示

1. **如果看不到 Internal Transactions**
   - 可能需要刷新页面
   - 某些交易可能没有显示内部交易（取决于 Etherscan 的索引）

2. **Gas 消耗说明**
   - FHE 运算的计算成本很高，这是正常的
   - 这是保护隐私的代价

3. **验证加密性**
   - 最直接的验证：在 Etherscan 上，您永远看不到明文年龄
   - 所有数据都以加密形式（handle）存储和传输

