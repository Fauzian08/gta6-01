// Isla Azura — the screenshot scenes behind ?shot=chase|combat|stats|start.
// Each one poses the real game at a fixed moment — real systems, real HUD,
// real 3D city — with the seed fixed, so the same URL always gives the same
// frame. The game freezes gameplay after posing; only the sea, the palms and
// the helicopter rotor keep moving, so the frame stays alive but identical.
import { CITY, DISTRICTS } from './config.js';
import { saveSlot } from './save.js';

export function stageShot(name, game) {
  const g = game;
  if (name === 'combat') return stageCombat(g);
  if (name === 'stats') return stageStats(g);
  if (name === 'start') return stageStart(g);
  return stageChase(g);
}

function basePose(g) {
  g.state = 'play';
  g.frozen = true;
  g.timeScale = 0;
}

function stageChase(g) {
  basePose(g);
  g.world.setTimeOfDay('sunset');
  g.clockMinutes = 16 * 60;
  g.player.money = 12650;
  g.player.rp = 5200;
  g.player.health = 72;
  g.player.armour = 55;
  g.player.onFoot = false;
  // Rio in the orange Veloce GT, north up the beach avenue at 111 km/h.
  // The avenue is the street at x=240: beach and sea to the east, city west.
  // The car runs angled across its lane, so the chase camera sees its rear
  // and the west flank the setting sun lights — the orange paint reads
  // bright instead of sinking into shadow.
  const car = g.enterCar('VELOCE GT', 240, 60, Math.PI + 0.5);
  car.speed = 31;
  car.damage = 62;
  g.car = car;
  // The convoy car ahead, the mission target — close enough to read, and
  // painted a hard red so it stands out from the traffic as the van to wreck.
  const convoy = g.spawnTargetCar('HARBOR VAN', 239, 25, Math.PI, 0xb03a2e);
  convoy.speed = 24;
  g.missionTarget = convoy;
  // AZPD on his tail: three interceptors flanking the car and the air unit.
  g.police.setStars(4);
  g.police.clearAll();
  const p1 = g.police.spawnCarNear(240, 78);
  p1.x = 233; p1.z = 50; p1.heading = Math.PI + 0.15; p1.speed = 29;
  p1.mesh.position.set(p1.x, 0, p1.z);
  p1.mesh.rotation.y = p1.heading;
  const p2 = g.police.spawnCarNear(240, 78);
  p2.x = 247; p2.z = 46; p2.heading = Math.PI - 0.15; p2.speed = 27;
  p2.mesh.position.set(p2.x, 0, p2.z);
  p2.mesh.rotation.y = p2.heading;
  const p3 = g.police.spawnCarNear(240, 78);
  p3.x = 237; p3.z = 28; p3.heading = Math.PI; p3.speed = 25;
  p3.mesh.position.set(p3.x, 0, p3.z);
  p3.mesh.rotation.y = p3.heading;
  const heli = g.police.spawnHeli(258, -35);
  heli.position.y = 36;
  // Traffic ahead on the same avenue, beachgoers on the sand.
  g.traffic.clear();
  const roadCars = [[236, -8, 10], [244, -28, 8], [238, -58, 12], [246, -18, 9]];
  for (const [tx, tz, ts] of roadCars) {
    const tc = g.traffic.addCar();
    tc.x = tx; tc.z = tz; tc.heading = Math.PI; tc.speed = ts;
    tc.mesh.position.set(tx, 0, tz);
    tc.mesh.rotation.y = Math.PI;
  }
  for (let i = 0; i < 9; i += 1) g.traffic.addPed();
  const beachPeds = [[306, -18], [312, 6], [300, 28], [316, -38], [292, 28], [300, -8], [288, 52]];
  const walkPeds = [[229, 28], [229, 52]];
  g.traffic.peds.forEach((ped, i) => {
    const spot = i < beachPeds.length ? beachPeds[i] : walkPeds[i - beachPeds.length];
    if (spot) {
      ped.x = spot[0];
      ped.z = spot[1];
      ped.mesh.position.set(ped.x, 0, ped.z);
    }
  });
  g.missions.start(6);
  g.missions.active.stage = 1;
  g.missions.say('Mara', "Salazar's convoy is making for the pier! Ram it before it reaches the water!", 999);
  // Chase camera tight behind the car, off the west edge of the avenue:
  // the Veloce fills the lower centre, the convoy and the interceptors
  // stay in frame up the road, the beach and palms on the right.
  g.cameraPose = { pos: [237, 3.6, 72], look: [240, 1.2, 28] };
  g.hud.showScreen('play');
  return { screen: 'play' };
}

function stageCombat(g) {
  basePose(g);
  g.world.setTimeOfDay('night');
  g.clockMinutes = 19 * 60 + 31;
  g.player.money = 7270;
  g.player.rp = 1875;
  g.player.health = 95;
  g.player.armour = 27;
  g.player.onFoot = true;
  // Rio on foot at the night-market intersection (streets x=-160, z=160),
  // facing north up the market street.
  g.player.x = -160;
  g.player.z = 160;
  g.player.heading = Math.PI;
  g.player.mesh.position.set(g.player.x, 0, g.player.z);
  g.player.mesh.rotation.y = g.player.heading;
  g.player.selectWeapon(1);
  g.player.ammo[1] = 8;
  g.player.reserve[1] = 48;
  g.car = null;
  g.police.setStars(2);
  g.police.clearAll();
  g.police.spawnFootCop(-148, 152);
  // The patrol car is ahead in the aisle, not behind the camera.
  const pc = g.police.spawnCarNear(-160, 160);
  pc.x = -150; pc.z = 138; pc.heading = Math.PI + 0.3;
  pc.mesh.position.set(pc.x, 0, pc.z);
  pc.mesh.rotation.y = pc.heading;
  g.combat.clear();
  // Both live enemies close down the aisle, in the line of fire.
  const e1 = g.combat.spawnEnemy(-157, 152, 'vulture');
  const e2 = g.combat.spawnEnemy(-162, 147, 'vulture');
  // The one already down, lying open in the aisle where the tracer points.
  const e3 = g.combat.spawnEnemy(-159, 149, 'vulture');
  e3.dead = true;
  e3.mesh.rotation.x = -Math.PI / 2;
  e3.mesh.position.y = 0.35;
  // A tracer from Rio's pistol toward the aisle.
  g.combat.addTracer(
    { x: g.player.x, y: 1.4, z: g.player.z },
    { x: -157, y: 1.2, z: 152 },
  );
  g.traffic.clear();
  for (let i = 0; i < 8; i += 1) g.traffic.addPed();
  // Market-goers crowded into the aisle the camera sees, clear of the stalls.
  const marketPeds = [[-168, 146], [-152, 136], [-166, 152], [-154, 158], [-170, 138], [-150, 150], [-164, 142], [-156, 156]];
  g.traffic.peds.forEach((ped, i) => {
    if (i < marketPeds.length) {
      ped.x = marketPeds[i][0];
      ped.z = marketPeds[i][1];
      ped.mesh.position.set(ped.x, 0, ped.z);
    }
  });
  g.missions.start(3);
  g.missions.active.stage = 1;
  g.missions.say('Nia', 'Two down the left aisle! I have got the stall side, Rio.', 999);
  g.missions.gainStanding('sunset', 16);
  // Close over-shoulder camera: Rio big in the lower centre-left, the
  // aisle, the enemies and the tracer ahead, the crosshair on the fight.
  g.cameraPose = { pos: [-158, 2.0, 166], look: [-161, 1.25, 146] };
  g.hud.showScreen('play');
  return { screen: 'play' };
}

function stageStats(g) {
  basePose(g);
  g.world.setTimeOfDay('day');
  g.clockMinutes = 15 * 60 + 11;
  g.player.money = 18450;
  g.player.rp = 5200;
  g.career.carsStolen = 41;
  g.career.copsEscaped = 12;
  g.career.distanceKm = 48.2;
  g.career.peopleTakenOut = 23;
  g.career.longestJumpM = 47;
  g.career.hiddenByLocals = 9;
  g.career.racesWon = 1;
  g.career.stunts = 5;
  g.missions.done = { 1: 'G', 2: 'S', 3: 'G', 4: 'B', 5: 'S' };
  g.missions.ratings = ['G', 'S', 'G', 'B', 'S'];
  g.missions.gainStanding('sunset', 20);
  g.missions.gainStanding('marina', 14);
  g.missions.gainStanding('portside', 12);
  // Seed the save slots so the pause screen shows real save data.
  saveSlot(1, { completePct: 32.8, district: 'Sunset Strip', missionsDone: 3, money: 12650, clock: '18:23', savedAt: '19 Nov 18:23' });
  saveSlot(2, { completePct: 16.8, district: 'Old Town', missionsDone: 1, money: 2340, clock: '09:30', savedAt: '18 Nov 09:30' });
  g.state = 'pause';
  g.hud.showScreen('pause');
  g.hud.renderPause('STATS', g.pauseData());
  drawPauseMap(g);
  return { screen: 'pause' };
}

function stageStart(g) {
  basePose(g);
  g.world.setTimeOfDay('sunset');
  g.clockMinutes = 18 * 60 + 23;
  g.state = 'title';
  g.cameraPose = { pos: [330, 42, 190], look: [60, 18, -40] };
  g.hud.showScreen('title');
  g.hud.setTitleSlots([
    { label: 'ACT II — MARKET SQUEEZE', detail: '32.8% complete · 3/6 missions · Sunset Strip · $12,650 · 18:23' },
    { label: 'ACT I — GOLD PAINT', detail: '16.8% complete · 1/6 missions · Old Town · $2,340 · 09:30' },
    null,
  ]);
  return { screen: 'title' };
}

// Draw the full-city pause map into #pauseMap, with district labels and the
// player's route, the same streets the minimap shows, at pause size.
export function drawPauseMap(g) {
  const canvas = document.getElementById('pauseMap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#20262e';
  ctx.fillRect(0, 0, W, H);
  const s = Math.min(W, H) / (CITY.half * 2 + 60);
  const ox = (W - (CITY.half * 2) * s) / 2;
  const oy = (H - (CITY.half * 2) * s) / 2;
  const toMap = (x, z) => ({ x: ox + (x + CITY.half) * s, y: oy + (z + CITY.half) * s });
  // Sea + sand
  ctx.fillStyle = '#274b5e';
  ctx.fillRect(toMap(CITY.half, -CITY.half).x, 0, W, H);
  ctx.fillStyle = '#c9b183';
  const b = toMap(CITY.half - 30, 0);
  ctx.fillRect(b.x, 0, W - b.x, H);
  // Blocks
  ctx.fillStyle = '#3a3f47';
  const tl = toMap(-CITY.half, -CITY.half);
  const br = toMap(CITY.half, CITY.half);
  ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  for (const d of DISTRICTS) {
    const p = toMap(d.x, d.z);
    ctx.fillStyle = d.color + '55';
    ctx.fillRect(p.x - 70 * s, p.y - 45 * s, 140 * s, 90 * s);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.max(11, 13 * s * 2) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.name.toUpperCase(), p.x, p.y - 4);
    ctx.font = Math.max(9, 10 * s * 2) + 'px sans-serif';
    ctx.fillStyle = '#ffd233';
    ctx.fillText(g.missions.standingLabel(d.id), p.x, p.y + 14);
  }
  // Streets
  ctx.strokeStyle = '#20242b';
  ctx.lineWidth = 2;
  for (let i = 0; i <= CITY.blocks; i += 1) {
    const a = toMap(-CITY.half + i * CITY.block, -CITY.half);
    const bb = toMap(-CITY.half + i * CITY.block, CITY.half);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
    const c = toMap(-CITY.half, -CITY.half + i * CITY.block);
    const d = toMap(CITY.half, -CITY.half + i * CITY.block);
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
  }
  // Route line
  ctx.strokeStyle = '#c07df0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const route = [[-240, 200], [-160, 120], [-40, 40], [80, -20], [180, -80], [280, -40]];
  route.forEach(([x, z], i) => {
    const p = toMap(x, z);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  // Player marker
  const pp = toMap(g.player.x, g.player.z);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c8fd9';
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Street race: Terrace Climb · 0.79 km', 12, H - 12);
}
