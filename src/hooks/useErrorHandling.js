import { useState, useEffect } from 'react';

// Hook to track online/offline status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook for error logging
export function useErrorLogger() {
  const logError = (error, context = {}) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', error, context);
    }

    // Here you could send to an error reporting service like Sentry
    // Example:
    // Sentry.captureException(error, { extra: context });
    
    // Or send to your own logging endpoint
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.toString(),
          stack: error.stack,
          context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(() => {
        // Fail silently if error logging fails
      });
    } catch {
      // Fail silently
    }
  };

  return { logError };
}
