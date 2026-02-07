import { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { aiService, type AISettings, type AIProviderType } from './services/aiService';
import { DataChart } from './components/DataChart';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ChartConfig {
  type: 'bar' | 'line' | 'area';
  title: string;
  xAxis: string;
  yAxis: string;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  apiKey: ''
};

function App() {
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [stats, setStats] = useState({
    rows: 0,
    cols: 0,
    quality: 0,
    fileName: ''
  });
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Use a proper lazy initializer for settings to avoid potential hydration or initialization issues
  const [settings, setSettings] = useState<AISettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    const saved = localStorage.getItem('ai_insights_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }

    // Default to empty settings if nothing saved
    return DEFAULT_SETTINGS;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai_insights_settings', JSON.stringify(settings));
  }, [settings]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;

    setExporting(true);
    addLog("Initiating PDF export sequence...");

    try {
      const originalElement = dashboardRef.current;

      // Create a temporary container to hold the clone
      // This ensures we capture the full content height, even if currently scrolled or hidden
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-10000px';
      container.style.left = '0';
      container.style.width = `${originalElement.offsetWidth}px`;
      container.style.zIndex = '-1000';

      // Clone the content
      // Notes: Recharts uses SVG, which cloneNode handles correctly.
      const clone = originalElement.cloneNode(true) as HTMLElement;
      container.appendChild(clone);
      document.body.appendChild(container);

      // Wait for any potential layout settling
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#0f172a', // Match slate-900 background
        logging: false,
        useCORS: true,
        windowHeight: container.scrollHeight,
        height: container.scrollHeight
      });

      // Cleanup the temporary container
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`data-insights-${new Date().toISOString().split('T')[0]}.pdf`);
      addLog("PDF Report successfully generated and downloaded.");
    } catch (error) {
      console.error("Export failed:", error);
      addLog("ERROR: PDF Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const processDataWithAI = async (data: any[], fileName: string) => {
    if (!settings.apiKey) {
      addLog("ERROR: API Key is missing. Please open Settings and provide a key.");
      setShowSettings(true);
      return;
    }

    setAnalyzing(true);
    addLog(`Starting agentic analysis of ${fileName} using ${settings.provider} (${settings.model})...`);

    const sampleData = data.slice(0, 50);
    const headers = Object.keys(data[0] || {});

    addLog(`Identifying metrics from ${headers.length} columns...`);

    const prompt = `
      You are a senior data analyst. I have a dataset with columns: ${headers.join(', ')}.
      Sample data: ${JSON.stringify(sampleData)}
      
      Tasks:
      1. Identify the 3 most meaningful metrics to visualize.
      2. Suggest appropriate charts (bar, line, or area) for these metrics.
      3. Return a JSON object with this schema:
      {
        "executiveSummary": "brief analytical overview",
        "charts": [
          { "type": "bar|line|area", "title": "Chart Title", "xAxis": "existing_column_name", "yAxis": "existing_column_name" }
        ]
      }
      
      Requirements:
      - xAxis should be a categorical or temporal column.
      - yAxis should be a numerical column.
      - Only use column names from the provided list.
      - Limit to maximum 3 charts.
    `;

    try {
      const response = await aiService.generateJSON<{ executiveSummary: string, charts: ChartConfig[] }>(prompt, settings);
      addLog(`AI (${settings.provider}) successfully identified patterns.`);
      setInsights(response.executiveSummary);
      setCharts(response.charts);
      setChartData(data.slice(0, 500));
      addLog("Dashboard updated with autonomous insights.");
    } catch (error) {
      addLog(`AI Analysis failed: ${error}`);
      setInsights(`Analysis Engine Error: The selected model (${settings.model}) failed to process the request.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogs([]);
    addLog(`Stream initialized: ${file.name}`);
    setInsights(null);
    setCharts([]);
    setChartData([]);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rowCount = results.data.length;
        const colCount = results.meta.fields?.length || 0;

        addLog(`Parsed ${rowCount} rows and ${colCount} data dimensions.`);

        let totalEmpty = 0;
        results.data.forEach((row: any) => {
          Object.values(row).forEach(val => {
            if (val === null || val === undefined || val === '') totalEmpty++;
          });
        });
        const quality = rowCount > 0 ? Math.round(((rowCount * colCount - totalEmpty) / (rowCount * colCount)) * 100) : 0;

        setStats({
          rows: rowCount,
          cols: colCount,
          quality: quality,
          fileName: file.name
        });

        processDataWithAI(results.data, file.name);
      },
      error: (error) => {
        addLog(`Parsing Interrupt: ${error.message}`);
        setAnalyzing(false);
      }
    });
  };

  const updateSetting = (key: keyof AISettings, value: string) => {
    setSettings((prev: AISettings) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans transition-all duration-500">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                AI Configuration
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  value={settings.model}
                  onChange={(e) => updateSetting('model', e.target.value)}
                  placeholder={settings.provider === 'gemini' ? 'gemini-2.0-flash' : settings.provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">API Key</label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => updateSetting('apiKey', e.target.value)}
                  placeholder={`Enter your ${settings.provider} key`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg mt-4 shadow-lg shadow-purple-900/40 transition-all active:scale-[0.98]"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400">
            Data Insights Generator
          </h1>
          <p className="text-slate-500 text-sm mt-1 tracking-wide">Autonomous Intelligence Engine <span className="text-slate-700 font-bold ml-2">v0.6.0</span></p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExportPDF}
            disabled={exporting || !stats.fileName}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export Final Report to PDF"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden md:inline">{exporting ? 'Exporting...' : 'Export Report'}</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-all flex items-center gap-2 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-45 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden md:inline">Settings</span>
          </button>
          <a href="/tools/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <span className="hidden md:inline">Exit Portal</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl overflow-hidden relative">
              <h2 className="font-semibold mb-4 text-slate-300 flex items-center gap-2 uppercase text-xs tracking-tighter">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                Data Ingestion
              </h2>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />

              <div
                onClick={handleUploadClick}
                className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:bg-slate-700/50 cursor-pointer transition-all group overflow-hidden"
              >
                <div className="text-purple-400/60 mb-2 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block truncate">
                  {stats.fileName ? stats.fileName : 'Select CSV Stream'}
                </span>
              </div>

              <button
                onClick={handleUploadClick}
                type="button"
                disabled={analyzing}
                className="w-full mt-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white py-2 rounded-lg font-bold text-sm transition-all"
              >
                {analyzing ? 'Analyzing...' : stats.fileName ? 'Change Stream' : 'Load Data'}
              </button>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="font-semibold mb-4 text-slate-300 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className={`w-2 h-2 rounded-full ${analyzing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                Live Environment
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-black mb-1">Records</div>
                  <div className="text-2xl font-mono text-white leading-none tracking-tighter">
                    {stats.rows === 0 ? '---' : stats.rows.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-black mb-1">Confidence</div>
                  <div className={`text-2xl font-mono leading-none ${stats.quality > 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {stats.quality === 0 ? '---' : `${stats.quality}%`}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase font-black mb-1">Engine</div>
                  <div className="text-xs text-slate-300 font-bold bg-slate-900 px-2 py-1 rounded inline-block mt-1">
                    {settings.provider.toUpperCase()} v{settings.model}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div ref={dashboardRef} className="space-y-6">
              <div className="bg-slate-800/40 rounded-xl p-6 border border-slate-700/50 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                  Autonomous Synthesis
                </h3>
                {analyzing ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-700/30 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-5/6 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                ) : insights ? (
                  <p className="text-slate-300 leading-relaxed text-sm md:text-lg font-medium italic">
                    "{insights}"
                  </p>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-600">
                    <p className="text-sm font-medium">Visualization engine pending ingestion.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {charts.length > 0 ? (
                  charts.map((chart, idx) => (
                    <div key={idx} className={idx === 0 && charts.length === 3 ? 'md:col-span-2' : ''}>
                      <DataChart
                        type={chart.type}
                        data={chartData}
                        title={chart.title}
                        xAxis={chart.xAxis}
                        yAxis={chart.yAxis}
                        colors={idx === 0 ? ['#6366f1'] : idx === 1 ? ['#d946ef'] : ['#f59e0b']}
                      />
                    </div>
                  ))
                ) : (
                  !analyzing && (
                    <div className="md:col-span-2 py-24 text-center border border-slate-800 rounded-2xl bg-slate-800/20">
                      <p className="text-slate-700 text-xs font-black uppercase tracking-widest">Render Pipeline Inactive</p>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="mt-8 border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-2xl">
              <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500">System Logs</span>
                </div>
              </div>
              <div className="p-4 h-56 overflow-y-auto font-mono text-[11px] text-slate-500 space-y-1.5">
                {logs.length === 0 ? (
                  <div className="text-slate-800 italic">Initialized system. Listening...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-slate-800 w-4 text-right">{i + 1}</span>
                      <span className={log.includes('ERROR') ? 'text-rose-400' : ''}>{log}</span>
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
