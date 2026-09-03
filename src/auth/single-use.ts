import { AuthStrategy, RequestContext } from './strategy.js'
import {
  PrivateKeyOrSecretRequired,
  SingleUseTokenAlgorithmRequired,
  SingleUseTokenCompanyIdRequired,
  SingleUseTokenUserIdRequired,
} from '../errors.js'
import { base64Encode, sha256, signJwt } from '../jwt.js'

export interface SingleUseAuthOptions {
  singleUseToken: string
  singleUseTokenAlgorithm?: string
  singleUseTokenPrivateKey?: string
  singleUseTokenExpirationPeriod?: number
  singleUseTokenCompanyId?: string
  singleUseTokenUserId?: string
  apiEndpoint?: string
}

/**
 * Single-use JWT token authentication (request signing).
 *
 * Generates a unique JWT per request, binding it to the request method,
 * path, and body hash to prevent replay attacks. Mirrors
 * Booqable::Middleware::Auth::SingleUse.
 *
 * Supports HS256 (HMAC secret), RS256 (RSA), and ES256 (ECDSA) — RSA and
 * ECDSA keys must be PEM-encoded PKCS#8 (`-----BEGIN PRIVATE KEY-----`).
 *
 * @see https://developers.booqable.com/#authentication-request-signing
 */
export class SingleUseAuth implements AuthStrategy {
  /** Token kind identifier for the JWT header. */
  static KIND = 'single_use'

  /** Default domain for issuer URL construction. */
  static BOOQABLE_DOMAIN = 'booqable.com'

  private kid: string
  private alg: string
  private exp: number
  private aud: string
  private sub: string
  private privateKey: string
  private apiEndpoint?: string

  constructor(options: SingleUseAuthOptions) {
    this.kid = options.singleUseToken
    if (!options.singleUseTokenAlgorithm) throw new SingleUseTokenAlgorithmRequired()
    if (!options.singleUseTokenCompanyId) throw new SingleUseTokenCompanyIdRequired()
    if (!options.singleUseTokenUserId) throw new SingleUseTokenUserIdRequired()
    if (!options.singleUseTokenPrivateKey) throw new PrivateKeyOrSecretRequired()

    this.alg = options.singleUseTokenAlgorithm
    this.exp = options.singleUseTokenExpirationPeriod ?? 600
    this.aud = options.singleUseTokenCompanyId
    this.sub = options.singleUseTokenUserId
    this.privateKey = options.singleUseTokenPrivateKey
    this.apiEndpoint = options.apiEndpoint
  }

  async apply(request: RequestContext): Promise<void> {
    if (!request.headers['Authorization']) {
      request.headers['Authorization'] = `Bearer ${await this.generateToken(request)}`
    }
  }

  private async generateToken(request: RequestContext): Promise<string> {
    const now = Math.floor(Date.now() / 1000)

    const payload = {
      alg: this.alg,
      iat: now,
      exp: now + this.exp,
      aud: this.aud,
      sub: this.sub,
      iss: this.iss(),
      jti: `${crypto.randomUUID()}.${await this.generateData(request)}`,
    }

    return signJwt({ kid: this.kid, kind: SingleUseAuth.KIND }, payload, this.alg, this.privateKey)
  }

  /**
   * Hashes the HTTP method, full path (with query string), and body so
   * each token is bound to the specific request being made. Matches the
   * digest booqable.rb produces.
   */
  private async generateData(request: RequestContext): Promise<string> {
    const url = new URL(request.url)
    const fullpath = `${url.pathname}${url.search}`
    const method = request.method.toUpperCase()
    const encodedBody = request.body ? base64Encode(await sha256(request.body)) : ''

    return base64Encode(await sha256([method, fullpath, encodedBody].join('.')))
  }

  private iss(): string {
    return `https://${this.slug()}.${SingleUseAuth.BOOQABLE_DOMAIN}`
  }

  private slug(): string {
    return new URL(this.apiEndpoint || '').host.split('.')[0]
  }
}
