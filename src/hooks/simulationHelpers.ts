import { Dispatch, SetStateAction } from 'react';
import { Buyer, Seller, DisruptorState, TransactionLogEntry, SimStatus } from '../types';

export type Animation = {
    x: number;
    y: number;
    type: string;
    timer: number;
    maxTimer: number;
};

export const getEffectiveCost = (seller: Seller, disruptors: DisruptorState): number => {
    let cost = seller.costOfGoods;
    if (disruptors.tax) cost += disruptors.tax.amount;
    if (disruptors.subsidy) cost -= disruptors.subsidy.amount;
    return Math.max(0, cost);
};

export const getEffectiveAsk = (seller: Seller, disruptors: DisruptorState): number => {
    let ask = seller.askingPrice;
    if (disruptors.priceCeiling && ask > disruptors.priceCeiling.amount) ask = disruptors.priceCeiling.amount;
    if (disruptors.priceFloor && ask < disruptors.priceFloor.amount) ask = disruptors.priceFloor.amount;
    return ask;
};

export const isSellerActive = (seller: Seller, disruptors: DisruptorState): boolean => {
    if (seller.status === 'soldOut' || seller.status === 'exited') return false;
    if (disruptors.priceCeiling && disruptors.priceCeiling.amount < getEffectiveCost(seller, disruptors)) return false;
    return seller.stock > 0;
};

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

export const calculateBargainPrice = (buyer: Buyer): number => Math.max(1, Math.floor(buyer.maxBudget * 0.95));

export const isBargainAccepted = (proposedPrice: number, cost: number): boolean => proposedPrice >= cost + 1;

export const isSuccessfulOutcome = (outcome: string): boolean => outcome.startsWith('Transacted');

export const advanceAnimations = (animations: Animation[], dt: number): void => {
    for (let i = animations.length - 1; i >= 0; i -= 1) {
        animations[i].timer -= dt;
        if (animations[i].timer <= 0) animations.splice(i, 1);
    }
};

export const updateGlowAndFlashTimers = (sellers: Seller[], buyers: Buyer[], dt: number): void => {
    sellers.forEach((s) => {
        if (s.glowTimer > 0) s.glowTimer -= dt;
    });
    buyers.forEach((b) => {
        if (b.flashTimer > 0) b.flashTimer -= dt;
    });
};

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
        for (const s of sellers) {
            if (s.status === 'exited' && s.stock > 0) s.status = 'available';
        }
    }

    for (const b of buyers) {
        if (b.status === 'searching') {
            b.targetSeller = findTargetForBuyer(b, sellers);
        }
    }
};

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
    if (activeBuyers.length === 0 && animations.length === 0) {
        setStatus('roundEnd');
        return true;
    }
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

    if (!isSellerActive(target)) {
        buyer.visitedSellers.add(target.id);
        buyer.targetSeller = null;
        return;
    }

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

    advanceAnimations(animations, dt);
    updateGlowAndFlashTimers(sellers, buyers, dt);

    for (const buyer of buyers) {
        if (buyer.status !== 'searching') continue;

        if (!buyer.targetSeller || !isSellerActive(buyer.targetSeller)) {
            buyer.targetSeller = findTargetForBuyer(buyer, sellers);
        }

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

        const target = buyer.targetSeller;
        const dx = target.x - buyer.x;
        const dy = target.y - buyer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

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

    applyCeilingExitEffects(sellers, animations, disruptors, getEffectiveCost);
};

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
