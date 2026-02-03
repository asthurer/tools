import { useState } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = () => {
    if (!query.trim()) return;
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setAnswer("This is a simulated answer based on the document context. In a real implementation, this would retrieve relevant chunks from a vector database and generate a response using an LLM.");
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
          Document Q&A Assistant
        </h1>
        <a href="/tools/" className="text-slate-400 hover:text-white transition-colors">
          Back to Portal
        </a>
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        {/* Upload Section Placeholder */}
        <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer">
          <div className="text-slate-400">
            <p className="text-lg font-medium">Drop PDF or Docx here</p>
            <p className="text-sm mt-2">to index knowledge base</p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-slate-800 rounded-xl p-6 min-h-[400px] flex flex-col">
          <div className="flex-1 space-y-4 mb-6 text-sm">
            <div className="flex justify-start">
              <div className="bg-slate-700/50 rounded-lg p-3 max-w-[80%]">
                Hello! Upload a document and ask me anything about it.
              </div>
            </div>
            {answer && (
              <div className="flex justify-start">
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 max-w-[80%] text-blue-100">
                  {answer}
                </div>
              </div>
            )}
            {loading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onClick={handleAsk}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
