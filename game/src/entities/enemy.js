// Armed people on foot: Pike's crew, the hired guns at the marina and police officers
// who pour out of cruisers. They take cover in the open, close distance and shoot back.
// The same class covers cops and gang members; only the palette and the numbers differ.
import { createCharacterModel, animateWalk, poseArmed, poseAim } from '../world/characters.js';

const GANG_PALETTE = {
  skin: 0x9a6542, shirt: 0x28333a, pants: 0x1f292c, shoe: 0x16191a,
  hair: 0x1a1310, accent: 0xa62f2a, capColor: null,
};
const COP_PALETTE = {
  skin: 0xb97850, shirt: 0x2a4a63, pants: 0x1d313d, shoe: 0x151515,
  hair: 0x1a1310, accent: 0x84b1c9, capColor: 0x27445c,
};
const BOSS_PALETTE = {
  skin: 0x8f5a3a, shirt: 0xe5ddc8, pants: 0x2f3133, shoe: 0x1a1a1a,
  hair: 0x19110d, accent: 0x96332e, capColor: null,
};

export class Enemy {
  constructor(game, options = {}) {
    this.game = game;
    this.kind = options.kind ?? 'gang';
    this.isBoss = Boolean(options.boss);
    this.model = createCharacterModel(this.isBoss ? BOSS_PALETTE : this.kind === 'cop' ? COP_PALETTE : GANG_PALETTE);
    this.group = this.model.group;
    game.scene.add(this.group);
    this.position = new THREE.Vector3(options.x ?? 0, 0, options.z ?? 0);
    this.spawn = this.position.clone();
    this.heading = options.heading ?? 0;
    this.health = options.health ?? (this.isBoss ? 200 : this.kind === 'cop' ? 85 : 65);
    this.maxHealth = this.health;
    this.dead = false;
    this.deathClock = 0;
    this.cooldown = 0.8 + Math.random() * 1.2;
    this.walkPhase = Math.random() * 8;
    this.velY = 0;
    this.stagger = 0;
    this.radius = 0.42;
    this.aiming = false;
    this.homeRadius = options.homeRadius ?? 30;
    this.missionEnemy = Boolean(options.missionEnemy);
    this.speed = this.kind === 'cop' ? 3.2 : 2.6;
    this.group.position.set(this.position.x, 0.19, this.position.z);
    this.group.rotation.y = this.heading;
    this.model.weapon.visible = true;
    poseArmed(this.model);
  }

  get alive() {
    return !this.dead;
  }

  getMuzzlePosition() {
    const dir = { x: -Math.sin(this.heading), z: -Math.cos(this.heading) };
    return new THREE.Vector3(
      this.position.x + dir.x * 0.65 + Math.cos(this.heading) * 0.18,
      this.position.y + 1.3,
      this.position.z + dir.z * 0.65 - Math.sin(this.heading) * 0.18,
    );
  }

  takeDamage(amount, dir = { x: 0, z: 0 }, source = 'player') {
    if (this.dead) return;
    this.health -= amount;
    this.stagger = 0.3;
    this.game.audio.enemyHit();
    this.game.effects.emitBlood(this.position, 4);
    if (this.health <= 0) {
      this.die(dir, source);
      return;
    }
    if (source === 'player') {
      this.alerted = true;
      this.game.scarePeds(this.position.x, this.position.z, 22);
    }
  }

  die(dir, source) {
    if (this.dead) return;
    this.dead = true;
    this.health = 0;
    this.deathClock = 0;
    this.group.rotation.z = (dir.x >= 0 ? 1 : -1) * 1.35;
    this.game.onEnemyKilled(this, source);
  }

  update(dt) {
    if (this.dead) {
      this.deathClock += dt;
      this.group.rotation.x = Math.min(1.45, this.deathClock * 4.2);
      this.group.position.y = Math.max(0.14, this.group.position.y - dt * 0.7);
      return;
    }
    if (this.game.player.dead) return;
    const player = this.game.player;
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const distance = Math.hypot(dx, dz);
    const desiredHeading = Math.atan2(-dx, -dz);
    let delta = desiredHeading - this.heading;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.heading += delta * Math.min(1, dt * 7);

    const seesPlayer = distance < 46 && this.game.hasLineOfSight(this.position.x, this.position.z, player.position.x, player.position.z);
    let moving = false;
    if (seesPlayer && distance > 11) {
      const step = this.speed * dt;
      const resolved = this.game.resolveCollision(
        this.position.x + (dx / distance) * step,
        this.position.z + (dz / distance) * step,
        this.radius,
      );
      this.position.x = resolved.x;
      this.position.z = resolved.z;
      moving = true;
      this.walkPhase += dt * 7.5;
    } else if (!seesPlayer && distance > 26) {
      // Drift back toward the post if the player has vanished.
      const hx = this.spawn.x - this.position.x;
      const hz = this.spawn.z - this.position.z;
      const hd = Math.hypot(hx, hz);
      if (hd > 3) {
        const step = this.speed * 0.5 * dt;
        this.position.x += (hx / hd) * step;
        this.position.z += (hz / hd) * step;
        this.walkPhase += dt * 4;
        moving = true;
      }
    }

    this.cooldown -= dt;
    this.aiming = seesPlayer && distance < 48;
    if (this.aiming && this.cooldown <= 0) {
      this.cooldown = (this.isBoss ? 0.72 : this.kind === 'cop' ? 1.25 : 1.55) + Math.random() * 0.5;
      this.game.combat.enemyShoot(this);
    }

    if (moving) animateWalk(this.model, this.walkPhase, 0.7);
    else {
      this.model.leftLeg.rotation.x *= 0.8;
      this.model.rightLeg.rotation.x *= 0.8;
    }
    if (this.aiming) poseAim(this.model);
    else poseArmed(this.model);
    if (this.stagger > 0) {
      this.stagger -= dt;
      this.group.rotation.x = Math.sin(this.stagger * 40) * 0.07;
    } else {
      this.group.rotation.x *= 0.85;
    }
    this.group.position.set(this.position.x, 0.19, this.position.z);
    this.group.rotation.y = this.heading;
  }
}
