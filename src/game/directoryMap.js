// Draws the you-are-here directory from the live plan data.
//
// It is the same map the mall printed, redrawn from the same numbers the world
// is built from — so it can never disagree with the building around it.

import { ANCHORS, BAYS, CORRIDORS, KIOSKS, PX, TENANTS } from './plan.js'
import { SEASON_LABEL } from './season.js'

const INK = '#1c3f6e'
const PAPER = '#f3efe4'
const FILL = '#ffffff'
const CORRIDOR = '#e6e0d2'

export function drawDirectory(scale = 3.1) {
  const all = [...BAYS, ...ANCHORS.map((a) => ({ ...a.rect, id: a.id }))]
  const pad = 16
  const minX = Math.min(...all.map((r) => r.x0)) - 4
  const maxX = Math.max(...all.map((r) => r.x1)) + 4
  const minZ = Math.min(...all.map((r) => r.z0)) - 4
  const maxZ = Math.max(...all.map((r) => r.z1)) + 4

  const canvas = document.createElement('canvas')
  canvas.width = Math.round((maxX - minX) * scale) + pad * 2
  canvas.height = Math.round((maxZ - minZ) * scale) + pad * 2 + 54
  const g = canvas.getContext('2d')

  g.fillStyle = PAPER
  g.fillRect(0, 0, canvas.width, canvas.height)

  const X = (x) => pad + (x - minX) * scale
  const Z = (z) => pad + 44 + (z - minZ) * scale

  // Header, set the way the printed directory sets it.
  g.fillStyle = INK
  g.font = '700 26px "Cormorant Garamond", Georgia, serif'
  g.textBaseline = 'alphabetic'
  g.fillText('RIVER OAKS CENTRE', pad, 30)
  g.font = '500 12px Helvetica, Arial, sans-serif'
  g.fillText(SEASON_LABEL.toUpperCase(), canvas.width - pad - g.measureText(SEASON_LABEL).width - 12, 30)

  // Concourse first, so the shops sit on top of it.
  g.fillStyle = CORRIDOR
  for (const c of CORRIDORS) {
    g.fillRect(X(c.rect.x0), Z(c.rect.z0), (c.rect.x1 - c.rect.x0) * scale, (c.rect.z1 - c.rect.z0) * scale)
  }

  g.lineWidth = 1
  g.strokeStyle = INK
  g.textAlign = 'center'
  g.textBaseline = 'middle'

  for (const b of BAYS) {
    const w = (b.x1 - b.x0) * scale
    const h = (b.z1 - b.z0) * scale
    g.fillStyle = b.name ? FILL : '#e9e4d6'
    g.fillRect(X(b.x0), Z(b.z0), w, h)
    g.strokeRect(X(b.x0) + 0.5, Z(b.z0) + 0.5, w - 1, h - 1)
    if (Math.min(w, h) > 13) {
      g.fillStyle = INK
      g.font = `${Math.min(11, Math.min(w, h) * 0.5)}px Helvetica, Arial, sans-serif`
      g.fillText(String(b.id), X(b.x0) + w / 2, Z(b.z0) + h / 2)
    }
  }

  for (const a of ANCHORS) {
    const r = a.rect
    g.fillStyle = FILL
    g.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * scale, (r.z1 - r.z0) * scale)
    g.lineWidth = 1.8
    g.strokeRect(X(r.x0) + 1, Z(r.z0) + 1, (r.x1 - r.x0) * scale - 2, (r.z1 - r.z0) * scale - 2)
    g.lineWidth = 1
    g.fillStyle = INK
    g.font = '700 15px "Cormorant Garamond", Georgia, serif'
    const cx = X((r.x0 + r.x1) / 2)
    const cz = Z((r.z0 + r.z1) / 2)
    for (const [i, line] of (TENANTS[a.id] ?? a.name).toUpperCase().split(' — ').entries()) {
      g.fillText(line, cx, cz + i * 17 - 8)
    }
    g.font = '13px Helvetica, Arial, sans-serif'
    g.fillText(String(a.id), cx, cz + 22)
  }

  // Kiosks as lettered squares, as the printed map does.
  g.font = '700 10px Helvetica, Arial, sans-serif'
  for (const k of KIOSKS) {
    const cx = X((k.at.x0 + k.at.x1) / 2)
    const cz = Z((k.at.z0 + k.at.z1) / 2)
    g.fillStyle = INK
    g.fillRect(cx - 6, cz - 6, 12, 12)
    g.fillStyle = PAPER
    g.fillText(k.id, cx, cz)
  }

  return { canvas, X, Z, scale, minX, minZ, pad }
}

// Marks the viewer's position on a copy of the board.
export function markYouAreHere(map, x, z) {
  const g = map.canvas.getContext('2d')
  g.fillStyle = '#c02b3a'
  g.beginPath()
  g.arc(map.X(x), map.Z(z), 6, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#c02b3a'
  g.font = '700 11px Helvetica, Arial, sans-serif'
  g.textAlign = 'left'
  g.fillText('YOU ARE HERE', map.X(x) + 10, map.Z(z))
}

export const MAP_SCALE_NOTE = `1 px = ${(1 / PX).toFixed(0)} scan px`
