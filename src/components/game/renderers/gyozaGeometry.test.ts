import { describe, expect, it } from 'vitest';
import { buildGyozaGeometry } from './gyozaGeometry';

describe('buildGyozaGeometry', () => {
  const g = buildGyozaGeometry();
  const pos = g.getAttribute('position');
  const col = g.getAttribute('color');

  it('fits the unit block: 1 long, 1 tall, 1 deep, flat bottom at y=0', () => {
    g.computeBoundingBox();
    const b = g.boundingBox!;
    expect(b.min.x).toBeGreaterThanOrEqual(-0.5 - 1e-6);
    expect(b.max.x).toBeLessThanOrEqual(0.5 + 1e-6);
    expect(b.min.y).toBeCloseTo(0, 5);
    expect(b.max.y).toBeCloseTo(1, 5);
    expect(b.min.z).toBeGreaterThanOrEqual(-0.5 - 1e-6);
    expect(b.max.z).toBeLessThanOrEqual(0.5 + 1e-6);
    expect(b.max.x - b.min.x).toBeGreaterThan(0.95);
  });

  it('has no broken vertices', () => {
    for (let i = 0; i < pos.array.length; i++) expect(Number.isFinite(pos.array[i])).toBe(true);
  });

  it('carries uv, normals and colors for every vertex', () => {
    expect(g.getAttribute('uv').count).toBe(pos.count);
    expect(g.getAttribute('normal').count).toBe(pos.count);
    expect(col.count).toBe(pos.count);
  });

  it('is served browned side up: crispy flat top, pale dough below', () => {
    let crispy = 0;
    let nc = 0;
    let dough = 0;
    let nd = 0;
    for (let i = 0; i < pos.count; i++) {
      const lum = col.getX(i) + col.getY(i) + col.getZ(i);
      if (pos.getY(i) > 0.95) {
        crispy += lum;
        nc++;
      } else if (pos.getY(i) > 0.15 && pos.getY(i) < 0.5) {
        dough += lum;
        nd++;
      }
    }
    expect(nc).toBeGreaterThan(0);
    expect(nd).toBeGreaterThan(0);
    expect(crispy / nc).toBeLessThan(dough / nd - 0.4);
  });

  it('has a broad, gently domed crispy face on top', () => {
    let nearTop = 0;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.92) nearTop++;
    expect(nearTop).toBeGreaterThan(400);
  });

  it('is the same every time (no randomness between builds)', () => {
    const again = buildGyozaGeometry().getAttribute('position');
    expect(Array.from(again.array.slice(0, 300))).toEqual(Array.from(pos.array.slice(0, 300)));
  });
});
