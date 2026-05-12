import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock window.matchMedia — jsdom does not provide it.
// Must be set up before the module is imported.
const mockMatchMediaResult = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(() => mockMatchMediaResult),
});

// Mock React hooks so the hook functions can be called outside a render context.
// - useState: calls the initializer and returns [value, setter] as a static snapshot
// - useEffect: no-op (side effects like event listeners and colorScheme are not under test here)
// - useMemo: identity — fn() — so computed values are evaluated synchronously
// - useCallback: identity — returns fn unchanged
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useState: <T,>(init: T | (() => T)) => {
      const value = typeof init === 'function' ? (init as () => T)() : init;
      return [value, vi.fn()] as [T, ReturnType<typeof vi.fn>];
    },
    useEffect: vi.fn(),
    useMemo: <T,>(fn: () => T) => fn(),
    useCallback: <T,>(fn: T) => fn,
  };
});

import { useMediaQuery, useThemeProvider } from '../useThemeProvider';
import { darkTheme, lightTheme } from '../../config/themes';

// ---------------------------------------------------------------------------
// useMediaQuery
// ---------------------------------------------------------------------------

describe('useMediaQuery', () => {
  it('returns true when window.matchMedia().matches is true', () => {
    mockMatchMediaResult.matches = true;
    expect(useMediaQuery('(prefers-color-scheme: dark)')).toBe(true);
  });

  it('returns false when window.matchMedia().matches is false', () => {
    mockMatchMediaResult.matches = false;
    expect(useMediaQuery('(prefers-color-scheme: dark)')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useThemeProvider — initialization from localStorage
// ---------------------------------------------------------------------------

describe('useThemeProvider – initialization', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMediaResult.matches = false;
  });

  it('defaults savedTheme to "System" when localStorage is empty', () => {
    const result = useThemeProvider();
    expect(result.savedTheme).toBe('System');
  });

  it('reads "Dark" from localStorage', () => {
    localStorage.setItem('ai-foundry-theme', 'Dark');
    const result = useThemeProvider();
    expect(result.savedTheme).toBe('Dark');
  });

  it('reads "Light" from localStorage', () => {
    localStorage.setItem('ai-foundry-theme', 'Light');
    const result = useThemeProvider();
    expect(result.savedTheme).toBe('Light');
  });

  it('reads "System" from localStorage', () => {
    localStorage.setItem('ai-foundry-theme', 'System');
    const result = useThemeProvider();
    expect(result.savedTheme).toBe('System');
  });

  it('falls back to "System" for an unrecognised localStorage value', () => {
    localStorage.setItem('ai-foundry-theme', 'invalid-value');
    const result = useThemeProvider();
    expect(result.savedTheme).toBe('System');
  });
});

// ---------------------------------------------------------------------------
// useThemeProvider — isDarkMode computation
// ---------------------------------------------------------------------------

describe('useThemeProvider – isDarkMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is true when savedTheme is "Dark" (regardless of system preference)', () => {
    localStorage.setItem('ai-foundry-theme', 'Dark');
    mockMatchMediaResult.matches = false;
    expect(useThemeProvider().isDarkMode).toBe(true);
  });

  it('is false when savedTheme is "Light" (regardless of system preference)', () => {
    localStorage.setItem('ai-foundry-theme', 'Light');
    mockMatchMediaResult.matches = true;
    expect(useThemeProvider().isDarkMode).toBe(false);
  });

  it('follows system preference (dark) when savedTheme is "System"', () => {
    localStorage.setItem('ai-foundry-theme', 'System');
    mockMatchMediaResult.matches = true;
    expect(useThemeProvider().isDarkMode).toBe(true);
  });

  it('follows system preference (light) when savedTheme is "System"', () => {
    localStorage.setItem('ai-foundry-theme', 'System');
    mockMatchMediaResult.matches = false;
    expect(useThemeProvider().isDarkMode).toBe(false);
  });

  it('defaults to system preference (light) when no localStorage entry', () => {
    mockMatchMediaResult.matches = false;
    expect(useThemeProvider().isDarkMode).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useThemeProvider — currentTheme
// ---------------------------------------------------------------------------

describe('useThemeProvider – currentTheme', () => {
  beforeEach(() => { localStorage.clear(); });

  it('is "Dark" when isDarkMode is true', () => {
    localStorage.setItem('ai-foundry-theme', 'Dark');
    expect(useThemeProvider().currentTheme).toBe('Dark');
  });

  it('is "Light" when isDarkMode is false', () => {
    localStorage.setItem('ai-foundry-theme', 'Light');
    expect(useThemeProvider().currentTheme).toBe('Light');
  });
});

// ---------------------------------------------------------------------------
// useThemeProvider — themeStyles
// ---------------------------------------------------------------------------

describe('useThemeProvider – themeStyles', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns darkTheme object when isDarkMode is true', () => {
    localStorage.setItem('ai-foundry-theme', 'Dark');
    expect(useThemeProvider().themeStyles).toBe(darkTheme);
  });

  it('returns lightTheme object when isDarkMode is false', () => {
    localStorage.setItem('ai-foundry-theme', 'Light');
    expect(useThemeProvider().themeStyles).toBe(lightTheme);
  });
});

// ---------------------------------------------------------------------------
// useThemeProvider — setTheme
// ---------------------------------------------------------------------------

describe('useThemeProvider – setTheme', () => {
  beforeEach(() => { localStorage.clear(); mockMatchMediaResult.matches = false; });

  it('persists "Dark" to localStorage when setTheme is called with "Dark"', () => {
    const { setTheme } = useThemeProvider();
    setTheme('Dark');
    expect(localStorage.getItem('ai-foundry-theme')).toBe('Dark');
  });

  it('persists "Light" to localStorage when setTheme is called with "Light"', () => {
    const { setTheme } = useThemeProvider();
    setTheme('Light');
    expect(localStorage.getItem('ai-foundry-theme')).toBe('Light');
  });

  it('persists "System" to localStorage when setTheme is called with "System"', () => {
    const { setTheme } = useThemeProvider();
    setTheme('System');
    expect(localStorage.getItem('ai-foundry-theme')).toBe('System');
  });

  it('overwrites a previous localStorage value', () => {
    localStorage.setItem('ai-foundry-theme', 'Light');
    const { setTheme } = useThemeProvider();
    setTheme('Dark');
    expect(localStorage.getItem('ai-foundry-theme')).toBe('Dark');
  });
});

// ---------------------------------------------------------------------------
// useThemeProvider — return shape
// ---------------------------------------------------------------------------

describe('useThemeProvider – return shape', () => {
  it('returns an object with all expected ThemeContextValue properties', () => {
    localStorage.clear();
    mockMatchMediaResult.matches = false;
    const result = useThemeProvider();
    expect(result).toHaveProperty('savedTheme');
    expect(result).toHaveProperty('currentTheme');
    expect(result).toHaveProperty('themeStyles');
    expect(result).toHaveProperty('setTheme');
    expect(result).toHaveProperty('isDarkMode');
    expect(typeof result.setTheme).toBe('function');
  });
});
