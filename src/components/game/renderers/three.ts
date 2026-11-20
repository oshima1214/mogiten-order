import * as THREE from 'three';
import { PERFECT_GLOW_SECONDS, renderPixelRatio } from '@/lib/game/view';
import { buildDoughBumpTexture, buildGyozaGeometry, createGyozaMaterial } from './gyozaGeometry';
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

  // One detailed gyoza mesh (built in code), shared by every block in the tower.
  const gyozaGeometry = buildGyozaGeometry();
  const bump = buildDoughBumpTexture();

  // Pool of gyoza meshes, reused every frame (each has its own material for the PERFECT glow).
  const pool: { group: THREE.Mesh; bodyMat: THREE.MeshStandardMaterial }[] = [];
  const gyoza = (i: number) => {
    while (pool.length <= i) {
      const bodyMat = createGyozaMaterial(bump);
      const group = new THREE.Mesh(gyozaGeometry, bodyMat);
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
      gyozaGeometry.dispose();
      bump.dispose();
      shadowTex.dispose();
      for (const m of [plate, shadow]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      renderer.dispose();
    },
  };
}
