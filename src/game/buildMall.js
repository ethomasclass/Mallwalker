// Turns the directory plan into voxels.
//
// The method is subtractive: fill every envelope block and anchor as one solid
// mass, then carve corridors, shops and anchor boxes back out of it. Nothing
// the player can reach was ever left to chance — if you can stand in it, it
// was cut on purpose — and the building has no leaks by construction.

import { C } from '../engine/palette.js'
import { signInk, storefront } from './tenants.js'
import { VOXEL, WALL } from './config.js'
import {
  ANCHORS, BAYS, CORRIDORS, DIRECTORY_BOARDS, FOOTPRINT, FOUNTAIN, H, KIOSK_SIZE,
  KIOSKS, mx, mz, OUTPARCELS, RESTROOMS, TEMP_TENANTS,
} from './plan.js'
import { SEASON } from './season.js'

const ANCHOR_ROOF = 8.6
const HEAD = H.storefrontHead
const SIGN_H = 0.85

export function buildMall(world, brush) {
  const signs = []
  const boards = []

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
  temporaryTenants(brush, signs)
  DIRECTORY_BOARDS.forEach((b) => directoryBoard(brush, b, boards))
  exteriorSkin(world, brush)
  OUTPARCELS.forEach((o) => outparcel(brush, o, signs))

  return { signs, boards }
}

// --- Temporary tenants ----------------------------------------------------
//
// The four carts the directory lists under "Temporary Tenants", present or
// absent according to the season.

function temporaryTenants(brush, signs) {
  for (const t of TEMP_TENANTS) {
    if (!t.seasons.includes(SEASON)) continue
    const x = mx(t.at[0])
    const z = mz(t.at[1])
    const w = 1.15, d = 0.7
    brush.box(x - w, 0.18, z - d, x + w, 0.95, z + d, C.kioskWood)
    brush.box(x - w - 0.1, 0.95, z - d - 0.1, x + w + 0.1, 1.1, z + d + 0.1, C.counterTile)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        brush.box(x + sx * (w - 0.15), 0, z + sz * (d - 0.12),
                  x + sx * (w - 0.15) + 0.12, 0.2, z + sz * (d - 0.12) + 0.12, C.storefrontDark)
        brush.box(x + sx * (w - 0.15), 1.1, z + sz * (d - 0.12),
                  x + sx * (w - 0.15) + 0.12, 2.15, z + sz * (d - 0.12) + 0.12, C.storefrontDark)
      }
    }
    brush.box(x - w - 0.2, 2.15, z - d - 0.15, x + w + 0.2, 2.5, z + d + 0.15, C.signBoard)
    signs.push({ text: t.name, x, y: 2.32, z: z + d + 0.22, rotY: 0, width: w * 1.9 })
    signs.push({ text: t.name, x, y: 2.32, z: z - d - 0.22, rotY: Math.PI, width: w * 1.9 })
  }
}

// --- You-are-here directories ---------------------------------------------

function directoryBoard(brush, b, boards) {
  const x = mx(b.at[0])
  const z = mz(b.at[1])
  const c = Math.cos(b.rotY), s2 = Math.sin(b.rotY)
  // Board faces +Z when rotY is 0; thickness runs along the facing axis.
  const hw = 1.05, ht = 0.09
  const [ex, ez] = [Math.abs(c) * hw + Math.abs(s2) * ht, Math.abs(s2) * hw + Math.abs(c) * ht]
  brush.box(x - 0.28, 0, z - 0.28, x + 0.28, 0.16, z + 0.28, C.columnBase)
  brush.box(x - 0.14, 0.16, z - 0.14, x + 0.14, 1.05, z + 0.14, C.storefrontDark)
  brush.box(x - ex, 1.0, z - ez, x + ex, 2.15, z + ez, C.storefrontDark)
  brush.box(x - ex - 0.06, 2.15, z - ez - 0.06, x + ex + 0.06, 2.34, z + ez + 0.06, C.brass)
  boards.push({ x, y: 1.58, z, rotY: b.rotY, width: hw * 2 - 0.14, height: 1.0, depth: ez || ex })
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
//
// Dimensions follow real mall tenant design criteria: the tenant lease line
// sits 20-22" back from the face of the landlord's neutral pier, the landlord
// controls the first few feet inside it, and blade signs project 24" with
// their underside 9'-0" clear.

const PIER = 0.9          // landlord neutral pier, each side of the frontage
const LEASE = 0.55        // lease line setback from the pier face
const CLOSURE = 0.25      // thickness of the shopfront closure itself
const BLADE = { proj: 0.6, thick: 0.14, h: 0.42, clear: 2.75 }

// Maps a bay's storefront face onto "along the frontage" / "depth into the
// shop" axes so one piece of code builds all four orientations.
function front(b) {
  const g = {
    N: { horiz: true,  a0: b.x0, a1: b.x1, mall: b.z0,        dir: +1, out: -1 },
    S: { horiz: true,  a0: b.x0, a1: b.x1, mall: b.z1,        dir: -1, out: +1 },
    W: { horiz: false, a0: b.z0, a1: b.z1, mall: b.x0,        dir: +1, out: -1 },
    E: { horiz: false, a0: b.z0, a1: b.z1, mall: b.x1,        dir: -1, out: +1 },
  }[b.face]
  return g
}

// A box in frontage space: along the frontage a0..a1, at depth d0..d1 measured
// from the mall face into the shop (negative depth reaches into the concourse).
function dbox(brush, g, a0, a1, d0, d1, y0, y1, color) {
  const w0 = g.mall + g.dir * d0
  const w1 = g.mall + g.dir * d1
  if (g.horiz) brush.box(a0, y0, Math.min(w0, w1), a1, y1, Math.max(w0, w1), color)
  else brush.box(Math.min(w0, w1), y0, a0, Math.max(w0, w1), y1, a1, color)
}

function carveShop(brush, b, signs) {
  const deep = Math.min(b.x1 - b.x0, b.z1 - b.z0)
  if (deep < 2.5) return

  const sf = storefront(b)
  const fascia = C[sf.fascia]
  const accent = C[sf.accent]

  // Sales floor.
  brush.clear(b.x0 + WALL, 0, b.z0 + WALL, b.x1 - WALL, H.storeCeil, b.z1 - WALL)
  brush.slab(b.x0 + WALL, b.z0 + WALL, b.x1 - WALL, b.z1 - WALL, -0.25,
    () => (b.name ? C.storeFloor : C.storeCarpet))
  brush.box(b.x0 + WALL, H.storeCeil, b.z0 + WALL, b.x1 - WALL, H.storeCeil + 0.25, b.z1 - WALL, C.ceiling)

  const g = front(b)
  const span = g.a1 - g.a0
  const pier = Math.min(PIER, span * 0.16)
  const o0 = g.a0 + pier
  const o1 = g.a1 - pier
  if (o1 - o0 < 1.5) return

  // The rear wall carries the tenant's colour, so each shop reads as its own
  // room when you look into it from the concourse.
  const back = deepAxis(b, g)
  dbox(brush, g, g.a0, g.a1, back - 0.3, back, 0, H.storeCeil, fascia)

  // Neutral piers: landlord-built, identical the length of the mall.
  dbox(brush, g, g.a0, o0, -0.02, WALL, 0, HEAD + SIGN_H, C.neutralPier)
  dbox(brush, g, o1, g.a1, -0.02, WALL, 0, HEAD + SIGN_H, C.neutralPier)

  // Cut the frontage open back to the lease line, then rebuild the closure.
  dbox(brush, g, o0, o1, -0.35, LEASE + CLOSURE + 0.4, 0, HEAD, 0)
  closure(brush, g, sf, o0, o1, accent, fascia)

  // Reveal soffit over the recess, in the tenant's accent.
  dbox(brush, g, o0, o1, 0, LEASE + CLOSURE, HEAD, HEAD + 0.25, accent)

  // Sign fascia between the piers, with a brass reveal beneath it.
  dbox(brush, g, o0, o1, 0, WALL, HEAD, HEAD + SIGN_H, fascia)
  dbox(brush, g, o0, o1, 0, 0.18, HEAD - 0.14, HEAD, C.brass)

  if (b.name && !sf.noSign) {
    signs.push(sign(b.name, g, (o0 + o1) / 2, HEAD + SIGN_H / 2, -0.06,
      Math.min(o1 - o0 - 0.4, 13), sf.fascia))
  }

  if (b.name && !sf.noBlade && span > 5) {
    blade(brush, g, o0 + 1.6, b.name, sf, signs)
  }

  if (!b.name) leaseCard(brush, g, (o0 + o1) / 2, signs)
}

// Depth from the mall face to the back of the shop.
function deepAxis(b, g) {
  return g.horiz ? b.z1 - b.z0 - WALL : b.x1 - b.x0 - WALL
}

function closure(brush, g, sf, o0, o1, accent, fascia) {
  const d0 = LEASE
  const d1 = LEASE + CLOSURE
  const mull = (a, b2) => {
    const bays = Math.max(1, Math.round((b2 - a) / 2))
    for (let i = 0; i <= bays; i++) {
      const m = a + ((b2 - a) * i) / bays
      dbox(brush, g, m - 0.125, m + 0.125, d0 - 0.05, d1 + 0.05, 0, HEAD, C.storefrontDark)
    }
  }
  const door = (w) => [ (o0 + o1) / 2 - w / 2, (o0 + o1) / 2 + w / 2 ]

  switch (sf.glazing) {
    case 'full': {
      // Glass either side of a walk-in, kick rail along the bottom.
      const [dl, dr] = door((o1 - o0) * 0.42)
      for (const [a, b2] of [[o0, dl], [dr, o1]]) {
        if (b2 - a < 0.4) continue
        dbox(brush, g, a, b2, d0, d1, 0, HEAD, C.storefrontGlass)
        dbox(brush, g, a, b2, d0 - 0.05, d1 + 0.05, 0, 0.35, accent)
        dbox(brush, g, a, b2, d0 - 0.05, d1 + 0.05, HEAD - 0.2, HEAD, C.storefrontDark)
        mull(a, b2)
      }
      break
    }
    case 'window': {
      // Solid bulkhead with display glass above; a doorway punched through.
      const [dl, dr] = door(1.8)
      for (const [a, b2] of [[o0, dl], [dr, o1]]) {
        if (b2 - a < 0.4) continue
        dbox(brush, g, a, b2, d0, d1, 0, sf.sill, accent)
        dbox(brush, g, a, b2, d0, d1, sf.sill, HEAD, C.storefrontGlass)
        dbox(brush, g, a, b2, d0 - 0.05, d1 + 0.05, sf.sill, sf.sill + 0.12, C.storefrontDark)
        mull(a, b2)
      }
      break
    }
    case 'counter': {
      // Food service: counter across the frontage, open above it.
      dbox(brush, g, o0, o1, d0 - 0.35, d1 + 0.1, 0, sf.sill, accent)
      dbox(brush, g, o0, o1, d0 - 0.4, d1 + 0.15, sf.sill, sf.sill + 0.12, C.counterTile)
      dbox(brush, g, o0, o1, d1 + 1.4, d1 + 1.7, 1.9, HEAD, fascia)   // menu board
      break
    }
    case 'service': {
      // Offices and banks: solid front, one door, one window.
      const [dl, dr] = door(1.4)
      dbox(brush, g, o0, dl, d0, d1, 0, HEAD, fascia)
      dbox(brush, g, dr, o1, d0, d1, 0, HEAD, fascia)
      const wl = o0 + (dl - o0) * 0.2
      const wr = o0 + (dl - o0) * 0.85
      if (wr - wl > 0.6) dbox(brush, g, wl, wr, d0, d1, 0.95, 2.25, C.storefrontGlass)
      break
    }
    case 'papered': {
      // Vacant: glazed, papered over from inside, and gated.
      dbox(brush, g, o0, o1, d0, d1, 0, HEAD, C.papered)
      dbox(brush, g, o0, o1, d0 - 0.12, d0 - 0.02, 0, HEAD, C.gate)
      mull(o0, o1)
      break
    }
    case 'none':
    default: {
      // Open frontage. Stock stacked right at the lease line is the whole
      // point of the format — it is what pulls mall traffic in.
      if (!sf.merch) break
      const n = Math.max(2, Math.floor((o1 - o0) / 1.6))
      for (let i = 0; i < n; i++) {
        const a = o0 + 0.3 + ((o1 - o0 - 0.6) * i) / n
        const w = (o1 - o0 - 0.6) / n - 0.35
        if (w < 0.4) break
        const h = 0.9 + ((i * 37) % 5) * 0.16
        dbox(brush, g, a, a + w, d1 + 0.1, d1 + 1.0, 0, h, i % 2 ? accent : fascia)
        dbox(brush, g, a, a + w, d1 + 0.1, d1 + 1.0, h, h + 0.12, C.merchWarm)
      }
      break
    }
  }
}

// Projecting blade sign — the thing you actually read from down the concourse.
function blade(brush, g, at, text, sf, signs) {
  const y0 = BLADE.clear
  const y1 = BLADE.clear + BLADE.h
  dbox(brush, g, at - BLADE.thick / 2, at + BLADE.thick / 2, -BLADE.proj, 0.05, y0, y1, C[sf.fascia])
  dbox(brush, g, at - BLADE.thick / 2 - 0.04, at + BLADE.thick / 2 + 0.04, -BLADE.proj - 0.05, -BLADE.proj + 0.04, y0 - 0.04, y1 + 0.04, C.brass)

  // A face on each side, turned 90 degrees from the fascia.
  const mid = (y0 + y1) / 2
  const w = Math.min(BLADE.proj * 0.85, 0.55)
  for (const side of [-1, 1]) {
    const off = (BLADE.thick / 2 + 0.02) * side
    const depth = -BLADE.proj / 2
    const pos = g.horiz
      ? { x: at + off, z: g.mall + g.dir * depth, rotY: side > 0 ? Math.PI / 2 : -Math.PI / 2 }
      : { x: g.mall + g.dir * depth, z: at + off, rotY: side > 0 ? Math.PI : 0 }
    signs.push({ text, ...pos, y: mid, width: w, ink: signInk(sf.fascia), blade: true })
  }
}

function leaseCard(brush, g, at, signs) {
  dbox(brush, g, at - 0.55, at + 0.55, LEASE - 0.06, LEASE - 0.01, 1.35, 2.05, C.leaseCard)
  signs.push(sign('SPACE AVAILABLE', g, at, 1.7, LEASE - 0.09, 1.0, 'leaseCard'))
}

// A text plane parked `depth` into the shop from the mall face, facing out.
function sign(text, g, at, y, depth, width, fascia) {
  const plane = g.mall + g.dir * depth
  const rotY = g.horiz
    ? (g.out < 0 ? Math.PI : 0)
    : (g.out < 0 ? -Math.PI / 2 : Math.PI / 2)
  return g.horiz
    ? { text, x: at, y, z: plane, rotY, width, ink: signInk(fascia) }
    : { text, x: plane, y, z: at, rotY, width, ink: signInk(fascia) }
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
  const openings = {
    S: () => brush.clear(mAt(e) - w, 0, r.z1 - t - 0.3, mAt(e) + w, HEAD + 0.6, r.z1 + 0.3),
    N: () => brush.clear(mAt(e) - w, 0, r.z0 - 0.3, mAt(e) + w, HEAD + 0.6, r.z0 + t + 0.3),
    E: () => brush.clear(r.x1 - t - 0.3, 0, mAt(e) - w, r.x1 + 0.3, HEAD + 0.6, mAt(e) + w),
    W: () => brush.clear(r.x0 - 0.3, 0, mAt(e) - w, r.x0 + t + 0.3, HEAD + 0.6, mAt(e) + w),
  }
  openings[e.face]()

  // Fascia + sign over the entrance.
  const sg = {
    S: { horiz: true,  a0: mAt(e) - w, a1: mAt(e) + w, mall: r.z1, dir: -1, out: +1 },
    N: { horiz: true,  a0: mAt(e) - w, a1: mAt(e) + w, mall: r.z0, dir: +1, out: -1 },
    E: { horiz: false, a0: mAt(e) - w, a1: mAt(e) + w, mall: r.x1, dir: -1, out: +1 },
    W: { horiz: false, a0: mAt(e) - w, a1: mAt(e) + w, mall: r.x0, dir: +1, out: -1 },
  }[e.face]
  dbox(brush, sg, sg.a0, sg.a1, 0, t, HEAD + 0.6, HEAD + 0.6 + SIGN_H + 0.3, C.signBoard)
  signs.push(sign(a.name.toUpperCase(), sg, (sg.a0 + sg.a1) / 2, HEAD + 1.2, -0.06, 13, 'signBoard'))

  // Rooftop plant so the anchors read as anchors from the parking lot.
  brush.box(r.x0 + 6, ANCHOR_ROOF, r.z0 + 6, r.x0 + 14, ANCHOR_ROOF + 1.4, r.z0 + 12, C.roofUnit)
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
