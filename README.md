# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Fauzian08/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Fauzian08/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Isla Azura — Puerto Azura: an original 3D open-world crime game. Explore the sun-soaked island city of Puerto Azura on foot and by car, steal cars, outrun the AZPD, climb the wanted ladder, and work through six staged story missions with your crew — Mara, Leo and Nia.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome (or open `game/index.html` directly — no network needed).

## Controls

- **WASD** drive / move · **Mouse** camera · **E** enter / exit car
- **Space** handbrake · **Z / X / C** crew abilities · **Esc** pause
- **1–4** weapons · **Click** shoot / punch

## Tech

Three.js (vendored under `game/vendor/`) + plain ES modules. No build step, no network at runtime. `main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.

Original work: own city, characters, vehicles, story, art and sounds. Nothing from Rockstar's GTA.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
