// API configuration - pointing to production SimpleChat App Service
const API_BASE_URL = 'https://ettsc-dev-app.azurewebsites.net';

// Function to establish Flask session using MSAL token
export const establishFlaskSession = async () => {
  const token = localStorage.getItem('msal_token');
  if (!token) {
    throw new Error('No MSAL token available');
  }

  console.log('Attempting to establish Flask session with token:', token.substring(0, 50) + '...');

  try {
    // Use GET request to /getASession as per Flask backend
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Flask session response status:', response.status);
    
    if (!response.ok) {
      const responseText = await response.text();
      console.log('Flask session error response:', responseText);
      throw new Error(`Failed to establish Flask session: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Flask session established successfully:', result);
    return result;
  } catch (error) {
    console.error('Error establishing Flask session:', error);
    throw error;
  }
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('msal_token');
  
  try {
    // First, ensure we have a Flask session established using the MSAL token
    if (token) {
      try {
        const sessionResponse = await fetch(`${API_BASE_URL}/getASession`, {
          method: 'GET',
          credentials: 'include',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!sessionResponse.ok) {
          console.warn(`Session establishment failed: ${sessionResponse.status}`);
        }
      } catch (sessionError) {
        console.warn('Failed to establish Flask session:', sessionError);
      }
    }

    // Now make the actual request with session cookies
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // This ensures session cookies are included
      headers: {
        'Content-Type': 'application/json',
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
      ? `${API_BASE_URL}/conversation/${conversationId}/messages`
      : `${API_BASE_URL}/conversations`;
    
    const response = await makeAuthenticatedRequest(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  
  async sendMessage(message, conversationId, options = {}) {
    const requestBody = { 
      message: message,
      conversation_id: conversationId,
      hybrid_search: options.hybridSearch || false,
      selected_document_id: options.selectedDocumentId || null,
      bing_search: options.bingSearch || false,
      image_generation: options.imageGeneration || false,
      doc_scope: options.docScope || 'personal',
      active_group_id: options.activeGroupId || null,
      model_deployment: options.modelDeployment || null,
      top_n: options.topN || null,
      classifications: options.classifications || null,
      chat_type: options.chatType || 'user'
    };

    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      body: JSON.stringify(requestBody)
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

// API for conversations management
export const conversationsApi = {
  async fetchConversations() {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/conversations`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  
  async fetchConversationMessages(conversationId) {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/conversation/${conversationId}/messages`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  
  async getMessageMetadata(messageId) {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/message/${messageId}/metadata`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

// CONVERSATION API FUNCTIONS

// Helper function to get authentication headers (for /getASession only)
const getAuthHeaders = () => {
  const token = localStorage.getItem('msal_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Helper function to get basic headers (for API calls after session is established)
const getBasicHeaders = () => {
  return {
    'Content-Type': 'application/json'
  };
};

// Establish Flask session using Microsoft token
export const establishSession = async () => {
  console.log('🔐 Establishing Flask session...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/getASession`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to establish session: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Flask session established:', data);
    return data;
  } catch (error) {
    console.error('❌ Session establishment error:', error);
    throw error;
  }
};

// Create a new conversation
export const createConversation = async () => {
  console.log('Creating new conversation...');
  
  try {
    // First ensure Flask session is established
    await establishSession();
    
    const response = await fetch(`${API_BASE_URL}/api/create_conversation`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders() // Use auth headers with Bearer token
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create conversation: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Conversation created:', data);
    return data;
  } catch (error) {
    console.error('❌ Create conversation error:', error);
    throw error;
  }
};

// Get all conversations for the user
export const getConversations = async () => {
  console.log('Getting conversations...');
  
  try {
    // First ensure Flask session is established
    await establishSession();
    
    const response = await fetch(`${API_BASE_URL}/api/get_conversations`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders() // Use auth headers with Bearer token
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get conversations: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Conversations retrieved:', data);
    return data;
  } catch (error) {
    console.error('❌ Get conversations error:', error);
    throw error;
  }
};

// Get messages for a specific conversation
export const getMessages = async (conversationId) => {
  console.log(`Getting messages for conversation ${conversationId}...`);
  
  try {
    // First ensure Flask session is established
    await establishSession();
    
    const response = await fetch(`${API_BASE_URL}/api/get_messages?conversation_id=${conversationId}`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders() // Use auth headers with Bearer token
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get messages: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Messages retrieved:', data);
    return data;
  } catch (error) {
    console.error('❌ Get messages error:', error);
    throw error;
  }
};

// Send a message to a conversation
export const sendMessage = async (conversationId, message) => {
  console.log(`Sending message to conversation ${conversationId}: "${message}"`);
  
  try {
    // First ensure Flask session is established
    await establishSession();
    
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(), // Use auth headers with Bearer token
      body: JSON.stringify({
        conversation_id: conversationId,
        message: message
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to send message: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Message sent and AI response received:', data);
    return data;
  } catch (error) {
    console.error('❌ Send message error:', error);
    throw error;
  }
};