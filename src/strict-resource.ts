import { MissingAttribute } from './errors.js'

/**
 * Strict attribute reads for resources created by this library.
 *
 * Plain property access silently answers reads of absent attributes with
 * undefined. That turns typos and renamed API fields (e.g. `time_zone` vs
 * `default_timezone`) into silent data bugs. Resources returned by this
 * library throw {@link MissingAttribute} instead, mirroring
 * Booqable::StrictAttributes from booqable.rb.
 *
 * Attributes that ARE present in the payload with a null value still return
 * null — only reads of keys that are absent from the payload throw.
 *
 * Lenient probes remain available:
 * - `'key' in resource` answers presence without throwing
 * - `resource.$attrs` returns the underlying plain object
 * - JSON.stringify, spreading, Object.keys, and iteration all work normally
 */

/**
 * Property names that must behave like normal (absent → undefined) property
 * reads, because runtimes and frameworks probe objects with them.
 */
const LENIENT_PROPERTIES = new Set([
  'then', // Promise assimilation probes resolved values for `then`
  'toJSON',
  'constructor',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'inspect',
  '$$typeof', // React element probe
  '@@iterator',
])

const wrapped = new WeakMap<object, any>()

function wrapValue(value: any): any {
  if (Array.isArray(value)) {
    const cached = wrapped.get(value)
    if (cached) return cached
    const proxy = new Proxy(value, {
      get(target, prop, receiver) {
        const entry = Reflect.get(target, prop, receiver)
        if (typeof prop === 'string' && /^\d+$/.test(prop)) return wrapValue(entry)
        return entry
      },
    })
    wrapped.set(value, proxy)
    return proxy
  }

  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    return strictResource(value)
  }

  return value
}

/**
 * Wraps a decoded resource object in a Proxy that throws
 * {@link MissingAttribute} when an absent attribute is read.
 * Nested objects and array elements are wrapped lazily on access.
 */
export function strictResource<T extends object>(target: T): T {
  const cached = wrapped.get(target)
  if (cached) return cached

  const proxy = new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop === 'symbol') return Reflect.get(obj, prop, receiver)
      if (prop === '$attrs') return obj
      if (prop in obj) return wrapValue(Reflect.get(obj, prop, receiver))
      if (LENIENT_PROPERTIES.has(prop) || prop in Object.prototype) return Reflect.get(obj, prop, receiver)

      throw new MissingAttribute(prop, obj as Record<string, unknown>)
    },
  })

  wrapped.set(target, proxy)
  return proxy as T
}

/** Wraps each element of a decoded collection in a strict resource proxy. */
export function strictCollection(records: any): any {
  if (!Array.isArray(records)) return wrapValue(records)
  return records.map((record) =>
    typeof record === 'object' && record !== null ? strictResource(record) : record
  )
}
