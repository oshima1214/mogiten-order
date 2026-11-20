'use client';

import { useEffect, useRef, useState } from 'react';
import { browserBestStore } from '@/lib/game/bestScore';
import { dropBlock, stepSwing, swingSpeed, type Block } from '@/lib/game/tower';

type Phase = 'ready' | 'playing' | 'over';

/** A placed block in the tower; level 0 is the base on the plate. */
type Placed = Block & { level: number };
type Debris = Block & { y: number; vy: number; rot: number; vr: number };

const START_WIDTH = 0.5;
const BLOCK_H = 0.1; // block height as a fraction of screen width
const SWING_GAP = 3; // swinging block floats this many block-heights above the top

function drawGyoza(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Half-moon dumpling sitting with its flat, browned bottom at y + h.
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.bezierCurveTo(x + w * 0.08, y - h * 0.15, x + w * 0.92, y - h * 0.15, x + w, y + h);
  ctx.closePath();
  ctx.fillStyle = '#F7E6BF';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, h * 0.06);
  ctx.strokeStyle = '#C99A55';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + h * 0.15, y + h - ctx.lineWidth);
  ctx.lineTo(x + w - h * 0.15, y + h - ctx.lineWidth);
  ctx.lineWidth = h * 0.16;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#B9702C';
  ctx.stroke();
  // pleats
  const pleats = Math.max(1, Math.floor(w / (h * 0.7)));
  ctx.lineWidth = Math.max(1, h * 0.05);
  ctx.strokeStyle = '#D9B97E';
  for (let i = 1; i <= pleats; i++) {
    const px = x + (w * i) / (pleats + 1);
    ctx.beginPath();
    ctx.moveTo(px, y + h * 0.12);
    ctx.quadraticCurveTo(px + h * 0.12, y + h * 0.3, px, y + h * 0.48);
    ctx.stroke();
  }
}

export function GyozaTower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [perfectAt, setPerfectAt] = useState(0);
  const store = useRef<ReturnType<typeof browserBestStore> | null>(null);

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
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

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
              if (result.perfect) setPerfectAt(now);
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
      // Keep the top of the tower around 55% of the screen height.
      const targetCam = Math.max(0, w.tower[w.tower.length - 1].level - 3);
      w.camera += (targetCam - w.camera) * Math.min(1, dt * 5);

      // ---- draw ----
      const W = canvas.width;
      const H = canvas.height;
      const unit = W; // 1 world unit = screen width
      const bh = BLOCK_H * unit;
      const groundY = H * 0.86;
      const yOf = (level: number) => groundY - (level - w.camera + 1) * bh; // top edge of a block at `level`
      ctx.clearRect(0, 0, W, H);

      // plate
      const plateY = yOf(-1) + bh * 0.1;
      if (plateY < H + bh) {
        ctx.fillStyle = '#E8E8ED';
        ctx.beginPath();
        ctx.ellipse(W / 2, plateY + bh * 0.25, W * 0.42, bh * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of w.tower) {
        const y = yOf(b.level);
        if (y > H || y < -bh) continue;
        drawGyoza(ctx, b.x * unit, y, b.width * unit, bh);
      }
      if (w.phase === 'playing') {
        const sw = w.dropping ? w.dropping.block : w.swing;
        const level = w.dropping ? w.dropping.y : top.level + 1 + SWING_GAP;
        drawGyoza(ctx, sw.x * unit, yOf(level), sw.width * unit, bh);
      }
      for (const p of w.debris) {
        const y = yOf(p.y);
        ctx.save();
        ctx.translate((p.x + p.width / 2) * unit, y + bh / 2);
        ctx.rotate(p.rot);
        drawGyoza(ctx, (-p.width / 2) * unit, -bh / 2, p.width * unit, bh);
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
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
