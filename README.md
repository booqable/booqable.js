# Booqable Node.js Client

Official TypeScript/Node.js client library for the [Booqable API](https://developers.booqable.com/).

## Installation

```bash
npm install @booqable/client
# or
yarn add @booqable/client
```

## Quick Start

```typescript
import Booqable from '@booqable/client';

// Configure the client
Booqable.configure({
  apiKey: 'your_api_key',
  companyId: 'your_company_id'
});

// Fetch orders
const orders = await Booqable.orders.list({
  include: 'customer',
  filter: { status: 'reserved' },
  sort: '-created_at'
});

// Create a customer
const customer = await Booqable.customers.create({
  name: 'John Doe',
  email: 'john@example.com'
});
```

## Features

- ✅ Full TypeScript support with type definitions
- ✅ Support for all Booqable API resources (70+ endpoints)
- ✅ Multiple authentication methods (API Key, OAuth2, Single-Use Tokens)
- ✅ Automatic pagination with cursor support
- ✅ JSON:API format serialization/deserialization
- ✅ Comprehensive error handling
- ✅ Rate limiting tracking
- ✅ Automatic retry with exponential backoff
- ✅ Request signing for server-to-server communication

## Configuration

### Environment Variables

```bash
BOOQABLE_API_KEY=your_api_key
BOOQABLE_COMPANY_ID=your_company_id
```

### Module-Level Configuration

```typescript
import Booqable from '@booqable/client';

Booqable.configure({
  apiKey: process.env.BOOQABLE_API_KEY,
  companyId: process.env.BOOQABLE_COMPANY_ID,
  autoPaginate: true,
  perPage: 50
});
```

### Instance-Level Configuration

```typescript
import { BooqableClient } from '@booqable/client';

const client = new BooqableClient({
  apiKey: 'your_api_key',
  companyId: 'your_company_id'
});

const orders = await client.orders.list();
```

## Authentication

### API Key (Recommended)

```typescript
Booqable.configure({
  apiKey: 'your_api_key',
  companyId: 'your_company_id'
});
```

### OAuth2

```typescript
import { BooqableClient } from '@booqable/client';

const client = new BooqableClient({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  companyId: 'your_company_id',
  readToken: async () => {
    // Load token from storage
    return JSON.parse(await fs.readFile('token.json', 'utf-8'));
  },
  writeToken: async (token) => {
    // Save token to storage
    await fs.writeFile('token.json', JSON.stringify(token));
  }
});

// Exchange authorization code for token
const token = await client.authenticateWithCode(code, redirectUri);
```

### Single-Use Token (JWT)

```typescript
import { BooqableClient } from '@booqable/client';

const client = new BooqableClient({
  singleUseTokenAlgorithm: 'HS256',
  singleUseTokenSecret: 'your_shared_secret',
  singleUseTokenCompanyId: 'your_company_id',
  singleUseTokenExpirationPeriod: 600 // seconds
});
```

## Usage

### List Resources

```typescript
const orders = await Booqable.orders.list({
  include: 'customer,items',
  filter: { status: 'reserved' },
  sort: '-created_at',
  page: { size: 25, number: 1 }
});
```

### Find by ID

```typescript
const order = await Booqable.orders.find('order_id', {
  include: 'customer,items'
});
```

### Create

```typescript
const customer = await Booqable.customers.create({
  name: 'John Doe',
  email: 'john@example.com'
});
```

### Update

```typescript
const order = await Booqable.orders.update('order_id', {
  status: 'started'
});
```

### Delete

```typescript
await Booqable.customers.delete('customer_id');
```

## Pagination

### Manual Pagination

```typescript
const page1 = await Booqable.orders.list({
  page: { size: 25, number: 1 }
});

const page2 = await Booqable.orders.list({
  page: { size: 25, number: 2 }
});
```

### Auto-Pagination

```typescript
const client = new BooqableClient({
  apiKey: 'your_api_key',
  autoPaginate: true
});

// Automatically fetches all pages
const allOrders = await client.orders.list();
```

## Error Handling

```typescript
import { NotFound, TooManyRequests, UnprocessableEntity } from '@booqable/client';

try {
  const order = await Booqable.orders.find('order_id');
} catch (error) {
  if (error instanceof NotFound) {
    console.error('Order not found');
  } else if (error instanceof TooManyRequests) {
    console.error(`Rate limited! Retry in ${error.context?.resetsIn}s`);
  } else if (error instanceof UnprocessableEntity) {
    console.error('Validation errors:', error.errors);
  }
}
```

### Available Error Classes

- `BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`
- `UnprocessableEntity`, `TooManyRequests`
- `InternalServerError`, `ServiceUnavailable`
- And many more specific error types

## Rate Limiting

```typescript
const rateLimit = Booqable.rateLimit();

console.log(`Remaining: ${rateLimit.remaining}/${rateLimit.limit}`);
console.log(`Resets in: ${rateLimit.resetsIn}s`);
```

## TypeScript Support

Full TypeScript type definitions included:

```typescript
import { BooqableClient, Order, Customer } from '@booqable/client';

const client = new BooqableClient({ apiKey: 'key' });

const order: Order = await client.orders.find('id');
const customer: Customer = order.customer;
```

## Available Resources

The client provides access to 70+ Booqable API resources:

- `orders`, `customers`, `products`, `items`, `employees`
- `payments`, `invoices`, `documents`
- `inventory_levels`, `stock_items`, `plannings`
- `settings`, `properties`, `tax_rates`
- And many more!

## Configuration Options

```typescript
const client = new BooqableClient({
  // Authentication
  apiKey: 'key',
  clientId: 'id',
  clientSecret: 'secret',

  // API Configuration
  apiDomain: 'booqable.com',
  apiVersion: 4, // or 'boomerang'
  companyId: 'company_id',

  // Request Configuration
  perPage: 25,
  autoPaginate: false,
  timeout: 30000,
  proxy: 'http://proxy.example.com:8080',

  // Behavior
  debug: false,
  noRetries: false,
  maxRetries: 2
});
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Contributing

Contributions are welcome! Please:

1. Write tests for new features
2. Ensure all tests pass (`npm test`)
3. Follow the existing code style (`npm run lint`)
4. Update documentation as needed

## License

MIT

## Resources

- [Booqable API Documentation](https://developers.booqable.com/)
- [Support](https://help.booqable.com/)
- [GitHub Repository](https://github.com/booqable/booqable.js)
