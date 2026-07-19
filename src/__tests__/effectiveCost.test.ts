import { describe, it, expect } from 'vitest';
import {
  getEffectiveCost,
  getEffectiveAsk,
  isSellerActive,
  createSeller,
} from '../hooks/simulationHelpers';
import type { DisruptorState } from '../types';

const noDisruptors: DisruptorState = {
  priceCeiling: null,
  priceFloor: null,
  tax: null,
  subsidy: null,
};

describe('getEffectiveCost', () => {
  it('returns base cost with no policy', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(getEffectiveCost(s, noDisruptors)).toBe(10);
  });

  it('adds a tax', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(getEffectiveCost(s, { ...noDisruptors, tax: { amount: 3 } })).toBe(13);
  });

  it('subtracts a subsidy', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(getEffectiveCost(s, { ...noDisruptors, subsidy: { amount: 4 } })).toBe(6);
  });

  it('combines tax and subsidy', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(
      getEffectiveCost(s, { ...noDisruptors, tax: { amount: 5 }, subsidy: { amount: 2 } }),
    ).toBe(13);
  });

  it('never goes negative', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 2, 20, 5);
    expect(getEffectiveCost(s, { ...noDisruptors, subsidy: { amount: 10 } })).toBe(0);
  });
});

describe('getEffectiveAsk', () => {
  it('returns the asking price with no policy', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(getEffectiveAsk(s, noDisruptors)).toBe(20);
  });

  it('passes a tax through to the buyer', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(getEffectiveAsk(s, { ...noDisruptors, tax: { amount: 5 } })).toBe(25);
  });

  it('lowers the price with a subsidy', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(getEffectiveAsk(s, { ...noDisruptors, subsidy: { amount: 5 } })).toBe(15);
  });

  it('clamps to a price ceiling', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(
      getEffectiveAsk(s, { ...noDisruptors, tax: { amount: 10 }, priceCeiling: { amount: 22 } }),
    ).toBe(22);
  });

  it('clamps to a price floor', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(
      getEffectiveAsk(s, { ...noDisruptors, subsidy: { amount: 10 }, priceFloor: { amount: 18 } }),
    ).toBe(18);
  });
});

describe('isSellerActive', () => {
  it('is active when available with stock', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(isSellerActive(s, noDisruptors)).toBe(true);
  });

  it('is inactive when sold out', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 0);
    expect(isSellerActive(s, noDisruptors)).toBe(false);
  });

  it('is inactive when capped', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    s.status = 'capped';
    expect(isSellerActive(s, noDisruptors)).toBe(false);
  });

  it('is inactive when a price ceiling sits below effective cost (shortage)', () => {
    const s = createSeller('s1', { x: 0, y: 0 }, 10, 20, 5);
    expect(isSellerActive(s, { ...noDisruptors, priceCeiling: { amount: 8 } })).toBe(false);
  });
});
