// Deterministic screenshot scenes. ?shot=cover|chase|mission|drive sets the camera, the
// people, the cars and the HUD state, then freezes the world so the capture is repeatable.
// Any change here should keep the seed-7 framing intact for the shipped screenshots.
import { MISSIONS } from '../data/story.js';
import { Vehicle } from '../entities/vehicle.js';
import { Enemy } from '../entities/enemy.js';
import { animateWalk, poseAim, poseArmed } from '../world/characters.js';

function placePlayerOnFoot(game, x, z, heading, weapon = 'pistol') {
  const player = game.player;
  player.currentVehicle = null;
  player.dead = false;
  player.group.visible = true;
  player.position.set(x, game.city.groundHeight(x, z), z);
  player.heading = heading;
  player.group.position.set(x, player.position.y + 0.02, z);
  player.group.rotation.set(0, heading, 0);
  player.model.root.position.y = 0;
  player.model.leftLeg.rotation.x = 0;
  player.model.rightLeg.rotation.x = 0;
  player.setWeapon(weapon);
  if (weapon === 'pistol') {
    poseArmed(player.model);
    player.model.weapon.visible = true;
  }
}

function placeInCar(game, type, x, z, heading, color, speed) {
  const car = new Vehicle(game, type, { x, z, heading, color, mode: 'player', speed });
  car.driver = 'player';
  car.stolen = true;
  car.forwardSpeed = speed;
  car.wheelSpin = 4;
  game.vehicles.push(car);
  game.player.currentVehicle = car;
  game.player.position.set(x, game.city.groundHeight(x, z), z);
  game.player.heading = heading;
  game.player.group.visible = false;
  car.syncMesh(0);
  return car;
}

function placeCar(game, type, x, z, heading, color, options = {}) {
  const car = new Vehicle(game, type, {
    x, z, heading, color, mode: options.mode ?? 'parked', speed: options.speed ?? 0,
  });
  car.forwardSpeed = options.speed ?? 0;
  if (options.mode === 'police') car.tag = 'police';
  game.vehicles.push(car);
  if (options.traffic) {
    car.mode = 'traffic';
    car.ai = { speed: options.speed ?? 8 };
    game.traffic.vehicles.push(car);
  }
  car.syncMesh(0);
  return car;
}

function placePed(game, index, x, z, heading, fleeing = false) {
  const ped = game.pedestrians.pedestrians[index];
  if (!ped) return null;
  ped.dead = false;
  ped.position.set(x, 0, z);
  ped.heading = heading;
  ped.group.position.set(x, game.city.groundHeight(x, z) + 0.19, z);
  ped.group.rotation.set(0, heading, 0);
  if (fleeing) {
    ped.scare(x + 5, z + 4, 4);
    ped.model.leftArm.rotation.x = -2.2;
    ped.model.rightArm.rotation.x = -2.2;
    ped.model.leftArm.rotation.z = -0.4;
    ped.model.rightArm.rotation.z = 0.4;
  } else {
    ped.state = 'walk';
    animateWalk(ped.model, index * 1.7, 0.55);
  }
  return ped;
}

function setWaypoint(game, x, z) {
  const missions = game.missions;
  missions.markerPosition.set(x, 0, z);
  missions.markerVisible = true;
  missions.marker.visible = true;
  const ground = game.city.groundHeight(x, z);
  missions.marker.position.set(x, ground, z);
  if (missions.markerDiamond) {
    missions.markerDiamond.rotation.y = 0.8;
    missions.markerDiamond.position.y = 3.1;
  }
  missions.updateMarker(true, game.elapsed);
  missions.markerPosition.set(x, 0, z);
  missions.marker.position.set(x, ground, z);
  missions.marker.visible = true;
  missions.markerVisible = true;
}

function stageMission(game, missionIndex, stageIndex, objective, killed = 0, total = 0) {
  const mission = MISSIONS[missionIndex];
  const stage = mission.stages[stageIndex];
  const missions = game.missions;
  missions.availableIndex = missionIndex;
  missions.mission = mission;
  missions.stageIndex = stageIndex;
  missions.stage = stage;
  missions.stageEnemies = [];
  missions.killed = killed;
  missions.totalEnemies = total;
  missions.objective = objective ?? stage.objective;
  missions.markerVisible = stage.type !== 'escape';
  missions.refreshObjective();
  return { mission, stage };
}

function setBanner(game, kicker, title, sub) {
  game.missionBanner = { kicker, title, sub, duration: 8, time: 7 };
}

function hideTraffic(game) {
  for (const car of game.traffic.vehicles) car.mesh.visible = false;
}

function stageTraffic(game, type, x, z, heading, color, speed = 9) {
  const car = placeCar(game, type, x, z, heading, color, { mode: 'traffic', speed });
  car.forwardSpeed = speed;
  car.syncMesh(0);
  return car;
}

function finishShot(game, cameraPos, lookAt, fov = 62) {
  game.camera.fov = fov;
  game.camera.updateProjectionMatrix();
  game.cameraRig.placeAt(cameraPos.x, cameraPos.y, cameraPos.z, lookAt.x, lookAt.y, lookAt.z);
  game.updateSun(true);
  game.hud.show();
  game.freezeWorld = true;
}

function coverShot(game) {
  const player = game.player;
  placePlayerOnFoot(game, -3.8, 77, -0.16, 'pistol');
  poseArmed(player.model);
  player.model.weapon.visible = true;
  const car = placeCar(game, 'sundown', 2.2, 72.5, -0.05, 0xe85d47);
  car.stolen = true;
  game.cash = 12450;
  player.health = 84;
  game.ammo = 12;
  game.wanted.stars = 0;
  game.wanted.units = [];
  game.missions.mission = null;
  game.missions.stage = null;
  game.missions.stageIndex = 0;
  game.missions.availableIndex = 0;
  game.missions.killed = 0;
  game.missions.totalEnemies = 0;
  game.missions.refreshObjective();
  setWaypoint(game, 66, 72);
  game.missionBanner = null;

  hideTraffic(game);
  stageTraffic(game, 'breeze', -4.6, 58, Math.PI, 0xe9b84b, 10);
  stageTraffic(game, 'marlin', 4.5, 48, 0, 0x355c6d, 11);
  stageTraffic(game, 'gull', -4.6, 39, Math.PI, 0xd8a6a1, 9);
  stageTraffic(game, 'riptide', 4.5, 34, 0, 0x39414d, 8);

  placePed(game, 0, -12.5, 70, 0.2);
  placePed(game, 1, 12.5, 62, Math.PI - 0.2);
  placePed(game, 2, -12.5, 52, Math.PI, true);
  placePed(game, 3, 12.8, 50, 0.1);
  game.prompt = null;
  finishShot(game, { x: -10.4, y: 3.45, z: 90.5 }, { x: 1.8, y: 1.25, z: 66 }, 60);
}

function chaseShot(game) {
  const car = placeInCar(game, 'sundown', 1.8, -44, 0, 0xe85d47, 31);
  car.lane = 1;
  game.cash = 9820;
  game.player.health = 72;
  game.ammo = 24;
  game.wanted.stars = 3;
  game.wanted.units = [];
  stageMission(game, 1, 3, 'Lose the heat', 0, 0);
  game.missions.markerVisible = false;
  game.missions.marker.visible = false;
  setBanner(game, 'THE HEAT IS ON // 3 STARS', 'LOSE THE COPS', 'Wanted level 3 · cruisers responding');

  hideTraffic(game);
  stageTraffic(game, 'breeze', -4.6, -78, Math.PI, 0xe9b84b, 10);
  stageTraffic(game, 'marlin', 4.5, -90, 0, 0x355c6d, 11);

  const cop1 = placeCar(game, 'corsair', -4.0, -36, 0, 0x1e2c33, { mode: 'police', speed: 30 });
  const cop2 = placeCar(game, 'corsair', 5.0, -31, 0.03, 0x1e2c33, { mode: 'police', speed: 28 });
  const light1 = cop1.mesh.userData.lightbarMats ?? [];
  if (light1[0]) light1[0].emissiveIntensity = 4;
  if (light1[1]) light1[1].emissiveIntensity = 0.35;
  const light2 = cop2.mesh.userData.lightbarMats ?? [];
  if (light2[0]) light2[0].emissiveIntensity = 0.35;
  if (light2[1]) light2[1].emissiveIntensity = 4;
  game.wanted.units = [{ vehicle: cop1 }, { vehicle: cop2 }];

  placePed(game, 0, -12.8, -38, 0.1, true);
  placePed(game, 1, 12.8, -33, Math.PI, true);
  placePed(game, 2, -11.4, -18, 0.2, true);
  game.prompt = null;

  // A burst from the nearest cruiser, frozen in the air for the capture.
  const muzzle = new THREE.Vector3(-3.3, 1.55, -37.5);
  const target = new THREE.Vector3(1.8, 1.0, -43.5);
  game.effects.muzzleFlash(muzzle, target.clone().sub(muzzle).normalize());
  game.effects.tracer(muzzle, target);
  game.effects.emitSparks(new THREE.Vector3(1.8, 0.8, -42.5), 12, 0xffbf69, 3.5);
  game.effects.emitSmokePuff(new THREE.Vector3(1.8, 0.2, -43.5), 1.3, 0x88847b);
  finishShot(game, { x: 6.8, y: 2.7, z: -53 }, { x: 1.1, y: 1.25, z: -37.5 }, 64);
}

function missionShot(game) {
  placePlayerOnFoot(game, -178, 288.5, Math.PI, 'pistol');
  const player = game.player;
  player.health = 57;
  player.heading = Math.PI;
  player.group.rotation.y = Math.PI;
  poseAim(player.model);
  player.model.weapon.visible = true;
  game.cash = 6420;
  game.ammo = 9;
  game.wanted.stars = 2;
  game.wanted.units = [];
  stageMission(game, 2, 1, "Break up Pike's marina crew", 2, 4);
  setWaypoint(game, -180, 307);
  setBanner(game, 'JOB 03 // THE MARINA JOB', 'SALT IN THE WOUND', 'Break up Pike\'s marina crew — 2/4');

  const enemies = [
    new Enemy(game, { kind: 'gang', x: -184.5, z: 294, heading: Math.PI + 0.1 }),
    new Enemy(game, { kind: 'gang', x: -169.5, z: 296, heading: Math.PI - 0.2 }),
    new Enemy(game, { kind: 'gang', x: -178, z: 306, heading: Math.PI }),
    new Enemy(game, { kind: 'gang', x: -163, z: 288, heading: Math.PI - 0.4 }),
  ];
  enemies.forEach((enemy, index) => {
    game.enemies.push(enemy);
    if (index === 3) {
      enemy.dead = true;
      enemy.deathClock = 0.8;
      enemy.group.rotation.x = 1.4;
      enemy.group.rotation.z = -0.5;
      enemy.group.position.y = 0.13;
    } else {
      poseAim(enemy.model);
      enemy.model.weapon.visible = true;
    }
  });
  game.missions.stageEnemies = enemies;
  game.missions.totalEnemies = 4;
  game.missions.killed = 2;
  game.missions.refreshObjective();

  const muzzle = new THREE.Vector3(-178.4, 1.32, 287);
  const target = new THREE.Vector3(-184.5, 1.2, 294);
  game.effects.muzzleFlash(muzzle, target.clone().sub(muzzle).normalize());
  game.effects.tracer(muzzle, target);
  game.effects.emitSparks(target, 8, 0xc7362d, 2.2);
  game.effects.emitSmokePuff(new THREE.Vector3(-181, 0.3, 296), 1.5, 0x9c9588);
  const enemyMuzzle = new THREE.Vector3(-168.9, 1.35, 295);
  game.effects.muzzleFlash(enemyMuzzle, new THREE.Vector3(0, 0, -1));
  game.effects.tracer(enemyMuzzle, new THREE.Vector3(-178, 1.1, 289));
  placePed(game, 0, -160, 283, Math.PI, true);
  placePed(game, 1, -196, 285, Math.PI, true);
  game.prompt = null;
  hideTraffic(game);
  stageTraffic(game, 'dune', -198, 294, -Math.PI / 2, 0x4f7d78, 0);
  finishShot(game, { x: -175.2, y: 2.25, z: 280.5 }, { x: -178, y: 1.35, z: 295 }, 53);
}

function driveShot(game) {
  const car = placeInCar(game, 'sundown', 40, 264.2, -Math.PI / 2, 0xe85d47, 31);
  car.wheelSpin = 7;
  game.cash = 16400;
  game.player.health = 100;
  game.ammo = 24;
  game.wanted.stars = 0;
  game.wanted.units = [];
  stageMission(game, 4, 0, 'Drive to the Narrows Light', 0, 0);
  setWaypoint(game, 250, 304);
  game.missionBanner = null;

  hideTraffic(game);
  stageTraffic(game, 'breeze', 66, 264.2, -Math.PI / 2, 0xe9b84b, 12);
  stageTraffic(game, 'marlin', 70, 255.6, Math.PI / 2, 0x355c6d, 10);
  stageTraffic(game, 'dune', 108, 264.2, -Math.PI / 2, 0x4f7d78, 10);
  stageTraffic(game, 'gull', 128, 255.6, Math.PI / 2, 0xd8a6a1, 9);
  placePed(game, 0, 55, 281, -Math.PI / 2);
  placePed(game, 1, 73, 282, -Math.PI / 2);
  placePed(game, 2, 47, 280, Math.PI / 2);
  game.prompt = null;
  finishShot(game, { x: 31.5, y: 2.15, z: 259.2 }, { x: 44, y: 1.08, z: 264.6 }, 64);
}

export function stageShot(game, name) {
  game.startForShot();
  game.missions.marker.visible = false;
  game.missions.markerVisible = false;
  game.freezeWorld = true;
  switch (name) {
    case 'chase': chaseShot(game); break;
    case 'mission': missionShot(game); break;
    case 'drive': driveShot(game); break;
    case 'cover':
    default: coverShot(game); break;
  }
  game.hud.draw();
}
