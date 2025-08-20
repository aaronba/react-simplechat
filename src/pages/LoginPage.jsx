import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { LoadingSpinner, ErrorMessage } from '../components/ErrorComponents';

export default function LoginPage() {
  const { instance } = useMsal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use redirect instead of popup to avoid CORS issues with non-SPA app registrations
      await instance.loginRedirect(loginRequest);
      // The page will redirect to Microsoft and then back
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-4 bg-gray-900 text-white">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-medium">Simple Chat</h1>
          <nav className="flex space-x-6">
            <a href="#" className="text-gray-300 hover:text-white">Home</a>
          </nav>
        </div>
        <button 
          onClick={handleMicrosoftLogin}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl mx-auto text-white">
          <h2 className="text-4xl font-light mb-8">Welcome to Simple Chat</h2>
          
          <div className="mb-8 text-gray-300 space-y-4">
            <p className="text-lg">
              You can add text here and it supports Markdown. You agree to our{' '}
              <a href="#" className="text-blue-400 underline hover:text-blue-300">
                acceptable user policy
              </a>{' '}
              by using this service.
            </p>
          </div>

          <div className="mb-8">
            <p className="text-lg text-gray-300 mb-6">
              Please{' '}
              <button 
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="text-blue-400 underline hover:text-blue-300 disabled:opacity-50"
              >
                sign in
              </button>{' '}
              to continue.
            </p>

            {/* Microsoft Sign In Button */}
            <button
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <LoadingSpinner message="" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 23 23" fill="none">
                    <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                    <rect x="12" y="1" width="10" height="10" fill="#00a4ef"/>
                    <rect x="1" y="12" width="10" height="10" fill="#ffb900"/>
                    <rect x="12" y="12" width="10" height="10" fill="#7fba00"/>
                  </svg>
                  Sign in with Microsoft
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="max-w-md mx-auto">
              <ErrorMessage error={error} onRetry={handleMicrosoftLogin} />
            </div>
          )}

          <div className="text-sm text-gray-400">
            <p>
              This application uses Microsoft Entra ID for secure authentication.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
