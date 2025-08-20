import { useEffect, useState, createContext, useContext } from 'react';
import { chatApi, conversationsApi, establishFlaskSession, sendMessage, getMessages, createConversation } from '../api.js';
import { useConversations } from './ConversationsProvider.jsx';

const MessagesContext = createContext();

export function useMessages() {
  return useContext(MessagesContext);
}

export function MessagesProvider({ selectedId, children }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { updateConversation } = useConversations();

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load messages from the real backend
        const response = await getMessages(selectedId);
        const conversationMessages = response.messages || response || [];
        setMessages(conversationMessages);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        setError(err.message);
        // Keep empty array if API fails
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedId]);

  // Allow adding a message to the current conversation
  const addMessage = async (text) => {
    let conversationId = selectedId;
    
    // If no conversation is selected, create a new one first
    if (!conversationId) {
      console.log('No conversation selected, creating a new one...');
      try {
        const newConversation = await createConversation();
        conversationId = newConversation.id || newConversation.conversation_id;
        console.log('Created new conversation:', conversationId);
        
        // Update the conversations list
        updateConversation(conversationId, newConversation);
      } catch (error) {
        console.error('Failed to create conversation:', error);
        // Fall back to temp ID if conversation creation fails
        conversationId = 'temp-' + Date.now();
      }
    }
    
    try {
      // First, add the user message optimistically
      const userMessage = {
        id: Date.now(),
        user: 'You',
        text: text,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, userMessage]);
      
      // Send message to the real backend
      const response = await sendMessage(conversationId, text);
      
      // Add the AI response to the messages
      if (response && response.response) {
        const aiResponse = {
          id: Date.now() + 1,
          user: 'AI (gpt-4o)',
          text: response.response,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, aiResponse]);
      }
      
      return userMessage;
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message);
      throw err;
    }
  };

  return (
    <MessagesContext.Provider value={{ messages, setMessages, addMessage, loading, error }}>
      {children}
    </MessagesContext.Provider>
  );
}
