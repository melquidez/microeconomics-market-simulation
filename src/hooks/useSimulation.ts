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
    const [bargainPct, setBargainPct] = useState<number>(95);
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
    // Bumped whenever the static scene changes while the simulation is NOT
    // running (spawn / reset / disruptor / demand shock) so Canvas repaints once.
    // During running, Canvas runs its own 60fps loop and ignores this.
    const [drawNonce, setDrawNonce] = useState<number>(0);
    const bumpDraw = useCallback(() => setDrawNonce((n) => n + 1), []);

    // (The canvas is repainted imperatively from the simulation loop via
    // drawMarket(); no per-frame React state is used, so the app does not
    // re-render 60fps just to animate the market.)


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
    // Keeps Demand Shock buyer IDs unique across every shock (never resets).
    const shockIdRef = useRef<number>(0);
    // Mirror of `status` so the loop always reads the latest value without
    // needing `status` in its dependency array (avoids stale closures).
    const statusRef = useRef<SimStatus>(status);
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

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
            setTransactionLog((prev) => {
                const transactionNum = isSuccessfulOutcome(outcome)
                    ? prev.filter((l) => isSuccessfulOutcome(l.outcome)).length + 1
                    : 0;
                const entry = buildTransactionEntry(
                    round,
                    transactionNum,
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
                return [...prev, entry];
            });
        },
        [round]
    );



    // Compute market stats from transaction log and current agent states.
    // Guarded so it only calls setStats when a value actually changes — otherwise
    // it would re-render the whole app on every animation frame.
    const lastStatsRef = useRef<Stats>(stats);
    const updateStats = useCallback(() => {
        const trans = transactionLog.filter((l) => isSuccessfulOutcome(l.outcome)).length;
        const noDeals = buyersRef.current.filter((b) => b.status === 'noDeal').length;
        const tlogs = transactionLog.filter((l) => isSuccessfulOutcome(l.outcome));

        const avg = tlogs.length ? (tlogs.reduce((s, l) => s + l.clearingPrice, 0) / tlogs.length).toFixed(1) : '0';

        const next: Stats = {
            transactions: trans,
            noDeals,
            avgPrice: avg !== '0' ? '₱' + avg : '0',
            activeBuyers: buyersRef.current.filter((b) => b.status === 'searching').length,
            activeSellers: sellersRef.current.filter((s) => isSellerActive(s)).length,
            efficiency: buyersRef.current.length ? ((trans / buyersRef.current.length) * 100).toFixed(1) + '%' : '-',
        };

        const prev = lastStatsRef.current;
        if (
            prev.transactions === next.transactions &&
            prev.noDeals === next.noDeals &&
            prev.avgPrice === next.avgPrice &&
            prev.activeBuyers === next.activeBuyers &&
            prev.activeSellers === next.activeSellers &&
            prev.efficiency === next.efficiency
        ) {
            return;
        }
        lastStatsRef.current = next;
        setStats(next);
    }, [transactionLog, isSellerActive]);





    // (Painting is handled by <Canvas>, which owns its own render loop. The hook
    // only mutates the agent refs; it does not read them to draw.)

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

            // Repaint the (now static) market once so the spawn is visible
            // without waiting for the running loop.
            bumpDraw();
        },
        [applyDisruptorEffects, bumpDraw]
    );

    // Run one frame of simulation (move buyers, handle transactions, apply disruptors)
    const updateSimulation = useCallback(
        (dt: number) => {
            updateSimulationFrame(
                dt,
                getSpeedMultiplier(),
                dynamicPricing,
                bargaining,
                bargainPct,
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
        [dynamicPricing, bargaining, bargainPct, disruptors, getSpeedMultiplier, getEffectiveAsk, getEffectiveCost, isSellerActive, findTargetForBuyer, logTransaction, setEquilibriumData, round, updateStats]
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

    // Ref to the latest gameLoop so the rAF self-reschedule never reads
    // `gameLoop` before it is declared (avoids the react-hooks/immutability
    // error and always invokes the newest version).
    const gameLoopRef = useRef<(timestamp: number) => void>(() => {});

    // Main animation loop: run one sim step while running, and stop the rAF
    // entirely when not running (idle/paused/roundEnd) so we are not burning
    // frames on a static scene or re-rendering React 60fps. Painting is handled
    // separately by <Canvas>, which owns its own render loop.
    const gameLoop = useCallback(
        (timestamp: number) => {
            if (statusRef.current === 'running') {
                const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
                lastTimeRef.current = timestamp;
                updateSimulation(dt);
                checkRoundEnd();
                // Schedule the next frame via the ref so we always call the
                // newest gameLoop (reads the latest status/options).
                animationFrameRef.current = requestAnimationFrame((t) => gameLoopRef.current(t));
            } else {
                animationFrameRef.current = null;
            }
        },
        [updateSimulation, checkRoundEnd]
    );

    // Keep gameLoopRef pointed at the latest gameLoop after each render.
    useEffect(() => {
        gameLoopRef.current = gameLoop;
    });

    // Stable helper to (re)start the rAF loop. Guards against double-starting.
    const startLoop = useCallback(() => {
        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame((t) => gameLoopRef.current(t));
        }
    }, []);

    // Public action handlers
    const startRound = useCallback(
        () => {
            startRoundAction(status, config, spawnAgents, setRound, setStatus, lastTimeRef);
            startLoop();
        },
        [status, config, spawnAgents, setRound, setStatus, lastTimeRef, startLoop]
    );

    const togglePause = useCallback(
        () => {
            togglePauseAction(status, setStatus, lastTimeRef);
            // Resume the loop if we just un-paused. (startLoop no-ops while a
            // frame is already scheduled, e.g. when pausing.)
            startLoop();
        },
        [status, setStatus, lastTimeRef, startLoop]
    );

    const resetSimulation = useCallback(
        () => {
            resetSimulationAction(
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
            );
            bumpDraw();
        },
        [config, spawnAgents, setStatus, setRound, setTransactionLog, setEquilibriumData, setDisruptorEvents, setDisruptors, setStats, bumpDraw]
    );

    const nextRound = useCallback(
        () => {
            nextRoundAction(status, setStatus, setRound, spawnAgents, config);
            bumpDraw();
        },
        [status, setStatus, setRound, spawnAgents, config, bumpDraw]
    );

    // Mark a transaction with a label for disruptor timeline
    const addDisruptorMarker = useCallback(
        (label: string) => addDisruptorMarkerAction(equilibriumData, setDisruptorEvents, label),
        [equilibriumData, setDisruptorEvents]
    );

    const toggleDisruptor = useCallback(
        (type: DisruptorType, amount: number) =>
            toggleDisruptorAction(type, amount, disruptors, setDisruptors, addDisruptorMarker),
        [disruptors, setDisruptors, addDisruptorMarker]
    );

    // Add new buyers mid-round to simulate demand shock
    const demandShock = useCallback(
        (num: number) => {
            const positions = [...sellersRef.current, ...buyersRef.current].map((a) => ({ x: a.x, y: a.y }));
            for (let i = 0; i < num; i++) {
                const pos = findNonOverlappingPosition(positions);
                positions.push(pos);
                const budget = randomInRange(config.budgetMin, config.budgetMax);
                shockIdRef.current += 1;
                const newBuyer = createBuyer(`B-Shock${shockIdRef.current}`, pos, budget);
                newBuyer.targetSeller = findTargetForBuyer(newBuyer, sellersRef.current);
                buyersRef.current.push(newBuyer);
            }
            addDisruptorMarker(`Demand Shock +${num}`);
            bumpDraw();
        },
        [config, addDisruptorMarker, bumpDraw]
    );

    // Side effects
    // Re-apply disruptor logic when they change. Canvas repaints on its own
    // because isSellerActive/getEffectiveAsk (deps of its render effect) change
    // identity whenever disruptors change.
    useEffect(() => {
        applyDisruptorEffects();
    }, [disruptors, applyDisruptorEffects]);

    // Recalculate stats after any transaction
    useEffect(() => {
        updateStats();
    }, [transactionLog, updateStats]);

    // Start animation loop on mount, cleanup on unmount (loop is otherwise
    // started/stopped by the action handlers via startLoop).
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, []);

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
        bargainPct,
        setBargainPct,
        drawNonce
    };
};