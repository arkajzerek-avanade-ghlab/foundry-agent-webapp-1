import { describe, it, expect, vi } from 'vitest';
import type { AppState } from '../../types/appState';

// Mock useMemo to invoke the factory immediately so the hook can be tested
// without a React render context. useMemo(() => v, []) is behaviorally identity.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useMemo: <T>(fn: () => T) => fn(),
  };
});

const mockDispatch = vi.fn();

vi.mock('../../contexts/AppContext', () => ({
  useAppContext: () => ({ state: mockState, dispatch: mockDispatch }),
}));

import { useAppState, useChatState, useUIState } from '../useAppState';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let mockState: AppState;

const baseState: AppState = {
  auth: { status: 'initializing', user: null, error: null },
  agents: { available: [], currentAgentId: null, isLoading: false },
  chat: {
    status: 'idle',
    messages: [],
    currentConversationId: null,
    error: null,
    streamingMessageId: undefined,
    recoveredInput: undefined,
    recoveredAttachments: undefined,
    editSnapshot: undefined,
    regenerateText: undefined,
    pendingMessages: [],
  },
  conversations: { list: [], isLoading: false, sidebarOpen: false, hasMore: false },
  ui: { chatInputEnabled: true },
};

function makeState(overrides: Partial<AppState>): AppState {
  return {
    ...baseState,
    auth: overrides.auth ?? baseState.auth,
    chat: overrides.chat ? { ...baseState.chat, ...overrides.chat } : baseState.chat,
    ui: overrides.ui ?? baseState.ui,
  };
}

// ---------------------------------------------------------------------------
// useAppState
// ---------------------------------------------------------------------------

describe('useAppState', () => {
  describe('isAuthenticated', () => {
    it('is true when auth.status is "authenticated"', () => {
      mockState = makeState({ auth: { status: 'authenticated', user: null, error: null } });
      expect(useAppState().isAuthenticated).toBe(true);
    });

    it('is false when auth.status is "unauthenticated"', () => {
      mockState = makeState({ auth: { status: 'unauthenticated', user: null, error: null } });
      expect(useAppState().isAuthenticated).toBe(false);
    });

    it('is false when auth.status is "initializing"', () => {
      mockState = makeState({ auth: { status: 'initializing', user: null, error: null } });
      expect(useAppState().isAuthenticated).toBe(false);
    });

    it('is false when auth.status is "error"', () => {
      mockState = makeState({ auth: { status: 'error', user: null, error: 'auth failed' } });
      expect(useAppState().isAuthenticated).toBe(false);
    });
  });

  describe('isChatBusy', () => {
    it('is true when chat.status is "sending"', () => {
      mockState = makeState({ chat: { status: 'sending' } });
      expect(useAppState().isChatBusy).toBe(true);
    });

    it('is true when chat.status is "streaming"', () => {
      mockState = makeState({ chat: { status: 'streaming' } });
      expect(useAppState().isChatBusy).toBe(true);
    });

    it('is false when chat.status is "idle"', () => {
      mockState = makeState({ chat: { status: 'idle' } });
      expect(useAppState().isChatBusy).toBe(false);
    });

    it('is false when chat.status is "error"', () => {
      mockState = makeState({ chat: { status: 'error' } });
      expect(useAppState().isChatBusy).toBe(false);
    });
  });

  describe('canSendMessage', () => {
    it('is true when chatInputEnabled and chat is idle', () => {
      mockState = makeState({ ui: { chatInputEnabled: true }, chat: { status: 'idle' } });
      expect(useAppState().canSendMessage).toBe(true);
    });

    it('is false when chatInputEnabled is false', () => {
      mockState = makeState({ ui: { chatInputEnabled: false }, chat: { status: 'idle' } });
      expect(useAppState().canSendMessage).toBe(false);
    });

    it('is false when chat.status is "sending" even if input is enabled', () => {
      mockState = makeState({ ui: { chatInputEnabled: true }, chat: { status: 'sending' } });
      expect(useAppState().canSendMessage).toBe(false);
    });

    it('is false when chat.status is "streaming" even if input is enabled', () => {
      mockState = makeState({ ui: { chatInputEnabled: true }, chat: { status: 'streaming' } });
      expect(useAppState().canSendMessage).toBe(false);
    });
  });

  describe('isStreaming', () => {
    it('is true only when chat.status is "streaming"', () => {
      mockState = makeState({ chat: { status: 'streaming' } });
      expect(useAppState().isStreaming).toBe(true);
    });

    it('is false when chat.status is "idle"', () => {
      mockState = makeState({ chat: { status: 'idle' } });
      expect(useAppState().isStreaming).toBe(false);
    });

    it('is false when chat.status is "sending"', () => {
      mockState = makeState({ chat: { status: 'sending' } });
      expect(useAppState().isStreaming).toBe(false);
    });
  });

  describe('returned shape', () => {
    it('exposes state, dispatch, auth, agents, chat, ui', () => {
      mockState = makeState({});
      const result = useAppState();
      expect(result.state).toBe(mockState);
      expect(result.dispatch).toBe(mockDispatch);
      expect(result.auth).toBe(mockState.auth);
      expect(result.agents).toBe(mockState.agents);
      expect(result.chat).toBe(mockState.chat);
      expect(result.ui).toBe(mockState.ui);
    });
  });
});

// ---------------------------------------------------------------------------
// useChatState
// ---------------------------------------------------------------------------

describe('useChatState', () => {
  it('returns chat slice and dispatch', () => {
    mockState = makeState({ chat: { status: 'streaming' } });
    const result = useChatState();
    expect(result.chat).toBe(mockState.chat);
    expect(result.dispatch).toBe(mockDispatch);
  });
});

// ---------------------------------------------------------------------------
// useUIState
// ---------------------------------------------------------------------------

describe('useUIState', () => {
  it('returns ui slice and dispatch', () => {
    mockState = makeState({ ui: { chatInputEnabled: false } });
    const result = useUIState();
    expect(result.ui).toBe(mockState.ui);
    expect(result.dispatch).toBe(mockDispatch);
  });
});
