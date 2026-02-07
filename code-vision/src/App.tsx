import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, type ToolId } from './components/Sidebar';
import { CodeFormatter } from './components/CodeFormatter';
import { DiffChecker } from './components/DiffChecker';
import { JwtDebugger } from './components/JwtDebugger';
import { RegexTester } from './components/RegexTester';
import { StringUtils } from './components/StringUtils';
import { ColorConverter } from './components/ColorConverter';

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('formatter');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-mono overflow-hidden">
      <Sidebar
        activeTool={activeTool}
        onSelect={setActiveTool}
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center p-4 border-b border-slate-800 bg-slate-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 ml-2">
            Code Vision
          </span>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-hidden h-full">
          {activeTool === 'formatter' && <CodeFormatter />}
          {activeTool === 'diff' && <DiffChecker />}
          {activeTool === 'jwt' && <JwtDebugger />}
          {activeTool === 'regex' && <RegexTester />}
          {activeTool === 'string' && <StringUtils />}
          {activeTool === 'color' && <ColorConverter />}
        </main>
      </div>
    </div>
  );
}

export default App;
