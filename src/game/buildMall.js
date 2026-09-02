// Turns the directory plan into voxels.
//
// The method is subtractive: fill every envelope block and anchor as one solid
// mass, then carve corridors, shops and anchor boxes back out of it. Nothing
// the player can reach was ever left to chance — if you can stand in it, it
// was cut on purpose — and the building has no leaks by construction.

import { C } from '../engine/palette.js'
import { VOXEL, WALL } from './config.js'
import {
  ANCHORS, BAYS, CORRIDORS, FOOTPRINT, FOUNTAIN, H, KIOSK_SIZE, KIOSKS, mx, mz,
  OUTPARCELS, RESTROOMS,
} from './plan.js'

const ANCHOR_ROOF = 8.6
const HEAD = H.storefrontHead
const SIGN_H = 0.85

export function buildMall(world, brush) {
  const signs = []

  fillEnvelope(brush)
  carveCorridors(brush)
  BAYS.forEach((b) => carveShop(brush, b, signs))
  ANCHORS.forEach((a) => carveAnchor(brush, a, signs))
  RESTROOMS.forEach((r) => carveService(brush, r))
  floors(brush)
  ceilings(brush)
  concourseFurniture(brush)
  fountainCourt(brush)
  KIOSKS.forEach((k) => kiosk(brush, k, signs))
  exteriorSkin(world, brush)
  OUTPARCELS.forEach((o) => outparcel(brush, o, signs))

  return { signs }
}

// --- 1. Solid mass --------------------------------------------------------

function fillEnvelope(brush) {
  // Floor slab under everything, so carving down to y=0 always lands on tile.
  for (const r of [...FOOTPRINT, ...ANCHORS.map((a) => a.rect)]) {
    brush.box(r.x0, -0.5, r.z0, r.x1, 0, r.z1, C.terrazzo)
  }
  for (const r of FOOTPRINT) brush.box(r.x0, 0, r.z0, r.x1, H.roof, r.z1, C.wallCream)
  for (const a of ANCHORS) brush.box(a.rect.x0, 0, a.rect.z0, a.rect.x1, ANCHOR_ROOF, a.rect.z1, C.anchorWall)
}

// --- 2. Corridors ---------------------------------------------------------

function carveCorridors(brush) {
  for (const c of CORRIDORS) {
    const r = c.rect
    brush.clear(r.x0, 0, r.z0, r.x1, H.concourseCeil, r.z1)
  }
}

// --- 3. Shops -------------------------------------------------------------

// Maps a bay's storefront face onto "along the frontage" / "through the wall"
// axes so one piece of code can build all four orientations.
function front(b) {
  switch (b.face) {
    case 'N': return { horiz: true, a0: b.x0, a1: b.x1, w0: b.z0, w1: b.z0 + WALL, out: -1 }
    case 'S': return { horiz: true, a0: b.x0, a1: b.x1, w0: b.z1 - WALL, w1: b.z1, out: +1 }
    case 'W': return { horiz: false, a0: b.z0, a1: b.z1, w0: b.x0, w1: b.x0 + WALL, out: -1 }
    default:  return { horiz: false, a0: b.z0, a1: b.z1, w0: b.x1 - WALL, w1: b.x1, out: +1 }
  }
}

// box() in frontage space: (along-low, along-high, wall-low, wall-high)
function fbox(brush, f, a0, a1, w0, w1, y0, y1, color) {
  if (f.horiz) brush.box(a0, y0, w0, a1, y1, w1, color)
  else brush.box(w0, y0, a0, w1, y1, a1, color)
}

function carveShop(brush, b, signs) {
  const deep = Math.min(b.x1 - b.x0, b.z1 - b.z0)
  if (deep < 2.5) return

  // Sales floor.
  brush.clear(b.x0 + WALL, 0, b.z0 + WALL, b.x1 - WALL, H.storeCeil, b.z1 - WALL)
  brush.slab(b.x0 + WALL, b.z0 + WALL, b.x1 - WALL, b.z1 - WALL, -0.25,
    () => (b.name ? C.storeFloor : C.storeCarpet))
  // Suspended ceiling.
  brush.box(b.x0 + WALL, H.storeCeil, b.z0 + WALL, b.x1 - WALL, H.storeCeil + 0.25, b.z1 - WALL, C.ceiling)

  const f = front(b)
  const span = f.a1 - f.a0
  const pier = Math.min(0.9, span * 0.14)
  const o0 = f.a0 + pier
  const o1 = f.a1 - pier
  if (o1 - o0 < 1.5) return

  // Cut the whole shopfront open, then glaze the outer thirds and leave the
  // middle as the walk-in.
  fbox(brush, f, o0, o1, f.w0 - 0.3, f.w1 + 0.3, 0, HEAD, 0)
  const glass = (o1 - o0) * 0.3
  for (const [g0, g1] of [[o0, o0 + glass], [o1 - glass, o1]]) {
    fbox(brush, f, g0, g1, f.w0 + 0.125, f.w0 + 0.375, 0, HEAD, C.storefrontGlass)
    // Kick rail along the bottom and a head rail under the fascia.
    fbox(brush, f, g0, g1, f.w0 + 0.1, f.w0 + 0.4, 0, 0.35, C.storefrontDark)
    fbox(brush, f, g0, g1, f.w0 + 0.1, f.w0 + 0.4, HEAD - 0.2, HEAD, C.storefrontDark)
    // Vertical mullions roughly every 2 m.
    const bays = Math.max(1, Math.round((g1 - g0) / 2))
    for (let i = 0; i <= bays; i++) {
      const m = g0 + ((g1 - g0) * i) / bays
      fbox(brush, f, m - 0.125, m + 0.125, f.w0 + 0.1, f.w0 + 0.4, 0, HEAD, C.storefrontDark)
    }
  }
  // Piers framing the walk-in.
  fbox(brush, f, o0, o0 + 0.25, f.w0, f.w1, 0, HEAD, C.storefrontDark)
  fbox(brush, f, o1 - 0.25, o1, f.w0, f.w1, 0, HEAD, C.storefrontDark)

  // Fascia the sign hangs on, plus a brass reveal under it.
  fbox(brush, f, f.a0, f.a1, f.w0, f.w1, HEAD, HEAD + SIGN_H, C.signBoard)
  fbox(brush, f, f.a0, f.a1, f.w0, f.w1, HEAD - 0.15, HEAD, C.brass)

  if (b.name) {
    signs.push(makeSign(b.name, f, HEAD + SIGN_H / 2, Math.min(span - 0.6, 13)))
  }
}

function makeSign(text, f, y, width) {
  const mid = (f.a0 + f.a1) / 2
  const plane = f.out < 0 ? f.w0 - 0.06 : f.w1 + 0.06
  if (f.horiz) {
    return { text, x: mid, y, z: plane, rotY: f.out < 0 ? Math.PI : 0, width }
  }
  return { text, x: plane, y, z: mid, rotY: f.out < 0 ? -Math.PI / 2 : Math.PI / 2, width }
}

// --- 4. Anchors -----------------------------------------------------------

function carveAnchor(brush, a, signs) {
  const r = a.rect
  const t = 0.8
  brush.clear(r.x0 + t, 0, r.z0 + t, r.x1 - t, H.anchorCeil, r.z1 - t)
  brush.slab(r.x0 + t, r.z0 + t, r.x1 - t, r.z1 - t, -0.25, () => C.anchorFloor)
  brush.box(r.x0 + t, H.anchorCeil, r.z0 + t, r.x1 - t, H.anchorCeil + 0.25, r.z1 - t, C.ceiling)

  // Sales-floor columns on a 12 m grid.
  for (let x = r.x0 + 8; x < r.x1 - 4; x += 12) {
    for (let z = r.z0 + 8; z < r.z1 - 4; z += 12) {
      brush.box(x - 0.4, 0, z - 0.4, x + 0.4, H.anchorCeil, z + 0.4, C.neutralPier)
    }
  }

  // Mall entrance: a wide opening in the wall that faces the concourse.
  const e = a.entry
  const w = e.half ?? 7
  const f = e.face === 'S'
    ? { horiz: true, a0: e.at * 0 + 0, a1: 0, w0: r.z1 - t, w1: r.z1, out: 1 }
    : null
  const openings = {
    S: () => brush.clear(mAt(e) - w, 0, r.z1 - t - 0.3, mAt(e) + w, HEAD + 0.6, r.z1 + 0.3),
    N: () => brush.clear(mAt(e) - w, 0, r.z0 - 0.3, mAt(e) + w, HEAD + 0.6, r.z0 + t + 0.3),
    E: () => brush.clear(r.x1 - t - 0.3, 0, mAt(e) - w, r.x1 + 0.3, HEAD + 0.6, mAt(e) + w),
    W: () => brush.clear(r.x0 - 0.3, 0, mAt(e) - w, r.x0 + t + 0.3, HEAD + 0.6, mAt(e) + w),
  }
  openings[e.face]()

  // Fascia + sign over the entrance.
  const sf = {
    S: { horiz: true, a0: mAt(e) - w, a1: mAt(e) + w, w0: r.z1 - t, w1: r.z1, out: +1 },
    N: { horiz: true, a0: mAt(e) - w, a1: mAt(e) + w, w0: r.z0, w1: r.z0 + t, out: -1 },
    E: { horiz: false, a0: mAt(e) - w, a1: mAt(e) + w, w0: r.x1 - t, w1: r.x1, out: +1 },
    W: { horiz: false, a0: mAt(e) - w, a1: mAt(e) + w, w0: r.x0, w1: r.x0 + t, out: -1 },
  }[e.face]
  fbox(brush, sf, sf.a0, sf.a1, sf.w0, sf.w1, HEAD + 0.6, HEAD + 0.6 + SIGN_H + 0.3, C.signBoard)
  signs.push(makeSign(a.name.toUpperCase(), sf, HEAD + 1.2, 13))

  // Rooftop plant so the anchors read as anchors from the parking lot.
  brush.box(r.x0 + 6, ANCHOR_ROOF, r.z0 + 6, r.x0 + 14, ANCHOR_ROOF + 1.4, r.z0 + 12, C.roofUnit)
  void f
}

// Entry position is stored in scan pixels along the entry axis.
function mAt(e) {
  return e.face === 'E' || e.face === 'W' ? mz(e.at) : mx(e.at)
}

// --- Restrooms / mall office ---------------------------------------------

function carveService(brush, s) {
  const r = s.at
  brush.clear(r.x0 + 0.3, 0, r.z0 + 0.3, r.x1 - 0.3, H.storeCeil, r.z1 - 0.3)
  brush.slab(r.x0, r.z0, r.x1, r.z1, -0.25, () => C.tileGrey)
}

// --- 5. Floors ------------------------------------------------------------

const V = (m) => Math.round(m / VOXEL)

function floors(brush) {
  // Concourse tile: cream field, 3 m mauve grid, a diamond in each cell,
  // and a darker band hugging the shopfronts.
  const tile = (edgeDist) => (ix, iz) => {
    if (edgeDist(ix, iz) < 0.6) return C.courtBand
    const cx = ((ix % 12) + 12) % 12
    const cz = ((iz % 12) + 12) % 12
    if (cx === 0 || cz === 0) return C.tileRose
    if (Math.abs(cx - 6) + Math.abs(cz - 6) <= 2) return C.tileMauve
    return C.tileCream
  }

  for (const c of CORRIDORS) {
    const r = c.rect
    const d = (ix, iz) => Math.min(
      ix * VOXEL - r.x0, r.x1 - ix * VOXEL,
      iz * VOXEL - r.z0, r.z1 - iz * VOXEL,
    )
    brush.slab(r.x0, r.z0, r.x1, r.z1, -0.25, tile(d))
  }

  // Fountain court gets concentric rings instead of the field pattern.
  brush.slab(FOUNTAIN.x - 11, FOUNTAIN.z - 11, FOUNTAIN.x + 11, FOUNTAIN.z + 11, -0.25, (ix, iz) => {
    const dx = ix * VOXEL - FOUNTAIN.x
    const dz = iz * VOXEL - FOUNTAIN.z
    const d = Math.hypot(dx, dz)
    if (d > 10.5) return 0
    const band = Math.floor(d / 0.75) % 4
    return band === 0 ? C.tileMauve : band === 2 ? C.tileRose : C.tileCream
  })
}

// --- 6. Ceilings ----------------------------------------------------------

function ceilings(brush) {
  for (const c of CORRIDORS) {
    const r = c.rect
    brush.box(r.x0, H.concourseCeil, r.z0, r.x1, H.concourseCeil + 0.25, r.z1, C.ceiling)

    // Lit soffits down both long edges, like the coved ceilings in the 90s
    // photos of the centre court.
    const wide = r.x1 - r.x0 > r.z1 - r.z0
    const s = 2.5
    const drop = H.concourseCove - 0.8
    const edges = wide
      ? [[r.x0, r.z0, r.x1, r.z0 + s], [r.x0, r.z1 - s, r.x1, r.z1]]
      : [[r.x0, r.z0, r.x0 + s, r.z1], [r.x1 - s, r.z0, r.x1, r.z1]]
    for (const [x0, z0, x1, z1] of edges) {
      brush.box(x0, drop, z0, x1, H.concourseCeil, z1, C.soffit)
      brush.box(x0, drop, z0, x1, drop + 0.25, z1, C.ceilingLight)
    }
  }

  // Skylight over the fountain court: punch the roof out and glaze it.
  const s = 8
  brush.clear(FOUNTAIN.x - s, H.concourseCeil, FOUNTAIN.z - s, FOUNTAIN.x + s, H.roof, FOUNTAIN.z + s)
  brush.box(FOUNTAIN.x - s, H.roof - 0.25, FOUNTAIN.z - s, FOUNTAIN.x + s, H.roof, FOUNTAIN.z + s, C.skylight)
  brush.box(FOUNTAIN.x - s - 0.5, H.concourseCeil, FOUNTAIN.z - s - 0.5, FOUNTAIN.x + s + 0.5, H.concourseCeil + 0.5, FOUNTAIN.z - s, C.ceilingCove)
  brush.box(FOUNTAIN.x - s - 0.5, H.concourseCeil, FOUNTAIN.z + s, FOUNTAIN.x + s + 0.5, H.concourseCeil + 0.5, FOUNTAIN.z + s + 0.5, C.ceilingCove)
}

// --- 7. Concourse furniture ----------------------------------------------

// Fixtures already standing in the concourse, so seating and planters don't
// get dropped on top of a kiosk or into the fountain.
function occupied(x, z, r) {
  if (Math.hypot(x - FOUNTAIN.x, z - FOUNTAIN.z) < FOUNTAIN.r + r + 2) return true
  return KIOSKS.some((k) => {
    const cx = (k.at.x0 + k.at.x1) / 2
    const cz = (k.at.z0 + k.at.z1) / 2
    return Math.hypot(x - cx, z - cz) < KIOSK_SIZE + r
  })
}

function concourseFurniture(brush) {
  let n = 0
  for (const c of CORRIDORS) {
    if (c.id === 'court') continue
    const r = c.rect
    const wide = r.x1 - r.x0 > r.z1 - r.z0
    const len = wide ? r.x1 - r.x0 : r.z1 - r.z0
    if (len < 20) continue

    const mid = wide ? (r.z0 + r.z1) / 2 : (r.x0 + r.x1) / 2
    const inset = 2.0

    for (let t = 8; t < len - 6; t += 9, n++) {
      const a = (wide ? r.x0 : r.z0) + t

      // Columns down both sides, in front of the shopfronts — but only
      // where the corridor is wide enough to spare the room.
      for (const side of (wide ? r.z1 - r.z0 : r.x1 - r.x0) < 13 ? [] : [0, 1]) {
        const b = side ? (wide ? r.z1 : r.x1) - inset : (wide ? r.z0 : r.x0) + inset
        if (!occupied(wide ? a : b, wide ? b : a, 1.0)) {
          column(brush, wide ? a : b, wide ? b : a)
        }
      }

      // Planters on the centre line, benches offset to alternating sides so
      // the middle of the mall stays walkable.
      if (n % 3 === 0) {
        if (!occupied(wide ? a : mid, wide ? mid : a, 2.0)) {
          planter(brush, wide ? a : mid, wide ? mid : a)
        }
      } else {
        const off = mid + (n % 2 ? 3.2 : -3.2)
        if (!occupied(wide ? a : off, wide ? off : a, 1.5)) {
          bench(brush, wide ? a : off, wide ? off : a, wide)
        }
      }
    }
  }
}

function column(brush, x, z) {
  brush.box(x - 0.55, 0, z - 0.55, x + 0.55, 0.3, z + 0.55, C.columnBase)
  brush.box(x - 0.45, 0.3, z - 0.45, x + 0.45, 3.3, z + 0.45, C.columnGranite)
  brush.box(x - 0.5, 3.3, z - 0.5, x + 0.5, 3.55, z + 0.5, C.brass)
  brush.box(x - 0.45, 3.55, z - 0.45, x + 0.45, H.concourseCove - 0.8, z + 0.45, C.bulkhead)
  brush.box(x - 0.8, H.concourseCove - 0.8, z - 0.8, x + 0.8, H.concourseCove - 0.4, z + 0.8, C.bulkhead)
}

function planter(brush, x, z) {
  brush.ring(x, z, 1.35, 1.0, 0, 0.6, C.planterRim)
  brush.column(x, z, 1.05, 0, 0.45, C.planter)
  brush.column(x, z, 0.2, 0.45, 2.3, C.trunk)
  brush.column(x, z, 1.15, 2.3, 2.75, C.foliageMid)
  brush.column(x, z, 0.85, 2.75, 3.15, C.foliageDark)
  brush.column(x, z, 0.45, 3.15, 3.4, C.foliageLight)
}

function bench(brush, x, z, wide) {
  const [hx, hz] = wide ? [1.1, 0.32] : [0.32, 1.1]
  brush.box(x - hx, 0, z - hz, x + hx, 0.4, z + hz, C.benchLeg)
  brush.box(x - hx, 0.4, z - hz, x + hx, 0.55, z + hz, C.bench)
}

// --- 8. Fountain court ----------------------------------------------------

function fountainCourt(brush) {
  const { x, z, r } = FOUNTAIN
  brush.ring(x, z, r, r - 0.6, 0, 0.75, C.fountainRim)
  brush.column(x, z, r - 0.6, 0, 0.45, C.water)
  brush.column(x, z, r - 0.6, 0.45, 0.5, C.waterDeep)
  brush.column(x, z, 1.1, 0, 1.0, C.fountainRim)
  brush.column(x, z, 0.5, 1.0, 2.4, C.water)

  // Bromeliads in brass pots around the kerb, as in the period photo.
  const n = 14
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const px = x + Math.cos(a) * (r - 0.3)
    const pz = z + Math.sin(a) * (r - 0.3)
    brush.column(px, pz, 0.26, 0.75, 1.05, C.brass)
    brush.column(px, pz, 0.32, 1.05, 1.35, C.foliageMid)
    brush.column(px, pz, 0.16, 1.35, 1.6, C.carousel)
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4
    bench(brush, x + Math.cos(a) * (r + 2.6), z + Math.sin(a) * (r + 2.6), i % 2 === 0)
  }
}

// --- 9. Kiosks ------------------------------------------------------------

function kiosk(brush, k, signs) {
  const r = k.at
  brush.box(r.x0, 0, r.z0, r.x1, 1.0, r.z1, C.kioskWood)
  brush.box(r.x0 - 0.12, 1.0, r.z0 - 0.12, r.x1 + 0.12, 1.18, r.z1 + 0.12, C.kioskTop)
  for (const [cx, cz] of [
    [r.x0, r.z0], [r.x1 - 0.2, r.z0], [r.x0, r.z1 - 0.2], [r.x1 - 0.2, r.z1 - 0.2],
  ]) {
    brush.box(cx, 1.18, cz, cx + 0.2, 2.5, cz + 0.2, C.storefrontDark)
  }
  brush.shell(r.x0 - 0.2, r.z0 - 0.2, r.x1 + 0.2, r.z1 + 0.2, 2.5, 2.78, 0.3, C.signBoard)
  signs.push({
    text: k.name, x: (r.x0 + r.x1) / 2, y: 2.64, z: r.z1 + 0.26,
    rotY: 0, width: (r.x1 - r.x0) * 0.95,
  })
}

// --- 10. Exterior ---------------------------------------------------------

// Any solid column of the building that touches outside air gets re-skinned in
// brick, plus a parapet. Cheap way to get a believable exterior without
// authoring one.
function exteriorSkin(world, brush) {
  const rects = [...FOOTPRINT, ...ANCHORS.map((a) => a.rect)]
  const pad = 2
  const x0 = V(Math.min(...rects.map((r) => r.x0))) - pad
  const x1 = V(Math.max(...rects.map((r) => r.x1))) + pad
  const z0 = V(Math.min(...rects.map((r) => r.z0))) - pad
  const z1 = V(Math.max(...rects.map((r) => r.z1))) + pad
  const w = x1 - x0, d = z1 - z0
  const mask = new Uint8Array(w * d)

  for (const r of rects) {
    for (let iz = V(r.z0); iz < V(r.z1); iz++) {
      const row = (iz - z0) * w
      mask.fill(1, row + V(r.x0) - x0, row + V(r.x1) - x0)
    }
  }

  const top = V(ANCHOR_ROOF)
  for (let iz = 1; iz < d - 1; iz++) {
    for (let ix = 1; ix < w - 1; ix++) {
      const i = iz * w + ix
      if (!mask[i]) continue
      if (mask[i - 1] && mask[i + 1] && mask[i - w] && mask[i + w]) continue
      let painted = 0
      for (let y = 0; y < top; y++) {
        if (world.get(x0 + ix, y, z0 + iz) === 0) continue
        world.set(x0 + ix, y, z0 + iz, y < 3 ? C.exteriorTrim : C.exteriorBrick)
        painted = y
      }
      if (painted) {
        for (let y = painted + 1; y <= painted + 3; y++) world.set(x0 + ix, y, z0 + iz, C.exteriorTrim)
      }
    }
  }

  // Flat roof deck.
  for (const r of FOOTPRINT) brush.box(r.x0, H.roof - 0.25, r.z0, r.x1, H.roof, r.z1, C.roof)
  for (const a of ANCHORS) brush.box(a.rect.x0, ANCHOR_ROOF - 0.25, a.rect.z0, a.rect.x1, ANCHOR_ROOF, a.rect.z1, C.roof)
  // Re-glaze the court skylight, which the roof deck just paved over.
  const s = 8
  brush.box(FOUNTAIN.x - s, H.roof - 0.25, FOUNTAIN.z - s, FOUNTAIN.x + s, H.roof, FOUNTAIN.z + s, C.skylight)

  // Rooftop mechanical units.
  let seed = 7
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (const r of FOOTPRINT) {
    const n = Math.max(1, Math.floor(((r.x1 - r.x0) * (r.z1 - r.z0)) / 900))
    for (let i = 0; i < n; i++) {
      const ux = r.x0 + 4 + rnd() * Math.max(1, r.x1 - r.x0 - 10)
      const uz = r.z0 + 4 + rnd() * Math.max(1, r.z1 - r.z0 - 10)
      brush.box(ux, H.roof, uz, ux + 3, H.roof + 1.2, uz + 2.2, C.roofUnit)
    }
  }
}

function outparcel(brush, o, signs) {
  const r = o.rect
  brush.box(r.x0, -0.5, r.z0, r.x1, 0, r.z1, C.terrazzo)
  brush.box(r.x0, 0, r.z0, r.x1, o.height, r.z1, C.exteriorBrick)
  brush.box(r.x0, 0, r.z0, r.x1, 3, r.z1, C.exteriorTrim)
  brush.box(r.x0 - 0.3, o.height, r.z0 - 0.3, r.x1 + 0.3, o.height + 0.6, r.z1 + 0.3, C.roof)
  signs.push({
    text: o.name, x: (r.x0 + r.x1) / 2, y: o.height * 0.72, z: r.z0 - 0.34,
    rotY: Math.PI, width: (r.x1 - r.x0) * 0.8,
  })
}
