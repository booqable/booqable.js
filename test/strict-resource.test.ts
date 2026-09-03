import { describe, expect, it } from 'vitest'
import { strictResource } from '../src/strict-resource.js'
import { MissingAttribute } from '../src/errors.js'

describe('strictResource', () => {
  const resource = () => strictResource({ id: '1', type: 'customers', name: 'Jane', email: null } as any)

  it('returns present attributes', () => {
    expect(resource().name).toBe('Jane')
    expect(resource().id).toBe('1')
  })

  it('returns null for attributes present with a null value', () => {
    expect(resource().email).toBeNull()
  })

  it('throws MissingAttribute for absent attributes', () => {
    expect(() => resource().full_name).toThrow(MissingAttribute)
    expect(() => resource().full_name).toThrow(/undefined attribute `full_name` for a Booqable customers resource/)
    expect(() => resource().full_name).toThrow(/Available attributes: email, id, name, type/)
  })

  it('supports lenient probes', () => {
    const record = resource()
    expect('full_name' in record).toBe(false)
    expect('name' in record).toBe(true)
    expect(record.$attrs).toEqual({ id: '1', type: 'customers', name: 'Jane', email: null })
  })

  it('keeps JSON.stringify, spread, and Object.keys working', () => {
    const record = resource()
    expect(JSON.parse(JSON.stringify(record))).toEqual({ id: '1', type: 'customers', name: 'Jane', email: null })
    expect({ ...record }).toEqual({ id: '1', type: 'customers', name: 'Jane', email: null })
    expect(Object.keys(record).sort()).toEqual(['email', 'id', 'name', 'type'])
  })

  it('does not throw for runtime probe properties', () => {
    const record = resource()
    expect((record as any).then).toBeUndefined()
    expect((record as any).toJSON).toBeUndefined()
    expect((record as any).$$typeof).toBeUndefined()
    // Promise assimilation probes `then` and must not throw on strict resources.
    expect(() => Promise.resolve(record)).not.toThrow()
  })

  it('wraps nested objects and array elements strictly', () => {
    const record = strictResource({
      id: '1',
      type: 'orders',
      customer: { id: '2', type: 'customers', name: 'Jane' },
      lines: [{ id: '3', type: 'lines', title: 'Camera' }],
    } as any)

    expect(record.customer.name).toBe('Jane')
    expect(() => record.customer.missing).toThrow(MissingAttribute)
    expect(record.lines[0].title).toBe('Camera')
    expect(() => record.lines[0].missing).toThrow(MissingAttribute)
    expect(record.lines.length).toBe(1)
    expect(record.lines.map((line: any) => line.id)).toEqual(['3'])
  })

  it('leaves Date values unwrapped', () => {
    const created = new Date('2024-01-01T00:00:00Z')
    const record = strictResource({ id: '1', type: 'orders', created_at: created } as any)
    expect(record.created_at).toBe(created)
  })
})
