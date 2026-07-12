import { Dispatch, RefObject, SetStateAction } from 'react';
import {
    Buyer,
    Config,
    DisruptorEvent,
    DisruptorType,
    Seller,
    SimStatus,
} from '../types';


// Starts the  round


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
    
    
    // Prevent starting if simulation already running
    if (status !== 'idle') return;

    // Generate buyers and sellers
    spawnAgents(config);

    // Initialize round and start simulation
    setRound(1);
    setStatus('running');

    
    
    // Store current timestamp for delta time calculations
    
    if (lastTimeRef.current !== undefined) {
        lastTimeRef.current = performance.now();
    }

    // Start animation loop if not already running
    if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
};



// Pauses or resumes the simulation

export const togglePauseAction = (
    status: SimStatus,
    setStatus: Dispatch<SetStateAction<SimStatus>>,
    lastTimeRef: RefObject<number>
) => {


    // Pause simulation
    if (status === 'running') {
        setStatus('paused');

    // Resume simulation
    } else if (status === 'paused') {
        setStatus('running');

        // Reset timer to avoid large dt jump
        if (lastTimeRef.current !== undefined) {
            lastTimeRef.current = performance.now();
        }
    }
};



// Fully resets simulation state
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
    // Return simulation to initial state
    setStatus('idle');
    setRound(1);

    // Clear all agents and animations
    if (sellersRef.current) sellersRef.current = [];
    if (buyersRef.current) buyersRef.current = [];
    if (animationsRef.current) animationsRef.current = [];

    // Clear simulation data/history
    setTransactionLog([]);
    setEquilibriumData([]);
    setDisruptorEvents([]);

    // Remove all active disruptors
    setDisruptors({
        priceCeiling: null,
        priceFloor: null,
        tax: null,
        subsidy: null,
    });


    // Reset displayed statistics
    setStats({
        transactions: 0,
        noDeals: 0,
        avgPrice: '-',
        activeBuyers: 0,
        activeSellers: 0,
        efficiency: '-',
    });


    // Stop animation loop

    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }

    // Spawn fresh agent
    spawnAgents(config);
};



// Moves simulation to the next round
export const nextRoundAction = (
    status: SimStatus,
    setStatus: Dispatch<SetStateAction<SimStatus>>,
    setRound: Dispatch<SetStateAction<number>>,
    spawnAgents: (cfg: Config) => void,
    config: Config
) => {

    // Only proceed when current round has ended
    if (status !== 'roundEnd') return;


    setStatus('idle');
    setRound((r) => r + 1);

    // Generate agent 
    spawnAgents(config);
};

// Adds a marker to indicate when a disruptor was activated
export const addDisruptorMarkerAction = (
    equilibriumData: { transactionNum: number; clearingPrice: number }[],
    setDisruptorEvents: Dispatch<SetStateAction<DisruptorEvent[]>>,
    label: string
) => {
    setDisruptorEvents((prev) => [
        ...prev,
        {
            // Mark current transaction position on chart/history
            transactionNum: equilibriumData.length || 1,
            label,
        },
    ]);
};

// Enables or disables a market disruptor
export const toggleDisruptorAction = (
    type: DisruptorType,
    amount: number,
    setDisruptors: Dispatch<SetStateAction<any>>,
    addDisruptorMarker: (label: string) => void
) => {
    setDisruptors((prev: any) => {
        const newDisruptors = { ...prev };

        // Turn off disruptor if already active
        if (prev[type]) {
            newDisruptors[type] = null;
        } else {
            // Activate disruptor with specified amount
            newDisruptors[type] = { amount };

            // Add event marker for tracking/charting
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