import React, { useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sql?: string;
    data?: any[];
    error?: string;
}

interface ChatInterfaceProps {
    messages: Message[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
    const [input, setInput] = React.useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-foundry-900 border-r border-foundry-800">
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar font-mono text-sm">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-foundry-500 opacity-60">
                        <Bot size={32} className="mb-2 opacity-50" />
                        <p className="text-xs uppercase tracking-widest">System Ready</p>
                        <p className="text-[10px] mt-1 font-mono text-foundry-600">Awaiting Input...</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`group border-b border-foundry-800/50 px-4 py-3 hover:bg-foundry-800/20 transition-colors ${msg.role === 'user' ? 'bg-foundry-950/30' : ''}`}
                    >
                        <div className="flex gap-3">
                            <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${msg.role === 'user' ? 'bg-accent-600 text-white' : 'bg-foundry-700 text-foundry-200'
                                }`}>
                                {msg.role === 'user' ? '>' : '#'}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className={`text-xs font-bold uppercase tracking-wide ${msg.role === 'user' ? 'text-accent-400' : 'text-foundry-400'}`}>
                                        {msg.role === 'user' ? 'USER' : 'SYSTEM'}
                                    </span>
                                    <span className="text-[10px] text-foundry-600 font-mono">{new Date().toLocaleTimeString([], { hour12: false })}</span>
                                </div>

                                <div className="text-foundry-200 whitespace-pre-wrap leading-relaxed">
                                    {msg.content}
                                </div>

                                {msg.sql && (
                                    <div className="mt-2 bg-black border border-foundry-800 rounded-sm p-2 overflow-x-auto">
                                        <div className="flex justify-between items-center mb-1 border-b border-foundry-800 pb-1">
                                            <span className="text-[10px] text-foundry-500 font-bold uppercase">Generated SQL</span>
                                            <span className="text-[10px] text-accent-success">Verified</span>
                                        </div>
                                        <pre className="text-xs text-accent-gold font-mono">{msg.sql}</pre>
                                    </div>
                                )}

                                {msg.error && (
                                    <div className="mt-2 text-accent-danger text-xs border-l-2 border-accent-danger pl-2 py-1 bg-accent-danger/5">
                                        ANOMALY DETECTED: {msg.error}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="px-4 py-3 border-b border-foundry-800/50 animate-pulse bg-foundry-800/10">
                        <div className="flex gap-3">
                            <div className="w-4 h-4 bg-foundry-700 rounded flex-shrink-0 animate-spin" />
                            <div className="h-4 bg-foundry-800 rounded w-1/3" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="p-2 border-t border-foundry-800 bg-foundry-900">
                <form onSubmit={handleSubmit} className="flex gap-0 bg-foundry-950 border border-foundry-700 rounded-sm focus-within:ring-1 focus-within:ring-accent-500 transition-all">
                    <div className="px-3 py-2 text-foundry-500 font-mono text-sm border-r border-foundry-800 select-none">
                        $
                    </div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Execute command or query..."
                        className="flex-1 bg-transparent text-foundry-100 placeholder-foundry-600 px-3 py-2 text-sm font-mono focus:outline-none"
                        disabled={isLoading}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-3 text-foundry-500 hover:text-accent-400 disabled:opacity-30 disabled:hover:text-foundry-500 transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </form>
            </div>
        </div>
    );
};
