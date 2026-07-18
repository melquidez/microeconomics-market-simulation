export interface Position {
    x: number;
    y: number;
}

export interface Seller {
    id: string;
    x: number;
    y: number;
    costOfGoods: number;
    originalCost: number;
    askingPrice: number;
    originalAsk: number;
    stock: number;
    originalStock: number;
    status: 'available' | 'soldOut' | 'exited' | 'capped';
    radius: number;
    glowTimer: number;

    // negotiation state
    // isNegotiating: boolean;
    // negotiatingBuyer: Buyer | null;
}

export interface Buyer {
    id: string;
    x: number;
    y: number;
    maxBudget: number;
    originalBudget: number;
    status: 'searching' | 'transacted' | 'noDeal';
    visitedSellers: Set<string>;
    targetSeller: Seller | null;
    radius: number;
    flashTimer: number;
    leaveTimer: number;
}

export interface TransactionLogEntry {
    round: number;
    transactionNum: number;
    buyerId: string;
    sellerId: string;
    sellerOrigAsk: number;
    sellerEffAsk: number;
    sellerCost: number;
    sellerProfit: number;
    buyerBudget: number;
    buyerSurplus: number;
    outcome: string;
    clearingPrice: number;

    proposedPrice?: number;
}

export interface DisruptorEvent {
    transactionNum: number;
    label: string;
}

export type DisruptorType = 'priceCeiling' | 'priceFloor' | 'tax' | 'subsidy';

export interface DisruptorState {
    priceCeiling: { amount: number } | null;
    priceFloor: { amount: number } | null;
    tax: { amount: number } | null;
    subsidy: { amount: number } | null;
}

export interface Config {
    numBuyers: number;
    numSellers: number;
    budgetMin: number;
    budgetMax: number;
    askMin: number;
    askMax: number;
    costMin: number;
    costMax: number;
    stockPerSeller: number;
}

export type SimStatus = 'idle' | 'running' | 'paused' | 'roundEnd';

export interface Stats {
    transactions: number;
    noDeals: number;
    avgPrice: string;
    activeBuyers: number;
    activeSellers: number;
    efficiency: string; // deal-completion rate (transactions / buyers)
    allocativeEfficiency: string; // realized total surplus / maximum possible total surplus
    deadweightLoss: string; // maximum possible surplus - realized surplus
}