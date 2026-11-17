// The living city loop: builds Marisol Bay, owns every system, and moves between the
// title, play, pause and respawn screens. The single requestAnimationFrame lives here.
// Systems are plain objects on `this`; the update order below is the simulation order.
import {
  GAME_TITLE, PLAYER, PLAYER_SPAWN, clamp,
} from './config.js';
import { makeRandom } from './random.js';
import { CHARACTERS } from './data/story.js';
import { AudioEngine } from './systems/audio.js';
import { ThirdPersonCamera } from './systems/camera.js';
import { Input } from './systems/input.js';
import { SaveSystem } from './systems/save.js';
import { TrafficSystem } from './systems/traffic.js';
import { WantedSystem } from './systems/wanted.js';
import { CombatSystem } from './systems/combat.js';
import { MissionSystem } from './systems/missions.js';
import { Player } from './entities/player.js';
import { PedestrianSystem } from './entities/pedestrian.js';
import { Menus } from './ui/menus.js';
import { HUD } from './ui/hud.js';
import { Enemy } from './entities/enemy.js';
import { Vehicle } from './entities/vehicle.js';
import { Effects } from './systems/effects.js';
import { buildRoadNetwork } from './world/roads.js';
import { createCity, resolveCityCollision } from './world/city.js';
import { createSky, updateSunForPlayer, driftClouds } from './world/sky.js';
import { updateTrafficSignals } from './world/props.js';

const CLINIC_SPAWN = { x: 136, z: -34, heading: 2.4 };

export class Game {
  constructor({ canvas, hudCanvas, seed = 20261117, shotMode = false }) {
    this.seed = seed;
    this.shotMode = shotMode;
    this.canvas = canvas;
    this.random = makeRandom(seed);
    this.saveSystem = new SaveSystem();
    const saved = this.saveSystem.load();
    this.meta = {
      cash: saved?.cash ?? 650,
      missionIndex: saved?.missionIndex ?? 0,
      ammo: saved?.ammo ?? 48,
      storyComplete: saved?.storyComplete ?? false,
    };
    this.cash = this.meta.cash;
    this.ammo = this.meta.ammo;
    this.storyComplete = this.meta.storyComplete;
    this.elapsed = 0;
    this.mode = 'title';
    this.freezeWorld = false;
    this.pauseLockout = 0;
    this.introShown = false;
    this.missionBanner = null;
    this.dialogue = null;
    this.prompt = null;
    this.aimPulse = 0;
    this.lastCarHitAt = -99;
    this.sunClock = 0;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: shotMode, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.08, 1100);
    this.camera.position.set(20, 12, 90);

    this.sky = createSky(this.scene, this.renderer);
    this.roads = buildRoadNetwork(this.scene);
    this.city = createCity(this.scene, seed);
    updateTrafficSignals(this.city.signals, 0);

    this.cameraRig = new ThirdPersonCamera(this);
    this.input = new Input(canvas);
    this.effects = new Effects(this.scene);
    this.audio = new AudioEngine();
    this.player = new Player(this, PLAYER_SPAWN);
    this.vehicles = [];
    this.enemies = [];
    this.spawnParkedVehicles();
    this.traffic = new TrafficSystem(this, makeRandom(seed + 17));
    this.pedestrians = new PedestrianSystem(this, makeRandom(seed + 31));
    this.wanted = new WantedSystem(this);
    this.combat = new CombatSystem(this);
    this.missions = new MissionSystem(this);
    this.hud = new HUD(hudCanvas, this);
    this.menus = new Menus(this);
    this.bindInput();
    this.showTitle();
    this.lastFrame = performance.now();
    this.frameHandle = 0;
    this.updateSun(true);
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('gamepadconnected', () => {});
  }

  spawnParkedVehicles() {
    const parked = [
      { type: 'sundown', x: 74, z: 27, heading: -Math.PI / 2, color: 0xe85d47 },
      { type: 'marlin', x: -72, z: 26, heading: Math.PI / 2, color: 0xd8d0bc },
      { type: 'gull', x: 6, z: 95, heading: 0, color: 0xd8a6a1 },
      { type: 'marlin', x: 48, z: 68, heading: Math.PI, color: 0xd8d0bc },
      { type: 'riptide', x: 82, z: 74, heading: Math.PI, color: 0x6a8b76 },
      { type: 'riptide', x: 127, z: -52, heading: Math.PI, color: 0x39414d },
      { type: 'dune', x: -72, z: 154, heading: Math.PI / 2, color: 0x4f7d78 },
      { type: 'breeze', x: 56, z: 154, heading: -Math.PI / 2, color: 0xe9b84b },
      { type: 'marlin', x: 204, z: 154, heading: -Math.PI / 2, color: 0x355c6d },
      { type: 'gull', x: -186, z: 243, heading: Math.PI / 2, color: 0xf0e5c8 },
      { type: 'riptide', x: 205, z: 281, heading: -Math.PI / 2, color: 0x6a8b76 },
      { type: 'sundown', x: 78, z: 282, heading: -Math.PI / 2, color: 0xe85d47, tag: 'sundown-pier' },
      { type: 'dune', x: -166, z: 246, heading: Math.PI / 2, color: 0xc8a064, tag: 'tow-truck' },
      { type: 'gull', x: 11, z: -152, heading: 0, color: 0x6f9a98 },
    ];
    for (const definition of parked) {
      const vehicle = new Vehicle(this, definition.type, {
        x: definition.x, z: definition.z, heading: definition.heading,
        color: definition.color, mode: 'parked', tag: definition.tag ?? 'parked',
      });
      this.vehicles.push(vehicle);
    }
  }

  bindInput() {
    this.input.onAnyKey = () => { this.audio.ensure(); };
    this.input.onLockChange = (locked) => {
      if (!locked && this.mode === 'playing' && this.pauseLockout <= 0) this.pause();
    };
    this.input.onMouseDown = () => {
      if (this.mode === 'playing' && !this.input.locked) this.input.requestPointerLock();
    };
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  }

  showTitle() {
    this.mode = 'title';
    this.hud.hide();
    this.menus.showStart();
    this.cameraRig.freeze = false;
    this.cameraRig.initialized = false;
    this.player.group.visible = true;
    this.player.group.position.copy(this.player.position);
    this.player.group.rotation.y = this.player.heading;
    this.updateSun(true);
  }

  startFromMenu() {
    this.audio.ensure();
    this.menus.hideAll();
    this.menus.hideDeath();
    this.hud.show();
    this.mode = 'playing';
    this.cameraRig.freeze = false;
    this.cameraRig.initialized = false;
    this.cameraRig.yaw = this.player.heading;
    this.pauseLockout = 0;
    this.input.clear();
    this.input.requestPointerLock();
    if (!this.introShown) {
      this.introShown = true;
      this.showBanner({
        kicker: 'MARISOL BAY · 16:42 · 31°C',
        title: GAME_TITLE,
        sub: 'WASD walk · mouse look · F steal a car · Esc pause',
      }, 5.2);
      if (this.meta.missionIndex > 0) this.showToast('SAVED STORY LOADED — WELCOME BACK TO THE BAY');
    } else if (this.meta.missionIndex > 0) {
      this.showToast('BACK ON THE STREET');
    }
  }

  newGame() {
    this.saveSystem.clear();
    this.cash = 650;
    this.ammo = 48;
    this.storyComplete = false;
    this.meta = { cash: 650, missionIndex: 0, ammo: 48, storyComplete: false };
    this.wanted.clearImmediate();
    for (const enemy of this.enemies) this.scene.remove(enemy.group);
    this.enemies = [];
    if (this.player.currentVehicle) this.player.leaveVehicle(false);
    this.player.reviveAt(PLAYER_SPAWN.x, PLAYER_SPAWN.z, PLAYER_SPAWN.heading);
    this.player.setWeapon('fists');
    this.dialogue = null;
    this.missionBanner = null;
    this.storyComplete = false;
    if (this.missions) this.scene.remove(this.missions.marker);
    this.missions = new MissionSystem(this);
    this.introShown = false;
    this.startFromMenu();
    this.showToast('NEW STORY — MARISOL BAY IS WAITING');
  }

  returnToTitle() {
    this.saveProgress();
    this.mode = 'title';
    this.menus.hidePause();
    this.menus.hideDeath();
    this.menus.showStart();
    this.hud.hide();
    if (document.pointerLockElement) document.exitPointerLock();
    this.audio.engineOff();
    this.cameraRig.freeze = false;
    this.cameraRig.initialized = false;
    this.input.clear();
  }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.pauseLockout = 0.6;
    this.menus.showPause();
    this.audio.engineOff();
    this.input.clear();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.menus.hidePause();
    this.pauseLockout = 0.3;
    this.input.clear();
    this.input.requestPointerLock();
    this.audio.ensure();
    if (this.player.currentVehicle) this.audio.engineOn();
  }

  onPlayerDeath(source) {
    if (this.mode !== 'playing') return;
    this.mode = 'dead';
    this.endReason = 'dead';
    this.player.dead = true;
    if (this.player.currentVehicle) this.player.leaveVehicle(false);
    this.wanted.clearImmediate();
    this.audio.engineOff();
    this.audio.fail();
    if (document.pointerLockElement) document.exitPointerLock();
    this.menus.showDeath({
      kicker: 'THE BAY KEEPS ITS SECRETS',
      title: 'FLATLINED',
      copy: 'The sun comes up without you. Rafa wakes in a clinic on the east side, lighter in the wallet and heavier in debt. The job is still waiting.',
      cost: 250,
    });
    this.hud.show();
  }

  busted() {
    if (this.mode !== 'playing') return;
    this.mode = 'dead';
    this.endReason = 'busted';
    if (this.player.currentVehicle) this.player.leaveVehicle(false);
    this.player.dead = false;
    this.wanted.clearImmediate();
    this.audio.engineOff();
    this.audio.fail();
    if (document.pointerLockElement) document.exitPointerLock();
    this.menus.showDeath({
      kicker: 'MARISOL BAY POLICE DEPARTMENT',
      title: 'BUSTED',
      copy: 'The cuffs are cold and the paperwork is worse. They take the cash in your pocket and let you walk at dawn. The city keeps its receipts.',
      cost: 250,
    });
  }

  respawnFromMenu() {
    this.menus.hideDeath();
    this.cash = Math.max(0, this.cash - 250);
    this.player.dead = false;
    this.player.leaveVehicle(false);
    this.player.reviveAt(CLINIC_SPAWN.x, CLINIC_SPAWN.z, CLINIC_SPAWN.heading);
    this.player.setWeapon('pistol');
    this.wanted.clearImmediate();
    this.mode = 'playing';
    this.cameraRig.initialized = false;
    this.cameraRig.freeze = false;
    this.cameraRig.yaw = CLINIC_SPAWN.heading;
    this.pauseLockout = 0.2;
    this.input.clear();
    this.input.requestPointerLock();
    this.showBanner({
      kicker: this.endReason === 'busted' ? 'BAIL PAID' : 'MEDICAL BILL',
      title: this.endReason === 'busted' ? 'BUSTED — RELEASED' : 'BACK ON YOUR FEET',
      sub: '-$250 · heat cleared · find your way back to the job',
    }, 4.4);
    this.saveProgress();
  }

  addCash(amount) {
    this.cash = Math.max(0, this.cash + Math.floor(amount));
  }

  saveProgress() {
    const success = this.saveSystem.write({
      cash: this.cash,
      missionIndex: this.missions.availableIndex,
      ammo: this.ammo,
      storyComplete: this.storyComplete,
    });
    this.meta.cash = this.cash;
    this.meta.missionIndex = this.missions.availableIndex;
    this.meta.ammo = this.ammo;
    if (success) this.menus?.refreshStart();
    return success;
  }

  showToast(text, duration = 2600) {
    this.menus?.toast(text, duration);
  }

  showBanner(data, duration = 4) {
    this.missionBanner = { ...data, duration, time: duration };
  }

  sayLines(lines) {
    if (!lines || !lines.length) return;
    const mapped = lines.map(([speakerId, text]) => ({
      speaker: CHARACTERS[speakerId]?.name ?? String(speakerId).toUpperCase(),
      text,
      color: speakerId === 'pike' ? '#ff7a61' : '#ffd27f',
    }));
    this.dialogue = { lines: mapped, index: 0, current: mapped[0], timer: 4.8, active: true };
  }

  advanceDialogue() {
    if (!this.dialogue?.active) return;
    this.dialogue.index += 1;
    if (this.dialogue.index >= this.dialogue.lines.length) {
      this.dialogue.active = false;
      this.dialogue = null;
    } else {
      this.dialogue.current = this.dialogue.lines[this.dialogue.index];
      this.dialogue.timer = 4.8;
    }
  }

  updateDialogue(dt) {
    if (!this.dialogue?.active) return;
    this.dialogue.timer -= dt;
    if (this.dialogue.timer <= 0) this.advanceDialogue();
  }

  updateBanner(dt) {
    if (!this.missionBanner) return;
    this.missionBanner.time -= dt;
    if (this.missionBanner.time <= 0) this.missionBanner = null;
  }

  bindActions() {
    if (this.dialogue?.active) {
      if (this.input.consume('KeyE') || this.input.consume('KeyF')) this.advanceDialogue();
      return;
    }
    if (this.input.consume('KeyF') || this.input.consume('KeyE')) this.interact();
    if (this.input.consume('Digit1')) {
      this.player.setWeapon('fists');
      this.showToast('FISTS EQUIPPED');
    }
    if (this.input.consume('Digit2')) {
      if (this.ammo > 0) {
        this.player.setWeapon('pistol');
        this.showToast('PISTOL EQUIPPED');
      } else {
        this.audio.emptyClick();
        this.showToast('NO AMMO');
      }
    }
    if (this.input.consume('KeyH') && this.player.currentVehicle) this.audio.horn();
  }

  update(dt) {
    this.elapsed += dt;
    this.pauseLockout = Math.max(0, this.pauseLockout - dt);

    if (this.mode === 'title') {
      if (this.input.consume('Enter')) this.startFromMenu();
      this.updateAmbient(dt);
      this.cameraRig.updateTitle(dt);
      this.hud.draw();
      return;
    }
    if (this.mode === 'paused') {
      if (this.pauseLockout <= 0 && this.input.consume('Escape')) this.resume();
      this.hud.draw();
      return;
    }
    if (this.mode === 'dead') {
      if (this.input.consume('Enter') || this.input.consume('Space')) this.respawnFromMenu();
      this.hud.draw();
      return;
    }
    if (this.mode !== 'playing') return;

    if (this.freezeWorld) {
      this.hud.draw();
      return;
    }

    if (this.input.consume('Escape')) {
      this.pause();
      this.hud.draw();
      return;
    }

    this.bindActions();
    if (this.input.locked) this.cameraRig.handleMouse(this.input.mouseDX, this.input.mouseDY);
    if (this.input.locked && this.input.mouseDown(0) && !this.dialogue?.active) this.combat.playerAttack();

    this.player.update(dt);
    this.traffic.update(dt);
    this.pedestrians.update(dt);
    for (const enemy of this.enemies.slice()) enemy.update(dt);
    this.wanted.update(dt);
    this.combat.update(dt);
    this.missions.update(dt, this.elapsed);
    this.checkVehicleCollisions(dt);
    this.checkCarHitsPedestrians();
    this.cleanupEnemies(dt);
    this.updatePrompt();
    this.updateDialogue(dt);
    this.updateBanner(dt);
    this.effects.update(dt);
    this.cameraRig.update(dt);
    this.audio.update(dt, this);
    this.sunClock += dt;
    if (this.sunClock > 0.2) {
      this.sunClock = 0;
      updateSunForPlayer(this.sky, this.player.position.x, this.player.position.z);
      driftClouds(this.sky, this.elapsed);
    }
    updateTrafficSignals(this.city.signals, this.elapsed);
    this.hud.draw();
  }

  updateAmbient(dt) {
    this.traffic.update(dt);
    this.pedestrians.update(dt);
    this.effects.update(dt);
    this.audio.update(dt, this);
    updateTrafficSignals(this.city.signals, this.elapsed);
    updateSunForPlayer(this.sky, this.player.position.x, this.player.position.z);
  }

  cleanupEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (enemy.dead && enemy.deathClock > 26 && !enemy.missionEnemy) {
        this.scene.remove(enemy.group);
        this.enemies.splice(i, 1);
      }
    }
  }

  updatePrompt() {
    const player = this.player;
    if (this.dialogue?.active) { this.prompt = null; return; }
    if (player.currentVehicle) {
      this.prompt = Math.abs(player.currentVehicle.forwardSpeed) < 3 ? `EXIT ${player.currentVehicle.name.toUpperCase()}` : null;
      return;
    }
    const nearest = this.nearestEnterableVehicle(3.9);
    if (!nearest) { this.prompt = null; return; }
    this.prompt = `${nearest.stolen ? 'ENTER' : 'STEAL'} ${nearest.name.toUpperCase()}`;
  }

  nearestEnterableVehicle(maxDistance) {
    let best = null;
    let bestD = maxDistance;
    for (const vehicle of this.vehicles) {
      if (vehicle.destroyed || vehicle.mode === 'player' || vehicle.mode === 'police') continue;
      const d = Math.hypot(vehicle.position.x - this.player.position.x, vehicle.position.z - this.player.position.z);
      if (d < bestD) { bestD = d; best = vehicle; }
    }
    return best;
  }

  interact() {
    if (this.player.dead) return;
    if (this.player.currentVehicle) {
      this.player.leaveVehicle(true);
      return;
    }
    const vehicle = this.nearestEnterableVehicle(3.9);
    if (!vehicle) return;
    const entered = this.player.enterVehicle(vehicle);
    if (entered) {
      if (!vehicle.stolen) {
        vehicle.stolen = true;
        this.wanted.commit(1, 'vehicle theft');
      }
      this.showToast(`${vehicle.name.toUpperCase()} — ${vehicle.type.category.toUpperCase()}`);
    }
  }

  onVehicleEntered(vehicle) {
    this.prompt = null;
    this.audio.ensure();
    if (this.meta.missionIndex === 0 && vehicle.tag === 'sundown-pier') {
      this.showToast('THAT IS THE SUNDOWN GT — GET IT TO THE GARAGE');
    }
  }

  onVehicleExited() {
    this.audio.engineOff();
    this.prompt = null;
  }

  onCarCrash(vehicle, intensity) {
    const isPlayer = vehicle === this.player.currentVehicle;
    this.effects.emitSparks(vehicle.position, Math.min(18, 4 + Math.floor(intensity * 0.8)), 0xffc46b, 4);
    this.effects.emitSmokePuff(vehicle.position, 1.1, 0x8d8980);
    this.audio.crash(intensity);
    if (isPlayer) {
      this.cameraRig.addShake(Math.min(0.65, 0.08 + intensity * 0.012));
    }
    vehicle.damage(Math.min(14, intensity * 0.55), 'impact');
  }

  onVehicleDestroyed(vehicle, source) {
    this.effects.emitSparks(vehicle.position, 36, 0xffb04e, 10);
    for (let i = 0; i < 8; i += 1) this.effects.emitSmokePuff(vehicle.position, 2.5, 0x5e5a55);
    this.audio.explosion();
    this.cameraRig.addShake(0.7);
    if (this.player.currentVehicle === vehicle) {
      this.player.leaveVehicle(false);
      this.player.damage(20, 'explosion');
    }
    vehicle.mesh.visible = false;
    if (vehicle.mode === 'police') this.wanted.commit(1, 'destroying a cruiser');
    this.showToast('VEHICLE WRECKED');
  }

  onEnemyKilled(enemy, source) {
    if (enemy.kind === 'cop') this.wanted.commit(2, 'officer down');
    this.missions?.onEnemyKilled(enemy);
    this.effects.emitBlood(enemy.position, 8);
    if (enemy.isBoss) {
      this.showBanner({
        kicker: 'THE NARROWS LIGHT',
        title: 'PIKE IS DOWN',
        sub: 'The marina has a new owner — nobody',
      }, 4.5);
      this.showToast('DEACON PIKE IS DOWN');
    }
  }

  onPedestrianKilled(ped, byCar = false) {
    this.wanted.commit(2, byCar ? 'hit and run' : 'civilian killed');
    this.scarePeds(ped.position.x, ped.position.z, 45);
    if (byCar) this.showToast('HIT AND RUN — THE STREET REMEMBERS');
  }

  onPedestrianAttacked(ped) {
    this.wanted.commit(1, 'assault');
  }

  scarePeds(x, z, radius) {
    this.pedestrians.scareAround(x, z, radius);
  }

  spawnEnemy(options) {
    const enemy = new Enemy(this, options);
    this.enemies.push(enemy);
    return enemy;
  }

  findVehicleByTag(tag) {
    return this.vehicles.find((vehicle) => vehicle.tag === tag && !vehicle.destroyed) ?? null;
  }

  checkVehicleCollisions(dt) {
    const playerCar = this.player.currentVehicle;
    if (!playerCar || playerCar.destroyed) return;
    for (const other of this.vehicles) {
      if (other === playerCar || other.destroyed) continue;
      const dx = other.position.x - playerCar.position.x;
      const dz = other.position.z - playerCar.position.z;
      const distance = Math.hypot(dx, dz);
      const minDistance = (playerCar.type.width + other.type.width) * 0.5 + 0.45;
      if (distance >= minDistance || distance < 0.001) continue;
      const nx = dx / distance;
      const nz = dz / distance;
      const push = minDistance - distance;
      playerCar.position.x -= nx * push * 0.52;
      playerCar.position.z -= nz * push * 0.52;
      other.position.x += nx * push * 0.48;
      other.position.z += nz * push * 0.48;
      playerCar.forwardSpeed *= 0.72;
      if (this.elapsed - this.lastCarHitAt > 0.55) {
        this.lastCarHitAt = this.elapsed;
        const intensity = Math.hypot(playerCar.forwardSpeed, other.forwardSpeed ?? 0);
        this.effects.emitSparks(new THREE.Vector3(playerCar.position.x + nx, 0.7, playerCar.position.z + nz), 6, 0xffc56b, 3);
        this.audio.crash(intensity);
        this.cameraRig.addShake(0.12 + Math.min(0.25, intensity * 0.01));
        playerCar.damage(4, 'collision');
        if (other.mode === 'police') this.wanted.commit(1, 'ramming police');
      }
      other.syncMesh?.(0);
      playerCar.syncMesh?.(0);
    }
  }

  checkCarHitsPedestrians() {
    const car = this.player.currentVehicle;
    if (!car || car.destroyed || Math.abs(car.forwardSpeed) < 4.5) return;
    const forward = car.forwardVector;
    for (const ped of this.pedestrians.pedestrians) {
      if (ped.dead) continue;
      const dx = ped.position.x - car.position.x;
      const dz = ped.position.z - car.position.z;
      if (Math.hypot(dx, dz) > 2.2) continue;
      if (dx * forward.x + dz * forward.z < -0.5) continue;
      ped.knockDown({ x: forward.x, z: forward.z });
      this.effects.emitBlood(ped.position, 10);
      this.effects.emitSparks(ped.position, 3, 0xffc56b, 2);
      this.cameraRig.addShake(0.3);
      this.audio.crash(6);
    }
  }

  hasLineOfSight(x1, z1, x2, z2) {
    const colliders = this.city.colliders;
    for (const box of colliders) {
      if (segmentIntersectsBox(x1, z1, x2, z2, box.minX, box.maxX, box.minZ, box.maxZ)) return false;
    }
    return true;
  }

  resolveCollision(x, z, radius) {
    const resolved = resolveCityCollision(this.city.colliders, x, z, radius);
    resolved.x = clamp(resolved.x, -312, 312);
    resolved.z = clamp(resolved.z, -278, 346);
    return resolved;
  }

  resolveCameraCollision(start, desired) {
    const direction = desired.clone().sub(start);
    const length = direction.length();
    if (length < 0.001) return desired.clone();
    const steps = 14;
    let safeT = 1;
    for (let i = 2; i <= steps; i += 1) {
      const t = i / steps;
      const x = start.x + direction.x * t;
      const y = start.y + direction.y * t;
      const z = start.z + direction.z * t;
      let blocked = false;
      for (const box of this.city.colliders) {
        if (x > box.minX - 0.25 && x < box.maxX + 0.25 && z > box.minZ - 0.25 && z < box.maxZ + 0.25 && y < box.height + 0.5) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        safeT = Math.max(0.12, (i - 1) / steps);
        break;
      }
    }
    if (safeT >= 1) return desired.clone();
    return start.clone().add(direction.multiplyScalar(safeT));
  }

  updateSun(force = false) {
    updateSunForPlayer(this.sky, this.player.position.x, this.player.position.z);
    if (force) driftClouds(this.sky, this.elapsed);
  }

  startForShot() {
    this.audio.ensure = () => {};
    this.mode = 'playing';
    this.hud.show();
    this.menus.hideAll();
    this.menus.hideDeath();
    this.input.enabled = false;
    this.freezeWorld = true;
    this.cameraRig.freeze = true;
    this.cameraRig.initialized = true;
    this.dialogue = null;
    this.missionBanner = null;
    this.prompt = null;
  }

  startLoop() {
    const frame = (now) => {
      const raw = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      const dt = Math.min(0.05, Math.max(0, raw));
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      this.input.endFrame();
      this.frameHandle = requestAnimationFrame(frame);
    };
    this.frameHandle = requestAnimationFrame(frame);
  }
}

function segmentIntersectsBox(x1, z1, x2, z2, minX, maxX, minZ, maxZ) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  let tmin = 0;
  let tmax = 1;
  for (const [start, delta, min, max] of [[x1, dx, minX, maxX], [z1, dz, minZ, maxZ]]) {
    if (Math.abs(delta) < 0.00001) {
      if (start < min || start > max) return false;
    } else {
      let t1 = (min - start) / delta;
      let t2 = (max - start) / delta;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return true;
}
