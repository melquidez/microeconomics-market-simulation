'use client';

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { Canvas } from '../components/Canvas';
import { Controls } from '../components/Controls';
import { Stats } from '../components/Stats';
import { Disruptors } from '../components/Disruptors';
import { Config } from '../components/Config';
import { Chart } from '../components/Chart';
import { LogTable } from '../components/LogTable';

import { SummaryModal } from '@/components/SummaryModal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartArea } from '@fortawesome/free-solid-svg-icons';

function App() {
    const initialConfig = {
        numBuyers: 10,
        numSellers: 5,
        budgetMin: 50,
        budgetMax: 200,
        askMin: 60,
        askMax: 180,
        costMin: 30,
        costMax: 120,
        stockPerSeller: 3,
    };

    const sim = useSimulation(initialConfig);
    const chartRef = useRef<any>(null);

    const [showSummary, setShowSummary] = useState(false);


    useEffect(() => {
        if (sim.status === 'roundEnd') {
            setShowSummary(true);
        }
    }, [sim.status]);

    // Compute supply/demand data for chart
    const { supplyData, demandData, clearingData } = useMemo(() => {
        const sellers = sim.sellersRef.current;
        const buyers = sim.buyersRef.current;
        const getEffectiveCost = sim.getEffectiveCost; // now a function (seller) => number

        const supplyPoints: { x: number; y: number }[] = [];
        const nonExited = sellers.filter((s) => s.status !== 'exited');
        if (nonExited.length) {
            const sorted = [...nonExited].sort((a, b) => getEffectiveCost(a) - getEffectiveCost(b));
            let cum = 0;
            supplyPoints.push({ x: 0, y: getEffectiveCost(sorted[0]) });
            sorted.forEach((s) => {
                if (cum > 0) supplyPoints.push({ x: cum, y: getEffectiveCost(s) });
                cum += s.originalStock;
                supplyPoints.push({ x: cum, y: getEffectiveCost(s) });
            });
        }

        // Demand
        const demandPoints: { x: number; y: number }[] = [];
        if (buyers.length) {
            const budgets = buyers.map((b) => b.maxBudget).sort((a, b) => b - a);
            let cum = 0;
            demandPoints.push({ x: 0, y: budgets[0] });
            budgets.forEach((b) => {
                if (cum > 0) demandPoints.push({ x: cum, y: b });
                cum += 1;
                demandPoints.push({ x: cum, y: b });
            });
        }

        // Clearing
        const clearing = sim.equilibriumData.map((d) => ({ x: d.transactionNum, y: d.clearingPrice }));

        return { supplyData: supplyPoints, demandData: demandPoints, clearingData: clearing };
    }, [sim.sellersRef.current, sim.buyersRef.current, sim.equilibriumData, sim.getEffectiveCost]);

    // Update chart when data changes
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.data.datasets = [
                { 
                    label: 'Supply (Cost)',
                     data: supplyData, borderColor: '#22c55e',
                     backgroundColor: 'rgba(34,197,94,0.1)',
                     borderWidth: 2.5, pointRadius: 0, stepped: true, fill: false, tension: 0 
                },
                { 
                    label: 'Demand (WTP)',
                     data: demandData, borderColor: '#ef4444',
                     backgroundColor: 'rgba(239,68,68,0.1)',
                     borderWidth: 2.5, pointRadius: 0, stepped: true, fill: false, tension: 0 
                },
                { 
                    label: 'Clearing Price',
                     data: clearingData, borderColor: '#4da6ff',
                     backgroundColor: '#4da6ff',
                     pointRadius: clearingData.length <= 30 ? 4 : 2, pointBackgroundColor: '#4da6ff',
                     showLine: false, type: 'line' 
                },
            ];
            chartRef.current.update();
        }
    }, [supplyData, demandData, clearingData]);

    return (
        <div className="min-h-screen flex flex-col items-center py-4 px-3 bg-[#14171c] text-gray-300 font-['Inter']">
            <header className="w-full max-w-full flex items-center justify-between mb-3 px-2">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Microeconomics Simulation</h1>
                    <p className="text-xs text-muted">Watch the market find its way!</p>
                </div>


                <div className="flex gap-2 items-center">
                    <span className="stat-badge text-white font-semibold bg-[#2a2d35] rounded-md px-3 py-1 text-sm">
                        Round {sim.round}
                    </span>
                    <span
                        className={`stat-badge rounded-md px-3 py-1 text-sm font-semibold ${sim.status === 'running'
                            ? 'text-success'
                            : sim.status === 'paused'
                                ? 'text-buyer'
                                : sim.status === 'roundEnd'
                                    ? 'text-buyer'
                                    : 'text-accent'
                            }`}
                    >
                        {sim.status === 'idle'
                            ? 'Ready'
                            : sim.status === 'running'
                                ? 'Running'
                                : sim.status === 'paused'
                                    ? 'Paused'
                                    : 'Round Ended'}
                    </span>
                </div>
            </header>

            <div className="w-full max-w-350 flex gap-3 mt-3 flex-wrap lg:flex-nowrap">
                <div className="shrink-0">
                    <Canvas
                        sellers={sim.sellersRef.current}
                        buyers={sim.buyersRef.current}
                        animations={sim.animationsRef.current}
                        round={sim.round}
                        status={sim.status}
                        isSellerActive={sim.isSellerActive}
                        getEffectiveAsk={sim.getEffectiveAsk}
                        frame={sim.frame}
                    />
                </div>

                <div className="flex-1 flex flex-col gap-3">
                    <Controls
                        status={sim.status}
                        speed={sim.speed}
                        dynamicPricing={sim.dynamicPricing}
                        bargaining={sim.bargaining}
                        onStart={sim.startRound}
                        onPause={sim.togglePause}
                        onReset={sim.resetSimulation}
                        onNext={sim.nextRound}
                        onSpeedChange={sim.setSpeed}
                        onDynamicPricingToggle={sim.setDynamicPricing}
                        onBargainingToggle={sim.setBargaining}
                        bargainPct={sim.bargainPct}
                        onBargainPctChange={sim.setBargainPct}
                    />

                    <Stats {...sim.stats} />

                    <Disruptors
                        disruptors={sim.disruptors}
                        onToggleDisruptor={sim.toggleDisruptor}
                        onDemandShock={sim.demandShock}
                    />

                    <Config
                        config={sim.config}
                        onConfigChange={sim.setConfig}
                        disabled={sim.status !== 'idle'}
                    />
                </div>
            </div>

            <div className="w-full max-w-350 flex gap-3 mt-6 flex-wrap lg:flex-nowrap">
                <div className="panel bg-panel border border-border rounded-lg p-3 flex-1 min-w-100" style={{ minHeight: '300px' }}>
                    <div className="section-label text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
                        <FontAwesomeIcon icon={faChartArea} className="text-accent mr-1" />
                        Live Equilibrium Curve
                    </div>
                    <Chart
                        ref={chartRef}
                        supplyData={supplyData}
                        demandData={demandData}
                        clearingData={clearingData}
                        disruptorEvents={sim.disruptorEvents}
                    />
                </div>

                <LogTable logs={sim.transactionLog} />
            </div>


            <SummaryModal
                isOpen={showSummary}
                onClose={() => setShowSummary(false)}
                transactionLog={sim.transactionLog}
                totalBuyers={sim.buyersRef.current.length}
            />
        </div>
    );
}

export default App;