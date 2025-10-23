import { describe, it, expect } from 'vitest';
import { SingleUseTokenAuth } from '../../src/auth/single-use-token';
import * as jwt from 'jsonwebtoken';

describe('SingleUseTokenAuth', () => {
  describe('with pre-generated token', () => {
    it('should use provided token', async () => {
      const auth = new SingleUseTokenAuth({
        token: 'pre-generated-token',
        algorithm: 'HS256',
        expirationPeriod: 600,
      });

      const config = { headers: {}, url: '/api/orders', method: 'GET' };
      const result = await auth.apply(config);

      expect(result.headers!['Authorization']).toBe('Bearer pre-generated-token');
    });
  });

  describe('with HS256 algorithm', () => {
    it('should generate token with HMAC', async () => {
      const secret = 'test-secret';
      const auth = new SingleUseTokenAuth({
        algorithm: 'HS256',
        secret,
        companyId: 'company-123',
        userId: 'user-456',
        expirationPeriod: 600,
      });

      const config = {
        headers: {},
        url: '/api/orders',
        method: 'GET',
      };

      const result = await auth.apply(config);

      expect(result.headers!['Authorization']).toMatch(/^Bearer .+/);

      const token = result.headers!['Authorization'].replace('Bearer ', '');
      const decoded: any = jwt.verify(token, secret);

      expect(decoded.alg).toBe('HS256');
      expect(decoded.iss).toBe('company-123');
      expect(decoded.user_id).toBe('user-456');
      expect(decoded.company_id).toBe('company-123');
      expect(decoded.aud).toBe('/api/orders');
      expect(decoded.sub).toBe('GET');
    });

    it('should include request body hash', async () => {
      const secret = 'test-secret';
      const auth = new SingleUseTokenAuth({
        algorithm: 'HS256',
        secret,
        expirationPeriod: 600,
      });

      const config = {
        headers: {},
        url: '/api/orders',
        method: 'POST',
        data: { name: 'Test' },
      };

      const result = await auth.apply(config);
      const token = result.headers!['Authorization'].replace('Bearer ', '');
      const decoded: any = jwt.verify(token, secret);

      expect(decoded.request.body_hash).toBeDefined();
      expect(decoded.request.body_hash).not.toBe('');
    });

    it('should generate unique tokens for each request', async () => {
      const secret = 'test-secret';
      const auth = new SingleUseTokenAuth({
        algorithm: 'HS256',
        secret,
        expirationPeriod: 600,
      });

      const config1 = { headers: {}, url: '/api/orders', method: 'GET' };
      const config2 = { headers: {}, url: '/api/orders', method: 'GET' };

      const result1 = await auth.apply(config1);
      const result2 = await auth.apply(config2);

      const token1 = result1.headers!['Authorization'];
      const token2 = result2.headers!['Authorization'];

      expect(token1).not.toBe(token2); // Unique JTI should make them different
    });
  });

  describe('token expiration', () => {
    it('should set correct expiration time', async () => {
      const secret = 'test-secret';
      const expirationPeriod = 300; // 5 minutes
      const auth = new SingleUseTokenAuth({
        algorithm: 'HS256',
        secret,
        expirationPeriod,
      });

      const before = Math.floor(Date.now() / 1000);
      const config = { headers: {}, url: '/api/orders', method: 'GET' };
      const result = await auth.apply(config);
      const after = Math.floor(Date.now() / 1000);

      const token = result.headers!['Authorization'].replace('Bearer ', '');
      const decoded: any = jwt.verify(token, secret);

      expect(decoded.exp).toBeGreaterThanOrEqual(before + expirationPeriod);
      expect(decoded.exp).toBeLessThanOrEqual(after + expirationPeriod);
      expect(decoded.iat).toBeGreaterThanOrEqual(before);
      expect(decoded.iat).toBeLessThanOrEqual(after);
    });
  });

  describe('error handling', () => {
    it('should throw error if no auth credentials provided', () => {
      expect(() => {
        new SingleUseTokenAuth({
          algorithm: 'HS256',
          expirationPeriod: 600,
        });
      }).toThrow('Single-use token authentication requires either token, secret, or privateKey');
    });
  });

  describe('URL path extraction', () => {
    it('should handle absolute URLs', async () => {
      const secret = 'test-secret';
      const auth = new SingleUseTokenAuth({
        algorithm: 'HS256',
        secret,
        expirationPeriod: 600,
      });

      const config = {
        headers: {},
        url: 'https://example.com/api/orders?page=1',
        method: 'GET',
      };

      const result = await auth.apply(config);
      const token = result.headers!['Authorization'].replace('Bearer ', '');
      const decoded: any = jwt.verify(token, secret);

      expect(decoded.aud).toBe('/api/orders?page=1');
    });

    it('should handle relative URLs', async () => {
      const secret = 'test-secret';
      const auth = new SingleUseTokenAuth({
        algorithm: 'HS256',
        secret,
        expirationPeriod: 600,
      });

      const config = {
        headers: {},
        url: '/api/orders',
        method: 'GET',
      };

      const result = await auth.apply(config);
      const token = result.headers!['Authorization'].replace('Bearer ', '');
      const decoded: any = jwt.verify(token, secret);

      expect(decoded.aud).toBe('/api/orders');
    });
  });
});
