import { createContext, useContext, useState, useEffect } from 'react';

const GroupWorkspaceContext = createContext();

// Real API calls
const groupApi = {
  async makeAuthenticatedRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    
    if (token) {
      // First, establish session from token
      await fetch(`https://ettsc-dev-app.azurewebsites.net/getASession`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
    
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  },

  async fetchGroups() {
    const response = await this.makeAuthenticatedRequest('https://ettsc-dev-app.azurewebsites.net/api/groups');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async fetchDocuments(groupId) {
    if (!groupId) return [];
    const response = await this.makeAuthenticatedRequest(`https://ettsc-dev-app.azurewebsites.net/api/groups/${groupId}/documents`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async fetchPrompts(groupId) {
    if (!groupId) return [];
    const response = await this.makeAuthenticatedRequest(`https://ettsc-dev-app.azurewebsites.net/api/groups/${groupId}/prompts`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
};

export default function GroupWorkspaceProvider({ children }) {
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadGroups = async () => {
      setLoadingGroups(true);
      setError(null);
      try {
        const data = await groupApi.fetchGroups();
        setGroups(data);
        setActiveGroupId(data[0]?.id || null);
      } catch (err) {
        console.error('Failed to fetch groups:', err);
        setError(err.message);
        setGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();
  }, []);

  useEffect(() => {
    if (!activeGroupId) return;

    const loadDocuments = async () => {
      setLoadingDocuments(true);
      try {
        const docs = await groupApi.fetchDocuments(activeGroupId);
        setDocuments(docs);
      } catch (err) {
        console.error('Failed to fetch documents:', err);
        setDocuments([]);
      } finally {
        setLoadingDocuments(false);
      }
    };

    const loadPrompts = async () => {
      setLoadingPrompts(true);
      try {
        const promptsData = await groupApi.fetchPrompts(activeGroupId);
        setPrompts(promptsData);
      } catch (err) {
        console.error('Failed to fetch prompts:', err);
        setPrompts([]);
      } finally {
        setLoadingPrompts(false);
      }
    };

    loadDocuments();
    loadPrompts();
  }, [activeGroupId]);

  return (
    <GroupWorkspaceContext.Provider value={{
      groups, activeGroupId, setActiveGroupId, loadingGroups,
      documents, loadingDocuments,
      prompts, loadingPrompts,
      error
    }}>
      {children}
    </GroupWorkspaceContext.Provider>
  );
}

export function useGroupWorkspace() {
  return useContext(GroupWorkspaceContext);
}
