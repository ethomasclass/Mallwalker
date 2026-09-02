// First-person walker: pointer-lock look, axis-swept AABB collision against
// the voxel grid, and a small step-up so kerbs and thresholds don't stop you.

import { VOXEL } from './config.js'

const RADIUS = 0.32
const HEIGHT = 1.78
const EYE = 1.64
const STEP = 0.36
const EPS = 1e-4

const WALK = 1.55       // an unhurried lap of the concourse
const POWER = 3.4       // shift: mall-walker pace
const ACCEL = 14
const GRAVITY = 22
const JUMP = 5.6

export class Player {
  constructor(world, camera, spawn) {
    this.world = world
    this.camera = camera
    this.pos = { x: spawn.x, y: 0.01, z: spawn.z }
    this.vel = { x: 0, y: 0, z: 0 }
    this.yaw = spawn.heading ?? 0
    this.pitch = 0
    this.onGround = true
    this.bob = 0
  }

  solid(x, y, z) {
    return this.world.isSolid(
      Math.floor(x / VOXEL), Math.floor(y / VOXEL), Math.floor(z / VOXEL)
    )
  }

  // Does the player box intersect anything here?
  //
  // EPS shrinks the box a hair on every face. Without it, a player resting
  // exactly on a voxel top reads as intersecting the voxel below and gets
  // shoved up a frame later. It must stay far smaller than the sink-per-frame
  // gravity produces, or the feet float above the floor and the ground test
  // never latches.
  blocked(x, y, z) {
    const x0 = Math.floor((x - RADIUS + EPS) / VOXEL), x1 = Math.floor((x + RADIUS - EPS) / VOXEL)
    const z0 = Math.floor((z - RADIUS + EPS) / VOXEL), z1 = Math.floor((z + RADIUS - EPS) / VOXEL)
    const y0 = Math.floor((y + EPS) / VOXEL), y1 = Math.floor((y + HEIGHT - EPS) / VOXEL)
    for (let iz = z0; iz <= z1; iz++)
      for (let iy = y0; iy <= y1; iy++)
        for (let ix = x0; ix <= x1; ix++)
          if (this.world.isSolid(ix, iy, iz)) return true
    return false
  }

  // Solid directly beneath the feet? Used to keep `onGround` latched while
  // standing still, so gravity never gets a frame to nudge the camera.
  grounded() {
    const y = Math.floor((this.pos.y - EPS) / VOXEL)
    const x0 = Math.floor((this.pos.x - RADIUS + EPS) / VOXEL)
    const x1 = Math.floor((this.pos.x + RADIUS - EPS) / VOXEL)
    const z0 = Math.floor((this.pos.z - RADIUS + EPS) / VOXEL)
    const z1 = Math.floor((this.pos.z + RADIUS - EPS) / VOXEL)
    for (let iz = z0; iz <= z1; iz++)
      for (let ix = x0; ix <= x1; ix++)
        if (this.world.isSolid(ix, y, iz)) return true
    return false
  }

  look(dx, dy) {
    this.yaw -= dx * 0.0022
    this.pitch -= dy * 0.0022
    const lim = Math.PI / 2 - 0.02
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch))
  }

  update(dt, input) {
    const speed = input.run ? POWER : WALK
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw)

    // Forward is -Z in camera space; yaw rotates it into the world.
    let fx = -sin * input.forward + cos * input.strafe
    let fz = -cos * input.forward - sin * input.strafe
    const len = Math.hypot(fx, fz)
    if (len > 1) { fx /= len; fz /= len }

    const k = 1 - Math.exp(-ACCEL * dt)
    this.vel.x += (fx * speed - this.vel.x) * k
    this.vel.z += (fz * speed - this.vel.z) * k

    if (input.jump && this.onGround) { this.vel.y = JUMP; this.onGround = false }

    // Standing on solid ground: hold the player exactly on the surface rather
    // than letting gravity sink them a few millimetres every frame and
    // snapping them back, which reads as a shaking camera.
    if (this.onGround && this.vel.y <= 0 && this.grounded()) {
      this.vel.y = 0
      this.pos.y = Math.round(this.pos.y / VOXEL) * VOXEL
    } else {
      this.vel.y -= GRAVITY * dt
    }

    this.moveAxis('x', this.vel.x * dt)
    this.moveAxis('z', this.vel.z * dt)
    this.moveY(this.vel.y * dt)
    if (!this.onGround && this.vel.y <= 0 && this.grounded()) this.onGround = true

    const moving = Math.hypot(this.vel.x, this.vel.z)
    this.bob += moving * dt * 2.6
    const bobY = this.onGround ? Math.sin(this.bob * 2) * 0.011 * Math.min(1, moving) : 0

    this.camera.position.set(this.pos.x, this.pos.y + EYE + bobY, this.pos.z)
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
  }

  moveAxis(axis, d) {
    if (d === 0) return
    const before = this.pos[axis]
    this.pos[axis] = before + d
    if (!this.blocked(this.pos.x, this.pos.y, this.pos.z)) return

    // Try stepping up onto whatever is in the way, then settle onto the top of
    // the step instead of hanging above it.
    if (this.onGround && !this.blocked(this.pos.x, this.pos.y + STEP, this.pos.z)) {
      const floorY = this.pos.y
      this.pos.y += STEP
      for (let i = 0; i < Math.ceil(STEP / VOXEL); i++) {
        const lower = this.pos.y - VOXEL
        if (lower < floorY || this.blocked(this.pos.x, lower, this.pos.z)) break
        this.pos.y = lower
      }
      this.pos.y = Math.round(this.pos.y / VOXEL) * VOXEL
      return
    }
    this.pos[axis] = before
    this.vel[axis] = 0
  }

  moveY(d) {
    if (d === 0) return
    this.pos.y += d
    if (!this.blocked(this.pos.x, this.pos.y, this.pos.z)) {
      if (d < 0) this.onGround = false
      return
    }
    if (d < 0) {
      // Settle onto the voxel top we just crossed.
      this.pos.y = Math.ceil(this.pos.y / VOXEL) * VOXEL
      this.onGround = true
    } else {
      this.pos.y = Math.floor((this.pos.y + HEIGHT) / VOXEL) * VOXEL - HEIGHT - 0.001
    }
    this.vel.y = 0
  }
}

export class Input {
  constructor(el) {
    this.keys = new Set()
    this.el = el
    addEventListener('keydown', (e) => {
      this.keys.add(e.code)
      if (e.code === 'Space') e.preventDefault()
    })
    addEventListener('keyup', (e) => this.keys.delete(e.code))
    addEventListener('blur', () => this.keys.clear())
  }

  get forward() {
    return (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0)
         - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0)
  }

  get strafe() {
    return (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0)
         - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0)
  }

  get run() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') }
  get jump() { return this.keys.has('Space') }
}
