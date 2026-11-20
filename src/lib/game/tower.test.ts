import { describe, expect, it } from 'vitest';
import { dropBlock, PERFECT_TOLERANCE, stepSwing, swingSpeed } from './tower';

describe('dropBlock', () => {
  const base = { x: 0.3, width: 0.4 };

  it('keeps only the overlapping part and reports the cut piece (right overhang)', () => {
    const r = dropBlock(base, { x: 0.4, width: 0.4 })!;
    expect(r.placed.x).toBeCloseTo(0.4);
    expect(r.placed.width).toBeCloseTo(0.3);
    expect(r.cut!.x).toBeCloseTo(0.7);
    expect(r.cut!.width).toBeCloseTo(0.1);
    expect(r.perfect).toBe(false);
  });

  it('handles a left overhang', () => {
    const r = dropBlock(base, { x: 0.2, width: 0.4 })!;
    expect(r.placed.x).toBeCloseTo(0.3);
    expect(r.placed.width).toBeCloseTo(0.3);
    expect(r.cut!.x).toBeCloseTo(0.2);
    expect(r.cut!.width).toBeCloseTo(0.1);
  });

  it('snaps a near miss to a perfect placement', () => {
    const r = dropBlock(base, { x: 0.3 + PERFECT_TOLERANCE * 0.9, width: 0.4 })!;
    expect(r).toEqual({ placed: base, cut: null, perfect: true });
  });

  it('uses a 3% tolerance', () => expect(PERFECT_TOLERANCE).toBe(0.03));

  it('is game over when nothing overlaps', () => {
    expect(dropBlock(base, { x: 0.75, width: 0.2 })).toBeNull();
  });

  it('is game over when edges only touch', () => {
    expect(dropBlock(base, { x: 0.7, width: 0.2 })).toBeNull();
  });
});

describe('swingSpeed', () => {
  it('starts at 0.45 and rises every 5 blocks', () => {
    expect(swingSpeed(0)).toBeCloseTo(0.45);
    expect(swingSpeed(4)).toBeCloseTo(0.45);
    expect(swingSpeed(5)).toBeCloseTo(0.53);
    expect(swingSpeed(10)).toBeCloseTo(0.61);
  });
  it('is capped at 1.2', () => expect(swingSpeed(500)).toBe(1.2));
});

describe('stepSwing', () => {
  it('moves in its direction', () => {
    const r = stepSwing(0.2, 0.3, 1, 0.5, 0.1);
    expect(r.x).toBeCloseTo(0.25);
    expect(r.dir).toBe(1);
  });

  it('bounces off the right edge without leaving the screen', () => {
    const r = stepSwing(0.68, 0.3, 1, 0.5, 0.1); // would reach 0.73, edge is 0.7
    expect(r.x).toBeCloseTo(0.67);
    expect(r.dir).toBe(-1);
    expect(r.x + 0.3).toBeLessThanOrEqual(1);
  });

  it('bounces off the left edge', () => {
    const r = stepSwing(0.02, 0.3, -1, 0.5, 0.1);
    expect(r.x).toBeCloseTo(0.03);
    expect(r.dir).toBe(1);
  });
});
