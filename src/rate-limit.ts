import { RateLimit } from './types';

export class RateLimitTracker {
  private _limit: number = 0;
  private _remaining: number = 0;
  private _period: number = 0;
  private _resetsAt: Date = new Date();

  /**
   * Update rate limit information from response headers
   */
  update(headers: Record<string, string>): void {
    const limit = headers['x-ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'];
    const period = headers['x-ratelimit-period'];

    if (limit) {
      this._limit = parseInt(limit, 10);
    }

    if (remaining) {
      this._remaining = parseInt(remaining, 10);
    }

    if (period) {
      this._period = parseInt(period, 10);
      this._resetsAt = new Date(Date.now() + this._period * 1000);
    }
  }

  /**
   * Get current rate limit information
   */
  get(): RateLimit {
    const now = Date.now();
    const resetsAtTime = this._resetsAt.getTime();
    const resetsIn = Math.max(0, Math.floor((resetsAtTime - now) / 1000));

    return {
      limit: this._limit,
      remaining: this._remaining,
      period: this._period,
      resetsAt: this._resetsAt,
      resetsIn,
    };
  }

  /**
   * Check if rate limit has been reached
   */
  isLimitReached(): boolean {
    return this._remaining === 0;
  }

  /**
   * Reset rate limit tracking
   */
  reset(): void {
    this._limit = 0;
    this._remaining = 0;
    this._period = 0;
    this._resetsAt = new Date();
  }
}
