import { useEffect, useState, createContext, useContext } from 'react';
import { chatApi } from '../api.js';

const MessagesContext = createContext();

export function useMessages() {
  return useContext(MessagesContext);
}

export function MessagesProvider({ selectedId, children }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const conversationMessages = await chatApi.fetchMessages(selectedId);
        setMessages(conversationMessages);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        setError(err.message);
        // Fallback to demo data when API fails
        const demoMessages = {
          1: [
            { id: 101, user: 'You', text: 'Hello! This is a demo conversation.' },
            { id: 102, user: 'AI', text: 'Hi! I\'m a demo AI response. The real API is not connected yet.' },
          ],
          2: [
            { id: 201, user: 'You', text: 'Show me project Q&A' },
            { id: 202, user: 'AI', text: 'This is demo Q&A data. Connect to your Flask backend to see real data.' },
          ],
        };
        setMessages(demoMessages[selectedId] || []);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedId]);

  // Allow adding a message to the current conversation
  const addMessage = async (text) => {
    try {
      const newMessage = await chatApi.sendMessage(text);
      setMessages((prev) => [...prev, newMessage]);
      return newMessage;
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
