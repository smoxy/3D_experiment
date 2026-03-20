import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155/build/three.module.js';

export class ParticleSystem {
  constructor(scene, cube) {
    this.scene = scene;
    this.cube = cube;
    this.particles = [];
    this.enabled = false;
    this.clock = new THREE.Clock();
    this.visibleCount = 0;

    // Parameters
    this.count = 80;
    this.speed = 20;
    this.restitution = 0.9;
    this.gravity = 9.8;
    this.floorY = -1.0;
    this.radius = 0.06;
    this.maxParticles = 10000;

    // InstancedMesh setup: 1 draw call for all particles
    this.geometry = new THREE.SphereGeometry(this.radius, 14, 10);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });
    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.maxParticles
    );
    this.scene.add(this.instancedMesh);

    // Per-particle colors as instanced buffer
    this.colorAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(this.maxParticles * 3),
      3
    );
    this.geometry.setAttribute('instanceColor', this.colorAttribute);

    this.matrix = new THREE.Matrix4();
  }

  createParticle() {
    if (this.particles.length >= this.maxParticles) return false;

    const hsl = { h: Math.random(), s: 0.6, l: 0.5 };
    const color = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * this.speed,
      (Math.random() - 0.5) * this.speed,
      (Math.random() - 0.5) * this.speed
    );

    const mass = 0.8 + Math.random() * 0.8;
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      Math.random() * 3 + 1,
      (Math.random() - 0.5) * 10
    );

    this.particles.push({ position, vel, mass, color });

    const idx = this.particles.length - 1;
    this.colorAttribute.setXYZ(idx, color.r, color.g, color.b);
    this.colorAttribute.needsUpdate = true;

    return true;
  }

  spawn(n) {
    for (let i = 0; i < n; i++) {
      if (!this.createParticle()) break;
    }
    this.visibleCount = this.particles.length;
    this.updateInstanceMatrix();
  }

  clear() {
    this.particles.length = 0;
    this.visibleCount = 0;
    this.instancedMesh.count = 0;
  }

  setCount(n) {
    n = Math.min(n, this.maxParticles);
    if (this.particles.length < n) {
      this.spawn(n - this.particles.length);
    } else if (this.particles.length > n) {
      this.particles.length = n;
      this.visibleCount = n;
      this.updateInstanceMatrix();
    }
    this.count = n;
  }

  updateInstanceMatrix() {
    this.instancedMesh.count = this.visibleCount;
    for (let i = 0; i < this.visibleCount; i++) {
      const p = this.particles[i];
      this.matrix.makeTranslation(p.position.x, p.position.y, p.position.z);
      this.instancedMesh.setMatrixAt(i, this.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  resolveCollisionParticles(p, q) {
    const delta = new THREE.Vector3().subVectors(q.position, p.position);
    const dist = delta.length();
    const minDist = this.radius * 2;

    if (dist === 0 || dist >= minDist) return;

    const n = delta.clone().divideScalar(dist);
    const penetration = minDist - dist;
    p.position.addScaledVector(n, -penetration * 0.5);
    q.position.addScaledVector(n, penetration * 0.5);

    const rv = q.vel.clone().sub(p.vel);
    const velAlongNormal = rv.dot(n);
    if (velAlongNormal > 0) return;

    const e = Math.min(this.restitution, 1);
    const j = -(1 + e) * velAlongNormal / (1 / p.mass + 1 / q.mass);
    const impulse = n.clone().multiplyScalar(j);
    p.vel.addScaledVector(impulse, -1 / p.mass);
    q.vel.addScaledVector(impulse, 1 / q.mass);
  }

  resolveParticleCubeCollision(p) {
    const box = new THREE.Box3().setFromObject(this.cube.getMesh());
    const closest = new THREE.Vector3().copy(p.position);
    closest.x = Math.max(box.min.x, Math.min(closest.x, box.max.x));
    closest.y = Math.max(box.min.y, Math.min(closest.y, box.max.y));
    closest.z = Math.max(box.min.z, Math.min(closest.z, box.max.z));

    const delta = new THREE.Vector3().subVectors(p.position, closest);
    const dist = delta.length();

    if (dist < this.radius && dist > 0.0001) {
      const n = delta.clone().divideScalar(dist);
      const penetration = this.radius - dist;
      p.position.addScaledVector(n, penetration + 0.002);

      const velAlongNormal = p.vel.dot(n);
      if (velAlongNormal < 0) {
        const bounce = -(1 + this.restitution) * velAlongNormal;
        p.vel.addScaledVector(n, bounce);
      }
    }
  }

  update(dt) {
    if (!this.enabled || this.particles.length === 0) return;

    const actualDt = Math.min(dt, 0.033);

    if (Math.random() < 0.02 && this.visibleCount > 0) {
      const p0 = this.particles[0];
      console.debug(
        `[Particles] visible=${this.visibleCount}, vel=${p0.vel.length().toFixed(2)}, gravity=${this.gravity.toFixed(1)}`
      );
    }

    for (let i = 0; i < this.visibleCount; i++) {
      const p = this.particles[i];
      p.vel.y -= this.gravity * actualDt;
      p.position.addScaledVector(p.vel, actualDt);

      if (p.position.y - this.radius < this.floorY) {
        p.position.y = this.floorY + this.radius;
        p.vel.y = -p.vel.y * this.restitution;
      }

      this.resolveParticleCubeCollision(p);
    }

    // Spatial hash
    const cellSize = this.radius * 4;
    const hash = new Map();
    const cellKey = (x, y, z) => `${x},${y},${z}`;

    for (let i = 0; i < this.visibleCount; i++) {
      const p = this.particles[i];
      const x = Math.floor(p.position.x / cellSize);
      const y = Math.floor(p.position.y / cellSize);
      const z = Math.floor(p.position.z / cellSize);
      const key = cellKey(x, y, z);
      if (!hash.has(key)) hash.set(key, []);
      hash.get(key).push(i);
    }

    const neighborOffsets = [-1, 0, 1];
    for (const [key, list] of hash.entries()) {
      const parts = key.split(',').map(Number);
      const baseX = parts[0], baseY = parts[1], baseZ = parts[2];

      for (let dx of neighborOffsets) {
        for (let dy of neighborOffsets) {
          for (let dz of neighborOffsets) {
            const neighborKey = cellKey(baseX + dx, baseY + dy, baseZ + dz);
            const neighborList = hash.get(neighborKey);
            if (!neighborList) continue;

            for (let i = 0; i < list.length; i++) {
              const aIdx = list[i];
              for (let j = 0; j < neighborList.length; j++) {
                const bIdx = neighborList[j];
                if (aIdx >= bIdx) continue;
                this.resolveCollisionParticles(this.particles[aIdx], this.particles[bIdx]);
              }
            }
          }
        }
      }
    }

    this.updateInstanceMatrix();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      if (this.particles.length === 0) this.spawn(this.count);
      this.clock.stop();
      this.clock.start();
      return true;
    } else {
      this.clock.stop();
      this.clear();
      return false;
    }
  }

  setSpeed(v) { this.speed = v; }
  setRestitution(r) { this.restitution = r; }
  setGravity(g) { this.gravity = g; }

  getParticles() { return this.particles; }
  isEnabled() { return this.enabled; }
  getClock() { return this.clock; }
}
