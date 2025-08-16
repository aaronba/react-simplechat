import { useState, useEffect, createContext, useContext } from 'react';

const ConversationsContext = createContext();

export function useConversations() {
  return useContext(ConversationsContext);
}

// Add API calls for conversations
const conversationsApi = {
  async fetchConversations() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return [];
    }
    
    try {
      // First establish session
      const sessionResponse = await fetch(`https://ettsc-dev-app.azurewebsites.net/getASession`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!sessionResponse.ok) {
        throw new Error(`Session establishment failed: ${sessionResponse.status}`);
      }
      
      const response = await fetch(`https://ettsc-dev-app.azurewebsites.net/api/conversations`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  async createConversation() {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    
    // First establish session
    await fetch(`https://ettsc-dev-app.azurewebsites.net/getASession`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const response = await fetch(`https://ettsc-dev-app.azurewebsites.net/api/conversations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

export function ConversationsProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await conversationsApi.fetchConversations();
        setConversations(data);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
        setError(err.message);
        // Fallback to demo data when API fails (useful for development)
        setConversations([
          { id: 1, summary: 'Demo: Welcome to the chat!' },
          { id: 2, summary: 'Demo: Q&A about your project' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  // Add a new conversation and return its id
  const addConversation = async () => {
    try {
      const newConversation = await conversationsApi.createConversation();
      setConversations(prev => [...prev, newConversation]);
      return newConversation.id;
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError(err.message);
      throw err;
    }
  };

  return (
    <ConversationsContext.Provider value={{ 
      conversations, 
      setConversations, 
      addConversation, 
      loading, 
      error 
    }}>
      {children}
    </ConversationsContext.Provider>
  );
}
