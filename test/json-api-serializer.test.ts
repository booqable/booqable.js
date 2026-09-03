import { describe, expect, it } from 'vitest'
import { JsonApiSerializer } from '../src/json-api-serializer.js'

describe('JsonApiSerializer', () => {
  describe('decode', () => {
    it('returns null for nil or empty input', () => {
      expect(JsonApiSerializer.decode(null)).toBeNull()
      expect(JsonApiSerializer.decode(undefined)).toBeNull()
      expect(JsonApiSerializer.decode('')).toBeNull()
      expect(JsonApiSerializer.decode('   ')).toBeNull()
    })

    it('flattens attributes into the resource', () => {
      const decoded = JsonApiSerializer.decode(
        JSON.stringify({
          data: { id: '1', type: 'orders', attributes: { status: 'draft', number: 42 } },
        })
      )

      expect(decoded.data.id).toBe('1')
      expect(decoded.data.type).toBe('orders')
      expect(decoded.data.status).toBe('draft')
      expect(decoded.data.number).toBe(42)
      expect(decoded.data.attributes).toBeUndefined()
    })

    it('parses date-like attributes into Date objects', () => {
      const decoded = JsonApiSerializer.decode(
        JSON.stringify({
          data: {
            id: '1',
            type: 'orders',
            attributes: {
              created_at: '2024-01-15T10:30:00Z',
              starts_on: '2024-02-01',
              date: '2024-03-01',
              epoch_at: 1700000000,
              name_with_at_inside: 'kept',
              invalid_at: 'not a date',
            },
          },
        })
      )

      expect(decoded.data.created_at).toBeInstanceOf(Date)
      expect(decoded.data.created_at.toISOString()).toBe('2024-01-15T10:30:00.000Z')
      expect(decoded.data.starts_on).toBeInstanceOf(Date)
      expect(decoded.data.date).toBeInstanceOf(Date)
      expect(decoded.data.epoch_at).toBeInstanceOf(Date)
      expect(decoded.data.epoch_at.getTime()).toBe(1700000000 * 1000)
      expect(decoded.data.name_with_at_inside).toBe('kept')
      expect(decoded.data.invalid_at).toBe('not a date')
    })

    it('populates to-one relationships from included resources', () => {
      const decoded = JsonApiSerializer.decode(
        JSON.stringify({
          data: {
            id: 'order-1',
            type: 'orders',
            attributes: { status: 'reserved' },
            relationships: {
              customer: { data: { id: 'cust-1', type: 'customers' } },
            },
          },
          included: [{ id: 'cust-1', type: 'customers', attributes: { name: 'Jane' } }],
        })
      )

      expect(decoded.data.customer.id).toBe('cust-1')
      expect(decoded.data.customer.name).toBe('Jane')
      expect(decoded.data.relationships).toBeUndefined()
      expect(decoded._includes).toHaveLength(1)
      expect(decoded.included).toBeUndefined()
    })

    it('keeps bare references when the include is missing', () => {
      const decoded = JsonApiSerializer.decode(
        JSON.stringify({
          data: {
            id: 'order-1',
            type: 'orders',
            relationships: { customer: { data: { id: 'cust-9', type: 'customers' } } },
          },
        })
      )

      expect(decoded.data.customer).toEqual({ id: 'cust-9', type: 'customers' })
    })

    it('populates to-many relationships from included resources', () => {
      const decoded = JsonApiSerializer.decode(
        JSON.stringify({
          data: {
            id: 'order-1',
            type: 'orders',
            relationships: {
              lines: {
                data: [
                  { id: 'line-1', type: 'lines' },
                  { id: 'line-2', type: 'lines' },
                ],
              },
            },
          },
          included: [{ id: 'line-1', type: 'lines', attributes: { title: 'Camera' } }],
        })
      )

      expect(decoded.data.lines).toHaveLength(2)
      expect(decoded.data.lines[0].title).toBe('Camera')
      expect(decoded.data.lines[1]).toEqual({ id: 'line-2', type: 'lines' })
    })

    it('keeps explicitly null to-one relationships as present-with-null', () => {
      const decoded = JsonApiSerializer.decode(
        JSON.stringify({
          data: {
            id: 'order-1',
            type: 'orders',
            relationships: { customer: { data: null } },
          },
        })
      )

      expect('customer' in decoded.data).toBe(true)
      expect(decoded.data.customer).toBeNull()
    })

    it('drops relationships that only carry links', () => {
      const decoded = JsonApiSerializer.decode(
        JSON.stringify({
          data: {
            id: 'order-1',
            type: 'orders',
            relationships: { customer: { links: { related: '/customers/1' } } },
          },
        })
      )

      expect('customer' in decoded.data).toBe(false)
    })

    it('populates nested relationships recursively', () => {
      const decoded = JsonApiSerializer.decode(
        JSON.stringify({
          data: {
            id: 'order-1',
            type: 'orders',
            relationships: { customer: { data: { id: 'cust-1', type: 'customers' } } },
          },
          included: [
            {
              id: 'cust-1',
              type: 'customers',
              attributes: { name: 'Jane' },
              relationships: { properties: { data: [{ id: 'prop-1', type: 'properties' }] } },
            },
            { id: 'prop-1', type: 'properties', attributes: { value: 'VIP' } },
          ],
        })
      )

      expect(decoded.data.customer.properties[0].value).toBe('VIP')
    })

    it('survives circular includes', () => {
      const decoded = JsonApiSerializer.decode(
        JSON.stringify({
          data: {
            id: 'order-1',
            type: 'orders',
            relationships: { customer: { data: { id: 'cust-1', type: 'customers' } } },
          },
          included: [
            {
              id: 'cust-1',
              type: 'customers',
              attributes: { name: 'Jane' },
              relationships: { orders: { data: [{ id: 'order-2', type: 'orders' }] } },
            },
            {
              id: 'order-2',
              type: 'orders',
              relationships: { customer: { data: { id: 'cust-1', type: 'customers' } } },
            },
          ],
        })
      )

      expect(decoded.data.customer.name).toBe('Jane')
      expect(decoded.data.customer.orders[0].customer.name).toBe('Jane')
    })

    it('decodes arrays of resources', () => {
      const decoded = JsonApiSerializer.decode(
        JSON.stringify({
          data: [
            { id: '1', type: 'orders', attributes: { status: 'draft' } },
            { id: '2', type: 'orders', attributes: { status: 'reserved' } },
          ],
          meta: { stats: { total: { count: 2 } } },
        })
      )

      expect(decoded.data).toHaveLength(2)
      expect(decoded.data[1].status).toBe('reserved')
      expect(decoded.meta.stats.total.count).toBe(2)
    })
  })

  describe('encode', () => {
    it('converts Date instances to ISO 8601 strings', () => {
      const encoded = JsonApiSerializer.encode({
        data: { type: 'orders', attributes: { starts_at: new Date('2024-01-01T00:00:00Z') } },
      })

      expect(JSON.parse(encoded).data.attributes.starts_at).toBe('2024-01-01T00:00:00.000Z')
    })

    it('encodes nested arrays and objects', () => {
      const encoded = JsonApiSerializer.encode({ a: [{ b: new Date('2024-01-01T00:00:00Z') }], c: 1 })
      expect(JSON.parse(encoded)).toEqual({ a: [{ b: '2024-01-01T00:00:00.000Z' }], c: 1 })
    })
  })
})
