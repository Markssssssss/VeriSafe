// Direct import of real keccak module (not aliased)
// This file bypasses the alias by importing directly
// @ts-ignore
import keccakModule from '../node_modules/keccak/js.js';

// Export for use by keccak-wrapper
export default keccakModule;

