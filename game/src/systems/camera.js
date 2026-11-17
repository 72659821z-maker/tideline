// A springy third-person camera with mouse orbit, aim zoom, car chase framing and
// impact shake. It never cuts: it eases toward the target so the city stays readable.
// Staged screenshots bypass the easing entirely through placeAt().
import { clamp } from '../config.js';

export class ThirdPersonCamera {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;
    this.yaw = 0.4;
    this.pitch = 0.23;
    this.distance = 6.2;
    this.currentDistance = 6.2;
    this.position = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.orbitYaw = 0;
    this.shakeAmount = 0;
    this.time = 0;
    this.initialized = false;
    this.aiming = false;
    this.titleAngle = 0;
    this.freeze = false;
    this.followTarget = new THREE.Vector3();
  }

  addShake(amount) {
    this.shakeAmount = Math.min(0.9, this.shakeAmount + amount);
  }

  handleMouse(dx, dy) {
    const sens = this.aiming ? 0.0016 : 0.0022;
    this.yaw -= dx * sens;
    this.pitch = clamp(this.pitch + dy * sens * 0.8, -0.18, 0.82);
    if (this.game.player?.currentVehicle) {
      this.orbitYaw -= dx * sens;
      this.orbitYaw = clamp(this.orbitYaw, -1.5, 1.5);
    }
  }

  update(dt) {
    if (this.freeze) return;
    this.time += dt;
    this.aiming = this.game.input.mouseDown(2) && !this.game.player.currentVehicle;
    const player = this.game.player;
    const vehicle = player.currentVehicle;
    this.shakeAmount *= Math.exp(-7.5 * dt);

    let baseYaw = this.yaw;
    let distTarget = this.aiming ? 3.5 : 6.2;
    let height = this.aiming ? 1.1 : 1.9;
    let targetY = 1.45;

    if (vehicle) {
      this.orbitYaw *= Math.exp(-1.4 * dt);
      baseYaw = vehicle.heading + this.orbitYaw;
      this.pitch = clamp(this.pitch + (0.26 - this.pitch) * Math.min(1, dt * 2.5), 0.1, 0.6);
      distTarget = 7.1 + Math.min(2.4, Math.abs(vehicle.forwardSpeed) * 0.055);
      height = 2.6;
      targetY = 1.05;
      this.lookAt.set(vehicle.position.x, 1.2, vehicle.position.z);
    } else {
      this.lookAt.set(player.position.x, player.position.y + 1.45, player.position.z);
      if (this.aiming) {
        distTarget = 3.7;
        height = 1.5;
      }
    }

    const horizontal = Math.cos(this.pitch) * distTarget;
    const desiredX = this.lookAt.x + Math.sin(baseYaw) * horizontal;
    const desiredZ = this.lookAt.z + Math.cos(baseYaw) * horizontal;
    const desiredY = this.lookAt.y + this.pitch * distTarget + height * 0.18;
    const targetPos = new THREE.Vector3(desiredX, Math.max(0.55, desiredY), desiredZ);

    // Keep the camera out of the nearest building by shortening a clear sight line.
    const safe = this.game.resolveCameraCollision(this.lookAt, targetPos);
    if (!this.initialized) {
      this.position.copy(safe);
      this.initialized = true;
    } else {
      const stiffness = vehicle ? 7.8 : 9.5;
      this.position.lerp(safe, 1 - Math.exp(-stiffness * dt));
    }

    this.currentDistance += (distTarget - this.currentDistance) * Math.min(1, dt * 4);
    const shake = this.shakeAmount;
    this.camera.position.set(
      this.position.x + (Math.random() - 0.5) * shake,
      this.position.y + (Math.random() - 0.5) * shake * 0.7,
      this.position.z + (Math.random() - 0.5) * shake,
    );
    const look = this.lookAt.clone();
    if (shake > 0.01) look.x += (Math.random() - 0.5) * shake * 0.35;
    this.camera.lookAt(look);
    const targetFov = vehicle ? 67 + Math.min(9, Math.abs(vehicle.forwardSpeed) * 0.18) : 64;
    if (Math.abs(this.camera.fov - targetFov) > 0.03) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 3);
      this.camera.updateProjectionMatrix();
    }
  }

  updateTitle(dt) {
    this.titleAngle += dt * 0.022;
    const x = 112 + Math.sin(this.titleAngle) * 36;
    const z = 319 + Math.cos(this.titleAngle * 0.7) * 11;
    this.camera.position.set(x, 27 + Math.sin(this.titleAngle * 0.8) * 1.6, z);
    this.camera.lookAt(-24, 6.5, 72);
    this.initialized = false;
  }

  /** Used by deterministic screenshot staging to frame a still. */
  placeAt(x, y, z, lookX, lookY, lookZ) {
    this.freeze = true;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(lookX, lookY, lookZ);
  }
}
