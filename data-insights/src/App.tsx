import { useState } from 'react';

function App() {
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);

  const handleUpload = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setInsights("Analysis Complete. Key trends identified: \n1. User growth increased by 15% WoW.\n2. Retention rates are highest in the enterprise cohort.\n3. Churn risk detected in the freemium segment.");
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          Data Insights Generator
        </h1>
        <a href="/tools/" className="text-slate-400 hover:text-white transition-colors">
          Back to Portal
        </a>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar / Upload */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="font-semibold mb-4 text-slate-300">Data Source</h2>
            <div
              onClick={handleUpload}
              className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:bg-slate-700/50 cursor-pointer transition-all"
            >
              <span className="text-sm text-slate-400">Upload CSV / Excel</span>
            </div>
            <button
              onClick={handleUpload}
              disabled={analyzing}
              className="w-full mt-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
            >
              {analyzing ? 'Analyzing...' : 'Generate Insights'}
            </button>
          </div>
        </div>

        {/* Dashboard Placeholder */}
        <div className="md:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-slate-400 text-xs">Total Rows</div>
              <div className="text-2xl font-bold text-white">24,593</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-slate-400 text-xs">Columns</div>
              <div className="text-2xl font-bold text-white">42</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="text-slate-400 text-xs">Data Quality</div>
              <div className="text-2xl font-bold text-emerald-400">98%</div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 min-h-[300px] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500 via-slate-900 to-slate-900"></div>
            {analyzing ? (
              <div className="text-purple-400 animate-pulse">Running Agentic Analysis...</div>
            ) : insights ? (
              <div className="text-left w-full space-y-2">
                <h3 className="text-lg font-bold text-purple-300 mb-4">AI Executive Summary</h3>
                <pre className="font-sans whitespace-pre-wrap text-slate-300">{insights}</pre>
              </div>
            ) : (
              <div className="text-slate-500">Wait for data upload...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
