import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimitTracker } from '../src/rate-limit';

describe('RateLimitTracker', () => {
  let tracker: RateLimitTracker;

  beforeEach(() => {
    tracker = new RateLimitTracker();
  });

  describe('update', () => {
    it('should update rate limit from headers', () => {
      const headers = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-period': '60',
      };

      tracker.update(headers);
      const rateLimit = tracker.get();

      expect(rateLimit.limit).toBe(100);
      expect(rateLimit.remaining).toBe(95);
      expect(rateLimit.period).toBe(60);
    });

    it('should calculate resets at time', () => {
      const beforeUpdate = Date.now();
      const headers = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-period': '60',
      };

      tracker.update(headers);
      const rateLimit = tracker.get();
      const afterUpdate = Date.now();

      const expectedResetTime = beforeUpdate + 60000;
      const actualResetTime = rateLimit.resetsAt.getTime();

      // Allow small time difference for test execution
      expect(actualResetTime).toBeGreaterThanOrEqual(expectedResetTime);
      expect(actualResetTime).toBeLessThanOrEqual(afterUpdate + 60000);
    });

    it('should calculate resets in seconds', () => {
      const headers = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-period': '60',
      };

      tracker.update(headers);
      const rateLimit = tracker.get();

      expect(rateLimit.resetsIn).toBeGreaterThan(0);
      expect(rateLimit.resetsIn).toBeLessThanOrEqual(60);
    });

    it('should handle missing headers gracefully', () => {
      tracker.update({});
      const rateLimit = tracker.get();

      expect(rateLimit.limit).toBe(0);
      expect(rateLimit.remaining).toBe(0);
      expect(rateLimit.period).toBe(0);
    });

    it('should handle partial headers', () => {
      tracker.update({ 'x-ratelimit-limit': '100' });
      const rateLimit = tracker.get();

      expect(rateLimit.limit).toBe(100);
      expect(rateLimit.remaining).toBe(0);
      expect(rateLimit.period).toBe(0);
    });
  });

  describe('get', () => {
    it('should return default values initially', () => {
      const rateLimit = tracker.get();

      expect(rateLimit.limit).toBe(0);
      expect(rateLimit.remaining).toBe(0);
      expect(rateLimit.period).toBe(0);
      expect(rateLimit.resetsAt).toBeInstanceOf(Date);
      expect(rateLimit.resetsIn).toBeGreaterThanOrEqual(0);
    });

    it('should return updated values after update', () => {
      tracker.update({
        'x-ratelimit-limit': '50',
        'x-ratelimit-remaining': '25',
        'x-ratelimit-period': '30',
      });

      const rateLimit = tracker.get();

      expect(rateLimit.limit).toBe(50);
      expect(rateLimit.remaining).toBe(25);
      expect(rateLimit.period).toBe(30);
    });

    it('should return 0 for resetsIn when reset time has passed', () => {
      // Set a reset time in the past
      tracker.update({
        'x-ratelimit-period': '-1',
      });

      // Wait a bit
      const rateLimit = tracker.get();

      expect(rateLimit.resetsIn).toBe(0);
    });
  });

  describe('isLimitReached', () => {
    it('should return false when remaining is greater than 0', () => {
      tracker.update({
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
      });

      expect(tracker.isLimitReached()).toBe(false);
    });

    it('should return true when remaining is 0', () => {
      tracker.update({
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '0',
      });

      expect(tracker.isLimitReached()).toBe(true);
    });

    it('should return true initially (default remaining is 0)', () => {
      expect(tracker.isLimitReached()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all values to defaults', () => {
      tracker.update({
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-period': '60',
      });

      tracker.reset();
      const rateLimit = tracker.get();

      expect(rateLimit.limit).toBe(0);
      expect(rateLimit.remaining).toBe(0);
      expect(rateLimit.period).toBe(0);
      expect(rateLimit.resetsIn).toBeGreaterThanOrEqual(0);
    });
  });

  describe('multiple updates', () => {
    it('should handle multiple updates correctly', () => {
      tracker.update({
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-period': '60',
      });

      let rateLimit = tracker.get();
      expect(rateLimit.remaining).toBe(95);

      tracker.update({
        'x-ratelimit-remaining': '94',
      });

      rateLimit = tracker.get();
      expect(rateLimit.remaining).toBe(94);
      expect(rateLimit.limit).toBe(100); // Should retain previous value
    });
  });
});
