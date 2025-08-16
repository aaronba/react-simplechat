import { createContext, useContext, useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const { instance, accounts, inProgress } = useMsal();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication status on mount and when accounts change
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (inProgress !== 'none') {
        return; // Wait for MSAL to finish processing
      }

      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        setUser({
          username: account.username,
          name: account.name,
          email: account.username
        });

        try {
          // Get access token silently
          const response = await instance.acquireTokenSilent({
            ...loginRequest,
            account: account,
          });
          setToken(response.accessToken);
          
          // Store token for API calls
          localStorage.setItem('msal_token', response.accessToken);
        } catch (err) {
          console.error('Silent token acquisition failed:', err);
          setError('Failed to acquire access token');
        }
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('msal_token');
      }
      
      setLoading(false);
    };

    checkAuthStatus();
  }, [accounts, instance, inProgress]);

  const login = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await instance.loginPopup(loginRequest);
      return { success: true };
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('msal_token');
    
    try {
      await instance.logoutPopup();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const value = {
    user,
    token,
    loading: loading || inProgress !== 'none',
    error,
    login,
    logout,
    isAuthenticated: !!user && !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
