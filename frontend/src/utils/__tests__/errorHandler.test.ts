import { describe, it, expect, vi } from 'vitest';
import {
  getUserFriendlyMessage,
  createAppError,
  getErrorCodeFromResponse,
  parseErrorFromResponse,
  getErrorCodeFromMessage,
  isTokenExpiredError,
  isNetworkError,
  retryWithBackoff,
} from '../errorHandler';
import type { ErrorCode } from '../../types/errors';

// Helper to build a minimal mock Response
function mockResponse(
  status: number,
  body: unknown = null,
  ok?: boolean,
): Response {
  const resolvedOk = ok ?? (status >= 200 && status < 300);
  return {
    status,
    ok: resolvedOk,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('getUserFriendlyMessage', () => {
  const codes: ErrorCode[] = ['NETWORK', 'AUTH', 'STREAM', 'SERVER', 'API', 'UNKNOWN'];

  it.each(codes)('returns a non-empty string for %s', (code) => {
    const msg = getUserFriendlyMessage(code);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('includes hint when includeHint is true (default)', () => {
    // NETWORK description + hint should both be present
    const withHint = getUserFriendlyMessage('NETWORK', true);
    const withoutHint = getUserFriendlyMessage('NETWORK', false);
    expect(withHint.length).toBeGreaterThan(withoutHint.length);
  });

  it('omits hint when includeHint is false', () => {
    const msg = getUserFriendlyMessage('NETWORK', false);
    expect(msg).toBe('Unable to reach the server.');
  });
});

describe('createAppError', () => {
  it('uses provided code and sets recoverable flag correctly', () => {
    const err = createAppError(new Error('net fail'), 'NETWORK');
    expect(err.code).toBe('NETWORK');
    expect(err.recoverable).toBe(true);
  });

  it('AUTH errors are not recoverable', () => {
    const err = createAppError(new Error('401'), 'AUTH');
    expect(err.recoverable).toBe(false);
  });

  it('UNKNOWN errors are not recoverable', () => {
    const err = createAppError('oops', 'UNKNOWN');
    expect(err.recoverable).toBe(false);
  });

  it('defaults to UNKNOWN code when not provided', () => {
    const err = createAppError(new Error('mystery'));
    expect(err.code).toBe('UNKNOWN');
  });

  it('stores original Error object', () => {
    const original = new Error('raw');
    const err = createAppError(original, 'SERVER');
    expect(err.originalError).toBe(original);
  });

  it('originalError is undefined for non-Error input', () => {
    const err = createAppError('string error', 'SERVER');
    expect(err.originalError).toBeUndefined();
  });

  it('adds retry action for recoverable errors when retryHandler provided', () => {
    const retryFn = vi.fn();
    const err = createAppError(new Error('net'), 'NETWORK', retryFn);
    expect(err.action?.label).toBe('Retry');
    err.action?.handler();
    expect(retryFn).toHaveBeenCalledOnce();
  });

  it('no action added for non-recoverable errors even with retryHandler', () => {
    const retryFn = vi.fn();
    const err = createAppError(new Error('auth'), 'AUTH', retryFn);
    expect(err.action).toBeUndefined();
  });
});

describe('getErrorCodeFromResponse', () => {
  it('returns AUTH for 401', () => {
    expect(getErrorCodeFromResponse(mockResponse(401, null, false))).toBe('AUTH');
  });

  it('returns AUTH for 403', () => {
    expect(getErrorCodeFromResponse(mockResponse(403, null, false))).toBe('AUTH');
  });

  it('returns SERVER for 5xx responses', () => {
    expect(getErrorCodeFromResponse(mockResponse(500, null, false))).toBe('SERVER');
    expect(getErrorCodeFromResponse(mockResponse(503, null, false))).toBe('SERVER');
  });

  it('returns SERVER for 4xx non-auth responses', () => {
    expect(getErrorCodeFromResponse(mockResponse(400, null, false))).toBe('SERVER');
    expect(getErrorCodeFromResponse(mockResponse(422, null, false))).toBe('SERVER');
  });

  it('returns NETWORK for non-ok responses outside 4xx/5xx range', () => {
    // ok=false, status < 400
    expect(getErrorCodeFromResponse(mockResponse(302, null, false))).toBe('NETWORK');
  });

  it('returns UNKNOWN for ok responses', () => {
    expect(getErrorCodeFromResponse(mockResponse(200, null, true))).toBe('UNKNOWN');
  });
});

describe('parseErrorFromResponse', () => {
  it('prefers detail from RFC 7807 Problem Details', async () => {
    const res = mockResponse(400, { title: 'Bad Request', detail: 'Specific detail here' }, false);
    const msg = await parseErrorFromResponse(res);
    expect(msg).toBe('Specific detail here');
  });

  it('falls back to title when detail is missing', async () => {
    const res = mockResponse(400, { title: 'Bad Request' }, false);
    const msg = await parseErrorFromResponse(res);
    expect(msg).toBe('Bad Request');
  });

  it('extracts string error field', async () => {
    const res = mockResponse(500, { error: 'Something broke' }, false);
    const msg = await parseErrorFromResponse(res);
    expect(msg).toBe('Something broke');
  });

  it('extracts message field', async () => {
    const res = mockResponse(500, { message: 'Service unavailable' }, false);
    const msg = await parseErrorFromResponse(res);
    expect(msg).toBe('Service unavailable');
  });

  it('extracts nested error.message', async () => {
    const res = mockResponse(500, { error: { message: 'Inner message' } }, false);
    const msg = await parseErrorFromResponse(res);
    expect(msg).toBe('Inner message');
  });

  it('falls back to user-friendly message when JSON parsing fails', async () => {
    const res = {
      status: 500,
      ok: false,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response;
    const msg = await parseErrorFromResponse(res);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('falls back to user-friendly message when body has no known error fields', async () => {
    const res = mockResponse(500, { random: 'data' }, false);
    const msg = await parseErrorFromResponse(res);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe('getErrorCodeFromMessage', () => {
  it('returns AUTH for messages containing "token"', () => {
    expect(getErrorCodeFromMessage(new Error('token expired'))).toBe('AUTH');
  });

  it('returns AUTH for messages containing "auth"', () => {
    expect(getErrorCodeFromMessage(new Error('auth failed'))).toBe('AUTH');
  });

  it('returns AUTH for messages containing "unauthorized"', () => {
    expect(getErrorCodeFromMessage(new Error('unauthorized access'))).toBe('AUTH');
  });

  it('returns NETWORK for messages containing "network"', () => {
    expect(getErrorCodeFromMessage(new Error('network error'))).toBe('NETWORK');
  });

  it('returns NETWORK for messages containing "fetch"', () => {
    expect(getErrorCodeFromMessage(new Error('Failed to fetch'))).toBe('NETWORK');
  });

  it('returns NETWORK for messages containing "connection"', () => {
    expect(getErrorCodeFromMessage(new Error('connection refused'))).toBe('NETWORK');
  });

  it('returns STREAM for messages containing "stream"', () => {
    expect(getErrorCodeFromMessage(new Error('stream disconnected'))).toBe('STREAM');
  });

  it('returns UNKNOWN for unrecognized messages', () => {
    expect(getErrorCodeFromMessage(new Error('something random'))).toBe('UNKNOWN');
  });

  it('handles non-Error input (string)', () => {
    expect(getErrorCodeFromMessage('token missing')).toBe('AUTH');
  });

  it('handles non-Error input (object)', () => {
    expect(getErrorCodeFromMessage({ message: 'nope' })).toBe('UNKNOWN');
  });
});

describe('isTokenExpiredError', () => {
  it('returns true for "token expired"', () => {
    expect(isTokenExpiredError(new Error('token expired'))).toBe(true);
  });

  it('returns true for "token invalid"', () => {
    expect(isTokenExpiredError(new Error('token invalid'))).toBe(true);
  });

  it('returns false for token message without expired/invalid', () => {
    expect(isTokenExpiredError(new Error('token refreshed'))).toBe(false);
  });

  it('returns false for non-token error', () => {
    expect(isTokenExpiredError(new Error('network error'))).toBe(false);
  });

  it('handles string input', () => {
    expect(isTokenExpiredError('token expired')).toBe(true);
    expect(isTokenExpiredError('unrelated error')).toBe(false);
  });
});

describe('isNetworkError', () => {
  it('returns true for TypeError with "Failed to fetch"', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('returns true for messages containing "network"', () => {
    expect(isNetworkError(new Error('network timeout'))).toBe(true);
  });

  it('returns true for messages containing "connection"', () => {
    expect(isNetworkError(new Error('connection refused'))).toBe(true);
  });

  it('returns true for messages containing "fetch"', () => {
    expect(isNetworkError(new Error('fetch failed'))).toBe(true);
  });

  it('returns false for auth errors', () => {
    expect(isNetworkError(new Error('auth error'))).toBe(false);
  });

  it('returns false for arbitrary string', () => {
    expect(isNetworkError('something else')).toBe(false);
  });
});

describe('retryWithBackoff', () => {
  it('returns result immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, 3, 0);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('retries on network error and succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('success');
    const result = await retryWithBackoff(fn, 3, 0);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws immediately for non-network errors (no retry)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('auth error'));
    await expect(retryWithBackoff(fn, 3, 0)).rejects.toThrow('auth error');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(retryWithBackoff(fn, 2, 0)).rejects.toThrow('Failed to fetch');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
