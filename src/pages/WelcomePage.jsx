export default function WelcomePage({ darkMode }) {
  const handleStartChatting = () => {
    // Navigate to the chat page
    window.location.href = '/chat';
  };

  return (
    <div className={`flex-1 flex flex-col items-center justify-center px-8 ${
      darkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-5xl font-light mb-8">Welcome to Simple Chat</h1>
        
        <div className="mb-12 text-lg space-y-4">
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            You can add text here and it supports Markdown. You agree to our{' '}
            <a 
              href="#" 
              className={`underline ${
                darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              acceptable user policy
            </a>{' '}
            by using this service.
          </p>
        </div>

        <button
          onClick={handleStartChatting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
        >
          Start Chatting
        </button>
      </div>
    </div>
  );
}
