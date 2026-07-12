import { Dispatch, RefObject, SetStateAction } from 'react';
import {
    Buyer,
    Config,
    DisruptorEvent,
    DisruptorType,
    Seller,
    SimStatus,
} from '../types';

export const startRoundAction = (
    status: SimStatus,
    config: Config,
    spawnAgents: (cfg: Config) => void,
    setRound: Dispatch<SetStateAction<number>>,
    setStatus: Dispatch<SetStateAction<SimStatus>>,
    lastTimeRef: RefObject<number>,
    animationFrameRef: RefObject<number | null>,
    gameLoop: (timestamp: number) => void
) => {
    if (status !== 'idle') return;
    spawnAgents(config);
    setRound(1);
    setStatus('running');
    if (lastTimeRef.current !== undefined) {
        lastTimeRef.current = performance.now();
    }
    if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
};

export const togglePauseAction = (
    status: SimStatus,
    setStatus: Dispatch<SetStateAction<SimStatus>>,
    lastTimeRef: RefObject<number>
) => {
    if (status === 'running') {
        setStatus('paused');
    } else if (status === 'paused') {
        setStatus('running');
        if (lastTimeRef.current !== undefined) {
            lastTimeRef.current = performance.now();
        }
    }
};

export const resetSimulationAction = (
    config: Config,
    spawnAgents: (cfg: Config) => void,
    setStatus: Dispatch<SetStateAction<SimStatus>>,
    setRound: Dispatch<SetStateAction<number>>,
    sellersRef: RefObject<Seller[]>,
    buyersRef: RefObject<Buyer[]>,
    animationsRef: RefObject<{ x: number; y: number; type: string; timer: number; maxTimer: number }[]>,
    setTransactionLog: Dispatch<SetStateAction<any[]>>,
    setEquilibriumData: Dispatch<SetStateAction<{ transactionNum: number; clearingPrice: number }[]>>,
    setDisruptorEvents: Dispatch<SetStateAction<DisruptorEvent[]>>,
    setDisruptors: Dispatch<SetStateAction<any>>,
    setStats: Dispatch<SetStateAction<any>>,
    animationFrameRef: RefObject<number | null>
) => {
    setStatus('idle');
    setRound(1);
    if (sellersRef.current) sellersRef.current = [];
    if (buyersRef.current) buyersRef.current = [];
    if (animationsRef.current) animationsRef.current = [];
    setTransactionLog([]);
    setEquilibriumData([]);
    setDisruptorEvents([]);
    setDisruptors({
        priceCeiling: null,
        priceFloor: null,
        tax: null,
        subsidy: null,
    });
    setStats({
        transactions: 0,
        noDeals: 0,
        avgPrice: '-',
        activeBuyers: 0,
        activeSellers: 0,
        efficiency: '-',
    });
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    spawnAgents(config);
};

export const nextRoundAction = (
    status: SimStatus,
    setStatus: Dispatch<SetStateAction<SimStatus>>,
    setRound: Dispatch<SetStateAction<number>>,
    spawnAgents: (cfg: Config) => void,
    config: Config
) => {
    if (status !== 'roundEnd') return;
    setStatus('idle');
    setRound((r) => r + 1);
    spawnAgents(config);
};

export const addDisruptorMarkerAction = (
    equilibriumData: { transactionNum: number; clearingPrice: number }[],
    setDisruptorEvents: Dispatch<SetStateAction<DisruptorEvent[]>>,
    label: string
) => {
    setDisruptorEvents((prev) => [
        ...prev,
        { transactionNum: equilibriumData.length || 1, label },
    ]);
};

export const toggleDisruptorAction = (
    type: DisruptorType,
    amount: number,
    setDisruptors: Dispatch<SetStateAction<any>>,
    addDisruptorMarker: (label: string) => void
) => {
    setDisruptors((prev: any) => {
        const newDisruptors = { ...prev };
        if (prev[type]) {
            newDisruptors[type] = null;
        } else {
            newDisruptors[type] = { amount };
            addDisruptorMarker(
                type === 'priceCeiling'
                    ? 'Price Ceiling'
                    : type === 'priceFloor'
                        ? 'Price Floor'
                        : type === 'tax'
                            ? 'Tax Applied'
                            : 'Subsidy Applied'
            );
        }
        return newDisruptors;
    });
};
