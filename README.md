# Saluti 3D

Interactive 3D particle simulation with physics engine integration. A high-performance WebGL application featuring a rotating cube, dynamic particle system with Rapier physics, boundary collision detection, and real-time parameter control.

## Project Overview

Saluti 3D is a comprehensive 3D graphics demonstration built with Three.js 0.155 and Rapier physics engine (via skypack compat build). The application supports:

- 10,000 particles rendered via GPU instancing (single draw call)
- Real-time physics simulation with elastic collisions
- Boundary box containment with 4 walls and ceiling
- Interactive parameters: gravity, restitution, particle speed, spawn count
- Modular architecture with component-based ES modules
- Advanced debugging and performance monitoring
- Comprehensive test suite for CI/CD integration

## Quick Start

### Prerequisites

- Python 3 or Node.js (for HTTP server)
- Modern browser with WebGL support (Chrome, Firefox, Safari, Edge)
- 4 GB RAM minimum

### Running Locally

1. Clone or navigate to the project directory:
   ```bash
   cd /home/coder/saluti3d
   ```

2. Start the HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
   Or with Node.js:
   ```bash
   npx http-server -p 8000
   ```

3. Open in browser:
   - Standard mode: http://localhost:8000
   - Debug mode: http://localhost:8000/?debug=1
   - Debug console: http://localhost:8000/.debug-console.html

## Features

### Rendering System

- Three.js WebGL renderer with antialiasing and gamma correction
- InstancedMesh for 10,000 particles with per-particle colors
- Standard material with roughness/metalness PBR properties
- Ambient + directional (key + fill) lighting
- Grid floor and wireframe boundary visualization

### Physics Engine

- Rapier 3D WASM physics engine
- Euler integration for particle dynamics
- Spatial hash collision detection (O(n) performance)
- Kinematic cube movement with collision response
- Elastic impulse-based collision resolution
- Configurable gravity (0-20 m/s^2)
- Boundary walls and ceiling as static colliders

### User Interface

- Responsive canvas scaling
- Control buttons: Reset, Theme Toggle, Random Colors, Particles ON/OFF, Pause
- 4 parameter sliders with live tooltips:
  - Particle Count (1-10000)
  - Initial Velocity (0.1-6 u/s)
  - Restitution Coefficient (0-1)
  - Gravity Acceleration (0-20 m/s^2)
- Dark/Light theme toggle with localStorage persistence
- Real-time debug display overlay

### Modular Architecture

Core modules in `js/modules/`:

- **Scene.js**: Scene setup, lights, floor, grid, boundary wireframe
- **Cube.js**: Animated rotating cube mesh (solid rendering, no edges)
- **ParticleSystem.js**: Particle lifecycle, spawning, physics integration, InstancedMesh management
- **CameraControls.js**: OrbitControls wrapper with damping
- **physics/RapierWorld.js**: Physics world configuration, rigid body creation, collision management

## Development & Debugging

### Debug Mode

Enable debug mode to activate comprehensive logging and monitoring:

1. Via URL:
   ```
   http://localhost:8000/?debug=1
   ```

2. Via localStorage:
   ```javascript
   localStorage.setItem('saluti3d-debug', '1');
   location.reload();
   ```

3. Disable:
   ```javascript
   localStorage.removeItem('saluti3d-debug');
   location.reload();
   ```

### Debug Console

Access the debug console at:
```
http://localhost:8000/.debug-console.html
```

Features:
- Real-time performance stats (FPS, frame count, memory)
- Automated test suite (WebGL, Three.js, Rapier, DOM, Performance APIs)
- Error/warning capture and logging
- Memory snapshots (updated every 5 seconds)
- Direct links to app in debug/normal mode
- Browser environment information

### Browser DevTools

Press F12 to open DevTools in your browser:

- **Console**: View all logging output, errors, and warnings with timestamps
- **Sources**: Set breakpoints in JavaScript files for step-through debugging
- **Performance**: Record frame-by-frame performance with flame graph analysis
- **Memory**: Heap snapshots to detect memory leaks (look for growing particle instances)
- **Networks**: Monitor HTTP requests and asset loading times

### Logging System

The application uses a centralized Logger class with color-coded output:

- Info (blue): General status messages
- Success (green): Initialization complete, system ready
- Debug (gray): Verbose per-frame statistics
- Warn (orange): Non-fatal issues
- Error (red): Fatal errors requiring attention

Example console output:
```
[0.03s] [APP] Caricamento motore fisico...
[0.15s] [RAPIER] Physics world initialized (gravity 9.8 m/s)
[1.23s] [PARTICLES] Spawned 80 particles. Total: 80
[12.45s] [STATS] [80 active] g=9.8 m/s, e=0.90, v=20.0 u/s
```

### Performance Monitoring

Enable frame-by-frame stats monitoring:

1. Enable debug mode (?debug=1)
2. Open browser console (F12)
3. Stats report every 5 seconds showing:
   - FPS (frames per second)
   - Frame count
   - Captured errors/warnings
   - Memory usage

Key metrics to monitor:
- FPS should remain >= 50 at 10000 particles
- Memory growth should be < 10 MB per minute (stable)
- No JavaScript errors or async promise rejections

### Automated Tests

Run the test suite to validate system state:

From debug console (.debug-console.html):
- Click "Run All Tests" button

From browser console:
```javascript
await tests.runAll()
```

Tests validate:
- WebGL support
- Three.js module loading
- Rapier physics module availability
- DOM structure completeness
- Performance API functionality

## Project Structure

```
saluti3d/
  index.html                    - Main application page
  .debug-console.html           - Debug console UI
  README.md                     - This file
  favicon.ico                   - Site icon
  
  css/
    style.css                   - Responsive styles, tooltips, theme
  
  js/
    app.js                      - Application entry point, render loop, event handlers
    
    modules/
      Scene.js                  - Three.js scene setup (lights, floor, boundaries)
      Cube.js                   - Animated cube mesh and controls
      ParticleSystem.js         - Particle lifecycle, rendering, Rapier integration
      CameraControls.js         - OrbitControls wrapper
      
      physics/
        RapierWorld.js          - Rapier physics world, bodies, collision management
  
  .debug-config.js              - Debug configuration and monitoring helpers
  .automated-tests.js           - Automated test suite for CI/CD
```

## File Details

### index.html

Entry point with:
- Canvas element (#scene) for WebGL rendering
- Control buttons with event listeners
- 4 parameter sliders with real-time value display
- Tooltips explaining physics parameters
- Debug output overlay (#debug)
- ImportMap for ES module dependencies

### app.js

Main application logic:
- Renderer initialization (WebGL, resolution, color space)
- Scene and primitive setup (cube, particles, camera)
- Physics world initialization (Rapier)
- Render loop (requestAnimationFrame)
- Event handlers (buttons, sliders, keyboard, resize)
- Error handling and debug output
- Pause/resume with frame accumulation

Key functions:
- `animate()`: Main render loop, updates cube/particles/camera, renders scene
- `setupEventHandlers()`: Attaches listeners to buttons and sliders
- `debug()`: Centralized logging via Logger class

### ParticleSystem.js

Manages particle lifecycle and rendering:
- Creates particles with random position, velocity, color
- Integrates with Rapier for physics
- Updates InstancedMesh each frame
- Syncs cube position for collisions
- Logs spawn/clear events and periodic stats

### RapierWorld.js

Physics engine wrapper:
- Initializes Rapier WASM asynchronously
- Creates static floor, walls, ceiling
- Creates kinematic cube body (synchronized with mesh)
- Creates dynamic particle bodies
- Steps world physics each frame
- Manages gravity and collider properties

## Dependencies

### CDN Libraries

- **Three.js 0.155**: 3D graphics library (ES modules via jsdelivr)
- **OrbitControls**: Three.js camera controller (from CDN)
- **Rapier Physics**: WASM physics engine (skypack compat build)

### ES Modules

All JavaScript is written as native ES modules with import statements. No build system or bundler required for development.

## Keyboard Shortcuts

None configured by default, but can be added in `setupEventHandlers()`:

Suggested additions:
- D: Toggle debug mode
- P: Toggle pause
- R: Reset scene
- Spacebar: Toggle particles

## Browser Compatibility

Fully supported:
- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Mobile browsers (touch-capable)

Requires:
- WebGL 1.0 or 2.0 support
- ES2020 module support
- WebAssembly (for Rapier physics)

## Known Limitations

- Particle limit: 10,000 (GPU instancing constraint)
- Physics timestep: capped at 33ms (spiral of death prevention)
- Boundary collision: boxes only (no rounded corners)
- No multi-threading: physics runs on main thread (JS single-threaded in browsers)

## Future Enhancements

### FASE 5: Visual Effects

- Bloom post-processing (UnrealBloomPass)
- Screen-space ambient occlusion (SSAO)
- Tone mapping (ACES filmic)
- Particle trails and motion blur

### FASE 6: UI & Monitoring

- FPS counter with history graph
- Draw call counter
- Memory usage monitor
- Adaptive DPR scaling

### FASE 7: Validation & Testing

- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile device testing
- Memory leak detection
- 10k particle stress testing
- Automated CI/CD pipeline

## Troubleshooting

### Black screen, no content

- Check browser console (F12) for errors
- Verify WebGL support: http://localhost:8000/?debug=1
- Try different browser (Chrome recommended)
- Clear cache and reload

### Particles not spawning

1. Click "Particelle ON" button
2. Click "Applica parametri" button
3. Check debug console for spawn messages
4. Verify slider value > 0

### Physics not working (particles fall off-screen)

- Check browser console for Rapier errors
- Verify physics world initialized: look for "Physics world initialized" message
- Particles should stop at boundary (wireframe box outline)

### Performance lag (FPS < 30)

- Reduce particle count with slider (try 1000, 100)
- Close other browser tabs
- Enable debug mode to check memory usage
- Try Chrome instead of Firefox (WebGL performance varies)

### Sliders not responding

- Verify buttons visible on page
- Click "Applica parametri" to apply changes
- Reload page (F5)

## Performance Tips

### For Development

- Use Chrome DevTools: Performance tab for profiling
- Enable debug mode (?debug=1) for real-time stats
- Monitor memory with heap snapshots (Memory tab)
- Use 1000-2000 particles for interactive development

### For Production

- Set particle count to typical use case (50-1000)
- Enable GPU acceleration in browser settings
- Use modern hardware (2015+ graphics card)
- Test on target devices before deployment

## License

No license specified. Created as educational example.

## Contact / Support

For issues or improvements, refer to debug console (.debug-console.html) for system diagnostics.

---

Last Updated: March 2026
Version: 4.0 (FASE 4: Rapier Integration + Debug System)

