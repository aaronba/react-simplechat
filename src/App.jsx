import { useState } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './authConfig';
import { AuthProvider } from './providers/AuthProvider';
import { ConversationsProvider } from './providers/ConversationsProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { NetworkErrorBanner } from './components/ErrorComponents';
import { useNetworkStatus } from './hooks/useErrorHandling';
import ProtectedRoute from './components/ProtectedRoute';
import AppRoutes from './routes';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const isOnline = useNetworkStatus();
  
  return (
    <ErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <AuthProvider>
          <div className="h-screen w-screen flex flex-col">
            <NetworkErrorBanner isOnline={isOnline} />
            <ProtectedRoute>
              <ConversationsProvider>
                <AppRoutes darkMode={darkMode} setDarkMode={setDarkMode} />
              </ConversationsProvider>
            </ProtectedRoute>
          </div>
        </AuthProvider>
      </MsalProvider>
    </ErrorBoundary>
  );
}
