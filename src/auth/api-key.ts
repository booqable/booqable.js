import { AuthStrategy, RequestContext } from './strategy.js'

/**
 * API key authentication.
 *
 * Adds the API key as a Bearer token in the Authorization header if no
 * authorization header is already present.
 *
 * @see https://developers.booqable.com/#authentication-access-token
 */
export class ApiKeyAuth implements AuthStrategy {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async apply(request: RequestContext): Promise<void> {
    if (!request.headers['Authorization']) {
      request.headers['Authorization'] = `Bearer ${this.apiKey}`
    }
  }
}
