import { useState } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearching(true);
    setTimeout(() => {
      setResults([
        { title: "Quarterly Report Q3.pdf", score: 0.98, snippet: "...revenue growth exceeded expectations in Q3 due to..." },
        { title: "Employee Handbook.docx", score: 0.85, snippet: "...policies regarding remote work and compensation..." },
        { title: "Project Alpha Specs.txt", score: 0.76, snippet: "...technical specifications for the new API endpoints..." },
      ]);
      setSearching(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-12 flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-400">
          Smart Search Engine
        </h1>
        <a href="/tools/" className="text-slate-400 hover:text-white transition-colors">
          Back to Portal
        </a>
      </header>

      <main className="max-w-3xl mx-auto space-y-8">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search across all knowledge bases..."
            className="w-full bg-slate-800 border border-slate-700 rounded-full py-4 px-6 pl-12 text-lg focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-lg shadow-black/50"
          />
          <svg className="w-6 h-6 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <button
            onClick={handleSearch}
            className="absolute right-2 top-2 bottom-2 bg-orange-600 hover:bg-orange-500 text-white px-6 rounded-full font-medium transition-colors"
          >
            Search
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {searching ? (
            <div className="text-center text-slate-500 animate-pulse">Searching vector database...</div>
          ) : results.length > 0 ? (
            results.map((res, idx) => (
              <div key={idx} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-orange-500/50 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-semibold text-orange-200">{res.title}</h3>
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{(res.score * 100).toFixed(0)}% match</span>
                </div>
                <p className="text-slate-400 text-sm">
                  {res.snippet}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center text-slate-600 mt-12">
              Search specifically or typically use semantic matching for broad queries.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
