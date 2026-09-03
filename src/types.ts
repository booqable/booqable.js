/** A stored OAuth token, in the same shape the OAuth token endpoint returns. */
export interface TokenHash {
  access_token?: string
  refresh_token?: string
  /** Epoch seconds after which the access token is expired. */
  expires_at?: number | string | Date | null
  expires_in?: number
  token_type?: string
  scope?: string
  created_at?: number
  [key: string]: unknown
}

/** Reads a stored OAuth token hash (may be async, e.g. a database read). */
export type ReadToken = () => TokenHash | null | undefined | Promise<TokenHash | null | undefined>

/** Persists a refreshed OAuth token hash (may be async). */
export type WriteToken = (token: TokenHash) => unknown | Promise<unknown>

/**
 * Wraps the OAuth read + expiry-check + refresh sequence so the host
 * application can serialize concurrent refreshes (e.g. with an advisory
 * lock). Must call and await the given function.
 */
export type AroundRefreshToken = (refresh: () => Promise<void>) => Promise<void>

/** Supported single-use token signing algorithms. */
export type SingleUseTokenAlgorithm = 'HS256' | 'RS256' | 'ES256'

/**
 * Configuration options for {@link BooqableClient}.
 *
 * These mirror the booqable.rb configuration keys, camelCased.
 * Snake_case spellings (e.g. `api_key`) are accepted as aliases.
 */
export interface ClientOptions {
  /** Domain for API requests (default: "booqable.com"). Non-default domains use http. */
  apiDomain?: string
  /** Full base URL for API requests, overriding domain/company construction. */
  apiEndpoint?: string
  /** API key used for Bearer authentication. */
  apiKey?: string
  /** API version, `4` (default) or `"boomerang"`. */
  apiVersion?: number | string
  /** Automatically fetch all pages of paginated results. */
  autoPaginate?: boolean
  /** OAuth client id. */
  clientId?: string
  /** OAuth client secret. */
  clientSecret?: string
  /** Company slug used to build the API endpoint (e.g. "demo" for demo.booqable.com). */
  companyId?: string
  /** Log requests and responses to the console. */
  debug?: boolean
  /** Media type sent in Accept/Content-Type headers (default: JSON:API). */
  defaultMediaType?: string
  /** Disable automatic retries of failed requests. */
  noRetries?: boolean
  /** Page size for paginated results (default: 25). */
  perPage?: number | null
  /** Reads the stored OAuth token hash. */
  readToken?: ReadToken
  /** Persists a (refreshed) OAuth token hash. */
  writeToken?: WriteToken
  /** OAuth redirect URI for the authorization-code flow. */
  redirectUri?: string
  /** Serializes the OAuth read+check+refresh sequence (e.g. advisory lock). */
  aroundRefreshToken?: AroundRefreshToken
  /** Single-use token id (JWT `kid`). */
  singleUseToken?: string
  /** Single-use token algorithm: HS256, RS256, or ES256. */
  singleUseTokenAlgorithm?: SingleUseTokenAlgorithm | string
  /** Company UUID for the single-use token `aud` claim. */
  singleUseTokenCompanyId?: string
  /** Single-use token lifetime in seconds (default: 600). */
  singleUseTokenExpirationPeriod?: number
  /** PEM (PKCS#8) private key for RS256/ES256 single-use token signing. */
  singleUseTokenPrivateKey?: string
  /** Shared secret for HS256 single-use token signing. */
  singleUseTokenSecret?: string
  /** User UUID for the single-use token `sub` claim. */
  singleUseTokenUserId?: string
  /** User-Agent header value (ignored by browsers). */
  userAgent?: string
  /**
   * Raise {@link MissingAttribute} when reading attributes that are absent
   * from an API payload (default: true, matching booqable.rb).
   */
  strictAttributes?: boolean
}

/** A JSON:API document as returned by the Booqable API, after deserialization. */
export interface JsonApiDocument {
  data?: any
  meta?: any
  links?: any
  _includes?: any[]
  [key: string]: any
}

/** The response of the last request made by a client. */
export interface LastResponse {
  status: number
  headers: Headers
  /** Deserialized response body. */
  data: any
  /** Raw response body text. */
  body: string
  url: string
  method: string
}
