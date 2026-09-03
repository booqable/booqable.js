import { describe, expect, it } from 'vitest'
import { apiEndpointFor, normalizeOptions } from '../src/options.js'
import { BooqableClient } from '../src/client.js'
import { CompanyRequired, UnsupportedAPIVersion } from '../src/errors.js'

describe('apiEndpointFor', () => {
  it('builds the endpoint from company and domain', () => {
    expect(apiEndpointFor({ companyId: 'demo', apiDomain: 'booqable.com', apiVersion: 4 })).toBe(
      'https://demo.booqable.com/api/4'
    )
  })

  it('uses http for non-production domains', () => {
    expect(apiEndpointFor({ companyId: 'demo', apiDomain: 'lvh.me', apiVersion: 4 })).toBe('http://demo.lvh.me/api/4')
  })

  it('supports the boomerang version', () => {
    expect(apiEndpointFor({ companyId: 'demo', apiDomain: 'booqable.com', apiVersion: 'boomerang' })).toBe(
      'https://demo.booqable.com/api/boomerang'
    )
  })

  it('prefers an explicit apiEndpoint', () => {
    expect(apiEndpointFor({ apiEndpoint: 'https://example.com/api/4/' })).toBe('https://example.com/api/4')
  })

  it('requires a company id', () => {
    expect(() => apiEndpointFor({ apiDomain: 'booqable.com', apiVersion: 4 })).toThrow(CompanyRequired)
  })

  it('rejects unsupported API versions', () => {
    expect(() => apiEndpointFor({ companyId: 'demo', apiDomain: 'booqable.com', apiVersion: 3 })).toThrow(
      UnsupportedAPIVersion
    )
  })
})

describe('normalizeOptions', () => {
  it('accepts camelCase keys', () => {
    expect(normalizeOptions({ apiKey: 'x', companyId: 'demo' })).toEqual({ apiKey: 'x', companyId: 'demo' })
  })

  it('camelizes snake_case keys', () => {
    expect(normalizeOptions({ api_key: 'x', company_id: 'demo', per_page: 50 })).toEqual({
      apiKey: 'x',
      companyId: 'demo',
      perPage: 50,
    })
  })

  it('resolves aliases', () => {
    expect(normalizeOptions({ skipRetries: true })).toEqual({ noRetries: true })
    expect(normalizeOptions({ skip_retries: true })).toEqual({ noRetries: true })
  })

  it('rejects unknown options with suggestions', () => {
    expect(() => normalizeOptions({ api_keys: 'x' })).toThrow(/unknown configuration option\(s\): api_keys/)
    expect(() => normalizeOptions({ api_keys: 'x' })).toThrow(/Did you mean: .*apiKey/)
  })

  it('rejects unknown options without suggestions when nothing is close', () => {
    expect(() => normalizeOptions({ definitely_not_an_option_at_all: 1 })).toThrow(
      /unknown configuration option\(s\): definitely_not_an_option_at_all/
    )
  })
})

describe('BooqableClient options', () => {
  it('applies defaults', () => {
    const client = new BooqableClient({ apiKey: 'x', companyId: 'demo' })
    expect(client.options.apiDomain).toBe('booqable.com')
    expect(client.options.perPage).toBe(25)
    expect(client.options.defaultMediaType).toBe('application/vnd.api+json')
    expect(client.options.strictAttributes).toBe(true)
    expect(client.http.apiEndpoint).toBe('https://demo.booqable.com/api/4')
  })

  it('validates constructor options', () => {
    expect(() => new BooqableClient({ nope: 1 })).toThrow(/unknown configuration option/)
  })
})
