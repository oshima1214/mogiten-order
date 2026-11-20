import * as THREE from 'three';
import { fbm2 } from '@/lib/game/noise';

/**
 * A single pan-fried gyoza, built from code (no download), served browned side up
 * as in Japanese restaurants:
 * - top view: a gently curved crescent with thin, flat "ears" at both ends
 * - cross-section: a flat crispy face (on top), plump sides, and the pinched, pleated seam underneath
 * - slanted pleats rippling the front face and wiggling the seam
 * - colors: golden crispy face mottled with dark spots, a lacy edge, then pale soft dough
 *
 * Unit size: x in [-0.5, 0.5] (length), y in [0, 1] (crispy face at y=1, seam at y=0), z in [-0.5, 0.5].
 * Deterministic: every build is identical.
 */

const NU = 84; // rings along the length
const K = 40; // samples over the top, front-bottom → back-bottom
const M = 12; // samples across the flat bottom
const PLEATS = 7;

const COLOR_DOUGH = new THREE.Color(0xf6ead2);
const COLOR_CREASE = new THREE.Color(0xc9b48e);
const COLOR_DOUGH_LIGHT = new THREE.Color(0xfbf6ec);
const COLOR_GOLD = new THREE.Color(0xe09a44);
const COLOR_AMBER = new THREE.Color(0xa9581f);
const COLOR_DARK = new THREE.Color(0x6f3714);
const COLOR_FLECK = new THREE.Color(0xf3c983);

const smooth = THREE.MathUtils.smoothstep;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Sample = { s: number; t: number; bottom: boolean; fold: number; crease: number };

/** Cross-section point at angle a over the top (0 = front-bottom, π = back-bottom), before scaling. */
function topPoint(a: number, u: number): Sample {
  const phase = 2 * Math.PI * PLEATS * u;
  const s0 = -Math.cos(a);
  const t0 = Math.sin(a);
  let t = Math.pow(t0, 0.7); // plump sides
  // round off the edge where the sides meet the crispy face
  t -= 0.05 * Math.exp(-((Math.min(a, Math.PI - a) / 0.18) ** 2));
  let s = s0 * (1 - 0.12 * t0);

  // pinched seam, leaning towards the back, wiggling with the pleats
  const seamAt = Math.PI / 2 + 0.3;
  const seam = Math.exp(-(((a - seamAt) / 0.28) ** 2));
  t += 0.14 * seam;
  s += seam * (0.1 + 0.05 * Math.sin(phase));

  // slanted pleats over the front face, strongest near the seam
  // (a > π/2 is the side facing the camera, next to the seam)
  const front = Math.exp(-(((a - (Math.PI - 0.95)) / 0.55) ** 2));
  const fold = Math.pow(0.5 + 0.5 * Math.sin(phase - (a - (Math.PI - 0.9)) * 3.2), 1.4);
  let r = 0.12 * front * fold;
  // soft lumps of filling and small wrinkles in the dough
  r += 0.03 * (fbm2(u * 7, a * 1.6, 3, 11) - 0.5);
  r += 0.012 * (fbm2(u * 40, a * 9, 2, 13) - 0.5);
  return { s: s + r * s0, t: t + r * t0, bottom: false, fold: front * fold + seam, crease: front * (1 - fold) };
}

function ring(u: number): Sample[] {
  const pts: Sample[] = [];
  for (let k = 0; k <= K; k++) pts.push(topPoint((k / K) * Math.PI, u));
  // flat bottom, back → front (closing the ring)
  for (let k = 1; k < M; k++) {
    const sb = 1 - (2 * k) / M;
    // gently domed face (it becomes the top after flipping), slightly rumpled
    pts.push({ s: sb * 0.97, t: -0.07 * (1 - sb * sb) - 0.015 * fbm2(u * 12, sb * 3, 2, 17), bottom: true, fold: 0, crease: 0 });
  }
  return pts;
}

/** Color of a surface point: mottled crispy face, lacy browned edge, pale dough with lighter pleat crests. */
function gyozaColor(p: Sample, distFromFace: number, u: number, v: number): THREE.Color {
  const dough = new THREE.Color().copy(COLOR_DOUGH).lerp(COLOR_DOUGH_LIGHT, clamp01(p.fold * 1.2 + 0.25 * fbm2(u * 9, v * 9, 3, 31)));
  // how browned: the face itself, then a short lacy band up the sides
  // shade the pleat valleys so the folds read from any angle (baked ambient occlusion)
  dough.lerp(COLOR_CREASE, clamp01(p.crease * 0.75));
  const lace = fbm2(u * 18, v * 18, 3, 41);
  const brown = p.bottom ? 1 : clamp01((1 - smooth(distFromFace, 0.0, 0.14 + 0.1 * lace)) * 1.15);
  if (brown <= 0) return dough;
  const center = p.bottom ? Math.sin(Math.PI * u) * (1 - Math.abs((v * (K + M) - K - M / 2) / (M / 2))) : 0;
  const streak = fbm2(u * 7 + v * 4, v * 16, 4, 3); // streaky browning across the face
  const spots = fbm2(u * 34, v * 34, 3, 5);
  const fleck = fbm2(u * 50 + 7, v * 50, 2, 9);
  const crust = new THREE.Color()
    .copy(COLOR_GOLD)
    .lerp(COLOR_AMBER, clamp01(smooth(streak, 0.25, 0.75) * 0.85 + center * 0.5));
  crust.lerp(COLOR_DARK, clamp01((spots - 0.66) * 2.4) * (0.4 + 0.6 * center));
  crust.lerp(COLOR_FLECK, clamp01((fleck - 0.68) * 3) * 0.5);
  // the rim of the crispy face is lighter, fading to dough
  if (p.bottom) crust.lerp(COLOR_FLECK, smooth(Math.abs(p.s), 0.72, 0.97) * 0.7);
  return dough.lerp(crust, brown);
}

export function buildGyozaGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const R = K + M; // points per ring

  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const e = Math.sin(Math.PI * u);
    const x = u - 0.5;
    const halfDepth = 0.035 + 0.3 * Math.pow(e, 0.4); // ends stay as thin ears
    const height = 0.07 + 0.83 * Math.pow(e, 0.5); // plump almost to the ends
    const crescent = 0.13 * (1 - (2 * u - 1) ** 2) - 0.05; // middle bows towards the back
    const pts = ring(u);
    pts.forEach((p, k) => {
      positions.push(x, p.t * height, crescent + p.s * halfDepth);
      uvs.push(u, k / R);

      const col = gyozaColor(p, p.t * height, u, k / R);
      colors.push(col.r, col.g, col.b);
    });
  }

  for (let i = 0; i < NU; i++) {
    for (let k = 0; k < R; k++) {
      const a = i * R + k;
      const b = i * R + ((k + 1) % R);
      const d = (i + 1) * R + k;
      const f = (i + 1) * R + ((k + 1) % R);
      indices.push(a, b, d, b, f, d);
    }
  }

  // caps at both ears
  for (const end of [0, NU]) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = 0; k < R; k++) {
      const v = (end * R + k) * 3;
      cx += positions[v];
      cy += positions[v + 1];
      cz += positions[v + 2];
    }
    const center = positions.length / 3;
    positions.push(cx / R, cy / R, cz / R);
    uvs.push(end / NU, 0.5);
    const v0 = end * R;
    colors.push(colors[v0 * 3], colors[v0 * 3 + 1], colors[v0 * 3 + 2]);
    for (let k = 0; k < R; k++) {
      const a = end * R + k;
      const b = end * R + ((k + 1) % R);
      if (end === 0) indices.push(center, a, b);
      else indices.push(center, b, a);
    }
  }

  // normalise into the unit box (height exactly 0..1)
  let maxY = -Infinity;
  let minY = Infinity;
  let maxZ = 0;
  for (let i = 1; i < positions.length; i += 3) {
    maxY = Math.max(maxY, positions[i]);
    minY = Math.min(minY, positions[i]);
  }
  for (let i = 2; i < positions.length; i += 3) maxZ = Math.max(maxZ, Math.abs(positions[i]));
  const zScale = maxZ > 0.5 ? 0.5 / maxZ : 1;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] = (maxY - positions[i + 1]) / (maxY - minY); // served browned side up
    positions[i + 2] *= zScale;
  }
  // flipping mirrors the mesh, so reverse every triangle to keep faces pointing outwards
  for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Fine dough texture (pores, flour) used as a bump map; drawn once on a small canvas. */
export function buildDoughBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // tileable enough at this scale; mixes soft lumps with fine grain
      const n = 0.6 * fbm2(x / 24, y / 24, 4, 21) + 0.4 * fbm2(x / 4, y / 4, 2, 23);
      const v = Math.round(n * 255);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/** Dough material: fine bumps and a soft satin finish; kept to a standard material so phones stay smooth. */
export function createGyozaMaterial(bump: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    bumpMap: bump,
    bumpScale: 1.2,
    emissive: new THREE.Color(0xffc35a),
    emissiveIntensity: 0,
  });
}
