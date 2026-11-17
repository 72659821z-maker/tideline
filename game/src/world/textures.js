// Every surface texture is painted into a canvas at boot. No image files, no downloads:
// sun-faded facades, asphalt, sidewalk pavers, park grass, beach sand and shop signs.
// Each generator caches its texture, so 16 blocks of buildings cost a handful of canvases.
// Anisotropy keeps the long road and paver textures sharp at grazing angles.
const TEXTURE_ANISOTROPY = 4;
import { makeRandom } from '../random.js';

const textureCache = new Map();

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function finish(canvas, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function cached(key, build) {
  if (!textureCache.has(key)) textureCache.set(key, build());
  return textureCache.get(key);
}

/** A noisy, warm asphalt tile used under the whole road grid. */
export function asphaltTexture() {
  return cached('asphalt', () => {
    const canvas = makeCanvas(256, 256);
    const g = canvas.getContext('2d');
    g.fillStyle = '#383d3f';
    g.fillRect(0, 0, 256, 256);
    const rnd = makeRandom(44);
    for (let i = 0; i < 4200; i += 1) {
      const shade = rnd.int(42, 76);
      g.fillStyle = `rgba(${shade},${shade + 2},${shade + 3},${rnd.float(0.08, 0.3)})`;
      g.fillRect(rnd.int(0, 255), rnd.int(0, 255), rnd.int(1, 3), rnd.int(1, 3));
    }
    g.strokeStyle = 'rgba(20,22,23,.22)';
    for (let i = 0; i < 10; i += 1) {
      g.beginPath();
      const x = rnd.int(0, 255);
      g.moveTo(x, 0);
      g.lineTo(x + rnd.int(-30, 30), 256);
      g.stroke();
    }
    return finish(canvas, 24, 24);
  });
}

/** Pale concrete slabs with seams, repeated across block sidewalks. */
export function sidewalkTexture() {
  return cached('sidewalk', () => {
    const canvas = makeCanvas(256, 256);
    const g = canvas.getContext('2d');
    g.fillStyle = '#c2b7a1';
    g.fillRect(0, 0, 256, 256);
    const rnd = makeRandom(117);
    for (let i = 0; i < 1600; i += 1) {
      const shade = rnd.int(150, 210);
      g.fillStyle = `rgba(${shade},${shade - 6},${shade - 18},${rnd.float(.03, .11)})`;
      g.fillRect(rnd.int(0, 255), rnd.int(0, 255), rnd.int(1, 5), rnd.int(1, 3));
    }
    g.strokeStyle = 'rgba(92,84,70,.32)';
    g.lineWidth = 2;
    for (let y = 0; y <= 256; y += 64) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    }
    for (let x = 0; x <= 256; x += 64) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke();
    }
    return finish(canvas, 5, 5);
  });
}

export function grassTexture() {
  return cached('grass', () => {
    const canvas = makeCanvas(256, 256);
    const g = canvas.getContext('2d');
    g.fillStyle = '#527f43';
    g.fillRect(0, 0, 256, 256);
    const rnd = makeRandom(991);
    for (let i = 0; i < 2400; i += 1) {
      const green = rnd.int(82, 140);
      g.strokeStyle = `rgba(${rnd.int(38, 84)},${green},${rnd.int(40, 70)},${rnd.float(.2, .55)})`;
      g.beginPath();
      const x = rnd.int(0, 255);
      const y = rnd.int(0, 255);
      g.moveTo(x, y);
      g.lineTo(x + rnd.int(-2, 2), y - rnd.int(2, 7));
      g.stroke();
    }
    return finish(canvas, 4, 4);
  });
}

export function sandTexture() {
  return cached('sand', () => {
    const canvas = makeCanvas(256, 256);
    const g = canvas.getContext('2d');
    g.fillStyle = '#e4c88f';
    g.fillRect(0, 0, 256, 256);
    const rnd = makeRandom(818);
    for (let i = 0; i < 5000; i += 1) {
      const shade = rnd.int(180, 240);
      g.fillStyle = `rgba(${shade},${shade - 18},${shade - 70},${rnd.float(.04, .16)})`;
      g.fillRect(rnd.int(0, 255), rnd.int(0, 255), 1, 1);
    }
    return finish(canvas, 10, 10);
  });
}

const FACADE_STYLES = [
  { wall: '#e7d4b1', trim: '#c3a579', glass: '#456a7a', accent: '#e07a5f' },
  { wall: '#c9d7cc', trim: '#91ad9f', glass: '#395d6b', accent: '#3e7d83' },
  { wall: '#e4bfa3', trim: '#c08564', glass: '#4c6d78', accent: '#9e4e4a' },
  { wall: '#d9d4c5', trim: '#a7a18f', glass: '#3f6471', accent: '#d7a84a' },
  { wall: '#bcd4d2', trim: '#7fa5a4', glass: '#345b67', accent: '#e2a34e' },
  { wall: '#e9cbaa', trim: '#b7916d', glass: '#436872', accent: '#537e65' },
  { wall: '#d2b897', trim: '#9f7a55', glass: '#3f616e', accent: '#ba5749' },
  { wall: '#e3ded1', trim: '#aaa18d', glass: '#426471', accent: '#2d8f8d' },
];

/** A facade sheet: windows, ledges, balconies, sun bleaching. Cloned per building for variety. */
export function facadeTexture(styleIndex = 0) {
  return cached(`facade-${styleIndex}`, () => {
    const style = FACADE_STYLES[styleIndex % FACADE_STYLES.length];
    const canvas = makeCanvas(256, 512);
    const g = canvas.getContext('2d');
    const rnd = makeRandom(300 + styleIndex * 71);
    g.fillStyle = style.wall;
    g.fillRect(0, 0, 256, 512);
    const wash = g.createLinearGradient(0, 0, 0, 512);
    wash.addColorStop(0, 'rgba(255,255,255,.2)');
    wash.addColorStop(1, 'rgba(60,40,20,.12)');
    g.fillStyle = wash;
    g.fillRect(0, 0, 256, 512);

    const cols = 5;
    const rows = 9;
    const cellW = 256 / cols;
    const cellH = 440 / rows;
    for (let row = 0; row < rows; row += 1) {
      const y = 32 + row * cellH;
      if (row % 3 === 1) {
        g.fillStyle = 'rgba(80,60,40,.16)';
        g.fillRect(0, y + cellH - 10, 256, 9);
        g.fillStyle = style.trim;
        g.fillRect(0, y + cellH - 10, 256, 3);
      }
      for (let col = 0; col < cols; col += 1) {
        const x = col * cellW + 11;
        const w = cellW - 22;
        const h = cellH - 20;
        g.fillStyle = 'rgba(40,55,60,.6)';
        g.fillRect(x - 2, y - 2, w + 4, h + 4);
        const lit = rnd.chance(0.18);
        g.fillStyle = lit ? '#dbb974' : style.glass;
        g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,.13)';
        g.fillRect(x, y, w, 5);
        g.fillStyle = 'rgba(10,25,30,.35)';
        g.fillRect(x + w / 2 - 1, y, 2, h);
        if (row % 2 === 0 && rnd.chance(0.38)) {
          g.fillStyle = style.accent;
          g.fillRect(x - 6, y + h - 11, w + 12, 4);
          g.fillStyle = 'rgba(30,40,40,.28)';
          g.fillRect(x - 6, y + h - 7, w + 12, 3);
        }
      }
    }
    g.fillStyle = style.trim;
    g.fillRect(0, 0, 256, 14);
    g.fillRect(0, 477, 256, 35);
    g.fillStyle = 'rgba(40,42,38,.22)';
    for (let i = 0; i < 18; i += 1) {
      g.fillRect(rnd.int(0, 250), 478, rnd.int(2, 12), 2);
    }
    g.fillStyle = 'rgba(255,255,255,.08)';
    g.fillRect(0, 15, 256, 8);
    return finish(canvas);
  });
}

export function roofTexture() {
  return cached('roof', () => {
    const canvas = makeCanvas(128, 128);
    const g = canvas.getContext('2d');
    g.fillStyle = '#9b968b';
    g.fillRect(0, 0, 128, 128);
    const rnd = makeRandom(404);
    for (let i = 0; i < 800; i += 1) {
      g.fillStyle = `rgba(60,60,55,${rnd.float(.03, .15)})`;
      g.fillRect(rnd.int(0, 127), rnd.int(0, 127), rnd.int(1, 4), 1);
    }
    return finish(canvas, 2, 2);
  });
}

export function waterTexture() {
  return cached('water', () => {
    const canvas = makeCanvas(256, 256);
    const g = canvas.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#2cb2c2');
    grad.addColorStop(1, '#0b7f99');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const rnd = makeRandom(515);
    g.lineCap = 'round';
    for (let i = 0; i < 140; i += 1) {
      g.strokeStyle = `rgba(205,248,245,${rnd.float(.05, .22)})`;
      g.lineWidth = rnd.float(.6, 2.2);
      const x = rnd.int(0, 255);
      const y = rnd.int(0, 255);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 8, y - 2, x + rnd.int(12, 28), y);
      g.stroke();
    }
    return finish(canvas, 18, 18);
  });
}

/** A readable shop sign, painted into a texture and mounted on a facade. */
export function signTexture(text, sub = '', colors = {}) {
  const key = `sign-${text}-${sub}-${colors.bg ?? ''}`;
  return cached(key, () => {
    const canvas = makeCanvas(512, 128);
    const g = canvas.getContext('2d');
    const bg = colors.bg ?? '#153138';
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = colors.border ?? '#f5d48b';
    g.lineWidth = 5;
    g.strokeRect(7, 7, 498, 114);
    g.fillStyle = colors.fg ?? '#ffe6b3';
    g.font = '900 48px "Arial Black", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text.toUpperCase(), 256, sub ? 52 : 64);
    if (sub) {
      g.fillStyle = colors.sub ?? '#f6a45b';
      g.font = '700 21px Arial, sans-serif';
      g.fillText(sub.toUpperCase(), 256, 98);
    }
    return finish(canvas);
  });
}

/** Soft radial sprite for muzzle flashes and sun glints. */
export function glowTexture(inner = '#fff6c6', outer = 'rgba(255,150,40,0)') {
  const key = `glow-${inner}-${outer}`;
  return cached(key, () => {
    const canvas = makeCanvas(128, 128);
    const g = canvas.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.2, 'rgba(255,196,70,.95)');
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
}
