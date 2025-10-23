import { describe, it, expect } from 'vitest';
import { JsonApiSerializer } from '../src/json-api-serializer';
import { ApiResponse } from '../src/types';

describe('JsonApiSerializer', () => {
  describe('deserialize', () => {
    it('should deserialize a single resource', () => {
      const response: ApiResponse = {
        data: {
          id: '1',
          type: 'orders',
          attributes: {
            number: 12345,
            status: 'reserved',
          },
        },
      };

      const result = JsonApiSerializer.deserialize(response);
      expect(result).toEqual({
        id: '1',
        type: 'orders',
        number: 12345,
        status: 'reserved',
      });
    });

    it('should deserialize an array of resources', () => {
      const response: ApiResponse = {
        data: [
          {
            id: '1',
            type: 'orders',
            attributes: { number: 1 },
          },
          {
            id: '2',
            type: 'orders',
            attributes: { number: 2 },
          },
        ],
      };

      const result = JsonApiSerializer.deserialize(response);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should return null for empty data', () => {
      const response: ApiResponse = { data: null as any };
      const result = JsonApiSerializer.deserialize(response);
      expect(result).toBeNull();
    });

    it('should populate to-one relationships', () => {
      const response: ApiResponse = {
        data: {
          id: '1',
          type: 'orders',
          attributes: { number: 1 },
          relationships: {
            customer: {
              data: { id: '100', type: 'customers' },
            },
          },
        },
        included: [
          {
            id: '100',
            type: 'customers',
            attributes: {
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        ],
      };

      const result = JsonApiSerializer.deserialize(response);
      expect(result.customer).toBeDefined();
      expect(result.customer.id).toBe('100');
      expect(result.customer.name).toBe('John Doe');
      expect(result.customer.email).toBe('john@example.com');
    });

    it('should populate to-many relationships', () => {
      const response: ApiResponse = {
        data: {
          id: '1',
          type: 'orders',
          attributes: { number: 1 },
          relationships: {
            items: {
              data: [
                { id: '10', type: 'items' },
                { id: '11', type: 'items' },
              ],
            },
          },
        },
        included: [
          {
            id: '10',
            type: 'items',
            attributes: { quantity: 1 },
          },
          {
            id: '11',
            type: 'items',
            attributes: { quantity: 2 },
          },
        ],
      };

      const result = JsonApiSerializer.deserialize(response);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].quantity).toBe(1);
      expect(result.items[1].quantity).toBe(2);
    });

    it('should handle null relationships', () => {
      const response: ApiResponse = {
        data: {
          id: '1',
          type: 'orders',
          attributes: { number: 1 },
          relationships: {
            customer: {
              data: null,
            },
          },
        },
      };

      const result = JsonApiSerializer.deserialize(response);
      expect(result.customer).toBeNull();
    });

    it('should include relationship ids when not in included', () => {
      const response: ApiResponse = {
        data: {
          id: '1',
          type: 'orders',
          attributes: { number: 1 },
          relationships: {
            customer: {
              data: { id: '100', type: 'customers' },
            },
          },
        },
        included: [],
      };

      const result = JsonApiSerializer.deserialize(response);
      expect(result.customer).toEqual({ id: '100', type: 'customers' });
    });

    it('should include meta if present', () => {
      const response: ApiResponse = {
        data: {
          id: '1',
          type: 'orders',
          attributes: { number: 1 },
          meta: { some: 'metadata' },
        },
      };

      const result = JsonApiSerializer.deserialize(response);
      expect(result.meta).toEqual({ some: 'metadata' });
    });
  });

  describe('serialize', () => {
    it('should serialize a resource', () => {
      const data = {
        id: '1',
        name: 'Product',
        price: 100,
      };

      const result = JsonApiSerializer.serialize('products', data);
      expect(result.type).toBe('products');
      expect(result.id).toBe('1');
      expect(result.attributes).toEqual({
        name: 'Product',
        price: 100,
      });
    });

    it('should handle relationships', () => {
      const data = {
        id: '1',
        name: 'Order',
        customer: { id: '100', type: 'customers' },
      };

      const result = JsonApiSerializer.serialize('orders', data);
      expect(result.relationships?.customer).toEqual({
        data: { id: '100', type: 'customers' },
      });
    });

    it('should handle to-many relationships', () => {
      const data = {
        id: '1',
        name: 'Order',
        items: [
          { id: '10', type: 'items' },
          { id: '11', type: 'items' },
        ],
      };

      const result = JsonApiSerializer.serialize('orders', data);
      expect(result.relationships?.items).toEqual({
        data: [
          { id: '10', type: 'items' },
          { id: '11', type: 'items' },
        ],
      });
    });

    it('should transform dates to ISO strings', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const data = {
        id: '1',
        created_at: date,
      };

      const result = JsonApiSerializer.serialize('orders', data);
      expect(result.attributes?.created_at).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should not include id and type in attributes', () => {
      const data = {
        id: '1',
        type: 'should-not-appear',
        name: 'Test',
      };

      const result = JsonApiSerializer.serialize('products', data);
      expect(result.attributes).toEqual({ name: 'Test' });
      expect(result.attributes).not.toHaveProperty('id');
      expect(result.attributes).not.toHaveProperty('type');
    });

    it('should accept custom id parameter', () => {
      const data = {
        name: 'Test',
      };

      const result = JsonApiSerializer.serialize('products', data, '999');
      expect(result.id).toBe('999');
    });
  });

  describe('parseDates', () => {
    it('should parse ISO date strings', () => {
      const data = {
        created_at: '2024-01-01T00:00:00Z',
        name: 'Test',
      };

      const result = JsonApiSerializer.parseDates(data);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.name).toBe('Test');
    });

    it('should parse dates in nested objects', () => {
      const data = {
        order: {
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = JsonApiSerializer.parseDates(data);
      expect(result.order.created_at).toBeInstanceOf(Date);
    });

    it('should parse dates in arrays', () => {
      const data = [
        { created_at: '2024-01-01T00:00:00Z' },
        { created_at: '2024-01-02T00:00:00Z' },
      ];

      const result = JsonApiSerializer.parseDates(data);
      expect(result[0].created_at).toBeInstanceOf(Date);
      expect(result[1].created_at).toBeInstanceOf(Date);
    });

    it('should not parse non-date strings', () => {
      const data = {
        email: 'test@example.com',
        status: 'active',
      };

      const result = JsonApiSerializer.parseDates(data);
      expect(result.email).toBe('test@example.com');
      expect(result.status).toBe('active');
    });

    it('should handle null and undefined', () => {
      expect(JsonApiSerializer.parseDates(null)).toBeNull();
      expect(JsonApiSerializer.parseDates(undefined)).toBeUndefined();
    });
  });
});
