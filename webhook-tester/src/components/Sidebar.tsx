import { Trash2, Search, Clock, ArrowRight } from 'lucide-react';
import { RequestLog } from '../App';
import clsx from 'clsx';
import { Share2 } from 'lucide-react';

interface SidebarProps {
    requests: RequestLog[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onClear: () => void;
}

export function Sidebar({ requests, selectedId, onSelect, onClear }: SidebarProps) {
    return (
        <div className="w-80 flex-shrink-0 border-r border-border/50 glass-panel flex flex-col z-10 h-full">
            {/* Header */}
            <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Share2 className="w-5 h-5 text-primary" />
                    </div>
                    <h1 className="font-bold text-lg tracking-tight">Webhook Tester</h1>
                </div>
                <p className="text-xs text-muted-foreground ml-1">Inspect and debug incoming HTTP requests</p>
            </div>

            {/* Controls */}
            <div className="p-2 flex gap-2 border-b border-border/50 bg-secondary/20">
                <div className="relative flex-1">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Filter..."
                        className="w-full bg-background/50 border border-border/50 rounded-md py-1 pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                </div>
                <button
                    onClick={onClear}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
                    title="Clear all requests"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Request List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {requests.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground/50 text-sm flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mb-3">
                            <Clock className="w-5 h-5 opacity-50" />
                        </div>
                        Waiting for requests...
                    </div>
                ) : (
                    requests.map((req) => (
                        <div
                            key={req.id}
                            onClick={() => onSelect(req.id)}
                            className={clsx(
                                "group relative p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md",
                                selectedId === req.id
                                    ? "bg-primary/10 border-primary/30 shadow-sm"
                                    : "bg-card/30 border-border/30 hover:bg-secondary/30 hover:border-border/50"
                            )}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={clsx(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                    getMethodColor(req.method)
                                )}>
                                    {req.method}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    {new Date(req.timestamp).toLocaleTimeString()}
                                </span>
                            </div>

                            <div className="text-xs font-medium truncate text-foreground/90 mb-1" title={req.url}>
                                {req.url}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>{req.size}B</span>
                                <span>•</span>
                                <span>200 OK</span>
                            </div>

                            {selectedId === req.id && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="w-4 h-4 text-primary" />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function getMethodColor(method: string) {
    switch (method.toUpperCase()) {
        case 'GET': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
        case 'POST': return 'bg-green-500/10 text-green-400 border border-green-500/20';
        case 'PUT': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
        case 'DELETE': return 'bg-red-500/10 text-red-400 border border-red-500/20';
        default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
}
