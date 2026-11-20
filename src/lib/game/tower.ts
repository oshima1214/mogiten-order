/** Positions are fractions of the screen width (0 = left edge, 1 = right edge). */
export type Block = { x: number; width: number };

/** A drop within this distance of the block below snaps to a perfect fit. */
export const PERFECT_TOLERANCE = 0.03;

/**
 * Lands `falling` on `base`: keeps the overlap, returns the piece that hangs over
 * (it drops away), or null when nothing overlaps (game over).
 */
export function dropBlock(
  base: Block,
  falling: Block,
): { placed: Block; cut: Block | null; perfect: boolean } | null {
  if (Math.abs(falling.x - base.x) < PERFECT_TOLERANCE && Math.abs(falling.width - base.width) < 1e-9) {
    return { placed: { ...base }, cut: null, perfect: true };
  }
  const left = Math.max(base.x, falling.x);
  const right = Math.min(base.x + base.width, falling.x + falling.width);
  if (right - left <= 1e-9) return null;

  const placed = { x: left, width: right - left };
  const cut =
    falling.x < base.x
      ? { x: falling.x, width: base.x - falling.x }
      : { x: right, width: falling.x + falling.width - right };
  return { placed, cut: cut.width > 1e-9 ? cut : null, perfect: false };
}

/** Swing speed in screen widths per second; faster every 5 blocks, capped. */
export function swingSpeed(score: number): number {
  return Math.min(1.2, 0.45 + 0.08 * Math.floor(score / 5));
}

/** Moves the swinging block and bounces it off the screen edges. */
export function stepSwing(
  x: number,
  width: number,
  dir: 1 | -1,
  speed: number,
  dt: number,
): { x: number; dir: 1 | -1 } {
  const max = 1 - width;
  let next = x + dir * speed * dt;
  let nextDir = dir;
  if (next > max) {
    next = max - (next - max);
    nextDir = -1;
  } else if (next < 0) {
    next = -next;
    nextDir = 1;
  }
  return { x: Math.min(max, Math.max(0, next)), dir: nextDir };
}
