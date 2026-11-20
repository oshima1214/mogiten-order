import * as THREE from 'three';
import { PERFECT_GLOW_SECONDS, renderPixelRatio } from '@/lib/game/view';
import { BLOCK_H, type TowerRenderer, type TowerScene } from './types';

/** One screen width of the game = UNIT world units. */
const UNIT = 6;
const BH = BLOCK_H * UNIT; // block height in world units
const DEPTH = 1.6; // how deep (front to back) a gyoza is

function webglAvailable(): boolean {
  try {
    const probe = document.createElement('canvas');
    return !!(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Unit gyoza (1 wide, 1 tall, 1 deep, flat bottom at y=0), scaled per block:
 * a squashed dome that browns towards the bottom, with a crimped crest on top.
 * To use a real model, load a GLB here instead.
 */
function gyozaParts() {
  const body = new THREE.SphereGeometry(0.5, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  body.scale(1, 2, 1); // dome height 1
  const pos = body.getAttribute('position');
  const colors: number[] = [];
  const cream = new THREE.Color(0xf6e2b3);
  const brown = new THREE.Color(0xb8682a);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.smoothstep(pos.getY(i), 0.02, 0.32); // 0 at the bottom → browned
    c.copy(brown).lerp(cream, t);
    colors.push(c.r, c.g, c.b);
  }
  body.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  body.computeVertexNormals();
  const pleat = new THREE.SphereGeometry(0.5, 12, 8);
  return { body, pleat };
}

export function createThreeRenderer(canvas: HTMLCanvasElement): TowerRenderer {
  if (!webglAvailable()) throw new Error('WebGL unavailable');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c4a0, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(3, 8, 7);
  scene.add(sun);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

  // plate + soft shadow under the tower
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(3.3, 3.0, 0.22, 48),
    new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.35 }),
  );
  plate.position.y = -0.11;
  scene.add(plate);
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(60,40,20,0.35)');
    grad.addColorStop(1, 'rgba(60,40,20,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  scene.add(shadow);

  const parts = gyozaParts();
  const pleatMat = new THREE.MeshStandardMaterial({ color: 0xf1d7a2, roughness: 0.8 });

  // Pool of gyoza groups, reused every frame.
  const pool: { group: THREE.Group; bodyMat: THREE.MeshStandardMaterial }[] = [];
  const gyoza = (i: number) => {
    while (pool.length <= i) {
      const bodyMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.7,
        emissive: 0xffc35a,
        emissiveIntensity: 0,
      });
      const group = new THREE.Group();
      group.add(new THREE.Mesh(parts.body, bodyMat));
      // crimped crest along the top
      for (let k = -4; k <= 4; k++) {
        const x = k * 0.085;
        const p = new THREE.Mesh(parts.pleat, pleatMat);
        const surface = Math.sqrt(Math.max(0, 1 - (2 * x) ** 2)); // dome height at x
        p.position.set(x, surface + 0.02, 0);
        p.scale.set(0.1, 0.28, 0.24);
        p.rotation.z = 0.35;
        group.add(p);
      }
      scene.add(group);
      pool.push({ group, bodyMat });
    }
    return pool[i];
  };

  let aspect = 1;

  return {
    resize(cssW, cssH, dpr) {
      renderer.setPixelRatio(renderPixelRatio(dpr));
      renderer.setSize(cssW, cssH, false);
      aspect = cssH / Math.max(1, cssW);
    },

    draw(s: TowerScene) {
      // Camera: straight on (so left/right alignment reads truthfully), tilted down a little.
      const halfW = (UNIT / 2) * 1.2;
      const halfH = halfW * aspect;
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
      const lookY = s.camera * BH + halfH * 0.62;
      camera.position.set(0, lookY + 4.5, 12);
      camera.lookAt(0, lookY, 0);

      let n = 0;
      const place = (x: number, width: number, level: number, rot = 0, glow = 0) => {
        const g = gyoza(n++);
        g.group.visible = true;
        g.group.position.set((x + width / 2) * UNIT - UNIT / 2, level * BH, 0);
        g.group.scale.set(width * UNIT, BH * 1.15, DEPTH);
        g.group.rotation.z = rot;
        g.bodyMat.emissiveIntensity = glow;
      };

      const glow = s.perfectAge < PERFECT_GLOW_SECONDS ? 0.6 * (1 - s.perfectAge / PERFECT_GLOW_SECONDS) : 0;
      s.tower.forEach((b, i) => place(b.x, b.width, b.level, 0, i === s.tower.length - 1 ? glow : 0));
      if (s.swing) place(s.swing.block.x, s.swing.block.width, s.swing.level);
      for (const p of s.debris) place(p.x, p.width, p.y, p.rot);
      for (let i = n; i < pool.length; i++) pool[i].group.visible = false;

      const base = s.tower[0];
      shadow.scale.set(base ? base.width * UNIT * 1.3 : 3, DEPTH * 1.6, 1);
      renderer.render(scene, camera);
    },

    dispose() {
      for (const p of pool) p.bodyMat.dispose();
      parts.body.dispose();
      parts.pleat.dispose();
      pleatMat.dispose();
      shadowTex.dispose();
      for (const m of [plate, shadow]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      renderer.dispose();
    },
  };
}
