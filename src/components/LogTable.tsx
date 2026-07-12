import React, { useEffect, useRef } from 'react';
import { TransactionLogEntry } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList } from '@fortawesome/free-solid-svg-icons';

interface LogTableProps {
    logs: TransactionLogEntry[];
}

export const LogTable: React.FC<LogTableProps> = ({ logs }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Auto-scroll to bottom on new logs
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="panel bg-panel border border-border rounded-lg p-3 flex-1 min-w-87.5 max-h-85 overflow-hidden flex flex-col">
            <div className="section-label text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
                <FontAwesomeIcon icon={faList} className="text-accent mr-1" />
                Transaction Log
            </div>
            <div ref={containerRef} className="overflow-y-auto flex-1 max-h-70">
                <table className="log-table w-full text-left">
                    <thead className="sticky top-0 bg-panel">
                        <tr>
                            <th className="text-[11px] font-semibold text-muted uppercase tracking-wide">Round</th>
                            <th className="text-[11px] font-semibold text-muted uppercase tracking-wide">Buyer</th>
                            <th className="text-[11px] font-semibold text-muted uppercase tracking-wide">Seller</th>
                            <th className="text-[11px] font-semibold text-muted uppercase tracking-wide">Orig. Ask</th>
                            <th className="text-[11px] font-semibold text-muted uppercase tracking-wide">Eff. Ask</th>
                            <th className="text-[11px] font-semibold text-muted uppercase tracking-wide">Cost</th>
                            <th className="text-[11px] font-semibold text-muted uppercase tracking-wide">Profit</th>
                            <th className="text-[11px] font-semibold text-muted uppercase tracking-wide">Budget</th>
                            <th className="text-[11px] font-semibold text-muted uppercase tracking-wide">Surplus</th>
                            <th className="text-[11px] font-semibold text-muted uppercase tracking-wide">Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center text-muted py-4">No transactions yet</td>
                            </tr>
                        ) : (
                            logs.map((entry, idx) => (
                                <tr key={idx} className={typeof entry.outcome === 'string' && entry.outcome.startsWith('Transacted') ? 'text-gray-200' : 'text-gray-500'}>
                                    <td className="text-xs py-1 px-2 border-b border-border">{entry.round}</td>
                                    <td className="text-xs py-1 px-2 border-b border-border">{entry.buyerId}</td>
                                    <td className="text-xs py-1 px-2 border-b border-border">{entry.sellerId}</td>
                                    <td className="text-xs py-1 px-2 border-b border-border">
                                        {typeof entry.sellerOrigAsk === 'number' ? '₱' + entry.sellerOrigAsk : entry.sellerOrigAsk}
                                    </td>
                                    <td className="text-xs py-1 px-2 border-b border-border">
                                        {typeof entry.sellerEffAsk === 'number' ? '₱' + entry.sellerEffAsk : entry.sellerEffAsk}
                                    </td>
                                    <td className="text-xs py-1 px-2 border-b border-border">
                                        {typeof entry.sellerCost === 'number' ? '₱' + entry.sellerCost : entry.sellerCost}
                                    </td>
                                    <td className={`text-xs py-1 px-2 border-b border-border ${entry.sellerProfit > 0 ? 'text-success' : 'text-muted'}`}>
                                        {typeof entry.sellerProfit === 'number' ? '₱' + entry.sellerProfit.toFixed(0) : entry.sellerProfit}
                                    </td>
                                    <td className="text-xs py-1 px-2 border-b border-border">₱{entry.buyerBudget}</td>
                                    <td className={`text-xs py-1 px-2 border-b border-border ${entry.buyerSurplus > 0 ? 'text-accent' : 'text-muted'}`}>
                                        {typeof entry.buyerSurplus === 'number' ? '₱' + entry.buyerSurplus.toFixed(0) : entry.buyerSurplus}
                                    </td>
                                        <td className="text-xs py-1 px-2 border-b border-border">
                                        <span className={typeof entry.outcome === 'string' && entry.outcome.startsWith('Transacted') ? 'text-success font-semibold' : 'text-danger'}>
                                            {entry.outcome}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};