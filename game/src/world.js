// Isla Azura — the city of Puerto Azura, built procedurally from a seed.
// A street grid of 8x8 blocks, five districts, a beach and harbour on the east
// side, palms, lamps and props, all from boxes, cylinders and canvas textures.
// Time of day (day / sunset / night) drives the sun, sky and street lamps.
import * as THREE from '../vendor/three.module.min.js';
import { CITY, DISTRICTS } from './config.js';
import { mulberry32, range, intRange, pick, chance } from './random.js';

const PALETTE = [0xd8c9a3, 0xc9b18a, 0xb7c4cc, 0xe0a458, 0x9db8a6, 0xd97b6c, 0x8fa8c8, 0xe8dcc8];
const ROOF = [0x7a6a58, 0x5d6b7a, 0x8a5a4a, 0x6b7a5d];

function windowTexture(rng, base, lit) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  const cols = 5;
  const rows = 10;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const on = rng() < (lit ? 0.55 : 0.28);
      g.fillStyle = on ? '#ffd98a' : '#2c3a4a';
      g.fillRect(8 + x * 24, 10 + y * 24, 14, 15);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function groundTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#8a8f96';
  g.fillRect(0, 0, 1024, 1024);
  // blocks
  const span = CITY.half * 2;
  const cell = span / CITY.blocks;
  const px = 1024 / span;
  g.fillStyle = '#3d4148';
  for (let i = 0; i <= CITY.blocks; i += 1) {
    const p = (i * cell - CITY.street / 2 + CITY.half) * px;
    g.fillRect(0, p, 1024, CITY.street * px);
    g.fillRect(p, 0, CITY.street * px, 1024);
  }
  // sidewalks + blocks
  g.fillStyle = '#9aa0a6';
  for (let bx = 0; bx < CITY.blocks; bx += 1) {
    for (let bz = 0; bz < CITY.blocks; bz += 1) {
      const x0 = (-CITY.half + bx * cell + CITY.street / 2) * px;
      const z0 = (-CITY.half + bz * cell + CITY.street / 2) * px;
      g.fillRect(x0, z0, (cell - CITY.street) * px, (cell - CITY.street) * px);
    }
  }
  // beach sand on the east edge
  g.fillStyle = '#e6d3a3';
  g.fillRect(880, 0, 144, 1024);
  // centre dashes
  g.strokeStyle = '#e8d44d';
  g.lineWidth = 3;
  g.setLineDash([18, 22]);
  for (let i = 0; i <= CITY.blocks; i += 1) {
    const p = (i * cell + CITY.half) * px;
    g.beginPath(); g.moveTo(0, p); g.lineTo(1024, p); g.stroke();
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 1024); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class World {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = mulberry32(seed);
    this.colliders = [];
    this.buildings = [];
    this.palms = [];
    this.lamps = [];
    this.timeOfDay = 'sunset';
    this.water = null;
    this.sun = null;
    this.hemi = null;
    this.build();
  }

  build() {
    const rng = this.rng;
    const scene = this.scene;
    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY.half * 2 + 220, CITY.half * 2 + 60),
      new THREE.MeshLambertMaterial({ map: groundTexture() }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(40, 0, 0);
    scene.add(ground);
    // Sea to the east
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(260, CITY.half * 2 + 400),
      new THREE.MeshLambertMaterial({ color: 0x2e7f9e, transparent: true, opacity: 0.92 }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(CITY.half + 190, -0.4, 0);
    scene.add(sea);
    this.water = sea;
    // Sky + lights
    this.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x54452e, 0.9);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe0b3, 1.6);
    this.sun.position.set(180, 220, 120);
    scene.add(this.sun);
    // Buildings: one or two towers per block, kept off the streets.
    const cell = CITY.block;
    const mats = PALETTE.map((col) => new THREE.MeshLambertMaterial({ map: windowTexture(rng, '#' + col.toString(16).padStart(6, '0'), false) }));
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x6a5a48 });
    for (let bx = 0; bx < CITY.blocks; bx += 1) {
      for (let bz = 0; bz < CITY.blocks; bz += 1) {
        const cx = -CITY.half + bx * cell + cell / 2;
        const cz = -CITY.half + bz * cell + cell / 2;
        if (cx > CITY.half - 60) continue; // beach blocks stay low
        const count = chance(rng, 0.45) ? 2 : 1;
        for (let k = 0; k < count; k += 1) {
          const w = range(rng, 16, 26);
          const d = range(rng, 16, 26);
          const h = range(rng, 10, 62) * (bx < 2 || bz < 2 ? 1.4 : 1);
          const ox = count === 2 ? (k === 0 ? -11 : 11) : 0;
          const oz = count === 2 ? (k === 0 ? -11 : 11) : 0;
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pick(rng, mats));
          mesh.position.set(cx + ox, h / 2, cz + oz);
          scene.add(mesh);
          const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1.2, d + 1), roofMat);
          roof.position.set(cx + ox, h + 0.6, cz + oz);
          scene.add(roof);
          // rooftop sign on a few towers
          if (chance(rng, 0.22)) {
            const sign = new THREE.Mesh(
              new THREE.BoxGeometry(w * 0.6, 2.4, 0.6),
              new THREE.MeshBasicMaterial({ color: pick(rng, [0xff5a7a, 0x39d0c0, 0xffc233, 0x7ab8ff]) }),
            );
            sign.position.set(cx + ox, h + 2.4, cz + oz);
            scene.add(sign);
          }
          this.buildings.push(mesh);
          this.colliders.push({ minX: cx + ox - w / 2 - 1, maxX: cx + ox + w / 2 + 1, minZ: cz + oz - d / 2 - 1, maxZ: cz + oz + d / 2 + 1 });
        }
      }
    }
    // Palms along the beach road and the Strip
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
    const palmSpots = [];
    for (let z = -300; z <= 300; z += 34) palmSpots.push([CITY.half - 34, z]);
    for (let x = -280; x <= 240; x += 44) palmSpots.push([x, CITY.half - 34]);
    for (const [px, pz] of palmSpots) {
      if (chance(rng, 0.25)) continue;
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 9, 6), trunkMat);
      trunk.position.y = 4.5;
      trunk.rotation.z = range(rng, -0.08, 0.08);
      g.add(trunk);
      for (let f = 0; f < 6; f += 1) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5.5, 4), leafMat);
        const a = (f / 6) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 2.1, 9.4, Math.sin(a) * 2.1);
        leaf.rotation.z = Math.cos(a) * 1.1;
        leaf.rotation.x = -Math.sin(a) * 1.1;
        g.add(leaf);
      }
      g.position.set(px + range(rng, -4, 4), 0, pz + range(rng, -4, 4));
      scene.add(g);
      this.palms.push(g);
    }
    // Street lamps at intersections
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (let i = 0; i <= CITY.blocks; i += 1) {
      for (let j = 0; j <= CITY.blocks; j += 1) {
        if ((i + j) % 2) continue;
        const x = -CITY.half + i * cell;
        const z = -CITY.half + j * cell;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 6), poleMat);
        pole.position.set(x + 9, 3.5, z + 9);
        scene.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat.clone());
        bulb.position.set(x + 9, 7.2, z + 9);
        scene.add(bulb);
        this.lamps.push(bulb);
      }
    }
    // Harbour crates at Portside
    const crateMat = new THREE.MeshLambertMaterial({ color: 0xb0783a });
    for (let i = 0; i < 26; i += 1) {
      const s = range(rng, 2, 4);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
      crate.position.set(range(rng, 120, 300), s / 2, range(rng, 120, 300));
      crate.rotation.y = range(rng, 0, Math.PI);
      scene.add(crate);
      this.colliders.push({ minX: crate.position.x - s / 2, maxX: crate.position.x + s / 2, minZ: crate.position.z - s / 2, maxZ: crate.position.z + s / 2 });
    }
    // Night-market stalls along the Sunset Strip (x=-160 street, z 100..180):
    // a counter, a striped awning and a crate of goods each.
    const stallWood = new THREE.MeshLambertMaterial({ color: 0x8a6b4f });
    // Awnings are unlit: the stripes stay bright after dark, so the market
    // reads as lit stalls instead of black boxes at night.
    const stripeA = new THREE.MeshBasicMaterial({ color: 0xe2547a });
    const stripeB = new THREE.MeshBasicMaterial({ color: 0xf2ead8 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    const stallSpots = [[-170, 112], [-150, 132], [-170, 152], [-150, 172], [-170, 96], [-150, 112]];
    for (const [sx, sz] of stallSpots) {
      const stall = new THREE.Group();
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 1.4), stallWood);
      counter.position.y = 0.5;
      stall.add(counter);
      for (let s = 0; s < 4; s += 1) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 1.8), s % 2 ? stripeA : stripeB);
        stripe.position.set(-1.0 + s * 0.68, 2.3, 0);
        stripe.rotation.z = 0.12;
        stall.add(stripe);
      }
      const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 5), stallWood);
      poleL.position.set(-1.2, 1.15, 0.8);
      stall.add(poleL);
      const poleR = poleL.clone();
      poleR.position.x = 1.2;
      stall.add(poleR);
      const goods = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.9), new THREE.MeshLambertMaterial({ color: pick(rng, [0xffc233, 0x7fb069, 0xe2547a, 0x5b8fd9]) }));
      goods.position.y = 1.2;
      stall.add(goods);
      // A warm bulb over the counter: one more market light, no extra lights.
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), bulbMat);
      bulb.position.set(0, 2.6, 0);
      stall.add(bulb);
      stall.position.set(sx, 0, sz);
      stall.rotation.y = sx < -160 ? 0 : Math.PI;
      scene.add(stall);
      this.colliders.push({ minX: sx - 1.4, maxX: sx + 1.4, minZ: sz - 1, maxZ: sz + 1 });
    }
    this.setTimeOfDay(this.timeOfDay);
  }

  setTimeOfDay(mode) {
    this.timeOfDay = mode;
    const scene = this.scene;
    if (mode === 'day') {
      scene.background = new THREE.Color(0x87bfe8);
      scene.fog = new THREE.Fog(0x87bfe8, 300, 900);
      this.sun.position.set(180, 260, 120);
      this.sun.color.set(0xfff2d0);
      this.sun.intensity = 1.7;
      this.hemi.intensity = 1.0;
      for (const l of this.lamps) l.material.color.set(0xffe9a8);
    } else if (mode === 'sunset') {
      scene.background = new THREE.Color(0xf2a35e);
      scene.fog = new THREE.Fog(0xe8906a, 260, 820);
      this.sun.position.set(-260, 90, 140);
      this.sun.color.set(0xff9a4d);
      this.sun.intensity = 1.5;
      this.hemi.intensity = 0.85;
      for (const l of this.lamps) l.material.color.set(0xffd27a);
    } else {
      scene.background = new THREE.Color(0x141a2e);
      scene.fog = new THREE.Fog(0x141a2e, 200, 700);
      this.sun.position.set(60, 200, -80);
      this.sun.color.set(0x8fa8ff);
      this.sun.intensity = 0.6;
      this.hemi.intensity = 0.55;
      for (const l of this.lamps) l.material.color.set(0xfff2b0);
    }
  }

  districtAt(x, z) {
    let best = DISTRICTS[0];
    let bestD = Infinity;
    for (const d of DISTRICTS) {
      const dd = (x - d.x) * (x - d.x) + (z - d.z) * (z - d.z);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  }

  // Push a circle (x,z,r) out of every building AABB it overlaps.
  collide(x, z, r) {
    let px = x;
    let pz = z;
    for (const c of this.colliders) {
      const nx = Math.max(c.minX, Math.min(px, c.maxX));
      const nz = Math.max(c.minZ, Math.min(pz, c.maxZ));
      const dx = px - nx;
      const dz = pz - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        px = nx + (dx / d) * r;
        pz = nz + (dz / d) * r;
      } else if (d2 <= 0.0001 && px > c.minX - r && px < c.maxX + r && pz > c.minZ - r && pz < c.maxZ + r) {
        px = c.maxX + r;
      }
    }
    px = Math.max(-CITY.half - 20, Math.min(CITY.half + 120, px));
    pz = Math.max(-CITY.half - 20, Math.min(CITY.half + 20, pz));
    return { x: px, z: pz };
  }

  streetPoint(rng) {
    const cell = CITY.block;
    const i = intRange(rng, 0, CITY.blocks);
    const j = intRange(rng, 0, CITY.blocks);
    return { x: -CITY.half + i * cell + range(rng, -6, 6), z: -CITY.half + j * cell + range(rng, -6, 6) };
  }

  update(dt, t) {
    if (this.water) {
      this.water.position.y = -0.4 + Math.sin(t * 0.5) * 0.15;
    }
    for (let i = 0; i < this.palms.length; i += 1) {
      this.palms[i].rotation.z = Math.sin(t * 0.7 + i) * 0.02;
    }
  }
}
