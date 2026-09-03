import { describe, expect, it } from 'vitest'
import { parseResource } from '../src/resource-parser.js'
import { BooqableClient } from '../src/client.js'
import { MissingAttribute } from '../src/errors.js'

const payload = {
  data: {
    id: 'order-123',
    type: 'orders',
    attributes: { status: 'reserved', created_at: '2024-01-15T10:30:00Z' },
    relationships: {
      customer: { data: { id: 'customer-456', type: 'customers' } },
    },
  },
  included: [{ id: 'customer-456', type: 'customers', attributes: { name: 'Jane Smith' } }],
}

describe('parseResource', () => {
  it('parses an object payload', () => {
    const order = parseResource(payload)

    expect(order.id).toBe('order-123')
    expect(order.status).toBe('reserved')
    expect(order.created_at).toBeInstanceOf(Date)
    expect(order.customer.name).toBe('Jane Smith')
  })

  it('parses a JSON string payload', () => {
    const order = parseResource(JSON.stringify(payload))
    expect(order.customer.name).toBe('Jane Smith')
  })

  it('returns null for empty input', () => {
    expect(parseResource(null)).toBeNull()
    expect(parseResource(undefined)).toBeNull()
    expect(parseResource('')).toBeNull()
    expect(parseResource('  ')).toBeNull()
    expect(parseResource('{}')).toBeNull()
  })

  it('returns strict resources by default', () => {
    const order = parseResource(payload)
    expect(() => order.not_here).toThrow(MissingAttribute)
  })

  it('can return plain resources', () => {
    const order = parseResource(payload, { strict: false })
    expect(order.not_here).toBeUndefined()
  })

  it('parses array payloads', () => {
    const records = parseResource({ data: [{ id: '1', type: 'orders', attributes: { status: 'draft' } }] })
    expect(records).toHaveLength(1)
    expect(records[0].status).toBe('draft')
  })

  it('is exposed on the client with an alias', () => {
    const client = new BooqableClient({ companyId: 'demo', apiKey: 'x' })
    expect(client.parseResource(payload).id).toBe('order-123')
    expect(client.deserializeResource(payload).id).toBe('order-123')
  })

  it('honors the client strictAttributes option', () => {
    const client = new BooqableClient({ companyId: 'demo', apiKey: 'x', strictAttributes: false })
    expect(client.parseResource(payload).not_here).toBeUndefined()
  })
})
