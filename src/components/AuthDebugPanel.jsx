import React, { useState } from 'react';

const AuthDebugPanel = () => {
  const [output, setOutput] = useState('');

  const runFlaskFunction = async (functionName) => {
    if (window[functionName]) {
      setOutput('Running ' + functionName + '...');
      try {
        const result = await window[functionName]();
        setOutput(JSON.stringify(result, null, 2));
      } catch (error) {
        setOutput('Error: ' + error.message);
      }
    } else {
      setOutput('Function ' + functionName + ' not available');
    }
  };

  const runTestFunction = async (functionName) => {
    if (window[functionName]) {
      setOutput('Running ' + functionName + '...');
      try {
        const result = await window[functionName]();
        setOutput(JSON.stringify(result, null, 2));
      } catch (error) {
        setOutput('Error: ' + error.message);
      }
    } else {
      setOutput('Function ' + functionName + ' not available');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-md">
      <h3 className="text-lg font-bold mb-2">Auth Debug Panel</h3>
      
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-700 mb-2">Flask Authentication:</div>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => runFlaskFunction('testFlaskServerAuth')}
            className="px-4 py-2 bg-indigo-600 text-white rounded font-medium"
          >
            🎯 Full Flask Auth Test
          </button>
          
          <button 
            onClick={() => runFlaskFunction('analyzeSuccessfulFlaskToken')}
            className="px-4 py-2 bg-blue-500 text-white rounded font-medium"
          >
            📊 Analyze Token
          </button>
        </div>

        <div className="flex space-x-2 mt-2">
          <button 
            onClick={() => runFlaskFunction('testWithFlaskSession')}
            className="px-4 py-2 bg-orange-600 text-white rounded font-medium"
          >
            🍪 Test with Session
          </button>
        </div>
        
        <div className="text-sm font-semibold text-gray-700 mt-4 mb-2">Conversation Testing:</div>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => runTestFunction('testCreateConversation')}
            className="px-4 py-2 bg-green-600 text-white rounded font-medium"
          >
            🆕 Create Conversation
          </button>
          
          <button 
            onClick={() => runTestFunction('testSendMessage')}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium"
          >
            💬 Send Message
          </button>
        </div>
        
        <div className="flex space-x-2 mt-2">
          <button 
            onClick={() => runTestFunction('testFullConversationFlow')}
            className="px-4 py-2 bg-purple-700 text-white rounded font-medium"
          >
            🎯 Full Flow Test
          </button>
        </div>
      </div>

      {output && (
        <div className="mt-4 p-3 bg-gray-50 border rounded">
          <h4 className="font-bold mb-2 text-sm">Output:</h4>
          <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
};

export default AuthDebugPanel;