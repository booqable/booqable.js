import { describe, it, expect } from 'vitest';
import { ApiKeyAuth } from '../../src/auth/api-key';

describe('ApiKeyAuth', () => {
  it('should add Authorization header', async () => {
    const auth = new ApiKeyAuth('test-api-key');
    const config = { headers: {} };

    const result = await auth.apply(config);

    expect(result.headers).toHaveProperty('Authorization');
    expect(result.headers!['Authorization']).toBe('Bearer test-api-key');
  });

  it('should create headers object if not present', async () => {
    const auth = new ApiKeyAuth('test-api-key');
    const config = {};

    const result = await auth.apply(config);

    expect(result.headers).toBeDefined();
    expect(result.headers!['Authorization']).toBe('Bearer test-api-key');
  });

  it('should preserve existing headers', async () => {
    const auth = new ApiKeyAuth('test-api-key');
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const result = await auth.apply(config);

    expect(result.headers!['Content-Type']).toBe('application/json');
    expect(result.headers!['Authorization']).toBe('Bearer test-api-key');
  });

  it('should work with different API keys', async () => {
    const auth1 = new ApiKeyAuth('key-1');
    const auth2 = new ApiKeyAuth('key-2');

    const result1 = await auth1.apply({ headers: {} });
    const result2 = await auth2.apply({ headers: {} });

    expect(result1.headers!['Authorization']).toBe('Bearer key-1');
    expect(result2.headers!['Authorization']).toBe('Bearer key-2');
  });
});
