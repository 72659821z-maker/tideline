[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/72659821z-maker/tideline/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/72659821z-maker/tideline/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
# TIDELINE — A Marisol Bay Story

An original open-world crime game that runs in desktop Chrome straight from static files.
Marisol Bay is a sun-bleached coastal city of five avenues, five streets, a park, a marina,
a working garage and a long waterfront. Rafa Solano comes home to a debt, a stolen car and
a ledger that half the city wants buried.

Everything in the game — the city, map, characters, vehicles, names, story, textures, sound
and effects — was made for this entry. Three.js is vendored as `game/vendor/three.min.js`;
there are no downloaded art, audio, font or network assets and no build step.

## Play it

From the repository root, with Node 22 or later:

```bash
node serve.ts
```

Open <http://localhost:8080>. Click **Start Game** (or press Enter), then click the game
once to capture the mouse. Progress saves automatically at the garage and when you pause;
the next boot offers **Continue story**.

The opening job marker is the gold ring at the garage. Walk into it, or read the HUD
objective and follow the gold waypoint on the minimap.

## Controls

| Input | On foot | In a vehicle |
| --- | --- | --- |
| `W A S D` | Walk relative to the camera | Throttle, reverse and steer |
| `Shift` | Sprint | Handbrake / drift |
| `Space` | Jump | Brake |
| Mouse | Orbit / aim camera | Orbit chase camera |
| Left click | Fist or pistol | — |
| Right click | Aim down sights | — |
| `F` or `E` | Enter / steal a nearby car | Exit the car |
| `1` / `2` | Fists / pistol | Fists / pistol |
| `H` | — | Horn |
| `Esc` | Pause and save | Pause and save |

## What you can do

TIDELINE is a small, complete crime sandbox rather than a demo scene:

- **Five jobs, in order** — *First Light* (steal a coral Sundown GT off Pier 9 and bring it home),
  *The Ledger* (clear Pike's crew at Casa Sombra and lift the notebook), *Salt in the Wound*
  (meet Detective Voss at the marina and break up the dock crew), *Undertow* (take back Tito's
  tow truck and lose four stars) and *Last Light* (the lighthouse, and Deacon Pike himself).
  Each has its own dialogue, waypoint, enemy wave, escape beat and cash reward.
- **Seven vehicles** — Sundown GT, Marlin S4, Dune Hauler, Breeze Cab, Riptide XL, Gull Compact
  and the Corsair P9 cruiser. Any parked car or traffic car can be carjacked; theft raises heat.
- **A real police system** — one to five wanted stars from gunfire, assault, theft and
  hit-and-run, cruisers that pathfind to you on the street graph, officers that deploy on foot,
  and stars that decay once you break line of sight. Getting caught or killed costs $250.
- **Living streets** — eighteen traffic cars that turn at junctions and yield, twenty-two
  pedestrians who circle blocks and flee gunfire, and a golden-hour coast with palms, benches,
  hydrants, signals, a pier, boats and a lighthouse.
- **Controls** — `WASD` move, mouse to look, `Shift` sprint/handbrake, `Space` jump/brake,
  `F` enter or exit a car, click to punch or shoot, `1`/`2` to switch, `Esc` to pause and save.

Built for make.fun gta6-01: everything you see is generated at load time from the modules in
`game/src/`, so the entry runs from a folder with no network access.

## What is in the game

- **Marisol Bay** — a coherent sunlit grid city with painted roads and crossings, varied
  window-lit buildings, shop signs, Coral Park, a marina, Pier 9, a lighthouse, palms,
  benches, hydrants, traffic signals and a beach. Daytime directional shadows and a
  hand-painted gradient sky.
- **On foot** — camera-relative movement, sprinting, jumping, building collision and a
  smooth third-person orbit camera with aim zoom and collision pull-in.
- **Seven vehicles** — the Sundown GT, Marlin S4, Dune Hauler, Breeze Cab, Riptide XL,
  Gull Compact and Corsair P9 police cruiser, each with its own model, engine, grip and
  steering. Parked cars can be stolen, traffic can be carjacked, and the arcade model has
  acceleration, braking, handbrake drift, wheel smoke and crash sparks.
- **Traffic and pedestrians** — road-graph traffic that turns at junctions and yields for
  the car ahead; pedestrians circle their blocks and flee from gunfire and oncoming cars.
- **Wanted level and police** — one to five stars for theft, gunfire, assault, hit-and-run
  and officer kills. Cruisers pathfind to Rafa, deploy officers, fire at three stars or
  more, and the stars decay when he breaks line of sight. Being caught or killed costs
  $250 and clears the heat.
- **Combat** — fists and a pistol with hitscan tracers, muzzle flashes, blood, impact
  sparks, camera shake and enemy return fire.
- **Five connected missions** — *First Light*, *The Ledger*, *Salt in the Wound*,
  *Undertow* and *Last Light*, with an original cast, dialogue, waypoints, mission banners,
  enemy waves, escape beats and cash rewards.
- **HUD** — canvas-drawn north-up minimap with roads, surf, waypoint and police blips;
  health, wanted stars, cash, weapon/ammo, objective distance and a live speedometer.
- **Menus and save** — a start screen with controls and save status, pause menu, death/busted
  respawn card, and a `localStorage` save of cash, ammo and story progress.
- **Polish** — WebAudio synthesis for engine, exhaust, sirens, gunfire, punches and crashes;
  GPU particles for smoke, sparks, blood and muzzle flash; screen shake; hit reactions.
- **Golden hour** — warm directional sun, soft amber ambient, a low horizon glow in the sky
  shader, a shimmering painted sea and additive red/blue light bars with tarmac light pools on
  every cruiser.

## Layout

```
main.ts                     entrypoint: copies game/ + screenshots/, writes dossier.json
serve.ts                    tiny local static server for game/
shots.json                  screenshot scene queries
LICENSE                     MIT
README.md
game/
  index.html                page, start screen, pause/death menus, CSS
  vendor/three.min.js       vendored three.js r160 UMD build
  src/
    main.js                 boot, query-param screenshot staging and render loop
    game.js                 world owner: state, loop, interactions, crash/heat events
    config.js               city grid, palette, tuning, districts and save key
    random.js               seeded PRNG so shots are deterministic
    data/story.js           missions, dialogue, characters, rewards
    world/
      city.js               blocks, buildings, Casa Sombra, garage, marina, park, beach
      roads.js              street grid, lane paint, traffic-light network, BFS
      props.js              palms, lamps, signals, benches, pier, boats, lighthouse
      textures.js           canvas-painted facades, asphalt, pavers, sand, signs, glow
      characters.js         player/pedestrian/enemy models and animation poses
      sky.js                sky shader, sun, lighting, sea, surf, islands, haze
    entities/
      player.js             on-foot movement, camera-relative input, vehicles, health
      vehicle.js            seven vehicle models and the arcade driving model
      pedestrian.js         sidewalk routes, panic, hit reactions
      enemy.js              gang and police on-foot combat AI
      police.js             cruiser pursuit, officer deployment and police fire
    systems/
      input.js              keyboard/mouse state and pointer lock
      camera.js             third-person spring camera, orbit, aim and shake
      traffic.js            road-graph traffic population and carjacking
      wanted.js             stars, decay, police spawning and busted timer
      combat.js             player/enemy/police hitscan and damage
      missions.js           mission chain, stages, waves, markers, rewards
      save.js               localStorage save/load
      effects.js            particles, muzzle flashes, tracers
      audio.js              WebAudio synthesized engine, siren and effects
      scenarios.js          deterministic cover/chase/mission/drive scenes
    ui/
      hud.js                health, stars, cash, objective, weapon, speedometer
      minimap.js            north-up minimap and blips
      menus.js              start, pause and respawn DOM menus
screenshots/                4 real 1280×720 captures
```

## Screenshots

Each screenshot is a real render of this code with a staged, seeded scene:

```text
?shot=cover&seed=7     street, player, stolen Sundown GT, traffic and HUD
?shot=chase&seed=7     3-star police chase with cruisers and muzzle flash
?shot=mission&seed=7   Salt in the Wound, objective banner, waypoint and firefight
?shot=drive&seed=7     waterfront at 112 km/h with the speedometer and traffic
```

A local headless capture command used for this entry (software rendering, muted):

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --mute-audio --disable-gpu --hide-scrollbars `
  --no-first-run --no-default-browser-check --disable-extensions `
  --disable-background-networking --window-size=1280,720 `
  --virtual-time-budget=120 --run-all-compositor-stages-before-draw `
  --user-data-dir="$PWD\.chrome-cover" `
  --screenshot="$PWD\cover.png" `
  "http://127.0.0.1:8080/?shot=cover&seed=7"
```

## Handing it in

```bash
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force out | Out-Null
$env:MAKEFUN_OUTPUT_DIR = "out"
node main.ts
```

`main.ts` copies `game/` and `screenshots/` into the output directory and writes
`dossier.json` with the kit's `buildDossier`; `vendor/makefun-game.ts` is the kit's file,
unchanged.

## Originality

Marisol Bay, TIDELINE, Rafa Solano, Ivy Calderón, Tito Marchetti, Nessa Voss, Deacon Pike,
Solano Motor Co., Casa Sombra, all vehicles, districts, story, text, textures and sounds
are original to this entry. No commercial game's names, characters, map, art, music or
other assets are used.

## Licence

MIT. See [LICENSE](LICENSE).
