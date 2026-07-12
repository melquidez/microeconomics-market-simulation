import React from 'react';
import { Stats as StatsType } from '../types';

export const Stats: React.FC<StatsType> = ({
    transactions,
    noDeals,
    avgPrice,
    activeBuyers,
    activeSellers,
    efficiency,
}) => {
    return (
        <div className="panel bg-panel border border-border rounded-lg p-3">
            <div className="section-label text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
                Live Statistics
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="stat-badge bg-[#2a2d35] rounded-md px-3 py-1">
                    Transactions: <span className="text-success font-bold">{transactions}</span>
                </div>
                <div className="stat-badge bg-[#2a2d35] rounded-md px-3 py-1">
                    No-Deals: <span className="text-danger font-bold">{noDeals}</span>
                </div>
                <div className="stat-badge bg-[#2a2d35] rounded-md px-3 py-1">
                    Avg Clear Price: <span className="text-accent font-bold">{avgPrice}</span>
                </div>
                <div className="stat-badge bg-[#2a2d35] rounded-md px-3 py-1">
                    Active Buyers: <span className="text-buyer font-bold">{activeBuyers}</span>
                </div>
                <div className="stat-badge bg-[#2a2d35] rounded-md px-3 py-1">
                    Active Sellers: <span className="text-seller font-bold">{activeSellers}</span>
                </div>
                <div className="stat-badge bg-[#2a2d35] rounded-md px-3 py-1">
                    Efficiency: <span className="font-bold">{efficiency}</span>
                </div>
            </div>
        </div>
    );
};