import { Dispatch, SetStateAction } from 'react';
import { Buyer, Seller, DisruptorState, TransactionLogEntry, SimStatus } from '../types';

// Animation state for visual effects
export type Animation = {
    x: number;
    y: number;
    type: string;
    timer: number;
    maxTimer: number;
};

// Calculate seller's effective cost including taxes/subsidies from disruptors
export const getEffectiveCost = (seller: Seller, disruptors: DisruptorState): number => {
    let cost = seller.costOfGoods;
    if (disruptors.tax) cost += disruptors.tax.amount;
    if (disruptors.subsidy) cost -= disruptors.subsidy.amount;
    return Math.max(0, cost);
};

// Calculate seller's effective asking price after applying price ceiling/floor
export const getEffectiveAsk = (seller: Seller, disruptors: DisruptorState): number => {
    let ask = seller.askingPrice;
    if (disruptors.priceCeiling && ask > disruptors.priceCeiling.amount) ask = disruptors.priceCeiling.amount;
    if (disruptors.priceFloor && ask < disruptors.priceFloor.amount) ask = disruptors.priceFloor.amount;
    return ask;
};

// Check if seller is available to transact (not sold out, has stock, cost viability)
export const isSellerActive = (seller: Seller, disruptors: DisruptorState): boolean => {
    if (seller.status === 'soldOut' || seller.status === 'exited') return false;
    if (disruptors.priceCeiling && disruptors.priceCeiling.amount < getEffectiveCost(seller, disruptors)) return false;
    return seller.stock > 0;
};

// Find closest active seller not yet visited by buyer
export const findTargetForBuyer = (
    buyer: Buyer,
    sellers: Seller[],
    isSellerActiveFn: (seller: Seller) => boolean
): Seller | null => {
    let best: Seller | null = null;
    let bestDist = Infinity;
    for (const s of sellers) {
        if (!isSellerActiveFn(s) || buyer.visitedSellers.has(s.id)) continue;
        
        const dx = s.x - buyer.x;
        const dy = s.y - buyer.y;
        
        
        const dist = Math.sqrt(dx * dx + dy * dy);


        if (dist < bestDist) {
            bestDist = dist;
            best = s;
        }
    }
    return best;
};



// Calculate bargain price at 95% of buyer's max budget

// TODO make the bargain percentage configurable in the future!
export const calculateBargainPrice = (buyer: Buyer): number => Math.max(1, Math.floor(buyer.maxBudget * 0.95));

// Check if bargain offer covers seller's cost plus minimum profit
export const isBargainAccepted = (proposedPrice: number, cost: number): boolean => proposedPrice >= cost + 1;

// Check if transaction was successful (distinguishes real deals from rejections)
export const isSuccessfulOutcome = (outcome: string): boolean => outcome.startsWith('Transacted');


// Remove expired animations based on elapsed time
export const advanceAnimations = (animations: Animation[], dt: number): void => {
    for (let i = animations.length - 1; i >= 0; i -= 1) {
        animations[i].timer -= dt;
        if (animations[i].timer <= 0) animations.splice(i, 1);
    }
};



// Update visual timers for glow and flash effects
export const updateGlowAndFlashTimers = (sellers: Seller[], buyers: Buyer[], dt: number): void => {
    sellers.forEach((s) => {
        if (s.glowTimer > 0) s.glowTimer -= dt;
    });
    buyers.forEach((b) => {
        if (b.flashTimer > 0) b.flashTimer -= dt;
    });
};



// Handle price ceiling/floor effects
// Exit sellers who can't profit, reassign buyers

export const applyDisruptorEffects = (
    sellers: Seller[],
    buyers: Buyer[],
    animations: Animation[],
    disruptors: DisruptorState,
    getEffectiveCost: (seller: Seller) => number,
    findTargetForBuyer: (buyer: Buyer, sellers: Seller[]) => Seller | null
): void => {
    if (disruptors.priceCeiling) {
        const ceil = disruptors.priceCeiling.amount;
        for (const s of sellers) {
            if (s.status === 'available' && ceil < getEffectiveCost(s) && s.stock > 0) {
                s.status = 'exited';
                animations.push({
                    x: s.x,
                    y: s.y - 20,
                    type: 'exit',
                    timer: 1.5,
                    maxTimer: 1.5,
                });
            }
        }
    } else {
        // Re-activate sellers when price ceiling is removed
        for (const s of sellers) {
            if (s.status === 'exited' && s.stock > 0) s.status = 'available';
        }
    }

    // Reassign buyers to new targets if needed
    for (const b of buyers) {
        if (b.status === 'searching') {
            b.targetSeller = findTargetForBuyer(b, sellers);
        }
    }
};



// Determine if round should end (all buyers done or no active sellers remain)
export const checkRoundEndState = (
    buyers: Buyer[],
    sellers: Seller[],
    animations: Animation[],
    isSellerActive: (seller: Seller) => boolean,
    logTransaction: (
        buyer: Buyer,
        seller: Seller | null,
        outcome: string,
        clearingPrice?: number,
        cost?: number,
        profit?: number,
        surplus?: number,
        origAsk?: number,
        proposedPrice?: number
    ) => void,
    setStatus: Dispatch<SetStateAction<SimStatus>>
): boolean => {
    const activeBuyers = buyers.filter((b) => b.status === 'searching');
    // All buyers done searching and no animations pending
    if (activeBuyers.length === 0 && animations.length === 0) {
        setStatus('roundEnd');
        return true;
    }
    // No sellers available but buyers still searching - mark buyers as no-deal
    const activeSellers = sellers.filter((s) => isSellerActive(s));
    if (activeSellers.length === 0 && activeBuyers.length > 0) {
        activeBuyers.forEach((b) => {
            b.status = 'noDeal';
            b.targetSeller = null;
            logTransaction(b, null, 'No Deal');
        });
        setStatus('roundEnd');
        return true;
    }
    return false;
};

// Exit sellers who can't operate under price ceiling constraints
export const applyCeilingExitEffects = (
    sellers: Seller[],
    animations: Animation[],
    disruptors: DisruptorState,
    getEffectiveCost: (seller: Seller) => number
): void => {
    if (!disruptors.priceCeiling) return;
    const ceil = disruptors.priceCeiling.amount;
    for (const s of sellers) {
        if (s.status === 'available' && ceil < getEffectiveCost(s) && s.stock > 0) {
            s.status = 'exited';
            animations.push({
                x: s.x,
                y: s.y - 20,
                type: 'exit',
                timer: 1.5,
                maxTimer: 1.5,
            });
        }
    }
};



// Increase seller's asking price after successful transaction
// This is the dynamic pricing, which raises the price by 5% after each sale.
const applySellerDynamicPricing = (
    target: Seller,
    dynamicPricing: boolean,
    disruptors: DisruptorState,
    getEffectiveCost: (seller: Seller) => number
): void => {
    if (!dynamicPricing) return;
    let newAsk = Math.ceil(target.askingPrice * 1.05);
    if (disruptors.priceCeiling) newAsk = Math.min(newAsk, disruptors.priceCeiling.amount);
    target.askingPrice = Math.max(newAsk, target.askingPrice);
};

// Decrease seller's asking price after rejected offer.
// part of dyanamic pricing, the seller will lower their price by 5% after a buyer rejects the asking price.
// TODO make the buyer return to the same seller after a rejection one more time to try again?
const adjustAskAfterRejection = (
    target: Seller,
    dynamicPricing: boolean,
    disruptors: DisruptorState,
    getEffectiveCost: (seller: Seller) => number
): void => {
    if (!dynamicPricing) return;
    let newAsk = Math.floor(target.askingPrice * 0.95);
    const floorCost = getEffectiveCost(target) + 1;
    if (disruptors.priceFloor) newAsk = Math.max(newAsk, disruptors.priceFloor.amount);
    newAsk = Math.max(newAsk, floorCost);
    if (disruptors.priceCeiling && newAsk > disruptors.priceCeiling.amount) {
        newAsk = disruptors.priceCeiling.amount;
    }
    target.askingPrice = Math.min(newAsk, target.askingPrice);
};




// Execute transaction between buyer and seller: handle pricing, profit calc, and animations
export const settleBuyerAtSeller = (
    buyer: Buyer,
    target: Seller,
    animations: Animation[],
    dynamicPricing: boolean,
    bargaining: boolean,
    disruptors: DisruptorState,
    getEffectiveAsk: (seller: Seller) => number,
    getEffectiveCost: (seller: Seller) => number,
    isSellerActive: (seller: Seller) => boolean,
    logTransaction: (
        buyer: Buyer,
        seller: Seller | null,
        outcome: string,
        clearingPrice?: number,
        cost?: number,
        profit?: number,
        surplus?: number,
        origAsk?: number,
        proposedPrice?: number
    ) => void,
    setEquilibriumData: Dispatch<SetStateAction<{ transactionNum: number; clearingPrice: number }[]>>,
    round: number
): void => {
    const origAsk = target.askingPrice;
    const effectiveAsk = getEffectiveAsk(target);

    // Seller no longer active - reject and move on
    if (!isSellerActive(target)) {
        buyer.visitedSellers.add(target.id);
        buyer.targetSeller = null;
        return;
    }

    // Buyer can afford asking price - instant transaction
    if (buyer.maxBudget >= effectiveAsk && target.stock > 0) {
        target.stock--;
        const profit = effectiveAsk - getEffectiveCost(target);
        const surplus = buyer.maxBudget - effectiveAsk;
        buyer.status = 'transacted';
        target.glowTimer = 0.6;
        buyer.flashTimer = 0.6;
        animations.push({
            x: target.x,
            y: target.y - 25,
            type: 'happy',
            timer: 1.5,
            maxTimer: 1.5,
        });
        logTransaction(
            buyer,
            target,
            'Transacted',
            effectiveAsk,
            getEffectiveCost(target),
            profit,
            surplus,
            origAsk
        );
        applySellerDynamicPricing(target, dynamicPricing, disruptors, getEffectiveCost);
        setEquilibriumData((prev) => [
            ...prev,
            { transactionNum: prev.length + 1, clearingPrice: effectiveAsk },
        ]);
        if (target.stock <= 0) target.status = 'soldOut';
        return;
    }



    // Bargaining enabled - try reduced price
    // a buyer can propose a bargain price at 95% of their max budget.
    // If the seller cost is less than or equal to the proposed price, the transaction is successful.
    if (bargaining && target.stock > 0) {
        const cost = getEffectiveCost(target);
        const proposedPrice = calculateBargainPrice(buyer);

        if (isBargainAccepted(proposedPrice, cost)) {
            target.stock--;
            const profit = proposedPrice - cost;
            const surplus = buyer.maxBudget - proposedPrice;
            buyer.status = 'transacted';
            target.glowTimer = 0.6;
            buyer.flashTimer = 0.6;
            animations.push({
                x: target.x,
                y: target.y - 25,
                type: 'happy',
                timer: 1.5,
                maxTimer: 1.5,
            });
            logTransaction(
                buyer,
                target,
                'Transacted (Bargain)',
                proposedPrice,
                cost,
                profit,
                surplus,
                origAsk,
                proposedPrice
            );
            applySellerDynamicPricing(target, dynamicPricing, disruptors, getEffectiveCost);
            setEquilibriumData((prev) => [
                ...prev,
                { transactionNum: prev.length + 1, clearingPrice: proposedPrice },
            ]);
            if (target.stock <= 0) target.status = 'soldOut';
            return;
        }

        // Bargain rejected - mark seller as visited
        buyer.visitedSellers.add(target.id);
        animations.push({
            x: target.x,
            y: target.y - 20,
            type: 'nodeal',
            timer: 1.0,
            maxTimer: 1.0,
        });
        logTransaction(buyer, target, 'Rejected Offer', 0, cost, 0, 0, origAsk, proposedPrice);
        buyer.targetSeller = null;
        return;
    }

    // No deal - mark seller as visited and adjust asking price if dynamic pricing enabled
    buyer.visitedSellers.add(target.id);
    adjustAskAfterRejection(target, dynamicPricing, disruptors, getEffectiveCost);
    animations.push({
        x: target.x,
        y: target.y - 20,
        type: 'nodeal',
        timer: 1.0,
        maxTimer: 1.0,
    });
    buyer.targetSeller = null;
};



// Main simulation loop: move buyers toward targets, handle transactions, apply disruptors
export const updateSimulationFrame = (
    dt: number,
    speedMultiplier: number,
    dynamicPricing: boolean,
    bargaining: boolean,
    disruptors: DisruptorState,
    getEffectiveAsk: (seller: Seller) => number,
    getEffectiveCost: (seller: Seller) => number,
    isSellerActive: (seller: Seller) => boolean,
    findTargetForBuyer: (buyer: Buyer, sellers: Seller[]) => Seller | null,
    sellers: Seller[],
    buyers: Buyer[],
    animations: Animation[],
    logTransaction: (
        buyer: Buyer,
        seller: Seller | null,
        outcome: string,
        clearingPrice?: number,
        cost?: number,
        profit?: number,
        surplus?: number,
        origAsk?: number,
        proposedPrice?: number
    ) => void,
    setEquilibriumData: Dispatch<SetStateAction<{ transactionNum: number; clearingPrice: number }[]>>,
    round: number
): void => {
    const effectiveSpeed = 90 * speedMultiplier * dt;

    // Update visual effects timers
    advanceAnimations(animations, dt);
    updateGlowAndFlashTimers(sellers, buyers, dt);

    // Process each searching buyer
    for (const buyer of buyers) {
        if (buyer.status !== 'searching') continue;

        // Find new target if current one is gone or no target assigned
        if (!buyer.targetSeller || !isSellerActive(buyer.targetSeller)) {
            buyer.targetSeller = findTargetForBuyer(buyer, sellers);
        }

        // No valid seller available - mark as no deal
        if (!buyer.targetSeller) {
            buyer.status = 'noDeal';
            animations.push({
                x: buyer.x,
                y: buyer.y - 20,
                type: 'nodeal',
                timer: 1.2,
                maxTimer: 1.2,
            });
            logTransaction(buyer, null, 'No Deal');
            continue;
        }

        // Calculate distance to target and move toward it
        const target = buyer.targetSeller;
        const dx = target.x - buyer.x;
        const dy = target.y - buyer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Close enough to settle transaction
        if (dist <= 28) {
            buyer.x = target.x;
            buyer.y = target.y;
            settleBuyerAtSeller(
                buyer,
                target,
                animations,
                dynamicPricing,
                bargaining,
                disruptors,
                getEffectiveAsk,
                getEffectiveCost,
                isSellerActive,
                logTransaction,
                setEquilibriumData,
                round
            );
        } else {

            // Move incrementally toward target
            const moveX = (dx / dist) * effectiveSpeed;
            const moveY = (dy / dist) * effectiveSpeed;
            if (Math.abs(moveX) >= Math.abs(dx) && Math.abs(moveY) >= Math.abs(dy)) {
                buyer.x = target.x;
                buyer.y = target.y;
            } else {
                buyer.x += moveX;
                buyer.y += moveY;
            }

        }
    }

    // Apply price ceiling effects to seller base
    applyCeilingExitEffects(sellers, animations, disruptors, getEffectiveCost);
};

// Create a new seller with initial state
export const createSeller = (id: string, position: { x: number; y: number }, cost: number, ask: number, stock: number): Seller => ({
    id,
    x: position.x,
    y: position.y,
    costOfGoods: cost,
    originalCost: cost,
    askingPrice: Math.max(ask, cost + 1),
    originalAsk: Math.max(ask, cost + 1),
    stock,
    originalStock: stock,
    status: 'available',
    radius: 16,
    glowTimer: 0,
});

// Create a new buyer with initial state
export const createBuyer = (id: string, position: { x: number; y: number }, budget: number): Buyer => ({
    id,
    x: position.x,
    y: position.y,
    maxBudget: budget,
    originalBudget: budget,
    status: 'searching',
    visitedSellers: new Set<string>(),
    targetSeller: null,
    radius: 14,
    flashTimer: 0,
});

// Log transaction details for analytics
export const buildTransactionEntry = (
    round: number,
    buyer: Buyer,
    seller: Seller | null,
    outcome: string,
    clearingPrice?: number,
    cost?: number,
    profit?: number,
    surplus?: number,
    origAsk?: number,
    proposedPrice?: number
): TransactionLogEntry => ({
    round,
    buyerId: buyer.id,
    sellerId: seller ? seller.id : '-',
    sellerOrigAsk: seller ? (origAsk !== undefined ? origAsk : seller.askingPrice) : 0,
    sellerEffAsk: seller && clearingPrice !== undefined ? clearingPrice : 0,
    sellerCost: cost !== undefined ? cost : 0,
    sellerProfit: profit !== undefined ? profit : 0,
    buyerBudget: buyer.maxBudget,
    buyerSurplus: surplus !== undefined ? surplus : 0,
    outcome,
    clearingPrice: clearingPrice || 0,
    proposedPrice,
});
