// Rafa Solano on foot and behind the wheel: movement relative to the camera, jump,
// building collision, a walk cycle, weapon pose, damage and entering or leaving cars.
// The player mesh is hidden while driving; the camera then follows the vehicle instead.
import { PLAYER, clamp } from '../config.js';
import { createCharacterModel, animateWalk, poseArmed, poseAim } from '../world/characters.js';

const rafaPalette = {
  skin: 0xb97850,
  shirt: 0xc5503c,
  pants: 0x263c45,
  shoe: 0xe9dfc5,
  hair: 0x241a16,
  accent: 0xf0dcc0,
  capColor: 0xf1e3c5,
};

export class Player {
  constructor(game, spawn) {
    this.game = game;
    this.model = createCharacterModel(rafaPalette);
    this.group = this.model.group;
    game.scene.add(this.group);
    this.position = new THREE.Vector3(spawn.x, 0, spawn.z);
    this.position.y = game.city.groundHeight(spawn.x, spawn.z);
    this.heading = spawn.heading ?? 0;
    this.velocityY = 0;
    this.grounded = true;
    this.radius = PLAYER.radius;
    this.health = PLAYER.maxHealth;
    this.maxHealth = PLAYER.maxHealth;
    this.weapon = 'fists';
    this.currentVehicle = null;
    this.walkPhase = 0;
    this.aimTimer = 0;
    this.lastDamageAt = -99;
    this.stepTimer = 0;
    this.dead = false;
    this.footstepSide = 0;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
  }

  get onFoot() {
    return this.currentVehicle === null;
  }

  get pistolEquipped() {
    return this.weapon === 'pistol';
  }

  setWeapon(weapon) {
    this.weapon = weapon;
    this.model.weapon.visible = weapon === 'pistol';
  }

  update(dt) {
    if (this.dead) return;
    if (this.currentVehicle) {
      this.group.visible = false;
      this.currentVehicle.updatePlayer(dt, this.game.input, this.game.city);
      this.position.set(this.currentVehicle.position.x, 0, this.currentVehicle.position.z);
      this.health = Math.max(0, this.health);
      return;
    }
    this.group.visible = true;
    const input = this.game.input;
    const yaw = this.game.cameraRig.yaw;
    const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    let mx = 0;
    let mz = 0;
    if (input.down('KeyW')) { mx += forward.x; mz += forward.z; }
    if (input.down('KeyS')) { mx -= forward.x; mz -= forward.z; }
    if (input.down('KeyD')) { mx += right.x; mz += right.z; }
    if (input.down('KeyA')) { mx -= right.x; mz -= right.z; }
    const moving = Math.abs(mx) + Math.abs(mz) > 0.01;
    const aiming = input.mouseDown(2) && this.pistolEquipped;
    const sprinting = input.down('ShiftLeft') || input.down('ShiftRight');
    let speed = sprinting && !aiming ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    if (aiming) speed *= 0.55;
    if (this.game.dialogue?.active) speed *= 0.9;

    if (moving) {
      const length = Math.hypot(mx, mz);
      mx /= length;
      mz /= length;
      const nextX = this.position.x + mx * speed * dt;
      const nextZ = this.position.z + mz * speed * dt;
      const resolved = this.game.resolveCollision(nextX, nextZ, this.radius);
      this.position.x = resolved.x;
      this.position.z = resolved.z;
      const heading = Math.atan2(-mx, -mz);
      let delta = heading - this.heading;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.heading += delta * Math.min(1, dt * 14);
      this.walkPhase += dt * speed * 2.25;
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = sprinting ? 0.28 : 0.42;
        this.game.audio.footstep(sprinting);
      }
    } else {
      this.walkPhase += dt * 1.1;
      this.stepTimer = 0;
      if (aiming) {
        const targetHeading = Math.atan2(-forward.x, -forward.z);
        let delta = targetHeading - this.heading;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        this.heading += delta * Math.min(1, dt * 12);
      }
    }

    const ground = this.game.city.groundHeight(this.position.x, this.position.z);
    if (input.consume('Space') && this.grounded) {
      this.velocityY = PLAYER.jumpSpeed;
      this.grounded = false;
      this.game.audio.jump();
    }
    this.velocityY -= PLAYER.gravity * dt;
    this.position.y += this.velocityY * dt;
    if (this.position.y <= ground) {
      this.position.y = ground;
      this.velocityY = 0;
      this.grounded = true;
    }

    this.position.x = clamp(this.position.x, -312, 312);
    this.position.z = clamp(this.position.z, -278, 346);

    this.group.position.set(this.position.x, this.position.y + 0.02, this.position.z);
    this.group.rotation.y = this.heading;
    if (moving) {
      animateWalk(this.model, this.walkPhase, sprinting ? 1.2 : 0.8);
      if (this.pistolEquipped) this.model.weapon.visible = true;
    } else {
      this.model.leftLeg.rotation.x *= 0.82;
      this.model.rightLeg.rotation.x *= 0.82;
      this.model.leftArm.rotation.x *= 0.82;
      this.model.rightArm.rotation.x *= 0.82;
      this.model.root.position.y = 0;
    }
    if (this.pistolEquipped) {
      this.model.weapon.visible = true;
      if (!moving) poseArmed(this.model);
      if (aiming) poseAim(this.model);
    } else {
      this.model.weapon.visible = false;
    }

    // Slow recovery out of combat, as long as no one is actively shooting.
    if (this.game.elapsed - this.lastDamageAt > 12 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + dt * 3.6);
    }
  }

  damage(amount, source = 'gunfire') {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    this.lastDamageAt = this.game.elapsed;
    this.game.cameraRig.addShake(0.18);
    this.game.effects.emitBlood(this.position, 1);
    this.game.audio.playerHit();
    if (this.health <= 0) {
      this.dead = true;
      this.game.onPlayerDeath(source);
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  reviveAt(x, z, heading = 0) {
    this.leaveVehicle(false);
    this.dead = false;
    this.health = this.maxHealth;
    this.lastDamageAt = -99;
    this.position.set(x, this.game.city.groundHeight(x, z), z);
    this.heading = heading;
    this.velocityY = 0;
    this.group.visible = true;
    this.group.position.copy(this.position);
    this.group.rotation.y = heading;
  }

  enterVehicle(vehicle) {
    if (!vehicle || vehicle.destroyed || this.currentVehicle) return false;
    this.currentVehicle = vehicle;
    vehicle.enter(true);
    this.game.traffic.removeVehicle(vehicle);
    this.group.visible = false;
    this.game.audio.engineOn();
    this.game.onVehicleEntered(vehicle);
    return true;
  }

  leaveVehicle(playSound = true) {
    const vehicle = this.currentVehicle;
    if (!vehicle) return false;
    const right = vehicle.rightVector;
    let exitX = vehicle.position.x + right.x * (vehicle.type.width * 0.65 + 0.8);
    let exitZ = vehicle.position.z + right.z * (vehicle.type.width * 0.65 + 0.8);
    const resolved = this.game.resolveCollision(exitX, exitZ, this.radius);
    exitX = resolved.x;
    exitZ = resolved.z;
    vehicle.mode = 'parked';
    vehicle.driver = null;
    vehicle.forwardSpeed *= 0.35;
    this.currentVehicle = null;
    this.position.set(exitX, this.game.city.groundHeight(exitX, exitZ), exitZ);
    this.group.visible = true;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
    this.game.audio.engineOff();
    if (playSound) this.game.audio.carDoor();
    this.game.onVehicleExited(vehicle);
    return true;
  }

  aimVector() {
    const direction = new THREE.Vector3();
    this.game.camera.getWorldDirection(direction);
    direction.y = 0;
    if (direction.lengthSq() < 0.001) direction.set(0, 0, -1);
    direction.normalize();
    return direction;
  }

  getMuzzlePosition() {
    const dir = this.aimVector();
    const right = { x: -dir.z, z: dir.x };
    return new THREE.Vector3(
      this.position.x + right.x * 0.26 + dir.x * 0.48,
      this.position.y + 1.32,
      this.position.z + right.z * 0.26 + dir.z * 0.48,
    );
  }
}
