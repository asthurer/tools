import { useState } from 'react';

function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const formatJson = () => {
    try {
      if (!input.trim()) {
        setOutput('');
        setError(null);
        return;
      }
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setOutput('');
    }
  };

  const minifyJson = () => {
    try {
      if (!input.trim()) return;
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setOutput('');
    }
  };

  const clearAll = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-mono">
      <header className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
          JSON Vision
        </h1>
        <div className="flex space-x-4">
          <a href="/tools/" className="text-slate-400 hover:text-white transition-colors">
            Back to Portal
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-12rem)]">
        {/* Input Column */}
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-400">Input JSON</label>
            <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300">Clear</button>
          </div>
          <textarea
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm"
            placeholder="Paste your messy JSON here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        {/* Output Column */}
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded-t-lg">
            <label className="text-sm font-semibold text-slate-400 pl-2">Output</label>
            <div className="space-x-2">
              <button
                onClick={formatJson}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium transition-colors"
              >
                Format
              </button>
              <button
                onClick={minifyJson}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
              >
                Minify
              </button>
            </div>
          </div>

          <div className={`flex-1 bg-slate-800 border ${error ? 'border-red-500' : 'border-slate-700'} rounded-b-lg p-4 overflow-auto relative font-mono text-sm`}>
            {error ? (
              <div className="text-red-400">
                <h3 className="font-bold mb-2">Invalid JSON</h3>
                <p>{error}</p>
              </div>
            ) : (
              <pre className="text-emerald-300 whitespace-pre-wrap breaks-all">
                {output}
              </pre>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
