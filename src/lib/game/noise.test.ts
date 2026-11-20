import { describe, expect, it } from 'vitest';
import { fbm2, valueNoise2 } from './noise';

describe('valueNoise2', () => {
  it('is deterministic', () => expect(valueNoise2(3.7, 1.2, 9)).toBe(valueNoise2(3.7, 1.2, 9)));
  it('stays within 0..1', () => {
    for (let i = 0; i < 2000; i++) {
      const n = valueNoise2(i * 0.37, i * 0.11, 1);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });
  it('is smooth (small steps change little)', () => {
    expect(Math.abs(valueNoise2(5.5, 2.5, 1) - valueNoise2(5.501, 2.5, 1))).toBeLessThan(0.01);
  });
  it('differs between seeds', () => expect(valueNoise2(2.3, 4.1, 1)).not.toBe(valueNoise2(2.3, 4.1, 2)));
});

describe('fbm2', () => {
  it('stays within 0..1', () => {
    for (let i = 0; i < 500; i++) {
      const n = fbm2(i * 0.53, i * 0.29, 4, 7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });
});
