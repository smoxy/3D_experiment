import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155/build/three.module.js';

export class SceneSetup {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x081220);
    this.initLights();
    this.initFloorAndGrid();
  }

  initLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3.2, 5.5, 2.1);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x91baff, 0.5);
    fillLight.position.set(-2.4, 1.2, -1.8);
    this.scene.add(fillLight);
  }

  initFloorAndGrid() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x071127, roughness: 0.83, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.05;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(16, 32, 0x4a7cff, 0x1a2f51);
    grid.position.y = -1;
    this.scene.add(grid);
  }

  getScene() {
    return this.scene;
  }
}
