import React, { useEffect, useRef } from 'react';
import { Seller, Buyer, SimStatus } from '../types';

interface CanvasProps {
    sellers: Seller[];
    buyers: Buyer[];
    animations: { x: number; y: number; type: string; timer: number; maxTimer: number }[];
    round: number;
    status: SimStatus;
    isSellerActive: (seller: Seller) => boolean;
    getEffectiveAsk: (seller: Seller) => number;
    frame: number; 
}

export const Canvas: React.FC<CanvasProps> = ({
    sellers,
    buyers,
    animations,
    round,
    status,
    isSellerActive,
    getEffectiveAsk,
    frame,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = '#252830';
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
                ctx.fillStyle = `rgba(34,197,94,${(s.glowTimer / 0.6) * 0.5})`;
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = s.status === 'soldOut' || s.status === 'exited' ? '#555' : '#2563eb';
            ctx.strokeStyle = s.status === 'soldOut' || s.status === 'exited' ? '#666' : '#60a5fa';
            ctx.lineWidth = 2.5;
            ctx.fill();
            ctx.stroke();

            if (s.stock > 0 && isSellerActive(s)) {
                for (let i = 0; i < Math.min(s.stock, 5); i++) {
                    const angle = (i / Math.min(s.stock, 5)) * Math.PI * 2 - Math.PI / 2;
                    ctx.beginPath();
                    ctx.arc(s.x + Math.cos(angle) * (s.radius + 6), s.y + Math.sin(angle) * (s.radius + 6), 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#a5f3fc';
                    ctx.fill();
                }
            }
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';
            if (s.status === 'available') {
                ctx.fillText(`₱${getEffectiveAsk(s)}`, s.x, s.y - s.radius - 8);
            }
            ctx.fillStyle = '#9ca3af';
            ctx.font = '9px Inter';
            ctx.fillText(s.id, s.x, s.y + s.radius + 13);
            if (s.status === 'exited') {
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px Inter';
                ctx.fillText('✕', s.x, s.y + 5);
            }
            if (s.status === 'soldOut') {
                ctx.fillStyle = '#9ca3af';
                ctx.font = 'bold 10px Inter';
                ctx.fillText('SOLD', s.x, s.y + s.radius + 14);
            }
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
            ctx.fillStyle = b.status === 'noDeal' ? '#78350f' : '#eab308';
            ctx.strokeStyle = b.status === 'noDeal' ? '#92400e' : '#fde047';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            if (b.flashTimer > 0) {
                ctx.beginPath();
                ctx.arc(b.x, b.y, r + 8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(34,197,94,${(b.flashTimer / 0.6) * 0.6})`;
                ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`₱${b.maxBudget}`, b.x, b.y - r - 7);
            ctx.fillStyle = '#9ca3af';
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
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.fillText('😊', a.x, a.y + yOff - 10);
            } else if (a.type === 'nodeal') {
                ctx.font = 'bold 20px Inter';
                ctx.fillStyle = `rgba(239,68,68,${alpha})`;
                ctx.fillText('✗', a.x, a.y + yOff);
            } else if (a.type === 'exit') {
                ctx.font = 'bold 14px Inter';
                ctx.fillStyle = `rgba(239,68,68,${alpha})`;
                ctx.fillText('EXIT', a.x, a.y + yOff);
            }
        });

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(`Round ${round}`, width - 16, 22);
        ctx.fillText(
            `Active: ${buyers.filter((b) => b.status === 'searching').length} buyers, ${sellers.filter((s) => isSellerActive(s)).length} sellers`,
            width - 16,
            40
        );
    }, [sellers, buyers, animations, round, isSellerActive, getEffectiveAsk, frame]);

    return <canvas ref={canvasRef} width="780" height="540" className="rounded-xl bg-panel shadow-lg block" />;
};