import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155/build/three.module.js';

export class Cube {
  constructor(scene) {
    this.scene = scene;
    this.geometry = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    this.material = new THREE.MeshStandardMaterial({
      color: 0x5f9cff,
      metalness: 0.5,
      roughness: 0.2,
      emissive: 0x17355f,
      emissiveIntensity: 0.2,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
    this._overridePosition = false; // true while user is dragging
  }

  reset() {
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
  }

  update(t) {
    // Rotation always follows animation timeline
    this.mesh.rotation.x = t * 0.9;
    this.mesh.rotation.y = t * 1.2;
    this.mesh.rotation.z = t * 0.6;

    // Position follows animation only when not being dragged by the user
    if (!this._overridePosition) {
      this.mesh.position.x = Math.cos(t * 0.55) * 0.95;
      this.mesh.position.y = Math.sin(t * 0.95) * 0.45 + 0.5;
      this.mesh.position.z = Math.sin(t * 0.8) * 1.05;
    }
  }

  /** Lock cube at a world position (called every frame during drag). */
  setDragPosition(v3) {
    this._overridePosition = true;
    this.mesh.position.copy(v3);
  }

  /** Release drag override — animation resumes on next update(). */
  releaseDrag() {
    this._overridePosition = false;
  }

  getMesh() {
    return this.mesh;
  }

  setEmissiveColor(hsl) {
    this.material.emissive.setHSL(hsl.h, hsl.s, hsl.l);
  }

  setColor(hsl) {
    this.material.color.setHSL(hsl.h, hsl.s, hsl.l);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
