import { describe, expectTypeOf, it } from 'vitest'
import Booqable, { BooqableClient, type AuthRequestContext, type ClientOptions, type TokenHash } from '../src/index.js'

// Checked by `npm run typecheck`; the runtime assertions are no-ops.
describe('option types', () => {
  it('types callbacks passed to the client constructor', () => {
    new BooqableClient({
      writeToken: (token) => expectTypeOf(token).toEqualTypeOf<TokenHash>(),
      aroundRefreshToken: async (refresh) => { expectTypeOf(refresh).toEqualTypeOf<() => Promise<void>>() },
      auth: { apply: (request) => { expectTypeOf(request).toEqualTypeOf<AuthRequestContext>() } },
    })
  })

  it('rejects mistyped camelCase options', () => {
    // @ts-expect-error apiKey must be a string
    new BooqableClient({ apiKey: 123 })
    // @ts-expect-error apiKey must be a string
    Booqable.configure({ apiKey: 123 })
    Booqable.configure((config) => {
      // @ts-expect-error apiKey must be a string
      config.apiKey = 123
    })
  })

  it('still accepts snake_case options', () => {
    new BooqableClient({ api_key: 'key', company_id: 'demo' })
    Booqable.configure({ api_key: 'key', company_id: 'demo' })
    Booqable.configure((config) => {
      config.api_key = 'key'
    })
  })

  it('accepts values typed as ClientOptions', () => {
    const options: ClientOptions = { apiKey: 'key', companyId: 'demo' }
    new BooqableClient(options)
    Booqable.configure(options)
  })
})
