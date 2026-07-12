import React, { forwardRef, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartOptions,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { DisruptorEvent } from '../types';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    annotationPlugin
);

interface ChartProps {
    supplyData: { x: number; y: number }[];
    demandData: { x: number; y: number }[];
    clearingData: { x: number; y: number }[];
    disruptorEvents: DisruptorEvent[];
    equilibrium: { qe: number; pe: number } | null;
}

export const Chart = forwardRef<any, ChartProps>(({ supplyData, demandData, clearingData, disruptorEvents, equilibrium }, ref) => {
    // Top chart: equilibrium cross only (quantity space — no time events here).
    const mainAnnotations = useMemo(() => {
        const ann: Record<string, any> = {};
        if (equilibrium) {
            // Vertical line at the equilibrium quantity.
            ann['eqV'] = {
                type: 'line',
                scaleID: 'x',
                value: equilibrium.qe,
                borderColor: 'rgba(250,204,21,0.9)',
                borderWidth: 2,
                borderDash: [5, 4],
                label: {
                    content: `Eq  Q=${equilibrium.qe}  P=₱${equilibrium.pe}`,
                    enabled: true,
                    position: 'start',
                    backgroundColor: 'rgba(250,204,21,0.95)',
                    color: '#000',
                    font: { size: 10, weight: 'bold' as const },
                    padding: 4,
                    cornerRadius: 4,
                },
            };
            // Horizontal "market price" line at the equilibrium price.
            ann['eqH'] = {
                type: 'line',
                scaleID: 'y',
                value: equilibrium.pe,
                borderColor: 'rgba(77,166,255,0.9)',
                borderWidth: 2,
                borderDash: [6, 4],
                label: {
                    content: `Market Price ₱${equilibrium.pe}`,
                    enabled: true,
                    position: 'end',
                    backgroundColor: 'rgba(77,166,255,0.95)',
                    color: '#fff',
                    font: { size: 10, weight: 'bold' as const },
                    padding: 4,
                    cornerRadius: 4,
                },
            };
        }
        return ann;
    }, [equilibrium]);

    // Bottom chart: disruptor shocks are time events, so they belong on the
    // "deal order" axis (x = transaction number), not the quantity axis.
    const clearingAnnotations = useMemo(() => {
        const ann: Record<string, any> = {};
        disruptorEvents.forEach((evt, i) => {
            ann[`d${i}`] = {
                type: 'line',
                scaleID: 'x',
                value: evt.transactionNum,
                borderColor: 'rgba(239,68,68,0.7)',
                borderWidth: 2,
                borderDash: [6, 4],
                label: {
                    content: evt.label,
                    enabled: true,
                    position: 'start',
                    backgroundColor: 'rgba(239,68,68,0.85)',
                    color: '#fff',
                    font: { size: 10, weight: 'bold' as const },
                    padding: 4,
                    cornerRadius: 4,
                },
            };
        });
        return ann;
    }, [disruptorEvents]);

    const mainDatasets = [
        {
            label: 'Supply (Cost)',
            data: supplyData,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.1)',
            borderWidth: 2.5,
            pointRadius: 0,
            stepped: true,
            fill: false,
            tension: 0,
        },
        {
            label: 'Demand (WTP)',
            data: demandData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.1)',
            borderWidth: 2.5,
            pointRadius: 0,
            stepped: true,
            fill: false,
            tension: 0,
        },
        ...(equilibrium
            ? [{
                label: 'Equilibrium',
                data: [{ x: equilibrium.qe, y: equilibrium.pe }],
                borderColor: '#facc15',
                backgroundColor: '#facc15',
                pointRadius: 6,
                pointBackgroundColor: '#facc15',
                showLine: false,
                type: 'line' as const,
            }]
            : []),
    ];

    const mainOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#9ca3af', font: { size: 11 }, boxWidth: 14 },
            },
            annotation: {
                annotations: mainAnnotations,
            },
        },
        scales: {
            x: {
                type: 'linear',
                title: { display: true, text: 'Quantity', color: '#9ca3af', font: { size: 10 } },
                ticks: { color: '#6b7280', stepSize: 1 },
                grid: { color: '#2a2d35' },
                min: 0,
            },
            y: {
                title: { display: true, text: 'Price (₱)', color: '#9ca3af', font: { size: 10 } },
                ticks: { color: '#6b7280' },
                grid: { color: '#2a2d35' },
                min: 0,
            },
        },
    };

    const clearingDatasets = [
        {
            label: 'Actual deal price',
            data: clearingData,
            borderColor: '#4da6ff',
            backgroundColor: '#4da6ff',
            pointRadius: clearingData.length <= 30 ? 3 : 2,
            pointBackgroundColor: '#4da6ff',
            showLine: true,
            tension: 0.2,
            borderWidth: 2,
        },
    ];

    const clearingOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            annotation: {
                annotations: clearingAnnotations,
            },
            tooltip: {
                callbacks: {
                    title: (items: any) => `Deal #${items[0]?.parsed?.x}`,
                    label: (item: any) => `Price ₱${item.parsed.y}`,
                },
            },
        },
        scales: {
            x: {
                type: 'linear',
                title: { display: true, text: 'Deal # (order of sale)', color: '#9ca3af', font: { size: 10 } },
                ticks: { color: '#6b7280', stepSize: 1 },
                grid: { color: '#2a2d35' },
                min: 0,
            },
            y: {
                title: { display: true, text: 'Price (₱)', color: '#9ca3af', font: { size: 10 } },
                ticks: { color: '#6b7280' },
                grid: { color: '#2a2d35' },
                min: 0,
            },
        },
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="relative" style={{ height: '260px' }}>
                <Line ref={ref} data={{ datasets: mainDatasets }} options={mainOptions} plugins={[annotationPlugin]} />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                Price of each sale — red lines mark shocks
            </div>
            <div className="relative" style={{ height: '140px' }}>
                <Line data={{ datasets: clearingDatasets }} options={clearingOptions} plugins={[annotationPlugin]} />
            </div>
        </div>
    );
});

Chart.displayName = 'Chart';
