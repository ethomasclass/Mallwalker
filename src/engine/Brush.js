// Metre-space drawing helpers over the voxel grid.
//
// Everything in src/game speaks metres; Brush is the only place that knows
// about voxel indices. Boxes are half-open in world space: box(0, 0, 0, 1, 1, 1)
// fills exactly the cubic metre from the origin.

export class Brush {
  constructor(world, voxelSize) {
    this.world = world
    this.v = voxelSize
  }

  lo(m) { return Math.round(m / this.v) }
  hi(m) { return Math.round(m / this.v) }

  // Axis-aligned solid box, in metres.
  box(x0, y0, z0, x1, y1, z1, color) {
    const ix0 = this.lo(Math.min(x0, x1)), ix1 = this.hi(Math.max(x0, x1))
    const iy0 = this.lo(Math.min(y0, y1)), iy1 = this.hi(Math.max(y0, y1))
    const iz0 = this.lo(Math.min(z0, z1)), iz1 = this.hi(Math.max(z0, z1))
    this.world.fillBox(ix0, iy0, iz0, ix1, iy1, iz1, color)
  }

  // Carve a box back to empty.
  clear(x0, y0, z0, x1, y1, z1) {
    this.box(x0, y0, z0, x1, y1, z1, 0)
  }

  // One-voxel-thick horizontal slab whose colour varies per voxel. `fn`
  // receives voxel indices plus metre coordinates and returns a palette index
  // (or 0 to skip).
  slab(x0, z0, x1, z1, y, fn) {
    const ix0 = this.lo(Math.min(x0, x1)), ix1 = this.hi(Math.max(x0, x1))
    const iz0 = this.lo(Math.min(z0, z1)), iz1 = this.hi(Math.max(z0, z1))
    const iy = this.lo(y)
    for (let z = iz0; z < iz1; z++) {
      for (let x = ix0; x < ix1; x++) {
        const c = fn(x, z, x * this.v, z * this.v)
        if (c) this.world.set(x, iy, z, c)
      }
    }
  }

  // Hollow rectangular wall shell of the given thickness (metres).
  shell(x0, z0, x1, z1, y0, y1, t, color) {
    const xa = Math.min(x0, x1), xb = Math.max(x0, x1)
    const za = Math.min(z0, z1), zb = Math.max(z0, z1)
    this.box(xa, y0, za, xb, y1, za + t, color)
    this.box(xa, y0, zb - t, xb, y1, zb, color)
    this.box(xa, y0, za, xa + t, y1, zb, color)
    this.box(xb - t, y0, za, xb, y1, zb, color)
  }

  // Vertical cylinder approximated on the voxel grid (mall columns).
  column(cx, cz, radius, y0, y1, color) {
    const r = radius
    const ix0 = this.lo(cx - r), ix1 = this.hi(cx + r)
    const iz0 = this.lo(cz - r), iz1 = this.hi(cz + r)
    const iy0 = this.lo(y0), iy1 = this.hi(y1)
    for (let z = iz0; z < iz1; z++) {
      for (let x = ix0; x < ix1; x++) {
        const dx = (x + 0.5) * this.v - cx
        const dz = (z + 0.5) * this.v - cz
        if (dx * dx + dz * dz > r * r) continue
        for (let y = iy0; y < iy1; y++) this.world.set(x, y, z, color)
      }
    }
  }

  // Hollow ring (fountain kerbs, planter rims).
  ring(cx, cz, rOuter, rInner, y0, y1, color) {
    const ix0 = this.lo(cx - rOuter), ix1 = this.hi(cx + rOuter)
    const iz0 = this.lo(cz - rOuter), iz1 = this.hi(cz + rOuter)
    const iy0 = this.lo(y0), iy1 = this.hi(y1)
    for (let z = iz0; z < iz1; z++) {
      for (let x = ix0; x < ix1; x++) {
        const dx = (x + 0.5) * this.v - cx
        const dz = (z + 0.5) * this.v - cz
        const d2 = dx * dx + dz * dz
        if (d2 > rOuter * rOuter || d2 < rInner * rInner) continue
        for (let y = iy0; y < iy1; y++) this.world.set(x, y, z, color)
      }
    }
  }
}
