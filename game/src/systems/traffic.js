// AI traffic follows the street graph, turns at intersections, keeps a lane and slows
// for the car ahead. Any of these cars can be carjacked and becomes the player's machine.
// Cars far from the player are silently recycled so the street never empties out.
import { TRAFFIC } from '../config.js';
import { VEHICLE_TYPES, Vehicle, vehicleColor } from '../entities/vehicle.js';

const TRAFFIC_TYPES = ['marlin', 'marlin', 'gull', 'breeze', 'riptide', 'dune', 'sundown'];

export class TrafficSystem {
  constructor(game, random, count = TRAFFIC.count) {
    this.game = game;
    this.random = random;
    this.vehicles = [];
    this.spawnAccumulator = 0;
    for (let i = 0; i < count; i += 1) this.spawnCar(true);
  }

  spawnCar(initial = false) {
    const { roads } = this.game;
    const typeName = this.random.pick(TRAFFIC_TYPES);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const fromIndex = this.random.int(0, roads.nodes.length - 1);
      const from = roads.nodes[fromIndex];
      const nextIndex = this.random.pick(from.neighbors);
      if (nextIndex === undefined) continue;
      const to = roads.nodes[nextIndex];
      const dir = roads.direction(fromIndex, nextIndex);
      const rightX = -dir.z;
      const rightZ = dir.x;
      const t = this.random.float(0.12, 0.85);
      const x = from.x + (to.x - from.x) * t + rightX * TRAFFIC.laneOffset;
      const z = from.z + (to.z - from.z) * t + rightZ * TRAFFIC.laneOffset;
      if (Math.hypot(x - this.game.player.position.x, z - this.game.player.position.z) < 34) continue;
      const heading = Math.atan2(-dir.x, -dir.z);
      const car = new Vehicle(this.game, typeName, {
        x, z, heading, color: vehicleColor(typeName, this.random.next), mode: 'traffic',
        speed: this.random.float(TRAFFIC.minSpeed, TRAFFIC.maxSpeed),
      });
      car.ai = {
        fromIndex,
        nodeIndex: nextIndex,
        targetX: roads.laneTarget(fromIndex, nextIndex).x,
        targetZ: roads.laneTarget(fromIndex, nextIndex).z,
        cruise: this.random.float(TRAFFIC.minSpeed, TRAFFIC.maxSpeed + 2),
        speed: this.random.float(TRAFFIC.minSpeed, TRAFFIC.maxSpeed),
        stuck: 0,
      };
      car.tag = initial ? 'traffic' : null;
      this.vehicles.push(car);
      this.game.vehicles.push(car);
      return car;
    }
    return null;
  }

  removeVehicle(vehicle) {
    const index = this.vehicles.indexOf(vehicle);
    if (index !== -1) this.vehicles.splice(index, 1);
    if (vehicle.ai) vehicle.ai = null;
  }

  update(dt) {
    const roads = this.game.roads;
    for (const car of this.vehicles.slice()) {
      if (car.mode !== 'traffic' || car.destroyed) {
        this.removeVehicle(car);
        continue;
      }
      if (!car.ai) continue;
      const dx = car.ai.targetX - car.position.x;
      const dz = car.ai.targetZ - car.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 3.2) {
        const previous = car.ai.nodeIndex;
        const nextIndex = roads.randomNeighbor(previous, car.ai.fromIndex, this.random.next);
        if (nextIndex === undefined) continue;
        car.ai.fromIndex = previous;
        car.ai.nodeIndex = nextIndex;
        const target = roads.laneTarget(previous, nextIndex);
        car.ai.targetX = target.x;
        car.ai.targetZ = target.z;
        car.ai.cruise = this.random.float(TRAFFIC.minSpeed, TRAFFIC.maxSpeed + 2);
      }

      // Look ahead for the nearest traffic car in this lane and ease off.
      let wanted = car.ai.cruise;
      const forward = car.forwardVector;
      for (const other of this.vehicles) {
        if (other === car || other.destroyed) continue;
        const ox = other.position.x - car.position.x;
        const oz = other.position.z - car.position.z;
        const ahead = ox * forward.x + oz * forward.z;
        if (ahead > 0 && ahead < 11) {
          const side = Math.abs(ox * -forward.z + oz * forward.x);
          if (side < 2.1) { wanted = Math.min(wanted, Math.max(0, ahead * 0.65)); break; }
        }
      }
      // Yield near a junction if a player car is close, so traffic never drives through Rafa.
      const playerCar = this.game.player.currentVehicle;
      if (playerCar) {
        const pd = Math.hypot(playerCar.position.x - car.position.x, playerCar.position.z - car.position.z);
        if (pd < 8) wanted = Math.min(wanted, 4);
      }
      car.ai.speed += (wanted - car.ai.speed) * Math.min(1, dt * 2.8);
      if (car.ai.speed < 0.05) car.ai.speed = 0;
      car.driveToward(car.ai.targetX, car.ai.targetZ, Math.max(0, car.ai.speed), dt);

      if (Math.hypot(car.position.x - this.game.player.position.x, car.position.z - this.game.player.position.z) > 280) {
        this.recycle(car);
      }
    }
    // Keep the street population topped up as cars get stolen or wrecked.
    this.spawnAccumulator += dt;
    if (this.vehicles.length < TRAFFIC.count && this.spawnAccumulator > 1.5) {
      this.spawnAccumulator = 0;
      this.spawnCar(false);
    }
  }

  recycle(car) {
    const roads = this.game.roads;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const fromIndex = this.random.int(0, roads.nodes.length - 1);
      const from = roads.nodes[fromIndex];
      if (Math.hypot(from.x - this.game.player.position.x, from.z - this.game.player.position.z) < 70) continue;
      const nextIndex = this.random.pick(from.neighbors);
      if (nextIndex === undefined) continue;
      const dir = roads.direction(fromIndex, nextIndex);
      const to = roads.nodes[nextIndex];
      car.position.set(from.x + dir.x * 20 - dir.z * TRAFFIC.laneOffset, 0, from.z + dir.z * 20 + dir.x * TRAFFIC.laneOffset);
      car.heading = Math.atan2(-dir.x, -dir.z);
      car.forwardSpeed = 8;
      car.ai = {
        fromIndex,
        nodeIndex: nextIndex,
        targetX: roads.laneTarget(fromIndex, nextIndex).x,
        targetZ: roads.laneTarget(fromIndex, nextIndex).z,
        cruise: 11,
        speed: 8,
      };
      car.syncMesh(0);
      return;
    }
  }

  get count() {
    return this.vehicles.length;
  }
}

export function describeTrafficType(typeName) {
  return VEHICLE_TYPES[typeName]?.name ?? 'Car';
}
