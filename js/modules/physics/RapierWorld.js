import RAPIER from '@dimforge/rapier3d-compat';

export class RapierWorld {
  constructor() {
    this.world = null;
    this.cubeBody = null;
  }

  async init(gravity = 9.8) {
    await RAPIER.init();

    this.world = new RAPIER.World({ x: 0, y: -gravity, z: 0 });

    // Fixed floor at y=-1.05; cuboid half-height 0.05 → top surface at y=-1.0
    const floorBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1.05, 0)
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(15, 0.05, 15),
      floorBody
    );

    // Kinematic cube: BoxGeometry(1.1,1.1,1.1) → half-extents 0.55
    // Position/rotation are pushed every frame from the animated mesh.
    this.cubeBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.55, 0.55, 0.55),
      this.cubeBody
    );
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
   * Push current mesh transform into the kinematic cube body
   * so Rapier sees the cube in the right place before world.step().
   */
  syncCubeBody(mesh) {
    if (!this.cubeBody) return;
    const p = mesh.position;
    const q = mesh.quaternion;
    this.cubeBody.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
    this.cubeBody.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
  }

  /**
   * Step physics by dt seconds.
   * Setting world.timestep each frame keeps physics locked to render rate.
   */
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
