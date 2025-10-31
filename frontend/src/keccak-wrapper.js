// Wrapper for keccak module to provide default export
// Import keccak CommonJS module using node_modules path to bypass alias
// @ts-ignore  
import keccakModule from '../node_modules/keccak/js.js';

// keccak/js.js is CommonJS: module.exports = require('./lib/api')(require('./lib/keccak'))
// The module.exports becomes the default export after Vite transformation

// Extract the factory function
// In Vite, CommonJS default exports are available as default property
// If default doesn't exist, the module itself might be the export
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
