import { afterEach, describe, expect, it, vi } from 'vitest'
import Booqable, { BooqableClient, NotFound, ServerError } from '../src/index.js'
import { jsonApiOrder, stubFetch } from './helpers.js'

const clientOptions = { apiKey: 'test-key', companyId: 'demo' }

afterEach(() => {
  vi.unstubAllGlobals()
  Booqable.reset()
})

describe('BooqableClient', () => {
  it('makes GET requests with default headers and bearer auth', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient(clientOptions)

    await client.get('orders')

    expect(requests[0].url).toBe('https://demo.booqable.com/api/4/orders')
    expect(requests[0].method).toBe('GET')
    expect(requests[0].headers['Authorization']).toBe('Bearer test-key')
    expect(requests[0].headers['Accept']).toBe('application/vnd.api+json')
    expect(requests[0].headers['Content-Type']).toBe('application/vnd.api+json')
    expect(requests[0].headers['User-Agent']).toMatch(/Booqable JavaScript Client/)
  })

  it('serializes nested query params with brackets and joins arrays', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient(clientOptions)

    await client.get('orders', {
      include: ['customer', 'lines'],
      filter: { status: 'reserved' },
      page: { size: 5, number: 2 },
    })

    const url = new URL(requests[0].url)
    expect(url.searchParams.get('include')).toBe('customer,lines')
    expect(url.searchParams.get('filter[status]')).toBe('reserved')
    expect(url.searchParams.get('page[size]')).toBe('5')
    expect(url.searchParams.get('page[number]')).toBe('2')
  })

  it('lifts a headers key into request headers', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient(clientOptions)

    await client.get('orders', { headers: { 'X-Custom': 'yes' }, include: 'customer' })

    expect(requests[0].headers['X-Custom']).toBe('yes')
    expect(new URL(requests[0].url).searchParams.get('include')).toBe('customer')
    expect(new URL(requests[0].url).searchParams.get('headers')).toBeNull()
  })

  it('sends JSON:API bodies for POST requests', async () => {
    const { requests } = stubFetch({ body: { data: jsonApiOrder('1') } })
    const client = new BooqableClient(clientOptions)

    await client.post('orders', { data: { type: 'orders', attributes: { status: 'draft' } } })

    expect(requests[0].method).toBe('POST')
    expect(JSON.parse(requests[0].body!)).toEqual({ data: { type: 'orders', attributes: { status: 'draft' } } })
  })

  it('decodes responses and tracks lastResponse and rate limits', async () => {
    stubFetch({
      body: { data: jsonApiOrder('1'), meta: { total: 1 } },
      headers: { 'X-RateLimit-Limit': '300', 'X-RateLimit-Remaining': '299', 'X-RateLimit-Period': '60' },
    })
    const client = new BooqableClient(clientOptions)

    const document = await client.get('orders/1')

    expect(document.data.id).toBe('1')
    expect(document.data.status).toBe('draft')
    expect(client.lastResponse?.status).toBe(200)
    expect(client.rateLimit().remaining).toBe(299)
    expect(client.rateLimit().limit).toBe(300)
  })

  it('throws typed errors and clears lastResponse on failure', async () => {
    stubFetch({ body: { data: jsonApiOrder('1') } }, { status: 404, body: { message: 'Record not found' } })
    const client = new BooqableClient({ ...clientOptions, noRetries: true })

    await client.get('orders/1')
    expect(client.lastResponse).not.toBeNull()

    await expect(client.get('orders/missing')).rejects.toThrow(NotFound)
    expect(client.lastResponse).toBeNull()
  })

  it('retries server errors up to two times', async () => {
    const { requests } = stubFetch({ status: 503, body: 'unavailable' }, { status: 503, body: 'unavailable' }, { body: { data: [] } })
    const client = new BooqableClient(clientOptions)
    client.http.sleep = async () => {}

    const document = await client.get('orders')

    expect(requests).toHaveLength(3)
    expect(document.data).toEqual([])
  })

  it('throws after exhausting retries', async () => {
    const { requests } = stubFetch({ status: 500, body: 'boom' })
    const client = new BooqableClient(clientOptions)
    client.http.sleep = async () => {}

    await expect(client.get('orders')).rejects.toThrow(ServerError)
    expect(requests).toHaveLength(3)
  })

  it('does not retry when noRetries is set', async () => {
    const { requests } = stubFetch({ status: 500, body: 'boom' })
    const client = new BooqableClient({ ...clientOptions, noRetries: true })

    await expect(client.get('orders')).rejects.toThrow(ServerError)
    expect(requests).toHaveLength(1)
  })

  it('does not retry non-idempotent methods', async () => {
    const { requests } = stubFetch({ status: 500, body: 'boom' })
    const client = new BooqableClient(clientOptions)

    await expect(client.post('orders', { data: {} })).rejects.toThrow(ServerError)
    expect(requests).toHaveLength(1)
  })

  it('retries network errors', async () => {
    const responses = [() => Promise.reject(new TypeError('fetch failed')), () => Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/vnd.api+json' } }))]
    let call = 0
    vi.stubGlobal('fetch', vi.fn(() => responses[Math.min(call++, responses.length - 1)]()))

    const client = new BooqableClient(clientOptions)
    client.http.sleep = async () => {}

    const document = await client.get('orders')
    expect(document.data).toEqual([])
    expect(call).toBe(2)
  })

  it('exposes the skipRetries alias', () => {
    const client = new BooqableClient({ ...clientOptions, skipRetries: true })
    expect(client.options.noRetries).toBe(true)
  })
})

describe('pagination', () => {
  it('requests page size, number, and stats by default', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient(clientOptions)

    await client.orders.list()

    const url = new URL(requests[0].url)
    expect(url.searchParams.get('page[size]')).toBe('25')
    expect(url.searchParams.get('page[number]')).toBe('1')
    expect(url.searchParams.get('stats[total]')).toBe('count')
  })

  it('fetches all pages when autoPaginate is enabled', async () => {
    const page = (ids: string[]) => ({
      body: {
        data: ids.map((id) => jsonApiOrder(id)),
        meta: { stats: { total: { count: 5 } } },
      },
      headers: { 'X-RateLimit-Remaining': '10' },
    })
    const { requests } = stubFetch(page(['1', '2']), page(['3', '4']), page(['5']))
    const client = new BooqableClient({ ...clientOptions, autoPaginate: true, perPage: 2 })

    const orders = await client.orders.list()

    expect(orders.map((order: any) => order.id)).toEqual(['1', '2', '3', '4', '5'])
    expect(requests).toHaveLength(3)
    expect(new URL(requests[2].url).searchParams.get('page[number]')).toBe('3')
  })

  it('stops paginating when the rate limit is exhausted', async () => {
    const page = (ids: string[], remaining: string) => ({
      body: { data: ids.map((id) => jsonApiOrder(id)), meta: { stats: { total: { count: 4 } } } },
      headers: { 'X-RateLimit-Remaining': remaining },
    })
    const { requests } = stubFetch(page(['1', '2'], '0'))
    const client = new BooqableClient({ ...clientOptions, autoPaginate: true, perPage: 2 })

    const orders = await client.orders.list()

    expect(orders).toHaveLength(2)
    expect(requests).toHaveLength(1)
  })

  it('respects an explicit page size', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient(clientOptions)

    await client.orders.list({ page: { size: 100 } })

    expect(new URL(requests[0].url).searchParams.get('page[size]')).toBe('100')
  })
})

describe('module-level Booqable', () => {
  it('configures a default client and delegates resource methods', async () => {
    const { requests } = stubFetch({ body: { data: [] } })

    Booqable.configure({ apiKey: 'module-key', companyId: 'demo' })
    const orders = await Booqable.orders.list()

    expect(orders).toEqual([])
    expect(requests[0].headers['Authorization']).toBe('Bearer module-key')
  })

  it('supports callback-style configuration', async () => {
    const { requests } = stubFetch({ body: { data: [] } })

    Booqable.configure((config) => {
      config.apiKey = 'callback-key'
      config.companyId = 'demo'
    })
    await Booqable.orders.list()

    expect(requests[0].headers['Authorization']).toBe('Bearer callback-key')
  })

  it('rebuilds the client when configuration changes', async () => {
    stubFetch({ body: { data: [] } })

    Booqable.configure({ apiKey: 'key', companyId: 'demo' })
    const first = Booqable.client()
    expect(Booqable.client()).toBe(first)

    Booqable.configure({ companyId: 'other' })
    expect(Booqable.client()).not.toBe(first)
    expect(Booqable.client().http.apiEndpoint).toBe('https://other.booqable.com/api/4')
  })
})
