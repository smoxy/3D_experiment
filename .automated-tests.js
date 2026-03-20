/**
 * Automated Integration Tests for Saluti3D
 * Run in browser console or as part of CI/CD
 */

export class AutomatedTests {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  async runAll() {
    console.log('%c[TEST] Running Automated Tests', 'color: #00ffff; font-weight: bold; font-size: 14px;');
    
    await this.testWebGL();
    await this.testThree();
    await this.testRapier();
    await this.testDOM();
    await this.testPerformance();
    
    this.reportResults();
  }

  async testWebGL() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) throw new Error('WebGL not supported');
      this.pass('WebGL Available');
    } catch (e) {
      this.fail('WebGL Available', e.message);
    }
  }

  async testThree() {
    try {
      // Check if THREE is loaded
      if (!window.THREE) throw new Error('THREE not loaded');
      if (!window.THREE.Scene) throw new Error('THREE.Scene not available');
      if (!window.THREE.WebGLRenderer) throw new Error('THREE.WebGLRenderer not available');
      this.pass('Three.js Loaded');
    } catch (e) {
      this.fail('Three.js Loaded', e.message);
    }
  }

  async testRapier() {
    try {
      // Attempt to import Rapier (test availability)
      const url = new URL('../js/modules/physics/RapierWorld.js', import.meta.url);
      const response = await fetch(url.href);
      if (!response.ok) throw new Error(`RapierWorld fetch failed: ${response.status}`);
      const content = await response.text();
      if (!content.includes('export class RapierWorld')) throw new Error('RapierWorld class not found');
      this.pass('Rapier Physics Module Available');
    } catch (e) {
      this.fail('Rapier Physics Module Available', e.message);
    }
  }

  async testDOM() {
    try {
      const canvas = document.querySelector('#scene');
      const debugEl = document.querySelector('#debug');
      const buttons = document.querySelectorAll('button');
      const sliders = document.querySelectorAll('input[type="range"]');
      
      if (!canvas) throw new Error('Canvas #scene not found');
      if (!debugEl) throw new Error('Debug element #debug not found');
      if (buttons.length < 5) throw new Error(`Expected >=5 buttons, found ${buttons.length}`);
      if (sliders.length < 4) throw new Error(`Expected >=4 sliders, found ${sliders.length}`);
      
      this.pass('DOM Structure Complete');
    } catch (e) {
      this.fail('DOM Structure Complete', e.message);
    }
  }

  async testPerformance() {
    try {
      // Check if performance API is available
      if (!performance || !performance.now) throw new Error('Performance API not available');
      
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 100));
      const elapsed = performance.now() - start;
      
      if (elapsed < 50) throw new Error('Timer resolution too coarse');
      this.pass('Performance Monitoring Available');
    } catch (e) {
      this.fail('Performance Monitoring Available', e.message);
    }
  }

  pass(testName) {
    this.results.passed++;
    this.results.tests.push({ name: testName, status: 'PASS', error: null });
    console.log(`%c✓ ${testName}`, 'color: #51cf66;');
  }

  fail(testName, error) {
    this.results.failed++;
    this.results.tests.push({ name: testName, status: 'FAIL', error });
    console.log(`%c✗ ${testName}: ${error}`, 'color: #ff6b6b;');
  }

  reportResults() {
    const total = this.results.passed + this.results.failed;
    const percentage = Math.round((this.results.passed / total) * 100);
    
    console.group('%c[TEST] Results', 'color: #ffd700; font-weight: bold;');
    console.log(`Passed: ${this.results.passed}/${total} (${percentage}%)`);
    console.log(`Failed: ${this.results.failed}/${total}`);
    console.table(this.results.tests);
    console.groupEnd();
    
    return this.results;
  }

  getResults() {
    return this.results;
  }
}

export const tests = new AutomatedTests();
