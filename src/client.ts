import { ClientOptions, RateLimit, OAuthToken } from './types';
import { HttpClient } from './http-client';
import { ResourceProxy } from './resource-proxy';
import { OAuthAuth } from './auth/oauth';
import resources from './resources.json';

const DEFAULT_OPTIONS: Partial<ClientOptions> = {
  apiDomain: 'booqable.com',
  apiVersion: 4,
  perPage: 25,
  autoPaginate: false,
  defaultMediaType: 'application/vnd.api+json',
  userAgent: 'Booqable Node.js Client/1.0.0',
  timeout: 30000,
  debug: false,
  noRetries: false,
  maxRetries: 2,
  singleUseTokenExpirationPeriod: 600,
};

export class BooqableClient {
  private http: HttpClient;
  private options: ClientOptions;
  private resourceProxies: Map<string, ResourceProxy> = new Map();

  constructor(options: ClientOptions = {}) {
    this.options = this.buildOptions(options);
    this.http = new HttpClient(this.options);
    this.loadResources();
  }

  private buildOptions(options: ClientOptions): ClientOptions {
    const merged = { ...DEFAULT_OPTIONS, ...options };

    // Build API endpoint if not provided
    if (!merged.apiEndpoint) {
      const version = merged.apiVersion === 'boomerang' ? 'boomerang' : `v${merged.apiVersion}`;
      merged.apiEndpoint = `https://${merged.apiDomain}/${version}`;
    }

    // Load from environment variables if not provided
    merged.apiKey = merged.apiKey || process.env.BOOQABLE_API_KEY;
    merged.companyId = merged.companyId || process.env.BOOQABLE_COMPANY_ID;
    merged.clientId = merged.clientId || process.env.BOOQABLE_CLIENT_ID;
    merged.clientSecret = merged.clientSecret || process.env.BOOQABLE_CLIENT_SECRET;

    return merged as ClientOptions;
  }

  private loadResources(): void {
    for (const resource of resources) {
      if (typeof resource === 'string') {
        // Simple resource name
        this.defineResource(resource, resource);
      } else {
        // Resource with alias { "app_carriers": "carriers" }
        const [key, alias] = Object.entries(resource)[0];
        this.defineResource(key, alias);

        // Also create the alias as a separate resource
        if (alias !== key) {
          this.defineResource(alias, alias);
        }
      }
    }
  }

  private defineResource(name: string, resourceType: string): void {
    const proxy = new ResourceProxy(this.http, resourceType, this.options.companyId);
    this.resourceProxies.set(name, proxy);

    // Define getter on the client instance
    Object.defineProperty(this, name, {
      get: () => proxy,
      enumerable: true,
      configurable: true,
    });
  }

  /**
   * Get a resource proxy by name
   */
  resource(name: string): ResourceProxy {
    const proxy = this.resourceProxies.get(name);
    if (!proxy) {
      throw new Error(`Unknown resource: ${name}`);
    }
    return proxy;
  }

  /**
   * Get current rate limit information
   */
  rateLimit(): RateLimit {
    return this.http.getRateLimit();
  }

  /**
   * Get the last response from the API
   */
  get lastResponse() {
    return this.http.lastResponse;
  }

  /**
   * Authenticate with OAuth authorization code
   */
  async authenticateWithCode(code: string, redirectUri: string): Promise<OAuthToken> {
    const oauthClient = this.http.getOAuthClient();
    if (!oauthClient) {
      throw new Error('OAuth client not configured. Provide clientId and clientSecret.');
    }
    return await oauthClient.authenticateWithCode(code, redirectUri);
  }

  /**
   * Get current OAuth token
   */
  getOAuthToken(): OAuthToken | null {
    const oauthClient = this.http.getOAuthClient();
    return oauthClient ? oauthClient.getToken() : null;
  }

  /**
   * Create a new client with different options
   */
  static create(options: ClientOptions = {}): BooqableClient {
    return new BooqableClient(options);
  }

  /**
   * Configure the default client instance
   */
  static configure(options: ClientOptions): BooqableClient {
    return new BooqableClient(options);
  }
}

// Add resource method declarations to the class for TypeScript
export interface BooqableClient {
  // Resources with aliases
  app_carriers: ResourceProxy;
  carriers: ResourceProxy;
  app_subscriptions: ResourceProxy;
  subscriptions: ResourceProxy;
  app_payment_options: ResourceProxy;
  payment_options: ResourceProxy;

  // Standard resources
  authentication_methods: ResourceProxy;
  barcodes: ResourceProxy;
  bundles: ResourceProxy;
  bundle_items: ResourceProxy;
  clusters: ResourceProxy;
  collections: ResourceProxy;
  collection_items: ResourceProxy;
  collection_trees: ResourceProxy;
  companies: ResourceProxy;
  countries: ResourceProxy;
  coupons: ResourceProxy;
  customers: ResourceProxy;
  default_properties: ResourceProxy;
  delivery_distance_calculations: ResourceProxy;
  deposit_holds: ResourceProxy;
  documents: ResourceProxy;
  emails: ResourceProxy;
  email_templates: ResourceProxy;
  employees: ResourceProxy;
  employee_invitations: ResourceProxy;
  inventory_breakdowns: ResourceProxy;
  inventory_levels: ResourceProxy;
  invoice_finalizations: ResourceProxy;
  invoice_revisions: ResourceProxy;
  item_prices: ResourceProxy;
  items: ResourceProxy;
  lines: ResourceProxy;
  line_charge_suggestions: ResourceProxy;
  locations: ResourceProxy;
  notes: ResourceProxy;
  orders: ResourceProxy;
  order_delivery_rate_recalculations: ResourceProxy;
  order_delivery_rates: ResourceProxy;
  order_fulfillments: ResourceProxy;
  order_price_recalculations: ResourceProxy;
  order_status_transitions: ResourceProxy;
  payments: ResourceProxy;
  payment_authorizations: ResourceProxy;
  payment_charges: ResourceProxy;
  payment_methods: ResourceProxy;
  payment_refunds: ResourceProxy;
  photos: ResourceProxy;
  plannings: ResourceProxy;
  price_rules: ResourceProxy;
  price_rulesets: ResourceProxy;
  price_structures: ResourceProxy;
  price_tiles: ResourceProxy;
  products: ResourceProxy;
  product_groups: ResourceProxy;
  properties: ResourceProxy;
  provinces: ResourceProxy;
  settings: ResourceProxy;
  signatures: ResourceProxy;
  sortings: ResourceProxy;
  stock_adjustments: ResourceProxy;
  stock_items: ResourceProxy;
  stock_item_archivations: ResourceProxy;
  stock_item_plannings: ResourceProxy;
  stock_item_suggestions: ResourceProxy;
  tags: ResourceProxy;
  tax_categories: ResourceProxy;
  tax_rates: ResourceProxy;
  tax_regions: ResourceProxy;
  tax_values: ResourceProxy;
  transfers: ResourceProxy;
  user_invitations: ResourceProxy;
  users: ResourceProxy;
  webhook_endpoints: ResourceProxy;
  webhooks: ResourceProxy;
}
