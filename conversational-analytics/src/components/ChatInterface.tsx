import React, { useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';

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
        <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                        <Bot size={48} className="mb-4" />
                        <p className="text-lg">Ask a question about your data to get started.</p>
                        <p className="text-sm mt-2">Example: "Show me the top selling products"</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 p-1 rounded-full ${msg.role === 'user' ? 'bg-blue-500' : 'bg-slate-700'}`}>
                                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className="flex-1 overflow-x-auto">
                                    <p className="whitespace-pre-wrap">{msg.content}</p>

                                    {msg.sql && (
                                        <div className="mt-3 bg-slate-950 rounded-md p-3 font-mono text-xs text-green-400 overflow-x-auto border border-slate-800">
                                            <div className="text-slate-500 text-[10px] uppercase mb-1">Generated SQL</div>
                                            {msg.sql}
                                        </div>
                                    )}

                                    {msg.error && (
                                        <div className="mt-3 bg-red-900/20 text-red-300 rounded-md p-3 text-sm border border-red-900/50">
                                            Error: {msg.error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-bl-none border border-slate-700 p-4">
                            <div className="flex items-center gap-2">
                                <Bot size={16} className="text-slate-400" />
                                <span className="animate-pulse">Analyzing data...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your data..."
                        className="flex-1 bg-slate-900 text-white placeholder-slate-500 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-6 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};
