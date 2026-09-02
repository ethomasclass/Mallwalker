// Baked light, computed once at build time.
//
// The scene renders unlit, so all of its depth has to come from vertex
// colours. This walks the finished voxel world, treats certain palette
// entries as emitters (the lit ceiling soffits, the court skylight, the
// suspended ceilings inside the shops), and floods that light through open
// space on a coarse grid. Meshing then samples the grid per vertex.
//
// Solid cells hold no light, so interpolating across them darkens creases and
// undersides — ambient occlusion falls out of the same pass for free.

import { CHUNK } from './VoxelWorld.js'

export class LightGrid {
  // emitters: { [paletteIndex]: [r, g, b] } in linear light units.
  constructor(world, { cell = 1.0, voxelSize = 0.25, emitters = {}, ambient = 0.30, passes = 22 } = {}) {
    this.cell = cell
    this.voxelSize = voxelSize
    this.ambient = ambient
    this.emitters = emitters
    this.passes = passes
    this.world = world
  }

  build() {
    const per = Math.max(1, Math.round(this.cell / this.voxelSize)) // voxels per light cell
    const { world } = this

    // Grid bounds, in light cells, from the world's voxel extent.
    this.x0 = Math.floor(world.min[0] / per) - 1
    this.y0 = Math.floor(world.min[1] / per) - 1
    this.z0 = Math.floor(world.min[2] / per) - 1
    this.w = Math.ceil(world.max[0] / per) - this.x0 + 2
    this.h = Math.ceil(world.max[1] / per) - this.y0 + 2
    this.d = Math.ceil(world.max[2] / per) - this.z0 + 2

    const n = this.w * this.h * this.d
    const emit = new Float32Array(n * 3)
    const solid = new Uint16Array(n)
    const cap = per * per * per

    // One pass over the voxel data: count solidity and collect emitters.
    for (const c of world.chunks.values()) {
      const bx = c.cx * CHUNK, by = c.cy * CHUNK, bz = c.cz * CHUNK
      for (let z = 0; z < CHUNK; z++) {
        for (let y = 0; y < CHUNK; y++) {
          const row = y * CHUNK + z * CHUNK * CHUNK
          for (let x = 0; x < CHUNK; x++) {
            const v = c.data[row + x]
            if (!v) continue
            const gi = this.index(
              Math.floor((bx + x) / per), Math.floor((by + y) / per), Math.floor((bz + z) / per))
            if (gi < 0) continue
            solid[gi]++
            const e = this.emitters[v]
            if (e) {
              emit[gi * 3] += e[0]; emit[gi * 3 + 1] += e[1]; emit[gi * 3 + 2] += e[2]
            }
          }
        }
      }
    }

    // Normalise emission by cell volume, and mark cells that are mostly solid.
    const open = new Uint8Array(n)
    for (let i = 0; i < n; i++) {
      open[i] = solid[i] < cap * 0.5 ? 1 : 0
      const k = 3 / cap
      emit[i * 3] *= k; emit[i * 3 + 1] *= k; emit[i * 3 + 2] *= k
    }

    // Flood: light travels cell to cell, losing a fixed fraction each step,
    // and never falls below whatever the cell emits itself. Taking the max of
    // the neighbours (rather than their average) is what makes it propagate —
    // averaging with a loss factor just dims the whole grid uniformly.
    let a = new Float32Array(emit)
    let b = new Float32Array(n * 3)
    const { w, h } = this
    const step = [1, -1, w, -w, w * h, -w * h]
    const ATTEN = 0.87

    for (let p = 0; p < this.passes; p++) {
      for (let i = 0; i < n; i++) {
        const o = i * 3
        if (!open[i]) { b[o] = b[o + 1] = b[o + 2] = 0; continue }
        let r = emit[o], g = emit[o + 1], bl = emit[o + 2]
        for (const st of step) {
          const j = i + st
          if (j < 0 || j >= n || !open[j]) continue
          const q = j * 3
          const nr = a[q] * ATTEN, ng = a[q + 1] * ATTEN, nb = a[q + 2] * ATTEN
          if (nr > r) r = nr
          if (ng > g) g = ng
          if (nb > bl) bl = nb
        }
        b[o] = r; b[o + 1] = g; b[o + 2] = bl
      }
      const t = a; a = b; b = t
    }

    // Two soft passes so the falloff reads as light rather than as steps.
    for (let p = 0; p < 2; p++) {
      for (let i = 0; i < n; i++) {
        const o = i * 3
        if (!open[i]) { b[o] = b[o + 1] = b[o + 2] = 0; continue }
        let r = a[o], g = a[o + 1], bl = a[o + 2], cnt = 1
        for (const st of step) {
          const j = i + st
          if (j < 0 || j >= n || !open[j]) continue
          const q = j * 3
          r += a[q]; g += a[q + 1]; bl += a[q + 2]; cnt++
        }
        b[o] = r / cnt; b[o + 1] = g / cnt; b[o + 2] = bl / cnt
      }
      const t = a; a = b; b = t
    }

    this.data = a
    this.open = open
    this.per = per
    return this
  }

  index(gx, gy, gz) {
    const x = gx - this.x0, y = gy - this.y0, z = gz - this.z0
    if (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.h || z >= this.d) return -1
    return x + y * this.w + z * this.w * this.h
  }

  // Trilinear sample at a world-space point, in metres.
  sample(px, py, pz, out) {
    const c = this.cell
    const fx = px / c - this.x0 - 0.5
    const fy = py / c - this.y0 - 0.5
    const fz = pz / c - this.z0 - 0.5
    const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz)
    const tx = fx - ix, ty = fy - iy, tz = fz - iz

    let r = 0, g = 0, b = 0, wsum = 0
    for (let dz = 0; dz <= 1; dz++) {
      const wz = dz ? tz : 1 - tz
      for (let dy = 0; dy <= 1; dy++) {
        const wy = dy ? ty : 1 - ty
        for (let dx = 0; dx <= 1; dx++) {
          const wx = dx ? tx : 1 - tx
          const wgt = wx * wy * wz
          if (wgt <= 0) continue
          const x = ix + dx, y = iy + dy, z = iz + dz
          if (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.h || z >= this.d) continue
          const i = x + y * this.w + z * this.w * this.h
          if (!this.open[i]) continue
          r += this.data[i * 3] * wgt
          g += this.data[i * 3 + 1] * wgt
          b += this.data[i * 3 + 2] * wgt
          wsum += wgt
        }
      }
    }

    // Cells that fell outside or were solid contribute darkness, which is what
    // shades the creases.
    const amb = this.ambient
    out[0] = amb + r
    out[1] = amb + g
    out[2] = amb + b
    return out
  }
}
