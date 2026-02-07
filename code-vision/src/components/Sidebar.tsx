import { Terminal, Copy, Lock, Link, Regex, Palette, Type } from 'lucide-react';

export type ToolId = 'formatter' | 'diff' | 'jwt' | 'regex' | 'string' | 'color';

interface SidebarProps {
  activeTool: ToolId;
  onSelect: (tool: ToolId) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

const tools = [
  { id: 'formatter', name: 'Code Formatter', icon: Terminal },
  { id: 'diff', name: 'Diff Checker', icon: Copy },
  { id: 'jwt', name: 'JWT Debugger', icon: Lock },
  { id: 'regex', name: 'Regex Tester', icon: Regex },
  { id: 'string', name: 'String Utilities', icon: Type },
  { id: 'color', name: 'Color Converter', icon: Palette },
];

export function Sidebar({ activeTool, onSelect, isOpen, toggleSidebar }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:block
      `}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              Code Vision
            </span>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    onSelect(tool.id as ToolId);
                    if (window.innerWidth < 768) toggleSidebar();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${activeTool === tool.id
                      ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tool.name}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <a
              href="/tools/"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Link className="w-4 h-4" />
              Back to Portal
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
