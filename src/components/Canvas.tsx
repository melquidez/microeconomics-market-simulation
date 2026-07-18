import { useEffect, useMemo, useRef, RefObject } from 'react';
import { Seller, Buyer, SimStatus, Theme } from '../types';
import { useThemeMix, mixPalette } from '../utils/themeColors';

// Canvas palette for each theme. The 2D context can't read CSS variables, so
// the page passes the right palette based on the active theme (see useTheme).
const LIGHT_COLORS = {
    grid: 'rgba(15,23,42,0.07)',
    label: '#0f172a',
    sub: '#64748b',
    seller: '#2563eb',
    sellerStroke: '#1d4ed8',
    sellerSoldOut: '#94a3b8',
    sellerSoldOutStroke: '#64748b',
    sellerCapped: '#9aa6b2',
    sellerCappedStroke: '#64748b',
    stock: '#0ea5e9',
    buyer: '#d97706',
    buyerStroke: '#b45309',
    buyerNoDeal: '#9a3412',
    buyerNoDealStroke: '#7c2d12',
    glow: '34,197,94',
    round: 'rgba(15,23,42,0.55)',
};

const DARK_COLORS = {
    grid: 'rgba(148,163,184,0.10)',
    label: '#e2e8f0',
    sub: '#94a3b8',
    seller: '#3b82f6',
    sellerStroke: '#60a5fa',
    sellerSoldOut: '#64748b',
    sellerSoldOutStroke: '#94a3b8',
    sellerCapped: '#475569',
    sellerCappedStroke: '#64748b',
    stock: '#38bdf8',
    buyer: '#f59e0b',
    buyerStroke: '#fbbf24',
    buyerNoDeal: '#f97316',
    buyerNoDealStroke: '#fb923c',
    glow: '34,197,94',
    round: 'rgba(226,232,240,0.75)',
};

export type CanvasColors = typeof LIGHT_COLORS;

export interface DrawOptions {
    sellers: Seller[];
    buyers: Buyer[];
    animations: { x: number; y: number; type: string; timer: number; maxTimer: number }[];
    round: number;
    status: SimStatus;
    isSellerActive: (seller: Seller) => boolean;
    getEffectiveAsk: (seller: Seller) => number;
    colors: CanvasColors;
}

// Imperatively render the market onto a 2D canvas context. Kept as a plain
// function (not a React effect) so it can be called every animation frame
// without triggering a React re-render of the whole app.
export const drawMarket = (ctx: CanvasRenderingContext2D, opts: DrawOptions) => {
    const { sellers, buyers, animations, round, isSellerActive, getEffectiveAsk, colors } = opts;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;
    for (let x = 40; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 40; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Sellers
    sellers.forEach((s) => {
        if (s.glowTimer > 0) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius + 10, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${colors.glow},${(s.glowTimer / 0.6) * 0.5})`;
            ctx.fill();
        }
        const isCapped = s.status === 'capped';
        if (isCapped) ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle =
            s.status === 'soldOut' || s.status === 'exited'
                ? colors.sellerSoldOut
                : isCapped
                    ? colors.sellerCapped
                    : colors.seller;
        ctx.strokeStyle =
            s.status === 'soldOut' || s.status === 'exited'
                ? colors.sellerSoldOutStroke
                : colors.sellerStroke;
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();

        if (s.stock > 0 && isSellerActive(s)) {
            for (let i = 0; i < Math.min(s.stock, 5); i++) {
                const angle = (i / Math.min(s.stock, 5)) * Math.PI * 2 - Math.PI / 2;
                ctx.beginPath();
                ctx.arc(s.x + Math.cos(angle) * (s.radius + 6), s.y + Math.sin(angle) * (s.radius + 6), 2.5, 0, Math.PI * 2);
                ctx.fillStyle = colors.stock;
                ctx.fill();
            }
        }
        ctx.fillStyle = colors.label;
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        if (s.status === 'available') {
            ctx.fillText(`₱${getEffectiveAsk(s)}`, s.x, s.y - s.radius - 8);
        }
        ctx.fillStyle = colors.sub;
        ctx.font = '9px Inter';
        ctx.fillText(s.id, s.x, s.y + s.radius + 13);
        if (s.status === 'exited') {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 14px Inter';
            ctx.fillText('✕', s.x, s.y + 5);
        } else if (s.status === 'capped') {
            ctx.fillStyle = colors.sub;
            ctx.font = 'bold 9px Inter';
            ctx.fillText('CAP', s.x, s.y - s.radius - 20);
        }
        if (s.status === 'soldOut') {
            ctx.fillStyle = colors.sub;
            ctx.font = 'bold 10px Inter';
            ctx.fillText('SOLD', s.x, s.y + s.radius + 14);
        }
        ctx.globalAlpha = 1;
    });

    // Buyers
    buyers.forEach((b) => {
        // Transacted buyers fade + shrink out over a short "leaving" window
        // (leaveTimer) instead of vanishing instantly. Canvas keeps drawing
        // them until the timer reaches 0.
        const isLeaving = b.status === 'transacted' || b.status === 'noDeal';
        if (isLeaving && b.leaveTimer <= 0) return;
        const alpha = isLeaving ? Math.max(0, Math.min(1, b.leaveTimer / 0.4)) : 1;
        const r = isLeaving ? b.radius * Math.max(0.25, alpha) : b.radius;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fillStyle = b.status === 'noDeal' ? colors.buyerNoDeal : colors.buyer;
        ctx.strokeStyle = b.status === 'noDeal' ? colors.buyerNoDealStroke : colors.buyerStroke;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        if (b.flashTimer > 0) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, r + 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${colors.glow},${(b.flashTimer / 0.6) * 0.6})`;
            ctx.fill();
        }
        ctx.fillStyle = colors.label;
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`₱${b.maxBudget}`, b.x, b.y - r - 7);
        ctx.fillStyle = colors.sub;
        ctx.font = '9px Inter';
        ctx.fillText(b.id, b.x, b.y + r + 12);
        if (b.targetSeller && b.status === 'searching') {
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.targetSeller.x, b.targetSeller.y);
            ctx.strokeStyle = 'rgba(250,204,21,0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;
    });

    // Animations
    animations.forEach((a) => {
        const alpha = Math.min(1, a.timer / a.maxTimer);
        const yOff = (1 - a.timer / a.maxTimer) * -20;
        ctx.textAlign = 'center';
        if (a.type === 'happy') {
            ctx.font = '22px Inter';
            ctx.fillStyle = `rgba(${colors.glow},${alpha})`;
            ctx.fillText('😊', a.x, a.y + yOff - 10);
        } else if (a.type === 'nodeal') {
            ctx.font = 'bold 20px Inter';
            ctx.fillStyle = `rgba(239,68,68,${alpha})`;
            ctx.fillText('✗', a.x, a.y + yOff);
        } else if (a.type === 'exit') {
            ctx.font = 'bold 14px Inter';
            ctx.fillStyle = `rgba(239,68,68,${alpha})`;
            ctx.fillText('EXIT', a.x, a.y + yOff);
        } else if (a.type === 'cap') {
            ctx.font = 'bold 12px Inter';
            ctx.fillStyle = `rgba(156,163,175,${alpha})`;
            ctx.fillText('CAP', a.x, a.y + yOff);
        }
    });

    ctx.fillStyle = colors.round;
    ctx.font = '11px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`Round ${round}`, width - 16, 22);
    ctx.fillText(
        `Active: ${buyers.filter((b) => b.status === 'searching').length} buyers, ${sellers.filter((s) => isSellerActive(s)).length} sellers`,
        width - 16,
        40
    );
};

interface CanvasProps {
    sellersRef: RefObject<Seller[]>;
    buyersRef: RefObject<Buyer[]>;
    animationsRef: RefObject<{ x: number; y: number; type: string; timer: number; maxTimer: number }[]>;
    round: number;
    status: SimStatus;
    isSellerActive: (seller: Seller) => boolean;
    getEffectiveAsk: (seller: Seller) => number;
    // Active color theme (light | dark) — selects the canvas palette.
    theme: Theme;
    // Bumped whenever the static scene changes while not running (spawn,
    // reset, disruptor toggle, demand shock) so we repaint once.
    drawNonce: number;
}

// Canvas owns its own render loop. While the simulation is running it repaints
// every frame via requestAnimationFrame; while idle/paused/roundEnd it paints
// once. All painting is imperative (no React state), so the app does NOT
// re-render at 60fps just to animate the market.
export const Canvas = (props: CanvasProps) => {
    const { sellersRef, buyersRef, animationsRef, round, status, isSellerActive, getEffectiveAsk, drawNonce, theme } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mix = useThemeMix(theme);
    const colors = useMemo(() => mixPalette(LIGHT_COLORS, DARK_COLORS, mix), [mix]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const render = () => {
            drawMarket(ctx, {
                sellers: sellersRef.current ?? [],
                buyers: buyersRef.current ?? [],
                animations: animationsRef.current ?? [],
                round,
                status,
                isSellerActive,
                getEffectiveAsk,
                colors,
            });
        };

        if (status === 'running') {
            let raf = 0;
            const loop = () => {
                render();
                raf = requestAnimationFrame(loop);
            };
            raf = requestAnimationFrame(loop);
            return () => cancelAnimationFrame(raf);
        }

        // Not running: paint the (static) scene once.
        render();
    }, [status, round, isSellerActive, getEffectiveAsk, drawNonce, colors, sellersRef, buyersRef, animationsRef]);

    return <canvas ref={canvasRef} width="780" height="540" className="block rounded-xl bg-panel shadow-lg" />;
};
