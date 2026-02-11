import React, { useState } from 'react';
import { Database, ChevronUp, ChevronDown, Clock, Terminal } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, usePanelRef } from 'react-resizable-panels';
import type { QueryResult } from '../types/settings';
import { VizContent } from './VizContent';

interface ResultsViewProps {
    results: QueryResult[];
}

export const ResultsView: React.FC<ResultsViewProps> = ({ results }) => {
    if (!results || results.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-foundry-500 bg-foundry-950 rounded-sm border border-foundry-800 border-dashed">
                <Database size={32} className="mb-2 opacity-30" />
                <p className="text-xs uppercase tracking-widest opacity-70">No Data Stream</p>
            </div>
        );
    }

    return (
        <div className="h-full bg-foundry-950 flex flex-col overflow-y-auto custom-scrollbar gap-4 p-2">
            {results.map((result) => (
                <ResultItem key={result.id} result={result} />
            ))}
        </div>
    );
};

const ResultItem = ({ result }: { result: QueryResult }) => {
    const vizPanelRef = usePanelRef();
    const [isVizCollapsed, setIsVizCollapsed] = useState(false);
    const columns = result.data.length > 0 ? Object.keys(result.data[0]) : [];

    return (
        <div className="flex flex-col bg-foundry-950 rounded-sm border border-foundry-800 overflow-hidden shadow-sm shrink-0">
            <div className="bg-foundry-900 px-3 py-2 border-b border-foundry-800 flex justify-between items-center shrink-0">
                <div className="flex flex-col gap-0.5 max-w-[70%]">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-foundry-200 flex items-center gap-2 truncate">
                        <Terminal size={12} className="text-accent-gold" />
                        <span className="truncate" title={result.query}>{result.query}</span>
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-foundry-500 font-mono">
                        <Clock size={10} />
                        <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
                <span className="text-[10px] font-mono text-foundry-500 bg-foundry-950 px-1.5 py-0.5 border border-foundry-800 rounded-sm whitespace-nowrap">
                    {result.data.length} RECORDS
                </span>
            </div>

            <div className="h-[400px] flex flex-col">
                {result.vizConfig ? (
                    <PanelGroup orientation="vertical" className="flex-1 min-h-0">
                        {/* Panel 1: Table (Top) */}
                        <Panel className="flex flex-col min-h-0 bg-foundry-950">
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <TableContent columns={columns} data={result.data} />
                            </div>
                        </Panel>

                        <PanelResizeHandle className="h-2 bg-foundry-900 hover:bg-accent-600/50 transition-colors border-y border-foundry-800 flex justify-center items-center group cursor-row-resize">
                            <div className="w-8 h-0.5 bg-foundry-700 group-hover:bg-foundry-200 rounded-full" />
                            <button
                                onClick={() => {
                                    const p = vizPanelRef.current;
                                    if (p) p.isCollapsed() ? p.expand() : p.collapse();
                                }}
                                className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-foundry-800 text-foundry-200 rounded hover:bg-accent-600"
                            >
                                {isVizCollapsed ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                        </PanelResizeHandle>

                        {/* Panel 2: Chart (Bottom) */}
                        <Panel
                            panelRef={vizPanelRef}
                            defaultSize={40}
                            minSize={25}
                            collapsible
                            onResize={(size) => {
                                const isCollapsed = size.asPercentage === 0;
                                if (isCollapsed !== isVizCollapsed) {
                                    setIsVizCollapsed(isCollapsed);
                                }
                            }}
                            className="flex flex-col min-h-0 bg-foundry-900/30"
                        >
                            <div className="h-full p-2 overflow-hidden">
                                <VizContent data={result.data} config={result.vizConfig} />
                            </div>
                        </Panel>
                    </PanelGroup>
                ) : (
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <TableContent columns={columns} data={result.data} />
                    </div>
                )}
            </div>
        </div>
    );
};

const TableContent = ({ columns, data }: { columns: string[], data: any[] }) => (
    <table className="w-full text-left text-xs font-mono text-foundry-400 border-collapse">
        <thead className="bg-foundry-900/80 backdrop-blur sticky top-0 z-10">
            <tr>
                {columns.map((col) => (
                    <th key={col} className="px-3 py-2 font-semibold text-[10px] uppercase tracking-wider border-b border-r border-foundry-800 text-foundry-500 last:border-r-0 select-none">
                        {col.replace(/_/g, ' ')}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody className="bg-foundry-950">
            {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-foundry-900 transition-colors group">
                    {columns.map((col) => (
                        <td key={`${idx}-${col}`} className="px-3 py-1.5 whitespace-nowrap border-b border-r border-foundry-800/50 last:border-r-0 text-foundry-300 group-hover:text-foundry-100">
                            {row[col]}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);
