import { useState, useRef, useCallback, useEffect } from 'react';
import {
    Seller,
    Buyer,
    TransactionLogEntry,
    DisruptorEvent,
    DisruptorState,
    Config,
    SimStatus,
    Stats,
    DisruptorType,
    Position
} from '../types';
import { randomInRange, findNonOverlappingPosition } from '../utils/helpers';
import {
    getEffectiveCost as helperGetEffectiveCost,
    getEffectiveAsk as helperGetEffectiveAsk,
    isSellerActive as helperIsSellerActive,
    findTargetForBuyer as helperFindTargetForBuyer,
    isSuccessfulOutcome,
    createSeller,
    createBuyer,
    buildTransactionEntry,
    updateSimulationFrame,
    applyDisruptorEffects as helperApplyDisruptorEffects,
    checkRoundEndState,
} from './simulationHelpers';
import {
    startRoundAction,
    togglePauseAction,
    resetSimulationAction,
    nextRoundAction,
    toggleDisruptorAction,
    addDisruptorMarkerAction,
} from './simulationActions';

export const useSimulation = (initialConfig: Config) => {
    // Track simulation progress and market state
    const [config, setConfig] = useState<Config>(initialConfig);
    const [status, setStatus] = useState<SimStatus>('idle');
    const [round, setRound] = useState<number>(1);
    const [transactionLog, setTransactionLog] = useState<TransactionLogEntry[]>([]);
    const [equilibriumData, setEquilibriumData] = useState<{ transactionNum: number; clearingPrice: number }[]>([]);
    const [disruptorEvents, setDisruptorEvents] = useState<DisruptorEvent[]>([]);
    const [dynamicPricing, setDynamicPricing] = useState<boolean>(false);
    const [bargaining, setBargaining] = useState<boolean>(false);
    const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
    const [disruptors, setDisruptors] = useState<DisruptorState>({
        priceCeiling: null,
        priceFloor: null,
        tax: null,
        subsidy: null,
    });
    const [stats, setStats] = useState<Stats>({
        transactions: 0,
        noDeals: 0,
        avgPrice: '--',
        activeBuyers: 0,
        activeSellers: 0,
        efficiency: '--',
    });

    // Force re-render on each frame (for canvas updates)
    const [frame, setFrame] = useState(0); 


    //


    // Memoized helpers in current disruptors
    const getEffectiveCost = useCallback(
        (seller: Seller) => helperGetEffectiveCost(seller, disruptors),
        [disruptors]
    );

    const getEffectiveAsk = useCallback(
        (seller: Seller) => helperGetEffectiveAsk(seller, disruptors),
        [disruptors]
    );

    const isSellerActive = useCallback(
        (seller: Seller) => helperIsSellerActive(seller, disruptors),
        [disruptors]
    );

    const findTargetForBuyer = useCallback(
        (buyer: Buyer, sellers: Seller[]) => helperFindTargetForBuyer(buyer, sellers, isSellerActive),
        [isSellerActive]
    );




    // Mutable refs for agents and animations (skip re-renders, just update on each frame)
    const sellersRef = useRef<Seller[]>([]);
    const buyersRef = useRef<Buyer[]>([]);
    const animationsRef = useRef<{ x: number; y: number; type: string; timer: number; maxTimer: number }[]>([]);

    // Animation loop tracking
    const animationFrameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(performance.now());

    // Convert speed setting to simulation multiplier
    const getSpeedMultiplier = useCallback(() => {
        if (speed === 'slow') return 0.5;
        if (speed === 'fast') return 2.0;
        return 1.0;
    }, [speed]);

    // Run disruptor logic (price ceiling/floor effects, buyer reassignment)
    const applyDisruptorEffects = useCallback(() => {
        helperApplyDisruptorEffects(
            sellersRef.current,
            buyersRef.current,
            animationsRef.current,
            disruptors,
            getEffectiveCost,
            findTargetForBuyer
        );
    }, [disruptors, getEffectiveCost, findTargetForBuyer]);

    // Record transaction in log for later analysis
    const logTransaction = useCallback(
        (
            buyer: Buyer,
            seller: Seller | null,
            outcome: string,
            clearingPrice?: number,
            cost?: number,
            profit?: number,
            surplus?: number,
            origAsk?: number,
            proposedPrice?: number
        ) => {
            const entry = buildTransactionEntry(
                round,
                buyer,
                seller,
                outcome,
                clearingPrice,
                cost,
                profit,
                surplus,
                origAsk,
                proposedPrice
            );
            setTransactionLog((prev) => [...prev, entry]);
        },
        [round]
    );



    // Compute market stats from transaction log and current agent states
    const updateStats = useCallback(() => {
        const trans = transactionLog.filter((l) => isSuccessfulOutcome(l.outcome)).length;
        const noDeals = buyersRef.current.filter((b) => b.status === 'noDeal').length;
        const tlogs = transactionLog.filter((l) => isSuccessfulOutcome(l.outcome));

        const avg = tlogs.length ? (tlogs.reduce((s, l) => s + l.clearingPrice, 0) / tlogs.length).toFixed(1) : '0';

        setStats({
            transactions: trans,
            noDeals,
            avgPrice: avg !== '0' ? '₱' + avg : '0',
            activeBuyers: buyersRef.current.filter((b) => b.status === 'searching').length,
            activeSellers: sellersRef.current.filter((s) => isSellerActive(s)).length,
            efficiency: buyersRef.current.length ? ((trans / buyersRef.current.length) * 100).toFixed(1) + '%' : '-',
        });
    }, [transactionLog]);




    // Create initial agents with random positions and attributes based on config
    // Note: should I make the seller in fixed position?

    const spawnAgents = useCallback(
        (cfg: Config) => {
            const newSellers: Seller[] = [];
            const newBuyers: Buyer[] = [];
            const positions: Position[] = [];

            // Spawn sellers and buyers at non-overlapping positions

            for (let i = 0; i < cfg.numSellers; i++) {
                const pos = findNonOverlappingPosition(positions);
                positions.push(pos);
                const cost = randomInRange(cfg.costMin, cfg.costMax);
                const ask = Math.max(cost + randomInRange(5, 30), randomInRange(cfg.askMin, cfg.askMax));
                newSellers.push(createSeller(`S${i + 1}`, pos, cost, ask, cfg.stockPerSeller));
            }

            for (let i = 0; i < cfg.numBuyers; i++) {
                const pos = findNonOverlappingPosition(positions);
                positions.push(pos);
                const budget = randomInRange(cfg.budgetMin, cfg.budgetMax);
                newBuyers.push(createBuyer(`B${i + 1}`, pos, budget));
            }

            sellersRef.current = newSellers;
            buyersRef.current = newBuyers;
            animationsRef.current = [];

            applyDisruptorEffects();

            // Set initial targets
            buyersRef.current.forEach((b) => {
                b.targetSeller = findTargetForBuyer(b, sellersRef.current);
            });

            setTransactionLog([]);
            setEquilibriumData([]);
            setDisruptorEvents([]);
        },
        [applyDisruptorEffects]
    );

    // Run one frame of simulation (move buyers, handle transactions, apply disruptors)
    const updateSimulation = useCallback(
        (dt: number) => {
            updateSimulationFrame(
                dt,
                getSpeedMultiplier(),
                dynamicPricing,
                bargaining,
                disruptors,
                getEffectiveAsk,
                getEffectiveCost,
                isSellerActive,
                findTargetForBuyer,
                sellersRef.current,
                buyersRef.current,
                animationsRef.current,
                logTransaction,
                setEquilibriumData,
                round
            );
            updateStats();
        },
        [dynamicPricing, bargaining, disruptors, getSpeedMultiplier, getEffectiveAsk, getEffectiveCost, isSellerActive, findTargetForBuyer, logTransaction, setEquilibriumData, round, updateStats]
    );

    // Check if round should end (all buyers done or no active sellers)
    const checkRoundEnd = useCallback(() => {
        return checkRoundEndState(
            buyersRef.current,
            sellersRef.current,
            animationsRef.current,
            isSellerActive,
            logTransaction,
            setStatus
        );
    }, [isSellerActive, logTransaction, setStatus]);

    // Main animation loop: run sim step, check end state, trigger canvas redraw
    const gameLoop = useCallback(
        (timestamp: number) => {
            if (status === 'running') {
                const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
                lastTimeRef.current = timestamp;
                updateSimulation(dt);
                checkRoundEnd();
            }
            // Keep looping even when paused (for canvas rendering)
            animationFrameRef.current = requestAnimationFrame(gameLoop);
            // Force re-render to update canvas
            setFrame((f) => f + 1);
        },
        [status, updateSimulation, checkRoundEnd]
    );

    // Public action handlers
    const startRound = useCallback(
        () => startRoundAction(status, config, spawnAgents, setRound, setStatus, lastTimeRef, animationFrameRef, gameLoop),
        [status, config, spawnAgents, setRound, setStatus, lastTimeRef, animationFrameRef, gameLoop]
    );

    const togglePause = useCallback(
        () => togglePauseAction(status, setStatus, lastTimeRef),
        [status, setStatus, lastTimeRef]
    );

    const resetSimulation = useCallback(
        () => resetSimulationAction(
            config,
            spawnAgents,
            setStatus,
            setRound,
            sellersRef,
            buyersRef,
            animationsRef,
            setTransactionLog,
            setEquilibriumData,
            setDisruptorEvents,
            setDisruptors,
            setStats,
            animationFrameRef
        ),
        [config, spawnAgents, setStatus, setRound, setTransactionLog, setEquilibriumData, setDisruptorEvents, setDisruptors, setStats]
    );

    const nextRound = useCallback(
        () => nextRoundAction(status, setStatus, setRound, spawnAgents, config),
        [status, setStatus, setRound, spawnAgents, config]
    );

    // Mark a transaction with a label for disruptor timeline
    const addDisruptorMarker = useCallback(
        (label: string) => addDisruptorMarkerAction(equilibriumData, setDisruptorEvents, label),
        [equilibriumData, setDisruptorEvents]
    );

    const toggleDisruptor = useCallback(
        (type: DisruptorType, amount: number) => toggleDisruptorAction(type, amount, setDisruptors, addDisruptorMarker),
        [setDisruptors, addDisruptorMarker]
    );

    // Add new buyers mid-round to simulate demand shock
    const demandShock = useCallback(
        (num: number) => {
            const positions = [...sellersRef.current, ...buyersRef.current].map((a) => ({ x: a.x, y: a.y }));
            for (let i = 0; i < num; i++) {
                const pos = findNonOverlappingPosition(positions);
                positions.push(pos);
                const budget = randomInRange(config.budgetMin, config.budgetMax);
                const newBuyer = createBuyer(`B-Shock${i + 1}`, pos, budget);
                newBuyer.targetSeller = findTargetForBuyer(newBuyer, sellersRef.current);
                buyersRef.current.push(newBuyer);
            }
            addDisruptorMarker(`Demand Shock +${num}`);
        },
        [config, addDisruptorMarker]
    );

    // Side effects
    // Re-apply disruptor logic when they change
    useEffect(() => {
        applyDisruptorEffects();
    }, [disruptors, applyDisruptorEffects]);

    // Recalculate stats after any transaction
    useEffect(() => {
        updateStats();
    }, [transactionLog, updateStats]);

    // Start animation loop on mount, cleanup on unmount
    useEffect(() => {
        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(gameLoop);
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [gameLoop]);

    // Export hook state and actions for UI
    return {
        // State for reading
        status,
        round,
        transactionLog,
        equilibriumData,
        disruptorEvents,
        dynamicPricing,
        speed,
        disruptors,
        stats,
        config,
        // Agent refs for canvas drawing
        sellersRef,
        buyersRef,
        animationsRef,
        // State setters
        setConfig,
        setDynamicPricing,
        setSpeed,
        // Action handlers
        startRound,
        togglePause,
        resetSimulation,
        nextRound,
        toggleDisruptor,
        demandShock,
        spawnAgents,
        // Helper functions
        getEffectiveCost,
        getEffectiveAsk,
        isSellerActive,
        getSpeedMultiplier,
        bargaining,
        setBargaining,
        frame
    };
};