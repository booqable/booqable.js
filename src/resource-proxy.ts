import { HttpClient } from './http-client';
import { ListOptions, FindOptions } from './types';

export class ResourceProxy {
  constructor(
    private http: HttpClient,
    private resourceName: string,
    private companyId?: string
  ) {}

  /**
   * List resources with optional filtering, sorting, and pagination
   */
  async list<T = any>(options: ListOptions = {}): Promise<T[]> {
    const path = this.buildPath();
    const params: Record<string, any> = {};

    // Handle include parameter
    if (options.include) {
      params.include = Array.isArray(options.include) ? options.include.join(',') : options.include;
    }

    // Handle filter parameter
    if (options.filter) {
      params.filter = options.filter;
    }

    // Handle sort parameter
    if (options.sort) {
      params.sort = Array.isArray(options.sort) ? options.sort.join(',') : options.sort;
    }

    // Handle pagination
    if (options.page) {
      params.page = options.page;
    } else {
      // Use default pagination from client options
      params.page = { size: 25 };
    }

    // Handle stats parameter
    if (options.stats) {
      params.stats = Array.isArray(options.stats) ? options.stats.join(',') : options.stats;
    }

    // If auto-pagination is enabled, use paginateAll
    if (this.http['options'].autoPaginate) {
      return await this.http.paginateAll<T>(path, { ...options, params });
    }

    return await this.http.get<T[]>(path, { ...options, params });
  }

  /**
   * Find a single resource by ID
   */
  async find<T = any>(id: string, options: FindOptions = {}): Promise<T> {
    const path = this.buildPath(id);
    const params: Record<string, any> = {};

    // Handle include parameter
    if (options.include) {
      params.include = Array.isArray(options.include) ? options.include.join(',') : options.include;
    }

    return await this.http.get<T>(path, { ...options, params });
  }

  /**
   * Create a new resource
   */
  async create<T = any>(attributes: Record<string, any> = {}): Promise<T> {
    const path = this.buildPath();

    const data = {
      type: this.resourceName,
      attributes,
    };

    return await this.http.post<T>(path, data);
  }

  /**
   * Update an existing resource
   */
  async update<T = any>(id: string, attributes: Record<string, any> = {}): Promise<T> {
    const path = this.buildPath(id);

    const data = {
      type: this.resourceName,
      id,
      attributes,
    };

    return await this.http.put<T>(path, data);
  }

  /**
   * Delete a resource
   */
  async delete(id: string): Promise<void> {
    const path = this.buildPath(id);
    await this.http.delete(path);
  }

  private buildPath(id?: string): string {
    const parts = ['api', this.resourceName];

    if (id) {
      parts.push(id);
    }

    let path = '/' + parts.join('/');

    // Add company_id as query parameter if provided
    if (this.companyId) {
      path += `?company_id=${encodeURIComponent(this.companyId)}`;
    }

    return path;
  }
}
