import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.155/examples/jsm/controls/OrbitControls.js';

export class CameraControlsSetup {
  constructor(camera, renderer) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.setupControls();
  }

  setupControls() {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = true;
    this.controls.minDistance = 2.1;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0.5, 0);
    this.controls.update();
  }

  update() {
    this.controls.update();
  }

  getControls() {
    return this.controls;
  }
}
