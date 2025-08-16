// API configuration
const API_BASE_URL = 'https://ettsc-dev-app.azurewebsites.net';

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('msal_token'); // Use MSAL token instead
  
  try {
    if (token) {
      // For Entra ID integration, you might want to send the token to your Flask backend
      // to validate and establish a session, or use it directly for API authorization
      const sessionResponse = await fetch(`${API_BASE_URL}/api/auth/msal`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!sessionResponse.ok) {
        console.warn(`MSAL token validation failed: ${sessionResponse.status}`);
      }
    }
    
    // Now make the actual request with session established
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    });
    
    return response;
  } catch (error) {
    // Enhanced error handling
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
};

// Real API for chat messages
export const chatApi = {
  async fetchMessages(conversationId) {
    const url = conversationId 
      ? `${API_BASE_URL}/api/messages/${conversationId}`
      : `${API_BASE_URL}/api/messages`;
    
    const response = await makeAuthenticatedRequest(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  
  async sendMessage(message, conversationId) {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/messages`, {
      method: 'POST',
      body: JSON.stringify({ 
        text: message,
        conversationId: conversationId 
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  
  // Note: Login/logout are now handled by MSAL, not by custom API calls
  // These methods can be removed or used for additional backend integration
  
  async validateMsalToken(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });
      
      if (!response.ok) {
        throw new Error(`Token validation failed: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to server for token validation.');
      }
      throw error;
    }
  }
};