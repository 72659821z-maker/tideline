// The atmosphere: a hand-painted shader sky, the sun, sea, surf, distant islands and the
// haze that keeps Marisol Bay feeling hot and endless. Lighting is set here too.
import { waterTexture } from './textures.js';

const SUN_DIRECTION = new THREE.Vector3(0.48, 0.58, 0.58).normalize();

export function createSky(scene, renderer) {
  scene.background = new THREE.Color('#a9d4df');
  scene.fog = new THREE.Fog(0xc7e1df, 155, 720);

  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color('#3e91ba') },
      midColor: { value: new THREE.Color('#9ed3dd') },
      horizonColor: { value: new THREE.Color('#f6dfc1') },
      sunDirection: { value: SUN_DIRECTION.clone() },
    },
    vertexShader: `
      varying vec3 vWorldDirection;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldDirection = normalize(world.xyz - cameraPosition);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDirection;
      varying vec3 vWorldDirection;
      void main() {
        vec3 dir = normalize(vWorldDirection);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.24, h));
        col = mix(col, topColor, smoothstep(0.18, 0.82, h));
        float sunAmount = max(dot(dir, sunDirection), 0.0);
        col += vec3(1.0, 0.72, 0.35) * pow(sunAmount, 220.0) * 2.3;
        col += vec3(1.0, 0.65, 0.3) * pow(sunAmount, 12.0) * 0.12;
        float bands = sin((h + dir.x * 0.12) * 190.0) * 0.006;
        col += vec3(bands);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(780, 40, 22), skyMaterial);
  sky.frustumCulled = false;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xd9f3ff, 0x786044, 1.08);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xfff0d7, 0.14);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffe2b2, 3.55);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(220);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 520;
  sun.shadow.camera.left = -105;
  sun.shadow.camera.right = 105;
  sun.shadow.camera.top = 105;
  sun.shadow.camera.bottom = -105;
  sun.shadow.bias = -0.00045;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  scene.add(sun.target);

  const oceanMaterial = new THREE.MeshPhongMaterial({
    map: waterTexture(),
    color: 0x2b9fb0,
    specular: 0xbfeee8,
    shininess: 95,
    transparent: true,
    opacity: 0.97,
  });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1900, 1, 1), oceanMaterial);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.28, 1180);
  ocean.receiveShadow = false;
  scene.add(ocean);

  // Bright surf bands and a darker shelf close to the beach.
  const surfMat = new THREE.MeshBasicMaterial({ color: 0xdff8f3, transparent: true, opacity: 0.4, depthWrite: false });
  for (let i = 0; i < 4; i += 1) {
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(2200, 1.4 + i * 1.8), surfMat);
    surf.rotation.x = -Math.PI / 2;
    surf.position.set(0, -0.2 + i * 0.01, 337 + i * 11);
    scene.add(surf);
  }

  const islandMat = new THREE.MeshLambertMaterial({ color: 0x527d74 });
  const islandMatLight = new THREE.MeshLambertMaterial({ color: 0x6b9585 });
  for (const [x, z, sx, sy, sz] of [
    [-560, 750, 190, 27, 95], [410, 690, 150, 19, 100], [700, 890, 240, 40, 120], [-120, 930, 330, 23, 110],
  ]) {
    const island = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 7), x < 0 ? islandMat : islandMatLight);
    island.scale.set(sx, sy, sz);
    island.position.set(x, sy * 0.45 - 2, z);
    island.rotation.y = x * 0.013;
    scene.add(island);
  }

  // A faint hill line beyond the northern edge of the city.
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x6e8a76, fog: true });
  for (const [x, z, r, h] of [[-360, -480, 210, 56], [-80, -560, 300, 72], [260, -500, 250, 48], [530, -620, 320, 80]]) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), hillMat);
    hill.position.set(x, h / 2 - 2, z);
    hill.rotation.y = x * 0.01;
    scene.add(hill);
  }

  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: (awaitGlow()), color: 0xffefc0, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sunSprite.scale.set(90, 90, 1);
  sunSprite.position.copy(SUN_DIRECTION).multiplyScalar(600);
  scene.add(sunSprite);

  return { sun, hemi, ambient, sky, ocean, sunDirection: SUN_DIRECTION };
}

let glowHeld = null;
function awaitGlow() {
  if (!glowHeld) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const g = canvas.getContext('2d');
    const gradient = g.createRadialGradient(64, 64, 1, 64, 64, 63);
    gradient.addColorStop(0, 'rgba(255,252,224,1)');
    gradient.addColorStop(0.13, 'rgba(255,233,166,.9)');
    gradient.addColorStop(0.42, 'rgba(255,190,94,.25)');
    gradient.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, 128, 128);
    glowHeld = new THREE.CanvasTexture(canvas);
    glowHeld.colorSpace = THREE.SRGBColorSpace;
  }
  return glowHeld;
}

/** Keeps the shadow camera centred on the player while the far sun stays fixed. */
export function updateSunForPlayer(skySystem, x, z) {
  skySystem.sun.target.position.set(x, 0, z);
  skySystem.sun.position.set(x + SUN_DIRECTION.x * 220, SUN_DIRECTION.y * 220, z + SUN_DIRECTION.z * 220);
  skySystem.sun.target.updateMatrixWorld();
}

/** Moves the slow cloud bank so the sky has a little life in long shots. */
export function driftClouds(skySystem, elapsed) {
  skySystem.sky.rotation.y = elapsed * 0.00035;
}
