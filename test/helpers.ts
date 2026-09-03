import { vi } from 'vitest'

export interface RecordedRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

export interface StubResponse {
  status?: number
  headers?: Record<string, string>
  body?: string | object
}

/**
 * Replaces global fetch with a stub that answers queued responses in order
 * (repeating the last one) and records every request it receives.
 */
export function stubFetch(...responses: StubResponse[]) {
  const requests: RecordedRequest[] = []
  let index = 0

  const mock = vi.fn(async (url: any, init: any = {}) => {
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(init.headers ?? {})) headers[key] = String(value)
    requests.push({ url: String(url), method: init.method ?? 'GET', headers, body: init.body })

    const stub = responses[Math.min(index++, responses.length - 1)] ?? {}
    const body = typeof stub.body === 'string' ? stub.body : JSON.stringify(stub.body ?? {})

    return new Response(body, {
      status: stub.status ?? 200,
      headers: { 'Content-Type': 'application/vnd.api+json', ...(stub.headers ?? {}) },
    })
  })

  vi.stubGlobal('fetch', mock)

  return { requests, mock }
}

export function jsonApiOrder(id: string, attributes: Record<string, any> = {}) {
  return { id, type: 'orders', attributes: { status: 'draft', ...attributes } }
}
