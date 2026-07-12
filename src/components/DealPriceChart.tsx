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

interface DealPriceChartProps {
    clearingData: { x: number; y: number }[];
    disruptorEvents: DisruptorEvent[];
    onDealClick?: (transactionNum: number) => void;
}

export const DealPriceChart = ({ clearingData, disruptorEvents, onDealClick }: DealPriceChartProps) => {
    // Disruptor shocks are time events, so they belong on the "deal order"
    // axis (x = transaction number), not the quantity axis.
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

    const clearingDatasets = [
        {
            label: 'Actual deal price',
            data: clearingData,
            borderColor: '#4da6ff',
            backgroundColor: '#4da6ff',
            pointRadius: clearingData.length <= 30 ? 3 : 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#4da6ff',
            showLine: true,
            tension: 0.2,
            borderWidth: 2,
        },
    ];

    const clearingOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        onClick: (_event: any, elements: any) => {
            if (elements.length > 0) {
                const idx = elements[0].index;
                const point = clearingData[idx];
                if (point && onDealClick) onDealClick(point.x);
            }
        },
        onHover: (event: any, elements: any) => {
            const el = event?.native?.target as HTMLElement | null;
            if (el) el.style.cursor = elements.length ? 'pointer' : 'default';
        },
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
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                Price of each sale — red lines mark shocks
            </div>
            <div className="relative" style={{ height: '140px' }}>
                <Line data={{ datasets: clearingDatasets }} options={clearingOptions} plugins={[annotationPlugin]} />
            </div>
        </div>
    );
};
