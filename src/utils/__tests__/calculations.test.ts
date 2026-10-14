import { describe, it, expect } from 'vitest';
import { concreteVolume, steelWeight, brickCount, variancePercent, spi, riskScore, riskRating, applyWastage } from '../calculations';

describe('calculations', () => {
  it('computes concrete volume', () => {
    expect(concreteVolume(10, 2, 0.5)).toBe(10);
  });
  it('computes steel weight (d^2/162 rule)', () => {
    expect(steelWeight(12, 16)).toBeCloseTo(18.96, 1);
  });
  it('counts bricks', () => {
    expect(brickCount(100)).toBe(5000);
  });
  it('computes variance percent', () => {
    expect(variancePercent(100, 107.1)).toBe(7.1);
    expect(variancePercent(0, 50)).toBe(0);
  });
  it('computes SPI', () => {
    expect(spi(91, 100)).toBe(0.91);
  });
  it('scores and rates risk', () => {
    expect(riskScore(4, 5)).toBe(20);
    expect(riskRating(20)).toBe('very-high');
    expect(riskRating(25)).toBe('extreme');
    expect(riskRating(3)).toBe('low');
  });
  it('applies wastage', () => {
    expect(applyWastage(100, 5)).toBe(105);
  });
});
