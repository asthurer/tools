import { useState, useEffect } from 'react';
import { Play, Globe } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { RequestDetails } from './components/RequestDetails';

// Type definitions
export interface RequestLog {
    id: string;
    method: string;
    url: string; // path
    headers: Record<string, string>;
    body: any;
    query: Record<string, string>;
    timestamp: number;
    size: number;
}

function App() {
    const [requests, setRequests] = useState<RequestLog[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const selectedRequest = requests.find(r => r.id === selectedId);

    // WebSocket Connection for Local Server
    useEffect(() => {
        let ws: WebSocket;
        const connect = () => {
            ws = new WebSocket('ws://localhost:3002');

            ws.onopen = () => {
                setIsConnected(true);
                console.log('Connected to local relay');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'NEW_REQUEST') {
                        setRequests(prev => [data.payload, ...prev]);
                        if (!selectedId) setSelectedId(data.payload.id); // Auto select first if none selected
                    }
                } catch (e) {
                    console.error('Failed to parse WS message', e);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                setTimeout(connect, 3000); // Reconnect
            };
        };

        connect();

        return () => {
            if (ws) ws.close();
        };
    }, []);

    const simulateRequest = () => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        const method = methods[Math.floor(Math.random() * methods.length)];

        const newReq: RequestLog = {
            id: crypto.randomUUID(),
            method,
            url: `/webhook/${Math.random().toString(36).substring(7)}`,
            headers: {
                'content-type': 'application/json',
                'user-agent': 'Simulation/1.0',
                'accept': '*/*'
            },
            body: method !== 'GET' ? {
                event: 'user.created',
                userId: Math.floor(Math.random() * 1000),
                timestamp: new Date().toISOString(),
                data: {
                    email: 'test@example.com',
                    role: 'admin'
                }
            } : {},
            query: {
                page: '1',
                limit: '10'
            },
            timestamp: Date.now(),
            size: 150 + Math.floor(Math.random() * 100)
        };

        setRequests(prev => [newReq, ...prev]);
        if (!selectedId) setSelectedId(newReq.id);
    };

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {/* Background Gradients */}
            <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

            {/* Sidebar */}
            <Sidebar
                requests={requests}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onClear={() => { setRequests([]); setSelectedId(null); }}
            />

            {/* Main Content - Request Details */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-0 bg-background/50">
                {/* Top Bar */}
                <div className="h-16 flex-shrink-0 border-b border-border/50 glass-panel flex items-center justify-between px-6 z-20">
                    <div className="flex items-center gap-4">
                        {isConnected ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-mono text-green-400">
                                <Globe className="w-3 h-3" />
                                <span>http://localhost:3001/webhook</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs font-mono text-yellow-400">
                                <Globe className="w-3 h-3" />
                                <span>Simulation Mode</span>
                            </div>
                        )}

                        <div className={`flex items-center gap-1.5 text-xs font-medium ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></span>
                            {isConnected ? 'Listening for events' : 'Disconnected (Run server)'}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={simulateRequest}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/20 active:scale-95 duration-200">
                            <Play className="w-4 h-4 text-primary-foreground" />
                            Simulate Request
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden">
                    {selectedRequest ? (
                        <RequestDetails request={selectedRequest} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-4">
                            <div className="p-4 rounded-full bg-secondary/30 mb-4">
                                <Globe className="w-12 h-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-medium text-foreground">Select a request</h3>
                            <p className="text-muted-foreground max-w-sm mt-2">
                                Click on a request from the sidebar or simulate a new one to view details.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default App
