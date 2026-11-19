// Seeded random numbers for Isla Azura. One seed drives the whole city, so the
// same seed always builds the same streets, buildings and traffic — screenshots
// stay reproducible, and a fresh seed still gives a fresh city.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function chance(rng, p) {
  return rng() < p;
}
