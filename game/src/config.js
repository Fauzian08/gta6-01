// Isla Azura — shared constants for the open world of Puerto Azura.
// Everything the systems agree on lives here: city size, districts, ranks,
// wanted rules, crew, weapons and the radio stations.
export const CITY = {
  half: 320,          // city spans -320..320 metres on x and z
  block: 80,          // one city block, metres (span / blocks — matches the ground texture)
  street: 16,         // street width, metres
  blocks: 8,          // blocks per side
};

export const DISTRICTS = [
  { id: 'marina',   name: 'Marina Bay',    sub: 'Yachts and the boardwalk',   x: 160, z: -160, color: '#2fb7a5' },
  { id: 'oldtown',  name: 'Old Town',      sub: 'Plaza and the cathedral',    x: -160, z: -160, color: '#d9a441' },
  { id: 'sunset',   name: 'Sunset Strip',  sub: 'Neon, markets and bars',     x: -160, z: 160,  color: '#e2547a' },
  { id: 'portside', name: 'Portside',      sub: 'Docks and warehouses',       x: 160, z: 160,   color: '#5b8fd9' },
  { id: 'hills',    name: 'The Hills',     sub: 'Villas above the city',      x: -288, z: 0,    color: '#7fb069' },
];

export const RANKS = [
  { name: 'ROOKIE',  rp: 0 },
  { name: 'DRIVER',  rp: 1500 },
  { name: 'FIXER',   rp: 4000 },
  { name: 'SHOT CALLER', rp: 9000 },
  { name: 'KINGPIN', rp: 18000 },
];

export const CREW = [
  { id: 'mara', name: 'Mara', role: 'Driver',   key: 'Z', ability: 'SWAP PLATES', desc: 'Lose one wanted star instantly' },
  { id: 'leo',  name: 'Leo',  role: 'Mechanic', key: 'X', ability: 'QUICK FIX',   desc: 'Repair the car to full' },
  { id: 'nia',  name: 'Nia',  role: 'Lookout',  key: 'C', ability: 'EYES OUT',    desc: 'Mark every cop on the map' },
];

export const WEAPONS = [
  { id: 'fists',  name: 'FISTS', slot: 1, damage: 12, rate: 0.35, range: 2.2, mag: Infinity, reserve: Infinity },
  { id: 'pistol', name: '.38',   slot: 2, damage: 34, rate: 0.28, range: 55,  mag: 12, reserve: 60 },
  { id: 'smg',    name: 'SMG',   slot: 3, damage: 18, rate: 0.09, range: 42,  mag: 30, reserve: 90 },
  { id: 'shotgun',name: '12G',   slot: 4, damage: 22, rate: 0.7,  range: 26,  mag: 6,  reserve: 18 },
];

export const CAR_MODELS = [
  { name: 'VELOCE GT',   color: 0xe8590c, top: 52, accel: 26 },
  { name: 'AZURA SEDAN', color: 0x2f6fb7, top: 38, accel: 18 },
  { name: 'PALMA TAXI',  color: 0xf2c230, top: 36, accel: 16 },
  { name: 'CORAL COUPE', color: 0xd94f70, top: 46, accel: 22 },
  { name: 'HARBOR VAN',  color: 0x7d8a99, top: 32, accel: 13 },
  { name: 'DUST PICKUP', color: 0x8a6b4f, top: 40, accel: 17 },
];

export const RADIO = [
  { name: 'AZURA 98.4', show: 'Island Pop' },
  { name: 'SOL 101.2',  show: 'Sunset Reggaeton' },
  { name: 'MAR 88.1',   show: 'Harbor Talk' },
];

export const WANTED = {
  maxStars: 5,
  decaySeconds: 14,     // seconds hidden before a star drops
  heliStars: 4,          // helicopter joins at this many stars
  copCarsPerStar: 1,     // extra patrol cars per star
};

export const MISSIONS = [
  { id: 1, name: 'HOT WHEELS',       title: 'Steal a car and lose the cops',      pay: 800,  rp: 400 },
  { id: 2, name: 'MIDNIGHT DELIVERY',title: 'Run the package across town',        pay: 1400, rp: 600 },
  { id: 3, name: 'NIGHT MARKET',     title: 'Clear the aisles in Sunset Strip',   pay: 2200, rp: 900 },
  { id: 4, name: 'STRIP KINGS',      title: 'Win the street race',                pay: 3000, rp: 1200 },
  { id: 5, name: 'THE SETUP',        title: 'Lift the blueprints from Portside',  pay: 4200, rp: 1600 },
  { id: 6, name: 'THE LONG GOODBYE', title: 'Wreck the convoy before the pier',   pay: 8000, rp: 2600 },
];
