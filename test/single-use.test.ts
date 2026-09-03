import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHmac, createHash } from 'node:crypto'
import { BooqableClient } from '../src/client.js'
import {
  PrivateKeyOrSecretRequired,
  SingleUseTokenAlgorithmRequired,
  SingleUseTokenCompanyIdRequired,
  SingleUseTokenUserIdRequired,
} from '../src/errors.js'
import { SingleUseAuth } from '../src/auth/single-use.js'
import { stubFetch } from './helpers.js'

const options = {
  companyId: 'demo',
  singleUseToken: 'token-id',
  singleUseTokenAlgorithm: 'HS256',
  singleUseTokenSecret: 'signing-secret',
  singleUseTokenCompanyId: 'company-uuid',
  singleUseTokenUserId: 'user-uuid',
}

function decodeSegment(segment: string) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString())
}

afterEach(() => vi.unstubAllGlobals())

describe('SingleUseAuth', () => {
  it('signs each request with a request-bound HS256 JWT', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient(options)

    await client.get('orders', { include: 'customer' })

    const authorization = requests[0].headers['Authorization']
    expect(authorization).toMatch(/^Bearer /)

    const [headerSegment, payloadSegment, signatureSegment] = authorization.replace('Bearer ', '').split('.')
    const header = decodeSegment(headerSegment)
    const payload = decodeSegment(payloadSegment)

    expect(header).toEqual({ alg: 'HS256', typ: 'JWT', kid: 'token-id', kind: 'single_use' })
    expect(payload.aud).toBe('company-uuid')
    expect(payload.sub).toBe('user-uuid')
    expect(payload.iss).toBe('https://demo.booqable.com')
    expect(payload.alg).toBe('HS256')
    expect(payload.exp - payload.iat).toBe(600)

    // Signature verifies with the shared secret.
    const expectedSignature = createHmac('sha256', 'signing-secret')
      .update(`${headerSegment}.${payloadSegment}`)
      .digest('base64url')
    expect(signatureSegment).toBe(expectedSignature)

    // jti is bound to the exact request: uuid.base64(sha256("METHOD.fullpath."))
    const [uuid, data] = payload.jti.split(/\.(.+)/)
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/)
    const fullpath = '/api/4/orders?include=customer'
    const expectedData = createHash('sha256').update(['GET', fullpath, ''].join('.')).digest('base64')
    expect(data).toBe(expectedData)
  })

  it('includes the body hash in the jti for requests with a body', async () => {
    const { requests } = stubFetch({ body: { data: {} } })
    const client = new BooqableClient(options)

    await client.post('orders', { data: { type: 'orders', attributes: {} } })

    const payload = decodeSegment(requests[0].headers['Authorization'].split('.')[1])
    const body = requests[0].body!
    const encodedBody = createHash('sha256').update(body).digest('base64')
    const expectedData = createHash('sha256').update(['POST', '/api/4/orders', encodedBody].join('.')).digest('base64')
    expect(payload.jti.split(/\.(.+)/)[1]).toBe(expectedData)
  })

  it('generates a unique token per request', async () => {
    const { requests } = stubFetch({ body: { data: [] } })
    const client = new BooqableClient(options)

    await client.get('orders')
    await client.get('orders')

    expect(requests[0].headers['Authorization']).not.toBe(requests[1].headers['Authorization'])
  })

  it('validates its configuration', () => {
    const base = {
      singleUseToken: 't',
      singleUseTokenAlgorithm: 'HS256',
      singleUseTokenPrivateKey: 'secret',
      singleUseTokenCompanyId: 'c',
      singleUseTokenUserId: 'u',
    }

    expect(() => new SingleUseAuth({ ...base, singleUseTokenAlgorithm: undefined })).toThrow(
      SingleUseTokenAlgorithmRequired
    )
    expect(() => new SingleUseAuth({ ...base, singleUseTokenCompanyId: undefined })).toThrow(
      SingleUseTokenCompanyIdRequired
    )
    expect(() => new SingleUseAuth({ ...base, singleUseTokenUserId: undefined })).toThrow(SingleUseTokenUserIdRequired)
    expect(() => new SingleUseAuth({ ...base, singleUseTokenPrivateKey: undefined })).toThrow(
      PrivateKeyOrSecretRequired
    )
  })
})
