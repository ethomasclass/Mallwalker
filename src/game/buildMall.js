// Turns the directory plan into voxels.
//
// The method is subtractive: fill every envelope block and anchor as one solid
// mass, then carve corridors, shops and anchor boxes back out of it. Nothing
// the player can reach was ever left to chance — if you can stand in it, it
// was cut on purpose — and the building has no leaks by construction.

import { C } from '../engine/palette.js'
import { signInk, storefront } from './tenants.js'
import { ACCENTS, DEPARTMENTS, FLOORS } from './anchors.js'
import { VOXEL, WALL } from './config.js'
import {
  ANCHORS, BAYS, CAROUSEL, CORRIDORS, DIRECTORY_BOARDS, FOOTPRINT, FOUNTAIN, H,
  KIOSK_SIZE, KIOSKS, mx, mz, OUTPARCELS, RESTROOMS, TEMP_TENANTS,
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
  RESTROOMS.forEach((r) => carveService(brush, r, signs))
  floors(brush)
  ceilings(brush)
  concourseFurniture(brush)
  fountainCourt(brush)
  KIOSKS.forEach((k) => kiosk(brush, k, signs))
  carousel(brush, signs)
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

const ceilOf = (c) => c.ceilH ?? H.concourseCeil

function carveCorridors(brush) {
  for (const c of CORRIDORS) {
    const r = c.rect
    brush.clear(r.x0, 0, r.z0, r.x1, ceilOf(c), r.z1)
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
    () => (sf.arcade ? C.arcadeCarpet : b.name ? C.storeFloor : C.storeCarpet))
  const room = { x0: b.x0 + WALL, z0: b.z0 + WALL, x1: b.x1 - WALL, z1: b.z1 - WALL }
  if (sf.arcade) {
    // No troffers: the arcade was lit by its own cabinets and nothing else.
    brush.box(room.x0, H.storeCeil, room.z0, room.x1, H.storeCeil + 0.25, room.z1, C.arcadeCab)
  } else {
    acousticCeiling(brush, room, H.storeCeil)
  }

  const g = front(b)
  // A bay may open through only part of its edge (Morrison's dining room is
  // reached down a neck, not across its whole frontage).
  if (b.span) { g.a0 = b.span.a0; g.a1 = b.span.a1 }
  const span = g.a1 - g.a0
  const pier = Math.min(PIER, span * 0.16)
  const o0 = g.a0 + pier
  const o1 = g.a1 - pier
  if (o1 - o0 < 1.5) return

  // The rear wall carries the tenant's colour, so each shop reads as its own
  // room when you look into it from the concourse.
  const back = deepAxis(b, g)
  dbox(brush, g, g.a0, g.a1, back - 0.3, back, 0, H.storeCeil, C[sf.interior ?? sf.fascia])
  if (sf.walls) {
    dbox(brush, g, g.a0, g.a0 + 0.3, WALL, back, 0, H.storeCeil, C[sf.walls])
    dbox(brush, g, g.a1 - 0.3, g.a1, WALL, back, 0, H.storeCeil, C[sf.walls])
  }

  // Neutral piers: landlord-built, identical the length of the mall.
  const pier2 = C[sf.pilaster ?? 'neutralPier']
  dbox(brush, g, g.a0, o0, -0.02, WALL, 0, HEAD + SIGN_H, pier2)
  dbox(brush, g, o1, g.a1, -0.02, WALL, 0, HEAD + SIGN_H, pier2)
  if (sf.confetti) {
    let cs = b.id * 31 + 7
    const rnd = () => ((cs = (cs * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    for (const [p0, p1] of [[g.a0, o0], [o1, g.a1]]) {
      for (let k = 0; k < 14; k++) {
        const at = p0 + rnd() * Math.max(0.3, p1 - p0 - 0.25)
        const y = 0.6 + rnd() * (HEAD + SIGN_H - 1.2)
        dbox(brush, g, at, at + 0.25, -0.04, 0.02, y, y + 0.25,
          rnd() < 0.5 ? C.confetti : C.toyRed)
      }
    }
  }

  // Cut the frontage open back to the lease line, then rebuild the closure.
  dbox(brush, g, o0, o1, -0.35, LEASE + CLOSURE + 0.4, 0, HEAD, 0)
  closure(brush, g, sf, o0, o1, accent, fascia)

  // Reveal soffit over the recess, in the tenant's accent.
  dbox(brush, g, o0, o1, 0, LEASE + CLOSURE, HEAD, HEAD + 0.25, accent)
  for (let at = o0 + 0.7; at < o1 - 0.4; at += 1.5) {
    dbox(brush, g, at, at + 0.3, 0.18, 0.5, HEAD, HEAD + 0.25, C.troffer)
  }

  // Sign fascia between the piers, with a brass reveal beneath it.
  if (sf.gable) {
    // Stepped wood arch: the shopfront steps up toward the middle.
    const steps = 4
    for (let i = 0; i < steps; i++) {
      const inset = ((o1 - o0) * 0.10 * i)
      dbox(brush, g, o0 + inset, o1 - inset, 0, WALL + 0.18,
        HEAD + i * 0.22, HEAD + (i + 1) * 0.22 + 0.02, i % 2 ? C.woodTrim : C.woodFront)
    }
    dbox(brush, g, o0, o1, 0, WALL + 0.2, HEAD - 0.12, HEAD, C.woodTrim)
  } else {
    dbox(brush, g, o0, o1, 0, WALL, HEAD, HEAD + SIGN_H, fascia)
    dbox(brush, g, o0, o1, 0, 0.18, HEAD - 0.14, HEAD, C.brass)
  }

  if (sf.stripes) {
    // Scalloped fabric awning, striped along the frontage.
    const [ca, cb] = sf.stripes.map((n) => C[n])
    const prof = [[0.0, 0.0], [0.3, 0.16], [0.62, 0.36], [0.94, 0.62]]
    for (let at = o0; at < o1 - 0.2; at += 0.5) {
      const col = (Math.round((at - o0) / 0.5) % 2) ? cb : ca
      for (const [out, drop] of prof) {
        dbox(brush, g, at, Math.min(at + 0.5, o1), -out - 0.32, -out,
          HEAD - 0.1 - drop, HEAD + 0.15 - drop, col)
      }
    }
    // Valance hanging off the front edge.
    for (let at = o0; at < o1 - 0.2; at += 0.5) {
      const col = (Math.round((at - o0) / 0.5) % 2) ? cb : ca
      dbox(brush, g, at, Math.min(at + 0.5, o1), -1.26, -0.94, HEAD - 0.9, HEAD - 0.55, col)
    }
  }

  if (sf.awning) {
    // Barrel canopy projecting over the servery.
    const prof = [[0.0, 0.30], [0.28, 0.62], [0.62, 0.86], [0.98, 0.98], [1.34, 0.86]]
    for (const [out, hgt] of prof) {
      dbox(brush, g, o0, o1, -out - 0.3, -out, HEAD - 0.55 + hgt * 0.5, HEAD - 0.1 + hgt * 0.5, fascia)
    }
  }

  if (b.name && !sf.noSign) {
    signs.push(sign(b.name, g, (o0 + o1) / 2, HEAD + SIGN_H / 2, -0.06,
      Math.min(o1 - o0 - 0.4, 13), sf.fascia))
  }

  if (b.name && !sf.noBlade && span > 5) {
    blade(brush, g, o0 + 1.6, b.name, sf, signs)
  }

  if (b.name) {
    const room = b.span
      ? { ...g, a0: (b.face === 'N' || b.face === 'S') ? b.x0 : b.z0,
                a1: (b.face === 'N' || b.face === 'S') ? b.x1 : b.z1 }
      : g
    fitOut(brush, room, sf, back, fascia, accent)
  }

  // And keep the walk-in itself clear of whatever the fit-out just placed.
  if (sf.glazing !== 'papered') {
    const mid = (o0 + o1) / 2
    const half = Math.min(1.6, (o1 - o0) / 2 - 0.2)
    if (half > 0.5) dbox(brush, g, mid - half, mid + half, LEASE + CLOSURE + 0.1, 3.6, 0, HEAD, 0)
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

// --- Shop fit-out ---------------------------------------------------------
//
// Enough fixture to read as a shop through the glass: perimeter shelving,
// floor fixtures suited to the trade, and a counter. Everything is placed in
// frontage space — along the shopfront, and by depth into the unit — so one
// kit serves all four orientations.

function fitOut(brush, g, sf, back, fascia, accent) {
  const a0 = g.a0 + WALL
  const a1 = g.a1 - WALL
  const width = a1 - a0
  const d1 = back - 0.35
  if (width < 2.2 || d1 < 2.8) return

  if (sf.arcade) { arcade(brush, g, a0, a1, d1); return }

  const shelf = (aa0, aa1, dd0, dd1, top = 2.1) => {
    dbox(brush, g, aa0, aa1, dd0, dd1, 0, 0.35, C.shelfBack)
    dbox(brush, g, aa0, aa1, dd0, dd1, 0.35, top, C.shelfWhite)
    for (let y = 0.62; y < top - 0.25; y += 0.5) {
      dbox(brush, g, aa0, aa1, dd0, dd1 - 0.06, y, y + 0.26, accent)
    }
  }

  const counter = (aa0, aa1, dd) => {
    if (aa1 - aa0 < 0.6) return
    dbox(brush, g, aa0, aa1, dd, dd + 0.75, 0, 0.95, fascia)
    dbox(brush, g, aa0 - 0.08, aa1 + 0.08, dd - 0.08, dd + 0.83, 0.95, 1.06, C.counterTop)
  }

  const mannequin = (at, dd) => {
    dbox(brush, g, at - 0.16, at + 0.16, dd - 0.16, dd + 0.16, 0, 0.12, C.storefrontDark)
    dbox(brush, g, at - 0.14, at + 0.14, dd - 0.14, dd + 0.14, 0.12, 1.0, C.mannequin)
    dbox(brush, g, at - 0.2, at + 0.2, dd - 0.2, dd + 0.2, 1.0, 1.5, accent)
    dbox(brush, g, at - 0.12, at + 0.12, dd - 0.12, dd + 0.12, 1.5, 1.78, C.mannequin)
  }

  const perimeter = () => {
    shelf(a0, a0 + 0.45, 1.3, d1)
    shelf(a1 - 0.45, a1, 1.3, d1)
    shelf(a0 + 0.45, a1 - 0.45, d1 - 0.45, d1)
  }

  switch (sf.glazing) {
    case 'none': {
      // Gondola runs down the unit — the dense-stack discount format.
      perimeter()
      const lanes = Math.max(1, Math.floor((width - 1.6) / 2.0))
      for (let i = 0; i < lanes; i++) {
        const at = a0 + 1.0 + ((width - 2.0) * (i + 0.5)) / lanes
        dbox(brush, g, at - 0.45, at + 0.45, 1.9, d1 - 1.2, 0, 1.45, C.shelfWhite)
        dbox(brush, g, at - 0.45, at + 0.45, 1.9, d1 - 1.2, 0, 0.3, C.shelfBack)
        for (let k = 0; k < 2; k++) {
          const y = 0.55 + k * 0.45
          dbox(brush, g, at - 0.5, at + 0.5, 1.9, d1 - 1.2, y, y + 0.22, k ? accent : fascia)
        }
      }
      counter(a0 + 0.6, Math.min(a0 + 2.2, a1 - 0.4), d1 - 1.05)

      if (sf.towers) {
        // Round shoe towers, stacked white, right inside the opening.
        for (let i = 0; i < 3; i++) {
          const at = a0 + 1.0 + ((width - 2.0) * (i + 0.5)) / 3
          const [cx, cz] = g.horiz
            ? [at, g.mall + g.dir * (1.8 + (i % 2) * 0.9)]
            : [g.mall + g.dir * (1.8 + (i % 2) * 0.9), at]
          brush.box(cx - 0.6, 0, cz - 0.6, cx + 0.6, 0.3, cz + 0.6, accent)
          for (let k = 0; k < 4; k++) {
            const h = 0.55 - k * 0.11
            const y = 0.3 + k * 0.36
            brush.box(cx - h, y, cz - h, cx + h, y + 0.26, cz + h, C.shoeWall)
            brush.box(cx - h - 0.03, y + 0.26, cz - h - 0.03, cx + h + 0.03, y + 0.36, cz + h + 0.03, accent)
          }
        }
      }

      if (sf.books) {
        // Tables of stock pushed out to the lease line, spinner racks behind.
        for (let i = 0; i < 3; i++) {
          const at = a0 + 0.9 + ((width - 1.8) * (i + 0.5)) / 3
          dbox(brush, g, at - 0.7, at + 0.7, 1.2, 2.2, 0, 0.78, C.woodTable)
          dbox(brush, g, at - 0.74, at + 0.74, 1.16, 2.24, 0.78, 0.9, C.merchWarm)
          dbox(brush, g, at - 0.6, at + 0.6, 1.3, 2.1, 0.9, 1.05, C.apparelPlum)
        }
        for (let d = 3.0; d < d1 - 1.0; d += 2.4) {
          for (const at of [a0 + 0.9, a1 - 0.9]) {
            dbox(brush, g, at - 0.3, at + 0.3, d, d + 0.6, 0, 1.7, C.rackMetal)
            dbox(brush, g, at - 0.36, at + 0.36, d - 0.04, d + 0.64, 0.5, 1.55, C.bookGreen)
          }
        }
        // Yellow sale cards hung in the opening.
        for (let i = 0; i < 4; i++) {
          const at = a0 + 0.5 + ((width - 1.0) * i) / 3
          dbox(brush, g, at - 0.28, at + 0.28, 0.9, 0.96, 2.15, 2.75, C.saleYellow)
        }
      }

      if (sf.banners) {
        // Sale banners strung across the ceiling.
        for (let d = 2.2; d < d1 - 0.6; d += 2.0) {
          dbox(brush, g, a0, a1, d, d + 0.1, 2.55, 3.05,
            (Math.round(d * 10) % 2) ? C.saleYellow : C.toyRed)
        }
      }
      break
    }

    case 'window':
    case 'full': {
      perimeter()
      const racks = Math.max(1, Math.floor((width - 2.4) / 2.4))
      for (let i = 0; i < racks; i++) {
        const at = a0 + 1.2 + ((width - 2.4) * (i + 0.5)) / racks
        // Round rack: centre pole, a skirt of garments, a rail on top.
        const [cx, cz] = g.horiz
          ? [at, g.mall + g.dir * 2.5]
          : [g.mall + g.dir * 2.5, at]
        brush.box(cx - 0.11, 0, cz - 0.11, cx + 0.11, 1.45, cz + 0.11, C.rackMetal)
        brush.column(cx, cz, 0.6, 0.55, 1.3, accent)
        brush.ring(cx, cz, 0.62, 0.48, 1.3, 1.38, C.rackMetal)
      }
      if (width > 4.5) {
        mannequin(a0 + 0.9, 1.5)
        mannequin(a1 - 0.9, 1.5)
      }
      counter(Math.max(a1 - 2.2, a0 + 0.4), a1 - 0.6, d1 - 1.25)
      break
    }

    case 'counter': {
      // Kitchen line along the back wall, prep island in front of it.
      dbox(brush, g, a0, a1, d1 - 0.9, d1, 0, 1.5, C.counterTop)
      for (let i = 0; i < 4; i++) {
        const at = a0 + 0.5 + ((width - 1.0) * i) / 3
        dbox(brush, g, at - 0.3, at + 0.3, d1 - 1.9, d1 - 1.05, 0, 1.1, C.electronicsGrey)
      }
      dbox(brush, g, a0, a1, 1.5, 2.0, 0, 0.95, fascia)
      break
    }

    case 'service': {
      // A desk across the room with chairs on the public side.
      const mid = (a0 + a1) / 2
      const half = Math.min(2.0, width / 2 - 0.4)
      counter(mid - half, mid + half, Math.min(2.6, d1 - 1.2))
      shelf(a0, a0 + 0.4, 1.3, d1, 1.8)
      for (const at of [mid - 1.1, mid + 1.1]) {
        dbox(brush, g, at - 0.24, at + 0.24, 1.5, 2.0, 0, 0.45, C.chairBlack)
        dbox(brush, g, at - 0.24, at + 0.24, 1.5, 1.62, 0.45, 1.05, C.chairBlack)
      }
      break
    }

    case 'papered':
      break

    default: {
      // Salons: chairs in a row, mirrors down the back wall.
      const n = Math.max(1, Math.floor((width - 1.0) / 1.5))
      for (let i = 0; i < n; i++) {
        const at = a0 + 0.7 + ((width - 1.4) * (i + 0.5)) / n
        dbox(brush, g, at - 0.28, at + 0.28, 2.1, 2.66, 0, 0.5, C.chairBlack)
        dbox(brush, g, at - 0.28, at + 0.28, 2.5, 2.66, 0.5, 1.15, C.chairBlack)
        dbox(brush, g, at - 0.42, at + 0.42, d1 - 0.06, d1, 1.0, 2.05, C.mirror)
      }
      dbox(brush, g, a0, a1, d1 - 0.5, d1 - 0.06, 0, 0.95, C.shelfWhite)
      counter(a0 + 0.4, Math.min(a0 + 1.8, a1 - 0.4), 1.3)
      break
    }
  }
}

// --- 4. Anchors -----------------------------------------------------------

function carveAnchor(brush, a, signs) {
  const r = a.rect
  const t = 0.8
  brush.clear(r.x0 + t, 0, r.z0 + t, r.x1 - t, H.anchorCeil, r.z1 - t)
  brush.slab(r.x0 + t, r.z0 + t, r.x1 - t, r.z1 - t, -0.25, () => C.deptAisle)
  acousticCeiling(brush,
    { x0: r.x0 + t, z0: r.z0 + t, x1: r.x1 - t, z1: r.z1 - t }, H.anchorCeil)

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

  fitOutAnchor(brush, a, signs)

  // Clear a lead-in from the mall doors: shelving and racks were being laid
  // straight across the entrance.
  const lead = 9
  const gap = w + 1.5
  const leadIn = {
    S: [mAt(e) - gap, r.z1 - t - lead, mAt(e) + gap, r.z1 - t + 0.5],
    N: [mAt(e) - gap, r.z0 + t - 0.5, mAt(e) + gap, r.z0 + t + lead],
    E: [r.x1 - t - lead, mAt(e) - gap, r.x1 - t + 0.5, mAt(e) + gap],
    W: [r.x0 + t - 0.5, mAt(e) - gap, r.x0 + t + lead, mAt(e) + gap],
  }[e.face]
  brush.clear(leadIn[0], 0, leadIn[1], leadIn[2], H.anchorCeil, leadIn[3])
  brush.slab(leadIn[0], leadIn[1], leadIn[2], leadIn[3], -0.25, () => C.deptAisle)

  // Rooftop plant so the anchors read as anchors from the parking lot.
  brush.box(r.x0 + 6, ANCHOR_ROOF, r.z0 + 6, r.x0 + 14, ANCHOR_ROOF + 1.4, r.z0 + 12, C.roofUnit)
}

// Entry position is stored in scan pixels along the entry axis.
function mAt(e) {
  return e.face === 'E' || e.face === 'W' ? mz(e.at) : mx(e.at)
}

// The arcade: a dark carpeted room whose only light is the cabinets.
function arcade(brush, g, a0, a1, d1) {
  const glows = [C.arcadeGlowA, C.arcadeGlowB, C.arcadeGlowC]
  let i = 0
  const cabinet = (at, d, facing) => {
    dbox(brush, g, at - 0.36, at + 0.36, d, d + 0.8, 0, 1.85, C.arcadeCab)
    const glow = glows[i++ % glows.length]
    // Screen on the aisle side, marquee above it.
    const sd = facing > 0 ? d + 0.78 : d - 0.02
    dbox(brush, g, at - 0.3, at + 0.3, sd, sd + 0.06, 0.95, 1.45, glow)
    dbox(brush, g, at - 0.34, at + 0.34, d - 0.03, d + 0.83, 1.6, 1.85, glow)
  }

  // Two rows facing the centre aisle, plus a back row along the wall.
  for (let at = a0 + 0.6; at < a1 - 0.6; at += 0.95) {
    cabinet(at, 1.6, +1)
    if (d1 > 6) cabinet(at, d1 - 2.4, -1)
  }
  for (let d = 3.4; d < d1 - 3.2; d += 0.95) {
    dbox(brush, g, a0, a0 + 0.8, d, d + 0.72, 0, 1.85, C.arcadeCab)
    dbox(brush, g, a0 + 0.78, a0 + 0.84, d + 0.06, d + 0.66, 0.95, 1.45, glows[i++ % glows.length])
  }
  // Change machine by the door.
  dbox(brush, g, a1 - 1.0, a1 - 0.3, 1.4, 2.0, 0, 1.6, C.craftsmanRed)
}

// --- Department store fit-out ---------------------------------------------
//
// Departments are given in normalised coordinates (see anchors.js) and inset
// here, so the gaps between them become the store's aisles without anyone
// having to draw an aisle.

const AISLE = 2.2          // gap left around each department
const DEPT_SIGN_Y = 3.7

function fitOutAnchor(brush, a, signs) {
  const list = DEPARTMENTS[a.id]
  if (!list) return
  const r = a.rect
  const t = 1.4
  const x0 = r.x0 + t, x1 = r.x1 - t
  const z0 = r.z0 + t, z1 = r.z1 - t
  const W = x1 - x0, Dp = z1 - z0

  let seed = a.id * 7919
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

  perimeterShelving(brush, x0, z0, x1, z1)

  for (const d of list) {
    const dx0 = x0 + W * d.u0 + AISLE / 2
    const dx1 = x0 + W * d.u1 - AISLE / 2
    const dz0 = z0 + Dp * d.v0 + AISLE / 2
    const dz1 = z0 + Dp * d.v1 - AISLE / 2
    if (dx1 - dx0 < 3 || dz1 - dz0 < 3) continue

    brush.slab(dx0, dz0, dx1, dz1, -0.25, () => C[FLOORS[d.type]])
    const accents = ACCENTS[d.type].map((n) => C[n])
    department(brush, d.type, dx0, dz0, dx1, dz1, accents, rnd)

    // Hanging department sign, readable from the aisle on both sides.
    const cx = (dx0 + dx1) / 2
    const cz = (dz0 + dz1) / 2
    const wide = dx1 - dx0 >= dz1 - dz0
    const w = Math.min(wide ? dx1 - dx0 : dz1 - dz0, 5) * 0.62
    brush.box(cx - (wide ? w / 2 : 0.06), DEPT_SIGN_Y - 0.28, cz - (wide ? 0.06 : w / 2),
              cx + (wide ? w / 2 : 0.06), DEPT_SIGN_Y + 0.28, cz + (wide ? 0.06 : w / 2), C.deptSign)
    // Hanger rods up to the ceiling.
    for (const f of [-0.34, 0.34]) {
      const hx = cx + (wide ? w * f : 0), hz = cz + (wide ? 0 : w * f)
      brush.box(hx - 0.04, DEPT_SIGN_Y + 0.28, hz - 0.04, hx + 0.04, H.anchorCeil, hz + 0.04, C.rackMetal)
    }
    for (const side of [-1, 1]) {
      signs.push({
        text: d.name.toUpperCase(),
        x: cx + (wide ? 0 : 0.09 * side),
        y: DEPT_SIGN_Y,
        z: cz + (wide ? 0.09 * side : 0),
        rotY: wide ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2),
        width: w * 0.92,
      })
    }
  }
}

// One department's worth of fixtures. Everything is spaced generously — a
// dense grid of racks costs a lot of triangles and reads as noise.
function department(brush, type, x0, z0, x1, z1, accents, rnd) {
  const pick = () => accents[Math.floor(rnd() * accents.length)]
  const grid = (step, fn) => {
    for (let x = x0 + step / 2; x < x1 - 0.6; x += step) {
      for (let z = z0 + step / 2; z < z1 - 0.6; z += step) fn(x, z)
    }
  }

  switch (type) {
    case 'apparel':
    case 'children': {
      const h = type === 'children' ? 1.15 : 1.42
      grid(5.4, (x, z) => {
        if (rnd() < 0.28) {
          // Four-way rack.
          brush.box(x - 0.09, 0, z - 0.09, x + 0.09, h, z + 0.09, C.rackMetal)
          brush.box(x - 0.7, h * 0.4, z - 0.16, x + 0.7, h * 0.95, z + 0.16, pick())
          brush.box(x - 0.16, h * 0.4, z - 0.7, x + 0.16, h * 0.95, z + 0.7, pick())
        } else {
          // Round rack.
          brush.box(x - 0.11, 0, z - 0.11, x + 0.11, h, z + 0.11, C.rackMetal)
          brush.column(x, z, 0.62, h * 0.38, h * 0.92, pick())
          brush.ring(x, z, 0.64, 0.5, h * 0.92, h, C.rackMetal)
        }
      })
      break
    }

    case 'shoes': {
      grid(5.8, (x, z) => {
        brush.box(x - 1.0, 0, z - 0.28, x + 1.0, 0.38, z + 0.28, C.bench)
        brush.box(x - 0.9, 0.38, z - 0.24, x + 0.9, 0.46, z + 0.24, C.mannequin)
      })
      break
    }

    case 'cosmetics': {
      // Glass counter islands with tall lit back units — the brightest floor
      // in the store, and always the first thing past the mall doors.
      grid(5.0, (x, z) => {
        brush.box(x - 1.5, 0, z - 0.55, x + 1.5, 0.95, z + 0.55, C.shelfWhite)
        brush.box(x - 1.5, 0.95, z - 0.55, x + 1.5, 1.5, z + 0.55, C.storefrontGlass)
        brush.box(x - 1.56, 1.5, z - 0.61, x + 1.56, 1.6, z + 0.61, C.brass)
        brush.box(x - 1.4, 1.6, z - 0.3, x + 1.4, 2.5, z + 0.3, C.backlit)
        brush.box(x - 1.4, 1.75, z - 0.34, x + 1.4, 2.35, z + 0.34, pick())
      })
      break
    }

    case 'jewelry': {
      // A compact U of cases with staff standing inside it.
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
      const hw = Math.min(2.6, (x1 - x0) / 2 - 0.8)
      const hd = Math.min(2.2, (z1 - z0) / 2 - 0.8)
      if (hw < 1 || hd < 1) break
      for (const [ax0, az0, ax1, az1] of [
        [cx - hw, cz - hd, cx + hw, cz - hd + 0.7],
        [cx - hw, cz + hd - 0.7, cx + hw, cz + hd],
        [cx - hw, cz - hd, cx - hw + 0.7, cz + hd],
      ]) {
        brush.box(ax0, 0, az0, ax1, 0.9, az1, C.caseFrame)
        brush.box(ax0, 0.9, az0, ax1, 1.42, az1, C.storefrontGlass)
        brush.box(ax0 - 0.05, 1.42, az0 - 0.05, ax1 + 0.05, 1.5, az1 + 0.05, C.brass)
      }
      break
    }

    case 'home': {
      grid(4.9, (x, z) => {
        brush.box(x - 1.4, 0, z - 0.5, x + 1.4, 0.3, z + 0.5, C.shelfBack)
        brush.box(x - 1.4, 0.3, z - 0.5, x + 1.4, 1.65, z + 0.5, C.shelfWhite)
        for (let y = 0.55; y < 1.55; y += 0.45) {
          brush.box(x - 1.45, y, z - 0.54, x + 1.45, y + 0.24, z + 0.54, pick())
        }
      })
      break
    }

    case 'appliance': {
      grid(4.4, (x, z) => {
        brush.box(x - 0.42, 0, z - 0.36, x + 0.42, 1.75, z + 0.36, C.applianceWhite)
        brush.box(x - 0.44, 1.1, z - 0.4, x + 0.44, 1.35, z + 0.4, C.electronicsGrey)
      })
      break
    }

    case 'hardware': {
      // Tall gondolas in Craftsman red and black.
      for (let x = x0 + 1.6; x < x1 - 1.2; x += 4.0) {
        brush.box(x - 0.55, 0, z0 + 1.0, x + 0.55, 0.3, z1 - 1.0, C.toolBlack)
        brush.box(x - 0.55, 0.3, z0 + 1.0, x + 0.55, 2.2, z1 - 1.0, C.shelfWhite)
        for (let y = 0.5; y < 2.1; y += 0.5) {
          brush.box(x - 0.6, y, z0 + 1.0, x + 0.6, y + 0.26, z1 - 1.0, pick())
        }
      }
      break
    }

    case 'electronics': {
      grid(4.6, (x, z) => {
        brush.box(x - 1.1, 0, z - 0.5, x + 1.1, 0.85, z + 0.5, C.woodTable)
        brush.box(x - 0.9, 0.85, z - 0.4, x + 0.9, 0.92, z + 0.4, C.counterTop)
        brush.box(x - 0.7, 0.92, z - 0.3, x + 0.7, 1.5, z + 0.3, C.toolBlack)
        brush.box(x - 0.6, 1.02, z - 0.24, x + 0.6, 1.4, z + 0.24, C.mirror)
      })
      break
    }

    case 'furniture': {
      grid(6.0, (x, z) => {
        brush.box(x - 1.2, 0, z - 0.5, x + 1.2, 0.42, z + 0.5, C.sofaBlue)
        brush.box(x - 1.2, 0.42, z - 0.5, x + 1.2, 0.88, z - 0.28, C.sofaBlue)
        brush.box(x + 1.7, 0, z - 0.5, x + 2.6, 0.5, z + 0.4, C.woodTable)
      })
      break
    }

    case 'fitting': {
      // A block of cubicles with a service counter in front.
      for (let z = z0 + 0.4; z < z1 - 1.4; z += 1.4) {
        brush.box(x0 + 0.4, 0, z, x1 - 1.6, 2.4, z + 0.14, C.shelfWhite)
        brush.box(x1 - 1.74, 0, z + 0.14, x1 - 1.6, 2.4, z + 1.4, C.shelfWhite)
      }
      brush.box(x0 + 0.4, 0, z0, x1 - 1.6, 2.4, z0 + 0.14, C.shelfWhite)
      break
    }
  }
}

// Wall-mounted shelving around the inside of the store, which is where a
// department store actually puts it.
function perimeterShelving(brush, x0, z0, x1, z1) {
  const d = 0.5
  const top = 2.3
  const runs = [
    [x0, z0, x1, z0 + d],
    [x0, z1 - d, x1, z1],
    [x0, z0 + d, x0 + d, z1 - d],
    [x1 - d, z0 + d, x1, z1 - d],
  ]
  const bands = [C.apparelNavy, C.salonMauve, C.apparelTeal, C.merchWarm]
  for (const [ax0, az0, ax1, az1] of runs) {
    brush.box(ax0, 0, az0, ax1, 0.3, az1, C.shelfBack)
    brush.box(ax0, 0.3, az0, ax1, top, az1, C.shelfWhite)
    let i = 0
    for (let y = 0.65; y < top - 0.35; y += 0.55, i++) {
      brush.box(ax0, y, az0, ax1, y + 0.26, az1, bands[i % bands.length])
    }
  }
}

// --- Restrooms / mall office ---------------------------------------------

function carveService(brush, s, signs) {
  const r = s.at
  brush.clear(r.x0 + 0.3, 0, r.z0 + 0.3, r.x1 - 0.3, H.storeCeil, r.z1 - 0.3)
  brush.slab(r.x0, r.z0, r.x1, r.z1, -0.25, () => C.tileGrey)

  if (s.id !== 'R/T') return
  // The directory calls these "Public Restrooms and Telephones", so give them
  // the telephones: a bank on the corridor wall beside the door.
  const wide = r.x1 - r.x0 >= r.z1 - r.z0
  payphones(brush, wide ? (r.x0 + r.x1) / 2 : r.x0 - 0.25,
                   wide ? r.z0 - 0.25 : (r.z0 + r.z1) / 2, wide)
  signs.push({
    text: 'RESTROOMS',
    x: (r.x0 + r.x1) / 2, y: 2.5, z: r.z0 - 0.1,
    rotY: Math.PI, width: 1.6,
  })
}

// --- 5. Floors ------------------------------------------------------------

const V = (m) => Math.round(m / VOXEL)

function floors(brush) {
  for (const c of CORRIDORS) {
    const r = c.rect
    const wide = r.x1 - r.x0 > r.z1 - r.z0
    const mid = wide ? (r.z0 + r.z1) / 2 : (r.x0 + r.x1) / 2

    brush.slab(r.x0, r.z0, r.x1, r.z1, -0.25, (ix, iz) => {
      const x = ix * VOXEL, z = iz * VOXEL
      const edge = Math.min(x - r.x0, r.x1 - x, z - r.z0, r.z1 - z)
      // One-metre tiles, with the grout drawn. Without it the whole floor
      // greedy-meshes into a single flat wash and reads as grey concrete.
      const grout = (((ix % 4) + 4) % 4 === 0) || (((iz % 4) + 4) % 4 === 0)

      if (edge < 0.5) return C.tileGrey
      if (edge < 1.5) return grout ? C.bandGrout : C.courtBand
      if (edge < 1.9) return C.tileRose

      const off = Math.abs((wide ? z : x) - mid)
      if (off < 0.45) {
        const along = wide ? ix : iz
        return ((along % 10) < 2) ? C.runnerDash : (grout ? C.runnerGrout : C.runnerRed)
      }
      return grout ? C.tileGrout : C.tileCream
    })
  }

  // The court keeps the diamond harlequin from the period photographs, laid
  // in rings around the fountain.
  brush.slab(FOUNTAIN.x - 12, FOUNTAIN.z - 12, FOUNTAIN.x + 12, FOUNTAIN.z + 12, -0.25, (ix, iz) => {
    const dx = ix * VOXEL - FOUNTAIN.x
    const dz = iz * VOXEL - FOUNTAIN.z
    const d = Math.hypot(dx, dz)
    if (d > 11) return 0
    if (d < FOUNTAIN.r + 1.4) return (Math.floor(d / 0.75) % 3 === 0) ? C.tileMauve : C.tileCream
    const cx = ((ix % 8) + 8) % 8
    const cz = ((iz % 8) + 8) % 8
    return (Math.abs(cx - 4) + Math.abs(cz - 4) <= 2) ? C.tileMauve : C.tileCream
  })
}

// --- 6. Ceilings ----------------------------------------------------------

function ceilings(brush) {
  for (const c of CORRIDORS) {
    const r = c.rect
    const y = ceilOf(c)

    if (y >= 5.5) {
      brush.box(r.x0, y, r.z0, r.x1, y + 0.25, r.z1, C.ceiling)
      coves(brush, r, y)
    } else {
      acousticCeiling(brush, r, y)
    }
  }

  // Skylight over the fountain court: punch the roof out and glaze it, with a
  // lit cove ringing the opening.
  const s = 8
  brush.clear(FOUNTAIN.x - s, H.concourseCeil, FOUNTAIN.z - s, FOUNTAIN.x + s, H.roof, FOUNTAIN.z + s)
  brush.box(FOUNTAIN.x - s, H.roof - 0.25, FOUNTAIN.z - s, FOUNTAIN.x + s, H.roof, FOUNTAIN.z + s, C.skylight)
  for (const [x0, z0, x1, z1] of [
    [FOUNTAIN.x - s - 0.9, FOUNTAIN.z - s - 0.9, FOUNTAIN.x + s + 0.9, FOUNTAIN.z - s],
    [FOUNTAIN.x - s - 0.9, FOUNTAIN.z + s, FOUNTAIN.x + s + 0.9, FOUNTAIN.z + s + 0.9],
    [FOUNTAIN.x - s - 0.9, FOUNTAIN.z - s, FOUNTAIN.x - s, FOUNTAIN.z + s],
    [FOUNTAIN.x + s, FOUNTAIN.z - s, FOUNTAIN.x + s + 0.9, FOUNTAIN.z + s],
  ]) {
    brush.box(x0, H.concourseCeil, z0, x1, H.concourseCeil + 0.6, z1, C.ceilingCove)
    brush.box(x0, H.concourseCeil, z0, x1, H.concourseCeil + 0.25, z1, C.ceilingLight)
  }
}

// Stepped, lit soffits down both long edges of a tall concourse.
function coves(brush, r, y) {
  const wide = r.x1 - r.x0 > r.z1 - r.z0
  const w = 2.5
  const drop = H.concourseCove - 0.8
  const edges = wide
    ? [[r.x0, r.z0, r.x1, r.z0 + w], [r.x0, r.z1 - w, r.x1, r.z1]]
    : [[r.x0, r.z0, r.x0 + w, r.z1], [r.x1 - w, r.z0, r.x1, r.z1]]
  for (const [x0, z0, x1, z1] of edges) {
    brush.box(x0, drop, z0, x1, y, z1, C.soffit)
    brush.box(x0, drop, z0, x1, drop + 0.25, z1, C.ceilingLight)
    // A second, shallower step inboard of the first.
    const [ix0, iz0, ix1, iz1] = wide
      ? [x0, z0 === r.z0 ? z1 : z0 - 0.9, x1, z0 === r.z0 ? z1 + 0.9 : z0]
      : [x0 === r.x0 ? x1 : x0 - 0.9, z0, x0 === r.x0 ? x1 + 0.9 : x0, z1]
    brush.box(ix0, drop + 0.5, iz0, ix1, y, iz1, C.soffit)
  }
}

// Lay-in acoustic tile on a 1.2 m grid, with fluorescent troffers — the low
// ceiling the wings actually had.
function acousticCeiling(brush, r, y) {
  brush.box(r.x0, y, r.z0, r.x1, y + 0.25, r.z1, C.ceiling)
  brush.slab(r.x0, r.z0, r.x1, r.z1, y, (ix, iz) => {
    const gx = ((ix % 5) + 5) % 5
    const gz = ((iz % 5) + 5) % 5
    return gx === 0 || gz === 0 ? C.ceilingGrid : C.ceiling
  })

  const wide = r.x1 - r.x0 > r.z1 - r.z0
  const len = wide ? r.x1 - r.x0 : r.z1 - r.z0
  const across = wide ? [r.z0, r.z1] : [r.x0, r.x1]
  for (let t = 2.4; t < len - 1.5; t += 3.6) {
    for (const f of [0.3, 0.7]) {
      const a = (wide ? r.x0 : r.z0) + t
      const b2 = across[0] + (across[1] - across[0]) * f
      const [x, z] = wide ? [a, b2] : [b2, a]
      const [hx, hz] = wide ? [0.6, 0.3] : [0.3, 0.6]
      brush.box(x - hx, y, z - hz, x + hx, y + 0.25, z + hz, C.troffer)
    }
  }
}

// --- 7. Concourse furniture ----------------------------------------------

// Fixtures already standing in the concourse, so seating and planters don't
// get dropped on top of a kiosk or into the fountain.
function occupied(x, z, r) {
  if (Math.hypot(x - FOUNTAIN.x, z - FOUNTAIN.z) < FOUNTAIN.r + r + 2) return true
  if (Math.hypot(x - CAROUSEL.x, z - CAROUSEL.z) < CAROUSEL.r + r + 2) return true
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
          if (n % 2 === side) {
            const bx = wide ? a + 1.3 : b
            const bz = wide ? b : a + 1.3
            trashBin(brush, bx, bz)
          }
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
        const px = wide ? a : off
        const pz = wide ? off : a
        if (!occupied(px, pz, 1.5)) {
          if (n % 7 === 1) bannerStand(brush, px, pz, wide)
          else if (n % 11 === 4) saleEasel(brush, px, pz, wide)
          else bench(brush, px, pz, wide)
        }
      }

      // Kiddie rides sit in the quiet wings, on the centre line.
      const rideOff = mid + (wide ? 2.6 : 2.6)
      if (n % 9 === 5 && !occupied(wide ? a : rideOff, wide ? rideOff : a, 2.6)) {
        kiddieRides(brush, wide ? a : rideOff, wide ? rideOff : a, wide)
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
  const [hx, hz] = wide ? [1.1, 0.3] : [0.3, 1.1]
  const [lx, lz] = wide ? [0.12, hz] : [hx, 0.12]
  for (const s2 of [-1, 1]) {
    const cx = wide ? x + s2 * (hx - 0.18) : x
    const cz = wide ? z : z + s2 * (hz - 0.18)
    brush.box(cx - lx, 0, cz - lz, cx + lx, 0.42, cz + lz, C.neutralPier)
  }
  brush.box(x - hx, 0.42, z - hz, x + hx, 0.55, z + hz, C.bench)
}

// Coin-op kiddie rides on a black mat — a fixture of every quiet wing.
function kiddieRides(brush, x, z, wide) {
  const [hx, hz] = wide ? [1.75, 0.8] : [0.8, 1.75]
  brush.box(x - hx, 0, z - hz, x + hx, 0.14, z + hz, C.rideMat)
  const colours = [C.toyRed, C.toyYellow, C.toyBlue]
  for (let i = 0; i < 3; i++) {
    const cx = x + (i - 1) * (wide ? 1.1 : 0)
    const cz = z + (i - 1) * (wide ? 0 : 1.1)
    brush.box(cx - 0.42, 0.14, cz - 0.3, cx + 0.42, 0.66, cz + 0.3, colours[i])
    brush.box(cx - 0.3, 0.66, cz - 0.24, cx + 0.3, 0.86, cz + 0.24, C.chairBlack)
    brush.box(cx - 0.14, 0.86, cz - 0.14, cx + 0.14, 1.06, cz + 0.14, colours[(i + 1) % 3])
    brush.box(cx - 0.44, 0.2, cz - 0.34, cx - 0.3, 0.4, cz - 0.2, C.chairBlack)
    brush.box(cx + 0.3, 0.2, cz + 0.2, cx + 0.44, 0.4, cz + 0.34, C.chairBlack)
  }
}

// The chrome cylinder bin with the ashtray top, parked at every pier.
function trashBin(brush, x, z) {
  brush.column(x, z, 0.34, 0, 0.9, C.chrome)
  brush.ring(x, z, 0.36, 0.22, 0.9, 1.0, C.chromeDark)
  brush.column(x, z, 0.24, 0.9, 0.96, C.chromeDark)
}

// A bank of payphones on the wall outside the restrooms.
function payphones(brush, x, z, wide, n = 3) {
  for (let i = 0; i < n; i++) {
    const cx = wide ? x + (i - (n - 1) / 2) * 0.75 : x
    const cz = wide ? z : z + (i - (n - 1) / 2) * 0.75
    const [hx, hz] = wide ? [0.3, 0.16] : [0.16, 0.3]
    brush.box(cx - hx, 1.0, cz - hz, cx + hx, 1.85, cz + hz, C.phoneBlue)
    brush.box(cx - hx + 0.06, 1.5, cz - hz - 0.04, cx + hx - 0.06, 1.72, cz + hz + 0.04, C.chrome)
    brush.box(cx - 0.07, 0.75, cz - 0.07, cx + 0.07, 1.0, cz + 0.07, C.chromeDark)
  }
}

// Roll-up banner stand.
function bannerStand(brush, x, z, wide) {
  const [hx, hz] = wide ? [0.42, 0.09] : [0.09, 0.42]
  brush.box(x - hx, 0, z - hz - 0.08, x + hx, 0.1, z + hz + 0.08, C.chairBlack)
  brush.box(x - hx, 0.1, z - hz * 0.5, x + hx, 2.05, z + hz * 0.5, C.bannerWhite)
  brush.box(x - hx, 1.45, z - hz * 0.5 - 0.02, x + hx, 1.85, z + hz * 0.5 + 0.02, C.saleRed)
  brush.box(x - hx, 0.55, z - hz * 0.5 - 0.02, x + hx, 0.8, z + hz * 0.5 + 0.02, C.saleYellow)
}

// A-frame sale sign, the kind wheeled out in front of a shop.
function saleEasel(brush, x, z, wide) {
  const [hx, hz] = wide ? [0.4, 0.22] : [0.22, 0.4]
  brush.box(x - hx, 0, z - hz, x + hx, 0.12, z + hz, C.chairBlack)
  brush.box(x - hx, 0.12, z - hz * 0.4, x + hx, 1.05, z + hz * 0.4, C.saleRed)
  brush.box(x - hx + 0.06, 0.72, z - hz * 0.4 - 0.02, x + hx - 0.06, 0.95, z + hz * 0.4 + 0.02, C.bannerWhite)
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

// --- Carousel -------------------------------------------------------------
// "Even a carousel for the kids." — Colonial Mall Decatur, 2000.

function carousel(brush, signs) {
  const { x, z, r } = CAROUSEL
  brush.column(x, z, r + 0.5, 0, 0.16, C.chromeDark)
  brush.column(x, z, r, 0.16, 0.4, C.bench)
  brush.ring(x, z, r, r - 0.35, 0.4, 0.55, C.craftsmanRed)
  brush.column(x, z, 0.45, 0.4, 3.0, C.brass)

  const horses = 8
  for (let i = 0; i < horses; i++) {
    const a = (i / horses) * Math.PI * 2
    const px = x + Math.cos(a) * (r - 1.0)
    const pz = z + Math.sin(a) * (r - 1.0)
    brush.box(px - 0.06, 0.4, pz - 0.06, px + 0.06, 2.55, pz + 0.06, C.brass)
    const body = [C.craftsmanRed, C.bench, C.toyBlue, C.toyYellow][i % 4]
    brush.box(px - 0.42, 0.95, pz - 0.2, px + 0.42, 1.45, pz + 0.2, body)
    brush.box(px + 0.2, 1.35, pz - 0.16, px + 0.5, 1.8, pz + 0.16, body)
    for (const lx of [-0.3, 0.25]) {
      brush.box(px + lx, 0.55, pz - 0.16, px + lx + 0.14, 0.98, pz + 0.16, body)
    }
  }

  // Striped canopy, with lamps around the rim.
  const bands = 6
  for (let k = 0; k < bands; k++) {
    const rOut = r + 0.35 - k * ((r + 0.35) / bands)
    const rIn = r + 0.35 - (k + 1) * ((r + 0.35) / bands)
    brush.ring(x, z, rOut, Math.max(0, rIn), 2.86 + k * 0.14, 3.02 + k * 0.14,
      k % 2 ? C.bench : C.craftsmanRed)
  }
  const lamps = 16
  for (let i = 0; i < lamps; i++) {
    const a = (i / lamps) * Math.PI * 2
    brush.box(x + Math.cos(a) * (r + 0.2) - 0.09, 2.78, z + Math.sin(a) * (r + 0.2) - 0.09,
              x + Math.cos(a) * (r + 0.2) + 0.09, 2.94, z + Math.sin(a) * (r + 0.2) + 0.09,
              C.troffer)
  }
  signs.push({ text: 'CAROUSEL', x, y: 3.35, z: z + r + 0.3, rotY: 0, width: 2.6 })
}

// --- 9. Kiosks ------------------------------------------------------------

function kiosk(brush, k, signs) {
  const r = k.at
  // Wood base, glass display cases above it, brass cap rail.
  brush.box(r.x0, 0, r.z0, r.x1, 0.92, r.z1, C.kioskWood)
  brush.box(r.x0 - 0.06, 0.92, r.z0 - 0.06, r.x1 + 0.06, 1.02, r.z1 + 0.06, C.counterTop)
  brush.box(r.x0 + 0.06, 1.02, r.z0 + 0.06, r.x1 - 0.06, 1.62, r.z1 - 0.06, C.storefrontGlass)
  brush.shell(r.x0 + 0.04, r.z0 + 0.04, r.x1 - 0.04, r.z1 - 0.04, 1.02, 1.62, 0.1, C.caseFrame)
  brush.box(r.x0 - 0.04, 1.62, r.z0 - 0.04, r.x1 + 0.04, 1.72, r.z1 + 0.04, C.brass)

  // A modest sign on two posts, rather than a canopy over the whole thing.
  for (const cx of [r.x0 + 0.1, r.x1 - 0.24]) {
    brush.box(cx, 1.72, (r.z0 + r.z1) / 2 - 0.07, cx + 0.14, 2.16, (r.z0 + r.z1) / 2 + 0.07, C.storefrontDark)
  }
  brush.box(r.x0, 2.16, (r.z0 + r.z1) / 2 - 0.09, r.x1, 2.5, (r.z0 + r.z1) / 2 + 0.09, C.signBoard)
  for (const [z, rotY] of [[(r.z0 + r.z1) / 2 - 0.14, Math.PI], [(r.z0 + r.z1) / 2 + 0.14, 0]]) {
    signs.push({ text: k.name, x: (r.x0 + r.x1) / 2, y: 2.33, z, rotY, width: (r.x1 - r.x0) * 0.92 })
  }
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
