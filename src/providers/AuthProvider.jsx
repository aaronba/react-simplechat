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

  // Handle redirect response on mount
  useEffect(() => {
    const handleRedirectResponse = async () => {
      try {
        const response = await instance.handleRedirectPromise();
        if (response) {
          console.log('Redirect response received:', response);
        }
      } catch (err) {
        console.error('Error handling redirect response:', err);
        setError(err.message);
      }
    };

    handleRedirectResponse();
  }, [instance]);

  // Check authentication status on mount and when accounts change
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('Checking auth status, inProgress:', inProgress, 'accounts:', accounts?.length);
      
      if (inProgress !== 'none') {
        return; // Wait for MSAL to finish processing
      }

      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        console.log('Found account:', account.username);
        
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
          
          console.log('Got access token:', response.accessToken ? 'Yes' : 'No');
          setToken(response.accessToken);
          
          // Store token for API calls
          localStorage.setItem('msal_token', response.accessToken);
        } catch (err) {
          console.error('Silent token acquisition failed:', err);
          setError('Failed to acquire access token');
        }
      } else {
        console.log('No accounts found');
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
      await instance.loginRedirect(loginRequest);
      // The page will redirect, so we don't need to return anything
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message);
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
