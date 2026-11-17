// Hitscan combat for Rafa, Pike's crew and the police: fist swings, pistol shots,
// tracers, muzzle flashes, blood, sparks and the heat each crime creates.
import { WEAPONS } from '../config.js';

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.cooldown = 0;
    this.lastShotAt = -99;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  playerAttack() {
    if (this.game.player.dead || this.game.player.currentVehicle) return false;
    if (this.cooldown > 0) return false;
    if (this.game.player.weapon === 'pistol') return this.firePistol();
    return this.swingFist();
  }

  swingFist() {
    const game = this.game;
    const player = game.player;
    this.cooldown = WEAPONS.fists.cooldown;
    game.audio.punch();
    game.cameraRig.addShake(0.05);
    const dir = player.aimVector();
    let best = null;
    let bestDistance = WEAPONS.fists.range;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.position.x - player.position.x;
      const dz = enemy.position.z - player.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > bestDistance) continue;
      const facing = (dx * dir.x + dz * dir.z) / Math.max(0.01, distance);
      if (facing < 0.18) continue;
      best = { enemy, distance };
      bestDistance = distance;
    }
    for (const ped of game.pedestrians.pedestrians) {
      if (ped.dead) continue;
      const dx = ped.position.x - player.position.x;
      const dz = ped.position.z - player.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > bestDistance) continue;
      const facing = (dx * dir.x + dz * dir.z) / Math.max(0.01, distance);
      if (facing < 0.18) continue;
      best = { ped, distance };
      bestDistance = distance;
    }
    if (!best) return true;
    if (best.enemy) {
      best.enemy.takeDamage(WEAPONS.fists.damage, dir, 'player');
      game.effects.emitBlood(best.enemy.position, 2);
    } else {
      best.ped.takeDamage(WEAPONS.fists.damage, dir);
      game.scarePeds(best.ped.position.x, best.ped.position.z, 18);
    }
    game.wanted.commit(1, 'assault');
    return true;
  }

  firePistol() {
    const game = this.game;
    const player = game.player;
    if (game.ammo <= 0) {
      game.audio.emptyClick();
      game.showToast('NO AMMO — FIND A WEAPON');
      return false;
    }
    this.cooldown = WEAPONS.pistol.cooldown;
    game.ammo -= 1;
    const origin = player.getMuzzlePosition();
    const dir = player.aimVector();
    const hit = this.findTarget(origin, dir, WEAPONS.pistol.range);
    const end = hit ? new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z) : new THREE.Vector3(origin.x + dir.x * WEAPONS.pistol.range, origin.y, origin.z + dir.z * WEAPONS.pistol.range);
    game.effects.muzzleFlash(origin, dir);
    game.effects.tracer(origin, end);
    game.audio.gunshot();
    game.cameraRig.addShake(0.1);
    game.scarePeds(player.position.x, player.position.z, 48);
    if (game.wanted.stars === 0) game.wanted.commit(1, 'shots fired');
    else game.wanted.notifyCrime('shots fired');
    game.player.lastShotAt = game.elapsed;

    if (hit) {
      if (hit.enemy) {
        hit.enemy.takeDamage(WEAPONS.pistol.damage, dir, 'player');
      } else if (hit.ped) {
        hit.ped.takeDamage(WEAPONS.pistol.damage, dir);
        game.wanted.commit(1, 'shooting a civilian');
      } else if (hit.vehicle) {
        hit.vehicle.damage(24, 'gunfire');
        game.effects.emitSparks(new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z), 8, 0xffc56b, 3);
        if (hit.vehicle.mode === 'police') game.wanted.commit(1, 'attacking police');
      }
    }
    return true;
  }

  /** Nearest living target inside the aim cone, ignoring anyone behind a building. */
  findTarget(origin, dir, range) {
    const game = this.game;
    let best = null;
    let bestT = range;
    const consider = (x, z, radius, entry) => {
      const dx = x - origin.x;
      const dz = z - origin.z;
      const t = dx * dir.x + dz * dir.z;
      if (t < 0.5 || t > bestT) return;
      const perp = Math.abs(dx * dir.z - dz * dir.x);
      if (perp > radius) return;
      if (!game.hasLineOfSight(origin.x, origin.z, x, z)) return;
      best = { ...entry, point: { x, y: 1.2, z }, t };
      bestT = t;
    };
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      consider(enemy.position.x, enemy.position.z, 0.68, { enemy });
    }
    for (const ped of game.pedestrians.pedestrians) {
      if (ped.dead) continue;
      consider(ped.position.x, ped.position.z, 0.52, { ped });
    }
    for (const vehicle of game.vehicles) {
      if (vehicle.destroyed || vehicle === game.player.currentVehicle) continue;
      consider(vehicle.position.x, vehicle.position.z, 1.15, { vehicle });
    }
    return best;
  }

  enemyShoot(enemy) {
    const game = this.game;
    const player = game.player;
    const origin = enemy.getMuzzlePosition();
    const target = new THREE.Vector3(player.position.x, player.position.y + 1.15, player.position.z);
    if (!game.hasLineOfSight(origin.x, origin.z, target.x, target.z)) return;
    const distance = Math.hypot(target.x - origin.x, target.z - origin.z);
    if (distance > 55) return;
    const dir = target.clone().sub(origin).normalize();
    game.effects.muzzleFlash(origin, dir);
    game.effects.tracer(origin, new THREE.Vector3(target.x, target.y, target.z));
    if (distance < 20) game.audio.suppressedShot(); else game.audio.suppressedShot();
    game.scarePeds(enemy.position.x, enemy.position.z, 25);
    const hitChance = enemy.isBoss ? 0.7 : distance > 28 ? 0.34 : 0.55;
    if (Math.random() < hitChance) {
      if (player.currentVehicle) {
        player.currentVehicle.damage(enemy.isBoss ? 18 : 10, 'gunfire');
        if (Math.random() < 0.35) player.damage(enemy.isBoss ? 10 : 4, 'gunfire');
        game.effects.emitSparks(player.currentVehicle.position, 4, 0xffc56b, 2.5);
      } else {
        player.damage(enemy.isBoss ? 15 : 7, 'gunfire');
      }
      game.cameraRig.addShake(0.15);
    } else {
      game.effects.emitSparks(new THREE.Vector3(target.x + (Math.random() - 0.5) * 2, target.y, target.z + (Math.random() - 0.5) * 2), 3, 0xffd27a, 2);
    }
  }

  policeShoot(vehicle) {
    const game = this.game;
    const player = game.player;
    const origin = new THREE.Vector3(vehicle.position.x, 1.55, vehicle.position.z);
    const target = new THREE.Vector3(player.position.x, player.position.y + 1.1, player.position.z);
    if (!game.hasLineOfSight(origin.x, origin.z, target.x, target.z)) return;
    const dir = target.clone().sub(origin).normalize();
    game.effects.muzzleFlash(origin, dir);
    game.effects.tracer(origin, new THREE.Vector3(target.x, target.y, target.z));
    game.audio.suppressedShot();
    game.scarePeds(vehicle.position.x, vehicle.position.z, 32);
    if (Math.random() < 0.52) {
      if (player.currentVehicle) {
        player.currentVehicle.damage(9, 'gunfire');
        if (Math.random() < 0.3) player.damage(4, 'gunfire');
      } else {
        player.damage(6, 'gunfire');
      }
    }
    game.cameraRig.addShake(0.09);
  }
}
