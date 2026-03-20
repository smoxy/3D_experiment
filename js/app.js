import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155/build/three.module.js';
import { SceneSetup } from './modules/Scene.js';
import { Cube } from './modules/Cube.js';
import { ParticleSystem, setParticleSystemLogger } from './modules/ParticleSystem.js';
import { CameraControlsSetup } from './modules/CameraControls.js';
import { RapierWorld } from './modules/physics/RapierWorld.js';

const debugEl = document.querySelector('#debug');
const canvas = document.querySelector('#scene');

/**
 * Simple logger: prints to console with timestamp + prefix, appends to debug element.
 */
class Logger {
  constructor(maxLines = 20) {
    this.maxLines = maxLines;
    this.lines = [];
    this.startTime = Date.now();
  }

  log(level, prefix, msg) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const fullMsg = `[${elapsed}s] [${prefix}] ${msg}`;
    
    // Console output with styling
    const consoleStyle = this._getConsoleStyle(level);
    if (consoleStyle) {
      console.log(`%c${fullMsg}`, consoleStyle);
    } else {
      console.log(fullMsg);
    }

    // Debug element: append to history (max lines)
    this.lines.push(fullMsg);
    if (this.lines.length > this.maxLines) this.lines.shift();
    if (debugEl) {
      debugEl.textContent = this.lines.join('\n');
      debugEl.scrollTop = debugEl.scrollHeight;
    }
  }

  _getConsoleStyle(level) {
    switch (level) {
      case 'info': return 'color: #4a9eff; font-weight: bold;';
      case 'warn': return 'color: #ffb74d; font-weight: bold;';
      case 'error': return 'color: #ff6b6b; font-weight: bold;';
      case 'success': return 'color: #51cf66; font-weight: bold;';
      case 'debug': return 'color: #888; font-size: 0.9em;';
      default: return '';
    }
  }

  info(prefix, msg) { this.log('info', prefix, msg); }
  warn(prefix, msg) { this.log('warn', prefix, msg); }
  error(prefix, msg) { this.log('error', prefix, msg); }
  success(prefix, msg) { this.log('success', prefix, msg); }
  debug(prefix, msg) { this.log('debug', prefix, msg); }
}

const logger = new Logger();

function debug(msg) {
  logger.info('APP', msg);
}

function isWebGLAvailable() {
  try {
    const testCanvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

async function main() {
try {
  if (!canvas) throw new Error('Canvas #scene non trovato');
  if (!isWebGLAvailable()) {
    debug('WebGL non disponibile');
    document.body.classList.add('no-webgl');
    throw new Error('WebGL non disponibile');
  }

  // Renderer setup
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x081220, 1);

  // Scene + primitives
  const sceneSetup = new SceneSetup();
  const scene = sceneSetup.getScene();
  
  const cube = new Cube(scene);
  const rapierWorld = new RapierWorld();
  logger.info('APP', 'Caricamento motore fisico Rapier.js...');
  await rapierWorld.init(9.8);
  logger.success('RAPIER', 'Physics world initialized (gravity 9.8 m/s²)');
  
  const particles = new ParticleSystem(scene, cube, rapierWorld);
  setParticleSystemLogger(logger);
  logger.success('APP', 'ParticleSystem initialized');
  
  // Camera
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3.4, 2.1, 4.2);

  // Controls
  const cameraControls = new CameraControlsSetup(camera, renderer);
  const controls = cameraControls.getControls();

  // Global state
  const clock = new THREE.Clock();
  let elapsedTime = 0; // manual accumulator: avoids getElapsedTime()+getDelta() double-call bug
  let paused = false;
  let colorCycleActive = false;
  let colorCycleSpeed = 0.12;
  let currentHue = 0;
  const hueClock = new THREE.Clock();

  function resetCube() {
    cube.reset();
    controls.target.set(0, 0.5, 0);
    controls.update();
    elapsedTime = 0;
    clock.stop();
    clock.start();
    debug('Cubo resettato');
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function animate() {
    requestAnimationFrame(animate);

    // Single getDelta() call per frame — prevents double-call bug where
    // getElapsedTime() internally calls getDelta(), leaving dt ≈ 0 for particles.
    const dt = clock.getDelta();
    // Accumulate elapsed only when not paused, so cube/camera freeze correctly.
    if (!paused) {
      elapsedTime += dt;
      cube.update(elapsedTime);

      const ca = Math.sin(elapsedTime * 0.14) * 2.6;
      const cb = Math.cos(elapsedTime * 0.11) * 2.2;
      const cc = Math.sin(elapsedTime * 0.12) * 1.8 + 2.4;
      camera.position.set(ca, cc, cb);
    }

    // Color cycle
    if (colorCycleActive) {
      const hueDt = hueClock.getDelta();
      currentHue = (currentHue + hueDt * colorCycleSpeed) % 1;
      cube.setColor({ h: currentHue, s: 0.6, l: 0.55 });
      cube.setEmissiveColor({ h: currentHue, s: 0.6, l: 0.12 });
    }

    camera.lookAt(cube.getMesh().position);

    // Pass dt=0 when paused so particles freeze instantly without needing
    // to restart the clock (avoids a large dt spike on unpause).
    particles.update(paused ? 0 : dt);

    cameraControls.update();
    renderer.render(scene, camera);
  }

  function setupEventHandlers() {
    // Theme
    const toggleThemeBtn = document.querySelector('#toggleThemeBtn');
    toggleThemeBtn?.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      if (isDark) {
        cube.setColor({ h: 0.56, s: 0.97, l: 0.62 }); // light blue
        cube.setEmissiveColor({ h: 0.58, s: 1.0, l: 0.15 });
      } else {
        cube.setColor({ h: 0.56, s: 1.0, l: 0.63 }); // original blue
        cube.setEmissiveColor({ h: 0.57, s: 1.0, l: 0.21 });
      }
      localStorage.setItem('saluti3d-theme-dark', isDark ? '1' : '0');
      debug(isDark ? 'Tema scuro' : 'Tema chiaro');
    });

    // Reset
    const resetBtn = document.querySelector('#resetBtn');
    resetBtn?.addEventListener('click', resetCube);

    // Pause
    const pauseBtn = document.querySelector('#pauseBtn');
    pauseBtn?.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? 'Riprendi' : 'Pausa';
      debug(paused ? 'Pausa' : 'Riprendi');
    });

    // Color cycle
    const randomColorBtn = document.querySelector('#randomColorBtn');
    randomColorBtn?.addEventListener('click', () => {
      colorCycleActive = !colorCycleActive;
      if (colorCycleActive) {
        const hsl = {};
        cube.getMesh().material.color.getHSL(hsl);
        currentHue = hsl.h % 1;
        hueClock.start();
        randomColorBtn.textContent = 'Ferma colori';
        debug('Ciclo colori');
      } else {
        hueClock.stop();
        randomColorBtn.textContent = 'Colore casuale';
        debug('Stop colori');
      }
    });

    // Particles toggle
    const toggleParticlesBtn = document.querySelector('#toggleParticlesBtn');
    toggleParticlesBtn?.addEventListener('click', () => {
      const enabled = particles.toggle();
      toggleParticlesBtn.textContent = enabled ? 'Particelle OFF' : 'Particelle ON';
      debug(enabled ? 'Particelle ON' : 'Particelle OFF');
    });

    // Sliders - live update
    const particleCountSlider = document.querySelector('#particleCountSlider');
    const particleSpeedSlider = document.querySelector('#particleSpeedSlider');
    const restitutionSlider = document.querySelector('#restitutionSlider');
    const gravitySlider = document.querySelector('#gravitySlider');
    const countVal = document.querySelector('#countVal');
    const speedVal = document.querySelector('#speedVal');
    const restVal = document.querySelector('#restVal');
    const gravityVal = document.querySelector('#gravityVal');

    particleCountSlider?.addEventListener('input', (e) => {
      countVal.textContent = e.target.value;
    });
    particleSpeedSlider?.addEventListener('input', (e) => {
      speedVal.textContent = e.target.value;
      particles.setSpeed(parseFloat(e.target.value));
    });
    restitutionSlider?.addEventListener('input', (e) => {
      restVal.textContent = e.target.value;
      particles.setRestitution(parseFloat(e.target.value));
    });
    gravitySlider?.addEventListener('input', (e) => {
      gravityVal.textContent = e.target.value;
      particles.setGravity(parseFloat(e.target.value));
    });

    // Apply button
    const applyParticlesBtn = document.querySelector('#applyParticlesBtn');
    applyParticlesBtn?.addEventListener('click', () => {
      const newCount = parseInt(particleCountSlider.value, 10) || 0;
      const newSpeed = parseFloat(particleSpeedSlider.value) || 1;
      const newRest = parseFloat(restitutionSlider.value) || 0.5;
      const newGravity = parseFloat(gravitySlider.value) || 9.8;

      particles.setSpeed(newSpeed);
      particles.setRestitution(newRest);
      particles.setGravity(newGravity);
      particles.setCount(newCount);

      debug(`Parametri: count=${newCount} speed=${newSpeed} rest=${newRest} gravity=${newGravity.toFixed(1)}`);
    });

    // Load theme preference
    try {
      const pref = localStorage.getItem('saluti3d-theme-dark');
      if (pref === '1') {
        document.body.classList.add('dark');
        cube.setColor({ h: 0.56, s: 0.97, l: 0.62 });
        cube.setEmissiveColor({ h: 0.58, s: 1.0, l: 0.15 });
      }
    } catch (e) {
      // ignore
    }
  }

  // Init
  window.addEventListener('resize', resize, false);
  resize();
  camera.lookAt(cube.getMesh().position);
  renderer.render(scene, camera);
  setupEventHandlers();
  animate();

  debug('Pronto. FASE 4: Rapier.js integrato.');
} catch (error) {
  console.error(error);
  debug('Errore inizializzazione: ' + (error.message || error));
}
}
main();

window.onerror = function (msg, url, line, col, error) {
  const err = `${msg} (${url}:${line}:${col})`;
  debug('Errore JS: ' + err);
  return false;
};

window.addEventListener('unhandledrejection', function (event) {
  debug('Promise non gestita: ' + event.reason);
});
