import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.155/examples/jsm/controls/OrbitControls.js';

const debugEl = document.querySelector('#debug');
const canvas = document.querySelector('#scene');

function debug(msg) {
  if (debugEl) {
    debugEl.textContent = msg;
  } else {
    console.info('[DEBUG]', msg);
  }
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

try {
  if (!canvas) throw new Error('Canvas #scene non trovato');

  if (!isWebGLAvailable()) {
    debug('WebGL non disponibile. Abilitare WebGL o usare un browser aggiornato.');
    document.body.classList.add('no-webgl');
    throw new Error('WebGL non disponibile');
  }

  debug('WebGL disponibile, inizializzo la scena...');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x081220, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081220);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3.4, 2.1, 4.2);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(3.2, 5.5, 2.1);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x91baff, 0.5);
  fillLight.position.set(-2.4, 1.2, -1.8);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x071127, roughness: 0.83, metalness: 0.1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.05;
  scene.add(floor);

  const grid = new THREE.GridHelper(16, 32, 0x4a7cff, 0x1a2f51);
  grid.position.y = -1;
  scene.add(grid);

  const geometry = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x5f9cff,
    metalness: 0.5,
    roughness: 0.2,
    emissive: 0x17355f,
    emissiveIntensity: 0.2,
  });

  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  cube.add(edges);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.minDistance = 2.1;
  controls.maxDistance = 10;
  controls.target.set(0, 0.5, 0);
  controls.update();

  const clock = new THREE.Clock();
  const particleClock = new THREE.Clock(); // separate clock for particle physics
  let paused = false;
  // Color cycle state
  let colorCycleActive = false;
  let colorCycleSpeed = 0.12; // hue rotations per second
  let currentHue = 0; // 0..1
  const hueClock = new THREE.Clock();
  // Particle system
  let particlesEnabled = false;
  const particles = [];
  let PARTICLE_COUNT = 80; // start value, tuned for performance
  const PARTICLE_RADIUS = 0.06;
  let PARTICLE_SPEED = 20; // PHASE 1 FIX: increased from 6.5 to 20 for visible movement (±10 u/s)
  let PARTICLE_RESTITUTION = 0.9; // elastic coefficient
  const FLOOR_Y = -1.0; // approximate floor plane for collision

  function createParticle() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(PARTICLE_RADIUS, 18, 14),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5), roughness: 0.4, metalness: 0.1 })
    );
    // PHASE 1 FIX: spawn zone lontana da cube (±5 X/Z instead ±2, Y 1-4 instead 0.2-2.2)
    mesh.position.set((Math.random() - 0.5) * 10, Math.random() * 3 + 1, (Math.random() - 0.5) * 10);
    const vel = new THREE.Vector3((Math.random() - 0.5) * PARTICLE_SPEED, (Math.random() - 0.5) * PARTICLE_SPEED, (Math.random() - 0.5) * PARTICLE_SPEED);
    const mass = 0.8 + Math.random() * 0.8;
    scene.add(mesh);
    particles.push({ mesh, vel, radius: PARTICLE_RADIUS, mass });
  }

  function spawnParticles(n) {
    for (let i = 0; i < n; i++) createParticle();
  }

  function clearParticles() {
    for (const p of particles) scene.remove(p.mesh);
    particles.length = 0;
  }

  // Elastic collision resolution between two particles p and q
  function resolveCollision(p, q) {
    const posP = p.mesh.position;
    const posQ = q.mesh.position;
    const delta = new THREE.Vector3().subVectors(posQ, posP);
    const dist = delta.length();
    const minDist = p.radius + q.radius;
    if (dist === 0) return;
    if (dist < minDist) {
      const n = delta.clone().divideScalar(dist);
      // positional correction (avoid sinking)
      const penetration = minDist - dist;
      posP.addScaledVector(n, -penetration * 0.5);
      posQ.addScaledVector(n, penetration * 0.5);

      // relative velocity
      const rv = q.vel.clone().sub(p.vel);
      const velAlongNormal = rv.dot(n);
      if (velAlongNormal > 0) return; // moving apart

      const e = Math.min(PARTICLE_RESTITUTION, 1);
      const j = -(1 + e) * velAlongNormal / (1 / p.mass + 1 / q.mass);
      const impulse = n.clone().multiplyScalar(j);
      p.vel.addScaledVector(impulse, -1 / p.mass);
      q.vel.addScaledVector(impulse, 1 / q.mass);
    }
  }

  // Collision resolution between a particle and the cube (approximated using cube's bounding box)
  function resolveParticleCubeCollision(p) {
    // compute cube bounding box in world space (accounts for rotation)
    const box = new THREE.Box3().setFromObject(cube);
    const boxSize = box.getSize(new THREE.Vector3());
    // closest point on box to particle (clamp to box boundaries)
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
      // push particle out of cube
      p.mesh.position.addScaledVector(n, penetration + 0.002);

      // reflect particle velocity (elastic bounce)
      const velAlongNormal = p.vel.dot(n);
      if (velAlongNormal < 0) {
        const bounce = -(1 + PARTICLE_RESTITUTION) * velAlongNormal;
        p.vel.addScaledVector(n, bounce);
        // damp velocity slightly to avoid infinite bouncing
        p.vel.multiplyScalar(0.95);
      }
    }
  }

  function resetCube() {
    cube.position.set(0, 0, 0);
    cube.rotation.set(0, 0, 0);
    controls.target.set(0, 0.5, 0);
    controls.update();
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

    if (!paused) {
      const t = clock.getElapsedTime();

      cube.rotation.x = t * 0.9;
      cube.rotation.y = t * 1.2;
      cube.rotation.z = t * 0.6;

      cube.position.x = Math.cos(t * 0.55) * 0.95;
      cube.position.y = Math.sin(t * 0.95) * 0.45 + 0.5;
      cube.position.z = Math.sin(t * 0.8) * 1.05;

      const ca = Math.sin(t * 0.14) * 2.6;
      const cb = Math.cos(t * 0.11) * 2.2;
      const cc = Math.sin(t * 0.12) * 1.8 + 2.4;
      camera.position.set(ca, cc, cb);
    }
    // update hue cycle if active
    if (colorCycleActive) {
      const hueDt = hueClock.getDelta();
      currentHue = (currentHue + hueDt * colorCycleSpeed) % 1;
      // apply HSL to material
      material.color.setHSL(currentHue, 0.6, 0.55);
      material.emissive.setHSL(currentHue, 0.6, 0.12);
    }

    camera.lookAt(cube.position.x, cube.position.y, cube.position.z);

    // update particles physics
    if (particlesEnabled && particles.length) {
      // integrate positions
      const dt = Math.min(particleClock.getDelta(), 0.033);
      // PHASE 1 FIX: debug log dt and sample velocity
      if (particles.length > 0) {
        const sampleVel = particles[0].vel.length();
        console.debug(`[Particles] dt=${dt.toFixed(4)}, vel_mag=${sampleVel.toFixed(2)}, count=${particles.length}`);
      }
      // gravity
      const gravity = -9.8;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // apply gravity
        p.vel.y += gravity * dt * 0.5;
        // integrate
        p.mesh.position.addScaledVector(p.vel, dt);
        // floor collision
        if (p.mesh.position.y - p.radius < FLOOR_Y) {
          p.mesh.position.y = FLOOR_Y + p.radius;
          p.vel.y = -p.vel.y * PARTICLE_RESTITUTION;
          // slight friction
          p.vel.x *= 0.98;
          p.vel.z *= 0.98;
        }
        // cube collision
        resolveParticleCubeCollision(p);
      }

      // spatial hash to reduce collision checks
      const cellSize = PARTICLE_RADIUS * 4;
      const hash = new Map();
      function cellKey(x, y, z) { return `${x},${y},${z}`; }
      // assign particles to grid
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const x = Math.floor(p.mesh.position.x / cellSize);
        const y = Math.floor(p.mesh.position.y / cellSize);
        const z = Math.floor(p.mesh.position.z / cellSize);
        const key = cellKey(x, y, z);
        if (!hash.has(key)) hash.set(key, []);
        hash.get(key).push(i);
      }

      // check collisions within neighboring cells
      const neighborOffsets = [ -1, 0, 1 ];
      for (const [key, list] of hash.entries()) {
        // parse base cell
        const parts = key.split(',').map(Number);
        const baseX = parts[0], baseY = parts[1], baseZ = parts[2];
        for (let dx of neighborOffsets) for (let dy of neighborOffsets) for (let dz of neighborOffsets) {
          const neighborKey = cellKey(baseX + dx, baseY + dy, baseZ + dz);
          const neighborList = hash.get(neighborKey);
          if (!neighborList) continue;
          for (let i = 0; i < list.length; i++) {
            const aIdx = list[i];
            for (let j = 0; j < neighborList.length; j++) {
              const bIdx = neighborList[j];
              if (aIdx >= bIdx) continue; // avoid double-check and self
              resolveCollision(particles[aIdx], particles[bIdx]);
            }
          }
        }
      }
    }

    controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize, false);
  resize();
  camera.lookAt(cube.position.x, cube.position.y, cube.position.z);
  renderer.render(scene, camera);
  animate();

  const resetBtn = document.querySelector('#resetBtn');
  const toggleThemeBtn = document.querySelector('#toggleThemeBtn');
  const pauseBtn = document.querySelector('#pauseBtn');
  const particleCountSlider = document.querySelector('#particleCountSlider');
  const particleSpeedSlider = document.querySelector('#particleSpeedSlider');
  const restitutionSlider = document.querySelector('#restitutionSlider');
  const applyParticlesBtn = document.querySelector('#applyParticlesBtn');
  const countVal = document.querySelector('#countVal');
  const speedVal = document.querySelector('#speedVal');
  const restVal = document.querySelector('#restVal');

  // Apply stored theme preference on load (no cube reset)
  try {
    const pref = localStorage.getItem('saluti3d-theme-dark');
    if (pref === '1') {
      document.body.classList.add('dark');
      // update material to dark palette
      material.color.setHex(0x9fbfff);
      material.emissive.setHex(0x0f2a46);
    }
  } catch (e) {
    // ignore storage errors
  }

  resetBtn?.addEventListener('click', resetCube);

  // Theme toggle: update CSS class and cube material colors in real-time
  toggleThemeBtn?.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    // update material colors without resetting cube
    try {
      if (isDark) {
        material.color.setHex(0x9fbfff);
        material.emissive.setHex(0x0f2a46);
      } else {
        material.color.setHex(0x5f9cff);
        material.emissive.setHex(0x17355f);
      }
    } catch (e) {
      console.warn('Impossibile aggiornare colori materiale:', e);
    }
    localStorage.setItem('saluti3d-theme-dark', isDark ? '1' : '0');
    debug(isDark ? 'Tema scuro attivato' : 'Tema chiaro attivato');
  });

  // Pause button
  pauseBtn?.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Riprendi' : 'Pausa';
    debug(paused ? 'Animazione in pausa' : 'Animazione ripresa');
  });

  // sliders live update
  particleCountSlider?.addEventListener('input', (e) => {
    countVal.textContent = e.target.value;
  });
  particleSpeedSlider?.addEventListener('input', (e) => {
    speedVal.textContent = e.target.value;
  });
  restitutionSlider?.addEventListener('input', (e) => {
    restVal.textContent = e.target.value;
  });

  // apply particle parameters
  applyParticlesBtn?.addEventListener('click', () => {
    const newCount = parseInt(particleCountSlider.value, 10) || 0;
    const newSpeed = parseFloat(particleSpeedSlider.value) || 1;
    const newRest = parseFloat(restitutionSlider.value) || 0.5;
    PARTICLE_COUNT = newCount;
    PARTICLE_SPEED = newSpeed;
    PARTICLE_RESTITUTION = newRest;
    debug(`Parametri applicati: count=${newCount} speed=${newSpeed} rest=${newRest}`);
    // adjust current particles to match desired count
    if (particles.length < PARTICLE_COUNT) {
      spawnParticles(PARTICLE_COUNT - particles.length);
    } else if (particles.length > PARTICLE_COUNT) {
      const removeN = particles.length - PARTICLE_COUNT;
      for (let i = 0; i < removeN; i++) {
        const p = particles.pop();
        scene.remove(p.mesh);
      }
    }
  });

  // Random color cycle button: toggles continuous smooth hue cycling
  const randomColorBtn = document.querySelector('#randomColorBtn');
  randomColorBtn?.addEventListener('click', () => {
    colorCycleActive = !colorCycleActive;
    if (colorCycleActive) {
      // initialize hue from current material
      const hsl = {};
      material.color.getHSL(hsl);
      currentHue = hsl.h % 1;
      hueClock.start();
      randomColorBtn.textContent = 'Ferma colori';
      debug('Ciclo colori attivato');
    } else {
      hueClock.stop();
      randomColorBtn.textContent = 'Colore casuale';
      debug('Ciclo colori fermato');
    }
  });

  // Particles toggle
  const toggleParticlesBtn = document.querySelector('#toggleParticlesBtn');
  toggleParticlesBtn?.addEventListener('click', () => {
    particlesEnabled = !particlesEnabled;
    if (particlesEnabled) {
      // spawn particles if none
      if (particles.length === 0) spawnParticles(PARTICLE_COUNT);
      // PHASE 1 FIX: reset clock properly (stop then start)
      particleClock.stop();
      particleClock.start();
      toggleParticlesBtn.textContent = 'Particelle OFF';
      debug('Particelle attivate (PHASE 1: vel x3, spawn zone x2.5)');
    } else {
      particleClock.stop();
      clearParticles();
      toggleParticlesBtn.textContent = 'Particelle ON';
      debug('Particelle disattivate');
    }
  });

  debug('Scenario 3D pronto. Muovi il mouse o tocca per controllare.');
} catch (error) {
  console.error(error);
  debug('Errore inizializzazione: ' + (error.message || error));
}

window.onerror = function (msg, url, line, col, error) {
  const err = `${msg} (${url}:${line}:${col})`;
  debug('Errore JS: ' + err);
  return false;
};

window.addEventListener('unhandledrejection', function (event) {
  debug('Promise non gestita: ' + event.reason);
});
