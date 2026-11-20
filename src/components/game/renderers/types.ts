import type { Block } from '@/lib/game/tower';

/** Block heights are fractions of the screen width, like block x and width. */
export const BLOCK_H = 0.1;

export type Placed = Block & { level: number };
/** A cut-off piece falling away; `y` is in block levels, `rot` in radians. */
export type Debris = Block & { y: number; vy: number; rot: number; vr: number };

/** Everything a renderer needs for one frame. Levels count block heights above the plate. */
export type TowerScene = {
  tower: Placed[];
  /** The swinging (or dropping) gyoza and the level its bottom is at. */
  swing: { block: Block; level: number } | null;
  debris: Debris[];
  /** Camera position in levels (see cameraTarget). */
  camera: number;
  /** Seconds since the last PERFECT (Infinity if none). */
  perfectAge: number;
};

export type TowerRenderer = {
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void;
  draw(scene: TowerScene): void;
  dispose(): void;
};
