// The job chain: start markers, stage conditions, enemy waves, escape beats, dialogue
// cues, mission banners, cash rewards and autosaving story progress.
import { MISSIONS } from '../data/story.js';

export class MissionSystem {
  constructor(game) {
    this.game = game;
    this.availableIndex = game.meta.missionIndex ?? 0;
    this.mission = null;
    this.stageIndex = 0;
    this.stage = null;
    this.stageEnemies = [];
    this.killed = 0;
    this.totalEnemies = 0;
    this.objective = 'Meet Ivy at Solano Motor Co.';
    this.started = false;
    this.startCooldown = 2;
    this.storyComplete = false;
    this.markerPosition = new THREE.Vector3();
    this.markerVisible = true;
    this.buildMarker();
    this.refreshObjective();
    this.updateMarker(true);
  }

  buildMarker() {
    const group = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffca54, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.14, 8, 36), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.3;
    group.add(ring);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshBasicMaterial({ color: 0xffc44a, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.28;
    group.add(inner);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 1.35, 30, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd36d, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 15;
    group.add(beam);
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), new THREE.MeshStandardMaterial({ color: 0xffd268, emissive: 0xffae32, emissiveIntensity: 1.2, roughness: 0.25 }));
    diamond.position.y = 3.1;
    diamond.castShadow = false;
    group.add(diamond);
    this.markerDiamond = diamond;
    this.markerRing = ring;
    this.marker = group;
    this.game.scene.add(group);
  }

  get allComplete() {
    return this.availableIndex >= MISSIONS.length;
  }

  get availableMission() {
    return MISSIONS[this.availableIndex] ?? null;
  }

  get active() {
    return this.mission !== null;
  }

  get markerTarget() {
    if (this.mission) {
      if (!this.stage) return null;
      if (this.stage.type === 'escape') return null;
      if (this.stage.type === 'steal') {
        const vehicle = this.game.findVehicleByTag(this.stage.vehicleTag);
        if (vehicle) return { x: vehicle.position.x, z: vehicle.position.z };
        return { x: this.stage.x ?? 0, z: this.stage.z ?? 0 };
      }
      if (this.stage.type === 'kill') return { x: this.stage.x, z: this.stage.z };
      return { x: this.stage.x, z: this.stage.z };
    }
    if (this.availableMission) {
      return { x: this.availableMission.start.x, z: this.availableMission.start.z };
    }
    return null;
  }

  refreshObjective() {
    if (this.mission && this.stage) {
      if (this.stage.type === 'kill') {
        const total = Math.max(this.totalEnemies, this.stageEnemies.length);
        this.objective = `${this.stage.objective} — ${this.killed}/${total}`;
      } else if (this.stage.type === 'steal') {
        this.objective = this.stage.objective;
      } else if (this.stage.type === 'deliver' && this.stage.requireVehicleTag) {
        this.objective = this.stage.objective;
      } else {
        this.objective = this.stage.objective;
      }
    } else if (this.mission) {
      this.objective = this.mission.title;
    } else if (this.availableMission) {
      this.objective = `Meet Ivy at Solano Motor Co.`;
    } else {
      this.objective = 'The bay is quiet. Take a drive.';
    }
    this.game.missionObjective = this.objective;
    this.game.missionTitle = this.mission?.title ?? (this.availableMission?.title ?? null);
    this.game.missionActive = Boolean(this.mission);
    this.game.missionProgress = this.stage?.type === 'kill' ? `${this.killed}/${Math.max(this.totalEnemies, this.stageEnemies.length)}` : '';
  }

  update(dt, elapsed) {
    this.startCooldown = Math.max(0, this.startCooldown - dt);
    this.updateMarker(false, elapsed);
    if (this.mission) {
      this.checkStage(dt);
    } else if (this.availableMission && this.startCooldown <= 0 && this.game.wanted.stars === 0 && this.game.player.onFoot) {
      const start = this.availableMission.start;
      if (Math.hypot(this.game.player.position.x - start.x, this.game.player.position.z - start.z) < 6.5) {
        this.startMission(this.availableIndex);
      }
    }
  }

  updateMarker(force = false, elapsed = 0) {
    const target = this.markerTarget;
    if (!target || (this.mission && this.stage?.type === 'escape')) {
      if (this.marker.visible) this.marker.visible = false;
      this.markerVisible = false;
      return;
    }
    this.marker.visible = true;
    this.markerVisible = true;
    const ground = this.game.city.groundHeight(target.x, target.z);
    this.marker.position.set(target.x, ground, target.z);
    if (this.markerDiamond) {
      this.markerDiamond.rotation.y = elapsed * 1.8;
      this.markerDiamond.position.y = 3 + Math.sin(elapsed * 2.4) * 0.28;
    }
    if (this.markerRing) {
      this.markerRing.rotation.z = elapsed * 0.8;
      const pulse = 1 + Math.sin(elapsed * 3) * 0.05;
      this.markerRing.scale.setScalar(pulse);
    }
  }

  startMission(index) {
    if (this.mission || index >= MISSIONS.length) return;
    this.mission = MISSIONS[index];
    this.availableIndex = index;
    this.started = true;
    this.stageIndex = -1;
    this.stage = null;
    this.startCooldown = 0;
    this.game.showBanner({
      kicker: `JOB ${String(this.mission.number).padStart(2, '0')} // ${this.mission.chapter.toUpperCase()}`,
      title: this.mission.title.toUpperCase(),
      sub: 'Objective added to your map',
    }, 4.2);
    this.game.sayLines(this.mission.intro);
    this.game.audio.ensure();
    this.game.audio.mission();
    this.enterStage(0);
    this.game.showToast(`MISSION STARTED — ${this.mission.title.toUpperCase()}`);
  }

  enterStage(index) {
    if (!this.mission) return;
    if (index >= this.mission.stages.length) {
      this.completeMission();
      return;
    }
    this.stageIndex = index;
    this.stage = this.mission.stages[index];
    this.stageEnemies = [];
    this.killed = 0;
    this.totalEnemies = 0;
    this.refreshObjective();
    if (this.stage.onEnter) this.game.sayLines(this.stage.onEnter);
    if (this.stage.type === 'kill') {
      this.spawnStageEnemies();
    }
    if (this.stage.type === 'escape') {
      this.game.wanted.setStars(Math.max(this.stage.stars, this.game.wanted.stars));
      this.game.showBanner({
        kicker: 'THE HEAT IS ON',
        title: `${this.game.wanted.stars} STARS`,
        sub: 'Lose the police and wait for the stars to clear',
      }, 3.6);
      this.game.audio.ensure();
    } else {
      this.game.showBanner({
        kicker: `JOB ${String(this.mission.number).padStart(2, '0')}`,
        title: this.stage.objective.toUpperCase(),
        sub: this.stage.hint ?? 'Follow the gold marker',
      }, 3.4);
    }
    this.updateMarker(true, this.game.elapsed);
  }

  spawnStageEnemies() {
    const stage = this.stage;
    for (const spawn of stage.enemies ?? []) {
      const enemy = this.game.spawnEnemy({
        x: spawn.x,
        z: spawn.z,
        kind: spawn.kind ?? 'gang',
        boss: Boolean(spawn.boss),
        health: spawn.health,
        missionEnemy: true,
      });
      this.stageEnemies.push(enemy);
    }
    this.totalEnemies = this.stageEnemies.length;
    this.refreshObjective();
  }

  checkStage(dt) {
    if (!this.stage) return;
    const player = this.game.player;
    const stage = this.stage;
    if (stage.type === 'kill') {
      this.killed = this.stageEnemies.filter((enemy) => enemy.dead).length;
      this.refreshObjective();
      if (this.stageEnemies.length && this.killed >= this.stageEnemies.length) {
        this.completeStage();
      }
      return;
    }
    if (stage.type === 'goto') {
      if (Math.hypot(player.position.x - stage.x, player.position.z - stage.z) < stage.radius) {
        if (stage.onArrive) this.game.sayLines(stage.onArrive);
        this.completeStage();
      }
      return;
    }
    if (stage.type === 'steal') {
      const vehicle = player.currentVehicle;
      if (vehicle && vehicle.tag === stage.vehicleTag) {
        this.completeStage();
      }
      return;
    }
    if (stage.type === 'deliver') {
      const inVehicle = player.currentVehicle;
      if (Math.hypot(player.position.x - stage.x, player.position.z - stage.z) < stage.radius) {
        if (stage.requireVehicleTag) {
          if (inVehicle && inVehicle.tag === stage.requireVehicleTag) this.completeStage();
        } else {
          this.completeStage();
        }
      }
      return;
    }
    if (stage.type === 'escape') {
      if (this.game.wanted.stars === 0) this.completeStage();
    }
  }

  completeStage() {
    if (!this.mission) return;
    this.stageEnemies = [];
    this.game.audio.mission();
    if (this.stageIndex + 1 >= this.mission.stages.length) {
      this.completeMission();
    } else {
      this.enterStage(this.stageIndex + 1);
    }
  }

  completeMission() {
    if (!this.mission) return;
    const mission = this.mission;
    this.game.addCash(mission.reward);
    this.game.ammo = Math.min(999, this.game.ammo + 18);
    this.game.player.heal(30);
    this.game.audio.mission();
    this.game.audio.cash();
    this.game.showBanner({
      kicker: 'MISSION COMPLETE',
      title: mission.title.toUpperCase(),
      sub: `+${mission.reward.toLocaleString('en-US')} CASH · SAVED`,
    }, 6);
    this.game.sayLines(mission.outro);
    this.game.showToast(`PAYOUT $${mission.reward.toLocaleString('en-US')} — PROGRESS SAVED`);
    this.mission = null;
    this.stage = null;
    this.stageIndex = 0;
    this.stageEnemies = [];
    this.objective = '';
    this.availableIndex += 1;
    this.missionIndex = this.availableIndex;
    this.startCooldown = 9;
    this.game.meta.missionIndex = this.availableIndex;
    this.game.meta.cash = this.game.cash;
    this.game.saveProgress();
    if (mission.finale) {
      this.storyComplete = true;
      this.game.storyComplete = true;
      this.game.showBanner({
        kicker: 'STORY COMPLETE',
        title: 'THE BAY IS YOURS',
        sub: 'Free roam · police · traffic · the coast road at sunset',
      }, 8);
    }
    this.refreshObjective();
    this.updateMarker(true, this.game.elapsed);
  }

  /** Called by the game when a mission enemy dies so the counter reacts immediately. */
  onEnemyKilled() {
    if (this.stage?.type === 'kill') {
      this.killed = this.stageEnemies.filter((enemy) => enemy.dead).length;
      this.refreshObjective();
    }
  }

  onPlayerRespawn() {
    if (this.mission && this.stage?.type === 'kill') {
      // The fight resets if Rafa is put down mid-wave.
      this.game.startMissionRetry = { index: this.availableIndex, stage: this.stageIndex };
    }
  }
}
