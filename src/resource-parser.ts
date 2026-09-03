import { JsonApiSerializer } from './json-api-serializer.js'
import { strictResource } from './strict-resource.js'

/**
 * Parses JSON:API payloads (webhook payloads or raw API responses) into
 * plain objects with flattened attributes and populated relationships.
 *
 * @example
 *   const customer = parseResource('{"data":{"id":"123","type":"customers","attributes":{"name":"John"}}}')
 *   customer.id   // => "123"
 *   customer.name // => "John"
 *
 * @param payload - JSON:API payload (JSON string or already-parsed object)
 * @param strict - throw {@link MissingAttribute} on absent attribute reads (default: true)
 * @returns the parsed resource, or null for empty input
 */
export function parseResource(payload: string | Record<string, any> | null | undefined, { strict = true } = {}): any {
  if (payload == null) return null

  const json = typeof payload === 'string' ? payload : JSON.stringify(payload)
  if (json.trim() === '') return null

  const decoded = JsonApiSerializer.decode(json)
  const data = decoded?.data
  if (data == null) return null

  if (!strict || typeof data !== 'object') return data
  return Array.isArray(data)
    ? data.map((record) => (record && typeof record === 'object' ? strictResource(record) : record))
    : strictResource(data)
}
