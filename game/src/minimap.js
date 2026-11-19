// Isla Azura — the minimap. A small canvas in the HUD corner, drawn top-down:
// streets, district tints, the player arrow, police blips, traffic dots and
// the mission marker. North is up, and the map never scrolls — the whole city
// fits, so the player always knows where the island ends.
import { CITY, DISTRICTS } from './config.js';

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width;
  }

  toMap(x, z) {
    const s = this.size / (CITY.half * 2 + 80);
    return { x: (x + CITY.half + 40) * s, y: (z + CITY.half + 40) * s };
  }

  draw(state) {
    const ctx = this.ctx;
    const s = this.size;
    ctx.clearRect(0, 0, s, s);
    // Sea and sand on the east edge
    ctx.fillStyle = '#274b5e';
    ctx.fillRect(0, 0, s, s);
    const beach = this.toMap(CITY.half - 30, 0);
    ctx.fillStyle = '#c9b183';
    ctx.fillRect(beach.x, 0, s - beach.x, s);
    // City ground
    ctx.fillStyle = '#3a3f47';
    const tl = this.toMap(-CITY.half, -CITY.half);
    const br = this.toMap(CITY.half, CITY.half);
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    // District tints
    for (const d of DISTRICTS) {
      const p = this.toMap(d.x, d.z);
      ctx.fillStyle = d.color + '44';
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    // Streets
    ctx.strokeStyle = '#20242b';
    ctx.lineWidth = 2;
    const cell = CITY.block;
    for (let i = 0; i <= CITY.blocks; i += 1) {
      const a = this.toMap(-CITY.half + i * cell, -CITY.half);
      const b = this.toMap(-CITY.half + i * cell, CITY.half);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const c = this.toMap(-CITY.half, -CITY.half + i * cell);
      const d = this.toMap(CITY.half, -CITY.half + i * cell);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    }
    // Mission marker
    if (state.mission) {
      const p = this.toMap(state.mission.x, state.mission.z);
      ctx.fillStyle = '#ffd233';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1c1f26';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#1c1f26';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', p.x, p.y + 3);
    }
    // Traffic dots
    ctx.fillStyle = '#cfd6de';
    for (const t of state.traffic || []) {
      const p = this.toMap(t.x, t.z);
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    // Police blips
    for (const u of state.police || []) {
      const p = this.toMap(u.x, u.z);
      ctx.fillStyle = u.heli ? '#ff5a5a' : '#ff2e4d';
      ctx.beginPath();
      ctx.arc(p.x, p.y, u.heli ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Player arrow
    const p = this.toMap(state.player.x, state.player.z);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(state.player.heading || 0);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1c8fd9';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    // North marker
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('N', 6, 14);
  }
}
