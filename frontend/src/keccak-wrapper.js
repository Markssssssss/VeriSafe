// Wrapper for keccak module to provide default export
// Import from keccak-real.js which bypasses the alias
import keccakModule from './keccak-real.js';

// Extract the factory function
// In Vite, CommonJS default exports are available as default property
const keccakFactory = (keccakModule && typeof keccakModule === 'object' && 'default' in keccakModule)
  ? keccakModule.default 
  : keccakModule;

// Create a wrapper that matches the expected interface
function createHash(algorithm = 'keccak256') {
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
