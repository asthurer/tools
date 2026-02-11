import { useState, useEffect } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, usePanelRef } from 'react-resizable-panels';
import { ChatInterface } from './components/ChatInterface';
import { ResultsView } from './components/ResultsView';
import { generateSQL } from './services/ai';
import { executeSQL } from './utils/sqlRunner';
import { Settings, Sparkles, Database as DbIcon, ChevronLeft, Table, Sun, Moon } from 'lucide-react';
import { DataConnect } from './components/DataConnect';
import { DEFAULT_AI_SETTINGS, DEFAULT_DB_CONFIG, type AISettings, type DatabaseConfig, type QueryResult } from './types/settings';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  data?: any[];
  error?: string;
  vizConfig?: any;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'data'>('data');

  const chatPanelRef = usePanelRef();
  const resultsPanelRef = usePanelRef();
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isResultsCollapsed, setIsResultsCollapsed] = useState(false);

  // Load settings from localStorage
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('conversational_analytics_ai');
    return saved ? JSON.parse(saved) : DEFAULT_AI_SETTINGS;
  });

  const [dbConfig, setDbConfig] = useState<DatabaseConfig>(() => {
    const saved = localStorage.getItem('conversational_analytics_db');
    return saved ? JSON.parse(saved) : DEFAULT_DB_CONFIG;
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('conversational_analytics_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('conversational_analytics_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Persist settings
  useEffect(() => {
    localStorage.setItem('conversational_analytics_ai', JSON.stringify(aiSettings));
  }, [aiSettings]);

  useEffect(() => {
    localStorage.setItem('conversational_analytics_db', JSON.stringify(dbConfig));
  }, [dbConfig]);

  const updateAISetting = (key: keyof AISettings, value: string) => {
    setAiSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateDBSetting = (key: keyof DatabaseConfig, value: any) => {
    setDbConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSendMessage = async (content: string) => {
    if (!aiSettings.apiKey) {
      setShowSettings(true);
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content
    };

    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      // 2. Generate SQL and Visualization Config
      const aiResponse = await generateSQL(content, aiSettings);
      const generatedSQL = aiResponse.sql;

      // 3. Execute SQL
      const result = await executeSQL(generatedSQL, dbConfig);

      if (result.success) {
        if (result.data && result.data.length > 0) {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I found ${(result.data || []).length} results for your query.`,
            sql: generatedSQL,
            data: result.data,
            vizConfig: aiResponse.visualization
          }]);

          const newResult: QueryResult = {
            id: Date.now().toString(),
            query: content,
            sql: generatedSQL,
            data: result.data || [],
            vizConfig: aiResponse.visualization,
            timestamp: Date.now()
          };

          setResults(prev => [newResult, ...prev]);
          setActiveTab('results'); // Auto-switch to results
        } else {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `0 records returned for your query.`,
            sql: generatedSQL
          }]);
        }
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I ran into an issue executing that query.",
          sql: result.executedSQL,
          error: result.error
        }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't process your request.",
        error: error.message
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-foundry-950 text-foundry-200 font-sans flex flex-col overflow-hidden">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-foundry-900 border border-foundry-700 rounded-sm p-0 w-full max-w-2xl shadow-2xl my-8">
            <div className="bg-foundry-950 px-6 py-4 border-b border-foundry-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-foundry-100 uppercase tracking-widest flex items-center gap-2">
                <Settings size={16} className="text-accent-400" />
                System Configuration
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-foundry-500 hover:text-accent-danger transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* AI Configuration */}
              <div className="bg-foundry-950/50 rounded-sm p-4 border border-foundry-800">
                <h3 className="text-xs font-bold text-foundry-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sparkles size={14} className="text-accent-gold" />
                  AI Model Parameters
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <label className="col-span-3 text-xs font-bold text-foundry-500 uppercase">Provider</label>
                    <div className="col-span-9">
                      <select
                        value={aiSettings.provider}
                        onChange={(e) => updateAISetting('provider', e.target.value as any)}
                        className="w-full bg-foundry-900 border border-foundry-700 rounded-sm px-3 py-1.5 text-sm text-foundry-200 focus:outline-none focus:border-accent-500 font-mono"
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                        <option value="claude">Anthropic Claude</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4 items-center">
                    <label className="col-span-3 text-xs font-bold text-foundry-500 uppercase">Model ID</label>
                    <div className="col-span-9">
                      <input
                        type="text"
                        value={aiSettings.model}
                        onChange={(e) => updateAISetting('model', e.target.value)}
                        placeholder={aiSettings.provider === 'gemini' ? 'gemini-1.5-flash' : aiSettings.provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022'}
                        className="w-full bg-foundry-900 border border-foundry-700 rounded-sm px-3 py-1.5 text-sm text-foundry-200 focus:outline-none focus:border-accent-500 font-mono"
                      />
                      <p className="text-[10px] text-foundry-500 mt-1 font-mono">
                        {aiSettings.provider === 'gemini' && "Recommended: gemini-1.5-flash, gemini-1.5-pro"}
                        {aiSettings.provider === 'openai' && "Recommended: gpt-4o, gpt-4o-mini"}
                        {aiSettings.provider === 'claude' && "Recommended: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4 items-center">
                    <label className="col-span-3 text-xs font-bold text-foundry-500 uppercase">API Key</label>
                    <div className="col-span-9">
                      <input
                        type="password"
                        value={aiSettings.apiKey}
                        onChange={(e) => updateAISetting('apiKey', e.target.value)}
                        placeholder={`Enter ${aiSettings.provider === 'openai' ? 'OpenAI' : aiSettings.provider === 'claude' ? 'Anthropic' : 'Google AI'} API Key`}
                        className="w-full bg-foundry-900 border border-foundry-700 rounded-sm px-3 py-1.5 text-sm text-foundry-200 focus:outline-none focus:border-accent-500 font-mono"
                      />
                      <p className="text-[10px] text-foundry-500 mt-2 font-mono">Keys are encrypted and stored locally via localStorage protocol.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-foundry-800">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-foundry-400 hover:text-foundry-200 text-xs font-bold uppercase tracking-wide transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-sm text-xs font-bold uppercase tracking-wide transition-colors shadow-glow"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-foundry-950 border-b border-foundry-800 shrink-0 h-10 flex items-center px-4 justify-between select-none">
        <div className="flex items-center gap-4">
          <a href="/tools/" className="text-foundry-500 hover:text-foundry-200 transition-colors">
            <ChevronLeft size={16} />
          </a>
          <div className="flex items-center gap-2 border-l border-foundry-800 pl-4">
            <img src="/tools/conversational-analytics/logo.svg" alt="Logo" className="w-5 h-5" />
            <h1 className="text-xs font-bold text-foundry-200 uppercase tracking-widest">
              Conversational Analytics <span className="text-foundry-600 font-normal">v2.0</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse"></div>
            <span className="text-[10px] text-foundry-500 font-mono uppercase">System Online</span>
          </div>

          <div className="h-4 w-[1px] bg-foundry-800 mx-2"></div>

          <button
            onClick={toggleTheme}
            className="text-foundry-500 hover:text-foundry-200 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="text-foundry-500 hover:text-accent-400 transition-colors relative"
          >
            <Settings size={16} />
            {!aiSettings.apiKey && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent-gold rounded-full"></span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto overflow-hidden flex flex-col h-full bg-foundry-950">

        {/* Desktop Split View */}
        <div className="hidden lg:block flex-1 min-h-0 h-full">
          <PanelGroup orientation="horizontal" className="h-full">
            <Panel
              panelRef={chatPanelRef}
              defaultSize={35}
              minSize={25}
              collapsible
              onResize={(size) => {
                const isCollapsed = size.asPercentage === 0;
                if (isCollapsed !== isChatCollapsed) {
                  setIsChatCollapsed(isCollapsed);
                }
              }}
              className="flex flex-col min-h-0"
            >
              <div className="h-full">
                <ChatInterface
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                />
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-foundry-950 hover:bg-accent-600/50 transition-colors flex items-center justify-center group focus:outline-none border-x border-foundry-800 cursor-col-resize">
              <div className="w-0.5 h-8 bg-foundry-700 group-hover:bg-foundry-200 rounded-full" />
            </PanelResizeHandle>

            <Panel
              panelRef={resultsPanelRef}
              defaultSize={65}
              minSize={25}
              collapsible
              onResize={(size) => {
                const isCollapsed = size.asPercentage === 0;
                if (isCollapsed !== isResultsCollapsed) {
                  setIsResultsCollapsed(isCollapsed);
                }
              }}
              className="flex flex-col min-h-0 bg-foundry-950"
            >
              <div className="h-full flex flex-col min-h-0">
                <div className="flex border-b border-foundry-800 bg-foundry-900">
                  <button
                    onClick={() => setActiveTab('data')}
                    className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all border-r border-foundry-800 ${activeTab === 'data'
                      ? 'bg-foundry-800 text-foundry-100 border-b-2 border-b-accent-400'
                      : 'text-foundry-500 hover:text-foundry-300'
                      }`}
                  >
                    <DbIcon size={14} />
                    Data Source
                  </button>
                  <button
                    onClick={() => setActiveTab('results')}
                    className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all border-r border-foundry-800 ${activeTab === 'results'
                      ? 'bg-foundry-800 text-foundry-100 border-b-2 border-b-accent-400'
                      : 'text-foundry-500 hover:text-foundry-300'
                      }`}
                  >
                    <Table size={14} />
                    Query Results
                    {results.length > 0 && (
                      <span className="bg-accent-600 text-white text-[9px] px-1 rounded-sm">
                        {results.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex-1 overflow-hidden min-h-0 h-full p-0 bg-foundry-900/50">
                  {activeTab === 'data' ? (
                    <DataConnect config={dbConfig} onUpdate={updateDBSetting} />
                  ) : (
                    <ResultsView results={results} />
                  )}
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>

        {/* Mobile View (Stacked) */}
        <div className="lg:hidden flex flex-col gap-0 overflow-y-auto min-h-0 pb-0">
          <div className="h-[500px] shrink-0 border-b border-foundry-800">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
          <div className="shrink-0 flex flex-col min-h-[500px] bg-foundry-950">
            <div className="flex border-b border-foundry-800 bg-foundry-900">
              <button
                onClick={() => setActiveTab('data')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase w-1/2 justify-center ${activeTab === 'data' ? 'bg-foundry-800 text-foundry-100 border-b-2 border-b-accent-400' : 'text-foundry-500'}`}
              >
                <DbIcon size={14} /> Data
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase w-1/2 justify-center ${activeTab === 'results' ? 'bg-foundry-800 text-foundry-100 border-b-2 border-b-accent-400' : 'text-foundry-500'}`}
              >
                <Table size={14} /> Results
              </button>
            </div>

            <div className="h-[500px]">
              {activeTab === 'data' ? (
                <DataConnect config={dbConfig} onUpdate={updateDBSetting} />
              ) : (
                <ResultsView results={results} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
