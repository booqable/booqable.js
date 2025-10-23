import { BooqableClient } from './client';
import { ClientOptions } from './types';

// Export main client class
export { BooqableClient };

// Export types
export * from './types';
export * from './errors';
export { ResourceProxy } from './resource-proxy';
export { JsonApiSerializer } from './json-api-serializer';
export { RateLimitTracker } from './rate-limit';

// Create default singleton client
let defaultClient: BooqableClient | null = null;

/**
 * Configure the default Booqable client
 */
export function configure(options: ClientOptions): BooqableClient {
  defaultClient = new BooqableClient(options);
  return defaultClient;
}

/**
 * Get the default client instance
 */
function getDefaultClient(): BooqableClient {
  if (!defaultClient) {
    throw new Error('Booqable client not configured. Call configure() first or create a client instance.');
  }
  return defaultClient;
}

// Export a default object with resource proxies
const Booqable = new Proxy({} as any, {
  get(_target, prop: string) {
    if (prop === 'configure') {
      return configure;
    }
    if (prop === 'create') {
      return (options: ClientOptions) => new BooqableClient(options);
    }
    if (prop === 'rateLimit') {
      return () => getDefaultClient().rateLimit();
    }
    if (prop === 'lastResponse') {
      return getDefaultClient().lastResponse;
    }
    if (prop === 'authenticateWithCode') {
      return (code: string, redirectUri: string) =>
        getDefaultClient().authenticateWithCode(code, redirectUri);
    }
    if (prop === 'getOAuthToken') {
      return () => getDefaultClient().getOAuthToken();
    }

    // Delegate to default client's resource proxies
    const client = getDefaultClient();
    return (client as any)[prop];
  },
});

export default Booqable;
