// Police cruisers spawn on the grid, pathfind to Rafa, call in on-foot officers and lay
// down fire at three stars or more. They are the visible arm of the wanted system.
// One unit owns its car and the officers it has dropped off, and clean-up retires both.
import { Enemy } from './enemy.js';
import { Vehicle } from './vehicle.js';

export class PoliceUnit {
  constructor(game, spawnNodeIndex) {
    this.game = game;
    this.vehicle = null;
    this.path = [];
    this.repathClock = 0;
    this.deployed = false;
    this.officers = [];
    this.dead = false;
    this.spawnNodeIndex = spawnNodeIndex;
    this.shootClock = 1 + Math.random() * 1.5;
    this.spawn();
  }

  spawn() {
    const roads = this.game.roads;
    const startIndex = this.spawnNodeIndex;
    const start = roads.nodes[startIndex];
    const nextIndex = roads.nodes[startIndex].neighbors[Math.floor(Math.random() * roads.nodes[startIndex].neighbors.length)];
    const next = roads.nodes[nextIndex];
    const dir = roads.direction(startIndex, nextIndex);
    const x = start.x + dir.x * 4 - dir.z * 5.2;
    const z = start.z + dir.z * 4 + dir.x * 5.2;
    this.vehicle = new Vehicle(this.game, 'corsair', {
      x, z, heading: Math.atan2(-dir.x, -dir.z), mode: 'police', speed: 0,
    });
    this.vehicle.ai = { fromIndex: startIndex, nodeIndex: nextIndex };
    this.vehicle.tag = 'police';
    this.game.vehicles.push(this.vehicle);
    const playerNode = roads.nearestNode(this.game.player.position.x, this.game.player.position.z);
    this.path = roads.findPath(startIndex, playerNode);
    if (this.path.length < 2) this.path = [startIndex, nextIndex];
    this.targetNode = this.path[1];
  }

  get distanceToPlayer() {
    return Math.hypot(this.vehicle.position.x - this.game.player.position.x, this.vehicle.position.z - this.game.player.position.z);
  }

  deployOfficers() {
    if (this.deployed || !this.vehicle || this.vehicle.destroyed) return;
    this.deployed = true;
    this.vehicle.forwardSpeed = 0;
    const count = this.game.wanted.stars >= 3 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const side = i === 0 ? 1 : -1;
      const right = this.vehicle.rightVector;
      const officer = new Enemy(this.game, {
        kind: 'cop', x: this.vehicle.position.x + right.x * side * 2.1, z: this.vehicle.position.z + right.z * side * 2.1,
        heading: this.vehicle.heading + Math.PI * 0.1 * side,
      });
      this.game.enemies.push(officer);
      this.officers.push(officer);
    }
    this.game.audio.carDoor();
  }

  update(dt) {
    if (!this.vehicle || this.vehicle.destroyed) {
      if (!this.deployed && this.game.wanted.stars > 0) this.deployOfficers();
      this.officers = this.officers.filter((officer) => !officer.dead);
      if (!this.vehicle) this.dead = true;
      return;
    }
    const player = this.game.player;
    const distance = this.distanceToPlayer;
    const stars = this.game.wanted.stars;

    if (stars === 0) {
      this.cleanup();
      return;
    }

    this.repathClock -= dt;
    if (this.repathClock <= 0) {
      this.repathClock = 2.8;
      const roads = this.game.roads;
      const start = roads.nearestNode(this.vehicle.position.x, this.vehicle.position.z);
      const target = roads.nearestNode(player.position.x, player.position.z);
      const path = roads.findPath(start, target);
      if (path.length > 1) {
        this.path = path;
        this.pathIndex = 1;
      }
    }

    if (!this.deployed && distance < (stars >= 2 ? 23 : 14)) {
      this.deployOfficers();
    }

    if (this.deployed) {
      this.vehicle.forwardSpeed *= Math.exp(-4 * dt);
      this.vehicle.syncMesh(dt);
    } else if (stars >= 1) {
      let target = { x: player.position.x, z: player.position.z };
      if (!this.pathIndex) this.pathIndex = 1;
      if (this.path.length > 1 && this.pathIndex > 0 && this.pathIndex < this.path.length) {
        const from = this.path[this.pathIndex - 1];
        const to = this.path[this.pathIndex];
        if (from !== undefined && to !== undefined) {
          target = this.game.roads.laneTarget(from, to);
          if (Math.hypot(target.x - this.vehicle.position.x, target.z - this.vehicle.position.z) < 4.5) {
            this.pathIndex += 1;
            if (this.pathIndex >= this.path.length) {
              this.path = [];
              this.pathIndex = 0;
              target = { x: player.position.x, z: player.position.z };
            } else {
              const f = this.path[this.pathIndex - 1];
              const t = this.path[this.pathIndex];
              if (f !== undefined && t !== undefined) target = this.game.roads.laneTarget(f, t);
            }
          }
        } else {
          this.path = [];
          this.pathIndex = 0;
        }
      } else {
        this.path = [];
        this.pathIndex = 0;
      }
      if (distance < 11) {
        this.vehicle.forwardSpeed *= Math.exp(-5 * dt);
        this.vehicle.syncMesh(dt);
      } else {
        const speed = distance < 30 ? 10 : 24;
        this.vehicle.driveToward(target.x, target.z, speed, dt);
      }
    }

    this.shootClock -= dt;
    if (stars >= 3 && distance < 38 && this.shootClock <= 0 && this.game.hasLineOfSight(this.vehicle.position.x, this.vehicle.position.z, player.position.x, player.position.z)) {
      this.shootClock = 1.0 + Math.random() * 0.9;
      this.game.combat.policeShoot(this.vehicle);
    }

    this.officers = this.officers.filter((officer) => {
      if (officer.dead) {
        if (officer.deathClock > 20) {
          this.game.scene.remove(officer.group);
          return false;
        }
      }
      return true;
    });
    if (this.deployed && this.officers.length === 0) {
      this.cleanup();
    }
  }

  cleanup() {
    if (this.vehicle) {
      if (this.game.player.currentVehicle === this.vehicle) return;
      this.game.scene.remove(this.vehicle.mesh);
      const index = this.game.vehicles.indexOf(this.vehicle);
      if (index !== -1) this.game.vehicles.splice(index, 1);
      this.vehicle = null;
    }
    for (const officer of this.officers) {
      this.game.scene.remove(officer.group);
      const index = this.game.enemies.indexOf(officer);
      if (index !== -1) this.game.enemies.splice(index, 1);
    }
    this.officers = [];
    this.dead = true;
  }
}
