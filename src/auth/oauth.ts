import { AuthStrategy, RequestContext } from './strategy.js'
import { OAuthClient } from '../oauth-client.js'
import { AroundRefreshToken, ReadToken, TokenHash, WriteToken } from '../types.js'

export interface OAuthAuthOptions {
  clientId: string
  clientSecret: string
  apiEndpoint: string
  redirectUri?: string
  readToken?: ReadToken
  writeToken?: WriteToken
  aroundRefreshToken?: AroundRefreshToken
}

/**
 * OAuth2 authentication.
 *
 * Reads the stored access token, refreshes it when it is expired or about
 * to expire, and adds it as a Bearer token. Mirrors
 * Booqable::Middleware::Auth::OAuth.
 */
export class OAuthAuth implements AuthStrategy {
  /**
   * Refresh the token this many seconds before it actually expires. A
   * request sent in the last moment of a token's life can still be
   * rejected once network latency or clock skew pushes it past the
   * expiry boundary server-side.
   */
  static REFRESH_BUFFER_SECONDS = 60

  readonly client: OAuthClient
  private options: OAuthAuthOptions

  constructor(options: OAuthAuthOptions) {
    this.options = options
    this.client = new OAuthClient({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      apiEndpoint: options.apiEndpoint,
      redirectUri: options.redirectUri,
    })
  }

  async apply(request: RequestContext): Promise<void> {
    let token: TokenHash = {}

    const refreshSequence = async () => {
      token = OAuthClient.normalizeToken((await this.options.readToken?.()) || {})

      if (this.expiresSoon(token)) {
        token = await this.refreshToken(token)
      }
    }

    // When the host application provides an around-callback (e.g. an
    // advisory lock), the read+check+refresh sequence runs inside it so
    // concurrent callers cannot interleave a read with another caller's
    // refresh.
    if (this.options.aroundRefreshToken) {
      await this.options.aroundRefreshToken(refreshSequence)
    } else {
      await refreshSequence()
    }

    if (!request.headers['Authorization']) {
      request.headers['Authorization'] = `Bearer ${token.access_token ?? ''}`
    }
  }

  /** Whether the token expires within the buffer, or has no usable expiry. */
  private expiresSoon(token: TokenHash): boolean {
    if (token.expires_at == null) return true
    return Math.floor(Date.now() / 1000) >= Number(token.expires_at) - OAuthAuth.REFRESH_BUFFER_SECONDS
  }

  /**
   * Refreshes the expired token and persists the new one via writeToken.
   * A refresh failure always throws: the caller must never carry on with
   * a stale or missing token.
   */
  private async refreshToken(token: TokenHash): Promise<TokenHash> {
    const newToken = await this.client.refreshToken(token)
    await this.options.writeToken?.(newToken)
    return newToken
  }
}
