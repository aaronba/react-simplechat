// Flask-based authentication flow for deployed backend
import { msalInstance, flaskTokenRequest } from './authConfig';
import { createConversation, getConversations, getMessages, sendMessage } from './api.js';

const API_BASE_URL = 'https://ettsc-dev-app.azurewebsites.net';

export const getFlaskAuthUrl = () => {
  const authUrl = `${API_BASE_URL}/login`;
  console.log('Flask auth URL:', authUrl);
  return {
    authUrl: authUrl,
    message: 'Copy this URL and open it in a new tab to authenticate with Flask',
    instructions: [
      '1. Copy the auth URL',
      '2. Open it in a new tab', 
      '3. Complete the Flask login',
      '4. Return to this tab',
      '5. Click "Check Status" to verify authentication'
    ]
  };
};

export const openFlaskAuthTab = async () => {
  try {
    const authUrl = `${API_BASE_URL}/login`;
    console.log('Opening Flask auth in new tab:', authUrl);
    
    // Open Flask auth in a new tab
    const newTab = window.open(authUrl, '_blank');
    
    if (!newTab) {
      return {
        success: false,
        message: 'Popup blocked. Please allow popups and try again, or manually navigate to: ' + authUrl
      };
    }
    
    return {
      success: true,
      message: 'Flask authentication opened in new tab. After logging in, return to this tab and click "Check Status".',
      authUrl: authUrl
    };
    
  } catch (error) {
    console.error('Failed to open Flask auth tab:', error);
    throw error;
  }
};

export const openFlaskAuthPopup = async () => {
  try {
    const authUrl = `${API_BASE_URL}/login`;
    console.log('Opening Flask auth in popup:', authUrl);
    
    // Open Flask auth in a popup window
    const popup = window.open(
      authUrl, 
      'flaskAuth', 
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );
    
    // Monitor the popup
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          console.log('Auth popup closed, checking for session...');
          
          // Check if authentication was successful
          checkFlaskAuthStatus().then(result => {
            resolve(result);
          }).catch(error => {
            reject(error);
          });
        }
      }, 1000);
      
      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        if (!popup.closed) {
          popup.close();
        }
        reject(new Error('Authentication timeout'));
      }, 300000);
    });
    
  } catch (error) {
    console.error('Failed to open Flask auth popup:', error);
    throw error;
  }
};

export const testMSALTokenWithGetASession = async () => {
  console.log('=== Testing MSAL Token with /getASession ===');
  
  // Get the MSAL token
  const msalToken = localStorage.getItem('msal_token');
  
  if (!msalToken) {
    return {
      success: false,
      error: 'No MSAL token found',
      solution: 'Make sure you\'re logged in with Microsoft OAuth first'
    };
  }
  
  console.log('Using MSAL token:', msalToken.substring(0, 50) + '...');
  
  try {
    // This is the key test - use MSAL Bearer token with /getASession
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${msalToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const result = {
      token_used: msalToken.substring(0, 50) + '...',
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers)
    };
    
    if (response.ok) {
      // SUCCESS! This should be the Flask session data
      const sessionData = await response.json();
      return {
        success: true,
        message: '🎉 SUCCESS! Flask accepted MSAL token and returned session!',
        session: sessionData,
        ...result
      };
    } else {
      // Get the error details
      const error = await response.text();
      
      if (response.status === 401) {
        // Analyze the 401 error
        let errorAnalysis = 'Still getting 401 with MSAL token';
        if (error.includes('Invalid token')) {
          errorAnalysis = 'Flask rejected MSAL token - might need different token format or validation';
        } else if (error.includes('Invalid audience')) {
          errorAnalysis = 'MSAL token audience mismatch - Flask expects different audience';
        } else if (error.includes('Signature verification failed')) {
          errorAnalysis = 'Flask cannot verify MSAL token signature - missing public key or wrong issuer';
        }
        
        return {
          success: false,
          message: '❌ Flask rejected MSAL token',
          error: error,
          analysis: errorAnalysis,
          ...result
        };
      } else {
        return {
          success: false,
          message: `❌ Unexpected error: ${response.status}`,
          error: error,
          ...result
        };
      }
    }
    
  } catch (error) {
    return {
      success: false,
      message: '❌ Network error',
      error: error.message
    };
  }
};

// Get Flask-specific token with correct audience
export const getFlaskToken = async () => {
  try {
    console.log('Getting Flask-specific token...');
    
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      console.error('No accounts found. User needs to be logged in.');
      return { error: 'Not logged in' };
    }

    flaskTokenRequest.account = accounts[0];
    
    const response = await msalInstance.acquireTokenSilent(flaskTokenRequest);
    console.log('Flask token acquired successfully:', response);
    
    return {
      token: response.accessToken,
      account: response.account,
      scopes: response.scopes,
      expiresOn: response.expiresOn
    };
  } catch (error) {
    console.error('Failed to get Flask token:', error);
    
    // If silent token acquisition fails, try interactive
    try {
      const response = await msalInstance.acquireTokenPopup(flaskTokenRequest);
      return {
        token: response.accessToken,
        account: response.account,
        scopes: response.scopes,
        expiresOn: response.expiresOn
      };
    } catch (popupError) {
      console.error('Interactive token acquisition failed:', popupError);
      return { error: popupError.message };
    }
  }
};

// Test Flask token with /getASession endpoint
export const testFlaskTokenWithGetASession = async () => {
  try {
    console.log('Testing Flask-specific token with /getASession...');
    
    const tokenResult = await getFlaskToken();
    if (tokenResult.error) {
      return { error: tokenResult.error };
    }

    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('🎉 SUCCESS! Flask accepted the new token!', data);
      return {
        success: true,
        message: '🎉 SUCCESS! Flask accepted Flask-specific token!',
        status: response.status,
        data: data,
        token: tokenResult.token,
        scopes: tokenResult.scopes
      };
    } else {
      const errorText = await response.text();
      console.error('Request failed:', errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        status: response.status,
        token: tokenResult.token,
        scopes: tokenResult.scopes
      };
    }
  } catch (error) {
    console.error('Error testing Flask token:', error);
    return { error: error.message };
  }
};

// Decode and analyze the successful Flask token
export const analyzeSuccessfulFlaskToken = () => {
  const exampleToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IkpZaEFjVFBNWl9MWDZEQmxPV1E3SG4wTmVYRSIsImtpZCI6IkpZaEFjVFBNWl9MWDZEQmxPV1E3SG4wTmVYRSJ9.eyJhdWQiOiJhcGk6Ly8yMjk2MWZiYy1lNzIzLTRhMTMtYmQ5Mi1kZGQ4M2FkZDA3OTQiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC83ZDg4NzQ1OC1mYjBkLTQwYmYtYWRiMy0wODRkODc1ZjY1ZGIvIiwiaWF0IjoxNzU1NTE4Njc0LCJuYmYiOjE3NTU1MTg2NzQsImV4cCI6MTc1NTUyMzk5NCwiYWNyIjoiMSIsImFpbyI6IkFZUUFlLzhaQUFBQWNIU3h6c2JBYmJaT3oyb0VFNFFCQUUzdnhkMitJeFdOVnlnMjI0OVlLNG1kcjBMSlk5NENzWGVkMHRFVWRFNXdjM3ZDQTVGVUVoZmozT0dma3ZRYVJWRURQS3REdDRuZ25hZ2VEOWZ6bW41U1RaZmhRQlF2a1gxVWVJQThIQlliUzJCRHBwN1hVcnJWVkl4QlNQcEduRTgrOExwMm92RDRrNWhFQjNwOFBkTT0iLCJhbXIiOlsicHdkIiwibWZhIl0sImFwcGlkIjoiMjI5NjFmYmMtZTcyMy00YTEzLWJkOTItZGRkODNhZGQwNzk0IiwiYXBwaWRhY3IiOiIwIiwiZmFtaWx5X25hbWUiOiJCYXJ0aCIsImdpdmVuX25hbWUiOiJBYXJvbiIsImlwYWRkciI6IjY5LjM2LjIyMi40NCIsIm5hbWUiOiJBYXJvbiBCYXJ0aCIsIm9pZCI6IjNkMjcxMjc5LWM4OTUtNGRjNy04NGNhLTZmNGI0NzAyMjc0NyIsInJoIjoiMS5BVkVBV0hTSWZRMzd2MEN0c3doTmgxOWwyN3dmbGlJajV4Tkt2WkxkMkRyZEI1VFFBTDFSQUEuIiwicm9sZXMiOlsiQWRtaW4iLCJFeHRlcm5hbEFwaSJdLCJzY3AiOiJhY2Nlc3NfYXNfdXNlciIsInNpZCI6IjAwN2NiMWY5LTA5ZjUtZDRjMC01NTQxLTkxOTliZGI2YzU4YyIsInN1YiI6IjRLdk0wS0doVUwtQXVJNXFmNEwzOHhlQnhRMjJZVk5OdGR3d096Mk1OSlEiLCJ0aWQiOiI3ZDg4NzQ1OC1mYjBkLTQwYmYtYWRiMy0wODRkODc1ZjY1ZGIiLCJ1bmlxdWVfbmFtZSI6ImFhcm9uYmFATTM2NXgxMDAzNjI4Ny5vbm1pY3Jvc29mdC5jb20iLCJ1cG4iOiJhYXJvbmJhQE0zNjV4MTAwMzYyODcub25taWNyb3NvZnQuY29tIiwidXRpIjoiWS1QNlZMSGF0a3l6Wm1NLVNoWUhBQSIsInZlciI6IjEuMCIsInhtc19mdGQiOiJuZ0JjTmViZk1nbzgwR1JZRGtQV2l4TDE4WjJObFJJWXU5WTlzNGVDd2I4QmRYTjNaWE4wTXkxa2MyMXoifQ";
  
  try {
    // Decode the JWT token
    const parts = exampleToken.split('.');
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    console.log('🎉 SUCCESS! Token Analysis:');
    console.log('='.repeat(50));
    console.log('AUTHENTICATION BREAKTHROUGH!');
    console.log('='.repeat(50));
    
    const analysis = {
      success: true,
      message: "🎉 MAJOR BREAKTHROUGH! MSAL token is now correctly configured for Flask!",
      
      tokenProgress: {
        before: "❌ Token audience: Microsoft Graph (00000003-0000-0000-c000-000000000000)",
        after: "✅ Token audience: Flask App (api://22961fbc-e723-4a13-bd92-ddd83add0794)",
        result: "Flask now accepts the token signature!"
      },
      
      header: header,
      
      keyPayloadFields: {
        audience: payload.aud,
        issuer: payload.iss,
        scopes: payload.scp,
        roles: payload.roles,
        user: {
          name: payload.name,
          email: payload.unique_name,
          objectId: payload.oid
        },
        appId: payload.appid,
        expires: new Date(payload.exp * 1000).toLocaleString()
      },
      
      statusUpdate: {
        authenticationFixed: true,
        flaskAcceptsToken: true,
        currentIssue: "Flask /getASession endpoint has internal server error (HTTP 500)",
        nextSteps: "Flask backend needs debugging - token authentication is working!"
      },
      
      recommendations: [
        "✅ MSAL configuration is now correct",
        "✅ Token has proper audience for Flask",  
        "✅ Token includes user roles: " + payload.roles?.join(', '),
        "🔧 Flask server needs debugging for /getASession endpoint",
        "🔧 HTTP 500 suggests Flask internal error, not authentication issue"
      ]
    };
    
    console.log('Analysis:', analysis);
    return analysis;
    
  } catch (error) {
    return {
      error: "Failed to decode token",
      details: error.message
    };
  }
};

// Investigate the HTTP 500 error in Flask /getASession
export const investigate500Error = async () => {
  console.log('🔍 Investigating Flask HTTP 500 Error...');
  
  try {
    const tokenResult = await getFlaskToken();
    if (tokenResult.error) {
      return { error: tokenResult.error };
    }

    // Test different approaches to diagnose the 500 error
    const investigation = {
      message: "🔍 Investigating Flask HTTP 500 Error",
      token_status: "✅ Token acquired successfully",
      tests: []
    };

    // Test 1: Try with different HTTP methods
    console.log('Test 1: Trying POST method...');
    try {
      const postResponse = await fetch(`${API_BASE_URL}/getASession`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenResult.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      investigation.tests.push({
        test: "POST /getASession",
        status: postResponse.status,
        success: postResponse.ok,
        error: postResponse.ok ? null : await postResponse.text()
      });
    } catch (e) {
      investigation.tests.push({
        test: "POST /getASession",
        error: e.message
      });
    }

    // Test 2: Try with minimal headers
    console.log('Test 2: Trying with minimal headers...');
    try {
      const minimalResponse = await fetch(`${API_BASE_URL}/getASession`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenResult.token}`
        }
      });
      
      investigation.tests.push({
        test: "GET /getASession (minimal headers)",
        status: minimalResponse.status,
        success: minimalResponse.ok,
        error: minimalResponse.ok ? null : await minimalResponse.text()
      });
    } catch (e) {
      investigation.tests.push({
        test: "GET /getASession (minimal headers)",
        error: e.message
      });
    }

    // Test 3: Check if Flask has other working endpoints
    console.log('Test 3: Testing Flask health/status...');
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/`, {
        method: 'GET'
      });
      
      investigation.tests.push({
        test: "GET / (Flask root)",
        status: healthResponse.status,
        success: healthResponse.ok,
        response: healthResponse.ok ? await healthResponse.text() : await healthResponse.text()
      });
    } catch (e) {
      investigation.tests.push({
        test: "GET / (Flask root)",
        error: e.message
      });
    }

    // Test 4: Try conversation-related endpoints
    console.log('Test 4: Checking conversation endpoints...');
    const testEndpoints = [
      '/get_conversations', 
      '/conversations', 
      '/api/conversations',
      '/chat/conversations',
      '/get_messages',
      '/messages',
      '/api/messages'
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`
          }
        });
        
        investigation.tests.push({
          test: `GET ${endpoint}`,
          status: response.status,
          success: response.ok,
          response: response.status < 500 ? await response.text() : "500 error"
        });
      } catch (e) {
        investigation.tests.push({
          test: `GET ${endpoint}`,
          error: e.message
        });
      }
    }

    // Analysis
    const workingTests = investigation.tests.filter(t => t.success);
    const server500s = investigation.tests.filter(t => t.status === 500);
    const other4xx = investigation.tests.filter(t => t.status >= 400 && t.status < 500);
    
    investigation.analysis = {
      summary: server500s.length > 0 ? 
        "Flask server has internal errors - likely a bug in the /getASession endpoint code" :
        "Need more investigation",
      working_endpoints: workingTests.length,
      server_errors_500: server500s.length,
      client_errors_4xx: other4xx.length,
      recommendation: server500s.length > 0 ? 
        "The Flask /getASession endpoint has a bug. Authentication is working, but the server code is failing." :
        "Authentication may still have issues"
    };

    console.log('Investigation complete:', investigation);
    return investigation;

  } catch (error) {
    console.error('Investigation failed:', error);
    return { 
      error: "Investigation failed: " + error.message,
      note: "This suggests a deeper connectivity or authentication issue"
    };
  }
};

// Test Flask conversation endpoints specifically
export const testFlaskConversationEndpoints = async () => {
  console.log('💬 Testing Flask conversation endpoints...');
  
  try {
    const tokenResult = await getFlaskToken();
    if (tokenResult.error) {
      return { error: tokenResult.error };
    }

    const conversationTests = {
      message: "💬 Testing Flask Conversation Endpoints",
      token_status: "✅ Flask token acquired",
      endpoints: []
    };

    // Test conversation-related endpoints
    const conversationEndpoints = [
      { url: '/api/get_conversations', method: 'GET', description: 'Primary conversations endpoint' },
      { url: '/get_conversations', method: 'GET', description: 'Get user conversations' },
      { url: '/conversations', method: 'GET', description: 'Alternative conversations endpoint' },
      { url: '/api/conversations', method: 'GET', description: 'API conversations endpoint' },
      { url: '/chat/conversations', method: 'GET', description: 'Chat conversations endpoint' },
      { url: '/get_messages', method: 'GET', description: 'Get messages endpoint' },
      { url: '/messages', method: 'GET', description: 'Messages endpoint' },
      { url: '/api/messages', method: 'GET', description: 'API messages endpoint' }
    ];

    console.log(`Testing ${conversationEndpoints.length} conversation endpoints...`);

    for (const endpoint of conversationEndpoints) {
      try {
        console.log(`Testing ${endpoint.method} ${endpoint.url}...`);
        
        const response = await fetch(`${API_BASE_URL}${endpoint.url}`, {
          method: endpoint.method,
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        const result = {
          endpoint: endpoint.url,
          method: endpoint.method,
          description: endpoint.description,
          status: response.status,
          success: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        };

        if (response.ok) {
          try {
            result.data = await response.json();
            result.message = `✅ SUCCESS! Found working endpoint: ${endpoint.url}`;
          } catch (e) {
            result.data = await response.text();
            result.message = `✅ SUCCESS! Endpoint works but returned text: ${endpoint.url}`;
          }
        } else if (response.status === 404) {
          result.message = `❌ Not Found: ${endpoint.url}`;
        } else if (response.status === 500) {
          result.error = await response.text();
          result.message = `🔥 Server Error: ${endpoint.url} - Flask internal error`;
        } else {
          result.error = await response.text();
          result.message = `❌ Error ${response.status}: ${endpoint.url}`;
        }

        conversationTests.endpoints.push(result);

      } catch (error) {
        conversationTests.endpoints.push({
          endpoint: endpoint.url,
          method: endpoint.method,
          description: endpoint.description,
          error: error.message,
          message: `❌ Network Error: ${endpoint.url}`
        });
      }
    }

    // Analysis
    const workingEndpoints = conversationTests.endpoints.filter(e => e.success);
    const notFoundEndpoints = conversationTests.endpoints.filter(e => e.status === 404);
    const serverErrorEndpoints = conversationTests.endpoints.filter(e => e.status === 500);

    conversationTests.summary = {
      total_tested: conversationEndpoints.length,
      working: workingEndpoints.length,
      not_found: notFoundEndpoints.length,
      server_errors: serverErrorEndpoints.length,
      working_endpoints: workingEndpoints.map(e => e.endpoint),
      recommendation: workingEndpoints.length > 0 ? 
        `✅ Found ${workingEndpoints.length} working endpoint(s)! Use these for your chat app.` :
        serverErrorEndpoints.length > 0 ? 
        "🔥 Flask has server errors - backend needs debugging" :
        "❌ No conversation endpoints found - check Flask API documentation"
    };

    console.log('Conversation endpoint test complete:', conversationTests);
    return conversationTests;

  } catch (error) {
    console.error('Conversation endpoint test failed:', error);
    return { 
      error: "Test failed: " + error.message
    };
  }
};

// Get Flask session first, then test conversation endpoints
export const testWithFlaskSession = async () => {
  console.log('🔐 Testing Flask session flow...');
  
  try {
    const tokenResult = await getFlaskToken();
    if (tokenResult.error) {
      return { error: tokenResult.error };
    }

    const sessionTest = {
      message: "🔐 Testing Flask Session Flow",
      steps: []
    };

    // Step 1: Try to get a Flask session using MSAL token
    console.log('Step 1: Getting Flask session...');
    try {
      const sessionResponse = await fetch(`${API_BASE_URL}/getASession`, {
        method: 'GET',
        credentials: 'include', // Important for session cookies
        headers: {
          'Authorization': `Bearer ${tokenResult.token}`,
          'Content-Type': 'application/json'
        }
      });

      sessionTest.steps.push({
        step: 1,
        action: 'Get Flask Session',
        status: sessionResponse.status,
        success: sessionResponse.ok,
        cookies: sessionResponse.headers.get('set-cookie') || 'No cookies set'
      });

      if (!sessionResponse.ok) {
        const error = await sessionResponse.text();
        sessionTest.steps[0].error = error;
        sessionTest.steps[0].message = "❌ Failed to get Flask session";
        
        return {
          ...sessionTest,
          result: "Failed to establish Flask session",
          recommendation: "Fix Flask /getASession endpoint first"
        };
      }

      const sessionData = await sessionResponse.json();
      sessionTest.steps[0].sessionData = sessionData;
      sessionTest.steps[0].message = "✅ Flask session established";

    } catch (error) {
      sessionTest.steps.push({
        step: 1,
        action: 'Get Flask Session',
        error: error.message,
        message: "❌ Network error getting Flask session"
      });
      return sessionTest;
    }

    // Step 2: Now test conversation endpoints with session
    console.log('Step 2: Testing conversation endpoints with session...');
    
    const conversationEndpoints = [
      '/api/get_conversations',
      '/get_conversations', 
      '/conversations',
      '/api/conversations'
    ];

    const conversationResults = [];

    for (const endpoint of conversationEndpoints) {
      try {
        console.log(`Testing ${endpoint} with Flask session...`);
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          credentials: 'include', // Use session cookies
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            // Note: Not sending Authorization header, relying on session cookie
          }
        });

        const result = {
          endpoint: endpoint,
          status: response.status,
          success: response.ok
        };

        if (response.ok) {
          try {
            result.data = await response.json();
            result.message = `✅ SUCCESS! ${endpoint} returned data with Flask session`;
          } catch (e) {
            result.data = await response.text();
            result.message = `✅ SUCCESS! ${endpoint} returned text with Flask session`;
          }
        } else {
          result.error = await response.text();
          result.message = `❌ ${endpoint} failed: ${response.status}`;
        }

        conversationResults.push(result);

      } catch (error) {
        conversationResults.push({
          endpoint: endpoint,
          error: error.message,
          message: `❌ Network error: ${endpoint}`
        });
      }
    }

    sessionTest.steps.push({
      step: 2,
      action: 'Test Conversation Endpoints',
      results: conversationResults,
      working_endpoints: conversationResults.filter(r => r.success).map(r => r.endpoint)
    });

    // Analysis
    const workingEndpoints = conversationResults.filter(r => r.success);
    
    sessionTest.summary = {
      flask_session: sessionTest.steps[0].success ? "✅ Established" : "❌ Failed",
      working_conversation_endpoints: workingEndpoints.length,
      working_endpoints: workingEndpoints.map(e => e.endpoint),
      recommendation: workingEndpoints.length > 0 ? 
        `✅ Use Flask session flow! Working endpoints: ${workingEndpoints.map(e => e.endpoint).join(', ')}` :
        sessionTest.steps[0].success ?
        "🔥 Flask session works but conversation endpoints have errors" :
        "❌ Need to fix Flask session establishment first"
    };

    console.log('Flask session test complete:', sessionTest);
    return sessionTest;

  } catch (error) {
    console.error('Flask session test failed:', error);
    return { 
      error: "Session test failed: " + error.message
    };
  }
};

// Test Flask's server-side MSAL authentication flow
export const testFlaskServerAuth = async () => {
  console.log('🔐 Testing Flask server-side MSAL authentication...');
  
  try {
    const authTest = {
      message: "🔐 Testing Flask Server-Side MSAL Flow",
      understanding: {
        pattern: "Flask manages MSAL tokens server-side using get_valid_access_token()",
        flow: "React -> Flask /login -> Flask manages MSAL -> Flask session -> API calls",
        note: "Flask stores user session data and handles token refresh internally"
      },
      steps: []
    };

    // Step 1: Check Flask login endpoint
    console.log('Step 1: Testing Flask login endpoint...');
    try {
      const loginResponse = await fetch(`${API_BASE_URL}/login`, {
        method: 'GET',
        credentials: 'include'
      });

      authTest.steps.push({
        step: 1,
        action: 'Test Flask /login endpoint',
        status: loginResponse.status,
        success: loginResponse.ok || loginResponse.status === 302, // 302 redirect is expected
        url: loginResponse.url,
        redirected: loginResponse.redirected
      });

      if (loginResponse.redirected || loginResponse.status === 302) {
        authTest.steps[0].message = "✅ Flask /login redirects (expected for MSAL flow)";
        authTest.steps[0].redirect_url = loginResponse.url;
      } else if (loginResponse.ok) {
        const content = await loginResponse.text();
        authTest.steps[0].message = "✅ Flask /login responded";
        authTest.steps[0].content = content.substring(0, 200) + '...';
      } else {
        const error = await loginResponse.text();
        authTest.steps[0].message = "❌ Flask /login failed";
        authTest.steps[0].error = error;
      }

    } catch (error) {
      authTest.steps.push({
        step: 1,
        action: 'Test Flask /login endpoint',
        error: error.message,
        message: "❌ Network error testing Flask /login"
      });
    }

    // Step 2: Check if we already have a Flask session
    console.log('Step 2: Checking for existing Flask session...');
    try {
      const sessionCheckResponse = await fetch(`${API_BASE_URL}/api/get_conversations`, {
        method: 'GET',
        credentials: 'include'
      });

      authTest.steps.push({
        step: 2,
        action: 'Check existing Flask session',
        status: sessionCheckResponse.status,
        success: sessionCheckResponse.ok
      });

      if (sessionCheckResponse.ok) {
        const data = await sessionCheckResponse.json();
        authTest.steps[1].message = "✅ Already have valid Flask session!";
        authTest.steps[1].conversations = data;
      } else if (sessionCheckResponse.status === 401) {
        authTest.steps[1].message = "❌ No valid Flask session - need to authenticate";
      } else if (sessionCheckResponse.status === 500) {
        authTest.steps[1].message = "🔥 Flask session exists but /api/get_conversations has server error";
        authTest.steps[1].error = await sessionCheckResponse.text();
      } else {
        authTest.steps[1].message = `❌ Unexpected response: ${sessionCheckResponse.status}`;
        authTest.steps[1].error = await sessionCheckResponse.text();
      }

    } catch (error) {
      authTest.steps.push({
        step: 2,
        action: 'Check existing Flask session',
        error: error.message,
        message: "❌ Network error checking Flask session"
      });
    }

    // Step 3: Try to use our MSAL token to establish Flask session
    console.log('Step 3: Attempting to establish Flask session with MSAL token...');
    try {
      const tokenResult = await getFlaskToken();
      if (tokenResult.error) {
        authTest.steps.push({
          step: 3,
          action: 'Get MSAL token for Flask session',
          error: tokenResult.error,
          message: "❌ Failed to get MSAL token"
        });
      } else {
        // Try to establish session with our MSAL token
        const sessionResponse = await fetch(`${API_BASE_URL}/getASession`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`
          }
        });

        authTest.steps.push({
          step: 3,
          action: 'Establish Flask session with MSAL token',
          status: sessionResponse.status,
          success: sessionResponse.ok,
          token_used: tokenResult.token.substring(0, 50) + '...'
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          authTest.steps[2].message = "✅ Flask session established with MSAL token";
          authTest.steps[2].sessionData = sessionData;
          
          // Step 4: Now test conversation endpoint with established session
          console.log('Step 4: Testing conversation endpoint with Flask session...');
          const conversationResponse = await fetch(`${API_BASE_URL}/api/get_conversations`, {
            method: 'GET',
            credentials: 'include' // Use session, not Authorization header
          });

          authTest.steps.push({
            step: 4,
            action: 'Test /api/get_conversations with Flask session',
            status: conversationResponse.status,
            success: conversationResponse.ok
          });

          if (conversationResponse.ok) {
            const conversations = await conversationResponse.json();
            authTest.steps[3].message = "🎉 SUCCESS! Flask session authentication working!";
            authTest.steps[3].conversations = conversations;
          } else {
            const error = await conversationResponse.text();
            authTest.steps[3].message = `❌ Flask session works but /api/get_conversations failed: ${conversationResponse.status}`;
            authTest.steps[3].error = error;
          }

        } else if (sessionResponse.status === 500) {
          authTest.steps[2].message = "🔥 MSAL token accepted but Flask /getASession has server error";
          authTest.steps[2].error = await sessionResponse.text();
        } else {
          authTest.steps[2].message = `❌ Flask rejected MSAL token: ${sessionResponse.status}`;
          authTest.steps[2].error = await sessionResponse.text();
        }
      }

    } catch (error) {
      authTest.steps.push({
        step: 3,
        action: 'Establish Flask session',
        error: error.message,
        message: "❌ Network error establishing Flask session"
      });
    }

    // Analysis
    const hasWorkingSession = authTest.steps.find(s => s.step === 2 && s.success);
    const establishedSession = authTest.steps.find(s => s.step === 3 && s.success);
    const conversationWorks = authTest.steps.find(s => s.step === 4 && s.success);

    authTest.summary = {
      flask_pattern: "✅ Identified - Flask uses server-side MSAL with get_valid_access_token()",
      existing_session: hasWorkingSession ? "✅ Already authenticated" : "❌ No existing session",
      session_establishment: establishedSession ? "✅ Can establish with MSAL" : "❌ Failed to establish",
      conversation_api: conversationWorks ? "✅ Working" : "❌ Not working",
      recommendation: conversationWorks ? 
        "🎉 Full Flask authentication flow working! Use this pattern in your React app." :
        hasWorkingSession ?
        "✅ You're already authenticated - Flask session is working" :
        establishedSession ?
        "🔧 Flask session works but conversation API needs debugging" :
        "❌ Need to fix Flask session establishment first"
    };

    console.log('Flask server auth test complete:', authTest);
    return authTest;

  } catch (error) {
    console.error('Flask server auth test failed:', error);
    return { 
      error: "Test failed: " + error.message
    };
  }
};

// Test the MCP server authentication pattern: Bearer token -> Session -> API calls
export const testMCPPattern = async () => {
  console.log('🔄 Testing MCP Server Authentication Pattern...');
  
  try {
    const mcpTest = {
      message: "🔄 Testing MCP Server Authentication Pattern",
      understanding: {
        pattern: "Bearer Token -> /getASession -> Session Cookie -> API calls",
        step1: "Use Bearer token to get Flask session cookie from /getASession",
        step2: "Use session cookie (not Bearer) for subsequent API calls",
        note: "This matches the MCP server implementation"
      },
      steps: []
    };

    // Step 1: Get Flask session using Bearer token (like MCP server does)
    console.log('Step 1: Getting Flask session with Bearer token...');
    
    const tokenResult = await getFlaskToken();
    if (tokenResult.error) {
      mcpTest.steps.push({
        step: 1,
        action: 'Get Bearer token',
        error: tokenResult.error,
        message: "❌ Failed to get Bearer token"
      });
      return mcpTest;
    }

    // Call /getASession with Bearer token to get session cookie
    const sessionResponse = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include', // Important for receiving cookies
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json'
      }
    });

    mcpTest.steps.push({
      step: 1,
      action: 'Get Flask session with Bearer token',
      status: sessionResponse.status,
      success: sessionResponse.ok,
      headers: Object.fromEntries(sessionResponse.headers.entries()),
      cookies_received: sessionResponse.headers.get('set-cookie') || 'None'
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      mcpTest.steps[0].error = error;
      mcpTest.steps[0].message = `❌ /getASession failed: ${sessionResponse.status}`;
      return {
        ...mcpTest,
        result: "/getASession failed - cannot proceed with MCP pattern"
      };
    }

    // Check if we got a session cookie
    const sessionData = await sessionResponse.json();
    mcpTest.steps[0].sessionData = sessionData;
    mcpTest.steps[0].message = "✅ Flask session obtained with Bearer token";

    // Step 2: Use session cookie for /api/get_conversations (like MCP server)
    console.log('Step 2: Using session cookie for /api/get_conversations...');

    const conversationResponse = await fetch(`${API_BASE_URL}/api/get_conversations`, {
      method: 'GET',
      credentials: 'include', // Use session cookie, NOT Authorization header
      headers: {
        'Content-Type': 'application/json'
        // NOTE: No Authorization header - using session cookie only
      }
    });

    mcpTest.steps.push({
      step: 2,
      action: 'Get conversations with session cookie',
      status: conversationResponse.status,
      success: conversationResponse.ok,
      note: 'Using session cookie only, no Bearer token'
    });

    if (conversationResponse.ok) {
      const conversations = await conversationResponse.json();
      mcpTest.steps[1].message = "🎉 SUCCESS! MCP pattern works - got conversations with session!";
      mcpTest.steps[1].conversations = conversations;
      mcpTest.steps[1].conversation_count = Array.isArray(conversations) ? conversations.length : 'Unknown';
    } else {
      const error = await conversationResponse.text();
      mcpTest.steps[1].message = `❌ Session cookie valid but /api/get_conversations failed: ${conversationResponse.status}`;
      mcpTest.steps[1].error = error;
    }

    // Step 3: Test other endpoints with session
    console.log('Step 3: Testing other endpoints with session...');
    
    const otherEndpoints = [
      '/api/groups/discover',
      '/api/prompts', 
      '/api/documents'
    ];

    const endpointTests = [];

    for (const endpoint of otherEndpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        endpointTests.push({
          endpoint: endpoint,
          status: response.status,
          success: response.ok,
          note: response.ok ? 'Session authentication working' : 'Endpoint error'
        });

      } catch (error) {
        endpointTests.push({
          endpoint: endpoint,
          error: error.message,
          note: 'Network error'
        });
      }
    }

    mcpTest.steps.push({
      step: 3,
      action: 'Test other endpoints with session',
      endpoints_tested: endpointTests,
      working_endpoints: endpointTests.filter(e => e.success).length
    });

    // Analysis
    const sessionWorking = mcpTest.steps[0].success;
    const conversationsWorking = mcpTest.steps[1].success;
    const otherEndpointsWorking = endpointTests.filter(e => e.success).length;

    mcpTest.summary = {
      pattern_status: sessionWorking ? "✅ MCP Pattern Working" : "❌ MCP Pattern Failed",
      session_establishment: sessionWorking ? "✅ Bearer -> Session working" : "❌ Bearer -> Session failed",
      conversation_api: conversationsWorking ? "✅ Session -> Conversations working" : "❌ Session -> Conversations failed", 
      other_apis: `${otherEndpointsWorking}/${otherEndpoints.length} other endpoints working`,
      recommendation: conversationsWorking ? 
        "🎉 Perfect! Use this MCP pattern: Bearer token -> Flask session -> API calls with session cookie" :
        sessionWorking ?
        "🔧 Flask session works but conversation API needs debugging" :
        "❌ Need to fix /getASession endpoint first"
    };

    console.log('MCP pattern test complete:', mcpTest);
    return mcpTest;

  } catch (error) {
    console.error('MCP pattern test failed:', error);
    return { 
      error: "MCP pattern test failed: " + error.message
    };
  }
};

export const analyzeTokenMismatch = (tokenInfo) => {
  // Based on the actual MSAL token analysis, let's see what might be wrong
  
  const analysis = {
    summary: "MSAL Token vs Flask Expectations Analysis",
    token_details: {
      issuer: tokenInfo?.payload?.issuer || "Microsoft Azure AD tenant-specific",
      audience: tokenInfo?.payload?.audience || "Microsoft Graph API (00000003-...)",
      algorithm: tokenInfo?.header?.alg || "RS256 (Microsoft standard)",
      key_id: tokenInfo?.header?.kid || "Microsoft's key identifier",
      scopes: tokenInfo?.payload?.scopes || "Microsoft Graph permissions"
    },
    likely_flask_issues: [
      {
        issue: "Wrong Audience",
        problem: "Token audience is Microsoft Graph API (00000003-0000-0000-c000-000000000000)",
        flask_expects: "Probably your Flask application ID or custom audience",
        impact: "Flask rejects token because it's not 'for' Flask"
      },
      {
        issue: "Untrusted Issuer", 
        problem: "Issuer is Azure AD tenant-specific (https://sts.windows.net/...)",
        flask_expects: "Flask needs to be configured to trust this specific tenant",
        impact: "Flask doesn't recognize Microsoft as valid token issuer"
      },
      {
        issue: "Missing Public Key",
        problem: "Token uses Microsoft's key ID for signature verification",
        flask_expects: "Flask needs Microsoft's public key to verify signature",
        impact: "Signature verification fails even if token is valid"
      },
      {
        issue: "Scope Mismatch",
        problem: "Token has Microsoft Graph scopes (User.Read, etc.)",
        flask_expects: "Flask might expect different/custom scopes",
        impact: "Flask might reject token due to wrong permissions"
      }
    ],
    solutions: {
      backend_fixes: [
        "Configure Flask JWT to accept your Azure AD tenant as issuer",
        "Set Flask audience to match Microsoft Graph or your app ID",
        "Add Microsoft's JWKS endpoint for public key validation",
        "Configure Flask to accept Microsoft Graph scopes"
      ],
      token_fixes: [
        "Request MSAL token with Flask's audience instead of Microsoft Graph",
        "Get token with Flask-specific scopes",
        "Use different Azure AD app registration configured for Flask"
      ]
    },
    next_tests: [
      "Try requesting MSAL token with Flask's expected audience",
      "Test if Flask accepts the specific issuer format",
      "Check if any alternative token formats work"
    ]
  };
  
  return analysis;
};

export const tryCustomAudienceToken = async () => {
  console.log('=== Trying to get MSAL token with Flask audience ===');
  
  // Try to get a new MSAL token with Flask's expected audience
  // This might require reconfiguring the MSAL request
  
  try {
    // First, let's see what audiences we can try
    const possibleAudiences = [
      'https://ettsc-dev-app.azurewebsites.net',  // Flask's URL
      'api://ettsc-dev-app.azurewebsites.net',    // API format
      '22961fbc-e723-4a13-bd92-ddd83add0794',      // Your app ID
      'api://22961fbc-e723-4a13-bd92-ddd83add0794' // API format with app ID
    ];
    
    return {
      message: 'Audience mismatch analysis',
      current_audience: '00000003-0000-0000-c000-000000000000 (Microsoft Graph)',
      problem: 'Flask probably expects tokens for Flask itself, not Microsoft Graph',
      possible_flask_audiences: possibleAudiences,
      solution: 'Need to reconfigure MSAL to request tokens for Flask instead of Microsoft Graph',
      implementation: [
        '1. Update MSAL scopes to target Flask application',
        '2. Configure Azure AD app registration with Flask API permissions',
        '3. Request new token with Flask as the audience',
        '4. Test new token with /getASession'
      ],
      note: 'This requires changes to MSAL configuration in authConfig.js'
    };
    
  } catch (error) {
    return {
      error: 'Could not analyze audience options: ' + error.message
    };
  }
};

export const createFlaskCompatibleAuth = () => {
  return {
    diagnosis: "Complete Flask Authentication Compatibility Analysis",
    current_situation: {
      msal_token: "✅ Valid Microsoft token with Graph API audience", 
      flask_endpoint: "✅ Accepts Bearer tokens but rejects Microsoft signature",
      root_cause: "❌ Token is for Microsoft Graph, not for Flask application"
    },
    the_fix_options: {
      option_1: {
        name: "Reconfigure MSAL for Flask",
        description: "Change MSAL to request tokens FOR Flask instead of Microsoft Graph",
        pros: ["Uses existing MSAL flow", "Minimal backend changes"],
        cons: ["Requires Azure AD app registration changes", "Complex MSAL reconfiguration"],
        difficulty: "Medium"
      },
      option_2: {
        name: "Configure Flask for Microsoft tokens",
        description: "Update Flask to accept and validate Microsoft Graph tokens",
        pros: ["No frontend changes needed", "Uses current token"],
        cons: ["Requires backend access and expertise", "Security configuration"],
        difficulty: "Hard - requires backend developer"
      },
      option_3: {
        name: "Hybrid approach",
        description: "Use Flask OAuth to get Flask-compatible tokens",
        pros: ["Works with current Flask setup", "Clear separation"],
        cons: ["Two authentication flows", "More complex user experience"],
        difficulty: "Medium"
      }
    },
    recommendation: "Try Option 1 first - reconfigure MSAL to target Flask",
    immediate_next_step: "Update MSAL configuration to request tokens for Flask audience"
  };
};

export const analyzeSignatureError = () => {
  return {
    problem: "Flask signature verification failed for MSAL token",
    explanation: [
      "Flask is trying to validate the MSAL JWT token",
      "But it cannot verify Microsoft's cryptographic signature",
      "This means Flask doesn't have the right validation setup"
    ],
    why_this_happens: {
      missing_public_key: "Flask doesn't have Microsoft's public key to verify the signature",
      wrong_issuer: "Flask expects tokens from a different issuer than Microsoft",
      jwt_config: "Flask JWT library not configured for Microsoft Azure AD",
      audience_mismatch: "Token audience doesn't match what Flask expects"
    },
    backend_fixes_needed: [
      "Configure Flask to accept Microsoft Azure AD as token issuer",
      "Add Microsoft's public key/certificate for signature verification", 
      "Set correct audience validation in Flask JWT config",
      "Update Flask to use Microsoft's JWKS endpoint for key validation"
    ],
    frontend_workaround: {
      possible: "Maybe - if Flask accepts different token format",
      approach: "Get a different token format that Flask can validate"
    },
    next_steps: [
      "Check what token format Flask actually expects",
      "See if Flask has different endpoints for Microsoft tokens",
      "Test with mock/demo tokens to understand Flask's requirements"
    ]
  };
};

export const tryDifferentTokenFormats = async () => {
  console.log('=== Trying Different Token Formats ===');
  
  const tests = [];
  const msalToken = localStorage.getItem('msal_token');
  
  if (!msalToken) {
    return { error: 'No MSAL token available' };
  }
  
  // Test 1: Try without Bearer prefix
  try {
    const response1 = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': msalToken, // No "Bearer " prefix
        'Content-Type': 'application/json'
      }
    });
    
    tests.push({
      format: 'Token without Bearer prefix',
      status: response1.status,
      error: response1.status !== 200 ? await response1.text() : null,
      success: response1.ok
    });
  } catch (error) {
    tests.push({
      format: 'Token without Bearer prefix',
      error: error.message
    });
  }
  
  // Test 2: Try different authorization schemes
  const schemes = ['Token', 'JWT', 'Microsoft'];
  
  for (const scheme of schemes) {
    try {
      const response = await fetch(`${API_BASE_URL}/getASession`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `${scheme} ${msalToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      tests.push({
        format: `${scheme} token format`,
        status: response.status,
        error: response.status !== 200 ? await response.text() : null,
        success: response.ok
      });
    } catch (error) {
      tests.push({
        format: `${scheme} token format`,
        error: error.message
      });
    }
  }
  
  // Test 3: Try with additional headers that might help Flask
  try {
    const response3 = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${msalToken}`,
        'Content-Type': 'application/json',
        'X-Token-Type': 'Microsoft-JWT',
        'X-Issuer': 'https://login.microsoftonline.com/',
        'X-Audience': 'api://default'
      }
    });
    
    tests.push({
      format: 'Bearer with hint headers',
      status: response3.status,
      error: response3.status !== 200 ? await response3.text() : null,
      success: response3.ok
    });
  } catch (error) {
    tests.push({
      format: 'Bearer with hint headers',
      error: error.message
    });
  }
  
  return {
    message: 'Testing different token formats and headers',
    tests: tests,
    successful: tests.filter(t => t.success),
    recommendation: tests.some(t => t.success) 
      ? 'Found working format!' 
      : 'No alternative formats work - Flask needs backend configuration changes'
  };
};

export const createMockFlaskAuth = async () => {
  // Since Flask can't validate MSAL tokens, let's see what a working Flask token might look like
  // This is for understanding what Flask expects
  
  return {
    message: 'Analysis: What Flask probably expects vs what we have',
    what_flask_expects: {
      issuer: 'Flask application itself or configured identity provider',
      audience: 'Flask application ID or specific audience value',
      signature: 'Signed with key that Flask has access to verify',
      format: 'JWT format but with Flask-compatible claims'
    },
    what_msal_provides: {
      issuer: 'https://login.microsoftonline.com/ (Microsoft)',
      audience: 'Your Azure app registration ID', 
      signature: 'Signed with Microsoft\'s private key',
      format: 'Valid JWT but Microsoft-specific claims'
    },
    the_gap: [
      'Flask doesn\'t trust Microsoft as a token issuer',
      'Flask doesn\'t have Microsoft\'s public key for verification',
      'Flask might expect different audience/claims structure'
    ],
    possible_solutions: [
      'Configure Flask to accept Microsoft as trusted issuer',
      'Use Flask\'s own OAuth to get Flask-issued tokens',
      'Add token exchange endpoint in Flask',
      'Use different authentication approach'
    ]
  };
};

export const debugMSALTokenForFlask = async () => {
  console.log('=== Debugging MSAL Token for Flask ===');
  
  const msalToken = localStorage.getItem('msal_token');
  if (!msalToken) {
    return { error: 'No MSAL token available' };
  }
  
  // Decode and analyze the MSAL token
  try {
    const parts = msalToken.split('.');
    if (parts.length !== 3) {
      return { error: 'Invalid JWT token format' };
    }
    
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    const tokenInfo = {
      header: header,
      payload: {
        issuer: payload.iss,
        audience: payload.aud,
        subject: payload.sub,
        scopes: payload.scp,
        appId: payload.appid,
        expires: new Date(payload.exp * 1000),
        issued: new Date(payload.iat * 1000),
        name: payload.name,
        email: payload.email || payload.preferred_username
      },
      validation: {
        expired: payload.exp * 1000 < Date.now(),
        timeLeft: Math.max(0, Math.floor((payload.exp * 1000 - Date.now()) / 60000)) + ' minutes'
      }
    };
    
    return {
      message: 'MSAL Token Analysis for Flask compatibility',
      tokenInfo: tokenInfo,
      recommendations: [
        'Check if Flask expects specific audience (aud) value',
        'Verify Flask has Microsoft\'s public key to validate signature', 
        'Confirm Flask accepts this issuer (iss) value',
        'Check if token scopes (scp) match what Flask expects'
      ]
    };
    
  } catch (error) {
    return {
      error: 'Could not decode MSAL token: ' + error.message
    };
  }
};

export const testGetSessionPurpose = async () => {
  console.log('=== Testing /getASession Purpose ===');
  
  // You're right - /getASession might be designed to RETURN a session, not require one
  // Let's test this theory with different approaches
  
  const tests = [];
  
  // Test 1: What if /getASession expects a user identifier in the request?
  try {
    const response1 = await fetch(`${API_BASE_URL}/getASession?user_id=test`, {
      method: 'GET',
      credentials: 'include'
    });
    
    tests.push({
      test: 'With user_id parameter',
      status: response1.status,
      headers: Object.fromEntries(response1.headers),
      error: response1.status !== 200 ? await response1.text() : null,
      data: response1.ok ? await response1.json() : null
    });
  } catch (error) {
    tests.push({
      test: 'With user_id parameter',
      error: error.message
    });
  }
  
  // Test 2: What if it needs the Bearer token from our MSAL login (for the user identity)?
  const msalToken = localStorage.getItem('msal_token');
  if (msalToken) {
    try {
      const response2 = await fetch(`${API_BASE_URL}/getASession`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${msalToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      tests.push({
        test: 'With MSAL Bearer token (to identify user)',
        status: response2.status,
        headers: Object.fromEntries(response2.headers),
        error: response2.status !== 200 ? await response2.text() : null,
        data: response2.ok ? await response2.json() : null
      });
    } catch (error) {
      tests.push({
        test: 'With MSAL Bearer token',
        error: error.message
      });
    }
  }
  
  // Test 3: What if it needs POST with user data?
  try {
    const response3 = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: 'test_user',
        action: 'create_session'
      })
    });
    
    tests.push({
      test: 'POST with user data',
      status: response3.status,
      headers: Object.fromEntries(response3.headers),
      error: response3.status !== 200 ? await response3.text() : null,
      data: response3.ok ? await response3.json() : null
    });
  } catch (error) {
    tests.push({
      test: 'POST with user data', 
      error: error.message
    });
  }
  
  return {
    hypothesis: '/getASession is meant to RETURN a Flask session, not require one',
    purpose: 'This endpoint might create/return session tokens for authenticated users',
    tests: tests,
    analysis: {
      original_thinking: 'We thought /getASession required Flask session auth',
      new_thinking: 'Maybe /getASession creates sessions for users who provide identity (like MSAL tokens)',
      next_step: 'Look for successful responses that return session data'
    }
  };
};

export const rethinkFlaskAuth = () => {
  return {
    revelation: 'You\'re absolutely right about /getASession purpose!',
    original_assumption: {
      wrong: 'We assumed /getASession required Flask session authentication',
      problem: 'This led us down the wrong path trying to use Flask OAuth cookies'
    },
    correct_understanding: {
      right: '/getASession is designed to RETURN/CREATE Flask sessions',
      purpose: 'It probably takes user identity (Bearer token) and returns session data',
      flow: [
        '1. User authenticates with identity provider (Microsoft/MSAL)',
        '2. Frontend sends MSAL Bearer token to /getASession',
        '3. Flask validates the Bearer token with Microsoft',
        '4. Flask returns session data/token for that authenticated user'
      ]
    },
    why_401_makes_sense: {
      explanation: 'Flask is saying "I need a Bearer token to identify WHO to create a session for"',
      not_about_flask_auth: 'The Bearer token isn\'t for Flask auth - it\'s for USER IDENTITY',
      token_source: 'Flask expects Bearer tokens from Microsoft (which we have via MSAL)'
    },
    solution_path: [
      'Use our MSAL Bearer token with /getASession',
      'Flask will validate it with Microsoft',
      'Flask will return session data for the authenticated Microsoft user',
      'Then use that session data for subsequent API calls'
    ],
    next_test: 'Try /getASession with our MSAL token - it might just work!'
  };
};

export const analyzeFlaskAuthProblem = () => {
  return {
    summary: "Flask Backend Authentication Analysis",
    findings: {
      flask_oauth_works: "✅ You successfully completed Flask OAuth (cookies prove this)",
      getASession_requirements: "❌ /getASession endpoint requires Authorization: Bearer <token>", 
      token_endpoints: "❌ Flask has no token exchange endpoints (/token, /auth/token, etc.)",
      alternative_headers: "❌ Flask rejects all alternative authentication methods",
      http_methods: "❌ /getASession only accepts GET (405 on POST)"
    },
    root_problem: "Architecture Mismatch",
    explanation: [
      "Flask OAuth flow gives you SESSION COOKIES for web app authentication",
      "But /getASession endpoint was designed for API access with BEARER TOKENS",
      "These are two different authentication patterns that don't work together",
      "Flask backend is missing the bridge between these patterns"
    ],
    possible_solutions: [
      {
        solution: "Backend Fix (Recommended)",
        description: "Flask backend needs to accept session cookies for /getASession",
        implementation: "Modify Flask /getASession to check session cookies instead of Bearer tokens"
      },
      {
        solution: "Token Exchange Endpoint", 
        description: "Flask backend needs an endpoint to exchange session for Bearer token",
        implementation: "Add Flask endpoint like /api/token that returns Bearer token for authenticated session"
      },
      {
        solution: "Dual Authentication",
        description: "Modify /getASession to accept both Bearer tokens AND session cookies",
        implementation: "Flask checks Authorization header first, falls back to session cookies"
      }
    ],
    workaround: {
      available: false,
      reason: "Flask backend strictly enforces Bearer token requirement with no alternatives"
    },
    next_steps: [
      "Contact backend developer to implement one of the solutions above",
      "Or use a different Flask endpoint that accepts session authentication",
      "Or find the correct Bearer token source (if it exists elsewhere)"
    ]
  };
};

export const findAlternativeFlaskEndpoints = async () => {
  console.log('=== Searching for Alternative Flask Endpoints ===');
  
  // Maybe there are other endpoints that work with session authentication
  const endpointsToTest = [
    '/',
    '/api',
    '/session',
    '/user',
    '/me',
    '/profile', 
    '/auth',
    '/status',
    '/health',
    '/info',
    '/chat',
    '/messages',
    '/conversations'
  ];
  
  const results = [];
  
  for (const endpoint of endpointsToTest) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        credentials: 'include' // Use session cookies
      });
      
      const result = {
        endpoint: endpoint,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        accessible: response.status === 200
      };
      
      if (response.ok) {
        try {
          const data = await response.json();
          result.data = data;
          result.type = 'json';
        } catch (e) {
          const text = await response.text();
          result.data = text.substring(0, 200) + (text.length > 200 ? '...' : '');
          result.type = 'text';
        }
      } else if (response.status !== 404) {
        // Get error message for non-404 errors
        try {
          const error = await response.text();
          result.error = error.substring(0, 200);
        } catch (e) {
          result.error = 'Could not read error';
        }
      }
      
      results.push(result);
      
    } catch (error) {
      results.push({
        endpoint: endpoint,
        error: error.message
      });
    }
  }
  
  const accessibleEndpoints = results.filter(r => r.accessible);
  
  return {
    message: 'Searching for Flask endpoints that accept session authentication',
    totalTested: endpointsToTest.length,
    accessibleEndpoints: accessibleEndpoints.length,
    results: results,
    summary: accessibleEndpoints.length > 0 
      ? `Found ${accessibleEndpoints.length} accessible endpoints with session auth`
      : 'No accessible endpoints found with session authentication'
  };
};

export const investigateFlaskAuth = async () => {
  console.log('=== Investigating Flask Authentication Pattern ===');
  
  // The issue: Flask OAuth gives cookies but /getASession wants Bearer tokens
  // Let's see if Flask has another endpoint that can convert cookies to tokens
  
  const results = {
    investigation: 'Flask OAuth vs Bearer token requirements',
    findings: []
  };
  
  // Test 1: Check what endpoints Flask has for token management
  const possibleTokenEndpoints = [
    '/token',
    '/auth/token', 
    '/api/token',
    '/getToken',
    '/access_token',
    '/oauth/token'
  ];
  
  for (const endpoint of possibleTokenEndpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        credentials: 'include' // Send cookies
      });
      
      results.findings.push({
        endpoint: endpoint,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        exists: response.status !== 404
      });
      
      if (response.ok) {
        try {
          const data = await response.json();
          results.findings[results.findings.length - 1].data = data;
        } catch (e) {
          const text = await response.text();
          results.findings[results.findings.length - 1].text = text;
        }
      }
      
    } catch (error) {
      results.findings.push({
        endpoint: endpoint,
        error: error.message
      });
    }
  }
  
  // Test 2: Try different approaches to /getASession
  const sessionTests = [];
  
  // Test with just cookies (what we tried before)
  try {
    const cookieResponse = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include'
    });
    
    sessionTests.push({
      method: 'Cookies only',
      status: cookieResponse.status,
      error: cookieResponse.status !== 200 ? await cookieResponse.text() : null
    });
  } catch (error) {
    sessionTests.push({
      method: 'Cookies only',
      error: error.message
    });
  }
  
  // Test with POST instead of GET
  try {
    const postResponse = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    sessionTests.push({
      method: 'POST with cookies',
      status: postResponse.status,
      error: postResponse.status !== 200 ? await postResponse.text() : null
    });
  } catch (error) {
    sessionTests.push({
      method: 'POST with cookies',
      error: error.message
    });
  }
  
  results.sessionTests = sessionTests;
  
  // Analysis
  results.analysis = {
    problem: 'Flask OAuth provides cookies but /getASession requires Bearer tokens',
    possibleSolutions: [
      'Flask might have a token endpoint to exchange cookies for Bearer tokens',
      'Flask might accept a different authentication method',
      'The /getASession endpoint might work with POST instead of GET',
      'Flask might need a CSRF token or specific headers'
    ]
  };
  
  return results;
};

export const tryAlternativeFlaskAuth = async () => {
  console.log('=== Trying Alternative Flask Auth Methods ===');
  
  const alternatives = [];
  
  // Alternative 1: Check if Flask session cookie can be used directly
  const cookies = document.cookie;
  const sessionCookies = cookies.split(';').filter(cookie => 
    cookie.toLowerCase().includes('session') || 
    cookie.toLowerCase().includes('flask') ||
    cookie.toLowerCase().includes('auth')
  );
  
  alternatives.push({
    method: 'Session Cookie Analysis',
    sessionCookies: sessionCookies,
    allCookies: cookies
  });
  
  // Alternative 2: Try to extract token from the lengthy tunnel cookie
  const tunnelCookie = cookies.split(';').find(cookie => 
    cookie.includes('.Tunnels.Relay.WebForwarding.Cookies=') && cookie.length > 100
  );
  
  if (tunnelCookie) {
    // The tunnel cookie might contain encoded auth data
    alternatives.push({
      method: 'Tunnel Cookie Analysis',
      cookieLength: tunnelCookie.length,
      cookieStart: tunnelCookie.substring(0, 100),
      note: 'This cookie might contain encoded authentication data'
    });
  }
  
  // Alternative 3: Try different headers with the session
  try {
    const headerTests = [
      { 'X-Requested-With': 'XMLHttpRequest' },
      { 'Accept': 'application/json' },
      { 'X-CSRFToken': 'test' },
      { 'Authorization': 'Session' }
    ];
    
    for (const headers of headerTests) {
      const response = await fetch(`${API_BASE_URL}/getASession`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      
      alternatives.push({
        method: `Headers: ${JSON.stringify(headers)}`,
        status: response.status,
        success: response.ok,
        error: response.ok ? null : await response.text()
      });
    }
  } catch (error) {
    alternatives.push({
      method: 'Header tests',
      error: error.message
    });
  }
  
  return {
    message: 'Testing alternative authentication methods',
    alternatives: alternatives,
    recommendation: 'Look for successful responses (status 200) in the alternatives'
  };
};

export const handleFlaskAuthReturn = () => {
  // This function should be called when returning from Flask OAuth
  // It will look for tokens in the URL or session storage
  
  console.log('Checking for Flask auth tokens after OAuth return...');
  
  const currentUrl = window.location.href;
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  console.log('Current URL:', currentUrl);
  console.log('URL params:', Object.fromEntries(urlParams));
  console.log('Hash params:', Object.fromEntries(hashParams));
  
  // Check various places where Flask might have put the token
  const possibleTokens = {
    urlParam_access_token: urlParams.get('access_token'),
    urlParam_token: urlParams.get('token'),
    hashParam_access_token: hashParams.get('access_token'),
    hashParam_token: hashParams.get('token'),
    localStorage_flask_token: localStorage.getItem('flask_token'),
    localStorage_access_token: localStorage.getItem('access_token'),
    sessionStorage_flask_token: sessionStorage.getItem('flask_token'),
    sessionStorage_access_token: sessionStorage.getItem('access_token')
  };
  
  console.log('Possible token locations:', possibleTokens);
  
  // Find the first non-null token
  const token = Object.entries(possibleTokens).find(([key, value]) => value && value.length > 10);
  
  if (token) {
    console.log(`Found token in: ${token[0]}`);
    localStorage.setItem('flask_bearer_token', token[1]);
    return {
      success: true,
      token: token[1],
      source: token[0],
      message: 'Flask Bearer token found and stored!'
    };
  } else {
    return {
      success: false,
      message: 'No Bearer token found after Flask OAuth',
      suggestion: 'Flask OAuth may not be providing tokens in the expected format',
      possibleTokens: possibleTokens
    };
  }
};

export const testWithFlaskBearerToken = async () => {
  const token = localStorage.getItem('flask_bearer_token');
  
  if (!token) {
    return {
      success: false,
      message: 'No Flask Bearer token found. Complete Flask OAuth first.',
      action: 'Run handleFlaskAuthReturn() after Flask OAuth'
    };
  }
  
  console.log('Testing with Flask Bearer token...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = {
      tokenUsed: token.substring(0, 50) + '...',
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers)
    };
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: '✅ Flask authentication successful with Bearer token!',
        session: data,
        ...result
      };
    } else {
      const error = await response.text();
      return {
        success: false,
        message: `❌ Still getting ${response.status} with Flask Bearer token`,
        error: error,
        ...result
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: 'Error testing Flask Bearer token',
      error: error.message
    };
  }
};

export const explainFlaskAuth = () => {
  return {
    problem: "Flask backend requires Authorization header with Bearer token",
    currentState: "We have cookies but Flask wants a Bearer token in the header",
    solution: {
      step1: "Complete Flask's OAuth flow to get a proper Bearer token",
      step2: "Flask will provide the token after successful OAuth",
      step3: "We need to store and use that token for API calls"
    },
    nextAction: "Click 'Go to Flask Login' to start Flask's OAuth flow",
    technicalDetails: {
      what_flask_expects: "Authorization: Bearer <flask-issued-token>",
      what_we_have: "Cookies and MSAL tokens (but wrong type)",
      why_401: "Flask's /getASession endpoint requires its own Bearer tokens"
    }
  };
};

export const testWithAuthHeader = async () => {
  // Let's try to understand what happens if we provide some kind of auth header
  console.log('Testing different auth header formats...');
  
  const tests = [];
  
  // Test 1: Try with MSAL token
  const msalToken = localStorage.getItem('msal_token');
  if (msalToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/getASession`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${msalToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = {
        test: 'MSAL Bearer Token',
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers)
      };
      
      if (response.ok) {
        result.success = true;
        result.data = await response.json();
      } else {
        result.success = false;
        result.error = await response.text();
      }
      
      tests.push(result);
    } catch (error) {
      tests.push({
        test: 'MSAL Bearer Token',
        success: false,
        error: error.message
      });
    }
  }
  
  // Test 2: Try with empty Bearer
  try {
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': 'Bearer',
        'Content-Type': 'application/json'
      }
    });
    
    tests.push({
      test: 'Empty Bearer Header',
      status: response.status,
      error: await response.text()
    });
  } catch (error) {
    tests.push({
      test: 'Empty Bearer Header',
      error: error.message
    });
  }
  
  return {
    explanation: 'Testing what Flask expects in Authorization header',
    tests: tests,
    conclusion: 'Flask needs its own Bearer token from its OAuth flow'
  };
};

export const simpleFlaskAuthFlow = async () => {
  console.log('=== Simple Flask Auth Flow ===');
  
  // Step 1: Check current status
  console.log('Step 1: Checking current Flask session...');
  
  try {
    const sessionResponse = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (sessionResponse.ok) {
      const data = await sessionResponse.json();
      return {
        step: 'complete',
        message: 'You are already authenticated with Flask!',
        session: data
      };
    }
    
    // Step 2: We need to authenticate
    console.log('Step 2: Need Flask authentication');
    
    // Get the Flask login URL
    const authUrl = `${API_BASE_URL}/login`;
    
    return {
      step: 'auth_needed',
      message: 'Flask authentication required',
      instructions: [
        '1. Click the "Go to Flask Login" button below',
        '2. Complete the Microsoft login in the new tab',
        '3. Return to this tab and click "Check Session" again'
      ],
      authUrl: authUrl,
      buttonText: 'Go to Flask Login'
    };
    
  } catch (error) {
    return {
      step: 'error',
      message: 'Error checking Flask authentication',
      error: error.message
    };
  }
};

export const quickFlaskCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include'
    });
    
    const responseData = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      cookies: document.cookie
    };
    
    if (response.ok) {
      const data = await response.json();
      return {
        authenticated: true,
        message: '✅ Flask authentication successful!',
        session: data,
        response: responseData
      };
    } else {
      const errorText = await response.text();
      return {
        authenticated: false,
        message: `❌ Not authenticated (${response.status})`,
        error: errorText,
        response: responseData,
        solution: 'Use "Go to Flask Login" to authenticate'
      };
    }
  } catch (error) {
    return {
      authenticated: false,
      message: '❌ Connection error',
      error: error.message
    };
  }
};

export const tryFlaskDirectLogin = async () => {
  console.log('=== Trying Flask Direct Login ===');
  
  // The issue is that Flask expects its own Bearer tokens, not MSAL tokens
  // Let's try to understand what Flask needs by checking its login flow
  
  try {
    // First, let's see what happens when we hit the login endpoint
    const loginResponse = await fetch(`${API_BASE_URL}/login`, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual' // Don't automatically follow redirects
    });
    
    console.log('Login endpoint response:', {
      status: loginResponse.status,
      statusText: loginResponse.statusText,
      headers: Object.fromEntries(loginResponse.headers),
      type: loginResponse.type
    });
    
    // Check if we got redirected (which would be normal for OAuth)
    if (loginResponse.status === 302 || loginResponse.status === 301) {
      const location = loginResponse.headers.get('Location');
      console.log('Redirect location:', location);
      
      return {
        success: false,
        needsRedirect: true,
        redirectUrl: location,
        message: 'Flask requires OAuth redirect. Use "Open New Tab" to complete authentication.'
      };
    }
    
    // If we get here, something unexpected happened
    return {
      success: false,
      status: loginResponse.status,
      message: 'Unexpected response from Flask login endpoint'
    };
    
  } catch (error) {
    console.error('Flask direct login error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const checkForFlaskSession = async () => {
  console.log('=== Checking for Flask Session ===');
  
  try {
    // Check if we have any Flask-related cookies
    const cookies = document.cookie;
    console.log('All cookies:', cookies);
    
    // Try a simple request without any auth headers first
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include', // This will send any cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Session check response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers)
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        authenticated: true,
        session: data,
        message: 'Flask session is active!'
      };
    } else if (response.status === 401) {
      // This is expected if not authenticated
      const errorText = await response.text();
      return {
        authenticated: false,
        error: errorText,
        message: 'No Flask session found. Need to authenticate with Flask first.',
        needsAuth: true
      };
    } else {
      // Unexpected status
      const errorText = await response.text();
      return {
        authenticated: false,
        status: response.status,
        error: errorText,
        message: 'Unexpected response from Flask'
      };
    }
    
  } catch (error) {
    console.error('Session check error:', error);
    return {
      authenticated: false,
      error: error.message
    };
  }
};

export const debugFlaskAuth = async () => {
  console.log('=== Flask Authentication Debug ===');
  
  // Check what cookies we have
  const cookies = document.cookie;
  console.log('Current cookies:', cookies);
  
  // Try different approaches to check Flask auth
  const results = {
    cookies: cookies,
    tests: []
  };
  
  // Test 1: Basic request without auth header
  try {
    const response1 = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    results.tests.push({
      name: 'Basic request (no auth header)',
      status: response1.status,
      statusText: response1.statusText,
      headers: Object.fromEntries(response1.headers),
      body: response1.status === 200 ? await response1.json() : await response1.text()
    });
  } catch (error) {
    results.tests.push({
      name: 'Basic request (no auth header)',
      error: error.message
    });
  }
  
  // Test 2: Check if we can access any unprotected endpoint
  try {
    const response2 = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
      credentials: 'include'
    });
    
    results.tests.push({
      name: 'Root endpoint check',
      status: response2.status,
      statusText: response2.statusText,
      body: await response2.text()
    });
  } catch (error) {
    results.tests.push({
      name: 'Root endpoint check',
      error: error.message
    });
  }
  
  // Test 3: Try to understand what Flask expects
  try {
    const response3 = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'OPTIONS',
      credentials: 'include'
    });
    
    results.tests.push({
      name: 'OPTIONS request to getASession',
      status: response3.status,
      headers: Object.fromEntries(response3.headers)
    });
  } catch (error) {
    results.tests.push({
      name: 'OPTIONS request to getASession',
      error: error.message
    });
  }
  
  console.log('Flask auth debug results:', results);
  return results;
};

export const checkFlaskAuthStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const sessionData = await response.json();
      console.log('Flask auth status: authenticated', sessionData);
      return { authenticated: true, session: sessionData };
    } else {
      console.log('Flask auth status: not authenticated', response.status);
      return { authenticated: false, status: response.status };
    }
  } catch (error) {
    console.error('Failed to check Flask auth status:', error);
    return { authenticated: false, error: error.message };
  }
};

export const startFlaskAuth = async (userId = 'default-user') => {
  try {
    // Instead of redirecting away, let's try to work with what we have
    console.log('Attempting Flask auth without redirect...');
    
    // Store user ID for later use
    localStorage.setItem('flask_user_id', userId);
    
    // Try to check if we already have a Flask session
    const sessionCheck = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Flask session check:', sessionCheck.status);
    
    if (sessionCheck.ok) {
      const sessionData = await sessionCheck.json();
      console.log('Existing Flask session found:', sessionData);
      return { authenticated: true, session: sessionData, method: 'existing-session' };
    } else {
      // No existing session, need to establish one
      console.log('No existing Flask session, need authentication');
      
      // Instead of redirecting, return information about what needs to happen
      const authUrl = `${API_BASE_URL}/login`;
      return { 
        authenticated: false, 
        authRequired: true,
        authUrl: authUrl,
        message: 'Flask authentication required. Open the auth URL in a new tab to authenticate, then return here.',
        method: 'manual-auth'
      };
    }
    
  } catch (error) {
    console.error('Failed to start Flask auth:', error);
    throw error;
  }
};

export const checkFlaskAuthWithMSAL = async () => {
  // Check if we have an MSAL token that we can try to use with Flask
  const msalToken = localStorage.getItem('msal_token');
  if (!msalToken) {
    console.log('No MSAL token available');
    return { authenticated: false, reason: 'No MSAL token' };
  }
  
  console.log('Testing MSAL token with Flask...');
  try {
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${msalToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Flask getASession response:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Flask session established:', result);
      return { authenticated: true, session: result };
    } else {
      const errorText = await response.text();
      console.log('Flask session error:', errorText);
      return { authenticated: false, error: errorText };
    }
  } catch (error) {
    console.log('Flask session request failed:', error);
    return { authenticated: false, error: error.message };
  }
};

export const testMixedAuth = async () => {
  console.log('=== Testing Mixed MSAL + Flask Authentication ===');
  
  // Step 1: Check if we have MSAL authentication
  console.log('1. Checking MSAL authentication...');
  const msalToken = localStorage.getItem('msal_token');
  console.log('MSAL token available:', msalToken ? 'Yes' : 'No');
  
  if (!msalToken) {
    console.log('❌ No MSAL token - user needs to authenticate with MSAL first');
    return;
  }
  
  // Step 2: Try to get Flask session using MSAL token
  console.log('2. Attempting to establish Flask session with MSAL token...');
  const flaskAuth = await checkFlaskAuthWithMSAL();
  console.log('Flask authentication result:', flaskAuth);
  
  if (flaskAuth.authenticated) {
    console.log('✅ Success! MSAL token works with Flask');
    
    // Step 3: Test API call with Flask session
    console.log('3. Testing Flask API call...');
    try {
      const apiResponse = await fetch(`${API_BASE_URL}/api/get_conversations`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API call status:', apiResponse.status);
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        console.log('✅ API call successful:', data);
      } else {
        const errorText = await apiResponse.text();
        console.log('❌ API call failed:', errorText);
      }
    } catch (error) {
      console.log('❌ API call error:', error);
    }
  } else {
    console.log('❌ Flask authentication failed:', flaskAuth.error || flaskAuth.reason);
    console.log('💡 This might be a token validation issue on the Flask side');
  }
};

export const useCurrentMSALForFlask = async () => {
  console.log('=== Attempting to use current MSAL token with Flask ===');
  
  const msalToken = localStorage.getItem('msal_token');
  if (!msalToken) {
    console.log('❌ No MSAL token found');
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${msalToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Flask session established:', result);
      
      // Now the session cookie should be set, test an API call
      const apiTest = await fetch(`${API_BASE_URL}/api/get_conversations`, {
        method: 'GET',
        credentials: 'include'
      });
      
      console.log('API test result:', apiTest.status);
      if (apiTest.ok) {
        const conversations = await apiTest.json();
        console.log('✅ Got conversations:', conversations);
        return true;
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Flask rejected MSAL token:', errorText);
    }
  } catch (error) {
    console.log('❌ Request failed:', error);
  }
  
  return false;
};

export const testFlaskEndpoints = async () => {
  const API_BASE_URL = 'https://ettsc-dev-app.azurewebsites.net';
  
  console.log('=== Testing Flask Endpoints ===');
  
  // Test 1: Check if server is responding
  console.log('1. Testing server connectivity...');
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      credentials: 'include'
    });
    console.log('Server response status:', response.status);
  } catch (error) {
    console.log('Server connectivity error:', error);
  }
  
  // Test 2: Check auth status endpoint
  console.log('2. Testing auth status endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/status?user_id=test-user`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Auth status response:', response.status);
    const text = await response.text();
    console.log('Auth status body:', text);
  } catch (error) {
    console.log('Auth status error:', error);
  }
  
  // Test 3: Check login endpoint
  console.log('3. Testing login endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login?user_id=test-user`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Login endpoint response:', response.status);
    const text = await response.text();
    console.log('Login endpoint body:', text);
  } catch (error) {
    console.log('Login endpoint error:', error);
  }
  
  // Test 4: Check the original /getASession endpoint
  console.log('4. Testing /getASession endpoint...');
  try {
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('/getASession response:', response.status);
    const text = await response.text();
    console.log('/getASession body:', text);
  } catch (error) {
    console.log('/getASession error:', error);
  }
};

// CONVERSATION TESTING FUNCTIONS
export const testCreateConversation = async () => {
  try {
    console.log('🆕 Testing create conversation...');
    const result = await createConversation();
    
    // Store conversation ID in sessionStorage for other tests
    sessionStorage.setItem('test_conversation_id', result.conversation_id);
    
    return {
      success: true,
      message: 'Conversation created successfully!',
      data: result,
      conversation_id: result.conversation_id
    };
  } catch (error) {
    console.error('❌ Create conversation test failed:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

export const testSendMessage = async (customMessage) => {
  try {
    const message = customMessage || "Hello, this is a test message from the React frontend!";
    let conversationId = sessionStorage.getItem('test_conversation_id');
    
    // If no conversation ID stored, create one first
    if (!conversationId) {
      console.log('No conversation ID found, creating new conversation first...');
      const createResult = await createConversation();
      conversationId = createResult.conversation_id;
      sessionStorage.setItem('test_conversation_id', conversationId);
    }
    
    console.log(`💬 Testing send message to conversation ${conversationId}...`);
    const result = await sendMessage(conversationId, message);
    
    return {
      success: true,
      message: 'Message sent successfully and AI responded!',
      data: result,
      conversation_id: conversationId,
      user_message: result.user_message,
      ai_response: result.ai_response
    };
  } catch (error) {
    console.error('❌ Send message test failed:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

export const testFullConversationFlow = async () => {
  try {
    console.log('🎯 Testing full conversation flow...');
    
    // Step 1: Create conversation
    console.log('Step 1: Creating conversation...');
    const createResult = await createConversation();
    const conversationId = createResult.conversation_id;
    
    // Step 2: Send first message
    console.log('Step 2: Sending first message...');
    const msg1Result = await sendMessage(conversationId, "Hello! Can you help me test this chat system?");
    
    // Step 3: Send follow-up message
    console.log('Step 3: Sending follow-up message...');
    const msg2Result = await sendMessage(conversationId, "What can you tell me about OAuth authentication?");
    
    // Step 4: Get all messages
    console.log('Step 4: Retrieving all messages...');
    const messagesResult = await getMessages(conversationId);
    
    // Step 5: Get all conversations
    console.log('Step 5: Retrieving all conversations...');
    const conversationsResult = await getConversations();
    
    return {
      success: true,
      message: 'Full conversation flow completed successfully!',
      data: {
        conversation: createResult,
        message1: msg1Result,
        message2: msg2Result,
        allMessages: messagesResult,
        allConversations: conversationsResult
      },
      summary: {
        conversation_id: conversationId,
        total_messages: messagesResult.messages.length,
        total_conversations: conversationsResult.conversations.length
      }
    };
  } catch (error) {
    console.error('❌ Full conversation flow test failed:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

// Add to window for testing
if (typeof window !== 'undefined') {
  window.analyzeTokenMismatch = analyzeTokenMismatch;
  window.tryCustomAudienceToken = tryCustomAudienceToken;
  window.createFlaskCompatibleAuth = createFlaskCompatibleAuth;
  window.analyzeSignatureError = analyzeSignatureError;
  window.tryDifferentTokenFormats = tryDifferentTokenFormats;
  window.createMockFlaskAuth = createMockFlaskAuth;
  window.testMSALTokenWithGetASession = testMSALTokenWithGetASession;
  window.getFlaskToken = getFlaskToken;
  window.testFlaskTokenWithGetASession = testFlaskTokenWithGetASession;
  window.analyzeSuccessfulFlaskToken = analyzeSuccessfulFlaskToken;
  window.testFlaskConversationEndpoints = testFlaskConversationEndpoints;
  window.testWithFlaskSession = testWithFlaskSession;
  window.testFlaskServerAuth = testFlaskServerAuth;
  window.testMCPPattern = testMCPPattern;
  window.investigate500Error = investigate500Error;
  window.debugMSALTokenForFlask = debugMSALTokenForFlask;
  window.testGetSessionPurpose = testGetSessionPurpose;
  window.rethinkFlaskAuth = rethinkFlaskAuth;
  window.analyzeFlaskAuthProblem = analyzeFlaskAuthProblem;
  window.findAlternativeFlaskEndpoints = findAlternativeFlaskEndpoints;
  window.investigateFlaskAuth = investigateFlaskAuth;
  window.tryAlternativeFlaskAuth = tryAlternativeFlaskAuth;
  window.handleFlaskAuthReturn = handleFlaskAuthReturn;
  window.testWithFlaskBearerToken = testWithFlaskBearerToken;
  window.explainFlaskAuth = explainFlaskAuth;
  window.testWithAuthHeader = testWithAuthHeader;
  window.simpleFlaskAuthFlow = simpleFlaskAuthFlow;
  window.quickFlaskCheck = quickFlaskCheck;
  window.startFlaskAuth = startFlaskAuth;
  window.getFlaskAuthUrl = getFlaskAuthUrl;
  window.openFlaskAuthTab = openFlaskAuthTab;
  window.tryFlaskDirectLogin = tryFlaskDirectLogin;
  window.checkForFlaskSession = checkForFlaskSession;
  window.openFlaskAuthPopup = openFlaskAuthPopup;
  window.debugFlaskAuth = debugFlaskAuth;
  window.checkFlaskAuthStatus = checkFlaskAuthStatus;
  window.checkFlaskAuthWithMSAL = checkFlaskAuthWithMSAL;
  window.testMixedAuth = testMixedAuth;
  window.useCurrentMSALForFlask = useCurrentMSALForFlask;
  window.testFlaskEndpoints = testFlaskEndpoints;
  
}

// Add to window for testing
if (typeof window !== 'undefined') {
  window.analyzeTokenMismatch = analyzeTokenMismatch;
  window.tryCustomAudienceToken = tryCustomAudienceToken;
  window.createFlaskCompatibleAuth = createFlaskCompatibleAuth;
  window.analyzeSignatureError = analyzeSignatureError;
  window.tryDifferentTokenFormats = tryDifferentTokenFormats;
  window.createMockFlaskAuth = createMockFlaskAuth;
  window.testMSALTokenWithGetASession = testMSALTokenWithGetASession;
  window.getFlaskToken = getFlaskToken;
  window.testFlaskTokenWithGetASession = testFlaskTokenWithGetASession;
  window.analyzeSuccessfulFlaskToken = analyzeSuccessfulFlaskToken;
  window.testFlaskConversationEndpoints = testFlaskConversationEndpoints;
  window.testWithFlaskSession = testWithFlaskSession;
  window.testFlaskServerAuth = testFlaskServerAuth;
  window.testMCPPattern = testMCPPattern;
  window.investigate500Error = investigate500Error;
  window.debugMSALTokenForFlask = debugMSALTokenForFlask;
  window.testGetSessionPurpose = testGetSessionPurpose;
  window.rethinkFlaskAuth = rethinkFlaskAuth;
  window.analyzeFlaskAuthProblem = analyzeFlaskAuthProblem;
  window.findAlternativeFlaskEndpoints = findAlternativeFlaskEndpoints;
  window.investigateFlaskAuth = investigateFlaskAuth;
  window.tryAlternativeFlaskAuth = tryAlternativeFlaskAuth;
  window.handleFlaskAuthReturn = handleFlaskAuthReturn;
  window.testWithFlaskBearerToken = testWithFlaskBearerToken;
  window.explainFlaskAuth = explainFlaskAuth;
  window.testWithAuthHeader = testWithAuthHeader;
  window.simpleFlaskAuthFlow = simpleFlaskAuthFlow;
  window.quickFlaskCheck = quickFlaskCheck;
  window.startFlaskAuth = startFlaskAuth;
  window.getFlaskAuthUrl = getFlaskAuthUrl;
  window.openFlaskAuthTab = openFlaskAuthTab;
  window.tryFlaskDirectLogin = tryFlaskDirectLogin;
  window.checkForFlaskSession = checkForFlaskSession;
  window.openFlaskAuthPopup = openFlaskAuthPopup;
  window.debugFlaskAuth = debugFlaskAuth;
  window.checkFlaskAuthStatus = checkFlaskAuthStatus;
  window.checkFlaskAuthWithMSAL = checkFlaskAuthWithMSAL;
  window.testMixedAuth = testMixedAuth;
  window.useCurrentMSALForFlask = useCurrentMSALForFlask;
  window.testFlaskEndpoints = testFlaskEndpoints;
  
  // Conversation functions for testing
  window.testCreateConversation = testCreateConversation;
  window.testSendMessage = testSendMessage;
  window.testFullConversationFlow = testFullConversationFlow;
}
