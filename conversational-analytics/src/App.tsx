import { useState, useEffect } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, usePanelRef } from 'react-resizable-panels';
import { ChatInterface } from './components/ChatInterface';
import { ResultsView } from './components/ResultsView';
import { generateSQL } from './services/ai';
import { executeSQL } from './utils/sqlRunner';
import { Settings, Sparkles, Database as DbIcon, ChevronLeft, ChevronRight, Table, GripVertical } from 'lucide-react';
import { DataConnect } from './components/DataConnect';
import { DEFAULT_AI_SETTINGS, DEFAULT_DB_CONFIG, type AISettings, type DatabaseConfig, type AIProviderType } from './types/settings';

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
  const [activeData, setActiveData] = useState<any[]>([]);
  const [activeVizConfig, setActiveVizConfig] = useState<any>(null);
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
      const result = executeSQL(generatedSQL, dbConfig);

      if (result.success) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I found ${result.data?.length} results for your query.`,
          sql: generatedSQL,
          data: result.data,
          vizConfig: aiResponse.visualization
        }]);
        setActiveData(result.data || []);
        setActiveVizConfig(aiResponse.visualization);
        setActiveTab('results'); // Auto-switch to results
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
    <div className="h-screen bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings size={20} className="text-blue-400" />
                Configuration
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* AI Configuration */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  AI Model Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">AI Provider</label>
                    <select
                      value={aiSettings.provider}
                      onChange={(e) => updateAISetting('provider', e.target.value as AIProviderType)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="claude">Anthropic Claude</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Model Name</label>
                    <input
                      type="text"
                      value={aiSettings.model}
                      onChange={(e) => updateAISetting('model', e.target.value)}
                      placeholder={aiSettings.provider === 'gemini' ? 'gemini-1.5-flash' : aiSettings.provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {aiSettings.provider === 'gemini' && "Try: gemini-1.5-flash, gemini-1.5-pro"}
                      {aiSettings.provider === 'openai' && "Try: gpt-4o, gpt-4o-mini"}
                      {aiSettings.provider === 'claude' && "Try: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">API Key</label>
                    <input
                      type="password"
                      value={aiSettings.apiKey}
                      onChange={(e) => updateAISetting('apiKey', e.target.value)}
                      placeholder={`Enter your ${aiSettings.provider === 'openai' ? 'OpenAI' : aiSettings.provider === 'claude' ? 'Anthropic' : 'Google AI'} API Key`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-2">Your key is stored locally in your browser.</p>
                  </div>
                </div>
              </div>


              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/40"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900/50 border-b border-slate-800 backdrop-blur-md sticky top-0 z-20 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/tools/" className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-all">
              <ChevronLeft size={20} />
            </a>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
                <Sparkles size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
                Conversational Analytics
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-slate-400 font-medium">System Online</span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative"
            >
              <Settings size={20} />
              {!aiSettings.apiKey && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 overflow-hidden flex flex-col h-full bg-slate-950">

        {/* Desktop Split View */}
        <div className="hidden lg:block flex-1 min-h-0 h-full">
          <PanelGroup orientation="horizontal" className="h-full">
            <Panel
              panelRef={chatPanelRef}
              defaultSize={40}
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
              <div className="h-full pr-2">
                <ChatInterface
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                />
              </div>
            </Panel>

            <PanelResizeHandle className="w-4 flex items-center justify-center bg-transparent group relative z-10 focus:outline-none">
              <div className="w-1 h-12 bg-slate-700/50 rounded-full group-hover:bg-blue-500/50 transition-colors mx-auto flex items-center justify-center">
                <GripVertical size={12} className="text-slate-500" />
              </div>
              {/* Custom collapse buttons showing on hover */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <button
                  onClick={() => {
                    const p = chatPanelRef.current;
                    if (p) p.isCollapsed() ? p.expand() : p.collapse();
                  }}
                  className="pointer-events-auto p-1 bg-slate-800 rounded-full border border-slate-700 hover:bg-slate-700"
                >
                  {isChatCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </button>
                <button
                  onClick={() => {
                    const p = resultsPanelRef.current;
                    if (p) p.isCollapsed() ? p.expand() : p.collapse();
                  }}
                  className="pointer-events-auto p-1 bg-slate-800 rounded-full border border-slate-700 hover:bg-slate-700"
                >
                  {isResultsCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                </button>
              </div>
            </PanelResizeHandle>

            <Panel
              panelRef={resultsPanelRef}
              defaultSize={60}
              minSize={25}
              collapsible
              onResize={(size) => {
                const isCollapsed = size.asPercentage === 0;
                if (isCollapsed !== isResultsCollapsed) {
                  setIsResultsCollapsed(isCollapsed);
                }
              }}
              className="flex flex-col min-h-0"
            >
              <div className="h-full pl-2 flex flex-col min-h-0">
                <div className="flex gap-2 p-1 bg-slate-900 rounded-lg w-fit border border-slate-800 mb-4 shrink-0">
                  <button
                    onClick={() => setActiveTab('data')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'data'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <DbIcon size={16} />
                    Data Source
                  </button>
                  <button
                    onClick={() => setActiveTab('results')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'results'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <Table size={16} />
                    Query Results
                    {activeData.length > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {activeData.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex-1 overflow-hidden min-h-0 h-full">
                  {activeTab === 'data' ? (
                    <DataConnect config={dbConfig} onUpdate={updateDBSetting} />
                  ) : (
                    <ResultsView data={activeData} vizConfig={activeVizConfig} />
                  )}
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>

        {/* Mobile View (Stacked) */}
        <div className="lg:hidden flex flex-col gap-6 overflow-y-auto min-h-0 pb-20">
          <div className="h-[500px] shrink-0">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
          <div className="shrink-0 flex flex-col gap-4">
            <div className="flex gap-2 p-1 bg-slate-900 rounded-lg w-fit border border-slate-800">
              <button
                onClick={() => setActiveTab('data')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'data' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                <DbIcon size={16} /> Data
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'results' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                <Table size={16} /> Results
              </button>
            </div>

            <div className="h-[500px]">
              {activeTab === 'data' ? (
                <DataConnect config={dbConfig} onUpdate={updateDBSetting} />
              ) : (
                <ResultsView data={activeData} vizConfig={activeVizConfig} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
