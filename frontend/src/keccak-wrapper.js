// Wrapper for keccak module to provide default export
// Use a direct relative import to bypass Vite alias
// @ts-ignore
// Import the loader function, not the module itself
import loadKeccakFn from './keccak-real.js';

// Lazy load keccak to avoid alias conflicts during module resolution
let keccakFactory = null;
let keccakPromise = null;

// Initialize keccak in the background
function initializeKeccak() {
  if (!keccakPromise) {
    keccakPromise = loadKeccakFn().then(module => {
      // Extract the factory function
      const factory = (module && typeof module === 'object' && 'default' in module)
        ? module.default 
        : module;
      keccakFactory = factory;
      return factory;
    }).catch(err => {
      console.error('Failed to load keccak:', err);
      throw err;
    });
  }
  return keccakPromise;
}

// Start loading immediately (non-blocking)
initializeKeccak();

// Create a wrapper that matches the expected interface
function createHash(algorithm = 'keccak256') {
  // If keccak is not loaded yet, throw error
  if (!keccakFactory) {
    throw new Error('Keccak module not loaded yet. Please wait for initialization.');
  }
  
  // Handle both function and object with default property
  const factory = typeof keccakFactory === 'function' 
    ? keccakFactory 
    : (keccakFactory.default || keccakFactory);
    
  if (typeof factory === 'function') {
    return factory(algorithm);
  }
  throw new Error('Keccak factory function not found');
}

// Export as default for compatibility with relayer-sdk
export default createHash;

// Also export named export
export { createHash };
