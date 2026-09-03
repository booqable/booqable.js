import { afterEach, describe, expect, it, vi } from 'vitest'
import { BooqableClient } from '../src/client.js'
import { RefreshTokenRevoked } from '../src/errors.js'
import { OAuthClient } from '../src/oauth-client.js'
import { jsonApiOrder, stubFetch } from './helpers.js'

const now = () => Math.floor(Date.now() / 1000)

const oauthOptions = (readToken: () => any, writeToken: (token: any) => void = () => {}) => ({
  companyId: 'demo',
  clientId: 'oauth-client-id',
  clientSecret: 'oauth-client-secret',
  readToken,
  writeToken,
})

afterEach(() => vi.unstubAllGlobals())

describe('OAuth authentication', () => {
  it('uses the stored token when it is fresh', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient(oauthOptions(() => ({ access_token: 'fresh-token', expires_at: now() + 3600 })))

    await client.orders.list()

    expect(requests).toHaveLength(1)
    expect(requests[0].headers['Authorization']).toBe('Bearer fresh-token')
  })

  it('refreshes the token when it is expired and persists the new one', async () => {
    const written: any[] = []
    const { requests } = stubFetch(
      { body: { access_token: 'new-token', refresh_token: 'new-refresh', expires_in: 3600 } },
      { body: { data: [] } }
    )
    const client = new BooqableClient(
      oauthOptions(
        () => ({ access_token: 'old-token', refresh_token: 'old-refresh', expires_at: now() - 10 }),
        (token) => written.push(token)
      )
    )

    await client.orders.list()

    expect(requests[0].url).toBe('https://demo.booqable.com/api/4/oauth/token')
    const form = new URLSearchParams(requests[0].body!)
    expect(form.get('grant_type')).toBe('refresh_token')
    expect(form.get('refresh_token')).toBe('old-refresh')
    expect(form.get('client_id')).toBe('oauth-client-id')

    expect(requests[1].headers['Authorization']).toBe('Bearer new-token')
    expect(written).toHaveLength(1)
    expect(written[0].access_token).toBe('new-token')
    expect(typeof written[0].expires_at).toBe('number')
  })

  it('refreshes tokens that expire within the 60 second buffer', async () => {
    const { requests } = stubFetch(
      { body: { access_token: 'new-token', expires_in: 3600 } },
      { body: { data: [] } }
    )
    const client = new BooqableClient(
      oauthOptions(() => ({ access_token: 'old', refresh_token: 'r', expires_at: now() + 30 }))
    )

    await client.orders.list()

    expect(requests[0].url).toContain('/oauth/token')
    expect(requests[1].headers['Authorization']).toBe('Bearer new-token')
  })

  it('refreshes when the stored token has no expiry', async () => {
    const { requests } = stubFetch(
      { body: { access_token: 'new-token', expires_in: 3600 } },
      { body: { data: [] } }
    )
    const client = new BooqableClient(oauthOptions(() => ({ access_token: 'old', refresh_token: 'r' })))

    await client.orders.list()
    expect(requests[0].url).toContain('/oauth/token')
  })

  it('coerces Date expiries from readToken', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient(
      oauthOptions(() => ({ access_token: 'fresh', expires_at: new Date(Date.now() + 3600 * 1000) }))
    )

    await client.orders.list()
    expect(requests[0].headers['Authorization']).toBe('Bearer fresh')
  })

  it('maps refresh failures to typed errors and never continues', async () => {
    const { requests } = stubFetch({ status: 400, body: { error: 'invalid_grant' }, headers: { 'Content-Type': 'application/json' } })
    const client = new BooqableClient(
      oauthOptions(() => ({ access_token: 'old', refresh_token: 'revoked', expires_at: now() - 10 }))
    )

    await expect(client.orders.list()).rejects.toThrow(RefreshTokenRevoked)
    expect(requests).toHaveLength(1)
  })

  it('propagates a plain error when there is no refresh token', async () => {
    stubFetch({ body: { data: [] } })
    const client = new BooqableClient(oauthOptions(() => ({ access_token: 'old', expires_at: now() - 10 })))

    await expect(client.orders.list()).rejects.toThrow(/refresh_token is not available/)
  })

  it('runs the read+check+refresh sequence inside aroundRefreshToken', async () => {
    const events: string[] = []
    stubFetch(
      { body: { access_token: 'new-token', expires_in: 3600 } },
      { body: { data: [jsonApiOrder('1')] } }
    )
    const client = new BooqableClient({
      ...oauthOptions(
        () => {
          events.push('read')
          return { access_token: 'old', refresh_token: 'r', expires_at: now() - 10 }
        },
        () => events.push('write')
      ),
      aroundRefreshToken: async (refresh) => {
        events.push('lock')
        await refresh()
        events.push('unlock')
      },
    })

    await client.orders.list()

    expect(events).toEqual(['lock', 'read', 'write', 'unlock'])
  })

  it('takes precedence over an api key, which wins over single-use tokens', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient({
      companyId: 'demo',
      apiKey: 'api-key',
      singleUseToken: 'sut',
      singleUseTokenAlgorithm: 'HS256',
      singleUseTokenSecret: 's',
      singleUseTokenCompanyId: 'c',
      singleUseTokenUserId: 'u',
    })

    await client.orders.list()
    expect(requests[0].headers['Authorization']).toBe('Bearer api-key')
  })
})

describe('authenticateWithCode', () => {
  it('exchanges the code and persists the token', async () => {
    const written: any[] = []
    const { requests } = stubFetch({
      body: { access_token: 'token', refresh_token: 'refresh', expires_in: 7200 },
      headers: { 'Content-Type': 'application/json' },
    })
    const client = new BooqableClient({
      companyId: 'demo',
      clientId: 'cid',
      clientSecret: 'csecret',
      redirectUri: 'https://app.example.com/callback',
      writeToken: (token) => written.push(token),
    })

    const token = await client.authenticateWithCode('auth-code-123')

    const form = new URLSearchParams(requests[0].body!)
    expect(requests[0].url).toBe('https://demo.booqable.com/api/4/oauth/token')
    expect(form.get('grant_type')).toBe('authorization_code')
    expect(form.get('code')).toBe('auth-code-123')
    expect(form.get('scope')).toBe('full_access')
    expect(form.get('redirect_uri')).toBe('https://app.example.com/callback')

    expect(token.access_token).toBe('token')
    expect(token.expires_at).toBeGreaterThan(now())
    expect(written).toHaveLength(1)
  })

  it('requires OAuth configuration', async () => {
    const client = new BooqableClient({ companyId: 'demo', apiKey: 'x' })
    await expect(client.authenticateWithCode('code')).rejects.toThrow(/OAuth is not configured/)
  })
})

describe('OAuthClient.normalizeToken', () => {
  it('computes expires_at from expires_in and created_at', () => {
    const token = OAuthClient.normalizeToken({ access_token: 'x', expires_in: 100, created_at: 1000 })
    expect(token.expires_at).toBe(1100)
  })

  it('coerces string expiries', () => {
    expect(OAuthClient.normalizeToken({ expires_at: '1234' }).expires_at).toBe(1234)
    expect(OAuthClient.normalizeToken({ expires_at: '2024-01-01T00:00:00Z' }).expires_at).toBe(
      Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000)
    )
  })
})

describe('custom auth strategy', () => {
  it('takes precedence over built-in auth and runs per attempt', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    let calls = 0
    const client = new BooqableClient({
      companyId: 'demo',
      apiKey: 'ignored-api-key',
      auth: {
        apply(request) {
          calls += 1
          request.headers['Authorization'] = `Bearer session-handle-${calls}`
        },
      },
    })

    await client.orders.list()
    await client.orders.list()

    expect(requests[0].headers['Authorization']).toBe('Bearer session-handle-1')
    expect(requests[1].headers['Authorization']).toBe('Bearer session-handle-2')
  })

  it('supports async strategies', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient({
      companyId: 'demo',
      auth: {
        async apply(request) {
          request.headers['Authorization'] = 'Bearer async-token'
        },
      },
    })

    await client.orders.list()
    expect(requests[0].headers['Authorization']).toBe('Bearer async-token')
  })
})
