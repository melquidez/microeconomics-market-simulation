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
}

export const Chart = forwardRef<any, ChartProps>(({ supplyData, demandData, clearingData, disruptorEvents }, ref) => {
    const annotations = useMemo(() => {
        const ann: Record<string, any> = {};
        disruptorEvents.forEach((evt, i) => {
            ann[`d${i}`] = {
                type: 'line',
                xMin: evt.transactionNum,
                xMax: evt.transactionNum,
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

    const datasets = [
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
        {
            label: 'Clearing Price',
            data: clearingData,
            borderColor: '#4da6ff',
            backgroundColor: '#4da6ff',
            pointRadius: clearingData.length <= 30 ? 4 : 2,
            pointBackgroundColor: '#4da6ff',
            showLine: false,
            type: 'line' as const,
        },
    ];

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#9ca3af', font: { size: 11 }, boxWidth: 14 },
            },
            annotation: {
                annotations,
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
        <div className="relative" style={{ height: '260px' }}>
            <Line ref={ref} data={{ datasets }} options={options} plugins={[annotationPlugin]} />
        </div>
    );
});

Chart.displayName = 'Chart';