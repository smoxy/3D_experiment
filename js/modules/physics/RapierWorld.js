import RAPIER from '@dimforge/rapier3d-compat';

export class RapierWorld {
  constructor() {
    this.world = null;
    this.cubeBody = null;
    this.boundaryHalfExtent = 8; // ±X/Z extent of the simulation box (world units)
    this.boundaryTopY = 10;      // ceiling Y
  }

  async init(gravity = 9.8) {
    await RAPIER.init();

    // For Rapier 0.12+: create empty world, then configure gravity
    // (WorldBuilder may not be available in the compat build)
    const gravityVec = { x: 0, y: -gravity, z: 0 };
    this.world = new RAPIER.World(gravityVec);

    // Floor: surface at y=-1.0 (half-thickness 0.05, so centre y=-1.05)
    this._addStaticCuboid(0, -1.05, 0,  15, 0.05, 15);

    // Boundary box: 4 vertical walls + ceiling
    this._createBoundaryWalls();

    // Kinematic cube: BoxGeometry(1.1) → half-extents 0.55
    this.cubeBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.55, 0.55, 0.55),
      this.cubeBody
    );
  }

  /** Creates a fixed cuboid collider centred at (cx, cy, cz) with half-extents (hx, hy, hz). */
  _addStaticCuboid(cx, cy, cz, hx, hy, hz) {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    // setTranslation requires 3 scalar numbers in the compat build (not a single object)
    bodyDesc.setTranslation(cx, cy, cz);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body);
  }

  /**
   * 4 vertical wall slabs + 1 ceiling that form the simulation boundary.
   * The physics floor already acts as the bottom face.
   *
   *  boundaryHalfExtent (e)  ─── walls at ±(e+t) on X and Z
   *  boundaryTopY (top)       ─── ceiling at top+t
   *  t = 0.2                  ─── wall half-thickness (thicker → less particle tunneling)
   */
  _createBoundaryWalls() {
    const e    = this.boundaryHalfExtent;
    const top  = this.boundaryTopY;
    const floorY = -1.0;
    const t    = 0.2;
    const midY  = (top + floorY) / 2;       // vertical centre of each wall panel
    const halfH = (top - floorY) / 2 + t;   // half-height, extended slightly to close gaps

    // ±X walls
    this._addStaticCuboid(-(e + t), midY, 0,   t, halfH, e + t * 2);
    this._addStaticCuboid(  e + t,  midY, 0,   t, halfH, e + t * 2);
    // ±Z walls
    this._addStaticCuboid(0, midY, -(e + t),   e + t * 2, halfH, t);
    this._addStaticCuboid(0, midY,   e + t,    e + t * 2, halfH, t);
    // Ceiling
    this._addStaticCuboid(0, top + t, 0,       e + t * 2, t, e + t * 2);
  }

  /**
   * Create a dynamic rigid body for a particle.
   * Returns { body, collider } so the caller can update restitution live.
   */
  createParticleBody(position, velocity, radius, restitution) {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinvel(velocity.x, velocity.y, velocity.z)
      .setAngularDamping(0.5);
    const body = this.world.createRigidBody(bodyDesc);
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(radius)
        .setRestitution(restitution)
        .setFriction(0.05),
      body
    );
    return { body, collider };
  }

  /**
   * Push the animated mesh transform into the kinematic cube body each frame
   * so Rapier sees the correct cube position before world.step().
   */
  syncCubeBody(mesh) {
    if (!this.cubeBody) return;
    const p = mesh.position;
    const q = mesh.quaternion;
    this.cubeBody.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
    this.cubeBody.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
  }

  /** Step physics by dt seconds (capped at 33 ms to avoid spiral of death). */
  step(dt) {
    if (!this.world) return;
    this.world.timestep = Math.min(dt, 0.033);
    this.world.step();
  }

  removeBody(body) {
    if (body && this.world) this.world.removeRigidBody(body);
  }

  setGravity(g) {
    if (this.world) this.world.gravity.y = -Math.abs(g);
  }

  isReady() {
    return this.world !== null;
  }
}
