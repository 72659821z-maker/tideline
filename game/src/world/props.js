// Street furniture and coastal landmarks, all procedurally modelled: palms, lamps,
// traffic lights, benches, beach umbrellas, the pier, marina boats and the lighthouse.
// Everything here is decoration: props never add colliders the player can snag on.
import { signTexture } from './textures.js';
import { makeRandom } from '../random.js';

const materials = {};
function mat(name, color, options = {}) {
  if (!materials[name]) materials[name] = new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...options });
  return materials[name];
}
function basic(name, color, options = {}) {
  const key = `basic-${name}`;
  if (!materials[key]) materials[key] = new THREE.MeshBasicMaterial({ color, ...options });
  return materials[key];
}

const GEO = {};
function geometry(name, build) {
  if (!GEO[name]) GEO[name] = build();
  return GEO[name];
}

function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function leafGeometry() {
  const segments = 7;
  const positions = [];
  const indices = [];
  const uvs = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const z = t * 4.6;
    const width = Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.72 + 0.03;
    const y = 0.35 - t * t * 1.35;
    positions.push(-width, y, z, width, y, z);
    uvs.push(0, t, 1, t);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createPalmTree(x, z, scale = 1, seed = 1, options = {}) {
  const rnd = makeRandom(seed);
  const group = new THREE.Group();
  group.position.set(x, options.y ?? 0, z);

  const trunkGeo = new THREE.CylinderGeometry(0.17, 0.34, 7.2, 7, 5);
  const positions = trunkGeo.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const y = positions.getY(i);
    const t = (y + 3.6) / 7.2;
    positions.setX(i, positions.getX(i) + Math.sin(t * 1.8) * 0.55 + t * 0.18);
    positions.setZ(i, positions.getZ(i) + Math.cos(t * 1.1) * 0.16);
  }
  trunkGeo.computeVertexNormals();
  const trunk = shadowed(new THREE.Mesh(trunkGeo, mat('palm-trunk', 0x8c6545, { roughness: 0.95 })));
  group.add(trunk);

  const crown = new THREE.Group();
  crown.position.set(0.55, 3.55, 0.08);
  const leafMats = [mat('palm-leaf', 0x4d7f3f, { roughness: 0.9, side: THREE.DoubleSide }), mat('palm-leaf-2', 0x3e6f38, { roughness: 0.9, side: THREE.DoubleSide })];
  const leafGeo = geometry('palm-leaf', leafGeometry);
  const leafCount = 8;
  for (let i = 0; i < leafCount; i += 1) {
    const leaf = shadowed(new THREE.Mesh(leafGeo, leafMats[i % 2]), true, false);
    leaf.rotation.y = (i / leafCount) * Math.PI * 2 + rnd.float(-0.16, 0.16);
    leaf.rotation.x = rnd.float(-0.22, 0.12);
    leaf.rotation.z = rnd.float(-0.18, 0.18);
    leaf.scale.setScalar(rnd.float(0.82, 1.12));
    crown.add(leaf);
  }
  for (let i = 0; i < 4; i += 1) {
    const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 5), mat('coconut', 0x5a4328));
    coconut.position.set(rnd.float(-0.4, 0.4), -0.2, rnd.float(-0.4, 0.4));
    crown.add(coconut);
  }
  group.add(crown);
  group.scale.setScalar(scale);
  group.rotation.y = rnd.float(0, Math.PI * 2);
  return group;
}

export function createStreetLamp(x, z, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const pole = shadowed(new THREE.Mesh(geometry('lamp-pole', () => new THREE.CylinderGeometry(0.08, 0.13, 6.4, 6)), mat('lamp-metal', 0x3d4b4d, { metalness: 0.4, roughness: 0.45 })));
  pole.position.y = 3.2;
  group.add(pole);
  const arm = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.09), mat('lamp-metal', 0x3d4b4d)));
  arm.position.set(0.9, 6.25, 0);
  group.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.34), basic('lamp-glow', 0xffe7ad));
  head.position.set(1.75, 6.14, 0);
  group.add(head);
  return group;
}

/** One three-lamp traffic signal with live materials, placed at a street corner. */
export function createTrafficLight(x, z, rotation = 0, phase = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 4.8, 7), mat('signal-pole', 0x2f3b3b, { metalness: 0.4 })));
  pole.position.y = 2.4;
  group.add(pole);
  const arm = shadowed(new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.12, 0.12), mat('signal-pole', 0x2f3b3b)));
  arm.position.set(1.7, 4.7, 0);
  group.add(arm);
  const box = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.3, 0.46), mat('signal-box', 0x1d2828)));
  box.position.set(3.3, 4.25, 0);
  group.add(box);

  const redMat = new THREE.MeshStandardMaterial({ color: 0x4a1814, emissive: 0xff2a1b, emissiveIntensity: 0 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0x4a3c14, emissive: 0xffb52f, emissiveIntensity: 0 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x15401e, emissive: 0x4eff74, emissiveIntensity: 0 });
  for (const [y, m] of [[4.65, redMat], [4.25, yellowMat], [3.85, greenMat]]) {
    const light = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), m);
    light.position.set(3.3, y, 0.235);
    group.add(light);
  }
  group.userData.signal = { redMat, yellowMat, greenMat, phase };
  return group;
}

export function createBench(x, z, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const wood = mat('bench-wood', 0x875a36, { roughness: 0.9 });
  const seat = shadowed(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.65), wood));
  seat.position.y = 0.55;
  group.add(seat);
  const back = shadowed(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 0.1), wood));
  back.position.set(0, 0.85, -0.28);
  group.add(back);
  for (const sx of [-0.83, 0.83]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.52), mat('bench-metal', 0x354041, { metalness: 0.4 }));
    leg.position.set(sx, 0.28, 0);
    group.add(leg);
  }
  return group;
}

export function createBin(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.9, 8), mat('bin', 0x2c5a55, { metalness: 0.3 })));
  body.position.y = 0.45;
  group.add(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.08, 8), mat('bin-lid', 0x1e3e3a));
  lid.position.y = 0.94;
  group.add(lid);
  return group;
}

export function createHydrant(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.7, 8), mat('hydrant', 0xd35a3d)));
  body.position.y = 0.35;
  group.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.2, 8), mat('hydrant-cap', 0xe6c56a));
  cap.position.y = 0.81;
  group.add(cap);
  return group;
}

export function createBusStop(x, z, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 0.08), new THREE.MeshStandardMaterial({ color: 0x9fd4d4, transparent: true, opacity: 0.33, roughness: 0.2 }));
  glass.position.set(0, 1.4, -0.55);
  group.add(glass);
  for (const sx of [-1.64, 1.64]) {
    const post = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.7, 0.1), mat('bench-metal', 0x354041)));
    post.position.set(sx, 1.35, -0.55);
    group.add(post);
  }
  const roof = shadowed(new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.14, 1.1), mat('bus-roof', 0xf1d8a9)));
  roof.position.set(0, 2.75, -0.2);
  group.add(roof);
  const bench = createBench(0, 0, 0);
  bench.position.z = 0.2;
  bench.scale.setScalar(0.8);
  group.add(bench);
  return group;
}

export function createBeachUmbrella(x, z, color = 0xff7e5f, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 6), mat('umbrella-pole', 0xf1e8d0));
  pole.position.y = 1.4;
  group.add(pole);
  const canopy = shadowed(new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.55, 12, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide })));
  canopy.position.y = 2.75;
  group.add(canopy);
  const towel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.035, 2.2), new THREE.MeshStandardMaterial({ color: 0xf5d490, roughness: 1 }));
  towel.position.set(1.4, 0.03, 0.4);
  towel.rotation.y = 0.3;
  group.add(towel);
  return group;
}

export function createLifeguardTower(x, z, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const deckMat = mat('lifeguard-deck', 0xd8c49c);
  const deck = shadowed(new THREE.Mesh(new THREE.BoxGeometry(4, 0.25, 4), deckMat));
  deck.position.y = 1.55;
  group.add(deck);
  for (const sx of [-1.7, 1.7]) for (const sz of [-1.7, 1.7]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.7, 0.18), deckMat);
    leg.position.set(sx, 0.8, sz);
    group.add(leg);
  }
  const hut = shadowed(new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.7, 2.6), new THREE.MeshStandardMaterial({ color: 0xe45d45, roughness: 0.85 })));
  hut.position.y = 2.45;
  group.add(hut);
  const roof = shadowed(new THREE.Mesh(new THREE.ConeGeometry(2.5, 0.9, 4), mat('lifeguard-roof', 0xf4ead2)));
  roof.position.y = 3.7;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
  return group;
}

export function createPier() {
  const group = new THREE.Group();
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x9e7c56, roughness: 0.95 });
  for (let z = 294; z < 382; z += 1.15) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.18, 1.0), plankMat);
    plank.position.set(76, 0.9, z);
    plank.receiveShadow = true;
    group.add(plank);
  }
  const pileMat = new THREE.MeshStandardMaterial({ color: 0x72553b, roughness: 1 });
  for (let z = 296; z < 382; z += 8) {
    for (const x of [72.8, 79.2]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.3, 4.8, 7), pileMat);
      pile.position.set(x, -0.8, z);
      group.add(pile);
    }
  }
  for (const x of [72.6, 79.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 86), plankMat);
    rail.position.set(x, 1.85, 338);
    group.add(rail);
    for (let z = 296; z < 382; z += 5) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), plankMat);
      post.position.set(x, 1.42, z);
      group.add(post);
    }
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), new THREE.MeshBasicMaterial({ map: signTexture('PIER 9', 'FISH · FUEL · NO QUESTIONS', { bg: '#12373c', fg: '#ffe6ae' }), side: THREE.DoubleSide }));
  sign.position.set(76, 3.1, 295);
  group.add(sign);
  const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.2, 0.15), plankMat);
  signPost.position.set(73.7, 1.6, 295);
  group.add(signPost);
  return group;
}

export function createBoat(x, z, color, rotation = 0, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  group.scale.setScalar(scale);
  const hull = shadowed(new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.1, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.15 })));
  hull.position.y = 0.3;
  group.add(hull);
  const bow = shadowed(new THREE.Mesh(new THREE.ConeGeometry(1.65, 3.3, 4), new THREE.MeshStandardMaterial({ color, roughness: 0.5 })));
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.3, 4.7);
  group.add(bow);
  const cabin = shadowed(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 2.8), new THREE.MeshStandardMaterial({ color: 0xf3ead6, roughness: 0.7 })));
  cabin.position.set(0, 1.35, -0.9);
  group.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.04), new THREE.MeshStandardMaterial({ color: 0x294a59, metalness: 0.4, roughness: 0.15 }));
  glass.position.set(0, 1.45, 0.52);
  group.add(glass);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 5.5, 5), mat('boat-metal', 0xddddcf));
  mast.position.set(0, 3.8, -1.3);
  group.add(mast);
  return group;
}

export function createDock(x, z, width, length, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  for (let i = 0; i < length; i += 1.1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, 0.95), new THREE.MeshStandardMaterial({ color: 0x8b6d4e, roughness: 1 }));
    plank.position.set(0, 0.55, i - length / 2);
    plank.receiveShadow = true;
    group.add(plank);
  }
  for (let i = 0; i < length; i += 7) {
    for (const sx of [-width / 2 + 0.2, width / 2 - 0.2]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.2, 6), mat('dock-pile', 0x5f4a34));
      pile.position.set(sx, -0.35, i - length / 2);
      group.add(pile);
    }
  }
  return group;
}

export function createLighthouse(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const base = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.1, 2, 18), mat('lighthouse-base', 0xcfb995)));
  base.position.y = 1;
  group.add(base);
  const tower = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(2.1, 3.1, 15, 18), mat('lighthouse-white', 0xf4ecdc, { roughness: 0.75 })));
  tower.position.y = 9.4;
  group.add(tower);
  for (const [y, h] of [[6.1, 2.2], [11.3, 2.2]]) {
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.55 - (y - 1) * 0.04, 2.62 - (y - 1) * 0.04, h, 18), mat('lighthouse-red', 0xd94f42));
    stripe.position.y = y;
    group.add(stripe);
  }
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.35, 18), mat('lighthouse-metal', 0x394747));
  deck.position.y = 17.1;
  group.add(deck);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.1, 12), new THREE.MeshStandardMaterial({ color: 0xffe6a8, emissive: 0xffc95d, emissiveIntensity: 1.8, roughness: 0.3 }));
  lantern.position.y = 18.3;
  group.add(lantern);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2, 1.7, 12), mat('lighthouse-red', 0xd94f42));
  roof.position.y = 20.2;
  group.add(roof);
  const light = new THREE.PointLight(0xffd27b, 18, 42, 2);
  light.position.y = 18.4;
  group.add(light);
  return group;
}

export function createFountain(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const rim = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.5, 18), mat('fountain-stone', 0xcbb99a)));
  rim.position.y = 0.25;
  group.add(rim);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.12, 18), new THREE.MeshStandardMaterial({ color: 0x4aa7b0, metalness: 0.2, roughness: 0.18 }));
  water.position.y = 0.54;
  group.add(water);
  const column = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 3.2, 10), mat('fountain-stone', 0xcbb99a)));
  column.position.y = 2.1;
  group.add(column);
  const bowl = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.8, 0.35, 14), mat('fountain-stone', 0xcbb99a)));
  bowl.position.y = 3.55;
  group.add(bowl);
  return group;
}

export function createBillboard(x, z, rotation, title, sub, colors = {}) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const board = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.3, 0.18), new THREE.MeshStandardMaterial({ color: 0x1b2d31, roughness: 0.7 }));
  board.position.y = 6.3;
  group.add(board);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(8.1, 3.05), new THREE.MeshBasicMaterial({ map: signTexture(title, sub, colors), side: THREE.DoubleSide }));
  face.position.set(0, 6.3, 0.11);
  group.add(face);
  for (const sx of [-2.8, 2.8]) {
    const post = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.16, 6.2, 0.16), mat('billboard-metal', 0x475555)));
    post.position.set(sx, 3.1, 0);
    group.add(post);
  }
  return group;
}

/** Traffic lights share one animation pass; this updates their emissive discs. */
export function updateTrafficSignals(signals, time) {
  for (const signal of signals) {
    const cycle = (time * 0.22 + signal.phase) % 1;
    const red = cycle < 0.48;
    const yellow = cycle >= 0.48 && cycle < 0.57;
    const green = cycle >= 0.57;
    signal.redMat.emissiveIntensity = red ? 2.5 : 0.02;
    signal.yellowMat.emissiveIntensity = yellow ? 2.5 : 0.02;
    signal.greenMat.emissiveIntensity = green ? 2.5 : 0.02;
  }
}

export function createStreetSign(x, z, rotation, label) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), mat('bench-metal', 0x354041));
  pole.position.y = 1.6;
  group.add(pole);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ map: signTexture(label, '', { bg: '#175c56', fg: '#f7e5b4', border: '#d9c890' }), side: THREE.DoubleSide }));
  sign.position.set(0.7, 3.05, 0);
  group.add(sign);
  return group;
}
