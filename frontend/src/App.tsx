import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsalAuthentication } from "@azure/msal-react";
import { Spinner } from '@fluentui/react-components';
import { useAppState } from './hooks/useAppState';
import { InteractionType } from "@azure/msal-browser";
import { ErrorBoundary } from "./components/core/ErrorBoundary";
import { AgentChat } from "./components/AgentChat";
import { loginRequest } from "./config/authConfig";
import { useEffect, useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import { useAppContext } from "./contexts/AppContext";
import type { IAgentMetadata } from "./types/chat";
import "./App.css";

function App() {
  // This hook handles authentication automatically - redirects if not authenticated
  useMsalAuthentication(InteractionType.Redirect, loginRequest);
  const { auth, agents } = useAppState();
  const { dispatch } = useAppContext();
  const { getAccessToken } = useAuth();

  const fetchAgents = useCallback(async () => {
    if (auth.status !== 'authenticated') return;

    dispatch({ type: 'AGENTS_LOADING' });
    try {
      const token = await getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      
      const response = await fetch(`${apiUrl}/agents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: { agents: IAgentMetadata[]; defaultAgentId: string } = await response.json();
      dispatch({ type: 'AGENTS_SET_LIST', agents: data.agents });
      
      // Update document title with first agent name
      const current = data.agents.find(a => a.id === data.defaultAgentId) || data.agents[0];
      if (current) {
        document.title = current.name ? `${current.name} - Azure AI Agent` : 'Azure AI Agent';
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      // Fallback: single agent keeps UI functional on error
      const fallback: IAgentMetadata = {
        id: 'fallback-agent',
        object: 'agent',
        createdAt: Date.now() / 1000,
        name: 'Azure AI Agent',
        description: 'Your intelligent conversational partner powered by Azure AI',
        model: 'gpt-4o-mini',
        metadata: { logo: 'Avatar_Default.svg' }
      };
      dispatch({ type: 'AGENTS_SET_LIST', agents: [fallback] });
      document.title = 'Azure AI Agent';
    }
  }, [auth.status, getAccessToken, dispatch]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Update document title when agent selection changes
  useEffect(() => {
    if (agents.currentAgentId && agents.available.length > 0) {
      const current = agents.available.find(a => a.id === agents.currentAgentId);
      if (current?.name) {
        document.title = `${current.name} - Azure AI Agent`;
      }
    }
  }, [agents.currentAgentId, agents.available]);

  const currentAgent = agents.available.find(a => a.id === agents.currentAgentId);

  return (
    <ErrorBoundary>
      {auth.status === 'initializing' || agents.isLoading ? (
        <div className="app-container" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh', 
          flexDirection: 'column', 
          gap: '1rem' 
        }}>
          <Spinner size="large" />
          <p style={{ margin: 0 }}>
            {auth.status === 'initializing' ? 'Preparing your session...' : 'Loading agents...'}
          </p>
        </div>
      ) : (
        <>
          <AuthenticatedTemplate>
            {currentAgent && (
              <div className="app-container">
                <AgentChat 
                  agentId={currentAgent.id}
                  agentName={currentAgent.name}
                  agentDescription={currentAgent.description || undefined}
                  agentLogo={currentAgent.metadata?.logo}
                  starterPrompts={currentAgent.starterPrompts || undefined}
                />
              </div>
            )}
          </AuthenticatedTemplate>
          <UnauthenticatedTemplate>
            <div className="app-container" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100vh'
            }}>
              <p>Signing in...</p>
            </div>
          </UnauthenticatedTemplate>
        </>
      )}
    </ErrorBoundary>
  );
}

export default App;
