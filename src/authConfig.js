import { PublicClientApplication } from '@azure/msal-browser';

// MSAL configuration
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID || 'your-client-id-here',
    authority: import.meta.env.VITE_AUTHORITY || 'https://login.microsoftonline.com/your-tenant-id',
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin.replace(/\/$/, ''), // Remove trailing slash
  },
  cache: {
    cacheLocation: 'sessionStorage', // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  }
};

// Add here scopes for id token to be used at MS Identity Platform endpoints.
export const loginRequest = {
  scopes: [
    'api://22961fbc-e723-4a13-bd92-ddd83add0794/access_as_user',
    'openid', 
    'profile', 
    'email'
  ]
};

// Token request specifically for Flask API
export const flaskTokenRequest = {
  scopes: ['api://22961fbc-e723-4a13-bd92-ddd83add0794/access_as_user'],
  account: null // Will be set dynamically
};

// Debug logging to see what redirect URI is being used
console.log('MSAL Config:', {
  clientId: msalConfig.auth.clientId,
  authority: msalConfig.auth.authority,
  redirectUri: msalConfig.auth.redirectUri,
  currentOrigin: window.location.origin
});

// Create the MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
msalInstance.initialize().then(() => {
  console.log('MSAL initialized successfully');
}).catch((error) => {
  console.error('MSAL initialization failed:', error);
});
