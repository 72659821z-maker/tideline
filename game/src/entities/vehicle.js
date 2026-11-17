// Vehicle models and the arcade driving model: seven distinct machines, each with its own
// dimensions, engine, steering and grip. Local forward is -Z, so a yaw of 0 faces north.
// The same class drives traffic, police cruisers and Rafa's car; `mode` says which.
import { PLAYER } from '../config.js';

export const VEHICLE_TYPES = {
  sundown: {
    name: 'Sundown GT', category: 'Sports', length: 4.4, width: 1.98, height: 1.12,
    topSpeed: 48, reverseSpeed: 13, acceleration: 25, brake: 34, grip: 7.4, steer: 2.25,
    colors: [0xe85d47, 0x2d8f99, 0xe2c25a, 0xe8e3d5], weight: 'light',
  },
  marlin: {
    name: 'Marlin S4', category: 'Sedan', length: 4.5, width: 1.92, height: 1.38,
    topSpeed: 37, reverseSpeed: 11, acceleration: 15, brake: 26, grip: 8.2, steer: 1.95,
    colors: [0xd8d0bc, 0x355c6d, 0x8e3f38, 0x597a5c], weight: 'medium',
  },
  dune: {
    name: 'Dune Hauler', category: 'Pickup', length: 5.1, width: 2.16, height: 1.66,
    topSpeed: 31, reverseSpeed: 10, acceleration: 12, brake: 22, grip: 7.0, steer: 1.55,
    colors: [0x4f7d78, 0xc8a064, 0x835541, 0x66706b], weight: 'heavy',
  },
  breeze: {
    name: 'Breeze Cab', category: 'Taxi', length: 4.55, width: 1.95, height: 1.4,
    topSpeed: 34, reverseSpeed: 10, acceleration: 14, brake: 25, grip: 7.8, steer: 1.85,
    colors: [0xe9b84b, 0xe9b84b, 0xe9b84b], weight: 'medium',
  },
  riptide: {
    name: 'Riptide XL', category: 'SUV', length: 4.9, width: 2.14, height: 1.7,
    topSpeed: 33, reverseSpeed: 9, acceleration: 13, brake: 23, grip: 9.0, steer: 1.7,
    colors: [0x6a8b76, 0x39414d, 0xe0d4ba, 0xa84b42], weight: 'heavy',
  },
  gull: {
    name: 'Gull Compact', category: 'Compact', length: 3.7, width: 1.76, height: 1.26,
    topSpeed: 29, reverseSpeed: 10, acceleration: 16, brake: 28, grip: 8.8, steer: 2.1,
    colors: [0xd8a6a1, 0x6f9a98, 0xf0e5c8, 0x9e6f55], weight: 'light',
  },
  corsair: {
    name: 'Corsair P9', category: 'Police', length: 4.6, width: 1.98, height: 1.46,
    topSpeed: 44, reverseSpeed: 12, acceleration: 22, brake: 30, grip: 8.0, steer: 2.0,
    colors: [0x1e2c33], weight: 'medium',
  },
};

function paint(color, metalness = 0.18) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness });
}

function part(w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

function windowMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x284650, roughness: 0.13, metalness: 0.55 });
}

function wheelMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x161a1b, roughness: 0.84 });
}

function hubMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x959b98, roughness: 0.38, metalness: 0.7 });
}

/** Returns a full car group, with wheels and any police/taxi light materials exposed. */
export function createVehicleMesh(typeName, colorChoice) {
  const type = VEHICLE_TYPES[typeName] ?? VEHICLE_TYPES.marlin;
  const color = typeName === 'corsair' ? 0xe7e2d5 : colorChoice ?? type.colors[0];
  const group = new THREE.Group();
  const paintMat = paint(color);
  const glassMat = windowMaterial();
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x252b2c, roughness: 0.7 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xc4c2b4, roughness: 0.28, metalness: 0.8 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff3ca, emissive: 0xffe4a0, emissiveIntensity: 0.55 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x9d1e1e, emissive: 0xd42222, emissiveIntensity: 0.5 });
  const w = type.width;
  const l = type.length;

  const chassis = part(w, 0.44, l, paintMat);
  chassis.position.y = 0.55;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  const belt = part(w * 0.99, 0.22, l * 0.9, paintMat);
  belt.position.y = 0.84;
  belt.castShadow = true;
  group.add(belt);

  if (typeName === 'dune') {
    const cabin = part(w * 0.82, 0.62, l * 0.32, paintMat);
    cabin.position.set(0, 1.22, -l * 0.17);
    cabin.castShadow = true;
    group.add(cabin);
    const glass = part(w * 0.72, 0.38, l * 0.29, glassMat);
    glass.position.set(0, 1.3, -l * 0.17);
    group.add(glass);
    const bed = part(w * 0.88, 0.1, l * 0.42, trimMat);
    bed.position.set(0, 0.98, l * 0.25);
    group.add(bed);
    const tailgate = part(w * 0.9, 0.5, 0.12, paintMat);
    tailgate.position.set(0, 1.09, l * 0.48);
    group.add(tailgate);
    for (const sx of [-w * 0.44, w * 0.44]) {
      const rail = part(0.12, 0.36, l * 0.42, paintMat);
      rail.position.set(sx, 1.1, l * 0.25);
      group.add(rail);
    }
  } else if (typeName === 'sundown') {
    const cabin = part(w * 0.82, 0.42, l * 0.39, glassMat);
    cabin.position.set(0, 1.07, l * 0.02);
    cabin.castShadow = true;
    group.add(cabin);
    const roof = part(w * 0.73, 0.1, l * 0.28, paintMat);
    roof.position.set(0, 1.31, l * 0.04);
    group.add(roof);
    const spoiler = part(w * 0.76, 0.08, 0.36, trimMat);
    spoiler.position.set(0, 1.15, l * 0.45);
    group.add(spoiler);
    for (const sx of [-w * 0.32, w * 0.32]) {
      const stand = part(0.08, 0.22, 0.11, trimMat);
      stand.position.set(sx, 1.03, l * 0.45);
      group.add(stand);
    }
    const skirt = part(w * 1.01, 0.12, l * 0.82, trimMat);
    skirt.position.y = 0.38;
    group.add(skirt);
  } else if (typeName === 'riptide') {
    const cabin = part(w * 0.84, 0.64, l * 0.5, glassMat);
    cabin.position.set(0, 1.24, l * 0.05);
    cabin.castShadow = true;
    group.add(cabin);
    const roof = part(w * 0.8, 0.12, l * 0.45, paintMat);
    roof.position.set(0, 1.59, l * 0.05);
    group.add(roof);
    for (const sx of [-w * 0.28, w * 0.28]) {
      const rail = part(0.08, 0.1, l * 0.35, chromeMat);
      rail.position.set(sx, 1.7, l * 0.03);
      group.add(rail);
    }
  } else {
    const cabin = part(w * 0.84, 0.58, l * 0.46, glassMat);
    cabin.position.set(0, 1.2, l * 0.03);
    cabin.castShadow = true;
    group.add(cabin);
    const roof = part(w * 0.78, 0.13, l * 0.4, paintMat);
    roof.position.set(0, 1.53, l * 0.03);
    group.add(roof);
    if (typeName === 'breeze') {
      const taxiTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.24, 0.35), new THREE.MeshStandardMaterial({ color: 0xf3e4b0, roughness: 0.6 }));
      taxiTop.position.set(0, 1.72, l * 0.03);
      taxiTop.castShadow = true;
      group.add(taxiTop);
      const stripe = part(w * 1.001, 0.14, l * 0.94, new THREE.MeshStandardMaterial({ color: 0x2c3534, roughness: 0.7 }));
      stripe.position.y = 0.74;
      group.add(stripe);
    }
  }

  // Bumpers, lamps and plates.
  for (const z of [-l / 2 - 0.03, l / 2 + 0.03]) {
    const bumper = part(w * 0.95, 0.18, 0.18, chromeMat);
    bumper.position.set(0, 0.4, z);
    group.add(bumper);
  }
  for (const sx of [-w * 0.33, w * 0.33]) {
    const head = part(0.4, 0.15, 0.06, headMat);
    head.position.set(sx, 0.64, -l / 2 - 0.03);
    group.add(head);
    const tail = part(0.36, 0.14, 0.06, tailMat);
    tail.position.set(sx, 0.65, l / 2 + 0.03);
    group.add(tail);
  }
  const grille = part(w * 0.33, 0.2, 0.05, trimMat);
  grille.position.set(0, 0.53, -l / 2 - 0.06);
  group.add(grille);
  const plate = part(0.55, 0.16, 0.04, new THREE.MeshStandardMaterial({ color: 0xe9d8a6, roughness: 0.8 }));
  plate.position.set(0, 0.42, l / 2 + 0.13);
  group.add(plate);

  const wheelRadius = typeName === 'riptide' || typeName === 'dune' ? 0.45 : typeName === 'sundown' ? 0.37 : 0.4;
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.27, 14);
  const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.42, wheelRadius * 0.42, 0.285, 10);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * (w / 2 - 0.06), wheelRadius, sz * l * 0.31);
      const wheel = new THREE.Mesh(wheelGeo, wheelMaterial());
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      pivot.add(wheel);
      const hub = new THREE.Mesh(hubGeo, hubMaterial());
      hub.rotation.z = Math.PI / 2;
      pivot.add(hub);
      group.add(pivot);
      wheels.push({ pivot, wheel, front: sz < 0 });
    }
  }

  const lightbarMats = [];
  if (typeName === 'corsair') {
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x20272a, roughness: 0.55, metalness: 0.15 });
    // Black doors and hood over the white shell make the cruiser read instantly.
    for (const side of [-1, 1]) {
      const door = part(0.035, 0.52, l * 0.48, blackMat);
      door.position.set(side * (w / 2 + 0.01), 0.81, 0.08);
      group.add(door);
      const stripe = part(0.04, 0.12, l * 0.94, new THREE.MeshStandardMaterial({ color: 0x2b70b8, roughness: 0.5 }));
      stripe.position.set(side * (w / 2 + 0.012), 0.58, 0);
      group.add(stripe);
    }
    const hood = part(w * 0.84, 0.08, l * 0.24, blackMat);
    hood.position.set(0, 0.89, -l * 0.34);
    group.add(hood);
    const deck = part(w * 0.84, 0.08, l * 0.2, blackMat);
    deck.position.set(0, 0.9, l * 0.37);
    group.add(deck);
    const bar = part(1.65, 0.12, 0.46, trimMat);
    bar.position.set(0, 1.65, 0.02);
    group.add(bar);
    for (const [sx, color] of [[-0.47, 0xff241e], [0.47, 0x2478ff]]) {
      const lightMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3.2, roughness: 0.2 });
      const light = part(0.55, 0.24, 0.36, lightMat);
      light.position.set(sx, 1.8, 0.02);
      group.add(light);
      lightbarMats.push(lightMat);
    }
    const badge = part(0.4, 0.25, 0.05, new THREE.MeshStandardMaterial({ color: 0xd9b35c, metalness: 0.5, roughness: 0.4 }));
    badge.position.set(0, 1.2, -l / 2 - 0.02);
    group.add(badge);
    const number = part(1.2, 0.18, 0.04, new THREE.MeshStandardMaterial({ color: 0x1f2a2f, roughness: 0.6 }));
    number.position.set(0, 1.18, l / 2 + 0.04);
    group.add(number);
  }

  group.userData.lightbarMats = lightbarMats;
  group.userData.wheels = wheels;
  group.userData.type = typeName;
  return group;
}

export class Vehicle {
  constructor(game, typeName, options = {}) {
    this.game = game;
    this.typeName = typeName;
    this.type = VEHICLE_TYPES[typeName] ?? VEHICLE_TYPES.marlin;
    this.name = this.type.name;
    this.mesh = createVehicleMesh(typeName, options.color);
    this.position = new THREE.Vector3(options.x ?? 0, 0, options.z ?? 0);
    this.heading = options.heading ?? 0;
    this.forwardSpeed = options.speed ?? 0;
    this.lateralSpeed = 0;
    this.health = options.health ?? 160;
    this.maxHealth = this.health;
    this.mode = options.mode ?? 'parked';
    this.tag = options.tag ?? null;
    this.driver = options.driver ?? null;
    this.ai = null;
    this.destroyed = false;
    this.stolen = false;
    this.steerVisual = 0;
    this.wheelSpin = 0;
    this.braking = false;
    this.lastCrash = 0;
    this.mesh.position.copy(this.position);
    this.mesh.position.y = 0.02;
    this.mesh.rotation.y = this.heading;
    game.scene.add(this.mesh);
    this.syncMesh(0);
  }

  get speedKmh() {
    return Math.hypot(this.forwardSpeed, this.lateralSpeed) * 3.6;
  }

  get forwardVector() {
    return { x: -Math.sin(this.heading), z: -Math.cos(this.heading) };
  }

  get rightVector() {
    return { x: Math.cos(this.heading), z: -Math.sin(this.heading) };
  }

  jumpTo(x, z, heading = this.heading) {
    this.position.set(x, 0, z);
    this.heading = heading;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.syncMesh(0);
  }

  damage(amount, source = 'impact') {
    if (this.destroyed) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.destroyed = true;
      this.game.onVehicleDestroyed?.(this, source);
    }
  }

  enter(byPlayer = true) {
    if (this.destroyed) return false;
    this.mode = byPlayer ? 'player' : 'ai';
    this.driver = byPlayer ? 'player' : 'ai';
    this.mesh.userData.occupied = byPlayer;
    return true;
  }

  updatePlayer(dt, input, city) {
    const t = this.type;
    const throttle = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
    const steerInput = (input.down('KeyA') ? 1 : 0) - (input.down('KeyD') ? 1 : 0);
    const brake = input.down('Space');
    const handbrake = input.down('ShiftLeft') || input.down('ShiftRight');
    this.braking = brake;

    // Decompose the current velocity onto the old axes before turning.
    const oldForward = { x: -Math.sin(this.heading), z: -Math.cos(this.heading) };
    const oldRight = { x: Math.cos(this.heading), z: -Math.sin(this.heading) };
    let vx = oldForward.x * this.forwardSpeed + oldRight.x * this.lateralSpeed;
    let vz = oldForward.z * this.forwardSpeed + oldRight.z * this.lateralSpeed;

    const speedAbs = Math.abs(this.forwardSpeed);
    const steerAuthority = Math.min(1, speedAbs / 7) * (this.forwardSpeed >= 0 ? 1 : -1);
    const turn = steerInput * t.steer * steerAuthority * (handbrake ? 1.25 : 1);
    this.heading += turn * dt;

    const forward = { x: -Math.sin(this.heading), z: -Math.cos(this.heading) };
    const right = { x: Math.cos(this.heading), z: -Math.sin(this.heading) };
    this.forwardSpeed = vx * forward.x + vz * forward.z;
    this.lateralSpeed = vx * right.x + vz * right.z;

    if (throttle > 0) {
      const engine = t.acceleration * (1 - Math.min(0.68, Math.max(0, this.forwardSpeed) / t.topSpeed * 0.68));
      this.forwardSpeed += engine * throttle * dt;
    } else if (throttle < 0) {
      if (this.forwardSpeed > 1.5) this.forwardSpeed -= t.brake * 0.55 * dt;
      else this.forwardSpeed += t.acceleration * 0.55 * throttle * dt;
    }
    if (brake) {
      const decel = t.brake * (Math.abs(this.forwardSpeed) > 0.4 ? 1 : 0);
      this.forwardSpeed -= Math.sign(this.forwardSpeed) * decel * dt;
      if (Math.abs(this.forwardSpeed) < 0.2) this.forwardSpeed = 0;
    }
    if (handbrake) {
      this.forwardSpeed *= Math.exp(-1.1 * dt);
    }

    this.forwardSpeed *= Math.exp(-0.2 * dt);
    if (!throttle && !brake) this.forwardSpeed -= Math.sign(this.forwardSpeed) * Math.min(Math.abs(this.forwardSpeed), 2.0 * dt);
    this.forwardSpeed = Math.max(-t.reverseSpeed, Math.min(t.topSpeed, this.forwardSpeed));
    const grip = handbrake ? t.grip * 0.16 : t.grip;
    this.lateralSpeed *= Math.exp(-grip * dt);

    const worldVx = forward.x * this.forwardSpeed + right.x * this.lateralSpeed;
    const worldVz = forward.z * this.forwardSpeed + right.z * this.lateralSpeed;
    const nextX = this.position.x + worldVx * dt;
    const nextZ = this.position.z + worldVz * dt;
    const radius = Math.max(1.1, this.type.width * 0.62);
    const resolved = this.game.resolveCollision(nextX, nextZ, radius);
    const hitWall = Math.abs(resolved.x - nextX) + Math.abs(resolved.z - nextZ) > 0.02;
    if (hitWall) {
      this.position.x = resolved.x;
      this.position.z = resolved.z;
      this.forwardSpeed *= -0.22;
      this.lateralSpeed *= 0.2;
      if (this.game.elapsed - this.lastCrash > 0.5) {
        this.lastCrash = this.game.elapsed;
        this.game.onCarCrash(this, Math.abs(worldVx) + Math.abs(worldVz));
      }
    } else {
      this.position.x = nextX;
      this.position.z = nextZ;
    }
    this.position.x = Math.max(-316, Math.min(316, this.position.x));
    this.position.z = Math.max(-282, Math.min(350, this.position.z));

    // Handbrake and hard cornering paint the road with tire smoke.
    const slip = Math.abs(this.lateralSpeed);
    if ((handbrake && Math.abs(this.forwardSpeed) > 6) || slip > 4.5) {
      this.game.effects.emitTireSmoke(this.position, this.heading);
    }
    this.steerVisual = steerInput * 0.45;
    this.wheelSpin += this.forwardSpeed * dt * 2.4;
    this.syncMesh(dt);
  }

  syncMesh(dt = 0) {
    const ground = this.game.city ? this.game.city.groundHeight(this.position.x, this.position.z) : 0;
    this.mesh.position.set(this.position.x, ground + 0.02, this.position.z);
    this.mesh.rotation.y = this.heading;
    const wheels = this.mesh.userData.wheels ?? [];
    for (const item of wheels) {
      item.pivot.rotation.y = item.front ? this.steerVisual : 0;
      item.wheel.rotation.x = this.wheelSpin;
    }
    const lightbar = this.mesh.userData.lightbarMats ?? [];
    if (lightbar.length) {
      const pulse = Math.sin(this.game.elapsed * 12) > 0;
      lightbar[0].emissiveIntensity = pulse ? 4 : 0.4;
      lightbar[1].emissiveIntensity = pulse ? 0.4 : 4;
    }
  }

  /** Traffic and police cars get a simple heading-aligned cruise and steering visual. */
  driveToward(targetX, targetZ, speed, dt) {
    const dx = targetX - this.position.x;
    const dz = targetZ - this.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.01) return;
    const desired = Math.atan2(-dx, -dz);
    let delta = desired - this.heading;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const turn = Math.max(-2.4, Math.min(2.4, delta)) * dt * 2.4;
    this.heading += turn;
    this.forwardSpeed = speed;
    this.position.x += -Math.sin(this.heading) * speed * dt;
    this.position.z += -Math.cos(this.heading) * speed * dt;
    this.position.x = Math.max(-316, Math.min(316, this.position.x));
    this.position.z = Math.max(-282, Math.min(350, this.position.z));
    this.steerVisual = Math.max(-0.4, Math.min(0.4, delta));
    this.wheelSpin += speed * dt * 2.2;
    this.syncMesh(dt);
  }
}

/** A palette helper used by traffic and parked cars. */
export function vehicleColor(typeName, random) {
  const colors = VEHICLE_TYPES[typeName].colors;
  return colors[Math.floor(random() * colors.length)];
}

export function nearestVehicle(vehicles, x, z, maxDistance = 3.6) {
  let best = null;
  let bestD = maxDistance;
  for (const vehicle of vehicles) {
    if (vehicle.destroyed || vehicle.mode === 'player') continue;
    const d = Math.hypot(vehicle.position.x - x, vehicle.position.z - z);
    if (d < bestD) { bestD = d; best = vehicle; }
  }
  return { vehicle: best, distance: bestD };
}

export const PLAYER_CAR_MARGIN = PLAYER.radius + 0.8;
