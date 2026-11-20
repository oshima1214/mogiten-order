import { describe, expect, it } from 'vitest';
import { cameraTarget, needsRedraw, renderPixelRatio } from './view';

describe('cameraTarget', () => {
  it('stays at the bottom for a short tower', () => expect(cameraTarget(2)).toBe(0));
  it('follows the top, three levels below it', () => expect(cameraTarget(10)).toBe(7));
});

describe('renderPixelRatio', () => {
  it('caps sharp screens at 2', () => expect(renderPixelRatio(3)).toBe(2));
  it('keeps normal screens as they are', () => expect(renderPixelRatio(1.5)).toBe(1.5));
  it('defaults to 1', () => expect(renderPixelRatio(undefined)).toBe(1));
});

describe('needsRedraw', () => {
  const still = { playing: false, debris: 0, camera: 4, target: 4, perfectAge: Infinity, dirty: false };
  it('is idle when nothing moves (saves battery)', () => expect(needsRedraw(still)).toBe(false));
  it('redraws while playing', () => expect(needsRedraw({ ...still, playing: true })).toBe(true));
  it('redraws while pieces are falling', () => expect(needsRedraw({ ...still, debris: 1 })).toBe(true));
  it('redraws while the camera is still moving', () => expect(needsRedraw({ ...still, camera: 3.5 })).toBe(true));
  it('redraws while the PERFECT glow fades', () => expect(needsRedraw({ ...still, perfectAge: 0.2 })).toBe(true));
  it('redraws after a resize', () => expect(needsRedraw({ ...still, dirty: true })).toBe(true));
});
