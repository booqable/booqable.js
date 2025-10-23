import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BooqableClient } from '../src/client';

describe('BooqableClient', () => {
  describe('constructor', () => {
    it('should create client with minimal options', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        companyId: 'test-company',
      });

      expect(client).toBeInstanceOf(BooqableClient);
    });

    it('should build API endpoint from domain and version', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        apiDomain: 'example.com',
        apiVersion: 4,
      });

      expect(client).toBeDefined();
    });

    it('should use custom API endpoint if provided', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        apiEndpoint: 'https://custom.com/api',
      });

      expect(client).toBeDefined();
    });

    it('should load from environment variables', () => {
      const originalApiKey = process.env.BOOQABLE_API_KEY;
      const originalCompanyId = process.env.BOOQABLE_COMPANY_ID;

      process.env.BOOQABLE_API_KEY = 'env-api-key';
      process.env.BOOQABLE_COMPANY_ID = 'env-company-id';

      const client = new BooqableClient({});

      expect(client).toBeDefined();

      // Restore original values
      if (originalApiKey) {
        process.env.BOOQABLE_API_KEY = originalApiKey;
      } else {
        delete process.env.BOOQABLE_API_KEY;
      }
      if (originalCompanyId) {
        process.env.BOOQABLE_COMPANY_ID = originalCompanyId;
      } else {
        delete process.env.BOOQABLE_COMPANY_ID;
      }
    });
  });

  describe('resource proxies', () => {
    let client: BooqableClient;

    beforeEach(() => {
      client = new BooqableClient({
        apiKey: 'test-key',
        companyId: 'test-company',
      });
    });

    it('should have orders resource', () => {
      expect(client.orders).toBeDefined();
    });

    it('should have customers resource', () => {
      expect(client.customers).toBeDefined();
    });

    it('should have products resource', () => {
      expect(client.products).toBeDefined();
    });

    it('should have items resource', () => {
      expect(client.items).toBeDefined();
    });

    it('should support resource() method', () => {
      const ordersProxy = client.resource('orders');
      expect(ordersProxy).toBeDefined();
    });

    it('should throw error for unknown resource', () => {
      expect(() => {
        client.resource('unknown-resource');
      }).toThrow('Unknown resource: unknown-resource');
    });

    it('should support resource aliases', () => {
      expect(client.carriers).toBeDefined();
      expect(client.app_carriers).toBeDefined();
    });
  });

  describe('rateLimit', () => {
    it('should return rate limit information', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        companyId: 'test-company',
      });

      const rateLimit = client.rateLimit();

      expect(rateLimit).toHaveProperty('limit');
      expect(rateLimit).toHaveProperty('remaining');
      expect(rateLimit).toHaveProperty('period');
      expect(rateLimit).toHaveProperty('resetsAt');
      expect(rateLimit).toHaveProperty('resetsIn');
    });
  });

  describe('lastResponse', () => {
    it('should return null initially', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        companyId: 'test-company',
      });

      expect(client.lastResponse).toBeNull();
    });
  });

  describe('static methods', () => {
    it('should create client with create()', () => {
      const client = BooqableClient.create({
        apiKey: 'test-key',
        companyId: 'test-company',
      });

      expect(client).toBeInstanceOf(BooqableClient);
    });

    it('should configure client with configure()', () => {
      const client = BooqableClient.configure({
        apiKey: 'test-key',
        companyId: 'test-company',
      });

      expect(client).toBeInstanceOf(BooqableClient);
    });
  });

  describe('configuration options', () => {
    it('should accept autoPaginate option', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        autoPaginate: true,
      });

      expect(client).toBeDefined();
    });

    it('should accept perPage option', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        perPage: 50,
      });

      expect(client).toBeDefined();
    });

    it('should accept debug option', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        debug: false,
      });

      expect(client).toBeDefined();
    });

    it('should accept proxy option', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        proxy: 'http://proxy.example.com:8080',
      });

      expect(client).toBeDefined();
    });

    it('should accept timeout option', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        timeout: 60000,
      });

      expect(client).toBeDefined();
    });
  });

  describe('OAuth methods', () => {
    it('should have authenticateWithCode method', () => {
      const client = new BooqableClient({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        companyId: 'test-company',
      });

      expect(client.authenticateWithCode).toBeDefined();
      expect(typeof client.authenticateWithCode).toBe('function');
    });

    it('should have getOAuthToken method', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
      });

      expect(client.getOAuthToken).toBeDefined();
      expect(typeof client.getOAuthToken).toBe('function');
    });

    it('should return null from getOAuthToken when not using OAuth', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
      });

      const token = client.getOAuthToken();
      expect(token).toBeNull();
    });
  });

  describe('boomerang API version', () => {
    it('should support boomerang API version', () => {
      const client = new BooqableClient({
        apiKey: 'test-key',
        apiVersion: 'boomerang',
      });

      expect(client).toBeDefined();
    });
  });
});
