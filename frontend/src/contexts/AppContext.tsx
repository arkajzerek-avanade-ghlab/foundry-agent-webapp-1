import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import type { ReactNode, Dispatch } from 'react';
import { useMsal } from '@azure/msal-react';
import type { AppState, AppAction } from '../types/appState';
import { initialAppState } from '../types/appState';
import { appReducer } from '../reducers/appReducer';

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Lightweight dev logger prevents accidental prod noise
const devLogger = {
  enabled: import.meta.env.DEV,
  group(label: string) { if (this.enabled) console.group(label); },
  log(...args: unknown[]) { if (this.enabled) console.log(...args); },
  end() { if (this.enabled) console.groupEnd(); }
};

type StatePath = { key: string; get: (s: AppState) => unknown };

const STATE_PATHS: StatePath[] = [
  { key: 'auth.status', get: s => s.auth.status },
  { key: 'chat.status', get: s => s.chat.status },
  { key: 'chat.messages.length', get: s => s.chat.messages.length },
  { key: 'chat.streamingMessageId', get: s => s.chat.streamingMessageId },
  { key: 'ui.chatInputEnabled', get: s => s.ui.chatInputEnabled },
  { key: 'conversations.sidebarOpen', get: s => s.conversations.sidebarOpen },
  { key: 'conversations.list.length', get: s => s.conversations.list.length },
];

// Dev mode logging middleware (diff-based)
function logStateChange(action: AppAction, prevState: AppState, nextState: AppState): void {
  if (!devLogger.enabled) return;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  devLogger.group(`🔄 [${timestamp}] ${action.type}`);
  devLogger.log('Action:', action);
  const changes: Record<string, unknown> = {};

  for (const { key, get } of STATE_PATHS) {
    const prev = get(prevState);
    const next = get(nextState);
    if (prev !== next) {
      changes[key] = `${prev} → ${next}`;
    }
  }

  if (Object.keys(changes).length) {
    devLogger.log('Changes:', changes);
  } else {
    devLogger.log('(No state changes)');
  }
  devLogger.end();
}

/**
 * Enhanced reducer with logging middleware
 */
function reducerWithLogging(state: AppState, action: AppAction): AppState {
  const nextState = appReducer(state, action);
  logStateChange(action, state, nextState);
  return nextState;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(reducerWithLogging, initialAppState);
  const { accounts } = useMsal();

  // Initialize auth state from MSAL
  useEffect(() => {
    if (accounts.length > 0) {
      dispatch({ type: 'AUTH_INITIALIZED', user: accounts[0] });
    }
  }, [accounts]);

  // Dev mode: Log when provider mounts and unmounts
  useEffect(() => {
    devLogger.log('🚀 AppProvider initialized');
    return () => {
      devLogger.log('🔌 AppProvider unmounted');
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to access app state and dispatch
 * Throws error if used outside AppProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
