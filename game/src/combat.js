// Isla Azura — combat on foot. Rio fights with fists and guns: mouse aim, a
// crosshair, tracers, health and armour, and enemies who shoot back. Hits are
// raycasts against simple body spheres, so combat stays honest and cheap.
import * as THREE from '../vendor/three.module.min.js';
import { WEAPONS } from './config.js';
import { range, pick } from './random.js';

export class Player {
  constructor(scene, x, z) {
    this.scene = scene;
    this.x = x;
    this.z = z;
    this.heading = 0;
    this.health = 100;
    this.armour = 60;
    this.money = 2450;
    this.rp = 0;
    this.onFoot = true;
    this.weaponIndex = 1;
    this.ammo = WEAPONS.map((w) => w.mag);
    this.reserve = WEAPONS.map((w) => w.reserve);
    this.lastShot = 0;
    this.speed = 6;
    this.mesh = this.buildMesh();
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
  }

  buildMesh() {
    const g = new THREE.Group();
    const jacket = new THREE.MeshLambertMaterial({ color: 0xd94f30 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.34), jacket);
    body.position.y = 1.05;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skin);
    head.position.y = 1.66;
    g.add(head);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.52), new THREE.MeshLambertMaterial({ color: 0x1c1f26 }));
    cap.position.y = 1.86;
    g.add(cap);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.22), pants);
    legL.position.set(-0.15, 0.36, 0);
    g.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.15;
    g.add(legR);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), jacket);
    armR.position.set(0.4, 1.1, 0.15);
    armR.rotation.x = -1.2;
    g.add(armR);
    g.userData.legL = legL;
    g.userData.legR = legR;
    return g;
  }

  get weapon() {
    return WEAPONS[this.weaponIndex];
  }

  selectWeapon(i) {
    if (i >= 0 && i < WEAPONS.length) this.weaponIndex = i;
  }

  move(dx, dz, dt, world, walkPhase) {
    const nx = this.x + dx * this.speed * dt;
    const nz = this.z + dz * this.speed * dt;
    const pos = world.collide(nx, nz, 0.6);
    this.x = pos.x;
    this.z = pos.z;
    this.mesh.position.set(this.x, 0, this.z);
    if (dx !== 0 || dz !== 0) this.heading = Math.atan2(dx, dz);
    this.mesh.rotation.y = this.heading;
    const swing = Math.sin(walkPhase) * 0.5;
    this.mesh.userData.legL.rotation.x = swing;
    this.mesh.userData.legR.rotation.x = -swing;
  }

  hurt(amount) {
    let left = amount;
    if (this.armour > 0) {
      const absorbed = Math.min(this.armour, left * 0.6);
      this.armour -= absorbed;
      left -= absorbed;
    }
    this.health = Math.max(0, this.health - left);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }

  addArmour(amount) {
    this.armour = Math.min(100, this.armour + amount);
  }
}

export class Combat {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.enemies = [];
    this.tracers = [];
    this.muzzleUntil = 0;
  }

  spawnEnemy(x, z, kind) {
    const g = new THREE.Group();
    const gang = new THREE.MeshLambertMaterial({ color: kind === 'vulture' ? 0xa83232 : 0x5a4a7a });
    const skin = new THREE.MeshLambertMaterial({ color: 0xb07a52 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.34), gang);
    body.position.y = 1.05;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skin);
    head.position.y = 1.66;
    g.add(head);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.6), new THREE.MeshLambertMaterial({ color: 0x11141a }));
    gun.position.set(0.35, 1.15, 0.4);
    g.add(gun);
    g.position.set(x, 0, z);
    this.scene.add(g);
    const enemy = { mesh: g, x, z, hp: 100, kind: kind || 'vulture', lastShot: 0, dead: false, downUntil: 0 };
    this.enemies.push(enemy);
    return enemy;
  }

  // Fire from (ox,oy,oz) along a direction; returns the enemy hit, if any.
  fire(ox, oy, oz, dir, damage, rangeMax) {
    const from = new THREE.Vector3(ox, oy, oz);
    const ray = new THREE.Raycaster(from, dir);
    let best = null;
    let bestDist = rangeMax;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const centre = new THREE.Vector3(e.x, 1.2, e.z);
      const toCentre = centre.clone().sub(from);
      const along = toCentre.dot(dir);
      if (along < 0 || along > rangeMax) continue;
      const closest = from.clone().add(dir.clone().multiplyScalar(along));
      if (closest.distanceTo(centre) < 1.0 && along < bestDist) {
        best = e;
        bestDist = along;
      }
    }
    const end = from.clone().add(dir.clone().multiplyScalar(best ? bestDist : rangeMax));
    this.addTracer(from, end);
    if (best) {
      best.hp -= damage;
      if (best.hp <= 0) {
        best.dead = true;
        best.downUntil = performance.now() / 1000 + 999;
        best.mesh.rotation.x = -Math.PI / 2;
        best.mesh.position.y = 0.35;
      }
    }
    return best;
  }

  addTracer(from, to) {
    // A glowing bolt, not a 1px line: a thin box stretched from muzzle to hit.
    const a = new THREE.Vector3(from.x, from.y, from.z);
    const b = new THREE.Vector3(to.x, to.y, to.z);
    const len = a.distanceTo(b);
    const bolt = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, len),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }),
    );
    bolt.position.copy(a).lerp(b, 0.5);
    bolt.lookAt(b);
    this.scene.add(bolt);
    this.tracers.push({ line: bolt, until: performance.now() / 1000 + 0.09 });
  }

  update(dt, now, player) {
    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      if (now > this.tracers[i].until) {
        this.scene.remove(this.tracers[i].line);
        this.tracers[i].line.geometry.dispose();
        if (this.tracers[i].line.material) this.tracers[i].line.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
    // Enemies advance and shoot at the player when close enough.
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = player.x - e.x;
      const dz = player.z - e.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 34 && dist > 4) {
        const h = Math.atan2(dx, dz);
        e.x += Math.sin(h) * 2.6 * dt;
        e.z += Math.cos(h) * 2.6 * dt;
        e.mesh.position.set(e.x, 0, e.z);
        e.mesh.rotation.y = h;
      }
      if (dist < 30 && now - e.lastShot > range(this.rng, 1.1, 2.0)) {
        e.lastShot = now;
        const from = new THREE.Vector3(e.x, 1.4, e.z);
        const dir = new THREE.Vector3(player.x - e.x, 0.4, player.z - e.z).normalize();
        const end = from.clone().add(dir.clone().multiplyScalar(Math.min(dist, 30)));
        this.addTracer(from, end);
        if (this.rng() < 0.35) player.hurt(6);
      }
    }
  }

  get aliveCount() {
    return this.enemies.filter((e) => !e.dead).length;
  }

  clear() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    for (const t of this.tracers) this.scene.remove(t.line);
    this.enemies = [];
    this.tracers = [];
  }
}
