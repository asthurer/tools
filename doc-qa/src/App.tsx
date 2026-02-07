import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { parseDocument, fileToBase64 } from './utils/fileParser';
import { askGemini as askAI } from './services/ai';
import { DEFAULT_SETTINGS, type AISettings, type AIProviderType } from './types/settings';
import { Logo } from './components/Logo';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentContent, setDocumentContent] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{ mimeType: string; data: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Lazy init settings from localStorage
  const [settings, setSettings] = useState<AISettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const saved = localStorage.getItem('doc_qa_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    // Fallback: try to load from env if not in local storage
    return {
      ...DEFAULT_SETTINGS,
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY || ''
    };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('doc_qa_settings', JSON.stringify(settings));
  }, [settings]);

  // Clean up object URL on unmount or new file
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const updateSetting = (key: keyof AISettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadError(null);
    setIsProcessing(true);
    setDocumentContent(null);
    setFileData(null);
    setChatHistory([]); // Clear chat history on new file

    // Create URL for preview
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const newUrl = URL.createObjectURL(file);
    setFileUrl(newUrl);

    try {
      // Parallel execution: extract text for preview AND get base64 for AI
      const textPromise = parseDocument(file);
      const base64Promise = fileToBase64(file);

      const [text, base64] = await Promise.all([textPromise, base64Promise]);

      if (text && text.trim().length > 0) {
        setDocumentContent(text);
      } else {
        setDocumentContent("(No text could be extracted. The document will be analyzed as an image/file.)");
      }

      setFileData({
        mimeType: file.type,
        data: base64
      });

    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Failed to parse document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAsk = async () => {
    if (!settings.apiKey) {
      setShowSettings(true);
      return;
    }
    if (!query.trim() || !documentContent) return;

    const userQuestion = query.trim();

    // Add User Message
    setChatHistory(prev => [...prev, { role: 'user', content: userQuestion }]);
    setQuery('');
    setLoading(true);

    try {
      const answer = await askAI(documentContent || '', userQuestion, settings, fileData || undefined);

      setChatHistory(prev => [...prev, { role: 'assistant', content: answer }]);

    } catch (error: any) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Error: Failed to get response. Please check your settings or try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans relative">

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                ⚙️ AI Configuration
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">AI Provider</label>
                <select
                  value={settings.provider}
                  onChange={(e) => updateSetting('provider', e.target.value as AIProviderType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI (GPT-4)</option>
                  <option value="claude">Anthropic (Claude 3)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Model Name</label>
                <input
                  type="text"
                  value={settings.model}
                  onChange={(e) => updateSetting('model', e.target.value)}
                  placeholder={
                    settings.provider === 'openai' ? "gpt-4-turbo" :
                      settings.provider === 'claude' ? "claude-3-opus-20240229" :
                        "gemini-1.5-flash"
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {settings.provider === 'gemini' && "Try: gemini-1.5-flash, gemini-pro"}
                  {settings.provider === 'openai' && "Try: gpt-4-turbo, gpt-3.5-turbo"}
                  {settings.provider === 'claude' && "Try: claude-3-opus-20240229, claude-3-sonnet-20240229"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">API Key</label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => updateSetting('apiKey', e.target.value)}
                  placeholder={`Enter your ${settings.provider === 'openai' ? 'OpenAI' : settings.provider === 'claude' ? 'Anthropic' : 'Google AI'} API Key`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-4 shadow-lg shadow-blue-900/40 transition-all active:scale-[0.98]"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            DocQA AI
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-all flex items-center gap-2"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden md:inline">Settings</span>
          </button>
          <a href="/tools/" className="text-slate-400 hover:text-white transition-colors">
            Back to Portal
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        {/* Upload Section */}
        <div
          onClick={triggerFileUpload}
          className={`bg-slate-800/50 border-2 border-dashed ${documentContent ? 'border-green-500/50' : 'border-slate-700'} rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer relative`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.docx,.txt"
          />

          <div className="text-slate-400">
            {isProcessing ? (
              <p className="text-lg font-medium animate-pulse">Processing document...</p>
            ) : fileName ? (
              <div>
                <p className="text-lg font-medium text-white">{fileName}</p>
                <p className="text-sm mt-2 text-green-400">Document ready for questions</p>
                <p className="text-xs mt-2 text-slate-500">Click to upload a different file</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium">Drop PDF, Docx, or TXT here</p>
                <p className="text-sm mt-2">to index knowledge base</p>
              </div>
            )}

            {uploadError && (
              <p className="text-red-400 mt-2">{uploadError}</p>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-slate-800 rounded-xl p-6 h-[500px] flex flex-col">
          <div className="flex-1 space-y-4 mb-6 text-sm overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
            <div className="flex justify-start">
              <div className="bg-slate-700/50 rounded-lg p-3 max-w-[80%]">
                {documentContent
                  ? "I've ready the document. What would you like to know?"
                  : "Hello! Upload a document to start asking questions."}
              </div>
            </div>

            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`rounded-lg p-3 max-w-[80%] overflow-hidden ${msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.content.startsWith('Error')
                      ? 'bg-red-900/30 border border-red-500/30 text-red-100'
                      : 'bg-slate-700/80 text-slate-100'
                    }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none break-words">
                      <ReactMarkdown
                        components={{
                          ul: ({ node, ...props }) => <ul className="list-disc pl-4 my-2 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-4 my-2 space-y-1" {...props} />,
                          li: ({ node, ...props }) => <li className="marker:text-slate-400" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                          a: ({ node, ...props }) => <a className="text-blue-300 hover:text-blue-200 underline" target="_blank" rel="noopener noreferrer" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleAsk()}
              placeholder={documentContent ? "Ask a question about the document..." : "Upload a document first..."}
              disabled={!documentContent || loading}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleAsk}
              disabled={!documentContent || loading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>

        {!settings.apiKey && (
          <div className="text-center text-amber-500 text-sm">
            ⚠️ API Key not configured. <button onClick={() => setShowSettings(true)} className="underline hover:text-amber-400">Open Settings</button> to configure.
          </div>
        )}

        {/* Document Viewer */}
        {documentContent && (
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Document Preview
            </h2>

            {fileName?.toLowerCase().endsWith('.pdf') && fileUrl ? (
              <div className="bg-slate-900 rounded-lg h-[600px] border border-slate-700 overflow-hidden">
                <iframe src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full" title="PDF Preview"></iframe>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm text-slate-300 border border-slate-700 whitespace-pre-wrap">
                {documentContent}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
