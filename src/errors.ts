import { RateLimit } from './rate-limit.js'

/** Secret-bearing parameter names redacted from error messages. */
const SECRETS = [
  'client_secret',
  'client_id',
  'api_key',
  'single_use_token',
  'single_use_token_private_key',
  'single_use_token_secret',
  'refresh_token',
  'access_token',
]

/** The pieces of an HTTP exchange an error is built from. */
export interface ErrorResponse {
  status: number
  headers?: Headers | Record<string, string>
  body?: string
  url?: string
  method?: string
  /** The request body, used to classify OAuth invalid_grant errors. */
  requestBody?: string
}

function headerGet(headers: Headers | Record<string, string> | undefined, name: string): string | null {
  if (!headers) return null
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name)
  const record = headers as Record<string, string>
  const key = Object.keys(record).find((k) => k.toLowerCase() === name.toLowerCase())
  return key ? record[key] : null
}

/**
 * Base error for all Booqable API errors.
 *
 * Mirrors Booqable::Error from booqable.rb: carries the response status,
 * headers, and body, plus parsed JSON:API validation errors when present.
 */
export class BooqableError extends Error {
  /** Rate limit information, populated for rate-limited errors. */
  context: RateLimit | null = null

  readonly response: ErrorResponse

  constructor(response: ErrorResponse) {
    super(buildErrorMessage(response))
    this.name = new.target.name
    this.response = response

    if (RATE_LIMITED_ERRORS.some((klass) => this instanceof klass)) {
      this.context = RateLimit.fromHeaders(response.headers)
    }
  }

  /** Status code returned by the Booqable server. */
  get responseStatus(): number {
    return this.response.status
  }

  /** Headers returned by the Booqable server. */
  get responseHeaders(): Headers | Record<string, string> | undefined {
    return this.response.headers
  }

  /** Body returned by the Booqable server. */
  get responseBody(): string | undefined {
    return this.response.body
  }

  /** Validation errors from the JSON:API error document, if any. */
  get errors(): any[] {
    const data = parseBody(this.response)
    if (data && typeof data === 'object' && Array.isArray((data as any).errors)) {
      return (data as any).errors
    }
    return []
  }
}

function parseBody(response: ErrorResponse): unknown {
  const body = response.body
  if (!body) return null

  const contentType = headerGet(response.headers, 'content-type') || ''
  if (/json/.test(contentType)) {
    try {
      return JSON.parse(body)
    } catch {
      return body
    }
  }

  return body
}

function redactUrl(url: string): string {
  let redacted = url
  for (const token of SECRETS) {
    if (redacted.includes(token)) {
      redacted = redacted.replace(new RegExp(`${token}=\\S+`, 'g'), `${token}=(redacted)`)
    }
  }
  return redacted
}

function buildErrorMessage(response: ErrorResponse): string {
  let message = `${(response.method || '').toUpperCase()} `
  message += `${redactUrl(response.url || '')}: `
  message += `${response.status} - `

  const data = parseBody(response)

  if (typeof data === 'string') {
    message += data
  } else if (data && typeof data === 'object') {
    const record = data as Record<string, any>
    if (record.message) message += String(record.message)
    if (record.error) message += `Error: ${record.error}`
    if (record.errors && (!Array.isArray(record.errors) || record.errors.length > 0)) {
      message += '\nError summary:\n'
      if (typeof record.errors === 'string') {
        message += record.errors
      } else {
        message += record.errors
          .map((error: any) => {
            if (error && typeof error === 'object') {
              return Object.entries(error)
                .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
                .join('\n')
            }
            return `  ${error}`
          })
          .join('\n')
      }
    }
  }

  return message
}

// -- Error hierarchy ---------------------------------------------------------

/** Raised on errors in the 400-499 range. */
export class ClientError extends BooqableError {}

/** Raised when Booqable returns a 400 HTTP status code. */
export class BadRequest extends ClientError {}

/** 400 with a body matching 'unwrittable_attribute'. */
export class ReadOnlyAttribute extends ClientError {}

/** 400 with a body matching 'unknown_attribute'. */
export class UnknownAttribute extends ClientError {}

/** 400 with a body matching 'fields should be an object'. */
export class FieldsInWrongFormat extends ClientError {}

/** 400 with a body matching 'extra fields should be an object'. */
export class ExtraFieldsInWrongFormat extends ClientError {}

/** 400 with a body matching 'page should be an object'. */
export class PageShouldBeAnObject extends ClientError {}

/** 400 with a body matching 'failed typecasting'. */
export class FailedTypecasting extends ClientError {}

/** 400 with a body matching 'invalid filter'. */
export class InvalidFilter extends ClientError {}

/** 400 with a body matching 'required filter'. */
export class RequiredFilter extends ClientError {}

/** 401 with a body matching 'token is invalid (revoked)'. */
export class TokenRevoked extends ClientError {}

/** 400 invalid_grant where the grant type is refresh_token (OAuth error). */
export class RefreshTokenRevoked extends TokenRevoked {}

/** 400 invalid_grant where the grant type is not refresh_token (OAuth error). */
export class InvalidGrant extends ClientError {}

/** Raised when Booqable returns a 401 HTTP status code. */
export class Unauthorized extends ClientError {}

/** Raised when Booqable returns a 402 HTTP status code. */
export class PaymentRequired extends ClientError {}

/** 402 with a body matching 'feature_not_enabled'. */
export class FeatureNotEnabled extends PaymentRequired {}

/** 402 with a body matching 'trial_expired'. */
export class TrialExpired extends PaymentRequired {}

/** Raised when Booqable returns a 403 HTTP status code. */
export class Forbidden extends ClientError {}

/** Raised when Booqable returns a 429 HTTP status code (rate limited). */
export class TooManyRequests extends Forbidden {}

/** Raised when Booqable returns a 404 HTTP status code. */
export class NotFound extends ClientError {}

/** 404 with a body matching 'company not found'. */
export class CompanyNotFound extends NotFound {}

/** Raised when Booqable returns a 405 HTTP status code. */
export class MethodNotAllowed extends ClientError {}

/** Raised when Booqable returns a 406 HTTP status code. */
export class NotAcceptable extends ClientError {}

/** Raised when Booqable returns a 409 HTTP status code. */
export class Conflict extends ClientError {}

/** Raised when Booqable returns a 410 HTTP status code. */
export class Deprecated extends ClientError {}

/** Raised when Booqable returns a 415 HTTP status code. */
export class UnsupportedMediaType extends ClientError {}

/** Raised when Booqable returns a 423 HTTP status code. */
export class Locked extends ClientError {}

/** Raised when Booqable returns a 422 HTTP status code. */
export class UnprocessableEntity extends ClientError {}

/** 422 with a body matching 'is not a datetime'. */
export class InvalidDateTimeFormat extends UnprocessableEntity {}

/** 422 with a body matching 'invalid date'. */
export class InvalidDateFormat extends UnprocessableEntity {}

/** Raised on errors in the 500-599 range. */
export class ServerError extends BooqableError {}

/** Raised when Booqable returns a 500 HTTP status code. */
export class InternalServerError extends ServerError {}

/** Raised when Booqable returns a 501 HTTP status code. */
export class NotImplemented extends ServerError {}

/** Raised when Booqable returns a 502 HTTP status code. */
export class BadGateway extends ServerError {}

/** Raised when Booqable returns a 503 HTTP status code. */
export class ServiceUnavailable extends ServerError {}

/** 503 with a body matching 'read-only'. */
export class ReadOnlyMode extends ServerError {}

/** Raised when Booqable configuration is invalid. */
export class ConfigArgumentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

/** Raised when a company slug is not set in Booqable configuration. */
export class CompanyRequired extends ConfigArgumentError {
  constructor() {
    super('Company ID is required. Please set `companyId` in Booqable configuration.')
  }
}

/** Raised when single-use token auth is used without a company ID. */
export class SingleUseTokenCompanyIdRequired extends ConfigArgumentError {
  constructor() {
    super('Single use token company ID is required. Please set `singleUseTokenCompanyId` in Booqable configuration.')
  }
}

/** Raised when single-use token auth is used without a user ID. */
export class SingleUseTokenUserIdRequired extends ConfigArgumentError {
  constructor() {
    super('Single use token user ID is required. Please set `singleUseTokenUserId` in Booqable configuration.')
  }
}

/** Raised when single-use token auth is used without an algorithm. */
export class SingleUseTokenAlgorithmRequired extends ConfigArgumentError {
  constructor() {
    super('Single use token algorithm is required. Please set `singleUseTokenAlgorithm` in Booqable configuration.')
  }
}

/** Raised when single-use token auth is used without a private key or secret. */
export class PrivateKeyOrSecretRequired extends ConfigArgumentError {
  constructor() {
    super(
      'Private key or secret is required. Please set `singleUseTokenPrivateKey` or `singleUseTokenSecret` in Booqable configuration.'
    )
  }
}

/** Raised when an unsupported API version is configured. */
export class UnsupportedAPIVersion extends ConfigArgumentError {
  constructor() {
    super("Unsupported API version configured. Only version '4' is supported.")
  }
}

/** Raised when a required authentication parameter is missing. */
export class RequiredAuthParamMissing extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

/**
 * Raised when reading an attribute that is absent from an API resource.
 *
 * Plain property access normally answers reads of absent attributes with
 * undefined, which turns typos and renamed API fields (e.g. `time_zone` vs
 * `default_timezone`) into silent data bugs. Resources created by this
 * library throw this error instead — see {@link strictResource}.
 *
 * Attributes that are present in the payload with a null value still return
 * null; only reads of keys that are absent from the payload throw.
 *
 * This inherits from TypeError (not BooqableError) because an absent
 * attribute is a programming error in the caller, not an API failure.
 */
export class MissingAttribute extends TypeError {
  readonly attributeName: string

  constructor(attributeName: string, attrs: Record<string, unknown>) {
    const type = typeof attrs.type === 'string' ? `a Booqable ${attrs.type} resource` : 'a Booqable resource'
    super(
      `undefined attribute \`${attributeName}\` for ${type}. ` +
        'The attribute is absent from the API payload ' +
        '(attributes present with a null value return null). ' +
        `Available attributes: ${Object.keys(attrs).sort().join(', ')}`
    )
    this.name = 'MissingAttribute'
    this.attributeName = attributeName
  }
}

export const RATE_LIMITED_ERRORS = [TooManyRequests]

// -- Error classification ----------------------------------------------------

function errorFor400(response: ErrorResponse): typeof BooqableError {
  const body = response.body || ''
  if (/unwrittable_attribute/i.test(body)) return ReadOnlyAttribute
  if (/unknown_attribute/i.test(body)) return UnknownAttribute
  if (/extra fields should be an object/i.test(body)) return ExtraFieldsInWrongFormat
  if (/fields should be an object/i.test(body)) return FieldsInWrongFormat
  if (/page should be an object/i.test(body)) return PageShouldBeAnObject
  if (/failed typecasting/i.test(body)) return FailedTypecasting
  if (/invalid filter/i.test(body)) return InvalidFilter
  if (/required filter/i.test(body)) return RequiredFilter
  if (/invalid_grant/i.test(body)) return errorForInvalidGrant(response)
  return BadRequest
}

function errorFor401(response: ErrorResponse): typeof BooqableError {
  if (/token is invalid \(revoked\)/i.test(response.body || '')) return TokenRevoked
  return Unauthorized
}

function errorFor402(body: string): typeof BooqableError {
  if (/feature_not_enabled/i.test(body)) return FeatureNotEnabled
  if (/trial_expired/i.test(body)) return TrialExpired
  return PaymentRequired
}

function errorFor404(body: string): typeof BooqableError {
  if (/company not found/i.test(body)) return CompanyNotFound
  return NotFound
}

function errorFor422(body: string): typeof BooqableError {
  if (/is not a datetime/i.test(body)) return InvalidDateTimeFormat
  if (/invalid date/i.test(body)) return InvalidDateFormat
  return UnprocessableEntity
}

function errorFor503(body: string): typeof BooqableError {
  if (/read-only/.test(body)) return ReadOnlyMode
  return ServiceUnavailable
}

/**
 * Distinguishes a revoked refresh token from other OAuth grant errors by
 * examining the grant_type parameter in the (form-encoded) request body.
 */
function errorForInvalidGrant(response: ErrorResponse): typeof BooqableError {
  const grantType = new URLSearchParams(response.requestBody || '').get('grant_type') || ''
  if (/refresh_token/i.test(grantType)) return RefreshTokenRevoked
  return InvalidGrant
}

/**
 * Returns the appropriate BooqableError subclass for an HTTP response,
 * or null when the status does not indicate an error.
 */
export function errorClassFromResponse(response: ErrorResponse): typeof BooqableError | null {
  const status = response.status
  const body = response.body || ''

  if (status === 400) return errorFor400(response)
  if (status === 401) return errorFor401(response)
  if (status === 402) return errorFor402(body)
  if (status === 403) return Forbidden
  if (status === 404) return errorFor404(body)
  if (status === 405) return MethodNotAllowed
  if (status === 406) return NotAcceptable
  if (status === 409) return Conflict
  if (status === 410) return Deprecated
  if (status === 415) return UnsupportedMediaType
  if (status === 422) return errorFor422(body)
  if (status === 423) return Locked
  if (status === 429) return TooManyRequests
  if (status >= 400 && status <= 499) return ClientError
  if (status === 500) return InternalServerError
  if (status === 501) return NotImplemented
  if (status === 502) return BadGateway
  if (status === 503) return errorFor503(body)
  if (status >= 500 && status <= 599) return ServerError

  return null
}

/**
 * Builds and throws the appropriate error for an HTTP response.
 * Does nothing for successful responses.
 */
export function raiseForResponse(response: ErrorResponse): void {
  const klass = errorClassFromResponse(response)
  if (klass) throw new klass(response)
}
