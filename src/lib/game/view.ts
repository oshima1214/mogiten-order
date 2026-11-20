/** How long the PERFECT glow lasts, in seconds. */
export const PERFECT_GLOW_SECONDS = 0.6;

/** The camera keeps the top of the tower in view: three levels below the top block. */
export function cameraTarget(topLevel: number): number {
  return Math.max(0, topLevel - 3);
}

/** Render resolution: sharp, but never more than 2× to spare battery on high-DPI phones. */
export function renderPixelRatio(devicePixelRatio: number | undefined): number {
  return Math.min(2, devicePixelRatio || 1);
}

/** Whether a frame must be drawn; when nothing moves the loop idles (battery). */
export function needsRedraw(s: {
  playing: boolean;
  debris: number;
  camera: number;
  target: number;
  perfectAge: number;
  dirty: boolean;
}): boolean {
  return (
    s.playing ||
    s.debris > 0 ||
    Math.abs(s.camera - s.target) > 0.001 ||
    s.perfectAge < PERFECT_GLOW_SECONDS ||
    s.dirty
  );
}
