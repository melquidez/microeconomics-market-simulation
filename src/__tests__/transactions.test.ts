import { describe, it, expect } from 'vitest';
import {
  buildTransactionEntry,
  settleBuyerAtSeller,
  syncSellerCapStatus,
  calculateBargainPrice,
  isBargainAccepted,
  getEffectiveAsk,
  getEffectiveCost,
  isSellerActive,
  createSeller,
  createBuyer,
} from '../hooks/simulationHelpers';
import type { Animation, Buyer, DisruptorState, Seller } from '../types';

const noDisruptors: DisruptorState = {
  priceCeiling: null,
  priceFloor: null,
  tax: null,
  subsidy: null,
};

describe('bargain helpers', () => {
  it('calculateBargainPrice offers bargainPct of budget, capped at the ask', () => {
    const buyer = createBuyer('b1', { x: 0, y: 0 }, 30);
    expect(calculateBargainPrice(buyer, 40, 95)).toBe(28); // floor(30 * 0.95) = 28, min(40, 28) = 28
  });

  it('isBargainAccepted requires price >= cost + 1', () => {
    expect(isBargainAccepted(20, 10)).toBe(true);
    expect(isBargainAccepted(10, 10)).toBe(false);
  });
});

describe('buildTransactionEntry', () => {
  const buyer = createBuyer('b1', { x: 0, y: 0 }, 50);
  const seller = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);

  it('captures effective cost, tax and subsidy from disruptors', () => {
    const e = buildTransactionEntry(
      1,
      1,
      buyer,
      seller,
      'Transacted',
      20,
      10,
      10,
      10,
      20,
      undefined,
      { ...noDisruptors, tax: { amount: 3 }, subsidy: { amount: 2 } },
      false,
      95,
    );
    expect(e.sellerEffCost).toBe(11); // 10 + 3 - 2
    expect(e.taxApplied).toBe(3);
    expect(e.subsidyApplied).toBe(2);
    expect(e.sellerCost).toBe(10); // base cost, kept for welfare math
  });

  it('records a missing seller as no effective cost', () => {
    const e = buildTransactionEntry(
      1,
      0,
      buyer,
      null,
      'No Deal',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      noDisruptors,
      false,
      95,
    );
    expect(e.sellerId).toBe('-');
    expect(e.sellerEffCost).toBe(0);
  });

  it('stores the dynamic pricing flag and bargain power', () => {
    const e = buildTransactionEntry(
      1,
      1,
      buyer,
      seller,
      'Transacted (Bargain)',
      18,
      10,
      8,
      8,
      20,
      18,
      noDisruptors,
      true,
      90,
    );
    expect(e.dynamicPricing).toBe(true);
    expect(e.bargainPct).toBe(90);
  });
});

describe('settleBuyerAtSeller', () => {
  function settle(opts: {
    buyerBudget: number;
    sellerCost: number;
    sellerAsk: number;
    sellerStock?: number;
    dynamicPricing?: boolean;
    bargaining?: boolean;
    bargainPct?: number;
    disruptors?: DisruptorState;
  }) {
    const disruptors = opts.disruptors ?? noDisruptors;
    const buyer = createBuyer('b1', { x: 0, y: 0 }, opts.buyerBudget);
    const seller = createSeller('s1', { x: 0, y: 0 }, opts.sellerCost, opts.sellerAsk, opts.sellerStock ?? 5);
    const animations: Animation[] = [];
    const calls: unknown[][] = [];
    const log = (...args: unknown[]) => calls.push(args);
    const gAsk = (s: Seller) => getEffectiveAsk(s, disruptors);
    const gCost = (s: Seller) => getEffectiveCost(s, disruptors);
    const isAct = (s: Seller) => isSellerActive(s, disruptors);
    settleBuyerAtSeller(
      buyer,
      seller,
      animations,
      opts.dynamicPricing ?? false,
      opts.bargaining ?? false,
      opts.bargainPct ?? 95,
      disruptors,
      gAsk,
      gCost,
      isAct,
      log,
      () => {},
    );
    return { buyer, seller, calls, animations };
  }

  it('instant transaction: profit = price - effective cost, surplus = budget - price', () => {
    const { buyer, seller, calls } = settle({ buyerBudget: 30, sellerCost: 10, sellerAsk: 20 });
    expect(calls[0][2]).toBe('Transacted');
    expect(calls[0][3]).toBe(20); // clearing price
    expect(calls[0][5]).toBe(10); // profit = 20 - 10
    expect(calls[0][6]).toBe(10); // surplus = 30 - 20
    expect(buyer.status).toBe('transacted');
    expect(seller.stock).toBe(4);
  });

  it('tax is passed through and reflected in profit/surplus', () => {
    const { calls } = settle({
      buyerBudget: 30,
      sellerCost: 10,
      sellerAsk: 20,
      disruptors: { ...noDisruptors, tax: { amount: 5 } },
    });
    expect(calls[0][3]).toBe(25); // effective ask = 20 + 5
    expect(calls[0][5]).toBe(10); // profit = 25 - (10 + 5)
    expect(calls[0][6]).toBe(5); // surplus = 30 - 25
  });

  it('bargain produces a lower price with higher consumer surplus', () => {
    const { calls } = settle({ buyerBudget: 30, sellerCost: 10, sellerAsk: 40, bargaining: true, bargainPct: 95 });
    expect(calls[0][2]).toBe('Transacted (Bargain)');
    expect(calls[0][3]).toBe(28); // floor(30 * 0.95)
    expect(calls[0][5]).toBe(18); // 28 - 10
    expect(calls[0][6]).toBe(2); // 30 - 28
  });

  it('rejects a bargain below the seller cost', () => {
    const { calls, buyer } = settle({ buyerBudget: 20, sellerCost: 20, sellerAsk: 40, bargaining: true, bargainPct: 95 });
    expect(calls[0][2]).toBe('Rejected Offer');
    expect(calls[0][8]).toBe(19); // proposed price = floor(20 * 0.95)
    expect(buyer.visitedSellers.has('s1')).toBe(true);
  });

  it('no deal and no log when buyer cannot afford and bargaining is off', () => {
    const { calls, buyer } = settle({ buyerBudget: 15, sellerCost: 10, sellerAsk: 40, bargaining: false });
    expect(calls.length).toBe(0);
    expect(buyer.visitedSellers.has('s1')).toBe(true);
  });

  it('dynamic pricing raises the seller ask after a sale', () => {
    const { seller } = settle({ buyerBudget: 30, sellerCost: 10, sellerAsk: 20, dynamicPricing: true });
    expect(seller.askingPrice).toBe(21); // ceil(20 * 1.05)
  });

  it('does not trade with an inactive (capped) seller', () => {
    const disruptors = { ...noDisruptors, priceCeiling: { amount: 8 } };
    const buyer = createBuyer('b1', { x: 0, y: 0 }, 30);
    const seller = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    seller.status = 'capped';
    const calls: unknown[][] = [];
    settleBuyerAtSeller(
      buyer,
      seller,
      [],
      false,
      false,
      95,
      disruptors,
      (s) => getEffectiveAsk(s, disruptors),
      (s) => getEffectiveCost(s, disruptors),
      (s) => isSellerActive(s, disruptors),
      (...a: unknown[]) => calls.push(a),
      () => {},
    );
    expect(calls.length).toBe(0);
  });
});

describe('syncSellerCapStatus', () => {
  it('caps a seller whose cost exceeds a binding ceiling', () => {
    const sellers = [createSeller('s1', { x: 0, y: 0 }, 10, 20, 5)];
    const animations: Animation[] = [];
    syncSellerCapStatus(sellers, animations, { ...noDisruptors, priceCeiling: { amount: 8 } }, (s) => s.costOfGoods);
    expect(sellers[0].status).toBe('capped');
    expect(animations.length).toBe(1);
  });

  it('does not cap when the ceiling is above cost', () => {
    const sellers = [createSeller('s1', { x: 0, y: 0 }, 10, 20, 5)];
    const animations: Animation[] = [];
    syncSellerCapStatus(sellers, animations, { ...noDisruptors, priceCeiling: { amount: 50 } }, (s) => s.costOfGoods);
    expect(sellers[0].status).toBe('available');
    expect(animations.length).toBe(0);
  });

  it('re-activates capped sellers when the ceiling is removed', () => {
    const sellers = [createSeller('s1', { x: 0, y: 0 }, 10, 20, 5)];
    sellers[0].status = 'capped';
    syncSellerCapStatus(sellers, [], noDisruptors, (s) => s.costOfGoods);
    expect(sellers[0].status).toBe('available');
  });
});
