import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceProxy } from '../src/resource-proxy';
import { HttpClient } from '../src/http-client';

describe('ResourceProxy', () => {
  let mockHttp: any;
  let proxy: ResourceProxy;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      paginateAll: vi.fn(),
      options: { autoPaginate: false },
    };

    proxy = new ResourceProxy(mockHttp as HttpClient, 'orders', 'company-123');
  });

  describe('list', () => {
    it('should call http.get with correct path', async () => {
      mockHttp.get.mockResolvedValue([]);

      await proxy.list();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/api/orders?company_id=company-123',
        expect.objectContaining({
          params: expect.objectContaining({
            page: { size: 25 },
          }),
        })
      );
    });

    it('should handle include parameter', async () => {
      mockHttp.get.mockResolvedValue([]);

      await proxy.list({ include: 'customer,items' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            include: 'customer,items',
          }),
        })
      );
    });

    it('should handle include as array', async () => {
      mockHttp.get.mockResolvedValue([]);

      await proxy.list({ include: ['customer', 'items'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            include: 'customer,items',
          }),
        })
      );
    });

    it('should handle filter parameter', async () => {
      mockHttp.get.mockResolvedValue([]);

      await proxy.list({ filter: { status: 'reserved' } });

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            filter: { status: 'reserved' },
          }),
        })
      );
    });

    it('should handle sort parameter', async () => {
      mockHttp.get.mockResolvedValue([]);

      await proxy.list({ sort: '-created_at' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            sort: '-created_at',
          }),
        })
      );
    });

    it('should handle sort as array', async () => {
      mockHttp.get.mockResolvedValue([]);

      await proxy.list({ sort: ['-created_at', 'name'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            sort: '-created_at,name',
          }),
        })
      );
    });

    it('should handle page parameter', async () => {
      mockHttp.get.mockResolvedValue([]);

      await proxy.list({ page: { size: 50, number: 2 } });

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            page: { size: 50, number: 2 },
          }),
        })
      );
    });

    it('should use paginateAll when autoPaginate is true', async () => {
      mockHttp.options.autoPaginate = true;
      mockHttp.paginateAll.mockResolvedValue([]);

      await proxy.list();

      expect(mockHttp.paginateAll).toHaveBeenCalled();
      expect(mockHttp.get).not.toHaveBeenCalled();
    });

    it('should handle stats parameter', async () => {
      mockHttp.get.mockResolvedValue([]);

      await proxy.list({ stats: 'inventory' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            stats: 'inventory',
          }),
        })
      );
    });
  });

  describe('find', () => {
    it('should call http.get with correct path and id', async () => {
      mockHttp.get.mockResolvedValue({ id: '123' });

      await proxy.find('123');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/api/orders/123?company_id=company-123',
        expect.objectContaining({
          params: {},
        })
      );
    });

    it('should handle include parameter', async () => {
      mockHttp.get.mockResolvedValue({ id: '123' });

      await proxy.find('123', { include: 'customer' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { include: 'customer' },
        })
      );
    });
  });

  describe('create', () => {
    it('should call http.post with correct data', async () => {
      mockHttp.post.mockResolvedValue({ id: 'new-123' });

      await proxy.create({ name: 'Test', status: 'draft' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/api/orders?company_id=company-123',
        {
          type: 'orders',
          attributes: { name: 'Test', status: 'draft' },
        }
      );
    });

    it('should work with empty attributes', async () => {
      mockHttp.post.mockResolvedValue({ id: 'new-123' });

      await proxy.create();

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/api/orders?company_id=company-123',
        {
          type: 'orders',
          attributes: {},
        }
      );
    });
  });

  describe('update', () => {
    it('should call http.put with correct data', async () => {
      mockHttp.put.mockResolvedValue({ id: '123' });

      await proxy.update('123', { status: 'reserved' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/api/orders/123?company_id=company-123',
        {
          type: 'orders',
          id: '123',
          attributes: { status: 'reserved' },
        }
      );
    });
  });

  describe('delete', () => {
    it('should call http.delete with correct path', async () => {
      mockHttp.delete.mockResolvedValue(undefined);

      await proxy.delete('123');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/api/orders/123?company_id=company-123'
      );
    });
  });

  describe('without company_id', () => {
    beforeEach(() => {
      proxy = new ResourceProxy(mockHttp as HttpClient, 'orders');
    });

    it('should not add company_id to path', async () => {
      mockHttp.get.mockResolvedValue([]);

      await proxy.list();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/api/orders',
        expect.any(Object)
      );
    });
  });
});
