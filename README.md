# Isla Azura — Puerto Azura

An original open-world crime game built for the make.fun bounty **gta6-01** ("Make GTA 6").

Explore the sun-soaked island city of Puerto Azura on foot and by car. Steal cars, outrun the AZPD, climb the wanted ladder, and work through six staged story missions with your crew — Mara (driver), Leo (mechanic) and Nia (lookout). District standing, street races, stunt jumps, collectibles, ranks from ROOKIE to KINGPIN, and three save slots.

## Play

Open `game/index.html` in desktop Chrome (no network needed), or serve it locally:

```
node serve.ts   # http://localhost:8080
```

## Controls

- **WASD** drive / move · **Mouse** camera · **E** enter / exit car
- **Space** handbrake · **Z / X / C** crew abilities · **Esc** pause
- **1–4** weapons · **Click** shoot / punch

## Tech

Three.js (vendored under `game/vendor/`) + plain ES modules. No build step, no network at runtime. `main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.

Original work: own city, characters, vehicles, story, art and sounds. Nothing from Rockstar's GTA.
