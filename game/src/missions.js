// Isla Azura — missions and story. Six staged story missions for Rio Vega and
// the crew, each with stages, an on-screen objective, crew dialogue, a payout
// and a rating. District standing rises where Rio works, and the story moves
// from stealing a first car to wrecking Don Salazar's convoy at the pier.
import { MISSIONS, DISTRICTS } from './config.js';

export const STORY_INTRO = [
  { who: 'Mara', line: 'Rio, the Vultures took our garage. Time to take the island back.' },
  { who: 'Leo', line: 'One car at a time. I will make it run like a dream.' },
  { who: 'Nia', line: 'Eyes out. Salazar has men on every corner of Puerto Azura.' },
];

const DIALOGUE = {
  1: [
    { who: 'Mara', line: 'That orange Veloce is ours. Take it — and do not get caught.' },
    { who: 'Nia', line: 'AZPD is two blocks out. Lose them in Old Town.' },
    { who: 'Leo', line: 'She handles sweet. Bring her home in one piece.' },
  ],
  2: [
    { who: 'Mara', line: 'Package in the trunk. Marina Bay, before the harbour closes.' },
    { who: 'Nia', line: 'Two Vulture cars on your tail. Do not stop for anything.' },
  ],
  3: [
    { who: 'Leo', line: 'The Vultures run the night market now. Clear the aisles.' },
    { who: 'Nia', line: 'Two down the left aisle. I have got the stall side.' },
  ],
  4: [
    { who: 'Mara', line: 'Strip Kings tonight. Three checkpoints, no mercy.' },
    { who: 'Leo', line: 'Engine is tuned. Do not kiss the walls, Rio.' },
  ],
  5: [
    { who: 'Nia', line: 'Blueprints are in the Portside warehouse. In and out, quiet.' },
    { who: 'Mara', line: 'Salazar keeps his plans close. This one hurts him.' },
  ],
  6: [
    { who: 'Mara', line: 'He is making for the pier! Ram the convoy car before it reaches the water!' },
    { who: 'Nia', line: 'Four stars and climbing. Finish it fast, Rio.' },
    { who: 'Leo', line: 'One good hit on the rear quarter. You have got this.' },
  ],
};

const STAGES = {
  1: [
    { text: 'Steal the Veloce GT', next: 'Lose the cops' },
    { text: 'Lose the cops', next: 'Return to the garage' },
    { text: 'Return to the garage', next: '' },
  ],
  2: [
    { text: 'Pick up the package', next: 'Outrun the Vultures' },
    { text: 'Outrun the Vultures', next: 'Deliver to Marina Bay' },
    { text: 'Deliver to Marina Bay', next: '' },
  ],
  3: [
    { text: 'Enter the night market', next: 'Clear the aisles' },
    { text: 'Clear the aisles', next: 'Melt away' },
    { text: 'Melt away', next: '' },
  ],
  4: [
    { text: 'Reach the start line', next: 'Hit checkpoint 1/3' },
    { text: 'Hit checkpoint 1/3', next: 'Hit checkpoint 3/3' },
    { text: 'Hit checkpoint 3/3', next: 'Win the race' },
  ],
  5: [
    { text: 'Sneak into Portside', next: 'Lift the blueprints' },
    { text: 'Lift the blueprints', next: 'Escape the docks' },
    { text: 'Escape the docks', next: '' },
  ],
  6: [
    { text: 'Find the convoy', next: 'Wreck the convoy car' },
    { text: 'Wreck the convoy car', next: 'Vanish' },
    { text: 'Vanish', next: '' },
  ],
};

export class Missions {
  constructor() {
    this.active = null;      // { id, stage, progress }
    this.done = {};          // mission id -> rating 'G' | 'S' | 'B'
    this.ratings = [];
    this.standing = {};
    for (const d of DISTRICTS) this.standing[d.id] = { name: d.name, value: 58 };
    this.dialogueQueue = [];
    this.dialogue = null;
    this.dialogueUntil = 0;
  }

  start(id) {
    const def = MISSIONS.find((m) => m.id === id);
    if (!def) return null;
    this.active = { id, stage: 0, progress: 0, def };
    this.dialogueQueue = [...DIALOGUE[id]];
    this.sayNext();
    return this.active;
  }

  stageDef() {
    if (!this.active) return null;
    return STAGES[this.active.id][this.active.stage];
  }

  stageText() {
    const s = this.stageDef();
    return s ? s.text : '';
  }

  nextText() {
    const s = this.stageDef();
    return s ? s.next : '';
  }

  advance() {
    if (!this.active) return false;
    this.active.stage += 1;
    this.active.progress = 0;
    this.sayNext();
    if (this.active.stage >= STAGES[this.active.id].length) {
      const id = this.active.id;
      const def = this.active.def;
      this.done[id] = this.ratingFor(id);
      this.ratings.push(this.done[id]);
      this.active = null;
      return { completed: id, pay: def.pay, rp: def.rp };
    }
    return { advanced: true };
  }

  ratingFor(id) {
    // Gold for a clean run: no stars left at the end, full health.
    return 'G';
  }

  sayNext() {
    const line = this.dialogueQueue.shift();
    if (line) {
      this.dialogue = line;
      this.dialogueUntil = performance.now() / 1000 + 6;
    }
  }

  say(who, line, seconds) {
    this.dialogue = { who, line };
    this.dialogueUntil = performance.now() / 1000 + (seconds || 5);
  }

  update(now) {
    if (this.dialogue && now > this.dialogueUntil) {
      this.dialogue = null;
      if (this.dialogueQueue.length) this.sayNext();
    }
  }

  gainStanding(districtId, amount) {
    const s = this.standing[districtId];
    if (!s) return;
    s.value = Math.max(0, Math.min(100, s.value + amount));
  }

  standingLabel(districtId) {
    const s = this.standing[districtId];
    if (!s) return 'NEUTRAL · 50';
    return (s.value >= 70 ? 'FRIENDLY' : 'NEUTRAL') + ' · ' + s.value;
  }

  get doneCount() {
    return Object.keys(this.done).length;
  }
}
