// Isla Azura — saves and career stats. Three localStorage slots hold the
// campaign: money, RP, missions done with ratings, cars stolen, cops escaped,
// distance driven and the clock. Progress percent is missions plus side work.
import { MISSIONS, RANKS, DISTRICTS } from './config.js';

const KEY = 'isla-azura-save-';

export class Career {
  constructor() {
    this.carsStolen = 0;
    this.copsEscaped = 0;
    this.distanceKm = 0;
    this.peopleTakenOut = 0;
    this.longestJumpM = 0;
    this.racesWon = 0;
    this.stunts = 0;
    this.hiddenByLocals = 0;
    this.highestWanted = 0;
    this.playMinutes = 0;
  }

  get completePct() {
    return 0;
  }
}

export function loadSlot(n) {
  try {
    const raw = localStorage.getItem(KEY + n);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function saveSlot(n, data) {
  try {
    localStorage.setItem(KEY + n, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function allSlots() {
  return [1, 2, 3].map((n) => loadSlot(n));
}

export function slotSummary(slot, fallbackLabel) {
  if (!slot) return null;
  return {
    label: (slot.completePct || 0) + '% · ' + (slot.district || 'Puerto Azura'),
    detail: (slot.missionsDone || 0) + '/6 missions · $' + (slot.money || 0).toLocaleString('en-US') + ' · ' + (slot.clock || '12:00'),
    time: slot.savedAt || '',
  };
}

export function progressRows(missions, career) {
  const done = Object.keys(missions.done).length;
  return [
    { label: 'Story missions', pct: (done / 6) * 100, text: done + '/6' },
    { label: 'Street races won', pct: (career.racesWon / 4) * 100, text: career.racesWon + '/4' },
    { label: 'Stunt jumps', pct: (career.stunts / 8) * 100, text: career.stunts + '/8' },
    { label: 'District jobs', pct: (done / 6) * 100, text: done + '/6' },
    { label: 'Districts FRIENDLY', pct: (DISTRICTS.filter((d) => (missions.standing[d.id] || {}).value >= 70).length / 5) * 100, text: DISTRICTS.filter((d) => (missions.standing[d.id] || {}).value >= 70).length + '/5' },
    { label: 'Crew recruited', pct: 100, text: '3/3' },
    { label: 'Gold mission ratings', pct: (missions.ratings.filter((r) => r === 'G').length / 6) * 100, text: missions.ratings.filter((r) => r === 'G').length + '/6' },
  ];
}

export function careerRows(career) {
  return [
    { value: career.carsStolen, label: 'CARS STOLEN' },
    { value: career.copsEscaped, label: 'COPS ESCAPED' },
    { value: career.distanceKm.toFixed(1) + ' km', label: 'DISTANCE DRIVEN' },
    { value: career.peopleTakenOut, label: 'PEOPLE TAKEN OUT' },
    { value: career.longestJumpM + ' m', label: 'LONGEST JUMP' },
    { value: career.hiddenByLocals, label: 'HIDDEN BY LOCALS' },
  ];
}

export function rankFor(rp) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i += 1) if (rp >= RANKS[i].rp) idx = i;
  const cur = RANKS[idx];
  const next = RANKS[Math.min(idx + 1, RANKS.length - 1)];
  return { index: idx + 1, name: cur.name, base: cur.rp, next: next.rp, nextName: next.name };
}

export function completePercent(missions, career) {
  const done = Object.keys(missions.done).length;
  return Math.round((done / 6) * 70 + Math.min(30, career.racesWon * 3 + career.stunts * 2 + career.hiddenByLocals));
}
