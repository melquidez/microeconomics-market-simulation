import React, { useMemo } from 'react';
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
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { DisruptorEvent, ChartAnnotations } from '../types';
import { DealPriceChart } from './DealPriceChart';

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
    disruptorAnnotations?: ChartAnnotations;
    onDealClick?: (transactionNum: number) => void;
}

export const Chart = ({ supplyData, demandData, clearingData, disruptorEvents, equilibrium, disruptorAnnotations, onDealClick }: ChartProps) => {
    // Top chart: equilibrium cross only (quantity space — no time events here).
    const mainAnnotations = useMemo(() => {
        const ann: ChartAnnotations = {};
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
                annotations: { ...mainAnnotations, ...(disruptorAnnotations ?? {}) } as unknown as Record<string, AnnotationOptions>,
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



    return (
        <div className="flex flex-col gap-2">
            <div className="relative" style={{ height: '260px' }}>
                <Line data={{ datasets: mainDatasets }} options={mainOptions} plugins={[annotationPlugin]} />
            </div>
            <DealPriceChart clearingData={clearingData} disruptorEvents={disruptorEvents} onDealClick={onDealClick} />
        </div>
    );
};

Chart.displayName = 'Chart';
