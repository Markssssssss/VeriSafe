import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { initSDK, createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/web';
import './App.css';

// Sepolia testnet contract address
const CONTRACT_ADDRESS = "0xc26042fd8F8fbE521814fE98C27B66003FD0553f";

// Contract ABI (extracted from artifacts)
// @ts-ignore - ABI is kept for future use when FHEVM integration is complete
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "externalEuint32",
        "name": "inputEuint32",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "verifyAge",
    "outputs": [
      {
        "internalType": "ebool",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLastVerificationResult",
    "outputs": [
      {
        "internalType": "ebool",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Sepolia testnet Chain ID
const SEPOLIA_CHAIN_ID = 11155111;

function App() {
  // Restore view state from localStorage, default to 'intro' if not found
  const [view, setView] = useState<'intro' | 'main'>(() => {
    const savedView = localStorage.getItem('verisafe-view');
    return (savedView === 'main' || savedView === 'intro') ? savedView : 'intro';
  });
  
  const [account, setAccount] = useState<string | null>(null);
  const [age, setAge] = useState<string>('');
  const [result, setResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null); // Copy success indicator
  const [userDisconnected, setUserDisconnected] = useState<boolean>(false); // Track if user manually disconnected
  
  // Save view state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('verisafe-view', view);
  }, [view]);
  
  // Use useRef to persist provider and signer
  const providerRef = React.useRef<ethers.BrowserProvider | null>(null);
  const signerRef = React.useRef<ethers.JsonRpcSigner | null>(null);
  const fhevmInstanceRef = React.useRef<any>(null); // FHEVM instance

  // Listen for wallet account and network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('Accounts changed:', accounts);
      if (accounts.length === 0) {
        // User disconnected wallet in MetaMask
        providerRef.current = null;
        signerRef.current = null;
        setAccount(null);
        setResult(null);
        setError(null);
        setAge('');
        setUserDisconnected(true); // Also mark as disconnected when MetaMask disconnects
      } else if (accounts[0] !== account) {
        // User switched account or reconnected
        // Recreate provider if it doesn't exist
        if (!providerRef.current && window.ethereum) {
          providerRef.current = new ethers.BrowserProvider(window.ethereum);
        }
        if (providerRef.current) {
          try {
            const signer = await providerRef.current.getSigner();
            signerRef.current = signer;
            setAccount(accounts[0]);
          } catch (e) {
            console.error('Error updating signer:', e);
            // If unable to get signer, clear state
            providerRef.current = null;
            signerRef.current = null;
            setAccount(null);
          }
        }
      }
    };

    const handleChainChanged = () => {
      // Reload page when network changes
      console.log('Chain changed, reloading...');
      window.location.reload();
    };

    const handleDisconnect = () => {
      // MetaMask disconnect event (if supported)
      console.log('MetaMask disconnected');
      providerRef.current = null;
      signerRef.current = null;
      setAccount(null);
      setResult(null);
      setError(null);
      setAge('');
    };

    // Listen for events
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Some versions of MetaMask support disconnect event
      try {
        if ('on' in window.ethereum && typeof window.ethereum.on === 'function') {
          window.ethereum.on('disconnect', handleDisconnect);
        }
      } catch (e) {
        // disconnect event may not be supported, ignore error
      }
    }

    // Periodic connection status check (as fallback)
    const checkConnection = async () => {
      if (account && providerRef.current && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length === 0) {
            // No connected accounts, clear state
            handleAccountsChanged([]);
          }
        } catch (e) {
          console.error('Error checking connection:', e);
        }
      }
    };
    
    const intervalId = setInterval(checkConnection, 2000); // Check every 2 seconds

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        try {
          window.ethereum.removeListener('disconnect', handleDisconnect);
        } catch (e) {
          // Ignore
        }
      }
      clearInterval(intervalId);
    };
  }, [account]);

  // Check wallet connection status when entering main page
  // Only check if user hasn't manually disconnected
  useEffect(() => {
    // Don't use early return - always execute the effect to maintain Hook order
    if (view === 'main' && !userDisconnected) {
      const checkWalletConnection = async () => {
        try {
          if (!window.ethereum) {
            // No MetaMask, clear wallet state
            providerRef.current = null;
            signerRef.current = null;
            setAccount(null);
            return;
          }

          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length === 0) {
            // No connected accounts, clear wallet state
            providerRef.current = null;
            signerRef.current = null;
            setAccount(null);
          } else {
            const currentAccount = accounts[0];
            // Only update if account changed
            if (currentAccount !== account) {
              if (!providerRef.current) {
                providerRef.current = new ethers.BrowserProvider(window.ethereum);
              }
              if (providerRef.current) {
                signerRef.current = await providerRef.current.getSigner();
                setAccount(currentAccount);
              }
            }
          }
        } catch (e) {
          console.error('Error checking wallet connection:', e);
          // If error, clear wallet state
          providerRef.current = null;
          signerRef.current = null;
          setAccount(null);
        }
      };
      
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        checkWalletConnection();
      }, 100);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, userDisconnected]); // Depend on userDisconnected to prevent auto-connection

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      // Reset disconnect flag when user clicks connect
      setUserDisconnected(false);
      
      // Create new provider instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      providerRef.current = provider;
      
      // Request wallet connection
      try {
        await provider.send("eth_requestAccounts", []);
      } catch (connectionError: any) {
        // User rejected the connection request (code 4001)
        if (connectionError.code === 4001 || connectionError.action === 'requestAccess') {
          // User cancelled, don't show error - just return silently
          setLoading(false);
          return;
        }
        // Other errors, re-throw to be handled below
        throw connectionError;
      }
      
      // Ensure provider is still valid before proceeding
      if (!providerRef.current) {
        throw new Error("Provider was cleared. Please try again.");
      }
      
      // Check if current network is Sepolia
      const network = await providerRef.current.getNetwork();
      const currentChainId = Number(network.chainId);
      
      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        // Try to switch to Sepolia network
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: any) {
          // If Sepolia network doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
                chainName: 'Sepolia',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }],
            });
          } else {
            throw switchError;
          }
        }
        
        // Re-fetch network info after switching
        // Re-create provider after network switch to ensure it's fresh
        providerRef.current = new ethers.BrowserProvider(window.ethereum);
        const newNetwork = await providerRef.current.getNetwork();
        const newChainId = Number(newNetwork.chainId);
        if (newChainId !== SEPOLIA_CHAIN_ID) {
          throw new Error(`Please switch to Sepolia Testnet (Chain ID: ${SEPOLIA_CHAIN_ID})`);
        }
      }

      // Ensure provider is still valid before getting signer
      if (!providerRef.current) {
        throw new Error("Provider was cleared. Please try again.");
      }

      signerRef.current = await providerRef.current.getSigner();
      const userAddress = await signerRef.current.getAddress();
      setAccount(userAddress);
      setError(null);
      
      // Initialize FHEVM SDK after wallet connection
      try {
        console.log("Initializing FHEVM SDK...");
        console.log("Provider:", providerRef.current);
        console.log("Signer:", signerRef.current);
        
        // Initialize the SDK first
        await initSDK();
        console.log("FHEVM SDK initialized");
        
        // Create FHEVM instance for Sepolia
        // SepoliaConfig should be a configuration object for Sepolia network
        console.log("Creating FHEVM instance with SepoliaConfig...");
        console.log("SepoliaConfig:", SepoliaConfig);
        
        // createInstance is async, so we need to await it
        fhevmInstanceRef.current = await createInstance(SepoliaConfig);
        console.log("FHEVM instance created:", fhevmInstanceRef.current);
        console.log("FHEVM instance type:", typeof fhevmInstanceRef.current);
        console.log("FHEVM instance keys:", fhevmInstanceRef.current ? Object.keys(fhevmInstanceRef.current) : "null");
        
        if (!fhevmInstanceRef.current) {
          throw new Error("createInstance returned null or undefined");
        }
        
        // Test if instance has required methods
        if (typeof fhevmInstanceRef.current.createEncryptedInput !== 'function') {
          throw new Error("FHEVM instance missing createEncryptedInput method");
        }
        
        console.log("FHEVM initialization successful!");
      } catch (fhevmError: any) {
        console.error("FHEVM initialization error:", fhevmError);
        console.error("Error stack:", fhevmError.stack);
        console.error("Error details:", JSON.stringify(fhevmError, Object.getOwnPropertyNames(fhevmError)));
        setError(`FHEVM initialization failed: ${fhevmError.message || fhevmError.toString()}. Please refresh and try again.`);
        // Don't block wallet connection, but set error for user to see
      }
      
    } catch (e: any) {
      console.error(e);
      
      // Check if user rejected the action
      if (e.code === 4001 || e.action === 'requestAccess' || e.reason === 'rejected') {
        // User cancelled the connection, don't show error
        setError(null);
        setLoading(false);
        return;
      }
      
      // For other errors, show error message
      const errorMessage = e.message || 'Unknown error occurred';
      setError(`Wallet connection failed: ${errorMessage}`);
      alert(`Wallet connection failed: ${errorMessage}\n\nPlease ensure:\n1. MetaMask is installed\n2. Switch to Sepolia Testnet\n3. Wallet is unlocked`);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard function
  const handleCopy = async (text: string, type: 'account' | 'contract') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => {
        setCopySuccess(null);
      }, 2000); // Clear message after 2 seconds
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Copy failed!');
    }
  };

  const disconnectWallet = async () => {
    try {
      // Clear local state
      providerRef.current = null;
      signerRef.current = null;
      setAccount(null);
      setResult(null);
      setError(null);
      setAge('');
      setUserDisconnected(true); // Mark that user manually disconnected
      
      // Note: MetaMask's connection state is managed by MetaMask itself
      // Frontend cannot directly "disconnect" MetaMask's connection
      // User needs to manually disconnect in MetaMask or switch accounts
      // We can only clear local connection state so frontend won't show "Connected"
      
      // Try to request empty accounts list (though MetaMask may still keep permission)
      if (window.ethereum && 'removeListener' in window.ethereum) {
        // MetaMask will keep permission, but our frontend state is cleared
        console.log('Wallet disconnected from frontend. User can manually disconnect in MetaMask.');
      }
    } catch (e) {
      console.error('Error disconnecting wallet:', e);
    }
  };

  // Ref for age input to add shake animation
  const ageInputRef = React.useRef<HTMLInputElement>(null);

  const verifyAge = async () => {
    if (!account || !signerRef.current) {
      alert("Please connect your wallet first.");
      return;
    }

    // Check and reinitialize FHEVM if needed
    if (!fhevmInstanceRef.current) {
      console.log("FHEVM instance lost, reinitializing...");
      try {
        await initSDK();
        fhevmInstanceRef.current = await createInstance(SepoliaConfig);
        if (!fhevmInstanceRef.current) {
          throw new Error("createInstance returned null or undefined");
        }
        console.log("FHEVM instance reinitialized successfully");
      } catch (reinitError: any) {
        console.error("Failed to reinitialize FHEVM:", reinitError);
        setError("FHEVM initialization failed. Please refresh the page and reconnect your wallet.");
        setLoading(false);
        alert("FHEVM initialization failed. Please refresh the page and reconnect your wallet.");
        return;
      }
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150 || !Number.isInteger(parseFloat(age))) {
      // Shake animation for invalid input
      if (ageInputRef.current) {
        ageInputRef.current.classList.add('shake');
        setTimeout(() => {
          ageInputRef.current?.classList.remove('shake');
        }, 500);
      }
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerRef.current);
      
      // Encrypt the age using FHEVM
      console.log("=== ENCRYPTION DEBUG ===");
      console.log("Encrypting age:", ageNum);
      console.log("Contract address:", CONTRACT_ADDRESS);
      console.log("User address:", account);
      
      const encryptedInput = fhevmInstanceRef.current.createEncryptedInput(CONTRACT_ADDRESS, account);
      console.log("EncryptedInput created:", encryptedInput);
      
      const encryptedAge = encryptedInput.add32(ageNum);
      console.log("EncryptedAge (after add32):", encryptedAge);
      
      const { handles, inputProof } = await encryptedAge.encrypt();
      console.log("Encryption complete!");
      console.log("Handles array length:", handles?.length || 0);
      console.log("Handles[0] type:", typeof handles[0], handles[0]?.constructor?.name);
      console.log("Handles[0] value:", handles[0]);
      console.log("InputProof length:", inputProof?.length || 0);
      console.log("InputProof first 20 bytes:", inputProof ? ethers.hexlify(inputProof.slice(0, 20)) : "N/A");
      
      console.log("Calling contract verifyAge...");
      console.log("Handles:", handles);
      console.log("InputProof length:", inputProof?.length || 0);
      console.log("Contract address:", CONTRACT_ADDRESS);
      console.log("User address:", account);
      
      // In the compiled ABI, externalEuint32 is represented as bytes32
      // handles[0] might be a Uint8Array, so we need to convert it to a hex string
      let handleBytes32: string;
      if (handles[0] instanceof Uint8Array) {
        // Convert Uint8Array to hex string (bytes32 format)
        handleBytes32 = ethers.hexlify(handles[0]);
        console.log("Handle converted from Uint8Array to hex:", handleBytes32);
      } else if (typeof handles[0] === 'string') {
        // Already a string, ensure it has 0x prefix
        handleBytes32 = handles[0].startsWith('0x') ? handles[0] : `0x${handles[0]}`;
        console.log("Handle as string:", handleBytes32);
      } else {
        // Try to convert using ethers utilities
        handleBytes32 = ethers.hexlify(handles[0]);
        console.log("Handle converted:", handleBytes32);
      }
      
      console.log("Handle to pass (bytes32):", handleBytes32);
      console.log("Handle length:", handleBytes32.length, "(should be 66 for 0x + 64 hex chars)");
      
      // Call the contract function - verifyAge is nonpayable, so it needs a transaction
      // We'll use estimateGas first to check if the call will succeed
      try {
        const gasEstimate = await contract.verifyAge.estimateGas(handleBytes32, inputProof);
        console.log("Gas estimate:", gasEstimate.toString());
      } catch (estimateError: any) {
        console.error("Gas estimation failed:", estimateError);
        throw new Error(`Gas estimation failed: ${estimateError.message}. This usually means the contract call will fail.`);
      }
      
      // Send the transaction
      // Note: This will open MetaMask for user confirmation
      console.log("Sending transaction - MetaMask should open for confirmation...");
      console.log("⚠️ Please check MetaMask popup window to confirm the transaction!");
      
      // Show a loading state that indicates waiting for MetaMask
      setLoading(true);
      setError(null);
      
      const tx = await contract.verifyAge(handleBytes32, inputProof);
      console.log("Transaction sent:", tx.hash);
      console.log("Waiting for transaction to be mined...");
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction confirmed. Status:", receipt?.status);
      console.log("Transaction receipt:", receipt);
      console.log("Transaction logs:", receipt?.logs);
      
      // Try to get the return value from the transaction receipt
      // FHEVM transactions may have return values in logs or events
      console.log("Checking transaction return value...");
      
      // IMPORTANT: Try to get the return value directly from the transaction
      // Some FHEVM operations return values in transaction receipts
      let resultHandle: string | null = null;
      
      // First, try to call the contract's return value (if available via static call)
      // Note: This might not work for non-view functions, but let's try
      try {
        // Try a static call to get the return value directly
        console.log("Attempting static call to verifyAge to get return value...");
        const staticResult = await contract.verifyAge.staticCall(handleBytes32, inputProof);
        console.log("Static call result:", staticResult);
        if (staticResult) {
          resultHandle = staticResult;
        }
      } catch (staticError: any) {
        console.log("Static call failed (expected for non-view functions):", staticError.message);
      }
      
      // After transaction is confirmed, use the view function to get the result
      // This is more reliable than staticCall on a non-view function
      try {
        // Wait a bit for the state to be updated
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Use the view function to get the stored result
        const readOnlyProvider = providerRef.current;
        if (!readOnlyProvider) {
          throw new Error("Provider not available");
        }
        
        const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readOnlyProvider);
        
        console.log("Calling getLastVerificationResult view function...");
        const viewResult = await readOnlyContract.getLastVerificationResult();
        
        // IMPORTANT: Static call returns the correct non-zero handle!
        // But view function returns zero - this indicates a storage issue.
        // Use static call result as it's correct, but log the discrepancy.
        if (resultHandle) {
          console.log("⚠️ Static call returned non-zero handle (correct)");
          console.log("⚠️ View function returned zero handle (storage issue detected)");
          console.log("   Using static call result as it's correct");
          // Keep using static call result - it's the correct value
        } else {
          // Fallback to view result if static call failed
          resultHandle = viewResult;
          console.log("⚠️ Static call failed, using view result:", resultHandle);
        }
        console.log("=== DECRYPTION DEBUG INFO ===");
        console.log("Final result handle to decrypt:", resultHandle);
        console.log("Result handle type:", typeof resultHandle);
        console.log("Result handle as string:", String(resultHandle));
        console.log("Age entered:", ageNum);
        console.log("Expected result (age >= 18):", ageNum >= 18);
        
        // Log the raw handle value for debugging
        if (typeof resultHandle === 'string') {
          console.log("Handle string length:", resultHandle.length);
          console.log("Handle bytes (full):", resultHandle);
          // Check if it's exactly zero
          const isExactlyZero = resultHandle === "0x0000000000000000000000000000000000000000000000000000000000000000" || resultHandle === ethers.ZeroHash;
          console.log("Is handle exactly zero (FALSE)?", isExactlyZero);
          console.log("Should be TRUE (non-zero) if age >= 18, FALSE (zero) if age < 18");
        } else {
          console.log("Handle is not a string, converting...");
          const handleAsHex = ethers.hexlify(resultHandle);
          console.log("Handle as hex string:", handleAsHex);
        }
        
        // Decrypt using the relayer SDK
        // Since FHE.allow(isAgeValid, msg.sender) was called in the contract,
        // we must use userDecrypt (not publicDecrypt) with a signature
        if (fhevmInstanceRef.current && signerRef.current) {
          console.log("FHEVM instance methods:", Object.keys(fhevmInstanceRef.current));
          
          try {
            // Generate FHE keypair for user decryption
            console.log("Generating FHE keypair...");
            const keypair = fhevmInstanceRef.current.generateKeypair();
            console.log("Keypair generated:", { 
              publicKey: keypair.publicKey.substring(0, 20) + "...", 
              privateKey: keypair.privateKey.substring(0, 20) + "..." 
            });
            
            // Create EIP712 structure for decryption permission
            const startTimestamp = Math.floor(Date.now() / 1000);
            const durationDays = 1; // Permission valid for 1 day
            
            console.log("Creating EIP712 structure...");
            // Ensure contract address is in checksum format for EIP712
            const contractAddressChecksum = ethers.getAddress(CONTRACT_ADDRESS);
            const eip712 = fhevmInstanceRef.current.createEIP712(
              keypair.publicKey,
              [contractAddressChecksum],  // Use checksum format
              startTimestamp,
              durationDays
            );
            console.log("EIP712 structure created");
            
            // Sign the EIP712 message with user's wallet
            console.log("Requesting signature from user wallet...");
            console.log("⚠️ Please check MetaMask for EIP712 signature request!");
            console.log("EIP712 structure:", JSON.stringify(eip712, null, 2));
            
            // ethers.js v6 signTypedData requires:
            // 1. domain (separate object)
            // 2. types (without EIP712Domain, domain is separate)
            // 3. value (the message)
            // But relayer SDK includes EIP712Domain in types, so we need to extract it
            const { EIP712Domain, ...messageTypes } = eip712.types;
            
            console.log("Signing with primaryType:", eip712.primaryType);
            
            // Use signTypedData with domain, types (without EIP712Domain), and message
            const signature = await signerRef.current.signTypedData(
              eip712.domain,
              messageTypes,  // Types without EIP712Domain
              eip712.message
            );
            console.log("EIP712 signature obtained");
            
            // Convert resultHandle to the format expected by userDecrypt
            const handleStr = typeof resultHandle === 'string' ? resultHandle : ethers.hexlify(resultHandle);
            
            // IMPORTANT: All addresses must be in checksum format (EIP-55)
            // ethers.getAddress() ensures correct checksum format
            // Note: contractAddressChecksum was already calculated above for EIP712
            const accountChecksum = ethers.getAddress(account);
            
            console.log("Address formatting:");
            console.log("  Contract (checksum):", contractAddressChecksum);
            console.log("  Account (checksum):", accountChecksum);
            
            const handleContractPair = [{
              handle: handleStr,
              contractAddress: contractAddressChecksum
            }];
            
            console.log("Calling userDecrypt...");
            const decryptedResults = await fhevmInstanceRef.current.userDecrypt(
              handleContractPair,
              keypair.privateKey,
              keypair.publicKey,
              signature,
              [contractAddressChecksum],  // Use checksum format
              accountChecksum,  // Use checksum format
              startTimestamp,
              durationDays
            );
            
            console.log("Decrypted results:", decryptedResults);
            
            // userDecrypt returns an object with handle strings as keys
            const decryptedValue = decryptedResults[handleStr] || decryptedResults[Object.keys(decryptedResults)[0]];
            
            if (decryptedValue !== undefined && decryptedValue !== null) {
              // Handle boolean result - check for true/1/1n
              const isQualified = decryptedValue === true || decryptedValue === 1 || decryptedValue === 'true' || decryptedValue === '1' || decryptedValue === 1n;
              console.log("✅ Successfully decrypted!");
              console.log("Decrypted value:", decryptedValue, "-> Qualified:", isQualified);
              console.log("Age entered:", ageNum, "Expected:", ageNum >= 18, "Got:", isQualified);
              
              if (isQualified !== (ageNum >= 18)) {
                console.error("❌ DECRYPTION RESULT MISMATCH!");
                console.error(`Age ${ageNum} should be ${ageNum >= 18 ? 'Qualified' : 'Not Qualified'}, but got ${isQualified ? 'Qualified' : 'Not Qualified'}`);
              }
              
              setResult(isQualified);
            } else {
              throw new Error("userDecrypt returned null or undefined");
            }
          } catch (decryptError: any) {
            console.error("❌ Decrypt error:", decryptError);
            console.error("Decrypt error details:", JSON.stringify(decryptError, Object.getOwnPropertyNames(decryptError)));
            setError(`Decryption failed: ${decryptError.message || decryptError.toString()}. Please try again.`);
            // Don't set result on error - user should see the error message
          }
        } else {
          throw new Error("FHEVM instance not available");
        }
      } catch (decryptError: any) {
        console.error("Failed to decrypt result:", decryptError);
        // If we can't decrypt, we can't know the result
        // But the transaction succeeded, so we'll show an error
        setError(`Transaction succeeded but failed to decrypt result: ${decryptError.message}`);
      }

    } catch (e: any) {
      console.error(e);
      setError(`Verification failed: ${e.message}`);
      // Don't set result on error
    } finally {
      setLoading(false);
    }
  };

  // Intro page
  if (view === 'intro') {
  return (
      <div className="container">
        <h1>VeriSafe</h1>
        <p className="subtitle">Privacy-Preserving Age Verification</p>
        
        <div className="card">
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <h2 style={{ 
              color: '#ffffff', 
              fontSize: '1.8rem', 
              fontWeight: 900, 
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '1.5rem'
            }}>
              Welcome to VeriSafe
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '1rem',
              fontWeight: 600,
              lineHeight: '1.6',
              marginBottom: '2rem',
              padding: '0 1rem'
            }}>
              Securely and privately verify if you meet age requirements without revealing your exact age.
              <br />
              Your data is processed on-chain using Fully Homomorphic Encryption (FHE) technology, ensuring end-to-end privacy protection.
            </p>
            <button 
              onClick={() => setView('main')} 
              className="connect-button"
              style={{ marginTop: '1rem' }}
            >
              Start Verification
            </button>
          </div>
        </div>
        
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          padding: '1rem',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          Powered by FHE
        </div>
      </div>
    );
  }

  // Function to reset to initial state (except wallet connection)
  const resetToIntro = () => {
    setAge('');
    setResult(null);
    setLoading(false);
    setError(null);
    setCopySuccess(null);
    setView('intro');
    // Note: We don't reset userDisconnected here, so if user disconnected,
    // it stays disconnected until they manually click "Connect Wallet"
  };

  // Main application page
  return (
    <div className="container">
      <button
        onClick={resetToIntro}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1000,
          padding: '0.5rem 1rem',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          color: '#ffffff',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          borderRadius: '6px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        }}
        title="Back to Home"
      >
        ← Home
      </button>
      <h1>VeriSafe</h1>
      <p className="subtitle">Privacy-Preserving Age Verification</p>
      
      <div className="card">
        {account ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <p className="connected" style={{ margin: 0, flex: 1 }}>
                  Connected: {account.slice(0, 6)}...{account.slice(-4)}
                </p>
                <button
                  onClick={() => handleCopy(account, 'account')}
                  style={{
                    width: '28px',
                    height: '28px',
                    padding: 0,
                    background: copySuccess === 'account' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    color: copySuccess === 'account' ? '#4caf50' : '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (copySuccess !== 'account') {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (copySuccess !== 'account') {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  title="Copy address"
                >
                  {copySuccess === 'account' ? '✓' : '📋'}
                </button>
              </div>
              <button 
                onClick={disconnectWallet}
                style={{
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  background: 'rgba(244, 67, 54, 0.2)',
                  border: '2px solid rgba(244, 67, 54, 0.5)',
                  color: '#f44336',
                  fontSize: '1rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '1',
                  marginLeft: '1rem',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.4)';
                  e.currentTarget.style.borderColor = 'rgba(244, 67, 54, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(244, 67, 54, 0.5)';
                }}
                title="Disconnect Wallet"
              >
                ✕
              </button>
            </div>
            
            <div className="input-group">
              <label htmlFor="age">Enter your age:</label>
              <input 
                ref={ageInputRef}
                id="age"
                type="number" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter age (1-150)" 
                min="1"
                max="150"
                disabled={loading}
              />
              <button 
                onClick={verifyAge} 
                disabled={loading || !age}
                className="verify-button"
              >
                {loading ? "Verifying..." : "Verify Age"}
              </button>
            </div>
            
            {error && (
              <div className="error">{error}</div>
            )}
            
            {result !== null && (
              <div className={`result ${result ? 'success' : 'failure'}`}>
                <h2>Verification Result:</h2>
                <p>{result ? "✅ Qualified (Age 18+)" : "❌ Not Qualified (Under 18)"}</p>
              </div>
            )}
          </div>
        ) : (
          <button onClick={connectWallet} className="connect-button">
            Connect Wallet
        </button>
        )}
      </div>
      
      <div className="info">
        <p>📍 Network: Sepolia Testnet</p>
        <p 
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
            padding: '0.25rem',
            borderRadius: '4px',
            color: copySuccess === 'contract' ? '#4caf50' : 'rgba(255, 255, 255, 0.7)'
          }}
          onClick={() => handleCopy(CONTRACT_ADDRESS, 'contract')}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Click to copy contract address"
        >
          📝 Contract: {copySuccess === 'contract' ? 'Copied!' : `${CONTRACT_ADDRESS.slice(0, 10)}...${CONTRACT_ADDRESS.slice(-8)}`}
        </p>
      </div>
      
      <div style={{
        textAlign: 'center',
        marginTop: '2rem',
        padding: '1rem',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }}>
        Powered by FHE
      </div>
    </div>
  );
}

export default App;
