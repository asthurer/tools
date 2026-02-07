import { useState, useEffect } from 'react';
import type { AISettings, IndexedDocument, SearchResult } from './types';
import { DEFAULT_SETTINGS } from './types';
import { semanticSearch } from './services/search';
import { loadSettings, saveSettings, loadIndex, saveIndex } from './services/storage';
import { Settings } from './components/Settings';
import { FileIndexer } from './components/FileIndexer';
import { SearchResults } from './components/SearchResults';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    setSettings(loadSettings());
    setDocuments(loadIndex());
  }, []);

  // Save documents when they change
  useEffect(() => {
    saveIndex(documents);
  }, [documents]);

  const handleSaveSettings = (newSettings: AISettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    if (!settings.apiKey) {
      setError('Please configure your API key in settings first.');
      return;
    }

    if (documents.length === 0) {
      setError('No documents indexed. Add files to search.');
      return;
    }

    setError(null);
    setSearching(true);

    try {
      const searchResults = await semanticSearch(query, documents, settings);
      setResults(searchResults);
    } catch (e: any) {
      setError(e.message || 'Search failed. Please check your settings.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-400">
            Smart Search Engine
          </h1>
          <div className="flex items-center gap-3">
            <a href="/tools/" className="text-slate-400 hover:text-white transition-colors text-sm">
              ← Portal
            </a>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - File Indexer */}
          <div className="lg:col-span-1">
            <FileIndexer
              documents={documents}
              settings={settings}
              onDocumentsChange={setDocuments}
            />
          </div>

          {/* Main Content - Search */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search with natural language..."
                className="w-full bg-slate-800 border border-slate-700 rounded-full py-4 px-6 pl-12 text-lg focus:ring-2 focus:ring-orange-500 focus:outline-none shadow-lg shadow-black/30"
              />
              <svg className="w-6 h-6 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="absolute right-2 top-2 bottom-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 text-white px-6 rounded-full font-medium transition-colors"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Results */}
            <SearchResults
              results={results}
              searching={searching}
              hasQuery={query.trim().length > 0 && results.length > 0 || searching}
            />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
