import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Mock useCallback to return the function directly so the hook can be tested without
// a React render context. useCallback(fn, []) is identity with respect to behavior.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useCallback: <T>(fn: T) => fn,
  };
});

import { useFormatTimestamp } from '../useFormatTimestamp';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('useFormatTimestamp', () => {
  // Pin "now" to a stable timestamp so time-based assertions are deterministic.
  // Using a real past date so Intl.DateTimeFormat can produce the expected format.
  const NOW = new Date('2024-03-15T14:30:00Z').getTime();

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  const format = useFormatTimestamp() as (date: Date | undefined) => string;

  describe('undefined / missing date', () => {
    it('returns empty string for undefined', () => {
      expect(format(undefined)).toBe('');
    });
  });

  describe('"just now" (< 1 minute ago)', () => {
    it('returns "just now" for exactly now', () => {
      expect(format(new Date(NOW))).toBe('just now');
    });

    it('returns "just now" for 30 seconds ago', () => {
      expect(format(new Date(NOW - 30_000))).toBe('just now');
    });

    it('returns "just now" for 59 seconds ago', () => {
      expect(format(new Date(NOW - 59_000))).toBe('just now');
    });
  });

  describe('"N minute(s) ago" (1–59 minutes)', () => {
    it('returns "1 minute ago" (singular) for exactly 1 minute ago', () => {
      expect(format(new Date(NOW - MINUTE))).toBe('1 minute ago');
    });

    it('returns "2 minutes ago" for 2 minutes ago', () => {
      expect(format(new Date(NOW - 2 * MINUTE))).toBe('2 minutes ago');
    });

    it('returns "30 minutes ago" for 30 minutes ago', () => {
      expect(format(new Date(NOW - 30 * MINUTE))).toBe('30 minutes ago');
    });

    it('returns "59 minutes ago" for 59 minutes ago', () => {
      expect(format(new Date(NOW - 59 * MINUTE))).toBe('59 minutes ago');
    });
  });

  describe('"N hour(s) ago" (1–23 hours)', () => {
    it('returns "1 hour ago" (singular) for exactly 1 hour ago', () => {
      expect(format(new Date(NOW - HOUR))).toBe('1 hour ago');
    });

    it('returns "2 hours ago" for 2 hours ago', () => {
      expect(format(new Date(NOW - 2 * HOUR))).toBe('2 hours ago');
    });

    it('returns "23 hours ago" for 23 hours ago', () => {
      expect(format(new Date(NOW - 23 * HOUR))).toBe('23 hours ago');
    });
  });

  describe('"N day(s) ago" (1–6 days)', () => {
    it('returns "1 day ago" (singular) for exactly 1 day ago', () => {
      expect(format(new Date(NOW - DAY))).toBe('1 day ago');
    });

    it('returns "2 days ago" for 2 days ago', () => {
      expect(format(new Date(NOW - 2 * DAY))).toBe('2 days ago');
    });

    it('returns "6 days ago" for 6 days ago', () => {
      expect(format(new Date(NOW - 6 * DAY))).toBe('6 days ago');
    });
  });

  describe('absolute date (>= 7 days ago)', () => {
    it('returns a formatted date string for 7 days ago', () => {
      const result = format(new Date(NOW - 7 * DAY));
      // Should not use relative format
      expect(result).not.toContain('ago');
      expect(result).not.toBe('just now');
      // Should be a non-empty string (Intl.DateTimeFormat output)
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns a formatted date string for 30 days ago', () => {
      const result = format(new Date(NOW - 30 * DAY));
      expect(result).not.toContain('ago');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns a formatted date string for 1 year ago', () => {
      const result = format(new Date(NOW - 365 * DAY));
      expect(result).not.toContain('ago');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
