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
    ChartEvent,
    ActiveElement,
    TooltipItem,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { DisruptorEvent, ChartAnnotations, Theme } from '../types';
import { useThemeMix, mixAxis } from '../utils/themeColors';

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

// Axis/grid/label colors per theme (canvas can't read CSS vars).
const AXIS_LIGHT = { grid: 'rgba(15,23,42,0.08)', tick: '#475569', title: '#64748b', legend: '#64748b' };
const AXIS_DARK = { grid: 'rgba(148,163,184,0.10)', tick: '#94a3b8', title: '#94a3b8', legend: '#94a3b8' };

interface DealPriceChartProps {
    clearingData: { x: number; y: number }[];
    disruptorEvents: DisruptorEvent[];
    onDealClick?: (transactionNum: number) => void;
    theme: Theme;
}

export const DealPriceChart = ({ clearingData, disruptorEvents, onDealClick, theme }: DealPriceChartProps) => {
    const mix = useThemeMix(theme);
    const axis = useMemo(() => mixAxis(AXIS_LIGHT, AXIS_DARK, mix), [mix]);

    // Disruptor shocks are time events, so they belong on the "deal order"
    // axis (x = transaction number), not the quantity axis.
    const clearingAnnotations = useMemo(() => {
        const ann: ChartAnnotations = {};
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
        onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
            if (elements.length > 0) {
                const idx = elements[0].index;
                const point = clearingData[idx];
                if (point && onDealClick) onDealClick(point.x);
            }
        },
        onHover: (event: ChartEvent, elements: ActiveElement[]) => {
            const el = event.native?.target as HTMLElement | null;
            if (el) el.style.cursor = elements.length ? 'pointer' : 'default';
        },
        plugins: {
            legend: { display: false },
            annotation: {
                annotations: clearingAnnotations as unknown as Record<string, AnnotationOptions>,
            },
            tooltip: {
                callbacks: {
                    title: (items: TooltipItem<'line'>[]) => `Deal #${items[0]?.parsed?.x}`,
                    label: (item: TooltipItem<'line'>) => `Price ₱${item.parsed.y}`,
                },
            },
        },
        scales: {
            x: {
                type: 'linear',
                title: { display: true, text: 'Deal # (order of sale)', color: axis.title, font: { size: 10 } },
                ticks: { color: axis.tick, stepSize: 1 },
                grid: { color: axis.grid },
                min: 0,
            },
            y: {
                title: { display: true, text: 'Price (₱)', color: axis.title, font: { size: 10 } },
                ticks: { color: axis.tick },
                grid: { color: axis.grid },
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
