import { describe, it, expect } from 'vitest';
import {
  computeMaxSurplus,
  computeRealizedSurplus,
  computeStats,
  createSeller,
  createBuyer,
} from '../hooks/simulationHelpers';
import type { Buyer, Seller, TransactionLogEntry } from '../types';

function makeDeal(over: Partial<TransactionLogEntry> = {}): TransactionLogEntry {
  return {
    round: 1,
    transactionNum: 1,
    buyerId: 'b1',
    sellerId: 's1',
    sellerOrigAsk: 20,
    sellerEffAsk: 20,
    sellerCost: 10,
    sellerEffCost: 10,
    taxApplied: 0,
    subsidyApplied: 0,
    dynamicPricing: false,
    bargainPct: 95,
    sellerProfit: 10,
    buyerBudget: 30,
    buyerSurplus: 10,
    outcome: 'Transacted',
    clearingPrice: 20,
    ...over,
  };
}

const active = (s: Seller) => s.status === 'available' && s.stock > 0;

describe('computeMaxSurplus', () => {
  it('matches highest WTP to lowest cost (greedy)', () => {
    const sellers = [
      createSeller('s1', { x: 0, y: 0 }, 10, 20, 1),
      createSeller('s2', { x: 0, y: 0 }, 20, 30, 1),
    ];
    const buyers = [createBuyer('b1', { x: 0, y: 0 }, 30), createBuyer('b2', { x: 0, y: 0 }, 25)];
    // unit costs [10, 20]; budgets desc [30, 25] -> (30 - 10) + (25 - 20) = 25
    expect(computeMaxSurplus(sellers, buyers, (s) => s.costOfGoods)).toBe(25);
  });

  it('is zero when no unit is affordable', () => {
    const sellers = [createSeller('s1', { x: 0, y: 0 }, 100, 110, 1)];
    const buyers = [createBuyer('b1', { x: 0, y: 0 }, 10)];
    expect(computeMaxSurplus(sellers, buyers, (s) => s.costOfGoods)).toBe(0);
  });
});

describe('computeRealizedSurplus', () => {
  it('sums (WTP - base cost) over transacted deals', () => {
    const log = [
      makeDeal({ buyerBudget: 30, sellerCost: 10, clearingPrice: 20, buyerSurplus: 10, sellerProfit: 10 }),
      makeDeal({
        transactionNum: 2,
        buyerId: 'b2',
        sellerId: 's2',
        buyerBudget: 25,
        sellerCost: 20,
        clearingPrice: 25,
        buyerSurplus: 5,
        sellerProfit: 5,
      }),
    ];
    // (30 - 10) + (25 - 20) = 25
    expect(computeRealizedSurplus(log)).toBe(25);
  });

  it('ignores non-transacted rows', () => {
    const log = [
      makeDeal({ outcome: 'No Deal', buyerBudget: 30, sellerCost: 10, clearingPrice: 0 }),
      makeDeal({ outcome: 'Rejected Offer', buyerBudget: 30, sellerCost: 10, clearingPrice: 0 }),
    ];
    expect(computeRealizedSurplus(log)).toBe(0);
  });
});

describe('computeStats', () => {
  const mkSellers = () => [
    createSeller('s1', { x: 0, y: 0 }, 10, 20, 1),
    createSeller('s2', { x: 0, y: 0 }, 20, 30, 1),
  ];
  const mkBuyers = () => [
    createBuyer('b1', { x: 0, y: 0 }, 30),
    createBuyer('b2', { x: 0, y: 0 }, 25),
  ];

  it('reports 100% allocative efficiency and no DWL at full realization', () => {
    const log = [
      makeDeal({ buyerBudget: 30, sellerCost: 10, sellerEffAsk: 20, buyerSurplus: 10, sellerProfit: 10, clearingPrice: 20 }),
      makeDeal({
        transactionNum: 2,
        buyerId: 'b2',
        sellerId: 's2',
        buyerBudget: 25,
        sellerCost: 20,
        sellerEffAsk: 25,
        buyerSurplus: 5,
        sellerProfit: 5,
        clearingPrice: 25,
      }),
    ];
    const stats = computeStats(log, mkSellers(), mkBuyers(), active);
    expect(stats.allocativeEfficiency).toBe('100.0%');
    expect(stats.deadweightLoss).toBe('₱0');
    expect(stats.transactions).toBe(2);
    expect(stats.efficiency).toBe('100.0%');
    expect(stats.avgPrice).toBe('₱22.5');
  });

  it('reports partial allocative efficiency and the missing surplus as DWL', () => {
    const log = [
      makeDeal({ buyerBudget: 30, sellerCost: 10, sellerEffAsk: 20, buyerSurplus: 10, sellerProfit: 10, clearingPrice: 20 }),
    ];
    const stats = computeStats(log, mkSellers(), mkBuyers(), active);
    expect(stats.allocativeEfficiency).toBe('80.0%'); // 20 / 25
    expect(stats.deadweightLoss).toBe('₱5');
    expect(stats.avgPrice).toBe('₱20.0');
  });

  it('shows 0% allocative efficiency (not a dash) when trades were possible but none happened', () => {
    const b1 = createBuyer('b1', { x: 0, y: 0 }, 30);
    b1.status = 'noDeal';
    const b2 = createBuyer('b2', { x: 0, y: 0 }, 25);
    b2.status = 'noDeal';
    const stats = computeStats([], mkSellers(), [b1, b2], active);
    expect(stats.noDeals).toBe(2);
    expect(stats.transactions).toBe(0);
    expect(stats.allocativeEfficiency).toBe('0.0%'); // possible surplus existed, none realized
    expect(stats.deadweightLoss).toBe('₱25'); // max 25, realized 0
    expect(stats.avgPrice).toBe('0');
  });

  it('shows a dash for allocative efficiency when no surplus was ever possible', () => {
    const sellers = [createSeller('s1', { x: 0, y: 0 }, 100, 110, 1)];
    const b1 = createBuyer('b1', { x: 0, y: 0 }, 10);
    b1.status = 'noDeal';
    const stats = computeStats([], sellers, [b1], active);
    expect(stats.allocativeEfficiency).toBe('-'); // maxSurplus = 0
    expect(stats.deadweightLoss).toBe('₱0'); // nothing lost because nothing was possible
  });
});
