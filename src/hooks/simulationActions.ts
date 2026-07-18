import { Dispatch, RefObject, SetStateAction } from 'react';
import {
    Buyer,
    Config,
    DisruptorEvent,
    DisruptorState,
    DisruptorType,
    Seller,
    SimStatus,
    Stats,
    TransactionLogEntry,
} from '../types';


// Starts the  round


export const startRoundAction = (
    status: SimStatus,
    config: Config,
    spawnAgents: (cfg: Config) => void,
    setRound: Dispatch<SetStateAction<number>>,
    setStatus: Dispatch<SetStateAction<SimStatus>>,
    lastTimeRef: RefObject<number>
) => {
    
    
    // Prevent starting if simulation already running
    if (status !== 'idle') return;

    // Generate buyers and sellers
    spawnAgents(config);

    // Start the simulation. The round number is already correct: it is 1 on
    // first load / after reset (resetSimulationAction sets it), and is
    // incremented by nextRoundAction between rounds. Do NOT reset it here,
    // otherwise every round after the first would display as "Round 1".
    setStatus('running');

    
    
    // Store current timestamp for delta time calculations
    
    if (lastTimeRef.current !== undefined) {
        lastTimeRef.current = performance.now();
    }

    // NOTE: the animation loop is (re)started by the hook via startLoop(), so
    // we don't start it here. This keeps loop ownership in one place and lets
    // the loop stop cleanly when the simulation is not running.
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
    setTransactionLog: Dispatch<SetStateAction<TransactionLogEntry[]>>,
    setEquilibriumData: Dispatch<SetStateAction<{ transactionNum: number; clearingPrice: number }[]>>,
    setDisruptorEvents: Dispatch<SetStateAction<DisruptorEvent[]>>,
    setDisruptors: Dispatch<SetStateAction<DisruptorState>>,
    setStats: Dispatch<SetStateAction<Stats>>,
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

// Enables or disables a market disruptor.
// NOTE: the marker is added OUTSIDE the setDisruptors updater so the updater
// stays pure. Calling setState inside an updater double-fires under React 19
// StrictMode, which would drop duplicate markers on the deal-price chart.
export const toggleDisruptorAction = (
    type: DisruptorType,
    amount: number,
    currentDisruptors: DisruptorState,
    setDisruptors: Dispatch<SetStateAction<DisruptorState>>,
    addDisruptorMarker: (label: string) => void
) => {
    const isActive = currentDisruptors[type] !== null;

    if (!isActive) {
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

    setDisruptors((prev) => {
        const newDisruptors = { ...prev };
        if (isActive) {
            newDisruptors[type] = null;
        } else {
            // Activate disruptor with specified amount
            newDisruptors[type] = { amount };
        }
        return newDisruptors;
    });
};