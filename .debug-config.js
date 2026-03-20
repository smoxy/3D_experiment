/**
 * Saluti3D Debug Configuration
 * Centralizes debugging and monitoring for development.
 * 
 * Enable by setting ?debug=1 in URL query string or localStorage.
 */

export class DebugConfig {
  constructor() {
    // Check if debug mode is enabled via URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const debugQuery = urlParams.get('debug');
    const debugLocalStorage = localStorage.getItem('saluti3d-debug');
    
    this.enabled = debugQuery === '1' || debugLocalStorage === '1';
    this.logLevel = 'info'; // 'debug', 'info', 'warn', 'error'
    this.captureErrors = true;
    this.captureWarnings = true;
    this.monitorPerformance = true;
    this.checkMemory = true;
    this.verbose = true;
    
    this.stats = {
      frameCount: 0,
      fps: 0,
      lastFpsTime: Date.now(),
      errors: [],
      warnings: [],
      memorySnapshots: [],
    };
    
    if (this.enabled) {
      this.init();
    }
  }

  init() {
    console.log('%c[DEBUG] Saluti3D Debug Mode Enabled', 'color: #00ff00; font-weight: bold; font-size: 14px;');
    console.log('Enable: ?debug=1 | Disable: ?debug=0 | localStorage.setItem("saluti3d-debug", "1")');
    
    // Hook console methods
    this.hookConsole();
    
    // Hook window errors
    this.hookWindowErrors();
    
    // Set up periodic stats reporting
    this.scheduleStatsReport();
  }

  hookConsole() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.log = (...args) => {
      originalLog('%c[LOG]', 'color: #4a9eff;', ...args);
    };
    
    console.warn = (...args) => {
      originalWarn('%c[WARN]', 'color: #ffb74d;', ...args);
      if (this.captureWarnings) this.stats.warnings.push(args);
    };
    
    console.error = (...args) => {
      originalError('%c[ERROR]', 'color: #ff6b6b;', ...args);
      if (this.captureErrors) this.stats.errors.push(args);
    };
  }

  hookWindowErrors() {
    window.addEventListener('error', (event) => {
      console.error('[UNCAUGHT]', event.message, event.filename, event.lineno);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[UNHANDLED PROMISE]', event.reason);
    });
  }

  scheduleStatsReport() {
    setInterval(() => {
      this.reportStats();
      if (this.checkMemory) this.captureMemory();
    }, 5000); // Every 5 seconds
  }

  reportStats() {
    const now = Date.now();
    const elapsed = (now - this.stats.lastFpsTime) / 1000;
    this.stats.fps = Math.round(this.stats.frameCount / elapsed);
    
    console.group('%c[STATS] Performance Summary', 'color: #51cf66; font-weight: bold;');
    console.log(`FPS: ${this.stats.fps}`);
    console.log(`Frame Count: ${this.stats.frameCount}`);
    console.log(`Errors Captured: ${this.stats.errors.length}`);
    console.log(`Warnings Captured: ${this.stats.warnings.length}`);
    if (this.stats.memorySnapshots.length > 0) {
      const last = this.stats.memorySnapshots[this.stats.memorySnapshots.length - 1];
      console.log(`Memory (last): ${last.usedJSHeapSize ? (last.usedJSHeapSize / 1048576).toFixed(2) + ' MB' : 'unavailable'}`);
    }
    console.groupEnd();
    
    this.stats.frameCount = 0;
    this.stats.lastFpsTime = now;
  }

  captureMemory() {
    if (performance?.memory) {
      this.stats.memorySnapshots.push({
        timestamp: Date.now(),
        ...performance.memory,
      });
      // Keep only last 10 snapshots
      if (this.stats.memorySnapshots.length > 10) {
        this.stats.memorySnapshots.shift();
      }
    }
  }

  recordFrame() {
    this.stats.frameCount++;
  }

  enable() {
    this.enabled = true;
    localStorage.setItem('saluti3d-debug', '1');
    location.reload();
  }

  disable() {
    this.enabled = false;
    localStorage.removeItem('saluti3d-debug');
    location.reload();
  }

  getErrorLog() {
    return this.stats.errors;
  }

  getWarningLog() {
    return this.stats.warnings;
  }

  exportLogs() {
    return {
      errors: this.stats.errors,
      warnings: this.stats.warnings,
      memory: this.stats.memorySnapshots,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create global instance
export const debugConfig = new DebugConfig();
