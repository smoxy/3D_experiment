import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155/build/three.module.js';

// Global logger from app.js
let globalLogger = null;
export function setParticleSystemLogger(logger) {
  globalLogger = logger;
}

export class ParticleSystem {
  constructor(scene, cube, rapierWorld) {
    this.scene = scene;
    this.cube = cube;
    this.rapierWorld = rapierWorld;
    this.particles = []; // { position: Vector3, color: Color, body, collider }
    this.enabled = false;
    this.visibleCount = 0;

    // Parameters
    this.count = 80;
    this.speed = 20;
    this.restitution = 0.9;
    this.gravity = 9.8;
    this.radius = 0.06;
    this.maxParticles = 10000;

    // InstancedMesh: single draw call for all particles
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
    this.instancedMesh.count = 0; // no particles yet
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

    const color = new THREE.Color().setHSL(Math.random(), 0.6, 0.5);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * this.speed,
      (Math.random() - 0.5) * this.speed,
      (Math.random() - 0.5) * this.speed
    );
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      Math.random() * 3 + 1,
      (Math.random() - 0.5) * 10
    );

    const { body, collider } = this.rapierWorld.createParticleBody(
      position, vel, this.radius, this.restitution
    );
    const idx = this.particles.length;
    this.particles.push({ position, color, body, collider });
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
    if (globalLogger) {
      globalLogger.info('PARTICLES', `Spawned ${n} particles. Total: ${this.visibleCount}`);
    }
  }

  clear() {
    const oldCount = this.particles.length;
    for (const p of this.particles) {
      this.rapierWorld.removeBody(p.body);
    }
    this.particles.length = 0;
    this.visibleCount = 0;
    this.instancedMesh.count = 0;
    if (globalLogger && oldCount > 0) {
      globalLogger.info('PARTICLES', `Cleared ${oldCount} particles.`);
    }
  }

  setCount(n) {
    n = Math.min(n, this.maxParticles);
    if (this.particles.length < n) {
      this.spawn(n - this.particles.length);
    } else if (this.particles.length > n) {
      const toRemove = this.particles.splice(n);
      for (const p of toRemove) this.rapierWorld.removeBody(p.body);
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

  update(dt) {
    if (!this.enabled || this.particles.length === 0 || dt === 0) return;

    // Push the cube's current animated transform into the Rapier kinematic body
    // so collision detection uses the correct cube position for this frame.
    this.rapierWorld.syncCubeBody(this.cube.getMesh());

    // Step the physics world (timestep = real dt → framerate-independent)
    this.rapierWorld.step(dt);

    // Read back positions from Rapier rigid bodies into our Vector3 store for rendering
    for (let i = 0; i < this.visibleCount; i++) {
      const p = this.particles[i];
      const t = p.body.translation();
      p.position.set(t.x, t.y, t.z);
    }

    // Periodic stats logging (every ~60 frames = ~1 sec at 60fps)
    if (!this.frameCounter) this.frameCounter = 0;
    this.frameCounter++;
    if (this.frameCounter % 60 === 0 && globalLogger) {
      globalLogger.debug(
        'PARTICLES',
        `[${this.visibleCount} active] g=${this.gravity.toFixed(1)} m/s², e=${this.restitution.toFixed(2)}, v=${this.speed.toFixed(1)} u/s`
      );
    }

    this.updateInstanceMatrix();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      if (this.particles.length === 0) this.spawn(this.count);
      if (globalLogger) globalLogger.success('PARTICLES', 'Enabled');
      return true;
    } else {
      this.clear();
      if (globalLogger) globalLogger.info('PARTICLES', 'Disabled');
      return false;
    }
  }

  setSpeed(v) {
    const oldSpeed = this.speed;
    this.speed = v;
    if (globalLogger && Math.abs(oldSpeed - v) > 0.01) {
      globalLogger.debug('PARTICLES', `Speed: ${oldSpeed.toFixed(1)} → ${v.toFixed(1)} u/s`);
    }
  }

  setRestitution(r) {
    const oldRest = this.restitution;
    this.restitution = r;
    for (const p of this.particles) p.collider.setRestitution(r);
    if (globalLogger && Math.abs(oldRest - r) > 0.01) {
      globalLogger.debug('PARTICLES', `Restitution: ${oldRest.toFixed(2)} → ${r.toFixed(2)}`);
    }
  }

  setGravity(g) {
    const oldGrav = this.gravity;
    this.gravity = g;
    this.rapierWorld.setGravity(g);
    if (globalLogger && Math.abs(oldGrav - g) > 0.1) {
      globalLogger.debug('PARTICLES', `Gravity: ${oldGrav.toFixed(1)} → ${g.toFixed(1)} m/s²`);
    }
  }

  isEnabled() { return this.enabled; }
}
