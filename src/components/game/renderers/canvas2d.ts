import { renderPixelRatio } from '@/lib/game/view';
import { BLOCK_H, type TowerRenderer, type TowerScene } from './types';

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

/** Flat 2D drawing: the fallback when the phone cannot show 3D. */
export function createCanvas2dRenderer(canvas: HTMLCanvasElement): TowerRenderer {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return {
    resize(cssW, cssH, dpr) {
      const r = renderPixelRatio(dpr);
      canvas.width = Math.round(cssW * r);
      canvas.height = Math.round(cssH * r);
    },
    draw(s: TowerScene) {
      const W = canvas.width;
      const H = canvas.height;
      const bh = BLOCK_H * W;
      const groundY = H * 0.86;
      const yOf = (level: number) => groundY - (level - s.camera + 1) * bh; // top edge of a block at `level`
      ctx.clearRect(0, 0, W, H);
      const plateY = yOf(-1) + bh * 0.1;
      if (plateY < H + bh) {
        ctx.fillStyle = '#E8E8ED';
        ctx.beginPath();
        ctx.ellipse(W / 2, plateY + bh * 0.25, W * 0.42, bh * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of s.tower) {
        const y = yOf(b.level);
        if (y > H || y < -bh) continue;
        drawGyoza(ctx, b.x * W, y, b.width * W, bh);
      }
      if (s.swing) drawGyoza(ctx, s.swing.block.x * W, yOf(s.swing.level), s.swing.block.width * W, bh);
      for (const p of s.debris) {
        ctx.save();
        ctx.translate((p.x + p.width / 2) * W, yOf(p.y) + bh / 2);
        ctx.rotate(p.rot);
        drawGyoza(ctx, (-p.width / 2) * W, -bh / 2, p.width * W, bh);
        ctx.restore();
      }
    },
    dispose() {},
  };
}
