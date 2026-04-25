import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { tokenRequest } from "../config/authConfig";
import { useCallback, useMemo } from "react";
import type { AccountInfo } from "@azure/msal-browser";

/**
 * Authentication hook for MSAL-based authentication.
 * Provides token acquisition and authentication status.
 * 
 * @returns Object with getAccessToken function, authentication status, and user info
 * 
 * @example
 * ```tsx
 * function ProtectedComponent() {
 *   const { getAccessToken, isAuthenticated, user } = useAuth();
 *   
 *   useEffect(() => {
 *     const fetchData = async () => {
 *       const token = await getAccessToken();
 *       if (token) {
 *         // Make authenticated API call
 *       }
 *     };
 *     fetchData();
 *   }, [getAccessToken]);
 *   
 *   if (!isAuthenticated) return <div>Please sign in</div>;
 *   return <div>Welcome, {user?.name}</div>;
 * }
 * ```
 */
export function useAuth(): {
  getAccessToken: () => Promise<string | null>;
  isAuthenticated: boolean;
  user: AccountInfo | undefined;
} {
  const { instance, accounts } = useMsal();

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (accounts.length === 0) {
      return null;
    }

    const request = {
      ...tokenRequest,
      account: accounts[0],
    };

    try {
      // Try silent token acquisition first (uses cached token if valid)
      const response = await instance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Fallback to interactive login if silent fails
        console.warn("Silent token acquisition failed, prompting for interaction");
        try {
          const response = await instance.acquireTokenPopup(request);
          return response.accessToken;
        } catch (popupError) {
          console.error("Popup login failed:", popupError);
          return null;
        }
      }
      console.error("Token acquisition error:", error);
      return null;
    }
  }, [instance, accounts]);

  const isAuthenticated = useMemo(() => accounts.length > 0, [accounts]);
  const user = accounts[0];

  return useMemo(
    () => ({ getAccessToken, isAuthenticated, user }),
    [getAccessToken, isAuthenticated, user]
  );
}
