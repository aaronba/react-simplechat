import { msalInstance } from './authConfig.js';

// Test authentication with Flask backend
export const testFlaskAuth = async () => {
  const token = localStorage.getItem('msal_token');
  if (!token) {
    console.error('No MSAL token found');
    return;
  }

  console.log('Testing Flask authentication...');
  console.log('Token length:', token.length);
  console.log('Token preview:', token.substring(0, 100) + '...');
  
  // Decode the JWT token to see its contents (just the header and payload, not verifying signature)
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      console.log('Token header:', header);
      console.log('Token payload (aud, iss, sub):', {
        audience: payload.aud,
        issuer: payload.iss,
        subject: payload.sub,
        scopes: payload.scp,
        expires: new Date(payload.exp * 1000)
      });
    }
  } catch (e) {
    console.log('Could not decode token:', e);
  }
  
  try {
    // Test the /getASession endpoint
    const response = await fetch('https://ettsc-dev-app.azurewebsites.net/getASession', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': window.location.origin,
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response body:', text);

    if (!response.ok) {
      console.error('Authentication failed');
    } else {
      console.log('Authentication successful!');
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Test with a token specifically for the Flask app
export const testFlaskAuthWithAppToken = async () => {
  try {
    console.log('Attempting to get token specifically for Flask backend...');
    
    // Get the account
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      console.error('No accounts found');
      return;
    }
    
    // Request token with Flask app's client ID as scope
    const tokenRequest = {
      scopes: ['22961fbc-e723-4a13-bd92-ddd83add0794/.default'], // Flask app's client ID
      account: accounts[0],
    };
    
    const response = await msalInstance.acquireTokenSilent(tokenRequest);
    console.log('Got Flask-specific token:', response.accessToken ? 'Yes' : 'No');
    console.log('Token length:', response.accessToken.length);
    
    // Decode this token to see what audience it has
    try {
      const parts = response.accessToken.split('.');
      if (parts.length === 3) {
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        console.log('Flask token header:', header);
        console.log('Flask token payload (aud, iss, sub):', {
          audience: payload.aud,
          issuer: payload.iss,
          subject: payload.sub,
          scopes: payload.scp,
          appId: payload.appid,
          expires: new Date(payload.exp * 1000)
        });
      }
    } catch (e) {
      console.log('Could not decode Flask token:', e);
    }
    
    // Now test with this token
    const testResponse = await fetch('https://ettsc-dev-app.azurewebsites.net/getASession', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${response.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Flask test response status:', testResponse.status);
    const text = await testResponse.text();
    console.log('Flask test response body:', text);
    
    // If we got the token, let's also store it for use in the app
    if (response.accessToken) {
      console.log('Storing Flask-specific token for app use...');
      localStorage.setItem('msal_token', response.accessToken);
      console.log('Token stored. You can now try using the app with this token.');
    }
    
  } catch (error) {
    console.error('Failed to get Flask-specific token:', error);
  }
};

// Simple function to decode any JWT token
export const decodeToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      console.log('Token header:', header);
      console.log('Token payload:', payload);
      return { header, payload };
    }
  } catch (e) {
    console.error('Could not decode token:', e);
  }
  return null;
};

// Add this to window for manual testing
if (typeof window !== 'undefined') {
  window.testFlaskAuth = testFlaskAuth;
  window.testFlaskAuthWithAppToken = testFlaskAuthWithAppToken;
  window.decodeToken = decodeToken;
}
