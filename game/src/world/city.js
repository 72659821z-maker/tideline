// The city itself: sixteen blocks of sun-bleached buildings, a park, a working garage,
// a marina and a beach, with the AABB colliders the player, cars and bullets use.
// Geometry is added once at boot; only the collider list is queried every frame.
// Rooftop detail is what makes the skyline read at distance, so each block gets a few.
const ROOFTOP_DETAIL_PER_BLOCK = 4;
import { BLOCK_CENTRES_X, BLOCK_CENTRES_Z, PARK, GARAGE, MARINA, LIGHTHOUSE, BEACH_Z, WATER_Z,
  CITY_LIMIT_X, NORTH_LIMIT } from '../config.js';
import { makeRandom } from '../random.js';
import { facadeTexture, roofTexture, sidewalkTexture, grassTexture, sandTexture, signTexture } from './textures.js';
import {
  createPalmTree, createStreetLamp, createTrafficLight, createBench, createBin, createHydrant,
  createBusStop, createBeachUmbrella, createLifeguardTower, createPier, createBoat, createDock,
  createLighthouse, createFountain, createBillboard, createStreetSign,
} from './props.js';

const blockTypes = {
  '-180,-160': { style: 'warehouse', height: [9, 15], count: 2, label: 'WAREHOUSE ROW' },
  '-60,-160': { style: 'oldtown', height: [10, 21], count: 3, label: 'OLD TOWN' },
  '60,-160': { style: 'civic', height: [18, 34], count: 3, label: 'CIVIC CENTER' },
  '180,-160': { style: 'tower', height: [38, 68], count: 3, label: 'VISTA HEIGHTS' },
  '-180,-40': { style: 'westside', height: [10, 18], count: 3, label: 'WEST END' },
  '-60,-40': { style: 'market', height: [11, 23], count: 3, label: 'MARKET DISTRICT' },
  '60,-40': { style: 'downtown', height: [38, 82], count: 3, label: 'DOWNTOWN' },
  '180,-40': { style: 'neon', height: [20, 43], count: 3, label: 'NEON ROW' },
  '180,80': { style: 'design', height: [16, 32], count: 3, label: 'DESIGN DISTRICT' },
  '-60,200': { style: 'beachside', height: [7, 16], count: 3, label: 'BEACHSIDE' },
  '60,200': { style: 'beachside', height: [8, 17], count: 3, label: 'PIER 9' },
  '180,200': { style: 'beachside', height: [9, 19], count: 3, label: 'SOUTH POINT' },
};

const SIGN_NAMES = [
  ['CAFÉ SOL', 'COFFEE · SEA AIR', '#7a3b2e', '#ffd89a'],
  ['MIRAMAR', 'HOTEL & TERRACE', '#1f5b62', '#ffe6b1'],
  ['PALMA', 'ROOMS BY THE HOUR', '#7e3139', '#f8e6bd'],
  ['SALT & LIME', 'CEVICHE BAR', '#285d43', '#ffe9b8'],
  ['MERCADO', 'FRUIT · FLOWERS', '#a55a32', '#fff0c8'],
  ['STUDIO 9', 'PRINT · DESIGN', '#323c55', '#f0e6cc'],
  ['NIGHT OWL', 'RECORDS & TAPES', '#2f3d35', '#ffce7f'],
  ['LA MAREA', 'SEAFOOD GRILL', '#2d6570', '#ffe7b5'],
];

export function createCity(scene, seed = 20261117) {
  const rnd = makeRandom(seed);
  const colliders = [];
  const blocks = [];
  const signals = [];
  const palms = [];
  const landmarks = [];
  const materialCache = new Map();
  const signMaterials = SIGN_NAMES.map(([name, sub, bg, fg]) => {
    const texture = signTexture(name, sub, { bg, fg, border: '#f0d7a3', sub: '#ffcf87' });
    return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  });

  addBeachAndPromenade(scene, rnd, palms);
  addDocks(scene);
  const pier = createPier();
  scene.add(pier);
  landmarks.push({ name: 'PIER 9', x: 76, z: 296 });
  const lighthouse = createLighthouse(LIGHTHOUSE.x, LIGHTHOUSE.z);
  scene.add(lighthouse);
  landmarks.push({ name: 'THE NARROWS LIGHT', x: LIGHTHOUSE.x, z: LIGHTHOUSE.z });

  for (const bx of BLOCK_CENTRES_X) {
    for (const bz of BLOCK_CENTRES_Z) {
      const key = `${bx},${bz}`;
      const isPark = bx === PARK.x && bz === PARK.z;
      const isGarage = bx === 60 && bz === 80;
      const isMarina = bx === MARINA.x && bz === 200;
      const isCasa = bx === 180 && bz === -160;
      if (isPark) {
        addPark(scene, rnd, bx, bz, colliders, palms);
        blocks.push({ x: bx, z: bz, kind: 'park' });
        continue;
      }
      if (isGarage) {
        addGarage(scene, rnd, bx, bz, colliders, signsFor(materialCache), palms);
        blocks.push({ x: bx, z: bz, kind: 'garage' });
        continue;
      }
      if (isMarina) {
        addMarinaBlock(scene, rnd, bx, bz, colliders, palms, landmarks);
        blocks.push({ x: bx, z: bz, kind: 'marina' });
        continue;
      }
      if (isCasa) {
        addCasaSombra(scene, rnd, bx, bz, colliders, palms);
        addStreetFurniture(scene, rnd, bx, bz, signals, palms);
        blocks.push({ x: bx, z: bz, kind: 'motel', label: 'CASA SOMBRA' });
        continue;
      }

      const type = blockTypes[key] ?? { style: 'oldtown', height: [10, 22], count: 3, label: 'MARISOL BAY' };
      addSidewalkBlock(scene, bx, bz, type.style === 'beachside' ? 'sand-lot' : 'concrete');
      blocks.push({ x: bx, z: bz, kind: 'city', label: type.label });
      addGenericBuildings(scene, rnd, bx, bz, type, colliders, signMaterials, palms, landmarks);
      addStreetFurniture(scene, rnd, bx, bz, signals, palms);
    }
  }

  // Street furniture at major crossings, plus a few deliberate landmark views.
  for (const [ix, iz] of [[2, 2], [2, 3], [1, 2], [3, 2], [2, 1], [1, 1], [3, 3], [1, 3]]) {
    addIntersectionProps(scene, ix, iz, signals, palms, rnd);
  }
  addWaterfrontProps(scene, rnd, palms);
  addBillboards(scene);
  addBoundaryBuildings(scene, colliders);

  return { colliders, blocks, signals, palms, landmarks, groundHeight: cityGroundHeight };

  function addSidewalkBlock(targetScene, x, z, lotKind) {
    const sidewalkMat = new THREE.MeshStandardMaterial({ map: sidewalkTexture(), roughness: 0.96 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(102, 0.3, 102), sidewalkMat);
    slab.position.set(x, 0.02, z);
    slab.receiveShadow = true;
    targetScene.add(slab);
    const lotColor = lotKind === 'sand-lot' ? 0xd9c79e : 0xb9ad9c;
    const lotMap = sidewalkTexture().clone();
    lotMap.needsUpdate = true;
    lotMap.repeat.set(4, 4);
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: lotMap, color: lotColor, roughness: 1 }));
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(x, 0.2, z);
    lot.receiveShadow = true;
    targetScene.add(lot);
  }

  function signMaterial(name, sub, bg, fg) {
    const cacheKey = `${name}-${sub}`;
    if (!materialCache.has(cacheKey)) {
      const texture = signTexture(name, sub, { bg, fg, border: '#f0d7a3', sub: '#ffb86b' });
      materialCache.set(cacheKey, new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    }
    return materialCache.get(cacheKey);
  }

  function addGenericBuildings(targetScene, random, bx, bz, type, targetColliders, signMats, targetPalms, targetLandmarks) {
    const cells = [
      [-22, -22], [22, -21], [-21, 22], [22, 22],
    ];
    const shuffled = random.shuffled(cells);
    const count = random.int(type.count, Math.min(4, type.count + 1));
    let signPlaced = 0;
    const signIndex = random.int(0, SIGN_NAMES.length - 1);
    const sign = SIGN_NAMES[signIndex];
    for (let i = 0; i < count; i += 1) {
      const [ox, oz] = shuffled[i];
      const width = random.float(type.style === 'tower' ? 26 : 22, type.style === 'warehouse' ? 40 : 34);
      const depth = random.float(type.style === 'tower' ? 25 : 20, 35);
      const height = random.float(type.height[0], type.height[1]);
      const x = bx + ox + random.float(-4, 4);
      const z = bz + oz + random.float(-4, 4);
      const styleIndex = random.int(0, 7);
      const building = addBuilding(targetScene, x, z, width, depth, height, styleIndex, type.style, random);
      targetColliders.push({
        minX: x - width / 2, maxX: x + width / 2,
        minZ: z - depth / 2, maxZ: z + depth / 2,
        height, kind: 'building',
      });
      if (signPlaced < 1 && height < 34 && Math.abs(oz) > 10) {
        const face = oz > 0 ? 'south' : 'north';
        attachSign(targetScene, x, z, width, depth, height, face, signMats[signIndex], random);
        signPlaced += 1;
      }
    }
    // Every block gets one planted corner and a place to sit; it keeps the sidewalks alive.
    const corner = random.pick([[-40, -40], [40, -40], [-40, 40], [40, 40]]);
    const palm = createPalmTree(bx + corner[0], bz + corner[1], random.float(0.85, 1.15), random.int(1, 9999));
    targetScene.add(palm);
    targetPalms.push(palm);
    const benchX = bx + (corner[0] > 0 ? -14 : 14);
    const bench = createBench(benchX, bz + corner[1], corner[1] > 0 ? Math.PI : 0);
    targetScene.add(bench);
    if (random.chance(0.5)) {
      targetScene.add(createBin(bx + 37, bz + 36));
    }
    targetLandmarks.push({ name: type.label, x: bx, z: bz });
  }

  function addPark(targetScene, random, x, z, targetColliders, targetPalms) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(102, 0.3, 102), new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 }));
    lawn.position.set(x, 0.02, z);
    lawn.receiveShadow = true;
    targetScene.add(lawn);
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xd2c6ab, roughness: 1 });
    for (const [w, d] of [[12, 90], [90, 10]]) {
      const path = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMat);
      path.rotation.x = -Math.PI / 2;
      path.position.set(x, 0.19, z);
      path.receiveShadow = true;
      targetScene.add(path);
    }
    const fountain = createFountain(x, z + 9);
    targetScene.add(fountain);
    targetColliders.push({ minX: x - 4.4, maxX: x + 4.4, minZ: z + 4.6, maxZ: z + 13.4, height: 4, kind: 'fountain' });
    for (const [px, pz, s] of [[-34, -32, 1.15], [32, -31, 1.05], [-35, 34, 0.95], [33, 33, 1.2], [14, -20, 0.8]]) {
      const palm = createPalmTree(x + px, z + pz, s, random.int(1, 9999));
      targetScene.add(palm);
      targetPalms.push(palm);
    }
    for (const [bx, bz, rot] of [[-12, -18, 0.2], [15, 14, -0.4], [18, -25, 2.7]]) {
      targetScene.add(createBench(x + bx, z + bz, rot));
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshBasicMaterial({
      map: signTexture('CORAL PARK', 'A SMALL PIECE OF QUIET', { bg: '#1e5343', fg: '#ffe8b0', border: '#e6d19b' }),
      side: THREE.DoubleSide,
    }));
    sign.position.set(x, 2.1, z - 49);
    targetScene.add(sign);
    for (const sx of [-2.7, 2.7]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x334944 }));
      post.position.set(x + sx, 1.3, z - 49);
      targetScene.add(post);
    }
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x446b39, roughness: 1 });
    for (const [hx, hz, w, d] of [[-40, -48, 18, 1.2], [40, -48, 18, 1.2], [-48, 30, 1.2, 24], [48, -16, 1.2, 20]]) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), hedgeMat);
      hedge.position.set(x + hx, 0.62, z + hz);
      hedge.castShadow = true;
      targetScene.add(hedge);
    }
  }

  function addGarage(targetScene, random, x, z, targetColliders, signMats, targetPalms) {
    addSidewalkBlock(targetScene, x, z, 'concrete');
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd7c3a3, roughness: 0.95 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x9b8e79, roughness: 1 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(34, 9, 26), [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]);
    body.position.set(x - 12, 4.7, z + 20);
    body.castShadow = true;
    body.receiveShadow = true;
    targetScene.add(body);
    targetColliders.push({ minX: x - 29, maxX: x + 5, minZ: z + 7, maxZ: z + 33, height: 9, kind: 'garage' });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.6), new THREE.MeshStandardMaterial({ color: 0x394443, roughness: 0.7 }));
    door.position.set(x - 12, 3, z + 6.97);
    targetScene.add(door);
    for (let i = 0; i < 8; i += 1) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(12, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: 0xb6a787 }));
      line.position.set(x - 12, 0.24 + i * 0.68, z + 6.95);
      targetScene.add(line);
    }
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(17, 3.4), signMats.get('solano'));
    signFace.position.set(x - 12, 11.1, z + 7.1);
    targetScene.add(signFace);
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(17.4, 3.7, 0.25), new THREE.MeshStandardMaterial({ color: 0x203b3b }));
    signBoard.position.set(x - 12, 11.1, z + 6.95);
    targetScene.add(signBoard);
    const signGlow = new THREE.PointLight(0xffbf72, 12, 20, 2);
    signGlow.position.set(x - 12, 11, z + 6);
    targetScene.add(signGlow);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 3.3), new THREE.MeshStandardMaterial({ color: 0xad573d, roughness: 0.8 }));
    awning.position.set(x - 12, 6.1, z + 6);
    awning.rotation.x = -0.1;
    awning.castShadow = true;
    targetScene.add(awning);
    for (const [ox, oz] of [[16, -8], [23, -16], [29, 4], [-46, 0], [-42, 17]]) {
      const palm = createPalmTree(x + ox, z + oz, random.float(0.9, 1.2), random.int(1, 9999));
      targetScene.add(palm);
      targetPalms.push(palm);
    }
    targetScene.add(createBench(x - 38, z + 8, Math.PI / 2));
    targetScene.add(createBin(x + 30, z - 20));
    // Parked project car beside the roll-up door.
    const carSpot = new THREE.Mesh(new THREE.PlaneGeometry(7, 4), new THREE.MeshBasicMaterial({ color: 0x8c826f }));
    carSpot.rotation.x = -Math.PI / 2;
    carSpot.position.set(x + 10, 0.205, z + 10);
    targetScene.add(carSpot);
    // Tire stacks, a tool chest and the old forecourt lift give the home base a working life.
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f2323, roughness: 0.95 });
    for (const [tx, tz, height] of [[x - 31, z - 18, 3], [x - 31, z - 15.6, 2], [x - 27.5, z - 18, 2]]) {
      for (let i = 0; i < height; i += 1) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.17, 7, 12), tireMat);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(tx, 0.42 + i * 0.33, tz);
        tire.castShadow = true;
        targetScene.add(tire);
      }
    }
    const chest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.0), new THREE.MeshStandardMaterial({ color: 0x9c3d30, metalness: 0.25, roughness: 0.55 }));
    chest.position.set(x - 22, 0.75, z - 16);
    chest.castShadow = true;
    targetScene.add(chest);
    const liftRailMat = new THREE.MeshStandardMaterial({ color: 0xb8b29f, metalness: 0.55, roughness: 0.35 });
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 7), liftRailMat);
      rail.position.set(x - 15, 0.32, z - 20 + side * 1.2);
      rail.castShadow = true;
      targetScene.add(rail);
      for (const end of [-3, 3]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.18), liftRailMat);
        post.position.set(x - 15, 1.1, z - 20 + side * 1.2 + end);
        targetScene.add(post);
      }
    }
  }

  function addCasaSombra(targetScene, random, x, z, targetColliders, targetPalms) {
    addSidewalkBlock(targetScene, x, z, 'concrete');
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe0b49d, roughness: 0.93 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x9e8269, roughness: 1 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf1dfc2, roughness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x303536, roughness: 0.7 });
    // Two low wings wrap a motor court. The open centre is the mission's arena.
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(22, 9.6, 54), [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]);
    leftWing.position.set(x - 29, 5, z + 2);
    leftWing.castShadow = true;
    leftWing.receiveShadow = true;
    targetScene.add(leftWing);
    targetColliders.push({ minX: x - 40, maxX: x - 18, minZ: z - 25, maxZ: z + 29, height: 9.6, kind: 'motel' });
    const rearWing = new THREE.Mesh(new THREE.BoxGeometry(64, 8.4, 19), [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]);
    rearWing.position.set(x + 16, 4.4, z - 28);
    rearWing.castShadow = true;
    rearWing.receiveShadow = true;
    targetScene.add(rearWing);
    targetColliders.push({ minX: x - 16, maxX: x + 48, minZ: z - 37.5, maxZ: z - 18.5, height: 8.4, kind: 'motel' });
    // Courtyard-facing walkways, doors and railings.
    for (let i = 0; i < 4; i += 1) {
      const walk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 48), trimMat);
      walk.position.set(x - 16.5, 4.9, z + 2);
      walk.castShadow = true;
      targetScene.add(walk);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 48), darkMat);
      rail.position.set(x - 14.9, 5.5, z + 2);
      targetScene.add(rail);
      break;
    }
    for (let i = 0; i < 5; i += 1) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), darkMat);
      door.rotation.y = Math.PI / 2;
      door.position.set(x - 17.94, 2.35, z - 17 + i * 9);
      targetScene.add(door);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshStandardMaterial({ color: 0xffd38b, emissive: 0xffb356, emissiveIntensity: 1.5 }));
      lamp.position.set(x - 17.8, 3.6, z - 17 + i * 9);
      targetScene.add(lamp);
    }
    for (let i = 0; i < 3; i += 1) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), darkMat);
      door.position.set(x + 5 + i * 14, 2.3, z - 18.44);
      targetScene.add(door);
    }
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture('CASA SOMBRA', 'MOTEL · VACANCY · NO QUESTIONS', { bg: '#42222c', fg: '#ffd9a2', border: '#d6945d', sub: '#ff8866' }), side: THREE.DoubleSide });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(22, 5.5), signMat);
    sign.position.set(x - 29, 7.6, z + 28.8);
    targetScene.add(sign);
    const neon = new THREE.PointLight(0xff4b78, 16, 27, 2);
    neon.position.set(x - 29, 7, z - 25);
    targetScene.add(neon);
    const streetSign = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), signMat);
    streetSign.position.set(x - 8, 3.4, z + 51.2);
    targetScene.add(streetSign);
    // Turquoise pool and a few sun loungers.
    const poolDeck = new THREE.Mesh(new THREE.BoxGeometry(22, 0.25, 15), new THREE.MeshStandardMaterial({ color: 0xd7c8ab, roughness: 1 }));
    poolDeck.position.set(x + 25, 0.32, z + 18);
    poolDeck.receiveShadow = true;
    targetScene.add(poolDeck);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshStandardMaterial({ color: 0x32aeb1, roughness: 0.2, metalness: 0.15 }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x + 25, 0.46, z + 18);
    targetScene.add(pool);
    for (const [ox, oz, rot] of [[x + 11, z + 18, Math.PI / 2], [x + 39, z + 18, -Math.PI / 2], [x + 25, z + 9, 0]]) {
      const lounger = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 3), new THREE.MeshStandardMaterial({ color: 0xf2e4c4, roughness: 0.9 }));
      lounger.position.set(ox, 0.5, oz);
      lounger.rotation.y = rot;
      targetScene.add(lounger);
    }
    for (const [px, pz, scale] of [[x + 42, z + 39, 1.1], [x - 43, z + 41, 1.0], [x + 35, z - 12, 0.9]]) {
      const palm = createPalmTree(px, pz, scale, random.int(1, 9999));
      targetScene.add(palm);
      targetPalms.push(palm);
    }
    targetScene.add(createBench(x + 15, z + 37, 0));
  }

  function addMarinaBlock(targetScene, random, x, z, targetColliders, targetPalms, targetLandmarks) {
    addSidewalkBlock(targetScene, x, z, 'concrete');
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9d0b7, roughness: 0.92 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xa0937b, roughness: 1 });
    const club = new THREE.Mesh(new THREE.BoxGeometry(44, 10, 26), [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]);
    club.position.set(x - 10, 5.2, z + 15);
    club.castShadow = true;
    club.receiveShadow = true;
    targetScene.add(club);
    targetColliders.push({ minX: x - 32, maxX: x + 12, minZ: z + 2, maxZ: z + 28, height: 10, kind: 'marina-club' });
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture('MARISOL MARINA', 'CHARTERS · CEVICHE · ICE', { bg: '#164e56', fg: '#ffe6ae', border: '#f0d49d' }), side: THREE.DoubleSide });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(20, 4), signMat);
    sign.position.set(x - 10, 8.2, z + 1.88);
    targetScene.add(sign);
    const dock = createDock(x, z + 101, 7, 38, 0);
    targetScene.add(dock);
    const boats = [
      createBoat(x - 9, z + 96, 0xf2e9d1, 0.16, 0.9),
      createBoat(x + 12, z + 105, 0x2f7f8e, -0.2, 1.05),
      createBoat(x - 16, z + 116, 0xd87c4e, 0.32, 0.8),
    ];
    for (const boat of boats) targetScene.add(boat);
    for (const [px, pz, s] of [[-38, 38, 1.1], [-38, -36, 1.0], [37, 37, 1.2], [38, -33, 0.9]]) {
      const palm = createPalmTree(x + px, z + pz, s, random.int(1, 9999));
      targetScene.add(palm);
      targetPalms.push(palm);
    }
    targetScene.add(createBench(x + 25, z + 38, Math.PI));
    targetLandmarks.push({ name: 'MARISOL MARINA', x, z });
  }

  function addStreetFurniture(targetScene, random, bx, bz, targetSignals, targetPalms) {
    // Lamps at two block corners.
    targetScene.add(createStreetLamp(bx - 48, bz - 48, Math.PI / 2));
    targetScene.add(createStreetLamp(bx + 48, bz + 48, -Math.PI / 2));
    if (random.chance(0.55)) {
      targetScene.add(createHydrant(bx + 40, bz - 42));
    }
    if (random.chance(0.25)) {
      targetScene.add(createBusStop(bx - 43, bz + 30, Math.PI / 2));
    }
    // A few palms along the promenade blocks only, for a coastal read without clutter.
    if (bz === 200 && random.chance(0.9)) {
      const palm = createPalmTree(bx + (random.chance(0.5) ? -30 : 30), bz + 43, random.float(0.9, 1.2), random.int(1, 9999));
      targetScene.add(palm);
      targetPalms.push(palm);
    }
  }

  function addIntersectionProps(targetScene, ix, iz, targetSignals, targetPalms, random) {
    const x = [-240, -120, 0, 120, 240][ix];
    const z = [-220, -100, 20, 140, 260][iz];
    const signal = createTrafficLight(x + 11.5, z + 11.5, Math.PI, random.float(0, 1));
    targetScene.add(signal);
    targetSignals.push(signal.userData.signal);
    if (random.chance(0.55)) {
      const palm = createPalmTree(x - 15, z + 14, random.float(0.85, 1.2), random.int(1, 9999));
      targetScene.add(palm);
      targetPalms.push(palm);
    }
  }
}

function addBuilding(scene, x, z, width, depth, height, styleIndex, kind, random) {
  const facade = facadeTexture(styleIndex).clone();
  facade.needsUpdate = true;
  facade.wrapS = THREE.RepeatWrapping;
  facade.wrapT = THREE.RepeatWrapping;
  facade.repeat.set(Math.max(1, Math.round(width / 22)), Math.max(1, Math.round(height / 27)));
  const sideMat = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.86, metalness: 0.03 });
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTexture(), color: 0xcfc5b2, roughness: 0.98 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat]);
  body.position.set(x, 0.2 + height / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);

  const trimColor = kind === 'warehouse' ? 0x777a70 : 0xd2bfa1;
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.9 });
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(width + 0.7, 0.55, depth + 0.7), trimMat);
  parapet.position.set(x, 0.2 + height + 0.1, z);
  parapet.castShadow = true;
  scene.add(parapet);

  // Rooftop equipment catches the sun and gives the skyline real silhouettes.
  const acCount = random.int(1, 3);
  for (let i = 0; i < acCount; i += 1) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(random.float(1.2, 2.8), random.float(0.7, 1.4), random.float(1.2, 2.4)), new THREE.MeshStandardMaterial({ color: 0x8b918b, metalness: 0.2, roughness: 0.7 }));
    ac.position.set(x + random.float(-width * 0.3, width * 0.3), 0.2 + height + 0.9, z + random.float(-depth * 0.3, depth * 0.3));
    ac.castShadow = true;
    scene.add(ac);
  }
  if (kind === 'tower' || kind === 'downtown') {
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, random.float(4, 11), 5), new THREE.MeshStandardMaterial({ color: 0x515c5e, metalness: 0.45 }));
    antenna.position.set(x + width * 0.25, 0.2 + height + 5, z);
    scene.add(antenna);
  }
  // Balconies and awnings on the street-facing south side for low-rise blocks.
  if (height < 28 && kind !== 'warehouse') {
    const balconies = Math.min(3, Math.floor(height / 7));
    for (let i = 0; i < balconies; i += 1) {
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.12, 1.1), new THREE.MeshStandardMaterial({ color: 0x5f5c52, roughness: 0.8 }));
      balcony.position.set(x, 0.2 + 5.2 + i * 4.4, z + depth / 2 + 0.55);
      balcony.castShadow = true;
      scene.add(balcony);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.55, 0.06), new THREE.MeshStandardMaterial({ color: 0x6e6b5f, roughness: 0.6, metalness: 0.3 }));
      rail.position.set(x, 0.2 + 5.75 + i * 4.4, z + depth / 2 + 1.08);
      scene.add(rail);
    }
  }
  if (height < 16 && kind === 'warehouse') {
    const loading = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.45, 4.2), new THREE.MeshStandardMaterial({ color: 0x5c6361, roughness: 0.9 }));
    loading.position.set(x, 2.4, z + depth / 2 + 0.02);
    scene.add(loading);
  }
  return body;
}

function attachSign(scene, x, z, width, depth, height, face, material, random) {
  const signWidth = Math.min(width * 0.72, 8.2);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(signWidth, signWidth / 4), material);
  let px = x;
  let pz = z;
  let rot = 0;
  if (face === 'south') { pz = z + depth / 2 + 0.06; rot = 0; }
  if (face === 'north') { pz = z - depth / 2 - 0.06; rot = Math.PI; }
  if (face === 'east') { px = x + width / 2 + 0.06; rot = Math.PI / 2; }
  if (face === 'west') { px = x - width / 2 - 0.06; rot = -Math.PI / 2; }
  const y = Math.min(4.6, height - 2.2);
  sign.position.set(px, y, pz);
  sign.rotation.y = rot;
  scene.add(sign);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(signWidth * 1.12, 0.18, 1.6), new THREE.MeshStandardMaterial({ color: [0xad4d3c, 0x2c7a77, 0xdb9c4d][random.int(0, 2)], roughness: 0.8 }));
  if (face === 'south') awning.position.set(x, y - 1.1, z + depth / 2 + 0.8);
  if (face === 'north') awning.position.set(x, y - 1.1, z - depth / 2 - 0.8);
  if (face === 'east') { awning.rotation.y = Math.PI / 2; awning.position.set(x + width / 2 + 0.8, y - 1.1, z); }
  if (face === 'west') { awning.rotation.y = Math.PI / 2; awning.position.set(x - width / 2 - 0.8, y - 1.1, z); }
  awning.castShadow = true;
  scene.add(awning);
}

function addBeachAndPromenade(scene, random, palms) {
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(760, 72), new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.08, BEACH_Z + 31);
  sand.receiveShadow = true;
  scene.add(sand);

  const promenade = new THREE.Mesh(new THREE.BoxGeometry(660, 0.24, 9), new THREE.MeshStandardMaterial({ map: sidewalkTexture(), roughness: 1 }));
  promenade.position.set(0, 0.16, BEACH_Z + 2);
  promenade.receiveShadow = true;
  scene.add(promenade);

  const railMat = new THREE.MeshStandardMaterial({ color: 0xf1e5cd, roughness: 0.7 });
  for (const x of [-250, 250]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), railMat);
    post.position.set(x, 0.7, BEACH_Z + 6);
    scene.add(post);
  }
  for (let x = -300; x <= 300; x += 42) {
    const palm = createPalmTree(x + random.float(-4, 4), BEACH_Z + random.float(4, 11), random.float(0.9, 1.25), random.int(1, 9999));
    scene.add(palm);
    palms.push(palm);
  }
  for (let i = 0; i < 8; i += 1) {
    const x = random.float(-260, 260);
    const z = random.float(BEACH_Z + 14, WATER_Z - 8);
    if (Math.abs(x - 76) < 10) continue;
    const umbrella = createBeachUmbrella(x, z, [0xff7e5f, 0x46bfb7, 0xffce5c, 0xe85d7a][i % 4], random.float(0, 6));
    scene.add(umbrella);
  }
  scene.add(createLifeguardTower(-120, BEACH_Z + 27, -0.3));
  scene.add(createLifeguardTower(230, BEACH_Z + 22, Math.PI + 0.2));
  for (const [x, z, rot] of [[-20, BEACH_Z + 8, 0], [120, BEACH_Z + 7, Math.PI], [296, BEACH_Z + 8, 0]]) {
    scene.add(createBench(x, z, rot));
  }
}

function addDocks(scene) {
  const dock1 = createDock(-30, WATER_Z + 32, 5, 46, 0.05);
  scene.add(dock1);
  const dock2 = createDock(205, WATER_Z + 25, 4, 30, -0.12);
  scene.add(dock2);
  scene.add(createBoat(-40, WATER_Z + 25, 0xf0dfbd, 0.15, 1.0));
  scene.add(createBoat(216, WATER_Z + 30, 0x2d7b86, -0.2, 0.85));
  scene.add(createBoat(-340, WATER_Z + 52, 0xe57d4f, 0.35, 1.15));
}

function addWaterfrontProps(scene, random, palms) {
  // A running rail along the promenade where the city meets the sand.
  const railMat = new THREE.MeshStandardMaterial({ color: 0xe5d7bd, roughness: 0.8 });
  for (let x = -300; x < 300; x += 4.5) {
    if (Math.abs(x - 76) < 5) continue;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), railMat);
    post.position.set(x, 0.55, BEACH_Z - 1.8);
    scene.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(600, 0.09, 0.09), railMat);
  rail.position.set(0, 0.98, BEACH_Z - 1.8);
  scene.add(rail);
  for (const x of [-260, -140, 0, 140, 260]) {
    const palm = createPalmTree(x, BEACH_Z - 5, random.float(0.95, 1.2), random.int(1, 9999));
    scene.add(palm);
    palms.push(palm);
  }
}

function addBillboards(scene) {
  scene.add(createBillboard(-54, -66, 0.4, 'SUNSET 97.3', 'THE COAST SOUND', { bg: '#7b3560', fg: '#ffdca4', border: '#f6c986' }));
  scene.add(createBillboard(184, 119, -1.9, 'PALMA HOTEL', 'OCEAN VIEWS · COLD DRINKS', { bg: '#1c5860', fg: '#fff0ca', border: '#f2cd8b' }));
  scene.add(createBillboard(-6, 232, Math.PI, 'MARISOL BAY', 'WELCOME · DRIVE SAFE', { bg: '#17494c', fg: '#ffe5ac', border: '#ebd39d' }));
}

function addBoundaryBuildings(scene, colliders) {
  // Low industrial silhouettes wall the north edge of the playable grid.
  const matA = new THREE.MeshStandardMaterial({ color: 0xb9a78d, roughness: 1 });
  const matB = new THREE.MeshStandardMaterial({ color: 0x99a39b, roughness: 1 });
  for (let i = 0; i < 7; i += 1) {
    const w = 55 + (i % 3) * 18;
    const h = 10 + (i % 4) * 6;
    const x = -270 + i * 88;
    const z = NORTH_LIMIT - 22 - (i % 2) * 10;
    const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, 34), i % 2 ? matA : matB);
    block.position.set(x, h / 2, z);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - 17, maxZ: z + 17, height: h, kind: 'boundary' });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 1, 2), new THREE.MeshStandardMaterial({ color: 0x79817a, roughness: 1 }));
    roof.position.set(x, h + 0.4, z - 9);
    scene.add(roof);
  }
}

/** Builds the shop-sign name in the local material cache; called by the garage. */
function signsFor(cache) {
  const texture = signTexture('SOLANO MOTOR CO.', 'REPAIRS · RESPRAY · NO RECEIPTS', { bg: '#17393a', fg: '#ffe3a9', border: '#e9cb8a' });
  cache.set('solano', new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  return cache;
}

/** Circle-vs-AABB collision with the city's solid blocks. Returns the corrected position. */
export function resolveCityCollision(colliders, x, z, radius) {
  let px = x;
  let pz = z;
  for (const collider of colliders) {
    const closestX = Math.max(collider.minX, Math.min(px, collider.maxX));
    const closestZ = Math.max(collider.minZ, Math.min(pz, collider.maxZ));
    const dx = px - closestX;
    const dz = pz - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;
    if (distSq > 0.000001) {
      const dist = Math.sqrt(distSq);
      const push = radius - dist;
      px += (dx / dist) * push;
      pz += (dz / dist) * push;
    } else {
      // The centre is inside the box: escape by the nearest face.
      const left = px - collider.minX;
      const right = collider.maxX - px;
      const back = pz - collider.minZ;
      const front = collider.maxZ - pz;
      const nearest = Math.min(left, right, back, front);
      if (nearest === left) px = collider.minX - radius;
      else if (nearest === right) px = collider.maxX + radius;
      else if (nearest === back) pz = collider.minZ - radius;
      else pz = collider.maxZ + radius;
    }
  }
  return { x: px, z: pz };
}

export function cityGroundHeight(x, z) {
  if (z > BEACH_Z) return 0.08;
  const blockX = Math.round((x + 60) / 120) * 120 - 60;
  const blockZ = Math.round((z + 40) / 120) * 120 - 40;
  if (Math.abs(x - blockX) < 51 && Math.abs(z - blockZ) < 51) return 0.19;
  return 0;
}
