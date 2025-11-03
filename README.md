# VeriSafe - A Privacy-Preserving KYC Tool Powered by FHE

VeriSafe is a decentralized Know Your Customer (KYC) tool built on the **Zama FHEVM** protocol. It redefines digital identity verification by allowing users to prove they meet specific requirements without revealing sensitive personal data. Powered by Fully Homemorphic Encryption (FHE), VeriSafe provides end-to-end privacy with on-chain verifiability. This initial version focuses on **age verification**, demonstrating the core technology.

## 🌟 Overview

Inspired by the privacy risks in processes like property rentals—where sensitive data such as age, income, and credit scores are often overexposed—VeriSafe offers a solution. The project was conceived to protect user data while still enabling eligibility checks. As its first use case, VeriSafe allows users to prove they meet an age threshold (e.g., 18+) without disclosing their actual age, with the entire process secured by FHE.

### Core Value Proposition

- **Zero Privacy Leakage**: User's age never appears in plaintext on-chain
- **On-Chain Verification**: Results are cryptographically verifiable
- **User-Controlled Decryption**: Only authorized users can decrypt verification results
- **Trustless System**: No intermediaries needed for verification

---

## 🔐 How FHE Powers VeriSafe

### FHE Application in Product Flow

**VeriSafe** leverages Fully Homomorphic Encryption at every critical stage:

#### 1. **Client-Side Encryption** (Frontend)
- User inputs their age in plaintext (e.g., `25`)
- Frontend uses `@zama-fhe/relayer-sdk` to encrypt the age **before** sending it to the blockchain
- The encrypted data (handle) is a 32-byte random-looking value that reveals nothing about the actual age
- A zero-knowledge proof is generated to verify the encryption is valid without revealing the plaintext

#### 2. **On-Chain Homomorphic Computation** (Smart Contract)
- Smart contract receives encrypted age (`externalEuint32`)
- Validates the zero-knowledge proof using `FHE.fromExternal()`
- Performs homomorphic comparison: `FHE.ge(encryptedAge, encryptedThreshold)`
- Returns encrypted boolean result (`ebool`) - **still encrypted**!
- All computations happen **without decrypting** the age value

#### 3. **Encrypted Storage** (Blockchain State)
- Verification results stored as encrypted boolean (`ebool`) in contract state
- Even when stored, the result remains encrypted on-chain
- Multiple verifications can be stored per user without privacy leakage

#### 4. **Permission-Based Decryption** (Frontend)
- Only users who were granted decryption permission can decrypt their results
- Decryption happens **off-chain** in the user's browser
- Requires EIP-712 signature to prove authorization
- Final result (`true`/`false`) is only revealed to the authorized user

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser (Frontend)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User Input: Age = 25 (plaintext)                         │
│     ↓                                                         │
│  2. FHE Encryption:                                          │
│     - createEncryptedInput()                                 │
│     - add32(25)                                              │
│     - encrypt() → {handle, inputProof}                       │
│                                                               │
│  3. Send Transaction:                                        │
│     - handle (32 bytes encrypted data)                       │
│     - inputProof (ZK proof ~100 bytes)                       │
│     ↓                                                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Ethereum Transaction
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Sepolia Testnet (Smart Contract)                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  4. Verify Proof:                                            │
│     - FHE.fromExternal(handle, proof)                        │
│     ↓                                                         │
│  5. Homomorphic Comparison:                                   │
│     - FHE.ge(encryptedAge, encryptedThreshold)              │
│     - Returns: encrypted boolean (ebool)                    │
│     - Age value never decrypted!                             │
│     ↓                                                         │
│  6. Grant Decryption Permission:                             │
│     - FHE.allow(result, userAddress)                        │
│     - Store encrypted result in mapping                     │
│     ↓                                                         │
│  7. Return: encrypted handle (ebool)                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Return Encrypted Handle
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser (Frontend)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  8. Retrieve Encrypted Result:                                │
│     - getLastVerificationResult() view function              │
│     ↓                                                         │
│  9. Generate FHE Keypair:                                    │
│     - generateKeypair()                                      │
│     ↓                                                         │
│  10. Create EIP-712 Permission:                               │
│      - createEIP712(keypair.publicKey, contracts, ...)      │
│      - Sign with user's wallet (MetaMask)                    │
│      ↓                                                        │
│  11. Decrypt Result:                                         │
│      - userDecrypt(handle, privateKey, signature, ...)      │
│      - Returns: true/false (plaintext)                       │
│      ↓                                                        │
│  12. Display Result to User:                                 │
│      - "✅ Qualified (Age 18+)" or                          │
│      - "❌ Not Qualified (Under 18)"                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key FHE Operations

| Stage | FHE Operation | Purpose |
|-------|--------------|---------|
| **Encryption** | `createEncryptedInput().add32()` | Convert plaintext age to encrypted handle |
| **Proof Generation** | `encrypt()` | Generate ZK proof for encrypted input |
| **On-Chain Validation** | `FHE.fromExternal()` | Verify proof and convert to internal encrypted type |
| **Homomorphic Comparison** | `FHE.ge()` | Compare encrypted age with encrypted threshold (18) |
| **Permission Management** | `FHE.allow()` | Grant user permission to decrypt result |
| **Off-Chain Decryption** | `userDecrypt()` | Decrypt result using authorized private key |

---

## 🔓 Understanding FHE Decryption Process

The decryption process in VeriSafe is **permission-based** and happens entirely in the user's browser. Here's how it works:

### Step-by-Step Decryption Flow

#### 1. **Encrypted Result Retrieval**
After the transaction is confirmed, the frontend calls the view function `getLastVerificationResult()` which returns an encrypted handle (32-byte `ebool` value). This handle is meaningless without the decryption key.

#### 2. **FHE Keypair Generation**
The frontend generates a fresh FHE keypair using `generateKeypair()`:
- **Public Key**: Used to create decryption permission
- **Private Key**: Used to actually decrypt the result (kept secret in browser)

#### 3. **EIP-712 Permission Request**
To decrypt the result, the user must prove they have permission. This is done through EIP-712 typed data signing:
- Creates structured permission data including:
  - User's FHE public key
  - Contract address that holds the encrypted result
  - Timestamp and duration of permission
- User signs this data with their wallet (MetaMask)
- Signature proves the user authorized this specific decryption

#### 4. **Decryption Execution**
With the permission signature, the frontend calls `userDecrypt()`:
```
userDecrypt(
  encryptedHandle,     // The ebool from contract
  privateKey,          // User's FHE private key
  publicKey,           // User's FHE public key  
  signature,           // EIP-712 signature from wallet
  contractAddress,     // VeriSafe contract address
  userAddress,         // User's wallet address
  timestamp,           // Permission validity period
  duration
)
```

#### 5. **Result Revelation**
The `userDecrypt()` function returns the plaintext boolean:
- `true` = Age >= 18 (Qualified)
- `false` = Age < 18 (Not Qualified)

**Important**: The decryption happens **off-chain** in the browser. The blockchain never sees the plaintext result. Only the user who has the correct FHE private key and permission signature can decrypt.

### Why Permission-Based Decryption?

The `FHE.allow(result, userAddress)` call in the smart contract creates a cryptographic link between:
- The encrypted result (`ebool`)
- The authorized user address
- The decryption permission

This ensures that:
- ✅ Only the user who initiated the verification can decrypt
- ✅ The result cannot be decrypted by unauthorized parties
- ✅ Even the contract itself cannot decrypt (privacy preserved)

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:

- **Node.js**: Version 20 or higher ([Download](https://nodejs.org/))
- **npm** or **yarn**: Package manager
- **MetaMask**: Browser extension wallet ([Install](https://metamask.io/))
- **Sepolia ETH**: Testnet ETH for gas fees (see [Getting Testnet ETH](#getting-sepolia-testnet-eth) below)
- **Git**: Version control ([Download](https://git-scm.com/))

### Installation & Setup

#### Step 1: Clone the Repository

   ```bash
git clone https://github.com/Markssssssss/VeriSafe.git
cd VeriSafe
```

#### Step 2: Install Dependencies

**Backend (Root Directory):**
```bash
# Install Hardhat and contract dependencies
   npm install
   ```

**Frontend:**
```bash
# Navigate to frontend directory
cd frontend

# Install React and frontend dependencies
npm install

# Return to root directory
cd ..
```

#### Step 3: Set Up Environment Variables

Configure Hardhat environment variables for deployment:

   ```bash
# Set your wallet mnemonic (for deploying contracts)
   npx hardhat vars set MNEMONIC

# Set your Alchemy API key (or Infura)
npx hardhat vars set ALCHEMY_API_KEY
# OR
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

**Note**: 
- `MNEMONIC`: Your wallet's 12-word seed phrase (keep this secret!)
- `ALCHEMY_API_KEY`: Get from [Alchemy](https://www.alchemy.com/) (free tier available)
- `INFURA_API_KEY`: Get from [Infura](https://www.infura.io/) (free tier available)

#### Step 4: Compile Smart Contracts

   ```bash
# Compile VeriSafe contract
   npm run compile

# Expected output:
# Compiled 2 Solidity files successfully
```

#### Step 5: Deploy to Sepolia Testnet

**Option A: Deploy New Contract**

```bash
# Deploy VeriSafe contract to Sepolia
npx hardhat deploy --network sepolia

# Expected output will show:
# VeriSafe contract: 0x...
```

**Option B: Use Existing Deployment**

If you want to use the already deployed contract:
- **Contract Address**: `0xc26042fd8F8fbE521814fE98C27B66003FD0553f`
- Update `frontend/src/App.tsx` line 7 with this address (already configured)

#### Step 6: Update Contract Address (if deploying new contract)

If you deployed a new contract, update the frontend:

```bash
# Edit frontend/src/App.tsx
# Find line 7: const CONTRACT_ADDRESS = "..."
# Replace with your deployed contract address
```

#### Step 7: Start Development Server

```bash
# Navigate to frontend
cd frontend

# Start Vite dev server
npm run dev

# Expected output:
# VITE v7.1.12  ready in XXX ms
# ➜  Local:   http://localhost:5173/
```

The frontend will automatically open in your browser at `http://localhost:5173`

---

### 🎮 Usage Guide

1. **Connect Wallet** - Click "Connect Wallet" and ensure MetaMask is on Sepolia Testnet
2. **Enter Age** - Input your age (integer 1-150)
3. **Verify** - Click "Verify Age" and confirm transaction in MetaMask
4. **Sign Permission** - Sign EIP-712 permission request for decryption
5. **View Result** - See verification result (Qualified/Not Qualified)

---

### 💧 Getting Sepolia Testnet ETH

You need Sepolia ETH to pay for gas fees. Get free testnet ETH from:

1. **Alchemy Sepolia Faucet**
   - Visit: https://sepoliafaucet.com/
   - Enter your wallet address
   - Request 0.5 ETH (free)

2. **PoW Faucet**
   - Visit: https://sepolia-faucet.pk910.de/
   - Solve a proof-of-work challenge
   - Receive 0.5-5 ETH

3. **QuickNode Faucet**
   - Visit: https://faucet.quicknode.com/ethereum/sepolia
   - Connect wallet or enter address
   - Receive testnet ETH

**Note**: Most faucets have rate limits (usually 24 hours). If one doesn't work, try another.

---

### Local Testing

#### Test on Local Hardhat Network

   ```bash
# Start local Hardhat node
   npx hardhat node

# In another terminal, deploy to localhost
   npx hardhat deploy --network localhost

# Update frontend/src/App.tsx with localhost contract address
# Start frontend (MetaMask needs to be on Localhost:8545)
cd frontend
npm run dev
```

#### Run Contract Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run coverage

# Run specific test file
npx hardhat test test/FHECounter.ts
```

#### Verify Contract on Etherscan

```bash
# Verify deployed contract
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

# Example:
npx hardhat verify --network sepolia 0xc26042fd8F8fbE521814fE98C27B66003FD0553f
```

---

### Build for Production

```bash
# Build frontend
cd frontend
npm run build

# Output will be in frontend/dist/
# Deploy the dist/ folder to your hosting service
```

#### 🖥️ Deployment Guide

- **[Vercel Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Cloud deployment (no server required)

---

## 📋 Available Scripts

### Backend (Root Directory)

   ```bash
# Compile smart contracts
npm run compile

# Run tests
npm test

# Run tests with coverage
npm run coverage

# Deploy to local network
npx hardhat node
npx hardhat deploy --network localhost

   # Deploy to Sepolia
   npx hardhat deploy --network sepolia

# Clean build artifacts
npm run clean

# Run linting
npm run lint
```

### Frontend

   ```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linting
npm run lint
```

---

## 📁 Project Structure

```
VeriSafe/
├── contracts/
│   └── VeriSafe.sol          # FHE-enabled age verification contract
├── deploy/
│   └── 02_verisafe.ts        # Deployment script
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main React component with FHE integration
│   │   └── ...
│   └── package.json
├── test/                     # Contract tests
├── hardhat.config.ts         # Hardhat configuration
└── README.md                 # This file
```

---

## 🔧 Technical Stack

- **Frontend**: React, TypeScript, Vite
- **Blockchain**: Ethereum (Sepolia Testnet)
- **FHE SDK**: `@zama-fhe/relayer-sdk`
- **Smart Contracts**: Solidity 0.8.20, Hardhat
- **FHE Library**: `@fhevm/solidity`
- **Wallet**: MetaMask / Ethers.js

---

## 📊 Contract Details

**Deployed Address (Sepolia)**: `0xc26042fd8F8fbE521814fE98C27B66003FD0553f`

**Key Functions**:
- `verifyAge(externalEuint32, bytes calldata)` - Verifies age using FHE
- `getLastVerificationResult()` - Retrieves encrypted verification result

---

## ✅ Verification Methods

To verify that FHE is actually being used:

1. **Check Transaction on Etherscan**
   - Visit: https://sepolia.etherscan.io/address/0xc26042fd8F8fbE521814fE98C27B66003FD0553f
   - View transactions - input data contains encrypted handles, not plaintext age
   - Check Gas consumption (FHE operations consume ~200,000+ Gas)

2. **Check Internal Transactions**
   - FHEVM precompile contracts are called during verification
   - Look for high Gas usage indicating FHE computations

3. **View Contract Storage**
   - Results stored as encrypted `ebool` values
   - No plaintext age or boolean values visible on-chain

---

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama Developer Program](https://docs.zama.ai/programs/developer-program)
- [Transaction Analysis](./TRANSACTION_ANALYSIS.md)
- [FHE Usage Summary](./FHE_USAGE_SUMMARY.md)

---

## 🔒 Privacy Guarantees

- ✅ **Age never appears in plaintext** on the blockchain
- ✅ **Encrypted data is meaningless** without decryption keys
- ✅ **Only authorized users** can decrypt their own results
- ✅ **On-chain storage is encrypted** (ebool values)
- ✅ **Zero-knowledge proofs** validate input without revealing it

---

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License.

---

## 🙏 Acknowledgments

Built with [Zama's FHEVM](https://docs.zama.ai/fhevm) protocol, enabling privacy-preserving computations on Ethereum.

---

**VeriSafe** - Verify Safely, Remain Private 🔐
