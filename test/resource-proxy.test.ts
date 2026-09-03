import { afterEach, describe, expect, it, vi } from 'vitest'
import { BooqableClient } from '../src/client.js'
import { MissingAttribute, NotFound } from '../src/errors.js'
import { jsonApiOrder, stubFetch } from './helpers.js'

const clientOptions = { apiKey: 'test-key', companyId: 'demo' }

afterEach(() => vi.unstubAllGlobals())

describe('ResourceProxy', () => {
  it('lists resources', async () => {
    const { requests } = stubFetch({ body: { data: [jsonApiOrder('1'), jsonApiOrder('2')] } })
    const client = new BooqableClient(clientOptions)

    const orders = await client.orders.list({ filter: { status: 'draft' } })

    expect(requests[0].url).toContain('https://demo.booqable.com/api/4/orders?')
    expect(new URL(requests[0].url).searchParams.get('filter[status]')).toBe('draft')
    expect(orders).toHaveLength(2)
    expect(orders[0].status).toBe('draft')
  })

  it('aliases all to list', async () => {
    stubFetch({ body: { data: [jsonApiOrder('1')] } })
    const client = new BooqableClient(clientOptions)

    const orders = await client.orders.all()
    expect(orders).toHaveLength(1)
  })

  it('finds a resource by id', async () => {
    const { requests } = stubFetch({ body: { data: jsonApiOrder('123', { status: 'reserved' }) } })
    const client = new BooqableClient(clientOptions)

    const order = await client.orders.find('123', { include: 'customer' })

    expect(requests[0].url).toBe('https://demo.booqable.com/api/4/orders/123?include=customer')
    expect(order.id).toBe('123')
    expect(order.status).toBe('reserved')
  })

  it('creates a resource with a JSON:API body', async () => {
    const { requests } = stubFetch({ status: 201, body: { data: jsonApiOrder('9') } })
    const client = new BooqableClient(clientOptions)

    const order = await client.orders.create({ starts_at: '2024-01-01T00:00:00Z' })

    expect(requests[0].method).toBe('POST')
    expect(requests[0].url).toBe('https://demo.booqable.com/api/4/orders')
    expect(JSON.parse(requests[0].body!)).toEqual({
      data: { type: 'orders', attributes: { starts_at: '2024-01-01T00:00:00Z' } },
    })
    expect(order.id).toBe('9')
  })

  it('updates a resource with a JSON:API body', async () => {
    const { requests } = stubFetch({ body: { data: jsonApiOrder('9', { status: 'reserved' }) } })
    const client = new BooqableClient(clientOptions)

    const order = await client.orders.update('9', { status: 'reserved' })

    expect(requests[0].method).toBe('PUT')
    expect(requests[0].url).toBe('https://demo.booqable.com/api/4/orders/9')
    expect(JSON.parse(requests[0].body!)).toEqual({
      data: { type: 'orders', id: '9', attributes: { status: 'reserved' } },
    })
    expect(order.status).toBe('reserved')
  })

  it('deletes a resource and returns it', async () => {
    const { requests } = stubFetch({ body: { data: jsonApiOrder('9') } })
    const client = new BooqableClient(clientOptions)

    const order = await client.orders.delete('9')

    expect(requests[0].method).toBe('DELETE')
    expect(requests[0].url).toBe('https://demo.booqable.com/api/4/orders/9')
    expect(order.id).toBe('9')
  })

  it('propagates API errors', async () => {
    stubFetch({ status: 404, body: { message: 'Record not found' } })
    const client = new BooqableClient({ ...clientOptions, noRetries: true })

    await expect(client.orders.find('missing')).rejects.toThrow(NotFound)
  })

  it('resolves aliases to the underlying resource', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient(clientOptions)

    await client.carriers.list()
    await client.issues.list()

    expect(requests[0].url).toContain('/api/4/app_carriers')
    expect(requests[1].url).toContain('/api/4/app_issues')
  })

  it('exposes resources through resource()', async () => {
    stubFetch({ body: { data: [] } })
    const client = new BooqableClient(clientOptions)

    await expect(client.resource('orders').list()).resolves.toEqual([])
    expect(() => client.resource('nonexistent')).toThrow(/Unknown resource: nonexistent/)
  })

  it('returns strict resources', async () => {
    stubFetch({ body: { data: jsonApiOrder('1') } })
    const client = new BooqableClient(clientOptions)

    const order = await client.orders.find('1')
    expect(() => order.not_a_field).toThrow(MissingAttribute)
  })

  it('returns plain resources when strictAttributes is disabled', async () => {
    stubFetch({ body: { data: jsonApiOrder('1') } })
    const client = new BooqableClient({ ...clientOptions, strictAttributes: false })

    const order = await client.orders.find('1')
    expect(order.not_a_field).toBeUndefined()
  })

  it('populates included relationships on find', async () => {
    stubFetch({
      body: {
        data: {
          ...jsonApiOrder('1'),
          relationships: { customer: { data: { id: 'c1', type: 'customers' } } },
        },
        included: [{ id: 'c1', type: 'customers', attributes: { name: 'Jane' } }],
      },
    })
    const client = new BooqableClient(clientOptions)

    const order = await client.orders.find('1', { include: 'customer' })
    expect(order.customer.name).toBe('Jane')
  })
})
