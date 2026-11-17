// GPU particle effects and tracers, all generated at runtime: tire smoke, muzzle flashes,
// impact sparks, blood, exhaust puffs and the bright lines of gunfire.
// Three fixed pools are recycled ring-buffer style, so nothing is allocated per shot.
import { glowTexture } from '../world/textures.js';

const PARTICLE_VERTEX = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / max(1.0, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.08, d);
    gl_FragColor = vec4(vColor, vAlpha * soft);
  }
`;

class ParticlePool {
  constructor(scene, count, blending, sizeScale = 1) {
    this.count = count;
    this.cursor = 0;
    this.scene = scene;
    this.sizeScale = sizeScale;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.vel = new Float32Array(count * 3);
    this.gravity = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      this.positions[i * 3 + 1] = -500;
      this.alphas[i] = 0;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geometry = geometry;
    this.material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);
  }

  emit(x, y, z, color, size, life, vx, vy, vz, gravity = 0) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    this.positions[i * 3] = x;
    this.positions[i * 3 + 1] = y;
    this.positions[i * 3 + 2] = z;
    this.colors[i * 3] = color.r;
    this.colors[i * 3 + 1] = color.g;
    this.colors[i * 3 + 2] = color.b;
    this.sizes[i] = size * this.sizeScale;
    this.alphas[i] = 1;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.gravity[i] = gravity;
  }

  update(dt) {
    let dirty = false;
    for (let i = 0; i < this.count; i += 1) {
      if (this.life[i] <= 0) continue;
      dirty = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        this.positions[i * 3 + 1] = -500;
        continue;
      }
      const k = i * 3;
      this.vel[k + 1] -= this.gravity[i] * dt;
      this.positions[k] += this.vel[k] * dt;
      this.positions[k + 1] += this.vel[k + 1] * dt;
      this.positions[k + 2] += this.vel[k + 2] * dt;
      const ratio = this.life[i] / this.maxLife[i];
      this.alphas[i] = ratio * ratio;
      this.sizes[i] *= 1 + dt * 0.35;
    }
    if (dirty) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
      this.geometry.attributes.aSize.needsUpdate = true;
      this.geometry.attributes.aAlpha.needsUpdate = true;
    }
  }
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.smoke = new ParticlePool(scene, 240, THREE.NormalBlending, 1.0);
    this.sparks = new ParticlePool(scene, 280, THREE.AdditiveBlending, 1.0);
    this.blood = new ParticlePool(scene, 110, THREE.NormalBlending, 0.8);
    this.smokeClock = 0;
    this.flashPool = [];
    for (let i = 0; i < 10; i += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(), color: 0xffe0a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sprite.scale.set(1, 1, 1);
      sprite.visible = false;
      scene.add(sprite);
      this.flashPool.push({ sprite, life: 0, scale: 1 });
    }
    this.flashCursor = 0;

    this.tracerCount = 22;
    const positions = new Float32Array(this.tracerCount * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.tracerPositions = positions;
    this.tracerGeometry = geometry;
    this.tracers = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
      color: 0xffd98d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.tracers.frustumCulled = false;
    scene.add(this.tracers);
    this.tracerLife = new Float32Array(this.tracerCount);
    this.tracerCursor = 0;
  }

  emitTireSmoke(position, heading, intensity = 1) {
    this.smokeClock -= 1 / 60;
    if (this.smokeClock > 0) return;
    this.smokeClock = 0.055;
    const forward = { x: -Math.sin(heading), z: -Math.cos(heading) };
    const right = { x: Math.cos(heading), z: -Math.sin(heading) };
    for (const side of [-1, 1]) {
      const x = position.x + forward.x * -1.6 + right.x * side * 0.85;
      const z = position.z + forward.z * -1.6 + right.z * side * 0.85;
      const color = new THREE.Color(0xc9c5bb);
      this.smoke.emit(x, 0.18, z,
        color, 0.9 + Math.random() * 0.6, 1.4 + Math.random() * 0.8,
        (Math.random() - 0.5) * 1.3 - forward.x * 0.8,
        0.5 + Math.random() * 0.6,
        (Math.random() - 0.5) * 1.3 - forward.z * 0.8,
        -0.2,
      );
    }
  }

  emitExhaust(position, heading) {
    const forward = { x: -Math.sin(heading), z: -Math.cos(heading) };
    this.smoke.emit(
      position.x - forward.x * 2.1, 0.3, position.z - forward.z * 2.1,
      new THREE.Color(0x77736a), 0.45, 0.7,
      -forward.x * 1.4, 0.4, -forward.z * 1.4, 0.4,
    );
  }

  emitSparks(position, count = 10, color = 0xffc066, force = 4) {
    for (let i = 0; i < count; i += 1) {
      const c = new THREE.Color(color);
      c.offsetHSL((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.2);
      this.sparks.emit(
        position.x, position.y + 0.3 + Math.random() * 0.3, position.z,
        c, 0.22 + Math.random() * 0.22, 0.35 + Math.random() * 0.5,
        (Math.random() - 0.5) * force, Math.random() * force * 0.8, (Math.random() - 0.5) * force,
        9.5,
      );
    }
  }

  emitSmokePuff(position, size = 1.6, color = 0x9b968b) {
    this.smoke.emit(position.x, position.y + 0.6, position.z, new THREE.Color(color), size, 2.4,
      (Math.random() - 0.5) * 1.1, 1 + Math.random(), (Math.random() - 0.5) * 1.1, -0.2);
  }

  emitBlood(position, count = 5) {
    for (let i = 0; i < count; i += 1) {
      this.blood.emit(
        position.x, position.y + 1.2, position.z,
        new THREE.Color(0x8f1f1b), 0.24 + Math.random() * 0.25, 0.5 + Math.random() * 0.4,
        (Math.random() - 0.5) * 3.2, 1 + Math.random() * 2, (Math.random() - 0.5) * 3.2,
        8,
      );
    }
  }

  muzzleFlash(position, direction) {
    const flash = this.flashPool[this.flashCursor];
    this.flashCursor = (this.flashCursor + 1) % this.flashPool.length;
    flash.sprite.position.copy(position);
    flash.sprite.position.x += direction.x * 0.25;
    flash.sprite.position.z += direction.z * 0.25;
    flash.sprite.material.opacity = 1;
    flash.sprite.visible = true;
    flash.life = 0.07;
    flash.scale = 0.85 + Math.random() * 0.4;
    flash.sprite.scale.setScalar(flash.scale);
    this.emitSparks(position, 4, 0xffdf8a, 2.5);
  }

  tracer(from, to) {
    const index = this.tracerCursor;
    this.tracerCursor = (this.tracerCursor + 1) % this.tracerCount;
    const base = index * 6;
    this.tracerPositions[base] = from.x;
    this.tracerPositions[base + 1] = from.y;
    this.tracerPositions[base + 2] = from.z;
    this.tracerPositions[base + 3] = to.x;
    this.tracerPositions[base + 4] = to.y;
    this.tracerPositions[base + 5] = to.z;
    this.tracerLife[index] = 0.09;
    this.tracerGeometry.attributes.position.needsUpdate = true;
  }

  update(dt) {
    this.smoke.update(dt);
    this.sparks.update(dt);
    this.blood.update(dt);
    for (const flash of this.flashPool) {
      if (flash.life > 0) {
        flash.life -= dt;
        flash.sprite.material.opacity = Math.max(0, flash.life / 0.07);
        if (flash.life <= 0) flash.sprite.visible = false;
      }
    }
    let dirty = false;
    for (let i = 0; i < this.tracerCount; i += 1) {
      if (this.tracerLife[i] > 0) {
        this.tracerLife[i] -= dt;
        if (this.tracerLife[i] <= 0) {
          const base = i * 6;
          this.tracerPositions[base + 1] = -500;
          this.tracerPositions[base + 4] = -500;
          dirty = true;
        }
      }
    }
    if (dirty) this.tracerGeometry.attributes.position.needsUpdate = true;
  }
}
