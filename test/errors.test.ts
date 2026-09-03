import { describe, expect, it } from 'vitest'
import {
  BadGateway,
  BadRequest,
  BooqableError,
  ClientError,
  CompanyNotFound,
  Conflict,
  errorClassFromResponse,
  FeatureNotEnabled,
  Forbidden,
  InternalServerError,
  InvalidDateTimeFormat,
  InvalidFilter,
  InvalidGrant,
  NotFound,
  raiseForResponse,
  ReadOnlyMode,
  RefreshTokenRevoked,
  ServerError,
  ServiceUnavailable,
  TokenRevoked,
  TooManyRequests,
  Unauthorized,
  UnknownAttribute,
  UnprocessableEntity,
} from '../src/errors.js'

function classify(status: number, body = '', requestBody?: string) {
  return errorClassFromResponse({ status, body, requestBody, url: 'https://demo.booqable.com/api/4/orders', method: 'get' })
}

describe('errorClassFromResponse', () => {
  it('returns null for successful responses', () => {
    expect(classify(200)).toBeNull()
    expect(classify(204)).toBeNull()
    expect(classify(302)).toBeNull()
  })

  it('maps status codes to error classes', () => {
    expect(classify(400)).toBe(BadRequest)
    expect(classify(401)).toBe(Unauthorized)
    expect(classify(403)).toBe(Forbidden)
    expect(classify(404)).toBe(NotFound)
    expect(classify(409)).toBe(Conflict)
    expect(classify(422)).toBe(UnprocessableEntity)
    expect(classify(429)).toBe(TooManyRequests)
    expect(classify(418)).toBe(ClientError)
    expect(classify(500)).toBe(InternalServerError)
    expect(classify(502)).toBe(BadGateway)
    expect(classify(503)).toBe(ServiceUnavailable)
    expect(classify(599)).toBe(ServerError)
  })

  it('classifies 400s by body content', () => {
    expect(classify(400, 'unknown_attribute foo')).toBe(UnknownAttribute)
    expect(classify(400, 'Invalid filter provided')).toBe(InvalidFilter)
  })

  it('classifies invalid_grant by the request grant_type', () => {
    expect(classify(400, '{"error":"invalid_grant"}', 'grant_type=refresh_token&refresh_token=x')).toBe(
      RefreshTokenRevoked
    )
    expect(classify(400, '{"error":"invalid_grant"}', 'grant_type=authorization_code&code=x')).toBe(InvalidGrant)
    expect(classify(400, '{"error":"invalid_grant"}')).toBe(InvalidGrant)
  })

  it('classifies revoked tokens on 401', () => {
    expect(classify(401, 'The access token is invalid (revoked)')).toBe(TokenRevoked)
  })

  it('classifies 402, 404, 422 and 503 refinements', () => {
    expect(classify(402, 'feature_not_enabled')).toBe(FeatureNotEnabled)
    expect(classify(404, 'Company not found')).toBe(CompanyNotFound)
    expect(classify(422, 'value is not a datetime')).toBe(InvalidDateTimeFormat)
    expect(classify(503, 'system is in read-only mode')).toBe(ReadOnlyMode)
  })
})

describe('BooqableError', () => {
  it('builds a message from method, url, status and body', () => {
    const error = new NotFound({
      status: 404,
      method: 'get',
      url: 'https://demo.booqable.com/api/4/orders/123',
      body: JSON.stringify({ message: 'Record not found' }),
      headers: { 'content-type': 'application/json' },
    })

    expect(error.message).toContain('GET https://demo.booqable.com/api/4/orders/123: 404 - Record not found')
    expect(error.responseStatus).toBe(404)
    expect(error.name).toBe('NotFound')
  })

  it('redacts secrets from urls', () => {
    const error = new BadRequest({
      status: 400,
      method: 'get',
      url: 'https://demo.booqable.com/api/4/orders?api_key=super-secret',
    })

    expect(error.message).toContain('api_key=(redacted)')
    expect(error.message).not.toContain('super-secret')
  })

  it('exposes JSON:API validation errors', () => {
    const error = new UnprocessableEntity({
      status: 422,
      method: 'post',
      url: 'https://demo.booqable.com/api/4/orders',
      headers: { 'content-type': 'application/vnd.api+json' },
      body: JSON.stringify({ errors: [{ code: 'blank', detail: 'starts_at is blank' }] }),
    })

    expect(error.errors).toEqual([{ code: 'blank', detail: 'starts_at is blank' }])
    expect(error.message).toContain('Error summary')
    expect(error.message).toContain('starts_at is blank')
  })

  it('carries rate limit context for TooManyRequests', () => {
    const error = new TooManyRequests({
      status: 429,
      method: 'get',
      url: 'https://demo.booqable.com/api/4/orders',
      headers: { 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '0', 'X-RateLimit-Period': '60' },
    })

    expect(error.context?.limit).toBe(100)
    expect(error.context?.remaining).toBe(0)
    expect(error.context?.resetsIn).toBe(60)
  })

  it('has no rate limit context for other errors', () => {
    const error = new BadRequest({ status: 400, method: 'get', url: 'x' })
    expect(error.context).toBeNull()
  })
})

describe('raiseForResponse', () => {
  it('throws for error statuses and passes for success', () => {
    expect(() => raiseForResponse({ status: 200 })).not.toThrow()
    expect(() => raiseForResponse({ status: 404, url: 'x', method: 'get' })).toThrow(NotFound)
  })

  it('thrown errors are instances of BooqableError', () => {
    try {
      raiseForResponse({ status: 500, url: 'x', method: 'get' })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(BooqableError)
      expect(error).toBeInstanceOf(ServerError)
    }
  })
})
