import { BooqableClient } from './client.js'
import { ResourceProxy } from './resource-proxy.js'
import { resourceMethods } from './resources.js'
import { LastResponse, TokenHash } from './types.js'
import { RateLimit } from './rate-limit.js'

/**
 * Module-level Booqable API entry point.
 *
 * Mirrors the `Booqable` module from booqable.rb: configure once, then call
 * resource methods directly. A default client is (re)created from the
 * module-level configuration.
 *
 * @example
 *   import Booqable from '@booqable/client'
 *
 *   Booqable.configure({ apiKey: 'your_api_key', companyId: 'your_company' })
 *
 *   const orders = await Booqable.orders.list({ include: 'customer' })
 */
class BooqableModule {
  private moduleOptions: Record<string, any> = {}
  private defaultClient: BooqableClient | null = null

  constructor() {
    for (const [methodName] of resourceMethods()) {
      Object.defineProperty(this, methodName, {
        get: () => (this.client() as any)[methodName],
        enumerable: false,
        configurable: true,
      })
    }
  }

  /**
   * Set module-level configuration options, merged into any previous ones.
   * Accepts an options object or a callback that mutates a draft object.
   */
  configure(options: Record<string, any> | ((config: Record<string, any>) => void)): this {
    if (typeof options === 'function') {
      const draft = { ...this.moduleOptions }
      options(draft)
      this.moduleOptions = draft
    } else {
      this.moduleOptions = { ...this.moduleOptions, ...options }
    }

    this.defaultClient = null
    return this
  }

  /** Reset module-level configuration to defaults. */
  reset(): this {
    this.moduleOptions = {}
    this.defaultClient = null
    return this
  }

  /** The API client built from the module-level configuration. */
  client(): BooqableClient {
    this.defaultClient ??= new BooqableClient(this.moduleOptions)
    return this.defaultClient
  }

  /** Access a resource proxy by name. */
  resource(name: string): ResourceProxy {
    return this.client().resource(name)
  }

  async get(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.client().get(path, data)
  }

  async head(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.client().head(path, data)
  }

  async post(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.client().post(path, data)
  }

  async put(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.client().put(path, data)
  }

  async patch(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.client().patch(path, data)
  }

  async delete(path: string, data: Record<string, any> = {}): Promise<any> {
    return this.client().delete(path, data)
  }

  async request(method: string, path: string, data: Record<string, any> = {}): Promise<any> {
    return this.client().request(method, path, data)
  }

  async paginate(path: string, params: Record<string, any> = {}): Promise<any[]> {
    return this.client().paginate(path, params)
  }

  rateLimit(): RateLimit {
    return this.client().rateLimit()
  }

  get lastResponse(): LastResponse | null {
    return this.client().lastResponse
  }

  async authenticateWithCode(code: string): Promise<TokenHash> {
    return this.client().authenticateWithCode(code)
  }

  parseResource(payload: string | Record<string, any> | null | undefined): any {
    return this.client().parseResource(payload)
  }

  deserializeResource(payload: string | Record<string, any> | null | undefined): any {
    return this.client().parseResource(payload)
  }
}

/** Resource accessors, one per entry in resources.json (plus aliases). */
interface BooqableModule {
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

/** The module-level Booqable API entry point. */
const Booqable = new BooqableModule()

export default Booqable
export { Booqable }

export { BooqableClient } from './client.js'
export { ResourceProxy } from './resource-proxy.js'
export { RateLimit } from './rate-limit.js'
export { JsonApiSerializer } from './json-api-serializer.js'
export { parseResource } from './resource-parser.js'
export { strictResource, strictCollection } from './strict-resource.js'
export { OAuthClient } from './oauth-client.js'
export { HttpClient } from './http.js'
export { ApiKeyAuth } from './auth/api-key.js'
export { OAuthAuth } from './auth/oauth.js'
export { SingleUseAuth } from './auth/single-use.js'
export { signJwt } from './jwt.js'
export { RESOURCES, resourceMethods } from './resources.js'
export { VERSION } from './version.js'
export * from './errors.js'
export type * from './types.js'
export type { AuthStrategy, RequestContext } from './auth/strategy.js'
