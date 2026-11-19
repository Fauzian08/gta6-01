// Isla Azura — cars: low-poly box-built models, arcade driving, damage.
// A car is a group of boxes and cylinders; driving is a simple bicycle model
// with speed, steering and drift, tuned to feel right on a keyboard.
import * as THREE from '../vendor/three.module.min.js';
import { CAR_MODELS } from './config.js';
import { pick, range } from './random.js';

const WHEEL_GEO = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);

export function buildCarMesh(model, opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: model.color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const trim = new THREE.MeshLambertMaterial({ color: 0x22262c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), paint);
  body.position.y = 0.62;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 2.2), glass);
  cabin.position.set(0, 1.18, -0.25);
  g.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.34, 0.7), trim);
  nose.position.set(0, 0.5, 2.3);
  g.add(nose);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.4), trim);
  spoiler.position.set(0, 1.0, -2.2);
  g.add(spoiler);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(WHEEL_GEO, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
    wheels.push(w);
  }
  if (o.police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(0, 1.56, -0.25);
    g.add(bar);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    barB.position.set(0.7, 1.56, -0.25);
    g.add(barB);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1.6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    door.position.set(-1.06, 0.75, 0.1);
    g.add(door);
    const door2 = door.clone();
    door2.position.x = 1.06;
    g.add(door2);
  }
  g.userData.wheels = wheels;
  g.userData.bar = o.police ? g.children[5] : null;
  return g;
}

export class Car {
  constructor(scene, model, x, z, heading, opts) {
    this.model = model;
    this.scene = scene;
    this.mesh = buildCarMesh(model, opts);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading || 0;
    scene.add(this.mesh);
    this.x = x;
    this.z = z;
    this.heading = heading || 0;
    this.speed = 0;
    this.steer = 0;
    this.damage = (opts && opts.damage) || 0;
    this.isPolice = !!(opts && opts.police);
    this.dead = false;
  }

  // Arcade drive: throttle -1..1, steer -1..1, dt seconds.
  drive(throttle, steer, dt) {
    const top = this.model.top;
    const accel = this.model.accel;
    this.speed += throttle * accel * dt;
    if (throttle === 0) this.speed -= Math.sign(this.speed) * 8 * dt;
    if (this.speed > top) this.speed = top;
    if (this.speed < -top * 0.4) this.speed = -top * 0.4;
    if (Math.abs(this.speed) < 0.2 && throttle === 0) this.speed = 0;
    const steerAmount = steer * 1.9 * Math.min(1, Math.abs(this.speed) / 10) * (this.speed >= 0 ? 1 : -1);
    this.heading += steerAmount * dt * (this.speed >= 0 ? 1 : -1) * 0.9;
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    this.mesh.rotation.z = -steer * 0.05 * Math.min(1, Math.abs(this.speed) / 20);
    const spin = (this.speed * dt) / 0.42;
    for (const w of this.mesh.userData.wheels) w.rotation.x += spin;
  }

  damageBy(amount) {
    this.damage = Math.min(100, this.damage + amount);
    if (this.damage >= 100) this.dead = true;
    return this.damage;
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.dead = true;
  }

  get speedKmh() {
    return Math.abs(this.speed) * 3.6;
  }
}

export function randomCarModel(rng) {
  return pick(rng, CAR_MODELS);
}

export function randomParkedSpot(rng, world) {
  const p = world.streetPoint(rng);
  return { x: p.x + range(rng, -8, 8), z: p.z + range(rng, -8, 8), heading: range(rng, 0, Math.PI * 2) };
}
