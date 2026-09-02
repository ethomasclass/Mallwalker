// Leak test: is any part of the walkable interior open to the outside?
//
// Floods air inward from a point well outside the building. If the flood
// reaches the spawn, there is a hole — the report names the voxels where the
// flood first crossed into interior space, so the offending carve is easy to
// find in the plan.

import { VoxelWorld } from '../src/engine/VoxelWorld.js'
import { Brush } from '../src/engine/Brush.js'
import { VOXEL } from '../src/game/config.js'
import { buildMall } from '../src/game/buildMall.js'
import { ANCHORS, FOOTPRINT, H, SPAWN } from '../src/game/plan.js'

const world = new VoxelWorld()
buildMall(world, new Brush(world, VOXEL))

const V = (m) => Math.round(m / VOXEL)
const rects = [...FOOTPRINT, ...ANCHORS.map((a) => a.rect)]
const X0 = V(Math.min(...rects.map((r) => r.x0))) - 6
const X1 = V(Math.max(...rects.map((r) => r.x1))) + 6
const Z0 = V(Math.min(...rects.map((r) => r.z0))) - 6
const Z1 = V(Math.max(...rects.map((r) => r.z1))) + 6
const Y0 = 0
const Y1 = V(H.roof) + 2

const W = X1 - X0, D = Z1 - Z0, Hh = Y1 - Y0
const idx = (x, y, z) => (x - X0) + (y - Y0) * W + (z - Z0) * W * Hh
const seen = new Uint8Array(W * Hh * D)

// Anything inside one of the footprint rects counts as "interior" for
// reporting purposes.
const insideFootprint = (ix, iz) => rects.some((r) =>
  ix >= V(r.x0) && ix < V(r.x1) && iz >= V(r.z0) && iz < V(r.z1))

const stack = [[X0 + 1, Y1 - 1, Z0 + 1]]
seen[idx(...stack[0])] = 1
const breaches = []

while (stack.length) {
  const [x, y, z] = stack.pop()
  for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
    const nx = x + dx, ny = y + dy, nz = z + dz
    if (nx < X0 || nx >= X1 || ny < Y0 || ny >= Y1 || nz < Z0 || nz >= Z1) continue
    const i = idx(nx, ny, nz)
    if (seen[i] || world.isSolid(nx, ny, nz)) continue
    seen[i] = 1
    // Reaching interior air below eaves height means the shell is open.
    if (ny < V(H.roof) - 1 && insideFootprint(nx, nz) && !insideFootprint(x, z)) {
      breaches.push([nx, ny, nz])
    }
    stack.push([nx, ny, nz])
  }
}

const spawnReached = seen[idx(V(SPAWN.x), 4, V(SPAWN.z))] === 1
console.log(spawnReached
  ? 'LEAK: outside air reaches the spawn point.'
  : 'sealed: outside air does not reach the spawn point.')

if (breaches.length) {
  // Cluster nearby breach voxels so one hole reports as one line.
  const clusters = []
  for (const b of breaches) {
    const near = clusters.find((c) =>
      Math.abs(c.x - b[0]) < 24 && Math.abs(c.z - b[2]) < 24 && Math.abs(c.y - b[1]) < 24)
    if (near) { near.n++; continue }
    clusters.push({ x: b[0], y: b[1], z: b[2], n: 1 })
  }
  console.log(`\n${breaches.length} breach voxels in ${clusters.length} places (world metres):`)
  for (const c of clusters.sort((a, b) => b.n - a.n).slice(0, 24)) {
    console.log(`  x=${(c.x * VOXEL).toFixed(1)}  y=${(c.y * VOXEL).toFixed(1)}  z=${(c.z * VOXEL).toFixed(1)}   (${c.n} voxels)`)
  }
} else {
  console.log('no shell breaches found.')
}
