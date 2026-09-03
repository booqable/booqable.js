import { HttpClient } from './http.js'
import { strictCollection, strictResource } from './strict-resource.js'

/**
 * Generic resource proxy for API collections.
 *
 * Provides a uniform interface for interacting with API resources using
 * standard CRUD operations. Each resource proxy handles the JSON:API
 * formatting and delegates HTTP requests to the underlying client.
 *
 * @example Working with orders
 *   const orders = client.orders
 *
 *   await orders.list({ include: 'customer', filter: { status: 'reserved' } })
 *   await orders.find('123', { include: 'customer' })
 *   await orders.create({ starts_at: '2024-01-01T00:00:00Z', status: 'draft' })
 *   await orders.update('123', { status: 'reserved' })
 *   await orders.delete('123')
 */
export class ResourceProxy {
  private http: HttpClient
  private resource: string

  constructor(http: HttpClient, resourceName: string) {
    this.http = http
    this.resource = String(resourceName)
  }

  /**
   * List resources, with optional filtering, sorting, and pagination
   * (JSON:API query parameters: `include`, `filter`, `sort`, `page`, …).
   * Fetches all pages when `autoPaginate` is enabled.
   */
  async list(params: Record<string, any> = {}): Promise<any[]> {
    const records = await this.http.paginate(this.resource, params)
    return this.wrap(records)
  }

  /** Alias for {@link list}. */
  async all(params: Record<string, any> = {}): Promise<any[]> {
    return this.list(params)
  }

  /** Find a specific resource by ID. */
  async find(id: string, params: Record<string, any> = {}): Promise<any> {
    const response = await this.http.request('GET', `${this.resource}/${id}`, params)
    return this.wrap(response?.data)
  }

  /** Create a new resource with the given attributes. */
  async create(attributes: Record<string, any> = {}): Promise<any> {
    const response = await this.http.request('POST', this.resource, {
      data: { type: this.resource, attributes },
    })
    return this.wrap(response?.data)
  }

  /** Update an existing resource with the given attributes. */
  async update(id: string, attributes: Record<string, any> = {}): Promise<any> {
    const response = await this.http.request('PUT', `${this.resource}/${id}`, {
      data: { type: this.resource, id, attributes },
    })
    return this.wrap(response?.data)
  }

  /** Delete an existing resource by ID. Returns the deleted resource. */
  async delete(id: string): Promise<any> {
    const response = await this.http.request('DELETE', `${this.resource}/${id}`)
    return this.wrap(response?.data)
  }

  private wrap(value: any): any {
    if (this.http.options.strictAttributes === false || value == null) return value
    return Array.isArray(value) ? strictCollection(value) : typeof value === 'object' ? strictResource(value) : value
  }
}
