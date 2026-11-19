// Isla Azura — the game itself. Rio Vega's open-world crime story on Isla
// Azura: the city, the cars, the AZPD, the missions, the HUD and the menus,
// wired together here. Keyboard and mouse, desktop browser, no network.
import * as THREE from '../vendor/three.module.min.js';
import { CITY, DISTRICTS, RANKS, CREW, WEAPONS, RADIO, MISSIONS } from './config.js';
import { mulberry32, range, pick } from './random.js';
import { World } from './world.js';
import { Car, randomCarModel, randomParkedSpot } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Player, Combat } from './combat.js';
import { Missions, STORY_INTRO } from './missions.js';
import { HUD } from './hud.js';
import { Minimap } from './minimap.js';
import { AudioEngine } from './audio.js';
import { Career, loadSlot, saveSlot, allSlots, slotSummary, progressRows, careerRows, rankFor, completePercent } from './save.js';
import { stageShot, drawPauseMap } from './shots.js';

const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') || 1337);
const SHOT = params.get('shot') || '';

export class Game {
  constructor() {
    this.rng = mulberry32(SEED);
    this.state = 'title';
    this.frozen = false;
    this.timeScale = 1;
    this.clockMinutes = 17 * 60 + 40;
    this.timeOfDay = 'sunset';
    this.cameraPose = null;
    this.cameraYaw = 0;
    this.cameraPitch = 0.32;
    this.cameraDist = 9;
    this.keys = {};
    this.walkPhase = 0;
    this.playSeconds = 0;
    this.radioIndex = 0;
    this.crewCooldown = { mara: 0, leo: 0, nia: 0 };
    this.eyesOutUntil = 0;
    this.parked = [];
    this.car = null;
    this.missionTarget = null;
    this.missionPoint = null;
    this.racePoints = [];
    this.raceIndex = 0;
    this.hideTimer = 0;
    this.shotMode = SHOT;
    this.last = performance.now();
    this.init();
  }

  init() {
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.world = new World(this.scene, SEED);
    this.traffic = new Traffic(this.scene, this.world, this.rng);
    this.traffic.spawn(10);
    this.police = new Police(this.scene, this.world, this.rng);
    this.combat = new Combat(this.scene, this.rng);
    this.player = new Player(this.scene, -40, -40);
    this.missions = new Missions();
    this.career = new Career();
    this.hud = new HUD();
    this.minimap = new Minimap(document.getElementById('minimap'));
    this.audio = new AudioEngine();
    this.parked = [];
    for (let i = 0; i < 6; i += 1) {
      const spot = randomParkedSpot(this.rng, this.world);
      const model = randomCarModel(this.rng);
      const car = new Car(this.scene, model, spot.x, spot.z, spot.heading);
      this.parked.push(car);
    }
    // Title screen slots from real saves.
    this.hud.setTitleSlots(allSlots().map((s) => slotSummary(s)));
    this.bindInput();
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    if (this.shotMode) {
      stageShot(this.shotMode, this);
    } else {
      this.hud.showScreen('title');
      this.missions.say('Mara', STORY_INTRO[0].line, 6);
    }
    this.loop();
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.audio.unlock();
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'play') this.pause();
        else if (this.state === 'pause') this.resume();
      }
      if (e.code === 'KeyM' && this.state === 'play') this.pause('MAP');
      if (e.code === 'F5' && this.state === 'play') {
        e.preventDefault();
        this.quickSave();
      }
      if (e.code === 'KeyE' && this.state === 'play') this.tryEnterExit();
      if (e.code === 'Digit1') this.player.selectWeapon(0);
      if (e.code === 'Digit2') this.player.selectWeapon(1);
      if (e.code === 'Digit3') this.player.selectWeapon(2);
      if (e.code === 'Digit4') this.player.selectWeapon(3);
      if (e.code === 'KeyZ') this.useCrew('mara');
      if (e.code === 'KeyX') this.useCrew('leo');
      if (e.code === 'KeyC') this.useCrew('nia');
      if (e.code === 'KeyR' && this.state === 'over') this.restart();
      if (e.code === 'Enter' && this.state === 'title') this.startGame();
      if (e.code === 'KeyR' && this.state === 'play' && this.player.onFoot === false) this.respawnCar();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    const canvas = document.getElementById('game');
    canvas.addEventListener('click', () => {
      this.audio.unlock();
      if (this.state === 'play' && document.pointerLockElement !== canvas) canvas.requestPointerLock();
    });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas) {
        this.cameraYaw -= e.movementX * 0.0032;
        this.cameraPitch = Math.max(-0.1, Math.min(0.9, this.cameraPitch + e.movementY * 0.0022));
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      if (this.state !== 'play' || this.frozen) return;
      if (e.button === 0) this.shoot();
    });
    this.hud.el.pauseTabs.addEventListener('click', (e) => {
      const tab = e.target && e.target.dataset ? e.target.dataset.tab : null;
      if (tab) {
        this.hud.renderPause(tab, this.pauseData());
        if (tab === 'MAP' || tab === 'STATS') drawPauseMap(this);
      }
    });
    document.getElementById('btnContinue').addEventListener('click', () => this.startGame());
    document.getElementById('btnNew').addEventListener('click', () => this.startGame(true));
    document.getElementById('btnLoad').addEventListener('click', () => this.loadGame(1));
    document.getElementById('btnSettings').addEventListener('click', () => this.pause('SETTINGS'));
  }

  startGame(fresh) {
    if (fresh) {
      this.player.money = 500;
      this.player.rp = 0;
      this.player.health = 100;
      this.player.armour = 0;
      this.missions = new Missions();
      this.career = new Career();
    }
    this.state = 'play';
    this.hud.showScreen('play');
    if (!this.missions.active && this.missions.doneCount === 0) {
      this.missions.start(1);
      this.missionPoint = { x: 120, z: -200, r: 8 };
    }
    this.audio.missionSting();
  }

  loadGame(n) {
    const s = loadSlot(n);
    if (!s) return;
    this.player.money = s.money || 500;
    this.player.rp = s.rp || 0;
    this.player.health = 100;
    this.player.armour = 50;
    this.missions.done = s.missionsDone || {};
    this.career.carsStolen = s.carsStolen || 0;
    this.career.copsEscaped = s.copsEscaped || 0;
    this.career.distanceKm = s.distanceKm || 0;
    this.startGame();
  }

  quickSave() {
    const data = {
      money: this.player.money,
      rp: this.player.rp,
      missionsDone: this.missions.done,
      carsStolen: this.career.carsStolen,
      copsEscaped: this.police.escaped,
      distanceKm: Math.round(this.career.distanceKm * 10) / 10,
      completePct: completePercent(this.missions, this.career),
      district: this.world.districtAt(this.player.x, this.player.z).name,
      clock: this.clockText(),
      savedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };
    saveSlot(1, data);
    this.missions.say('Leo', 'Saved to slot 1. She will be right here when you get back.', 4);
  }

  pause(tab) {
    this.state = 'pause';
    this.hud.showScreen('pause');
    this.hud.renderPause(tab || 'STATS', this.pauseData());
    if (!tab || tab === 'STATS' || tab === 'MAP') drawPauseMap(this);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  resume() {
    this.state = 'play';
    this.hud.showScreen('play');
  }

  restart() {
    this.player.health = 100;
    this.player.armour = 50;
    this.player.x = -40;
    this.player.z = -40;
    this.player.mesh.position.set(-40, 0, -40);
    this.player.onFoot = true;
    if (this.car) { this.car.destroy(); this.car = null; }
    this.police.setStars(0);
    this.police.clearAll();
    this.combat.clear();
    this.state = 'play';
    this.hud.showScreen('play');
  }

  respawnCar() {
    if (!this.car) return;
    this.car.damage = 0;
    this.car.speed = 0;
  }

  enterCar(modelName, x, z, heading) {
    const model = { name: modelName, color: 0xe8590c, top: 52, accel: 26 };
    const car = new Car(this.scene, model, x, z, heading);
    this.car = car;
    this.player.onFoot = false;
    this.player.x = x;
    this.player.z = z;
    this.player.mesh.visible = false;
    return car;
  }

  spawnTargetCar(modelName, x, z, heading, color) {
    const model = { name: modelName, color: color || 0x8a6b4f, top: 44, accel: 20 };
    const car = new Car(this.scene, model, x, z, heading);
    return car;
  }

  nearestParked() {
    let best = null;
    let bestD = 4;
    for (const c of this.parked) {
      if (c.dead) continue;
      const d = Math.hypot(c.x - this.player.x, c.z - this.player.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  tryEnterExit() {
    if (!this.player.onFoot) {
      // Get out of the car.
      this.player.onFoot = true;
      this.player.x = this.car.x + Math.cos(this.car.heading) * 2.5;
      this.player.z = this.car.z - Math.sin(this.car.heading) * 2.5;
      this.player.mesh.visible = true;
      this.player.mesh.position.set(this.player.x, 0, this.player.z);
      this.car.speed = 0;
      return;
    }
    const target = this.nearestParked();
    if (!target) return;
    this.parked = this.parked.filter((c) => c !== target);
    this.car = target;
    this.player.onFoot = false;
    this.player.mesh.visible = false;
    this.career.carsStolen += 1;
    this.police.addStar(1);
    this.audio.missionSting();
    this.missions.say('Mara', 'Nice. That one is ours now — and the AZPD noticed.', 5);
    if (this.missions.active && this.missions.active.id === 1 && this.missions.active.stage === 0) {
      this.missions.advance();
      this.missionPoint = null;
    }
  }

  useCrew(id) {
    if (this.state !== 'play' || this.crewCooldown[id] > 0) return;
    if (id === 'mara') {
      this.police.addStar(-1);
      this.crewCooldown.mara = 60;
      this.missions.say('Mara', 'Plates swapped. They are looking for a different car now.', 4);
    } else if (id === 'leo') {
      if (this.car) this.car.damage = 0;
      this.crewCooldown.leo = 45;
      this.missions.say('Leo', 'Patched her up good as new. Do not scratch her again.', 4);
    } else if (id === 'nia') {
      this.eyesOutUntil = performance.now() / 1000 + 20;
      this.crewCooldown.nia = 50;
      this.missions.say('Nia', 'Eyes out — every cop on the island is on your map.', 4);
    }
    this.audio.blip(880, 0.1, 'sine', 0.1);
  }

  shoot() {
    const now = performance.now() / 1000;
    const w = this.player.weapon;
    if (now - this.player.lastShot < w.rate) return;
    this.player.lastShot = now;
    if (w.id === 'fists') {
      for (const e of this.combat.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - this.player.x, e.z - this.player.z) < w.range) {
          e.hp -= w.damage;
          if (e.hp <= 0) { e.dead = true; e.mesh.rotation.x = -Math.PI / 2; e.mesh.position.y = 0.35; }
        }
      }
      this.audio.blip(140, 0.08, 'sine', 0.15);
      return;
    }
    if (this.player.ammo[this.player.weaponIndex] <= 0) {
      this.audio.blip(220, 0.12, 'square', 0.08);
      return;
    }
    this.player.ammo[this.player.weaponIndex] -= 1;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.camera.position.clone();
    const hit = this.combat.fire(origin.x, origin.y, origin.z, dir, w.damage, w.range);
    this.audio.shot();
    this.traffic.scare(this.player.x, this.player.z, 6);
    if (hit) {
      this.career.peopleTakenOut += 1;
      if (this.missions.active && this.missions.active.id === 3) {
        this.missions.active.progress += 1;
        if (this.combat.aliveCount === 0) this.missions.advance();
      }
    }
    // Shooting near a cop draws heat.
    const nearCop = this.police.foot.some((f) => Math.hypot(f.x - this.player.x, f.z - this.player.z) < 40);
    if (nearCop) this.police.addStar(1);
  }

  clockText() {
    const h = Math.floor(this.clockMinutes / 60) % 24;
    const m = Math.floor(this.clockMinutes % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  pauseData() {
    const rank = rankFor(this.player.rp);
    const slots = allSlots().map((s) => slotSummary(s));
    return {
      completePct: completePercent(this.missions, this.career),
      progress: progressRows(this.missions, this.career),
      career: careerRows(this.career),
      rankIndex: rank.index,
      rankName: rank.name,
      rp: this.player.rp.toLocaleString('en-US'),
      rpToNext: (rank.next - this.player.rp).toLocaleString('en-US'),
      nextRank: rank.nextName,
      ratings: ['G', 'S', 'G', 'B', 'S', '-'].slice(0, Math.max(1, this.missions.doneCount)),
      slots,
      story: MISSIONS.map((m) => ({ id: m.id, name: m.name, title: m.title, done: !!this.missions.done[m.id], rating: this.missions.done[m.id] || '' })),
      crew: CREW,
      controls: [
        { keys: 'W A S D', what: 'Move on foot / drive the car' },
        { keys: 'Mouse', what: 'Look around (click to lock the camera)' },
        { keys: 'E', what: 'Steal / enter a car, get out' },
        { keys: 'Click', what: 'Shoot / punch' },
        { keys: '1 – 4', what: 'Fists, pistol, SMG, shotgun' },
        { keys: 'Z / X / C', what: 'Crew abilities: Swap Plates, Quick Fix, Eyes Out' },
        { keys: 'Esc / P', what: 'Pause — map, story, stats, crew, save' },
        { keys: 'F5', what: 'Quick-save to slot 1' },
      ],
    };
  }

  updateMissions(dt) {
    const m = this.missions.active;
    if (!m) return;
    const p = this.player;
    const at = (pt, r) => pt && Math.hypot(p.x - pt.x, p.z - pt.z) < r;
    if (m.id === 1) {
      if (m.stage === 1 && this.police.stars === 0) { this.missions.advance(); this.missionPoint = { x: -40, z: -40, r: 10 }; }
      else if (m.stage === 2 && at(this.missionPoint, 10)) {
        const done = this.missions.advance();
        if (done.completed) { p.money += done.pay; p.rp += done.rp; this.missions.gainStanding('oldtown', 12); this.audio.missionSting(); this.missions.start(2); this.missionPoint = { x: 200, z: -180, r: 8 }; }
      }
    } else if (m.id === 2) {
      if (m.stage === 0 && at(this.missionPoint, 8)) { this.missions.advance(); this.police.addStar(2); this.missionPoint = { x: 240, z: -220, r: 10 }; }
      else if (m.stage === 1 && at(this.missionPoint, 10)) {
        const done = this.missions.advance();
        if (done && done.completed) { p.money += done.pay; p.rp += done.rp; this.missions.gainStanding('marina', 12); this.audio.missionSting(); this.missions.start(3); this.missionPoint = { x: -150, z: 150, r: 10 }; this.combat.spawnEnemy(-146, 128, 'vulture'); this.combat.spawnEnemy(-158, 136, 'vulture'); this.combat.spawnEnemy(-142, 118, 'vulture'); }
      }
    } else if (m.id === 3) {
      if (m.stage === 0 && at(this.missionPoint, 10)) this.missions.advance();
      else if (m.stage === 2 && this.police.stars === 0) {
        const done = this.missions.advance();
        if (done.completed) { p.money += done.pay; p.rp += done.rp; this.missions.gainStanding('sunset', 14); this.audio.missionSting(); this.missions.start(4); this.racePoints = [{ x: -200, z: -200 }, { x: 200, z: -200 }, { x: 200, z: 200 }]; this.raceIndex = 0; this.missionPoint = this.racePoints[0]; }
      }
    } else if (m.id === 4) {
      if (m.stage === 0 && at(this.missionPoint, 12)) { this.missions.advance(); this.raceIndex = 0; this.missionPoint = this.racePoints[0]; }
      else if (m.stage >= 1 && this.raceIndex < 3 && at(this.racePoints[this.raceIndex], 12)) {
        this.raceIndex += 1;
        if (this.raceIndex >= 3) {
          const done = this.missions.advance();
          if (done && done.completed) { p.money += done.pay; p.rp += done.rp; this.career.racesWon += 1; this.audio.missionSting(); this.missions.start(5); this.missionPoint = { x: 220, z: 220, r: 10 }; }
        } else {
          this.missionPoint = this.racePoints[this.raceIndex];
        }
      }
    } else if (m.id === 5) {
      if (m.stage === 0 && at(this.missionPoint, 10)) {
        this.missions.advance();
        this.hideTimer = 3;
        this.missionPoint = { x: -40, z: -40, r: 12 };
      } else if (m.stage === 1) {
        this.hideTimer -= dt;
        if (this.hideTimer <= 0) this.missions.advance();
      } else if (m.stage === 2 && at(this.missionPoint, 12)) {
        const done = this.missions.advance();
        if (done.completed) { p.money += done.pay; p.rp += done.rp; this.missions.gainStanding('portside', 14); this.audio.missionSting(); this.missions.start(6); this.missionPoint = { x: 280, z: -120, r: 14 }; }
      }
    } else if (m.id === 6) {
      if (m.stage === 0 && at(this.missionPoint, 14)) {
        this.missions.advance();
        if (!this.missionTarget) this.missionTarget = this.spawnTargetCar('HARBOR VAN', 280, -60, Math.PI, 0x8a6b4f);
      } else if (m.stage === 1 && this.missionTarget) {
        if (this.missionTarget.damage >= 100) { this.missions.advance(); this.missionPoint = { x: -40, z: -40, r: 12 }; }
      } else if (m.stage === 2 && at(this.missionPoint, 12) && this.police.stars === 0) {
        const done = this.missions.advance();
        if (done.completed) { p.money += done.pay; p.rp += done.rp; this.missions.gainStanding('marina', 16); this.audio.missionSting(); this.missions.say('Mara', 'That is the whole island, Rio. Kingpin of Puerto Azura.', 8); }
      }
    }
  }

  update(dt) {
    const now = performance.now() / 1000;
    const k = this.keys;
    this.playSeconds += dt;
    this.clockMinutes += dt / 60;
    const tod = this.clockMinutes % 1440 < 360 || this.clockMinutes % 1440 >= 1140 ? 'night' : this.clockMinutes % 1440 >= 1020 ? 'sunset' : 'day';
    if (tod !== this.timeOfDay) { this.timeOfDay = tod; this.world.setTimeOfDay(tod); }
    // Cooldowns
    for (const id of Object.keys(this.crewCooldown)) {
      if (this.crewCooldown[id] > 0) this.crewCooldown[id] -= dt;
    }
    // Player movement
    const forward = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
    const strafe = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    if (this.player.onFoot) {
      const run = k.ShiftLeft ? 1.6 : 1;
      const yaw = this.cameraYaw;
      const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * run;
      const dz = (Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * run;
      this.walkPhase += dt * 8 * (Math.abs(dx) + Math.abs(dz) > 0 ? 1 : 0);
      this.player.move(dx, dz, dt, this.world, this.walkPhase);
      if (this.player.health <= 0) return this.gameOver('WASTED', 'Rio went down in Puerto Azura.');
    } else if (this.car) {
      const steer = (k.KeyA ? 1 : 0) - (k.KeyD ? 1 : 0);
      this.car.drive(forward, steer, dt);
      const pos = this.world.collide(this.car.x, this.car.z, 1.8);
      if (pos.x !== this.car.x || pos.z !== this.car.z) {
        if (Math.abs(this.car.speed) > 8) {
          this.car.damageBy(6);
          this.audio.crash();
        }
        this.car.x = pos.x;
        this.car.z = pos.z;
        this.car.speed *= 0.4;
      }
      this.player.x = this.car.x;
      this.player.z = this.car.z;
      this.career.distanceKm += Math.abs(this.car.speed) * dt / 1000;
      // Ram traffic cars and the convoy target.
      for (const t of this.traffic.cars) {
        if (t.dead) continue;
        const d = Math.hypot(t.x - this.car.x, t.z - this.car.z);
        if (d < 3.2 && Math.abs(this.car.speed) > 6) {
          t.damageBy(60);
          this.car.damageBy(4);
          this.audio.crash();
          if (t.damage >= 100) t.destroy();
        }
      }
      if (this.missionTarget && !this.missionTarget.dead) {
        const d = Math.hypot(this.missionTarget.x - this.car.x, this.missionTarget.z - this.car.z);
        if (d < 3.4 && Math.abs(this.car.speed) > 5) {
          this.missionTarget.damageBy(18);
          this.car.damageBy(5);
          this.audio.crash();
          if (this.missionTarget.damage >= 100) {
            this.missionTarget.destroy();
            this.missionTarget.dead = true;
          }
        }
      }
      if (this.car.damage >= 100) {
        this.car.destroy();
        this.car = null;
        this.player.onFoot = true;
        this.player.mesh.visible = true;
        this.player.hurt(20);
      }
    }
    // Busted: a foot cop touches Rio while wanted.
    if (this.player.onFoot && this.police.stars > 0) {
      for (const f of this.police.foot) {
        if (Math.hypot(f.x - this.player.x, f.z - this.player.z) < 1.8) {
          return this.gameOver('BUSTED', 'The AZPD took Rio in.');
        }
      }
    }
    if (this.player.health <= 0) return this.gameOver('WASTED', 'Rio went down in Puerto Azura.');
    this.traffic.update(dt, now);
    this.police.update(dt, this.player.x, this.player.z, this.car ? this.car.speed : 0);
    this.combat.update(dt, now, this.player);
    this.missions.update(now);
    this.updateMissions(dt);
    this.career.highestWanted = Math.max(this.career.highestWanted, this.police.stars);
    this.audio.setEngine(this.car ? Math.abs(this.car.speed) / this.car.model.top : 0, !!this.car);
    this.audio.setSiren(this.police.stars > 0, dt);
    // Camera
    this.updateCamera(dt);
    // HUD + minimap
    this.hud.update(this.hudState());
    this.minimap.draw(this.minimapState());
  }

  updateCamera(dt) {
    if (this.cameraPose) {
      this.camera.position.set(this.cameraPose.pos[0], this.cameraPose.pos[1], this.cameraPose.pos[2]);
      this.camera.lookAt(this.cameraPose.look[0], this.cameraPose.look[1], this.cameraPose.look[2]);
      return;
    }
    const target = this.player.onFoot
      ? { x: this.player.x, z: this.player.z, y: 1.6 }
      : { x: this.car.x, z: this.car.z, y: 1.4 };
    const yaw = this.player.onFoot ? this.cameraYaw : this.car.heading + this.cameraYaw * 0.4;
    const dist = this.player.onFoot ? 6.5 : 10.5;
    const height = 2.6 + Math.sin(this.cameraPitch) * dist * 0.5;
    const cx = target.x - Math.sin(yaw) * dist * Math.cos(this.cameraPitch);
    const cz = target.z - Math.cos(yaw) * dist * Math.cos(this.cameraPitch);
    this.camera.position.set(cx, height, cz);
    this.camera.lookAt(target.x, target.y, target.z);
  }

  hudState() {
    const rank = rankFor(this.player.rp);
    const district = this.world.districtAt(this.player.x, this.player.z);
    const m = this.missions.active;
    const near = this.player.onFoot ? this.nearestParked() : null;
    return {
      money: this.player.money,
      clock: this.clockText(),
      stars: this.police.stars,
      policeUnits: this.police.listUnits(this.player.x, this.player.z),
      chatter: this.police.chatter,
      rankIndex: rank.index,
      rankName: rank.name,
      rp: this.player.rp,
      rpBase: rank.base,
      rpNext: rank.next,
      mission: m ? { id: m.id, name: m.def.name, stage: m.stage, stages: 3, objective: this.missions.stageText(), next: this.missions.nextText() } : null,
      weapons: WEAPONS.map((w, i) => ({ name: w.name, mag: this.player.ammo[i], reserve: this.player.reserve[i] })),
      weaponIndex: this.player.weaponIndex,
      crew: CREW.map((c) => ({ ...c, ready: this.crewCooldown[c.id] <= 0 })),
      district,
      standingLabel: this.missions.standingLabel(district.id),
      standingValue: this.missions.standing[district.id].value,
      health: this.player.health,
      armour: this.player.armour,
      inCar: !this.player.onFoot,
      speedKmh: this.car ? this.car.speedKmh : 0,
      carName: this.car ? this.car.model.name : '',
      carDamage: this.car ? this.car.damage : 0,
      radio: { station: RADIO[this.radioIndex].name, show: RADIO[this.radioIndex].show },
      dialogue: this.missions.dialogue,
      hint: this.player.onFoot
        ? (near ? 'Press E to steal the ' + near.model.name : 'WASD move · E steal a car · Click shoot · Esc pause')
        : 'WASD drive · E get out · Z/X/C crew · Esc pause',
      showCrosshair: this.player.onFoot && this.player.weapon.id !== 'fists',
    };
  }

  minimapState() {
    return {
      player: { x: this.player.x, z: this.player.z, heading: this.player.onFoot ? this.player.heading : (this.car ? this.car.heading : 0) },
      police: [
        ...this.police.cars.filter((c) => !c.dead).map((c) => ({ x: c.x, z: c.z, heli: false })),
        ...(this.police.heli ? [{ x: this.police.heli.position.x, z: this.police.heli.position.z, heli: true }] : []),
      ],
      traffic: this.traffic.cars.filter((c) => !c.dead).slice(0, 14).map((c) => ({ x: c.x, z: c.z })),
      mission: this.missionPoint ? { x: this.missionPoint.x, z: this.missionPoint.z } : null,
    };
  }

  gameOver(title, sub) {
    this.state = 'over';
    this.hud.el.wastedTitle.textContent = title;
    this.hud.el.wastedSub.textContent = sub + ' Press R to get back up.';
    this.hud.showScreen('over');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  loop() {
    const step = () => {
      requestAnimationFrame(step);
      const now = performance.now();
      let dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (this.frozen) {
        this.world.update(dt, now / 1000);
        if (this.police.heliRotor) this.police.heliRotor.rotation.y += dt * 22;
        this.updateCamera(dt);
        this.hud.update(this.hudState());
        this.minimap.draw(this.minimapState());
        this.renderer.render(this.scene, this.camera);
        return;
      }
      if (this.state === 'play') this.update(dt);
      else if (this.state === 'title' || this.state === 'pause') {
        this.world.update(dt, now / 1000);
        this.updateCamera(dt);
      }
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(step);
  }
}

window.__game = new Game();
