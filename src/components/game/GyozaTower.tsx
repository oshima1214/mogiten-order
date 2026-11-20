'use client';

import { useEffect, useRef, useState } from 'react';
import { browserBestStore } from '@/lib/game/bestScore';
import { dropBlock, stepSwing, swingSpeed, type Block } from '@/lib/game/tower';
import { cameraTarget, needsRedraw } from '@/lib/game/view';
import { createCanvas2dRenderer } from './renderers/canvas2d';
import type { Debris, Placed, TowerRenderer } from './renderers/types';

type Phase = 'ready' | 'playing' | 'over';

const START_WIDTH = 0.5;
const SWING_GAP = 3; // swinging block floats this many block-heights above the top

export function GyozaTower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [perfectAt, setPerfectAt] = useState(0);
  const store = useRef<ReturnType<typeof browserBestStore> | null>(null);
  const perfectMs = useRef(-Infinity);

  // Mutable game world, read by the animation loop.
  const world = useRef({
    tower: [] as Placed[],
    swing: { x: 0, width: START_WIDTH } as Block,
    dir: 1 as 1 | -1,
    dropping: null as null | { block: Block; y: number; vy: number },
    debris: [] as Debris[],
    camera: 0, // in block levels
    phase: 'ready' as Phase,
  });

  useEffect(() => {
    store.current = browserBestStore();
     
    setBest(store.current.load());
  }, []);

  /** Puts a fresh base on the plate (world only, no React state). */
  function resetWorld() {
    const w = world.current;
    w.tower = [{ x: (1 - START_WIDTH) / 2, width: START_WIDTH, level: 0 }];
    w.swing = { x: 0, width: START_WIDTH };
    w.dir = 1;
    w.dropping = null;
    w.debris = [];
    w.camera = 0;
  }

  function tap() {
    const w = world.current;
    if (w.phase !== 'playing') {
      resetWorld();
      setScore(0);
      w.phase = 'playing';
      setPhase('playing');
      return;
    }
    if (w.dropping) return;
    const top = w.tower[w.tower.length - 1];
    w.dropping = { block: { ...w.swing }, y: top.level + 1 + SWING_GAP, vy: 0 };
  }

  useEffect(() => {
    resetWorld();
    const canvas = canvasRef.current!;
    let renderer: TowerRenderer | null = null;
    let raf = 0;
    let last = performance.now();
    let dirty = true;
    let disposed = false;

    const resize = () => {
      renderer?.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio);
      dirty = true;
    };
    const ro = new ResizeObserver(resize);

    const frame = (now: number) => {
      // Clamp so a long pause (hidden tab) does not teleport the blocks.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = world.current;
      const top = w.tower[w.tower.length - 1];

      if (w.phase === 'playing') {
        if (w.dropping) {
          const d = w.dropping;
          d.vy += 40 * dt;
          d.y -= d.vy * dt;
          if (d.y <= top.level + 1) {
            const result = dropBlock(top, d.block);
            w.dropping = null;
            if (!result) {
              w.debris.push({ ...d.block, y: top.level + 1, vy: 0, rot: 0, vr: d.block.x < top.x ? -2 : 2 });
              w.phase = 'over';
              setPhase('over');
              setBest(store.current!.save(w.tower.length - 1));
            } else {
              w.tower.push({ ...result.placed, level: top.level + 1 });
              if (result.cut) w.debris.push({ ...result.cut, y: top.level + 1, vy: 0, rot: 0, vr: result.cut.x < result.placed.x ? -3 : 3 });
              if (result.perfect) {
                perfectMs.current = now;
                setPerfectAt(now);
              }
              setScore(w.tower.length - 1);
              w.swing = { x: 0, width: result.placed.width };
              w.dir = 1;
            }
          }
        } else {
          const s = stepSwing(w.swing.x, w.swing.width, w.dir, swingSpeed(w.tower.length - 1), dt);
          w.swing.x = s.x;
          w.dir = s.dir;
        }
      }
      for (const p of w.debris) {
        p.vy += 40 * dt;
        p.y -= p.vy * dt;
        p.rot += p.vr * dt;
      }
      w.debris = w.debris.filter((p) => p.y > w.camera - 12);
      const target = cameraTarget(w.tower[w.tower.length - 1].level);
      w.camera += (target - w.camera) * Math.min(1, dt * 5);
      if (Math.abs(target - w.camera) < 0.001) w.camera = target;

      const perfectAge = (now - perfectMs.current) / 1000;
      if (
        renderer &&
        needsRedraw({ playing: w.phase === 'playing', debris: w.debris.length, camera: w.camera, target, perfectAge, dirty })
      ) {
        dirty = false;
        const top2 = w.tower[w.tower.length - 1];
        renderer.draw({
          tower: w.tower,
          swing:
            w.phase === 'playing'
              ? w.dropping
                ? { block: w.dropping.block, level: w.dropping.y }
                : { block: w.swing, level: top2.level + 1 + SWING_GAP }
              : null,
          debris: w.debris,
          camera: w.camera,
          perfectAge,
        });
      }
      raf = requestAnimationFrame(frame);
    };

    // 3D when the phone supports it (Three.js is downloaded only now), flat 2D otherwise.
    (async () => {
      try {
        const { createThreeRenderer } = await import('./renderers/three');
        renderer = createThreeRenderer(canvas);
        canvas.dataset.renderer = '3d';
      } catch {
        renderer = createCanvas2dRenderer(canvas);
        canvas.dataset.renderer = '2d';
      }
      if (disposed) {
        renderer.dispose();
        return;
      }
      resize();
      ro.observe(canvas);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer?.dispose();
    };
  }, []);

  const showPerfect = perfectAt > 0 && phase === 'playing';

  return (
    <div className="relative h-full w-full select-none">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerDown={(e) => {
          e.preventDefault();
          if (phase !== 'over') tap();
        }}
        aria-label="餃子タワー。タップで餃子を落とします"
        role="img"
      />
      <div className="pointer-events-none absolute inset-x-0 top-4 flex flex-col items-center gap-1">
        <p className="text-[56px] leading-none font-bold tracking-tight">{score}</p>
        <p className="text-[13px] text-sub">自己ベスト {best}個</p>
        {showPerfect && (
          <p key={perfectAt} className="game-perfect mt-2 text-xl font-bold text-wait-ink">
            PERFECT!
          </p>
        )}
      </div>

      {phase === 'ready' && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 px-6 text-center">
          <p className="text-2xl font-bold">餃子タワー</p>
          <p className="text-[15px] text-sub">
            タップで餃子を落として、
            <br />
            できるだけ高く積み上げよう
          </p>
          <p className="mt-3 rounded-full bg-accent px-6 py-3 text-[17px] font-semibold text-white">タップでスタート</p>
        </div>
      )}

      {phase === 'over' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 px-6">
          <div className="card flex w-full max-w-xs flex-col items-center gap-3 p-6 text-center" role="dialog" aria-label="ゲームオーバー">
            <p className="text-[15px] text-sub">ゲームオーバー</p>
            <p className="text-[44px] leading-none font-bold">
              {score}
              <span className="ml-1 text-xl">個</span>
            </p>
            <p className="text-[15px] text-sub">
              自己ベスト {best}個{score > 0 && score >= best ? '(更新!)' : ''}
            </p>
            <button type="button" onClick={tap} className="btn-primary mt-2 h-12 w-full">
              もう一度
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
