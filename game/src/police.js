// Isla Azura — the AZPD. A wanted level of 1–5 stars drives the response:
// patrol cars that chase and ram, foot cops who give chase on foot, and a
// helicopter once the heat reaches 4 stars. Police radio chatter is text the
// HUD shows, and every unit reports its role and distance.
import * as THREE from '../vendor/three.module.min.js';
import { WANTED, CAR_MODELS } from './config.js';
import { range, intRange, pick } from './random.js';
import { Car } from './vehicles.js';

const POLICE_MODEL = { name: 'AZPD INTERCEPTOR', color: 0x1c1f26, top: 50, accel: 30 };
const CHATTER = [
  'All units, suspect heading east on Strand Boulevard.',
  'KITE-1 has eyes on the suspect vehicle.',
  'Set up a roadblock at the Marina junction.',
  'Suspect is armed — approach with caution.',
  'Air unit is on station, keep the suspect in sight.',
  'Suspect just took a side street, cut him off at the plaza.',
  'Dispatch: two more units to the Strip, now.',
  'The suspect is ramming patrol cars. Weapons free.',
];

export class Police {
  constructor(scene, world, rng) {
    this.scene = scene;
    this.world = world;
    this.rng = rng;
    this.stars = 0;
    this.cars = [];
    this.foot = [];
    this.heli = null;
    this.heliRotor = null;
    this.hiddenTimer = 0;
    this.chatterTimer = 0;
    this.chatter = '';
    this.units = [];
    this.callouts = ['KITE-1', 'MARLIN-3', 'CORAL-48', 'CORAL-85', 'CORAL-43', 'REEF-12'];
    this.roles = ['MARKSMAN', 'SHORE WATCH', 'RAMMING', 'FLANKING', 'IN PURSUIT', 'FOOT CHASE'];
    this.escaped = 0;
  }

  addStar(n) {
    const before = this.stars;
    this.stars = Math.max(0, Math.min(WANTED.maxStars, this.stars + n));
    if (this.stars > before) this.hiddenTimer = 0;
    return this.stars;
  }

  setStars(n) {
    this.stars = Math.max(0, Math.min(WANTED.maxStars, n));
    this.hiddenTimer = 0;
  }

  spawnCarNear(x, z) {
    const a = this.rng() * Math.PI * 2;
    const d = range(this.rng, 45, 70);
    const car = new Car(this.scene, POLICE_MODEL, x + Math.sin(a) * d, z + Math.cos(a) * d, a, { police: true });
    car.callout = this.callouts[this.cars.length % this.callouts.length];
    car.role = pick(this.rng, ['RAMMING', 'FLANKING', 'IN PURSUIT']);
    this.cars.push(car);
    return car;
  }

  spawnFootCop(x, z) {
    const g = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.34), dark);
    body.position.y = 1.05;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), skin);
    head.position.y = 1.62;
    g.add(head);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), new THREE.MeshLambertMaterial({ color: 0x0d1420 }));
    cap.position.y = 1.82;
    g.add(cap);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), dark);
    legL.position.set(-0.14, 0.35, 0);
    g.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.14;
    g.add(legR);
    g.position.set(x, 0, z);
    this.scene.add(g);
    const cop = { mesh: g, x, z, heading: 0, speed: 5.2, legL, legR, phase: this.rng() * 6, role: 'FOOT CHASE' };
    this.foot.push(cop);
    return cop;
  }

  spawnHeli(x, z) {
    if (this.heli) return this.heli;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.2), new THREE.MeshLambertMaterial({ color: 0x24344d }));
    body.position.y = 0;
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.5), new THREE.MeshLambertMaterial({ color: 0x24344d }));
    tail.position.set(0, 0.2, -3.8);
    g.add(tail);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 1.4), new THREE.MeshLambertMaterial({ color: 0x9fd4e8 }));
    glass.position.set(0, 0.2, 1.6);
    g.add(glass);
    const rotor = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x11141a }));
    rotor.add(blade);
    const blade2 = blade.clone();
    blade2.rotation.y = Math.PI / 2;
    rotor.add(blade2);
    rotor.position.y = 1.0;
    g.add(rotor);
    const spot = new THREE.Mesh(new THREE.ConeGeometry(3, 14, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
    spot.position.y = -7;
    g.add(spot);
    g.position.set(x, 46, z);
    this.scene.add(g);
    this.heli = g;
    this.heliRotor = rotor;
    return g;
  }

  removeHeli() {
    if (!this.heli) return;
    this.scene.remove(this.heli);
    this.heli = null;
    this.heliRotor = null;
  }

  clearAll() {
    for (const c of this.cars) c.destroy();
    for (const f of this.foot) this.scene.remove(f.mesh);
    this.removeHeli();
    this.cars = [];
    this.foot = [];
    this.units = [];
  }

  // The response the HUD lists: each live unit with a role and a distance.
  listUnits(px, pz) {
    const list = [];
    for (const c of this.cars) {
      if (c.dead) continue;
      list.push({ name: c.callout || 'AZPD', role: c.role, dist: Math.round(Math.hypot(c.x - px, c.z - pz)) });
    }
    for (const f of this.foot) {
      list.push({ name: 'FOOT x2', role: f.role, dist: Math.round(Math.hypot(f.x - px, f.z - pz)) });
    }
    if (this.heli) list.push({ name: 'KITE-1', role: 'AIR UNIT', dist: Math.round(Math.hypot(this.heli.position.x - px, this.heli.position.z - pz)) });
    this.units = list;
    return list;
  }

  update(dt, px, pz, playerSpeed) {
    if (this.stars === 0) {
      if (this.cars.length || this.foot.length || this.heli) this.clearAll();
      return;
    }
    // Keep the right number of patrol cars out.
    const want = this.stars * WANTED.copCarsPerStar;
    while (this.cars.filter((c) => !c.dead).length < want) this.spawnCarNear(px, pz);
    if (this.stars >= 2 && this.foot.length < 2) this.spawnFootCop(px + range(this.rng, -18, 18), pz + range(this.rng, -18, 18));
    if (this.stars >= WANTED.heliStars) {
      if (!this.heli) this.spawnHeli(px, pz);
    } else if (this.heli) {
      this.removeHeli();
    }
    // Chase: steer at the player, ram when close.
    for (const car of this.cars) {
      if (car.dead) continue;
      const dx = px - car.x;
      const dz = pz - car.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      let diff = want - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.6));
      car.drive(dist > 4 ? 1 : 0.4, steer, dt);
      if (dist < 3.4) {
        car.speed *= 0.5;
      }
      const pos = this.world.collide(car.x, car.z, 1.6);
      car.x = pos.x;
      car.z = pos.z;
      car.mesh.position.set(car.x, 0, car.z);
      if (car.mesh.userData.bar) {
        const blink = Math.floor(performance.now() / 180) % 2 === 0;
        car.mesh.userData.bar.material.color.set(blink ? 0xff2222 : 0x2244ff);
      }
    }
    this.cars = this.cars.filter((c) => !c.dead);
    // Foot cops run at the player.
    for (const cop of this.foot) {
      const dx = px - cop.x;
      const dz = pz - cop.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.6) {
        cop.heading = Math.atan2(dx, dz);
        cop.x += Math.sin(cop.heading) * cop.speed * dt;
        cop.z += Math.cos(cop.heading) * cop.speed * dt;
        cop.phase += dt * 9;
        cop.legL.rotation.x = Math.sin(cop.phase) * 0.6;
        cop.legR.rotation.x = -Math.sin(cop.phase) * 0.6;
      }
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = cop.heading;
    }
    // Helicopter circles above the player.
    if (this.heli) {
      const t = performance.now() / 1000;
      this.heli.position.x = px + Math.sin(t * 0.35) * 26;
      this.heli.position.z = pz + Math.cos(t * 0.35) * 26;
      this.heli.position.y = 44 + Math.sin(t * 0.8) * 2;
      this.heli.rotation.y = Math.atan2(px - this.heli.position.x, pz - this.heli.position.z);
      if (this.heliRotor) this.heliRotor.rotation.y += dt * 22;
    }
    // Chatter lines, one every few seconds while wanted.
    this.chatterTimer -= dt;
    if (this.chatterTimer <= 0) {
      this.chatter = pick(this.rng, CHATTER);
      this.chatterTimer = range(this.rng, 5, 9);
    }
    // Stars decay once the player is out of sight of every unit.
    const nearest = Math.min(
      ...this.cars.map((c) => Math.hypot(c.x - px, c.z - pz)),
      ...this.foot.map((f) => Math.hypot(f.x - px, f.z - pz)),
      999,
    );
    if (nearest > 90) {
      this.hiddenTimer += dt;
      if (this.hiddenTimer > WANTED.decaySeconds) {
        this.stars -= 1;
        this.hiddenTimer = 0;
        if (this.stars === 0) this.escaped += 1;
      }
    } else {
      this.hiddenTimer = 0;
    }
  }
}
