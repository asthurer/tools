import { RequestLog } from '../App';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

// Register JSON language
SyntaxHighlighter.registerLanguage('json', json);

interface RequestDetailsProps {
    request: RequestLog;
}

export function RequestDetails({ request }: RequestDetailsProps) {
    const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'query'>('body');
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Request Meta Header */}
            <div className="p-6 border-b border-border/50 bg-secondary/5">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl font-bold font-display">{request.method}</span>
                    <span className="text-xl text-muted-foreground font-light">{request.url}</span>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-50">Time</span>
                        <span className="font-mono text-foreground">{new Date(request.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-50">Content Type</span>
                        <span className="font-mono text-foreground">{request.headers['content-type'] || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-50">Size</span>
                        <span className="font-mono text-foreground">{request.size} bytes</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center px-6 border-b border-border/50 bg-secondary/10">
                <TabButton active={activeTab === 'body'} onClick={() => setActiveTab('body')}>Body</TabButton>
                <TabButton active={activeTab === 'headers'} onClick={() => setActiveTab('headers')}>Headers <span className="ml-1 text-xs opacity-50">({Object.keys(request.headers).length})</span></TabButton>
                <TabButton active={activeTab === 'query'} onClick={() => setActiveTab('query')}>Query Params <span className="ml-1 text-xs opacity-50">({Object.keys(request.query).length})</span></TabButton>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto bg-[#1e1e1e] relative group">
                <div className="absolute right-4 top-4 z-10">
                    <button
                        onClick={() => handleCopy(JSON.stringify(request.body, null, 2))}
                        className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white/70 transition-colors backdrop-blur-sm"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>

                {activeTab === 'body' && (
                    <div className="h-full">
                        {Object.keys(request.body).length > 0 ? (
                            <SyntaxHighlighter
                                language="json"
                                style={vscDarkPlus}
                                customStyle={{ margin: 0, height: '100%', padding: '1.5rem', background: 'transparent' }}
                                showLineNumbers={true}
                            >
                                {JSON.stringify(request.body, null, 2)}
                            </SyntaxHighlighter>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">No Body Content</div>
                        )}

                    </div>
                )}

                {activeTab === 'headers' && (
                    <div className="p-6">
                        <div className="grid grid-cols-[200px_1fr] gap-y-2 text-sm font-mono">
                            {Object.entries(request.headers).map(([key, value]) => (
                                <div key={key} className="contents group/row">
                                    <div className="text-muted-foreground py-2 border-b border-white/5 group-hover/row:bg-white/5 px-2 rounded-l transition-colors truncate" title={key}>{key}</div>
                                    <div className="text-foreground py-2 border-b border-white/5 group-hover/row:bg-white/5 px-2 rounded-r transition-colors break-all">{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'query' && (
                    <div className="p-6">
                        {Object.keys(request.query).length > 0 ? (
                            <div className="grid grid-cols-[200px_1fr] gap-y-2 text-sm font-mono">
                                {Object.entries(request.query).map(([key, value]) => (
                                    <div key={key} className="contents group-hover:bg-white/5">
                                        <div className="text-muted-foreground py-2 border-b border-white/5">{key}</div>
                                        <div className="text-foreground py-2 border-b border-white/5">{value}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-10">No Query Parameters</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`
                px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}
            `}
        >
            {children}
        </button>
    )
}
