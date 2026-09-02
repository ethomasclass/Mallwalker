// Greedy meshing: collapses runs of identical voxel faces into single quads.
//
// Without it a mall floor is ~1M coplanar quads; with it the same floor is a
// few thousand. Face shading is baked straight into the vertex colours so the
// scene can render with an unlit material and still read as solid geometry.

import { CHUNK } from './VoxelWorld.js'

const S = CHUNK
const P = S + 2

// Per-axis face tint: [ -d, +d ]. Top faces are brightest, undersides darkest.
const TINT = [
  [0.80, 0.80], // -X, +X
  [0.55, 1.00], // -Y (undersides), +Y (tops)
  [0.90, 0.90], // -Z, +Z
]

// Copy a chunk plus a one-voxel border into a flat array, so the mask build
// never has to walk the chunk Map.
function padChunk(world, chunk, buf) {
  buf.fill(0)
  const { cx, cy, cz, data } = chunk
  const bx = cx * S, by = cy * S, bz = cz * S

  for (let z = 0; z < S; z++) {
    for (let y = 0; y < S; y++) {
      const src = y * S + z * S * S
      const dst = 1 + (y + 1) * P + (z + 1) * P * P
      for (let x = 0; x < S; x++) buf[dst + x] = data[src + x]
    }
  }

  // Only the six border planes need a (slower) world lookup.
  const edge = (x, y, z) => {
    buf[(x + 1) + (y + 1) * P + (z + 1) * P * P] = world.get(bx + x, by + y, bz + z)
  }
  for (let a = -1; a <= S; a++) {
    for (let b = -1; b <= S; b++) {
      edge(-1, a, b); edge(S, a, b)
      edge(a, -1, b); edge(a, S, b)
      edge(a, b, -1); edge(a, b, S)
    }
  }
  return buf
}

// `light` is an optional LightGrid. When present, quads are capped at
// `maxRun` voxels so each one has enough vertices to carry a light gradient,
// and every vertex is shaded by a trilinear sample taken just off its face.
export function meshChunk(world, chunk, palette, voxelSize, out, { light = null, maxRun = 0 } = {}) {
  const lit = [0, 0, 0]
  const pad = padChunk(world, chunk, meshChunk._pad || (meshChunk._pad = new Uint16Array(P * P * P)))
  const at = (x, y, z) => pad[(x + 1) + (y + 1) * P + (z + 1) * P * P]

  const { positions, colors, indices } = out
  const bx = chunk.cx * S, by = chunk.cy * S, bz = chunk.cz * S
  const mask = meshChunk._mask || (meshChunk._mask = new Int32Array(S * S))

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3
    const v = (d + 2) % 3
    const x = [0, 0, 0]
    const q = [0, 0, 0]
    q[d] = 1

    for (x[d] = -1; x[d] < S;) {
      let n = 0
      for (x[v] = 0; x[v] < S; x[v]++) {
        for (x[u] = 0; x[u] < S; x[u]++, n++) {
          const a = at(x[0], x[1], x[2])
          const b = at(x[0] + q[0], x[1] + q[1], x[2] + q[2])
          mask[n] = a !== 0 && b !== 0 ? 0 : a !== 0 ? a : b !== 0 ? -b : 0
        }
      }

      x[d]++
      n = 0

      for (let j = 0; j < S; j++) {
        for (let i = 0; i < S;) {
          const c = mask[n]
          if (c === 0) { i++; n++; continue }

          const cap = maxRun || S

          let w = 1
          while (i + w < S && w < cap && mask[n + w] === c) w++

          let h = 1
          grow: while (j + h < S && h < cap) {
            for (let k = 0; k < w; k++) if (mask[n + k + h * S] !== c) break grow
            h++
          }

          x[u] = i
          x[v] = j
          const du = [0, 0, 0]; du[u] = w
          const dv = [0, 0, 0]; dv[v] = h

          const positive = c > 0
          const rgb = palette[Math.abs(c)]
          const t = TINT[d][positive ? 1 : 0]
          const r = rgb[0] * t, g = rgb[1] * t, b2 = rgb[2] * t

          const base = positions.length / 3
          const px = (x[0] + bx) * voxelSize
          const py = (x[1] + by) * voxelSize
          const pz = (x[2] + bz) * voxelSize
          const sx = voxelSize

          const corners = [
            [px, py, pz],
            [px + du[0] * sx, py + du[1] * sx, pz + du[2] * sx],
            [px + (du[0] + dv[0]) * sx, py + (du[1] + dv[1]) * sx, pz + (du[2] + dv[2]) * sx],
            [px + dv[0] * sx, py + dv[1] * sx, pz + dv[2] * sx],
          ]
          for (const p of corners) positions.push(p[0], p[1], p[2])

          if (light) {
            // Sample just off the face, so the reading comes from the air the
            // face looks into rather than from the solid behind it.
            const off = light.cell * 0.55
            const nx = d === 0 ? (positive ? off : -off) : 0
            const ny = d === 1 ? (positive ? off : -off) : 0
            const nz = d === 2 ? (positive ? off : -off) : 0
            for (const p of corners) {
              light.sample(p[0] + nx, p[1] + ny, p[2] + nz, lit)
              colors.push(r * lit[0], g * lit[1], b2 * lit[2])
            }
          } else {
            for (let k = 0; k < 4; k++) colors.push(r, g, b2)
          }

          if (positive) indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
          else indices.push(base, base + 2, base + 1, base, base + 3, base + 2)

          for (let l = 0; l < h; l++) {
            for (let k = 0; k < w; k++) mask[n + k + l * S] = 0
          }

          i += w
          n += w
        }
      }
    }
  }
}
