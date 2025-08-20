import { useState, useEffect, createContext, useContext } from 'react';
import { conversationsApi, establishFlaskSession, getConversations } from '../api.js';

const ConversationsContext = createContext();

export function useConversations() {
  return useContext(ConversationsContext);
}

export function ConversationsProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load conversations from the real backend
        const data = await getConversations();
        // Flask returns conversations array or object with conversations array
        const conversationsList = Array.isArray(data) ? data : (data.conversations || []);
        setConversations(conversationsList);
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError(err.message);
        // Keep empty array if API fails
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  // Add a new conversation by sending first message
  const addConversation = async (initialMessage = null) => {
    try {
      // Flask creates conversations automatically when first message is sent
      // So we'll return a temporary ID that will be replaced when message is sent
      const tempConversation = {
        id: 'temp-' + Date.now(),
        title: 'New Conversation',
        last_updated: new Date().toISOString(),
        isTemporary: true
      };
      
      setConversations(prev => [...prev, tempConversation]);
      return tempConversation.id;
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update a conversation when it gets real data from backend
  const updateConversation = (conversationId, conversationData) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId ? { ...conv, ...conversationData } : conv
      )
    );
  };

  return (
    <ConversationsContext.Provider value={{ 
      conversations, 
      setConversations, 
      addConversation,
      updateConversation,
      loading, 
      error 
    }}>
      {children}
    </ConversationsContext.Provider>
  );
}
