// The heat: one to five stars from crime, patrol cruisers that respond, line-of-sight
// decay when Rafa disappears, and the busted timer when an officer gets close.
import { WANTED } from '../config.js';
import { PoliceUnit } from '../entities/police.js';

const TARGET_UNITS = [0, 1, 2, 2, 3, 4];

export class WantedSystem {
  constructor(game) {
    this.game = game;
    this.stars = 0;
    this.units = [];
    this.crimeClock = 99;
    this.unseenClock = 0;
    this.decayClock = 0;
    this.spawnClock = 2;
    this.bustedClock = 0;
    this.lastReason = '';
  }

  get active() {
    return this.stars > 0;
  }

  commit(points = 1, reason = 'disturbing the peace') {
    if (this.stars === 0) this.game.showToast(`WANTED LEVEL ${Math.min(5, points)} — ${reason.toUpperCase()}`);
    this.stars = Math.min(WANTED.maxStars, Math.max(this.stars, this.stars + points));
    this.crimeClock = 0;
    this.unseenClock = 0;
    this.decayClock = 0;
    this.lastReason = reason;
    this.spawnClock = Math.min(this.spawnClock, 1.2);
    this.game.audio.ensure();
  }

  setStars(level) {
    this.stars = Math.max(0, Math.min(WANTED.maxStars, level));
    this.crimeClock = 0;
    this.unseenClock = 0;
    this.decayClock = 0;
    this.spawnClock = Math.min(this.spawnClock, 1);
  }

  notifyCrime(reason = 'shots fired') {
    this.crimeClock = 0;
    this.lastReason = reason;
    if (this.stars > 0) this.game.showToast(`${this.stars} STARS — ${reason.toUpperCase()}`);
  }

  clearImmediate() {
    this.stars = 0;
    for (const unit of this.units) unit.cleanup();
    this.units = [];
    for (let i = this.game.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.game.enemies[i];
      if (enemy.kind === 'cop' && !enemy.missionEnemy) {
        this.game.scene.remove(enemy.group);
        this.game.enemies.splice(i, 1);
      }
    }
    this.bustedClock = 0;
    this.crimeClock = 99;
    this.unseenClock = 0;
    this.decayClock = 0;
  }

  update(dt) {
    this.crimeClock += dt;
    this.bustedClock = Math.max(0, this.bustedClock - (this.stars === 0 ? 1 : 0));
    this.units = this.units.filter((unit) => !unit.dead);
    for (const unit of this.units) unit.update(dt);

    if (this.stars === 0) {
      this.unseenClock = 0;
      this.decayClock = 0;
      return;
    }

    const player = this.game.player;
    const nearbyPolice = this.units.some((unit) => unit.vehicle
      && Math.hypot(unit.vehicle.position.x - player.position.x, unit.vehicle.position.z - player.position.z) < 46
      && this.game.hasLineOfSight(unit.vehicle.position.x, unit.vehicle.position.z, player.position.x, player.position.z))
      || this.game.enemies.some((e) => !e.dead && e.kind === 'cop'
        && Math.hypot(e.position.x - player.position.x, e.position.z - player.position.z) < 32
        && this.game.hasLineOfSight(e.position.x, e.position.z, player.position.x, player.position.z));
    if (nearbyPolice) this.unseenClock = 0;
    else this.unseenClock += dt;

    if (this.unseenClock > WANTED.decayDelay && this.crimeClock > 4) {
      this.decayClock += dt;
      if (this.decayClock > WANTED.decayStep) {
        this.decayClock = 0;
        this.stars = Math.max(0, this.stars - 1);
        if (this.stars === 0) {
          this.game.showToast('HEAT LOST — THE BAY MOVES ON');
          this.game.audio.mission();
        } else {
          this.game.showToast(`WANTED LEVEL DOWN — ${this.stars} STAR${this.stars > 1 ? 'S' : ''}`);
        }
      }
    }

    const targetUnits = TARGET_UNITS[this.stars];
    if (this.units.length < targetUnits) {
      this.spawnClock -= dt;
      if (this.spawnClock <= 0) {
        this.spawnUnit();
        this.spawnClock = 4.5;
      }
    } else {
      this.spawnClock = Math.max(0, this.spawnClock);
    }

    const inVehicle = Boolean(player.currentVehicle);
    const vehicleSpeed = inVehicle ? Math.abs(player.currentVehicle.forwardSpeed) : 0;
    let nearest = Infinity;
    for (const unit of this.units) {
      if (!unit.vehicle) continue;
      nearest = Math.min(nearest, Math.hypot(unit.vehicle.position.x - player.position.x, unit.vehicle.position.z - player.position.z));
    }
    for (const enemy of this.game.enemies) {
      if (!enemy.dead && enemy.kind === 'cop') nearest = Math.min(nearest, Math.hypot(enemy.position.x - player.position.x, enemy.position.z - player.position.z));
    }
    if (nearest < 6.8 && (!inVehicle || vehicleSpeed < 2.2) && !player.dead) {
      this.bustedClock += dt;
      if (this.bustedClock > 2.8) {
        this.bustedClock = 0;
        this.game.busted();
      }
    } else {
      this.bustedClock = Math.max(0, this.bustedClock - dt);
    }
  }

  spawnUnit() {
    const player = this.game.player;
    const roads = this.game.roads;
    let bestIndex = -1;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const index = Math.floor(Math.random() * roads.nodes.length);
      const node = roads.nodes[index];
      const distance = Math.hypot(node.x - player.position.x, node.z - player.position.z);
      if (distance > 85 && distance < 230) { bestIndex = index; break; }
    }
    if (bestIndex === -1) bestIndex = Math.floor(Math.random() * roads.nodes.length);
    const unit = new PoliceUnit(this.game, bestIndex);
    this.units.push(unit);
  }
}
