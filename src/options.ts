import { ClientOptions } from './types.js'
import { CompanyRequired, UnsupportedAPIVersion } from './errors.js'
import { VERSION } from './version.js'

/** All valid (camelCase) configuration keys. */
export const OPTION_KEYS: (keyof ClientOptions)[] = [
  'apiDomain',
  'apiEndpoint',
  'apiKey',
  'apiVersion',
  'autoPaginate',
  'clientId',
  'clientSecret',
  'companyId',
  'debug',
  'defaultMediaType',
  'noRetries',
  'perPage',
  'readToken',
  'writeToken',
  'redirectUri',
  'aroundRefreshToken',
  'singleUseToken',
  'singleUseTokenAlgorithm',
  'singleUseTokenCompanyId',
  'singleUseTokenExpirationPeriod',
  'singleUseTokenPrivateKey',
  'singleUseTokenSecret',
  'singleUseTokenUserId',
  'userAgent',
  'strictAttributes',
]

/**
 * Accepted aliases for configuration options, mapping the alias to its
 * canonical key. Snake_case spellings of every option are also accepted
 * and camelized automatically.
 */
export const OPTION_ALIASES: Record<string, keyof ClientOptions> = {
  skipRetries: 'noRetries',
}

/** Default media type (JSON:API) for requests. */
export const MEDIA_TYPE = 'application/vnd.api+json'

/** Default User-Agent header string. */
export const USER_AGENT = `Booqable JavaScript Client ${VERSION}`

const env: Record<string, string | undefined> =
  typeof process !== 'undefined' && process.env ? process.env : {}

function envBoolean(value: string | undefined): boolean | undefined {
  if (value == null) return undefined
  return !['false', '0', ''].includes(value.toLowerCase())
}

/** Default configuration, with environment variable overrides (Node.js). */
export function defaultOptions(): ClientOptions {
  return {
    apiDomain: env.BOOQABLE_API_DOMAIN ?? 'booqable.com',
    apiEndpoint: env.BOOQABLE_API_ENDPOINT,
    apiKey: env.BOOQABLE_API_KEY,
    apiVersion: env.BOOQABLE_API_VERSION ?? 4,
    autoPaginate: envBoolean(env.BOOQABLE_AUTO_PAGINATE),
    clientId: env.BOOQABLE_CLIENT_ID,
    clientSecret: env.BOOQABLE_CLIENT_SECRET,
    companyId: env.BOOQABLE_COMPANY_ID,
    debug: false,
    defaultMediaType: env.BOOQABLE_DEFAULT_MEDIA_TYPE ?? MEDIA_TYPE,
    noRetries: false,
    perPage: env.BOOQABLE_PER_PAGE != null ? parseInt(env.BOOQABLE_PER_PAGE, 10) : 25,
    redirectUri: env.BOOQABLE_REDIRECT_URI,
    singleUseToken: env.BOOQABLE_SINGLE_USE_TOKEN,
    singleUseTokenAlgorithm: env.BOOQABLE_SINGLE_USE_TOKEN_ALGORITHM,
    singleUseTokenCompanyId: env.BOOQABLE_SINGLE_USE_TOKEN_COMPANY_ID,
    singleUseTokenExpirationPeriod: parseInt(env.BOOQABLE_SINGLE_USE_TOKEN_EXPIRATION_PERIOD ?? `${10 * 60}`, 10),
    singleUseTokenPrivateKey: env.BOOQABLE_SINGLE_USE_TOKEN_PRIVATE_KEY,
    singleUseTokenSecret: env.BOOQABLE_SINGLE_USE_TOKEN_SECRET,
    singleUseTokenUserId: env.BOOQABLE_SINGLE_USE_TOKEN_USER_ID,
    userAgent: env.BOOQABLE_USER_AGENT ?? USER_AGENT,
    strictAttributes: true,
  }
}

function camelize(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase())
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const distance = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0)
    row[0] = i
    return row
  })
  for (let j = 0; j < cols; j++) distance[0][j] = j

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      distance[i][j] = Math.min(distance[i - 1][j] + 1, distance[i][j - 1] + 1, distance[i - 1][j - 1] + cost)
    }
  }

  return distance[a.length][b.length]
}

function suggestionsFor(key: string): string[] {
  const dictionary = [...OPTION_KEYS, ...Object.keys(OPTION_ALIASES)] as string[]
  const threshold = Math.max(2, Math.floor(key.length / 4))
  return dictionary.filter((candidate) => levenshtein(key.toLowerCase(), candidate.toLowerCase()) <= threshold)
}

/**
 * Normalizes user-supplied options: camelizes snake_case keys, resolves
 * aliases, and validates that every key is a known configuration option
 * (suggesting similarly-named valid options when one is close enough).
 */
export function normalizeOptions(options: Record<string, any>): ClientOptions {
  const normalized: Record<string, any> = {}
  const unknownKeys: string[] = []

  for (const [rawKey, value] of Object.entries(options)) {
    let key = camelize(rawKey)
    key = (OPTION_ALIASES[key] as string) ?? key

    if ((OPTION_KEYS as string[]).includes(key)) {
      normalized[key] = value
    } else {
      unknownKeys.push(rawKey)
    }
  }

  if (unknownKeys.length > 0) {
    let message = `unknown configuration option(s): ${unknownKeys.join(', ')}`
    const suggestions = [...new Set(unknownKeys.flatMap((key) => suggestionsFor(camelize(key))))]
    if (suggestions.length > 0) message += `. Did you mean: ${suggestions.join(', ')}?`
    throw new Error(message)
  }

  return normalized as ClientOptions
}

function apiProtocol(options: ClientOptions): string {
  return options.apiDomain === 'booqable.com' ? 'https' : 'http'
}

/**
 * Constructs the complete API endpoint URL from the configured company,
 * domain, protocol, and API version.
 *
 * @throws {UnsupportedAPIVersion} when the API version is not supported
 * @throws {CompanyRequired} when no company is configured
 */
export function apiEndpointFor(options: ClientOptions): string {
  if (options.apiEndpoint) return options.apiEndpoint.replace(/\/$/, '')

  const version = String(options.apiVersion ?? 4)
  if (!['4', 'boomerang'].includes(version)) throw new UnsupportedAPIVersion()
  if (!options.companyId) throw new CompanyRequired()

  return `${apiProtocol(options)}://${options.companyId}.${options.apiDomain}/api/${version}`
}
