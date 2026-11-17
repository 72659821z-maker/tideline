// Sidewalk life: pedestrians circle their blocks, chat, flinch at violence and run when
// a gun goes off or a car comes at them. They can be pushed, shot and run down.
// A pedestrian walking a block loop is cheap: four corner targets and a flee state.
import { BLOCK_CENTRES_X, BLOCK_CENTRES_Z } from '../config.js';
import { createCharacterModel, randomPersonPalette, animateWalk } from '../world/characters.js';

const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

export class Pedestrian {
  constructor(game, random, options = {}) {
    this.game = game;
    this.random = random;
    const palette = randomPersonPalette(random);
    this.model = createCharacterModel(palette);
    this.group = this.model.group;
    this.group.traverse((child) => { if (child.isMesh) child.castShadow = false; });
    game.scene.add(this.group);
    this.position = new THREE.Vector3(options.x ?? 0, 0, options.z ?? 0);
    this.heading = options.heading ?? 0;
    this.state = 'walk';
    this.speed = random.float(1.1, 1.9);
    this.timer = random.float(2, 8);
    this.health = 48;
    this.dead = false;
    this.fall = 0;
    this.walkPhase = random.float(0, 5);
    this.blockX = options.blockX ?? BLOCK_CENTRES_X[0];
    this.blockZ = options.blockZ ?? BLOCK_CENTRES_Z[0];
    this.corner = random.int(0, 3);
    this.target = this.cornerPoint((this.corner + 1) % 4);
    this.scanTimer = random.float(0.4, 1.8);
    this.hitReaction = 0;
    this.threat = new THREE.Vector3();
    this.group.position.set(this.position.x, 0.19, this.position.z);
    this.group.rotation.y = this.heading;
  }

  cornerPoint(index) {
    const [sx, sz] = CORNERS[index];
    return {
      x: this.blockX + sx * 47.5 + this.random.float(-1.5, 1.5),
      z: this.blockZ + sz * 47.5 + this.random.float(-1.5, 1.5),
    };
  }

  pickCorner() {
    return this.cornerPoint(this.corner);
  }

  setRoute(blockX, blockZ, startX, startZ) {
    this.blockX = blockX;
    this.blockZ = blockZ;
    this.position.set(startX, 0.19, startZ);
    this.corner = this.random.int(0, 3);
    this.target = this.cornerPoint((this.corner + 1) % 4);
  }

  scare(threatX, threatZ, duration = 6) {
    if (this.dead) return;
    this.state = 'flee';
    this.timer = duration;
    this.threat.set(threatX, 0, threatZ);
    this.model.leftArm.rotation.x = -1.8;
    this.model.rightArm.rotation.x = -1.8;
    this.model.leftArm.rotation.z = -0.4;
    this.model.rightArm.rotation.z = 0.4;
  }

  takeDamage(amount, dir, isCar = false) {
    if (this.dead) return;
    this.health -= amount;
    this.hitReaction = 0.55;
    this.game.effects.emitBlood(this.position, 3);
    if (this.health <= 0) {
      this.dead = true;
      this.state = 'dead';
      this.fall = 0;
      this.group.rotation.z = dir ? Math.sign(dir.x || 1) * 0.4 : 0.4;
      this.game.onPedestrianKilled(this);
    } else {
      this.scare(this.position.x + (dir?.x ?? 0) * 5, this.position.z + (dir?.z ?? 0) * 5, 8);
      this.game.onPedestrianAttacked(this);
    }
  }

  knockDown(dir) {
    if (this.dead) return;
    this.health = 0;
    this.dead = true;
    this.state = 'dead';
    this.fall = 0;
    this.group.rotation.z = Math.PI / 2 * (dir.x >= 0 ? 1 : -1);
    this.group.position.y = 0.4;
    this.game.onPedestrianKilled(this, true);
  }

  update(dt) {
    if (this.dead) {
      this.fall += dt;
      this.group.position.y = Math.max(0.12, this.group.position.y - dt * 1.6);
      this.group.rotation.x = Math.min(1.48, this.fall * 3.4);
      return;
    }
    this.scanTimer -= dt;
    if (this.scanTimer <= 0) {
      this.scanTimer = this.random.float(0.6, 1.4);
      // Run from any fast car that is close and heading roughly toward this pedestrian.
      for (const vehicle of this.game.vehicles) {
        if (vehicle.destroyed || vehicle.mode === 'parked') continue;
        const dx = this.position.x - vehicle.position.x;
        const dz = this.position.z - vehicle.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 9 && d > 0.1 && Math.abs(vehicle.forwardSpeed) > 7) {
          const forward = vehicle.forwardVector;
          const toward = (dx * forward.x + dz * forward.z) / d;
          if (toward > 0.55) this.scare(vehicle.position.x, vehicle.position.z, 3.2);
        }
      }
    }

    if (this.state === 'flee') {
      this.timer -= dt;
      const dx = this.position.x - this.threat.x;
      const dz = this.position.z - this.threat.z;
      const length = Math.hypot(dx, dz) || 1;
      this.move(dx / length, dz / length, 5.2, dt);
      if (this.timer <= 0) {
        this.state = 'walk';
        this.target = this.cornerPoint((this.corner + 1) % 4);
        this.model.leftArm.rotation.z = 0;
        this.model.rightArm.rotation.z = 0;
      }
    } else if (this.state === 'walk') {
      const dx = this.target.x - this.position.x;
      const dz = this.target.z - this.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 1.4) {
        this.corner = (this.corner + 1) % 4;
        this.target = this.cornerPoint((this.corner + 1) % 4);
        if (this.random.chance(0.22)) {
          this.state = 'idle';
          this.timer = this.random.float(1.5, 4.5);
        }
      } else {
        this.move(dx / distance, dz / distance, this.speed, dt);
      }
    } else if (this.state === 'idle') {
      this.timer -= dt;
      this.walkPhase += dt * 1.3;
      this.model.root.position.y = Math.sin(this.game.elapsed * 1.4 + this.walkPhase) * 0.012;
      if (this.timer <= 0) this.state = 'walk';
    }

    if (this.state !== 'idle' && this.state !== 'flee') animateWalk(this.model, this.walkPhase, 0.55);
    if (this.hitReaction > 0) {
      this.hitReaction -= dt;
      this.group.rotation.x = Math.sin(this.hitReaction * 30) * 0.11;
    } else {
      this.group.rotation.x *= 0.85;
    }
    this.group.position.set(this.position.x, this.group.position.y, this.position.z);
    this.group.rotation.y = this.heading;
  }

  move(dx, dz, speed, dt) {
    const targetHeading = Math.atan2(-dx, -dz);
    let delta = targetHeading - this.heading;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.heading += delta * Math.min(1, dt * 8);
    const nextX = this.position.x + dx * speed * dt;
    const nextZ = this.position.z + dz * speed * dt;
    const resolved = this.game.resolveCollision(nextX, nextZ, 0.34);
    this.position.x = resolved.x;
    this.position.z = resolved.z;
    this.walkPhase += dt * speed * 2.8;
    this.group.position.y = 0.19 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.025;
  }
}

export class PedestrianSystem {
  constructor(game, random, count = 22) {
    this.game = game;
    this.random = random;
    this.pedestrians = [];
    this.spawnTimer = 0;
    for (let i = 0; i < count; i += 1) this.spawn(true);
  }

  spawn(initial = false) {
    const rnd = this.random;
    const blocks = [];
    for (const bx of BLOCK_CENTRES_X) for (const bz of BLOCK_CENTRES_Z) blocks.push([bx, bz]);
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const [bx, bz] = rnd.pick(blocks);
      const [sx, sz] = CORNERS[rnd.int(0, 3)];
      const x = bx + sx * 47.5 + rnd.float(-1.5, 1.5);
      const z = bz + sz * 47.5 + rnd.float(-1.5, 1.5);
      if (Math.hypot(x - this.game.player.position.x, z - this.game.player.position.z) < 18) continue;
      const ped = new Pedestrian(this.game, rnd, { x, z, blockX: bx, blockZ: bz, heading: rnd.float(0, 6.28) });
      this.pedestrians.push(ped);
      return ped;
    }
    return null;
  }

  scareAround(x, z, radius = 40) {
    for (const ped of this.pedestrians) {
      if (ped.dead) continue;
      if (Math.hypot(ped.position.x - x, ped.position.z - z) < radius) ped.scare(x, z, 7);
    }
  }

  update(dt) {
    for (const ped of this.pedestrians) ped.update(dt);
    // Bring a far-away pedestrian back near the camera so the sidewalks never empty out.
    this.spawnTimer += dt;
    if (this.spawnTimer > 8) {
      this.spawnTimer = 0;
      const px = this.game.player.position.x;
      const pz = this.game.player.position.z;
      let far = this.pedestrians.filter((p) => !p.dead && Math.hypot(p.position.x - px, p.position.z - pz) > 160).slice(0, 2);
      for (const ped of far) {
        const blocks = [];
        for (const bx of BLOCK_CENTRES_X) for (const bz of BLOCK_CENTRES_Z) blocks.push([bx, bz]);
        const [bx, bz] = this.random.pick(blocks);
        const [sx, sz] = CORNERS[this.random.int(0, 3)];
        ped.setRoute(bx, bz, bx + sx * 47.5, bz + sz * 47.5);
      }
      if (this.pedestrians.filter((p) => !p.dead).length < 16) this.spawn(false);
    }
  }
}
