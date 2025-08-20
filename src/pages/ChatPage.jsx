import { useState, useEffect } from 'react';
import { useConversations } from '../providers/ConversationsProvider';
import { MessagesProvider, useMessages } from '../providers/MessagesProvider';
import ChatFooter from '../components/ChatFooter';
import ConversationList from '../components/ConversationList';
import ChatMain from '../components/ChatMain';

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5' },
];

export default function ChatPage({ darkMode, setDarkMode }) {
  const [selectedId, setSelectedId] = useState(null);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({});
  const { conversations, addConversation } = useConversations();

  useEffect(() => {
    if (conversations.length > 0 && selectedId == null) {
      const firstId = conversations[0].id;
      setSelectedId(firstId);
    }
  }, [conversations, selectedId]);

  const handleNewChat = () => {
    const newId = addConversation();
    setSelectedId(newId);
  };

  return (
    <div className={
      `flex flex-1 min-h-0 min-w-0 overflow-hidden h-full` +
      (darkMode ? ' bg-gray-900' : ' bg-white')
    } style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <ConversationList
        onSelect={setSelectedId}
        selectedId={selectedId}
        onNew={handleNewChat}
        onMenu={() => {}}
        darkMode={darkMode}
      />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full">
        <div className="flex flex-col flex-1 min-h-0 min-w-0 h-full">
          <div className={
            `flex items-center px-6 pt-4 pb-2` +
            (darkMode ? ' bg-gray-900' : ' bg-white')
          }>
            <div className="relative">
              <select
                id="model-select"
                value={model}
                onChange={e => setModel(e.target.value)}
                className={
                  `appearance-none rounded-full px-4 py-2 border focus:outline-none shadow-sm transition-colors ` +
                  (darkMode
                    ? 'bg-gray-800 border-gray-700 text-gray-100 hover:bg-gray-700'
                    : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200')
                }
                style={{ minWidth: 130, fontWeight: 500 }}
              >
                {MODEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <MessagesProvider selectedId={selectedId}>
            <ChatPageContent
              input={input}
              setInput={setInput}
              loading={loading}
              setLoading={setLoading}
              model={model}
              feedback={feedback}
              setFeedback={setFeedback}
              darkMode={darkMode}
            />
          </MessagesProvider>
        </div>
      </div>
    </div>
  );
}

// Component that has access to MessagesProvider context
function ChatPageContent({ 
  input, 
  setInput, 
  loading, 
  setLoading, 
  model, 
  feedback, 
  setFeedback, 
  darkMode 
}) {
  const { addMessage } = useMessages();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const messageText = input.trim();
    setInput('');
    setLoading(true);

    try {
      console.log('Sending message:', messageText);
      await addMessage(messageText);
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
      // On error, put the text back
      setInput(messageText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <ChatMain
        feedback={feedback}
        onFeedback={setFeedback}
        darkMode={darkMode}
        ChatFooterProps={{ 
          onSend: handleSend,
          input, 
          setInput, 
          loading, 
          model 
        }}
      />
    </div>
  );
}
