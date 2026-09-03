/**
 * Rate limit information from API responses.
 *
 * Contains rate limiting information extracted from HTTP response headers.
 * This information is available when rate limit errors occur, or from
 * {@link BooqableClient.rateLimit} to monitor API usage.
 */
export class RateLimit {
  /** Max tries per rate limit period. */
  limit: number | null = null
  /** Remaining tries per rate limit period. */
  remaining: number | null = null
  /** Number of seconds until the rate limit resets. */
  resetsIn: number | null = null

  /**
   * Extract rate limit information from HTTP response headers.
   * Falls back to a value of 1 for missing headers, matching booqable.rb.
   */
  static fromHeaders(headers: Headers | Record<string, string> | undefined | null): RateLimit {
    const info = new RateLimit()
    if (!headers) return info

    const get = (name: string): string | null => {
      if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name)
      const record = headers as Record<string, string>
      const key = Object.keys(record).find((k) => k.toLowerCase() === name.toLowerCase())
      return key ? record[key] : null
    }

    info.limit = parseInt(get('X-RateLimit-Limit') || '1', 10)
    info.remaining = parseInt(get('X-RateLimit-Remaining') || '1', 10)
    info.resetsIn = parseInt(get('X-RateLimit-Period') || '1', 10)

    return info
  }
}
