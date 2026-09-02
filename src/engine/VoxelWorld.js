// Sparse, chunked voxel storage.
//
// A voxel value of 0 means empty; anything else is an index into the palette
// (see src/engine/palette.js). Chunks are allocated lazily on first write, so
// the ~300 x 190 m footprint of the mall only costs memory where the building
// actually is.

export const CHUNK = 32

export class VoxelWorld {
  constructor() {
    this.chunks = new Map()
    this.min = [Infinity, Infinity, Infinity]
    this.max = [-Infinity, -Infinity, -Infinity]
  }

  static key(cx, cy, cz) {
    return `${cx},${cy},${cz}`
  }

  chunkAt(cx, cy, cz, create) {
    const k = VoxelWorld.key(cx, cy, cz)
    let c = this.chunks.get(k)
    if (!c && create) {
      c = { cx, cy, cz, data: new Uint16Array(CHUNK * CHUNK * CHUNK) }
      this.chunks.set(k, c)
    }
    return c
  }

  set(x, y, z, v) {
    x |= 0; y |= 0; z |= 0
    const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK), cz = Math.floor(z / CHUNK)
    const c = this.chunkAt(cx, cy, cz, v !== 0)
    if (!c) return
    c.data[(x - cx * CHUNK) + (y - cy * CHUNK) * CHUNK + (z - cz * CHUNK) * CHUNK * CHUNK] = v

    if (v !== 0) {
      if (x < this.min[0]) this.min[0] = x
      if (y < this.min[1]) this.min[1] = y
      if (z < this.min[2]) this.min[2] = z
      if (x > this.max[0]) this.max[0] = x
      if (y > this.max[1]) this.max[1] = y
      if (z > this.max[2]) this.max[2] = z
    }
  }

  get(x, y, z) {
    x |= 0; y |= 0; z |= 0
    const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK), cz = Math.floor(z / CHUNK)
    const c = this.chunks.get(VoxelWorld.key(cx, cy, cz))
    if (!c) return 0
    return c.data[(x - cx * CHUNK) + (y - cy * CHUNK) * CHUNK + (z - cz * CHUNK) * CHUNK * CHUNK]
  }

  isSolid(x, y, z) {
    return this.get(x, y, z) !== 0
  }

  // Half-open voxel-index box fill. Walks whole chunk rows with TypedArray.fill
  // instead of going through set() ~20M times when the envelope is laid down.
  fillBox(x0, y0, z0, x1, y1, z1, v) {
    if (x1 <= x0 || y1 <= y0 || z1 <= z0) return
    const cx0 = Math.floor(x0 / CHUNK), cx1 = Math.floor((x1 - 1) / CHUNK)
    const cy0 = Math.floor(y0 / CHUNK), cy1 = Math.floor((y1 - 1) / CHUNK)
    const cz0 = Math.floor(z0 / CHUNK), cz1 = Math.floor((z1 - 1) / CHUNK)

    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const c = this.chunkAt(cx, cy, cz, v !== 0)
          if (!c) continue
          const bx = cx * CHUNK, by = cy * CHUNK, bz = cz * CHUNK
          const lx0 = Math.max(x0, bx) - bx, lx1 = Math.min(x1, bx + CHUNK) - bx
          const ly0 = Math.max(y0, by) - by, ly1 = Math.min(y1, by + CHUNK) - by
          const lz0 = Math.max(z0, bz) - bz, lz1 = Math.min(z1, bz + CHUNK) - bz
          for (let z = lz0; z < lz1; z++) {
            for (let y = ly0; y < ly1; y++) {
              const row = y * CHUNK + z * CHUNK * CHUNK
              c.data.fill(v, row + lx0, row + lx1)
            }
          }
        }
      }
    }

    if (v !== 0) {
      this.min[0] = Math.min(this.min[0], x0); this.max[0] = Math.max(this.max[0], x1)
      this.min[1] = Math.min(this.min[1], y0); this.max[1] = Math.max(this.max[1], y1)
      this.min[2] = Math.min(this.min[2], z0); this.max[2] = Math.max(this.max[2], z1)
    }
  }

  get voxelCount() {
    let n = 0
    for (const c of this.chunks.values()) {
      for (let i = 0; i < c.data.length; i++) if (c.data[i] !== 0) n++
    }
    return n
  }
}
