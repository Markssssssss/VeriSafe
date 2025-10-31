// Direct import of real keccak module (not aliased)
// This file bypasses the alias by importing directly from node_modules
// @ts-ignore
// Use a relative path import that Vite won't alias
import keccakModule from '../node_modules/keccak/js.js';

// Export for use by keccak-wrapper
export default keccakModule;
