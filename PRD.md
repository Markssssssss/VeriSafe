# Product Requirements Document (PRD): VeriSafe

**Version**: 1.0 (MVP)  
**Date**: October 31, 2025  
**Status**: Completed  
**Owner**: VeriSafe Development Team

---

## 1. Introduction & Vision

**VeriSafe** is a decentralized privacy-preserving verification tool built on the **Zama FHEVM** protocol. Our vision is to establish a new standard for qualification verification in the digital world, enabling users to securely and instantly prove they meet specific requirements **without exposing any sensitive personal data**.

For this MVP, **VeriSafe** focuses on verifying whether users meet the **legal age requirement** for signing rental contracts. Our core philosophy: **"Verify Safely, Remain Private"**.

---

## 2. Problem Statement

In various scenarios such as renting, online service registration, or age-restricted access, users are often required to prove their age, which creates direct privacy concerns:

### User Challenges:
- **Forced Privacy Exposure**: Applicants must provide ID documents to intermediaries, platforms, or institutions, exposing exact birth dates
- **High Data Breach Risk**: Once submitted, identity information storage and usage processes are opaque, easily misused or leaked
- **Over-Collection of Information**: Often, only a "yes/no" answer is needed (whether adult), but users are forced to provide complete identity information

### Service Provider Challenges:
- **Inefficient Screening Process**: Manual review of identity documents is time-consuming and labor-intensive
- **Heavy Compliance Burden**: Safely managing and storing user identity information is costly and carries significant legal risks

---

## 3. Solution & Objectives

**VeriSafe** provides a trustless solution through **Fully Homomorphic Encryption (FHE)** technology, fundamentally reshaping the age verification process.

### 3.1 Product Description

**VeriSafe** is a dApp deployed on Sepolia Testnet. It allows users to input their age in the frontend, which is encrypted locally, then computed on-chain by smart contracts in ciphertext, ultimately returning only a public, tamper-proof "Qualified" or "Not Qualified" boolean result.

### 3.2 MVP Objectives

- **Functional Goal**: Successfully implement an end-to-end, FHE-based **single-factor (age)** qualification verification flow
- **User Goal**: Provide users with a zero privacy-leakage age verification experience
- **Technical Goal**: Successfully deploy and run a minimal FHEVM smart contract on Sepolia Testnet
- **Strategic Goal**: Demonstrate the core value of FHE technology in solving real-world problems as a Zama Developer Program submission

---

## 4. FHE Application & Architecture

### 4.1 How FHE Powers VeriSafe

**Fully Homomorphic Encryption (FHE)** is the foundational technology that enables VeriSafe to perform computations on encrypted data without ever decrypting it. FHE is applied at every critical stage of the verification process:

#### Stage 1: Client-Side Encryption (Frontend Layer)
- **Location**: User's browser
- **Technology**: `@zama-fhe/relayer-sdk`
- **Process**:
  1. User inputs plaintext age (e.g., `25`)
  2. Frontend creates encrypted input using `createEncryptedInput(contractAddress, userAddress)`
  3. Age value is encrypted using `add32(age)` method
  4. Encryption generates:
     - **Handle** (32-byte encrypted representation - looks like random data)
     - **Zero-Knowledge Proof** (~100 bytes - proves encryption validity without revealing plaintext)
- **Privacy Guarantee**: Age never leaves the browser in plaintext form

#### Stage 2: On-Chain Homomorphic Computation (Smart Contract Layer)
- **Location**: Sepolia Testnet (Ethereum blockchain)
- **Technology**: `@fhevm/solidity` library
- **Process**:
  1. Contract receives encrypted age (`externalEuint32`) and proof
  2. Validates proof using `FHE.fromExternal(inputEuint32, inputProof)`
  3. Performs homomorphic comparison: `FHE.ge(encryptedAge, encryptedThreshold)`
     - **Key Point**: Comparison happens **on encrypted data** without decryption
     - Returns encrypted boolean (`ebool`) - still encrypted!
  4. Grants decryption permission: `FHE.allow(result, userAddress)`
  5. Stores encrypted result in contract state
- **Privacy Guarantee**: Age value remains encrypted throughout computation. Blockchain validators cannot see the actual age.

#### Stage 3: Encrypted Storage (Blockchain State)
- **Location**: Contract storage on blockchain
- **Data Type**: `ebool` (encrypted boolean)
- **Process**:
  - Verification results stored as encrypted values in `mapping(address => ebool)`
  - Multiple verifications per user can be stored without privacy leakage
  - Stored values are meaningless without decryption keys
- **Privacy Guarantee**: Even when stored on-chain, results remain encrypted

#### Stage 4: Permission-Based Decryption (Frontend Layer)
- **Location**: User's browser (off-chain)
- **Technology**: `userDecrypt()` with EIP-712 signature
- **Process**: See detailed decryption explanation in Section 4.2
- **Privacy Guarantee**: Only authorized users can decrypt their own results

### 4.2 FHE Decryption Process Explained

The decryption process in VeriSafe is **permission-based** and happens entirely off-chain in the user's browser. This ensures that plaintext results are never exposed on the blockchain.

#### Step 1: Encrypted Result Retrieval
After transaction confirmation, the frontend calls the view function `getLastVerificationResult()` which returns an encrypted handle (`ebool` - 32 bytes). This handle is a meaningless-looking hexadecimal value without the decryption key.

#### Step 2: FHE Keypair Generation
The frontend generates a fresh FHE keypair:
```typescript
const keypair = fhevmInstance.generateKeypair();
// Returns:
// - publicKey: Used for permission creation
// - privateKey: Used for actual decryption (kept secret in browser)
```
- **Public Key**: Used to create decryption permission
- **Private Key**: Used to decrypt the result (never sent to blockchain)

#### Step 3: EIP-712 Permission Request
To decrypt the result, the user must prove they have permission. This uses EIP-712 typed data signing:

**Permission Structure**:
- User's FHE public key
- Contract address holding the encrypted result
- User's wallet address
- Timestamp and duration of permission validity

**Process**:
1. Frontend creates EIP-712 structure using `createEIP712(keypair.publicKey, contracts, timestamp, duration)`
2. User signs this data with their wallet (MetaMask)
3. Signature proves the user authorized this specific decryption

**Why EIP-712?**
- Provides cryptographic proof that the user owns the wallet
- Links the decryption permission to the specific user and contract
- Prevents unauthorized decryption attempts

#### Step 4: Decryption Execution
With the permission signature, the frontend calls `userDecrypt()`:

```typescript
const decryptedResults = await fhevmInstance.userDecrypt(
  handleContractPair,    // Encrypted handle from contract
  keypair.privateKey,    // User's FHE private key
  keypair.publicKey,     // User's FHE public key
  signature,             // EIP-712 signature from wallet
  contractAddresses,     // VeriSafe contract address
  userAddress,           // User's wallet address
  timestamp,             // Permission validity period
  duration
);
```

**How It Works**:
1. Function validates the EIP-712 signature matches the user's wallet
2. Checks that the user has permission (granted by `FHE.allow()` in contract)
3. Uses FHE private key to decrypt the encrypted boolean
4. Returns plaintext result: `true` or `false`

#### Step 5: Result Revelation
The `userDecrypt()` function returns the plaintext boolean:
- `true` = Age >= 18 (Qualified)
- `false` = Age < 18 (Not Qualified)

**Critical Privacy Points**:
- ✅ Decryption happens **off-chain** in the browser
- ✅ Blockchain never sees the plaintext result
- ✅ Only the user with correct FHE private key + permission signature can decrypt
- ✅ Even if someone intercepts the encrypted handle, they cannot decrypt without:
  - The user's FHE private key
  - A valid EIP-712 signature from the user's wallet

### 4.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser (Frontend)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Input: Age = 25 (plaintext)                                 │
│    ↓                                                          │
│  FHE Encryption (createEncryptedInput → add32 → encrypt)    │
│    ↓                                                          │
│  Output: {handle: 0x..., inputProof: 0x...}                 │
│    ↓                                                          │
│  Send Transaction to Sepolia                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Ethereum Transaction
                          │ (encrypted data only)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Sepolia Testnet (Smart Contract)                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Receive: encrypted age + proof                              │
│    ↓                                                          │
│  Validate Proof (FHE.fromExternal)                          │
│    ↓                                                          │
│  Homomorphic Comparison (FHE.ge)                             │
│  ┌─────────────────────────────────────┐                     │
│  │ Compare encryptedAge >= 18          │                     │
│  │ WITHOUT decrypting either value     │                     │
│  │ Result: encrypted boolean (ebool)  │                     │
│  └─────────────────────────────────────┘                     │
│    ↓                                                          │
│  Grant Permission (FHE.allow)                                │
│    ↓                                                          │
│  Store encrypted result                                      │
│    ↓                                                          │
│  Return: encrypted handle                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Encrypted Handle
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser (Frontend)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Retrieve encrypted handle                                   │
│    ↓                                                          │
│  Generate FHE Keypair                                        │
│    ↓                                                          │
│  Create EIP-712 Permission (sign with wallet)               │
│    ↓                                                          │
│  Decrypt (userDecrypt) - OFF-CHAIN                           │
│    ↓                                                          │
│  Display Result: "Qualified" or "Not Qualified"            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Key FHE Operations Summary

| Operation | Location | Purpose | Privacy Impact |
|-----------|----------|---------|----------------|
| `createEncryptedInput()` | Frontend | Initialize encryption builder | Converts plaintext to encrypted handle |
| `add32()` | Frontend | Encrypt numeric value | Age becomes meaningless random data |
| `encrypt()` | Frontend | Generate handle + ZK proof | Proves validity without revealing age |
| `FHE.fromExternal()` | Contract | Validate and convert input | Verifies proof, age still encrypted |
| `FHE.ge()` | Contract | Compare encrypted values | **Core FHE operation** - comparison on ciphertext |
| `FHE.allow()` | Contract | Grant decryption permission | Creates cryptographic permission link |
| `userDecrypt()` | Frontend | Decrypt result | **Only authorized users** can decrypt |

---

## 5. Functional Requirements (MVP)

### 5.1 User Interface (Frontend)

#### F-01: Data Input Interface
- Simple form with single input field: **Age** (integer)
- Input validation: Must be integer, range 1-150, no decimals, no zero or negative values
- Invalid input triggers visual feedback (shake animation)

#### F-02: Wallet Connection
- Support MetaMask or standard Web3 wallets
- Automatic network switching to Sepolia Testnet
- Connection status persistence across page refreshes

#### F-03: Client-Side Encryption
- Age input encrypted using `@zama-fhe/relayer-sdk` **before** sending to blockchain
- Encryption generates:
  - Encrypted handle (32 bytes)
  - Zero-knowledge proof (~100 bytes)
- All encryption happens in browser - age never leaves as plaintext

#### F-04: Transaction Execution
- Call smart contract `verifyAge()` function with encrypted data
- Handle MetaMask transaction confirmation
- Wait for transaction confirmation

#### F-05: Result Decryption & Display
- After transaction confirmation, retrieve encrypted result
- Generate FHE keypair for decryption
- Create and sign EIP-712 permission request
- Decrypt result using `userDecrypt()`
- Display clear result: "✅ Qualified (Age 18+)" or "❌ Not Qualified (Under 18)"

### 5.2 Smart Contract (Backend)

#### C-01: Verification Logic
- Contract contains `verifyAge(externalEuint32, bytes calldata)` function
- Receives encrypted age input with zero-knowledge proof

#### C-02: Homomorphic Computation
- Uses `@fhevm/solidity` library
- Validates proof: `FHE.fromExternal(inputEuint32, inputProof)`
- Performs homomorphic comparison: `FHE.ge(encryptedAge, encryptedThreshold)`
- **Critical**: All computation happens on encrypted data - age never decrypted

#### C-03: Permission-Based Result Storage
- Result stored as encrypted boolean (`ebool`) in contract state
- Grants decryption permission: `FHE.allow(result, msg.sender)`
- Provides view function: `getLastVerificationResult()` to retrieve encrypted result

#### C-04: Threshold Configuration
- Age threshold set as `immutable` constant: `MIN_AGE = 18`
- Ensures transparency and gas efficiency

---

## 6. Technical Specifications

### 6.1 Technology Stack

**Frontend**:
- React 19.1.1
- TypeScript
- Vite 7.1.12
- Ethers.js 6.15.0

**FHE SDK**:
- `@zama-fhe/relayer-sdk` 0.2.0 (frontend encryption/decryption)

**Smart Contracts**:
- Solidity 0.8.20
- Hardhat
- `@fhevm/solidity` (FHEVM library)
- `@fhevm/hardhat-plugin` (development tools)

**Deployment Network**:
- Sepolia Testnet (Chain ID: 11155111)

### 6.2 Contract Details

**Deployed Address**: `0xc26042fd8F8fbE521814fE98C27B66003FD0553f`

**Key Functions**:
- `verifyAge(externalEuint32, bytes calldata) returns (ebool)` - Main verification function
- `getLastVerificationResult() returns (ebool)` - Retrieve encrypted result

**Gas Consumption**:
- Typical verification: ~215,000 Gas (FHE operations are computation-intensive)
- Compare to regular comparison: ~21,000 Gas

---

## 7. Privacy & Security Guarantees

### Privacy Guarantees:
- ✅ **Age never appears in plaintext** on the blockchain
- ✅ **Encrypted data is meaningless** without decryption keys
- ✅ **Only authorized users** can decrypt their own results
- ✅ **On-chain storage is encrypted** (ebool values)
- ✅ **Zero-knowledge proofs** validate input without revealing it
- ✅ **Decryption happens off-chain** in user's browser

### Security Guarantees:
- ✅ **Cryptographic proof** of encryption validity
- ✅ **Permission-based decryption** prevents unauthorized access
- ✅ **EIP-712 signatures** ensure authorization integrity
- ✅ **Immutable contract** threshold prevents tampering

---

## 8. Success Metrics

- ✅ **Project Completion**: Successfully deployed functional age verification demo on Sepolia
- ✅ **User Experience**: Users can complete full flow from input to result seamlessly
- ✅ **FHE Demonstration**: Clearly demonstrates FHE value in solving real-world privacy problems
- ✅ **Zama Program Evaluation**: Positive evaluation in Developer Program, especially in "Commercial Potential" and "FHE Value Demonstration"

---

## 9. Future Roadmap

### Post-MVP:
- **Multi-Factor Verification**: Re-introduce annual income, credit score, and other verification dimensions
- **Composable Verification Protocol**: Combine multiple verification factors
- **Verifiable Credentials**: Mint verification results as Soulbound Tokens (SBT) for reusable proofs

### Long-Term Vision:
- **Multi-Scenario Expansion**: Extend VeriSafe to online gaming, content platforms, financial services
- **API Service**: Provide B2B API services for businesses to integrate privacy-preserving verification
- **Cross-Chain Support**: Extend to other EVM-compatible chains

---

## 10. Verification & Testing

### How to Verify FHE Usage:

1. **Etherscan Transaction Analysis**:
   - Visit deployed contract on Sepolia Etherscan
   - View transaction input data - should contain encrypted handles, not plaintext age
   - Check Gas consumption (FHE operations consume ~200,000+ Gas)

2. **Internal Transaction Inspection**:
   - View internal transactions in Etherscan
   - Look for FHEVM precompile contract calls
   - High Gas usage indicates FHE computations

3. **Contract Storage Verification**:
   - Results stored as encrypted `ebool` values
   - No plaintext age or boolean values visible on-chain

---

## 11. Conclusion

VeriSafe demonstrates how **Fully Homomorphic Encryption** can enable privacy-preserving computations on public blockchains. By keeping sensitive data encrypted throughout the entire verification process - from input encryption, through on-chain computation, to result storage - VeriSafe provides a new paradigm for trustless verification without privacy compromise.

The architecture showcases FHE's core value proposition: **compute on encrypted data without ever decrypting it**, enabling both transparency (on-chain verification) and privacy (encrypted data) simultaneously.

---

**VeriSafe** - Verify Safely, Remain Private 🔐

