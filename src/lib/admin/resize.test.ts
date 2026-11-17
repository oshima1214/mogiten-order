import { describe, expect, it } from 'vitest';
import { fitWithin, MAX_IMAGE_EDGE } from './resize';

describe('fitWithin', () => {
  it('keeps small images as they are', () => expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 }));
  it('scales a landscape photo by its width', () =>
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 }));
  it('scales a portrait photo by its height', () =>
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 }));
  it('uses a 1600px edge', () => expect(MAX_IMAGE_EDGE).toBe(1600));
});
