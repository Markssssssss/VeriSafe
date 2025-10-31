# How to Verify FHE Usage on Etherscan

## 📍 Step-by-Step Guide

### Step 1: Find Your Transaction

1. **Get Transaction Hash**
   - Check browser console: `Transaction sent: 0x...`
   - Or check transaction history in MetaMask
   - Example: `0x484fe6943c5269a2c7e4bc9d3301057eb099618b9cff8e555b8e121b57b2ac12`

2. **Access Sepolia Etherscan**
   - Open: https://sepolia.etherscan.io/tx/YOUR_TX_HASH
   - Replace `YOUR_TX_HASH` with your actual transaction hash

### Step 2: View Transaction Details

On the transaction details page, check the following sections:

#### 2.1 View "To" Address
- **Should Display:** `0xc26042fd8F8fbE521814fE98C27B66003FD0553f` (Your VeriSafe contract address)
- **This Indicates:** Transaction is calling your contract

#### 2.2 View "Input Data"
- **Click "Decode Input Data" or view raw data**
- **Should See:**
  - `inputEuint32`: `0x...` (32-byte handle, this is encrypted data)
  - `inputProof`: `0x...` (~100-byte zero-knowledge proof)
  - **Should NOT See:** Plaintext age value (e.g., `0x00000014` representing 20)

### Step 3: View Internal Transactions - Critical!

This is the key step to view FHEVM precompiled contract calls:

1. **Scroll to "Internal Transactions" section on transaction details page**
   - Or directly visit: https://sepolia.etherscan.io/tx/YOUR_TX_HASH#internal

2. **Look for Precompiled Contract Calls**
   - FHEVM precompiled contract address format: `0x00000000000000000000000000000000000000XX`
   - Common addresses:
     - `0x0000000000000000000000000000000000000044` (FHE precompiled contract)
     - `0x0000000000000000000000000000000000000045` (FHE precompiled contract)

3. **Verify Calls**
   - **From:** `0xc26042fd8F8fbE521814fE98C27B66003FD0553f` (Your contract)
   - **To:** `0x0000000000000000000000000000000000000044` (FHEVM precompiled contract)
   - **Value:** 0 ETH
   - **Input:** Contains opcodes with encrypted data

### Step 4: View Contract State

1. **Visit Contract Page**
   - https://sepolia.etherscan.io/address/0xc26042fd8F8fbE521814fE98C27B66003FD0553f

2. **View "Read Contract"**
   - Call `getLastVerificationResult()`
   - **Result Should Display:** `0x...` (encrypted handle, not plaintext true/false)

3. **View "Write Contract" → Check Transaction History**
   - View `verifyAge` function call records
   - Input data should be encrypted handles

---

## 🔍 Indicators of FHE Operations

### ✅ Signs Indicating FHE Usage:

1. **High Gas Consumption**
   - FHE operations: 200,000+ Gas
   - Regular operations: ~21,000 Gas
   - **View Location:** "Gas Used" on transaction details page

2. **Precompiled Contract Calls**
   - See calls to `0x0000...0044` in "Internal Transactions"
   - **This Indicates:** FHE homomorphic operations were executed

3. **Encrypted Data Format**
   - Input data is 32-byte random data (handle)
   - Not plaintext numbers (e.g., `0x00000014` representing 20)

4. **Zero-Knowledge Proof**
   - `inputProof` field exists and is ~100 bytes
   - **This Indicates:** ZK proof used to verify validity of encrypted input

---

## 📊 Real Examples

### Comparison with Normal Transaction

**Traditional Method (No FHE):**
```
Input Data: 0x00000014  // Plaintext: 20
Gas Used: ~21,000
```

**FHE Method (This Project):**
```
Input Data: 0x2460e5c65698492360c9fda3a0c7b55cc17ab11121000000000000aa36a70400  // Encrypted handle
Gas Used: ~217,000
Internal Transaction to: 0x0000000000000000000000000000000000000044  // FHEVM precompiled
```

---

## 🛠️ Quick Verification Commands

### View Transaction in Terminal (Requires ALCHEMY_API_KEY or INFURA_API_KEY)

```bash
# View transaction details
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

### Verify Using Hardhat

```bash
cd VeriSafe-Final
npx hardhat verify --network sepolia 0xc26042fd8F8fbE521814fE98C27B66003FD0553f
```

---

## 📸 Visual Checklist

On Etherscan transaction page, confirm the following:

- [ ] **Transaction Status:** Success ✅
- [ ] **Gas Used:** > 200,000 (indicates FHE usage)
- [ ] **To Address:** Your contract address `0xc26042...`
- [ ] **Input Data:** Contains encrypted handle (32 bytes) and proof (~100 bytes)
- [ ] **Internal Transactions:** Contains call to `0x0000...0044` (FHEVM precompiled)
- [ ] **Contract Storage:** View contract state, stored values are encrypted handles, not plaintext

---

## 🔗 Useful Links

- **Sepolia Etherscan:** https://sepolia.etherscan.io
- **Your Contract:** https://sepolia.etherscan.io/address/0xc26042fd8F8fbE521814fE98C27B66003FD0553f
- **FHEVM Documentation:** https://docs.zama.ai/fhevm

---

## 💡 Tips

1. **If Internal Transactions Are Not Visible**
   - May need to refresh page
   - Some transactions may not display internal transactions (depends on Etherscan indexing)

2. **Gas Consumption Explanation**
   - FHE operations have high computational cost, this is normal
   - This is the price of privacy protection

3. **Verify Encryption**
   - Most direct verification: On Etherscan, you will never see plaintext age
   - All data is stored and transmitted in encrypted form (handles)
