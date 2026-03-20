import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155/build/three.module.js';

export class ParticleSystem {
  constructor(scene, cube) {
    this.scene = scene;
    this.cube = cube;
    this.particles = [];
    this.enabled = false;
    this.clock = new THREE.Clock();
    
    // Parameters
    this.count = 80;
    this.speed = 20;
    this.restitution = 0.9;
    this.gravity = 9.8;
    this.floorY = -1.0;
    this.radius = 0.06;
  }

  createParticle() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 18, 14),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5),
        roughness: 0.4,
        metalness: 0.1
      })
    );
    
    mesh.position.set(
      (Math.random() - 0.5) * 10,
      Math.random() * 3 + 1,
      (Math.random() - 0.5) * 10
    );
    
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * this.speed,
      (Math.random() - 0.5) * this.speed,
      (Math.random() - 0.5) * this.speed
    );
    
    const mass = 0.8 + Math.random() * 0.8;
    this.scene.add(mesh);
    this.particles.push({ mesh, vel, radius: this.radius, mass });
  }

  spawn(n) {
    for (let i = 0; i < n; i++) this.createParticle();
  }

  clear() {
    for (const p of this.particles) this.scene.remove(p.mesh);
    this.particles.length = 0;
  }

  setCount(n) {
    if (this.particles.length < n) {
      this.spawn(n - this.particles.length);
    } else if (this.particles.length > n) {
      const removeN = this.particles.length - n;
      for (let i = 0; i < removeN; i++) {
        const p = this.particles.pop();
        this.scene.remove(p.mesh);
      }
    }
    this.count = n;
  }

  resolveCollision(p, q) {
    const posP = p.mesh.position;
    const posQ = q.mesh.position;
    const delta = new THREE.Vector3().subVectors(posQ, posP);
    const dist = delta.length();
    const minDist = p.radius + q.radius;
    
    if (dist === 0) return;
    
    if (dist < minDist) {
      const n = delta.clone().divideScalar(dist);
      const penetration = minDist - dist;
      posP.addScaledVector(n, -penetration * 0.5);
      posQ.addScaledVector(n, penetration * 0.5);

      const rv = q.vel.clone().sub(p.vel);
      const velAlongNormal = rv.dot(n);
      if (velAlongNormal > 0) return;

      const e = Math.min(this.restitution, 1);
      const j = -(1 + e) * velAlongNormal / (1 / p.mass + 1 / q.mass);
      const impulse = n.clone().multiplyScalar(j);
      p.vel.addScaledVector(impulse, -1 / p.mass);
      q.vel.addScaledVector(impulse, 1 / q.mass);
    }
  }

  resolveParticleCubeCollision(p) {
    const box = new THREE.Box3().setFromObject(this.cube.getMesh());
    const closest = new THREE.Vector3().copy(p.mesh.position);
    closest.x = Math.max(box.min.x, Math.min(closest.x, box.max.x));
    closest.y = Math.max(box.min.y, Math.min(closest.y, box.max.y));
    closest.z = Math.max(box.min.z, Math.min(closest.z, box.max.z));
    
    const delta = new THREE.Vector3().subVectors(p.mesh.position, closest);
    const dist = delta.length();
    const minDist = p.radius;
    
    if (dist < minDist && dist > 0.0001) {
      const n = delta.clone().divideScalar(dist);
      const penetration = minDist - dist;
      p.mesh.position.addScaledVector(n, penetration + 0.002);

      const velAlongNormal = p.vel.dot(n);
      if (velAlongNormal < 0) {
        // Elastic reflection: no damping multiplier, energy conserved per restitution only
        const bounce = -(1 + this.restitution) * velAlongNormal;
        p.vel.addScaledVector(n, bounce);
      }
    }
  }

  update(dt) {
    if (!this.enabled || this.particles.length === 0) return;

    const actualDt = Math.min(dt, 0.033);
    
    // Debug log (ogni ~10 frame)
    if (Math.random() < 0.05 && this.particles.length > 0) {
      const sampleVel = this.particles[0].vel.length();
      console.debug(`[Particles] dt=${actualDt.toFixed(4)}, vel_mag=${sampleVel.toFixed(2)}, gravity=${this.gravity}, count=${this.particles.length}`);
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      // Standard Euler integration: F = m*a, a = g, no friction
      p.vel.y -= this.gravity * actualDt;
      p.mesh.position.addScaledVector(p.vel, actualDt);

      if (p.mesh.position.y - p.radius < this.floorY) {
        p.mesh.position.y = this.floorY + p.radius;
        // Elastic floor bounce: only Y reversal scaled by restitution, no XZ attrition
        p.vel.y = -p.vel.y * this.restitution;
      }

      this.resolveParticleCubeCollision(p);
    }

    // Spatial hash for collisions
    const cellSize = this.radius * 4;
    const hash = new Map();
    const cellKey = (x, y, z) => `${x},${y},${z}`;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const x = Math.floor(p.mesh.position.x / cellSize);
      const y = Math.floor(p.mesh.position.y / cellSize);
      const z = Math.floor(p.mesh.position.z / cellSize);
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
                this.resolveCollision(this.particles[aIdx], this.particles[bIdx]);
              }
            }
          }
        }
      }
    }
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
