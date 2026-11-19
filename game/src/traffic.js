// Isla Azura — traffic and pedestrians. Cars cruise the street grid on
// waypoints and brake for each other; pedestrians walk the sidewalks and run
// when a shot goes off nearby. All of it is seeded, so a screenshot replays.
import * as THREE from '../vendor/three.module.min.js';
import { CITY } from './config.js';
import { range, intRange, pick, chance } from './random.js';
import { Car, randomCarModel } from './vehicles.js';

const PED_COLORS = [0xe8b04b, 0x4b8de8, 0xd94f70, 0x7fb069, 0x9b7ede, 0xe8e4da, 0x5bc0be];

function buildPedestrian(color) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), shirt);
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), skin);
  head.position.y = 1.62;
  g.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), pants);
  legL.position.set(-0.14, 0.35, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.14;
  g.add(legR);
  g.userData.legL = legL;
  g.userData.legR = legR;
  return g;
}

export class Traffic {
  constructor(scene, world, rng) {
    this.scene = scene;
    this.world = world;
    this.rng = rng;
    this.cars = [];
    this.peds = [];
    this.fleeX = null;
    this.fleeZ = null;
    this.fleeUntil = 0;
  }

  spawn(count) {
    for (let i = 0; i < count; i += 1) this.addCar();
    for (let i = 0; i < count * 2; i += 1) this.addPed();
  }

  addCar() {
    const p = this.world.streetPoint(this.rng);
    const car = new Car(this.scene, randomCarModel(this.rng), p.x, p.z, this.rng() * Math.PI * 2);
    car.speed = range(this.rng, 6, 12) * (chance(this.rng, 0.5) ? 1 : -1);
    car.target = this.nextWaypoint(car);
    this.cars.push(car);
    return car;
  }

  addPed() {
    const p = this.world.streetPoint(this.rng);
    const mesh = buildPedestrian(pick(this.rng, PED_COLORS));
    mesh.position.set(p.x + range(this.rng, -10, 10), 0, p.z + range(this.rng, -10, 10));
    this.scene.add(mesh);
    const ped = {
      mesh, x: mesh.position.x, z: mesh.position.z,
      heading: this.rng() * Math.PI * 2,
      speed: range(this.rng, 1.0, 1.8),
      walkPhase: this.rng() * 6,
      target: null,
    };
    ped.target = this.nextPedTarget(ped);
    this.peds.push(ped);
    return ped;
  }

  nextWaypoint(car) {
    const cell = CITY.block;
    const i = intRange(this.rng, 0, CITY.blocks);
    return { x: -CITY.half + i * cell + range(this.rng, -4, 4), z: -CITY.half + intRange(this.rng, 0, CITY.blocks) * cell + range(this.rng, -4, 4) };
  }

  nextPedTarget(ped) {
    return { x: ped.x + range(this.rng, -60, 60), z: ped.z + range(this.rng, -60, 60) };
  }

  scare(x, z, seconds) {
    this.fleeX = x;
    this.fleeZ = z;
    this.fleeUntil = performance.now() / 1000 + seconds;
  }

  update(dt, now) {
    // Traffic cars: steer toward the waypoint, slow for the car ahead.
    for (const car of this.cars) {
      if (car.dead) continue;
      const dx = car.target.x - car.x;
      const dz = car.target.z - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 6) {
        car.target = this.nextWaypoint(car);
        continue;
      }
      const want = Math.atan2(dx, dz);
      let diff = want - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.4));
      let blocked = false;
      for (const other of this.cars) {
        if (other === car || other.dead) continue;
        const ox = other.x - car.x;
        const oz = other.z - car.z;
        const od = Math.hypot(ox, oz);
        if (od < 9 && Math.abs(Math.atan2(ox, oz) - car.heading) < 0.6) { blocked = true; break; }
      }
      car.drive(blocked ? -0.6 : 0.55, steer, dt);
      const pos = this.world.collide(car.x, car.z, 1.6);
      car.x = pos.x;
      car.z = pos.z;
      car.mesh.position.set(car.x, 0, car.z);
    }
    // Pedestrians: walk to target, run away from a scare point.
    const fleeing = this.fleeX !== null && now < this.fleeUntil;
    for (const ped of this.peds) {
      let tx = ped.target.x;
      let tz = ped.target.z;
      let speed = ped.speed;
      if (fleeing) {
        const dx = ped.x - this.fleeX;
        const dz = ped.z - this.fleeZ;
        const d = Math.hypot(dx, dz);
        if (d < 40) {
          tx = ped.x + (dx / (d || 1)) * 30;
          tz = ped.z + (dz / (d || 1)) * 30;
          speed = 4.2;
        }
      }
      const dx = tx - ped.x;
      const dz = tz - ped.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2) {
        ped.target = this.nextPedTarget(ped);
        continue;
      }
      ped.heading = Math.atan2(dx, dz);
      ped.x += Math.sin(ped.heading) * speed * dt;
      ped.z += Math.cos(ped.heading) * speed * dt;
      ped.walkPhase += dt * speed * 4;
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = ped.heading;
      const swing = Math.sin(ped.walkPhase) * 0.45;
      ped.mesh.userData.legL.rotation.x = swing;
      ped.mesh.userData.legR.rotation.x = -swing;
    }
  }

  clear() {
    for (const c of this.cars) c.destroy();
    for (const p of this.peds) this.scene.remove(p.mesh);
    this.cars = [];
    this.peds = [];
  }
}
