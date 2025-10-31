// Wrapper for fetch-retry UMD module to work with ES modules
// Since fetch-retry is a UMD module and doesn't work well with ES modules,
// we'll use a simple fallback that wraps fetch with retry logic

function fetchRetryWrapper(fetch, defaults) {
  defaults = defaults || {};
  const retries = defaults.retries || 3;
  const retryDelay = defaults.retryDelay || 1000;
  
  return async function(url, options) {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      try {
        return await fetch(url, options);
      } catch (error) {
        lastError = error;
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    throw lastError;
  };
}

export default fetchRetryWrapper;

