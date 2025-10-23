import { describe, it, expect } from 'vitest';
import {
  BooqableError,
  ClientError,
  ServerError,
  NotFound,
  Unauthorized,
  BadRequest,
  TooManyRequests,
  UnprocessableEntity,
  InvalidFilter,
  createError,
} from '../src/errors';
import { RateLimit } from '../src/types';

describe('BooqableError', () => {
  it('should create a basic error', () => {
    const error = new BooqableError('Test error', 400);
    expect(error.message).toBe('Test error');
    expect(error.responseStatus).toBe(400);
    expect(error.name).toBe('BooqableError');
  });

  it('should capture response details', () => {
    const headers = { 'content-type': 'application/json' };
    const body = { errors: [{ title: 'Error', detail: 'Details' }] };
    const error = new BooqableError('Test', 400, headers, body);

    expect(error.responseHeaders).toEqual(headers);
    expect(error.responseBody).toEqual(body);
    expect(error.errors).toEqual(body.errors);
  });

  it('should have a stack trace', () => {
    const error = new BooqableError('Test error');
    expect(error.stack).toBeDefined();
  });
});

describe('Error hierarchy', () => {
  it('should have correct inheritance for ClientError', () => {
    const error = new ClientError('Client error', 400);
    expect(error).toBeInstanceOf(BooqableError);
    expect(error).toBeInstanceOf(ClientError);
    expect(error.name).toBe('ClientError');
  });

  it('should have correct inheritance for ServerError', () => {
    const error = new ServerError('Server error', 500);
    expect(error).toBeInstanceOf(BooqableError);
    expect(error).toBeInstanceOf(ServerError);
    expect(error.name).toBe('ServerError');
  });

  it('should have correct inheritance for NotFound', () => {
    const error = new NotFound('Not found', 404);
    expect(error).toBeInstanceOf(BooqableError);
    expect(error).toBeInstanceOf(ClientError);
    expect(error).toBeInstanceOf(NotFound);
    expect(error.name).toBe('NotFound');
  });
});

describe('TooManyRequests', () => {
  it('should include rate limit context', () => {
    const rateLimit: RateLimit = {
      limit: 100,
      remaining: 0,
      period: 60,
      resetsAt: new Date(),
      resetsIn: 60,
    };

    const error = new TooManyRequests('Rate limited', 429, {}, {}, rateLimit);
    expect(error.context).toEqual(rateLimit);
    expect(error.context?.limit).toBe(100);
  });
});

describe('createError', () => {
  it('should create error based on status code', () => {
    const error = createError(404, {}, { errors: [{ detail: 'Not found' }] });
    expect(error).toBeInstanceOf(NotFound);
    expect(error.message).toBe('Not found');
  });

  it('should create error based on error code', () => {
    const body = {
      errors: [
        {
          code: 'invalid_filter',
          detail: 'Invalid filter',
        },
      ],
    };
    const error = createError(400, {}, body);
    expect(error).toBeInstanceOf(InvalidFilter);
    expect(error.message).toBe('Invalid filter');
  });

  it('should use title if detail is not present', () => {
    const body = {
      errors: [
        {
          title: 'Bad Request',
        },
      ],
    };
    const error = createError(400, {}, body);
    expect(error).toBeInstanceOf(BadRequest);
    expect(error.message).toBe('Bad Request');
  });

  it('should fall back to generic message', () => {
    const error = createError(418, {}, {});
    expect(error.message).toBe('HTTP 418 Error');
  });

  it('should create ServerError for 500 status', () => {
    const error = createError(500, {}, { errors: [{ detail: 'Server error' }] });
    expect(error).toBeInstanceOf(ServerError);
  });

  it('should create ClientError for unknown 4xx status', () => {
    const error = createError(418, {}, {});
    expect(error).toBeInstanceOf(ClientError);
  });

  it('should create TooManyRequests with context', () => {
    const rateLimit: RateLimit = {
      limit: 100,
      remaining: 0,
      period: 60,
      resetsAt: new Date(),
      resetsIn: 60,
    };
    const error = createError(
      429,
      {},
      { errors: [{ detail: 'Too many requests' }] },
      rateLimit
    );
    expect(error).toBeInstanceOf(TooManyRequests);
    expect((error as TooManyRequests).context).toEqual(rateLimit);
  });

  it('should create Unauthorized for 401', () => {
    const error = createError(401, {}, {});
    expect(error).toBeInstanceOf(Unauthorized);
  });

  it('should create UnprocessableEntity for 422', () => {
    const error = createError(422, {}, {});
    expect(error).toBeInstanceOf(UnprocessableEntity);
  });
});
