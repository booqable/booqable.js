# Booqable.js

JavaScript/TypeScript toolkit for the [Booqable API](https://developers.booqable.com/).

[Booqable](https://booqable.com) is a rental management platform that helps businesses manage their rental inventory, customers, and orders. This library provides a JavaScript interface to interact with all Booqable API endpoints.

It is a faithful port of the [booqable.rb](https://github.com/booqable/booqable.rb) Ruby gem with **zero runtime dependencies**: it is built on the global `fetch` and Web Crypto, so it runs in Node.js (≥ 20), browsers, and edge runtimes such as Cloudflare Workers.

## Table of Contents

- [Installation](#installation)
- [Making requests](#making-requests)
- [Authentication](#authentication)
- [Configuration](#configuration)
- [Pagination](#pagination)
- [Rate limiting](#rate-limiting)
- [Resources](#resources)
- [Parsing JSON:API payloads](#parsing-jsonapi-payloads)
- [Strict attribute reads](#strict-attribute-reads)
- [Error handling](#error-handling)
- [Development](#development)

## Installation

```bash
npm install @booqable/client
# or
bun add @booqable/client
```

## Making requests

API methods are available on the module-level default export (consuming module-level configuration) or on a client instance.

```typescript
import Booqable from '@booqable/client'

// Provide authentication credentials
Booqable.configure({
  apiKey: 'your_api_key_here',
  companyId: 'your_company_id',
})

// Fetch orders
const orders = await Booqable.orders.list()
```

or

```typescript
import { BooqableClient } from '@booqable/client'

// Create a client instance
const client = new BooqableClient({
  apiKey: 'your_api_key_here',
  companyId: 'your_company_id',
})

// Fetch orders
const orders = await client.orders.list()
```

## Authentication

Booqable supports several authentication methods to suit different use cases:

### API Key Authentication (Recommended)

The simplest way to authenticate is with an API key:

```typescript
Booqable.configure({
  apiKey: 'your_api_key_here',
  companyId: 'your_company_id',
})
```

Generate your API key from your Booqable account settings. [Learn more about API keys](https://developers.booqable.com/#authentication-access-token).

### OAuth2 Authentication

For applications that need to act on behalf of multiple users:

```typescript
const client = new BooqableClient({
  clientId: 'your_oauth_client_id',
  clientSecret: 'your_oauth_client_secret',
  companyId: 'your_company_id',
  readToken: async () => {
    // Return the stored token hash
    return JSON.parse(await fs.readFile('token.json', 'utf8'))
  },
  writeToken: async (token) => {
    // Store the token hash
    await fs.writeFile('token.json', JSON.stringify(token))
  },
})

// Complete the OAuth flow (e.g. in your callback handler)
await client.authenticateWithCode(params.code)
```

Access tokens are refreshed automatically when they are expired or about to
expire (a 60-second buffer absorbs network latency and clock skew), and the
refreshed token is persisted through `writeToken`.

#### Serializing concurrent token refreshes

When multiple processes share the same OAuth token (e.g. the same installation
serving concurrent requests), pass an `aroundRefreshToken` callable to
serialize the read + expiry-check + refresh sequence. The client awaits the
callable once per request; the host application decides how to lock.

```typescript
new BooqableClient({
  // ...other oauth options...
  aroundRefreshToken: async (refresh) => {
    await installation.withAdvisoryLock(async () => {
      await installation.reload()
      await refresh()
    })
  },
})
```

The library itself has no locking dependency — `aroundRefreshToken` is just an
async function that receives the refresh sequence to run.

### Single-Use Token Authentication

For server-to-server communication requiring enhanced security (request
signing — every request carries a unique JWT bound to its method, path, and
body):

```typescript
const client = new BooqableClient({
  singleUseToken: 'your_token_id',
  singleUseTokenAlgorithm: 'HS256',
  singleUseTokenSecret: 'your_signing_secret',
  singleUseTokenCompanyId: 'company_uuid',
  singleUseTokenUserId: 'user_uuid',
  companyId: 'your_company_id',
})
```

Supports HS256 (HMAC), RS256 (RSA), and ES256 (ECDSA) algorithms. RS256/ES256
private keys must be PEM-encoded PKCS#8 (`-----BEGIN PRIVATE KEY-----`).
[Learn more about request signing](https://developers.booqable.com/#authentication-request-signing).

### Custom Authentication

For anything the built-in methods don't cover (e.g. attaching a
session-specific header when talking to the API through a proxy), pass a
custom `auth` strategy — the JavaScript analog of booqable.rb's custom
middleware support. It takes precedence over the built-in methods and is
called before every request (and every retry attempt):

```typescript
const client = new BooqableClient({
  apiEndpoint: '/api/booqable/proxy', // e.g. an authenticated same-origin proxy
  auth: {
    apply(request) {
      request.headers['Authorization'] = `Bearer ${mySessionHandle}`
    },
  },
})
```

### Environment Variables

In Node.js, all authentication options can be configured via environment variables:

```bash
export BOOQABLE_API_KEY="your_api_key_here"
export BOOQABLE_COMPANY_ID="your_company_id"
export BOOQABLE_CLIENT_ID="your_oauth_client_id"
export BOOQABLE_CLIENT_SECRET="your_oauth_client_secret"
```

## Configuration

```typescript
Booqable.configure({
  apiKey: 'your_api_key_here',
  companyId: 'your_company_id',
  apiDomain: 'booqable.com', // Default
  apiVersion: 4,             // Default
  perPage: 25,               // Default pagination size
  autoPaginate: true,        // Auto-fetch all pages
})
```

Options are camelCase; the snake_case spellings used by booqable.rb
(`api_key`, `company_id`, …) are accepted as aliases. Unknown options throw
an error with a "did you mean" suggestion.

### Per-client configuration

```typescript
const client = new BooqableClient({
  apiKey: 'your_api_key_here',
  companyId: 'your_company_id',
  perPage: 50,
  autoPaginate: false,
})
```

## Pagination

### Manual pagination

```typescript
// Fetch first page
const orders = await Booqable.orders.list({ page: { size: 25, number: 1 } })

// Fetch next page
const nextOrders = await Booqable.orders.list({ page: { size: 25, number: 2 } })
```

### Auto-pagination

```typescript
Booqable.configure({ autoPaginate: true })

// This will automatically fetch ALL orders across all pages
const allOrders = await Booqable.orders.list()
```

## Rate limiting

Rate limit information is tracked from every response:

```typescript
await Booqable.orders.list()

const rateLimit = Booqable.rateLimit()
console.log(`Remaining requests: ${rateLimit.remaining}`)
console.log(`Limit: ${rateLimit.limit}`)
console.log(`Resets in: ${rateLimit.resetsIn} seconds`)
```

When the API rate-limits a request, the thrown `TooManyRequests` error carries
the same information on its `context` property.

### Automatic retries

Every idempotent request is retried up to two times when it fails with a
server error or a network error, with exponential backoff.

```typescript
Booqable.configure({ noRetries: true }) // Disable automatic retries
```

## Resources

All Booqable API resources are available through a consistent interface:

### Orders

```typescript
// List orders with filtering and includes
const orders = await Booqable.orders.list({
  include: 'customer,items',
  filter: { status: 'reserved' },
  sort: '-created_at',
})

// `all` is an alias for `list`
const sameOrders = await Booqable.orders.all({ filter: { status: 'reserved' } })

// Find a specific order
const order = await Booqable.orders.find('order_id', { include: 'customer,items' })
order.customer.name

// Create an order
const newOrder = await Booqable.orders.create({
  starts_at: '2024-01-01T00:00:00Z',
  stops_at: '2024-01-02T00:00:00Z',
  status: 'draft',
})
newOrder.status // => 'draft'

// Update an order
const updatedOrder = await Booqable.orders.update('order_id', { stops_at: '2024-01-03T00:00:00Z' })

// Delete an order
const deletedOrder = await Booqable.orders.delete('order_id')
deletedOrder.id // => 'order_id'
```

### Customers

```typescript
const customers = await Booqable.customers.list({ filter: { name: 'John' }, sort: 'created_at' })

const customer = await Booqable.customers.create({ name: 'John Doe', email: 'john@example.com' })

await Booqable.customers.update('customer_id', { name: 'Jane Doe' })

await Booqable.customers.delete('customer_id')
```

### Available resources

**Core Resources:**

- `orders`, `customers`, `products`, `items`
- `employees`, `companies`, `locations`
- `payments`, `documents`

**Inventory Management:**

- `inventory_levels`, `stock_items`, `stock_adjustments`
- `transfers`, `plannings`, `clusters`

**Configuration:**

- `settings`, `properties`, `tax_rates`
- `payment_methods`, `email_templates`

**And many more...** See the [full resource list](src/resources.json) for all available endpoints. Resources can also be reached by name via `client.resource('orders')`, and lower-level access is available through `client.get/post/put/patch/delete/request/paginate`.

## Parsing JSON:API payloads

JSON:API formatted data (such as webhook payloads or raw API responses) can be parsed into plain objects with flattened attributes and populated relationships:

```typescript
const payload = {
  data: {
    id: 'abc-123',
    type: 'customers',
    attributes: {
      name: 'John Doe',
      email: 'john@example.com',
      created_at: '2024-01-15T10:30:00Z',
    },
  },
}

const customer = Booqable.parseResource(payload)
customer.id         // => "abc-123"
customer.name       // => "John Doe"
customer.email      // => "john@example.com"
customer.created_at // => Date object (2024-01-15T10:30:00Z)
```

### With nested relationships

```typescript
const payload = {
  data: {
    id: 'order-123',
    type: 'orders',
    attributes: { status: 'reserved' },
    relationships: {
      customer: { data: { id: 'customer-456', type: 'customers' } },
    },
  },
  included: [
    { id: 'customer-456', type: 'customers', attributes: { name: 'Jane Smith' } },
  ],
}

const order = Booqable.parseResource(payload)
order.status        // => "reserved"
order.customer.name // => "Jane Smith"
```

`parseResource` accepts a JSON string or an already-parsed object, and is also
available on client instances and as a named export. `deserializeResource` is
an alias.

## Strict attribute reads

Reading an attribute that is absent from the API payload throws
`MissingAttribute` instead of silently returning undefined, so typos and
renamed API fields fail loudly:

```typescript
customer.name      // => "John Doe"
customer.full_name // throws MissingAttribute (key absent from payload)
```

An attribute that is present in the payload with a null value still returns
null — only absent keys throw:

```typescript
order.customer // => null when the payload contains "customer": null
```

`MissingAttribute` subclasses `TypeError`. To probe for an attribute that may
be absent, use the `in` operator or the raw attributes:

```typescript
'customer' in order // => false when the key is absent (lenient probe)
order.$attrs        // => the underlying plain object
```

Strictness can be disabled per client with `strictAttributes: false`.

## Error handling

API failures throw typed errors, all subclasses of `BooqableError`:

```typescript
import Booqable, { BooqableError, NotFound, TooManyRequests } from '@booqable/client'

try {
  await Booqable.orders.find('invalid_id')
} catch (error) {
  if (error instanceof NotFound) {
    // 404
  } else if (error instanceof TooManyRequests) {
    console.log(error.context?.resetsIn) // rate limit info
  } else if (error instanceof BooqableError) {
    console.log(error.message)        // "GET https://…: 422 - …"
    console.log(error.responseStatus) // HTTP status
    console.log(error.errors)         // JSON:API validation errors
  }
}
```

The full hierarchy mirrors booqable.rb, including body-based refinements such
as `UnknownAttribute`, `InvalidFilter`, `CompanyNotFound`, `FeatureNotEnabled`,
`TokenRevoked`, `RefreshTokenRevoked`, and `ReadOnlyMode`.

## Development

After checking out the repo, run `npm install` to install dependencies.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Build (emits ESM + type declarations to dist/)
npm run build
```

### Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/booqable/booqable.js.

## Versioning

This library aims to support and is tested against Node.js 20, 22, and 24,
and targets any runtime with `fetch` and Web Crypto (browsers, Cloudflare
Workers, Deno, Bun).

## License

The library is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

---

**Questions?** Check out the [Booqable API documentation](https://developers.booqable.com/) or [open an issue](https://github.com/booqable/booqable.js/issues/new).
