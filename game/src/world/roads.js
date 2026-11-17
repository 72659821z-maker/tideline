// The street grid, its painted markings and the graph the traffic and police drive on.
// Roads are built once at boot: an asphalt sheet, instanced lane paint, crossings and a
// 5×5 node graph with BFS path finding and lane offset helpers.
// The graph is the single source of truth for traffic, police and the minimap.
import { ROAD_X, ROAD_Z, ROAD_HALF, LANE_OFFSET, CITY_LIMIT_X, NORTH_LIMIT } from '../config.js';
import { asphaltTexture } from './textures.js';

const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();

function paintBox(bucket, x, z, sx, sz, y = 0.035) {
  position.set(x, y, z);
  scale.set(sx, 0.02, sz);
  matrix.compose(position, quaternion, scale);
  bucket.push(matrix.clone());
}

function makeInstanced(scene, material, transforms) {
  if (transforms.length === 0) return null;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  transforms.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

/** A south-facing grid of clean intersections with straight, lane-marked roads. */
export function buildRoadNetwork(scene) {
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_LIMIT_X * 2 + 40, 610),
    new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.96, metalness: 0.02 }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(0, 0, 8);
  asphalt.receiveShadow = true;
  scene.add(asphalt);

  const white = [];
  const yellow = [];

  // Lane paint runs between intersections, leaving the junctions open.
  for (const x of ROAD_X) {
    for (let s = 0; s < ROAD_Z.length - 1; s += 1) {
      const z1 = ROAD_Z[s] + 13;
      const z2 = ROAD_Z[s + 1] - 13;
      for (let z = z1; z < z2; z += 6) {
        paintBox(white, x - LANE_OFFSET, z + 1.6, 0.16, 3.2, 0.04);
        paintBox(white, x + LANE_OFFSET, z + 1.6, 0.16, 3.2, 0.04);
      }
      paintBox(yellow, x - 0.28, (z1 + z2) / 2, 0.12, z2 - z1, 0.038);
      paintBox(yellow, x + 0.28, (z1 + z2) / 2, 0.12, z2 - z1, 0.038);
    }
  }
  for (const z of ROAD_Z) {
    for (let s = 0; s < ROAD_X.length - 1; s += 1) {
      const x1 = ROAD_X[s] + 13;
      const x2 = ROAD_X[s + 1] - 13;
      for (let x = x1; x < x2; x += 6) {
        paintBox(white, x + 1.6, z - LANE_OFFSET, 3.2, 0.16, 0.04);
        paintBox(white, x + 1.6, z + LANE_OFFSET, 3.2, 0.16, 0.04);
      }
      paintBox(yellow, (x1 + x2) / 2, z - 0.28, x2 - x1, 0.12, 0.038);
      paintBox(yellow, (x1 + x2) / 2, z + 0.28, x2 - x1, 0.12, 0.038);
    }
  }

  // Crossings and stop bars on every approach. These make the grid read as a real city.
  for (const x of ROAD_X) {
    for (const z of ROAD_Z) {
      for (const side of [-1, 1]) {
        const cz = z + side * 12.2;
        for (let i = -3; i <= 3; i += 1) {
          paintBox(white, x + i * 2.4, cz, 1.15, 3.4, 0.045);
        }
        paintBox(white, x + side * 0.0, z + side * 15.6, 17.5, 0.55, 0.044);
      }
      for (const side of [-1, 1]) {
        const cx = x + side * 12.2;
        for (let i = -3; i <= 3; i += 1) {
          paintBox(white, cx, z + i * 2.4, 3.4, 1.15, 0.045);
        }
        paintBox(white, x + side * 15.6, z, 0.55, 17.5, 0.044);
      }
    }
  }

  makeInstanced(scene, new THREE.MeshStandardMaterial({ color: 0xf4ead1, roughness: 0.8, metalness: 0.02 }), white);
  makeInstanced(scene, new THREE.MeshStandardMaterial({ color: 0xe8c65a, roughness: 0.82, metalness: 0.02 }), yellow);

  // A thin curb line around the whole grid catches the sun and hides the asphalt edge.
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xc9bda6, roughness: 0.94 });
  for (const x of [CITY_LIMIT_X - 6, -CITY_LIMIT_X + 6]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 610), curbMat);
    curb.position.set(x, 0.12, 8);
    curb.receiveShadow = true;
    scene.add(curb);
  }

  const nodes = [];
  for (let iz = 0; iz < ROAD_Z.length; iz += 1) {
    for (let ix = 0; ix < ROAD_X.length; ix += 1) {
      nodes.push({ index: iz * ROAD_X.length + ix, ix, iz, x: ROAD_X[ix], z: ROAD_Z[iz], neighbors: [] });
    }
  }
  const nodeAt = (ix, iz) => (ix < 0 || iz < 0 || ix >= ROAD_X.length || iz >= ROAD_Z.length ? null : nodes[iz * ROAD_X.length + ix]);
  for (const node of nodes) {
    const candidates = [nodeAt(node.ix - 1, node.iz), nodeAt(node.ix + 1, node.iz), nodeAt(node.ix, node.iz - 1), nodeAt(node.ix, node.iz + 1)];
    node.neighbors = candidates.filter(Boolean).map((n) => n.index);
  }

  function nearestNode(x, z) {
    let best = 0;
    let bestD = Infinity;
    for (const node of nodes) {
      const d = (node.x - x) ** 2 + (node.z - z) ** 2;
      if (d < bestD) { bestD = d; best = node.index; }
    }
    return best;
  }

  function direction(fromIndex, toIndex) {
    const a = nodes[fromIndex];
    const b = nodes[toIndex];
    return { x: Math.sign(b.x - a.x), z: Math.sign(b.z - a.z) };
  }

  function laneTarget(fromIndex, toIndex) {
    const b = nodes[toIndex];
    const dir = direction(fromIndex, toIndex);
    const rightX = -dir.z;
    const rightZ = dir.x;
    return { x: b.x + rightX * LANE_OFFSET, z: b.z + rightZ * LANE_OFFSET };
  }

  function lanePointAhead(nodeIndex, dir) {
    const node = nodes[nodeIndex];
    const rightX = -dir.z;
    const rightZ = dir.x;
    return { x: node.x + rightX * LANE_OFFSET, z: node.z + rightZ * LANE_OFFSET };
  }

  function findPath(startIndex, targetIndex) {
    if (startIndex === targetIndex) return [startIndex];
    const previous = new Array(nodes.length).fill(-1);
    const queue = [startIndex];
    previous[startIndex] = startIndex;
    while (queue.length) {
      const current = queue.shift();
      if (current === targetIndex) break;
      for (const next of nodes[current].neighbors) {
        if (previous[next] !== -1) continue;
        previous[next] = current;
        queue.push(next);
      }
    }
    if (previous[targetIndex] === -1) return [];
    const path = [];
    let cursor = targetIndex;
    while (cursor !== startIndex) {
      path.push(cursor);
      cursor = previous[cursor];
    }
    path.push(startIndex);
    return path.reverse();
  }

  function randomNeighbor(nodeIndex, previousIndex, random) {
    const options = nodes[nodeIndex].neighbors.filter((n) => n !== previousIndex);
    const pool = options.length ? options : nodes[nodeIndex].neighbors;
    return pool[Math.floor(random() * pool.length)];
  }

  return {
    nodes,
    nearestNode,
    laneTarget,
    lanePointAhead,
    direction,
    findPath,
    randomNeighbor,
    roadHalf: ROAD_HALF,
    /** On the asphalt (used for camera hints and checkpoint placement). */
    onRoad(x, z) {
      return ROAD_X.some((rx) => Math.abs(x - rx) < ROAD_HALF) || ROAD_Z.some((rz) => Math.abs(z - rz) < ROAD_HALF);
    },
    bounds: { north: NORTH_LIMIT, south: 352, west: -CITY_LIMIT_X, east: CITY_LIMIT_X },
  };
}
