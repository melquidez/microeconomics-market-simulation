'use client';

import React, { useMemo, useState } from 'react';
import { ChartAnnotations } from '../types';
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

    const [summaryDismissed, setSummaryDismissed] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);

    const showSummary = sim.status === 'roundEnd' && !summaryDismissed;

    // Re-open the round summary at the next round end; the flag is cleared
    // whenever a new round begins.
    const handleStart = () => { setSummaryDismissed(false); sim.startRound(); };
    const handleNext = () => { setSummaryDismissed(false); sim.nextRound(); };
    const handleReset = () => { setSummaryDismissed(false); sim.resetSimulation(); };

    // Compute supply/demand data for chart
    const { supplyData, demandData, clearingData, equilibrium, disruptorAnnotations } = useMemo(() => {
        const sellers = sim.sellersRef.current;
        const buyers = sim.buyersRef.current;
        const getEffectiveCost = sim.getEffectiveCost; // now a function (seller) => number
        const disruptors = sim.disruptors;

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

        // Extend both staircases to a shared right edge so neither line looks
        // "cut off" mid-chart (flat continuation at the last level — textbook style).
        if (supplyPoints.length && demandPoints.length) {
            const xMax = Math.max(
                supplyPoints[supplyPoints.length - 1].x,
                demandPoints[demandPoints.length - 1].x
            );
            const sLast = supplyPoints[supplyPoints.length - 1];
            if (sLast.x < xMax) supplyPoints.push({ x: xMax, y: sLast.y });
            const dLast = demandPoints[demandPoints.length - 1];
            if (dLast.x < xMax) demandPoints.push({ x: xMax, y: dLast.y });
        }

        // Clearing
        const clearing = sim.equilibriumData.map((d) => ({ x: d.transactionNum, y: d.clearingPrice }));

        // Equilibrium: the price where cumulative quantity supplied meets cumulative demand.
        let equilibrium: { qe: number; pe: number } | null = null;
        if (nonExited.length && buyers.length) {
            const qSupply = (p: number) =>
                nonExited.filter((s) => getEffectiveCost(s) <= p).reduce((sum, s) => sum + s.originalStock, 0);
            const qDemand = (p: number) => buyers.filter((b) => b.maxBudget >= p).length;
            const minP = Math.min(...nonExited.map((s) => getEffectiveCost(s)), ...buyers.map((b) => b.maxBudget));
            const maxP = Math.max(...nonExited.map((s) => getEffectiveCost(s)), ...buyers.map((b) => b.maxBudget));
            let prevDiff = qSupply(minP) - qDemand(minP);
            let found = false;
            for (let p = minP + 1; p <= maxP; p++) {
                const diff = qSupply(p) - qDemand(p);
                if ((prevDiff < 0 && diff >= 0) || (prevDiff > 0 && diff <= 0)) {
                    equilibrium = { qe: qSupply(p), pe: p };
                    found = true;
                    break;
                }
                prevDiff = diff;
            }
            if (!found) {
                // No interior crossing (excess supply/demand throughout): use price minimizing the gap.
                let bestP = minP;
                let bestDiff = Math.abs(prevDiff);
                for (let p = minP; p <= maxP; p++) {
                    const d = Math.abs(qSupply(p) - qDemand(p));
                    if (d < bestDiff) {
                        bestDiff = d;
                        bestP = p;
                    }
                }
                equilibrium = { qe: qSupply(bestP), pe: bestP };
            }
        }

        // Disruptor overlays: ceiling/floor lines plus shortage/surplus shading
        // and the tax wedge. These make the disequilibrium caused by a binding
        // price control visible instead of implying the market still clears.
        const disruptorAnnotations: ChartAnnotations = {};
        const qSupplyAt = (p: number) =>
            nonExited.filter((s) => getEffectiveCost(s) <= p).reduce((sum, s) => sum + s.originalStock, 0);
        const qDemandAt = (p: number) => buyers.filter((b) => b.maxBudget >= p).length;
        const band = (p: number) => ({ yMin: Math.max(0, p - 12), yMax: p + 12 });
        if (disruptors.priceCeiling) {
            const pc = disruptors.priceCeiling.amount;
            disruptorAnnotations['ceiling'] = {
                type: 'line',
                scaleID: 'y',
                value: pc,
                borderColor: 'rgba(239,68,68,0.95)',
                borderWidth: 2,
                borderDash: [4, 3],
                label: {
                    content: `Price Ceiling ₱${pc}`,
                    enabled: true,
                    position: 'start',
                    backgroundColor: 'rgba(239,68,68,0.95)',
                    color: '#fff',
                    font: { size: 10, weight: 'bold' as const },
                    padding: 3,
                    cornerRadius: 4,
                },
            };
            if (equilibrium && pc < equilibrium.pe) {
                const qs = qSupplyAt(pc);
                const qd = qDemandAt(pc);
                if (qd > qs) {
                    disruptorAnnotations['shortage'] = {
                        type: 'box',
                        xMin: qs,
                        xMax: qd,
                        ...band(pc),
                        backgroundColor: 'rgba(239,68,68,0.18)',
                        borderWidth: 0,
                        label: {
                            content: `Shortage ${qd - qs}`,
                            enabled: true,
                            position: 'center',
                            color: '#fecaca',
                            font: { size: 10, weight: 'bold' as const },
                        },
                    };
                }
            }
        }
        if (disruptors.priceFloor) {
            const pf = disruptors.priceFloor.amount;
            disruptorAnnotations['floor'] = {
                type: 'line',
                scaleID: 'y',
                value: pf,
                borderColor: 'rgba(59,130,246,0.95)',
                borderWidth: 2,
                borderDash: [4, 3],
                label: {
                    content: `Price Floor ₱${pf}`,
                    enabled: true,
                    position: 'start',
                    backgroundColor: 'rgba(59,130,246,0.95)',
                    color: '#fff',
                    font: { size: 10, weight: 'bold' as const },
                    padding: 3,
                    cornerRadius: 4,
                },
            };
            if (equilibrium && pf > equilibrium.pe) {
                const qs = qSupplyAt(pf);
                const qd = qDemandAt(pf);
                if (qs > qd) {
                    disruptorAnnotations['surplus'] = {
                        type: 'box',
                        xMin: qd,
                        xMax: qs,
                        ...band(pf),
                        backgroundColor: 'rgba(59,130,246,0.18)',
                        borderWidth: 0,
                        label: {
                            content: `Surplus ${qs - qd}`,
                            enabled: true,
                            position: 'center',
                            color: '#bfdbfe',
                            font: { size: 10, weight: 'bold' as const },
                        },
                    };
                }
            }
        }
        if (disruptors.tax && equilibrium) {
            const t = disruptors.tax.amount;
            disruptorAnnotations['taxWedge'] = {
                type: 'box',
                xMin: Math.max(0, equilibrium.qe - 3),
                xMax: equilibrium.qe + 3,
                yMin: equilibrium.pe - t,
                yMax: equilibrium.pe,
                backgroundColor: 'rgba(250,204,21,0.18)',
                borderWidth: 0,
                label: {
                    content: `Tax ₱${t}`,
                    enabled: true,
                    position: 'center',
                    color: '#fde68a',
                    font: { size: 10, weight: 'bold' as const },
                },
            };
            disruptorAnnotations['sellerReceive'] = {
                type: 'line',
                scaleID: 'y',
                value: equilibrium.pe - t,
                borderColor: 'rgba(34,197,94,0.9)',
                borderWidth: 1.5,
                borderDash: [3, 3],
            };
        }
        if (disruptors.subsidy && equilibrium) {
            // A subsidy shifts the effective supply curve down by the per-unit
            // amount, so the drawn supply already reflects it and `pe` is the
            // (lower) price consumers pay. Producers receive pe + subsidy; the
            // wedge between the two is the government's per-unit payment.
            const sub = disruptors.subsidy.amount;
            disruptorAnnotations['subsidyWedge'] = {
                type: 'box',
                xMin: Math.max(0, equilibrium.qe - 3),
                xMax: equilibrium.qe + 3,
                yMin: equilibrium.pe,
                yMax: equilibrium.pe + sub,
                backgroundColor: 'rgba(34,197,94,0.18)',
                borderWidth: 0,
                label: {
                    content: `Subsidy ₱${sub}`,
                    enabled: true,
                    position: 'center',
                    color: '#bbf7d0',
                    font: { size: 10, weight: 'bold' as const },
                },
            };
            disruptorAnnotations['subsidyProducerReceive'] = {
                type: 'line',
                scaleID: 'y',
                value: equilibrium.pe + sub,
                borderColor: 'rgba(34,197,94,0.9)',
                borderWidth: 1.5,
                borderDash: [3, 3],
                label: {
                    content: `Producer gets ₱${equilibrium.pe + sub}`,
                    enabled: true,
                    position: 'end',
                    backgroundColor: 'rgba(34,197,94,0.9)',
                    color: '#fff',
                    font: { size: 10, weight: 'bold' as const },
                    padding: 3,
                    cornerRadius: 4,
                },
            };
        }

        return { supplyData: supplyPoints, demandData: demandPoints, clearingData: clearing, equilibrium, disruptorAnnotations };
    // Agent refs are read for their current values; supply/demand only change
    // on spawn (new array ref), a disruptor toggle, or a demand shock
    // (drawNonce) — all captured in the deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sim.sellersRef.current, sim.buyersRef.current, sim.equilibriumData, sim.getEffectiveCost, sim.disruptors, sim.drawNonce]);

    // Chart updates reactively through <Chart> props (datasets + annotations).

    return (
        <div className="min-h-screen flex flex-col items-center py-4 px-3 bg-panel text-gray-300 font-['Inter']">
            <header className="w-full max-w-full flex items-center justify-between mb-3 px-2">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Microeconomics Simulation</h1>
                    <p className="text-xs text-muted">Watch the market find its way!</p>
                </div>


                <div className="flex gap-2 items-center">
                    <span className="stat-badge text-white font-semibold bg-panel rounded-md px-3 py-1 text-sm">
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
                        sellersRef={sim.sellersRef}
                        buyersRef={sim.buyersRef}
                        animationsRef={sim.animationsRef}
                        round={sim.round}
                        status={sim.status}
                        isSellerActive={sim.isSellerActive}
                        getEffectiveAsk={sim.getEffectiveAsk}
                        drawNonce={sim.drawNonce}
                    />
                </div>

                <div className="flex-1 flex flex-col gap-3">
                    <Controls
                        status={sim.status}
                        speed={sim.speed}
                        dynamicPricing={sim.dynamicPricing}
                        bargaining={sim.bargaining}
                        onStart={handleStart}
                        onPause={sim.togglePause}
                        onReset={handleReset}
                        onNext={handleNext}
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
                <div className="panel bg-panel border border-border rounded-lg p-3 flex-1 min-w-100" style={{ minHeight: '440px' }}>
                    <div className="section-label text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
                        <FontAwesomeIcon icon={faChartArea} className="text-accent mr-1" />
                        Live Equilibrium Curve
                    </div>
                    <Chart
                        supplyData={supplyData}
                        demandData={demandData}
                        clearingData={clearingData}
                        disruptorEvents={sim.disruptorEvents}
                        equilibrium={equilibrium}
                        disruptorAnnotations={disruptorAnnotations}
                        onDealClick={setSelectedTransaction}
                    />
                </div>

                <LogTable logs={sim.transactionLog} selectedTransaction={selectedTransaction} />
            </div>


            <SummaryModal
                isOpen={showSummary}
                onClose={() => setSummaryDismissed(true)}
                transactionLog={sim.transactionLog}
                totalBuyers={sim.buyersRef.current.length}
                allocativeEfficiency={sim.stats.allocativeEfficiency}
                deadweightLoss={sim.stats.deadweightLoss}
            />
        </div>
    );
}

export default App;