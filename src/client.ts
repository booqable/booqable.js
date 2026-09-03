import { ClientOptions, LastResponse, TokenHash } from './types.js'
import { defaultOptions, normalizeOptions } from './options.js'
import { HttpClient } from './http.js'
import { ResourceProxy } from './resource-proxy.js'
import { RateLimit } from './rate-limit.js'
import { OAuthAuth } from './auth/oauth.js'
import { OAuthClient } from './oauth-client.js'
import { parseResource } from './resource-parser.js'
import { resourceMethods } from './resources.js'

/**
 * Client for the Booqable API.
 *
 * Provides a JavaScript interface to interact with the Booqable rental
 * management API. The client can be configured with various authentication
 * methods including API keys, OAuth, and single-use tokens.
 *
 * @example Initialize with API key
 *   const client = new BooqableClient({
 *     apiKey: 'your_api_key',
 *     companyId: 'your_company_id',
 *   })
 *
 *   const orders = await client.orders.list({ include: 'customer' })
 *
 * @see https://developers.booqable.com/
 */
export class BooqableClient {
  readonly options: ClientOptions
  readonly http: HttpClient

  constructor(options: Record<string, any> = {}) {
    // Use options passed in, but fall back to defaults (including env vars).
    this.options = { ...defaultOptions(), ...normalizeOptions(options) }
    this.http = new HttpClient(this.options)

    for (const [methodName, resourceName] of resourceMethods()) {
      Object.defineProperty(this, methodName, {
        get: () => new ResourceProxy(this.http, resourceName),
        enumerable: false,
        configurable: true,
      })
    }
  }

  /** Access a resource proxy by name (e.g. `client.resource('orders')`). */
  resource(name: string): ResourceProxy {
    const match = resourceMethods().find(([methodName]) => methodName === name)
    if (!match) throw new Error(`Unknown resource: ${name}`)
    return new ResourceProxy(this.http, match[1])
  }

  /** Make an HTTP GET request. Options become query params. */
  async get(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.http.get(path, data)
  }

  /** Make an HTTP HEAD request. */
  async head(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.http.head(path, data)
  }

  /** Make an HTTP POST request. */
  async post(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.http.post(path, data)
  }

  /** Make an HTTP PUT request. */
  async put(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.http.put(path, data)
  }

  /** Make an HTTP PATCH request. */
  async patch(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.http.patch(path, data)
  }

  /** Make an HTTP DELETE request. */
  async delete(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.http.delete(path, data)
  }

  /** Make a custom HTTP request to the Booqable API. */
  async request(method: string, path: string, data: Record<string, any> = {}): Promise<any> {
    return this.http.request(method, path, data)
  }

  /** Make a paginated GET request; returns the concatenated records. */
  async paginate(path: string, params: Record<string, any> = {}): Promise<any[]> {
    return this.http.paginate(path, params)
  }

  /** Rate limit information from the last response. */
  rateLimit(): RateLimit {
    return this.http.rateLimit()
  }

  /** The last HTTP response, or null if no request was made (or it failed). */
  get lastResponse(): LastResponse | null {
    return this.http.lastResponse
  }

  /**
   * Completes the OAuth authorization-code flow: exchanges the code for an
   * access token and persists it via the configured `writeToken`.
   */
  async authenticateWithCode(code: string): Promise<TokenHash> {
    const token = await this.oauthClient().getTokenFromCode(code)
    await this.options.writeToken?.(token)
    return token
  }

  /**
   * Parses a JSON:API payload (e.g. a webhook payload) into an object with
   * flattened attributes and populated relationships.
   */
  parseResource(payload: string | Record<string, any> | null | undefined): any {
    return parseResource(payload, { strict: this.options.strictAttributes !== false })
  }

  /** Alias for {@link parseResource}. */
  deserializeResource(payload: string | Record<string, any> | null | undefined): any {
    return this.parseResource(payload)
  }

  /** The OAuth client, when OAuth credentials are configured. */
  oauthClient(): OAuthClient {
    const auth = this.http.auth()
    if (auth instanceof OAuthAuth) return auth.client

    return new OAuthClient({
      apiEndpoint: this.http.apiEndpoint,
      clientId: requireOption(this.options.clientId, 'clientId'),
      clientSecret: requireOption(this.options.clientSecret, 'clientSecret'),
      redirectUri: this.options.redirectUri,
    })
  }
}

function requireOption(value: string | undefined, name: string): string {
  if (!value) throw new Error(`OAuth is not configured. Provide \`${name}\` in Booqable configuration.`)
  return value
}

/** Resource accessors, one per entry in resources.json (plus aliases). */
export interface BooqableClient {
  readonly app_carriers: ResourceProxy
  readonly carriers: ResourceProxy
  readonly app_subscriptions: ResourceProxy
  readonly subscriptions: ResourceProxy
  readonly app_payment_options: ResourceProxy
  readonly payment_options: ResourceProxy
  readonly app_issues: ResourceProxy
  readonly issues: ResourceProxy
  readonly authentication_methods: ResourceProxy
  readonly barcodes: ResourceProxy
  readonly bundles: ResourceProxy
  readonly bundle_items: ResourceProxy
  readonly clusters: ResourceProxy
  readonly collections: ResourceProxy
  readonly collection_items: ResourceProxy
  readonly collection_trees: ResourceProxy
  readonly companies: ResourceProxy
  readonly countries: ResourceProxy
  readonly coupons: ResourceProxy
  readonly customers: ResourceProxy
  readonly default_properties: ResourceProxy
  readonly delivery_distance_calculations: ResourceProxy
  readonly deposit_holds: ResourceProxy
  readonly documents: ResourceProxy
  readonly emails: ResourceProxy
  readonly email_templates: ResourceProxy
  readonly employees: ResourceProxy
  readonly employee_invitations: ResourceProxy
  readonly inventory_breakdowns: ResourceProxy
  readonly inventory_levels: ResourceProxy
  readonly invoice_finalizations: ResourceProxy
  readonly invoice_revisions: ResourceProxy
  readonly item_prices: ResourceProxy
  readonly items: ResourceProxy
  readonly lines: ResourceProxy
  readonly line_charge_suggestions: ResourceProxy
  readonly locations: ResourceProxy
  readonly notes: ResourceProxy
  readonly orders: ResourceProxy
  readonly order_delivery_rate_recalculations: ResourceProxy
  readonly order_delivery_rates: ResourceProxy
  readonly order_fulfillments: ResourceProxy
  readonly order_price_recalculations: ResourceProxy
  readonly order_status_transitions: ResourceProxy
  readonly payments: ResourceProxy
  readonly payment_authorizations: ResourceProxy
  readonly payment_charges: ResourceProxy
  readonly payment_methods: ResourceProxy
  readonly payment_refunds: ResourceProxy
  readonly photos: ResourceProxy
  readonly plannings: ResourceProxy
  readonly price_rules: ResourceProxy
  readonly price_rulesets: ResourceProxy
  readonly price_structures: ResourceProxy
  readonly price_tiles: ResourceProxy
  readonly products: ResourceProxy
  readonly product_groups: ResourceProxy
  readonly properties: ResourceProxy
  readonly provinces: ResourceProxy
  readonly settings: ResourceProxy
  readonly signatures: ResourceProxy
  readonly sortings: ResourceProxy
  readonly stock_adjustments: ResourceProxy
  readonly stock_items: ResourceProxy
  readonly stock_item_archivations: ResourceProxy
  readonly stock_item_plannings: ResourceProxy
  readonly stock_item_suggestions: ResourceProxy
  readonly tags: ResourceProxy
  readonly tax_categories: ResourceProxy
  readonly tax_rates: ResourceProxy
  readonly tax_regions: ResourceProxy
  readonly tax_values: ResourceProxy
  readonly transfers: ResourceProxy
  readonly user_invitations: ResourceProxy
  readonly users: ResourceProxy
  readonly webhook_endpoints: ResourceProxy
  readonly webhooks: ResourceProxy
}
