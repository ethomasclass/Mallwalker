// The other people in the mall.
//
// Walkers are small voxel figures that travel the corridor graph between
// random destinations; a few stand where their job puts them — the Foot
// Locker "Striper" at the door of 416, the guard on his beat, the kiosk
// clerk at Customer Service. Each one is shaded from the same baked light
// grid as the building, so they darken in the arcade doorway and brighten
// under the skylight like everything else.
//
// Get within a few metres, look at one, and press E (or tap TALK).

import * as THREE from 'three'

// --- Wardrobe ---------------------------------------------------------------
// Looks are picked per archetype. Colours are sRGB hex; converted once.
const LOOKS = {
  walker: {   // the mall walkers: retirees doing laps in windbreakers
    name: ['Earl', 'Dot', 'Verna', 'Hank', 'Lorene', 'Bud', 'Opal'],
    top: [0x3C8B94, 0x8C5E7B, 0x2E4A6F, 0xB86A57, 0x6E8F52],
    legs: [0xD9D2C3, 0x7A7C82, 0xBFB8A8],
    shoes: [0xF3F1EC],
    hair: [0xD8D3CA, 0xA7A29A, 0xE6E2DA],
    skin: [0xE8C39E, 0x8D5A3B, 0xC68B5D, 0xF0D2B2],
    speed: [1.35, 1.7],
    lines: [
      'Three laps before the stores open. Doctor says it beats the treadmill.',
      "We've been walking this mall since it was the Beltline. Same tile.",
      'You want the wide loop, go around Penney\'s. The Sears wing is a dead end.',
      'They put that carousel in last year. Grandkids love it.',
      'Morrison\'s opens at eleven. Get there early or the line goes to Payless.',
      'Nobody tells you the air conditioning is the real reason we come.',
    ],
  },
  teen: {
    name: ['Brandon', 'Ashley', 'Tyler', 'Kayla', 'Josh', 'Brittany'],
    top: [0x1E1E24, 0xB4232B, 0x2B4E7E, 0xF0C63C, 0x3A3A3E],
    legs: [0x4C5B72, 0x2A2A30, 0x6B7A8C],
    shoes: [0xF3F1EC, 0x1E1E24],
    hair: [0x2A1E14, 0x5A3A20, 0xE0B458, 0x1A1A1A],
    skin: [0xE8C39E, 0x8D5A3B, 0xC68B5D, 0xF0D2B2],
    speed: [1.5, 2.0],
    lines: [
      'Pocket Change just got the Marvel vs. Capcom cabinet. Bring quarters.',
      'Camelot\'s got the new Creed on the listening station if you\'re into that.',
      'My mom\'s in Parisian. Could be an hour.',
      'KB has the Dreamcast on the front rack. Two hundred bucks. I looked.',
      'Meet at the fountain at four. Everyone does.',
    ],
  },
  shopper: {
    name: ['Denise', 'Carla', 'Renee', 'Tammy', 'Glen', 'Marcus'],
    top: [0xF3EFE4, 0xC79AA0, 0x8E3742, 0x2E8B93, 0xD5C4AC],
    legs: [0x27334C, 0x1E1E24, 0x8B8175],
    shoes: [0x3A2A1C, 0xF3F1EC],
    hair: [0x2A1E14, 0x5A3A20, 0xA0522D, 0x1A1A1A],
    skin: [0xE8C39E, 0x8D5A3B, 0xC68B5D, 0xF0D2B2],
    speed: [1.2, 1.5],
    bag: [0xE8A0B8, 0x1F5236, 0xC8102E, 0xF3EFE4],
    lines: [
      'Bath & Body Works has the Sun-Ripened Raspberry back. Buy three get one.',
      'I only came in for a card at Hallmark. That was ninety minutes ago.',
      'CVS is fine but it isn\'t Revco. Revco knew my name.',
      'The Living Word moved the Bibles up front. It\'s nicer.',
      'If you see a woman with a Parisian bag and no husband, that\'s me.',
    ],
  },
  kid: {
    name: ['Cody', 'Madison', 'Dustin', 'Hannah'],
    top: [0xF0C63C, 0x39C6F0, 0xE0402F, 0x69B44A],
    legs: [0x4C5B72, 0xF3EFE4],
    shoes: [0xF3F1EC],
    hair: [0xE0B458, 0x2A1E14, 0x5A3A20],
    skin: [0xE8C39E, 0x8D5A3B, 0xC68B5D, 0xF0D2B2],
    speed: [1.6, 2.2],
    scale: 0.66,
    lines: [
      'The horse on the carousel that\'s blue is the fastest one.',
      'I have four dollars.',
      'Can we go in KB. Can we go in KB. Can we—',
    ],
  },
  striper: {  // Foot Locker staff — the referee shirt, from 1988 on
    name: ['Jamal', 'Chris'],
    top: [0xF3F1EC], stripes: 0x1A1A1A,
    legs: [0x1A1A1A], shoes: [0xF3F1EC],
    hair: [0x1A1A1A, 0x2A1E14],
    skin: [0x8D5A3B, 0xE8C39E, 0xC68B5D],
    speed: [0, 0],
    lines: [
      'Air Max is on the back wall, Jordans by the register. Ask me for a size.',
      'Yeah, the shirt. Everybody asks about the shirt.',
      'We moved down from the other end of the mall last spring. Bigger store.',
    ],
  },
  guard: {
    name: ['Officer Pruitt', 'Officer Hale'],
    top: [0xF3F1EC], legs: [0x1B2A44], shoes: [0x1A1A1A],
    hair: [0x5A3A20, 0xA7A29A], skin: [0xE8C39E, 0x8D5A3B],
    badge: 0xC7A34A,
    speed: [1.0, 1.2],
    lines: [
      'No skateboards inside. That includes the Sears wing.',
      'Substation\'s up in 128 if you need a real officer. I\'m just the mall.',
      'Lost kids go to Customer Service. That\'s the kiosk with the C on it.',
    ],
  },
  clerk: {
    name: ['Patty'],
    top: [0x1B3A5C], legs: [0x1E1E24], shoes: [0x1A1A1A],
    hair: [0xA0522D, 0x2A1E14], skin: [0xE8C39E, 0x8D5A3B, 0xF0D2B2],
    speed: [0, 0],
    lines: [
      'Gift certificates, stroller rental, stamps. Wheelchairs are free.',
      'Mall hours are ten to nine, one to five-thirty Sundays. It\'s on the door.',
      'Lost and found is a shoebox. It\'s mostly sunglasses.',
    ],
  },
}

const rgb = (hex) => new THREE.Color(hex)
const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)]

// --- Figure -----------------------------------------------------------------

function box(w, h, d, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }))
  m.userData.base = m.material.color.clone()
  return m
}

// A blocky person, 1.7 m tall at scale 1, origin at the feet.
function makeFigure(look, rnd) {
  const g = new THREE.Group()
  const s = look.scale ?? 1
  const skin = pick(look.skin, rnd)
  const top = pick(look.top, rnd)
  const legs = pick(look.legs, rnd)
  const shoes = pick(look.shoes, rnd)
  const hair = pick(look.hair, rnd)

  const parts = {}
  const add = (name, mesh, x, y, z) => { mesh.position.set(x, y, z); g.add(mesh); parts[name] = mesh }

  add('legL', box(0.17, 0.78, 0.2, legs), -0.11, 0.39, 0)
  add('legR', box(0.17, 0.78, 0.2, legs), 0.11, 0.39, 0)
  add('shoeL', box(0.18, 0.1, 0.28, shoes), -0.11, 0.05, 0.03)
  add('shoeR', box(0.18, 0.1, 0.28, shoes), 0.11, 0.05, 0.03)
  add('torso', box(0.46, 0.62, 0.26, top), 0, 1.09, 0)
  add('armL', box(0.12, 0.6, 0.14, top), -0.3, 1.08, 0)
  add('armR', box(0.12, 0.6, 0.14, top), 0.3, 1.08, 0)
  add('handL', box(0.11, 0.1, 0.12, skin), -0.3, 0.74, 0)
  add('handR', box(0.11, 0.1, 0.12, skin), 0.3, 0.74, 0)
  add('head', box(0.3, 0.32, 0.3, skin), 0, 1.58, 0)
  add('hair', box(0.32, 0.12, 0.32, hair), 0, 1.76, -0.01)

  if (look.stripes) {
    // Referee shirt: horizontal black bands over the white torso.
    for (let i = 0; i < 4; i++) {
      add('stripe' + i, box(0.47, 0.07, 0.27, look.stripes), 0, 0.84 + i * 0.16, 0)
    }
  }
  if (look.badge) add('badge', box(0.06, 0.07, 0.02, look.badge), 0.12, 1.28, 0.14)
  if (look.bag) add('bag', box(0.3, 0.34, 0.14, pick(look.bag, rnd)), -0.36, 0.55, 0.02)

  // Pivot arms and legs from their tops so they can swing.
  for (const k of ['legL', 'legR', 'armL', 'armR']) {
    const m = parts[k]
    m.geometry.translate(0, -m.geometry.parameters.height / 2, 0)
    m.position.y += m.geometry.parameters.height / 2
  }
  parts.shoeL.geometry.translate(0, 0, 0); parts.shoeR.geometry.translate(0, 0, 0)

  g.scale.setScalar(s)
  g.userData.parts = parts
  return g
}

// --- Corridor graph ---------------------------------------------------------
//
// Corridors are axis-aligned rects that overlap where they meet. Nodes are
// each corridor's centre plus the centre of every overlap; edges join the
// nodes of a corridor. Walkers move along one corridor axis at a time, so a
// path of nodes is always walkable.

function buildNav(corridors) {
  const rects = corridors.map((c) => ({ ...c.rect, id: c.id, wide: c.rect.x1 - c.rect.x0 > c.rect.z1 - c.rect.z0 }))
  const nodes = []
  const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1
  const addNode = (x, z, owners) => { nodes.push({ x, z, owners, adj: new Set() }); return nodes.length - 1 }

  const byRect = rects.map(() => [])
  rects.forEach((r, i) => {
    const n = addNode((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, [i])
    byRect[i].push(n)
  })
  // Corridors that meet usually abut rather than overlap — the wing ends on
  // the exact line where the concourse begins — so a junction is any pair
  // whose gap is under half a metre on one axis and which share at least a
  // metre on the other. The node sits at the centre of the shared span, on
  // the line where they meet.
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j]
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
      const oz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0)
      if (ox < -0.5 || oz < -0.5) continue
      if (ox < 1 && oz < 1) continue
      const x0 = Math.max(a.x0, b.x0), x1 = Math.min(a.x1, b.x1)
      const z0 = Math.max(a.z0, b.z0), z1 = Math.min(a.z1, b.z1)
      const n = addNode((x0 + x1) / 2, (z0 + z1) / 2, [i, j])
      byRect[i].push(n); byRect[j].push(n)
    }
  }
  // Within a corridor, connect nodes in order along its axis.
  byRect.forEach((list, i) => {
    const r = rects[i]
    const sorted = [...list].sort((p, q) => (r.wide ? nodes[p].x - nodes[q].x : nodes[p].z - nodes[q].z))
    for (let k = 0; k + 1 < sorted.length; k++) {
      nodes[sorted[k]].adj.add(sorted[k + 1]); nodes[sorted[k + 1]].adj.add(sorted[k])
    }
  })
  const edges = nodes.reduce((n, v) => n + v.adj.size, 0) / 2
  console.info(`nav: ${nodes.length} nodes, ${edges} edges`)
  return { rects, nodes, inRect }
}

function bfs(nav, from, to) {
  const prev = new Map([[from, -1]])
  const q = [from]
  while (q.length) {
    const n = q.shift()
    if (n === to) break
    for (const m of nav.nodes[n].adj) if (!prev.has(m)) { prev.set(m, n); q.push(m) }
  }
  if (!prev.has(to)) return null
  const path = []
  for (let n = to; n !== -1; n = prev.get(n)) path.push(n)
  return path.reverse()
}

// --- Crowd --------------------------------------------------------------------

export class Crowd {
  constructor({ scene, corridors, light, fixed = [], count = 26, seed = 11, avoid = () => false }) {
    this.scene = scene
    this.light = light
    this.nav = buildNav(corridors)
    this.avoid = avoid
    this.npcs = []
    this.tmp = [0, 0, 0]

    let s = seed
    this.rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

    const roles = ['walker', 'walker', 'walker', 'shopper', 'shopper', 'teen', 'teen', 'kid', 'guard']
    for (let i = 0; i < count; i++) this.spawnWalker(roles[i % roles.length])
    for (const f of fixed) this.spawnFixed(f)
  }

  // A lane point beside a node: off the centre line, inside the corridor.
  lanePoint(node, lane) {
    const n = this.nav.nodes[node]
    const r = this.nav.rects[n.owners[0]]
    const half = (r.wide ? r.z1 - r.z0 : r.x1 - r.x0) / 2 - 1.2
    const l = Math.max(-half, Math.min(half, lane))
    return r.wide ? { x: n.x, z: n.z + l } : { x: n.x + l, z: n.z }
  }

  spawnWalker(role) {
    const look = LOOKS[role]
    const fig = makeFigure(look, this.rnd)
    // Try a few spots until one is clear of kiosks, planters and the carousel.
    let node = 0, spot = null
    for (let i = 0; i < 24 && !spot; i++) {
      node = Math.floor(this.rnd() * this.nav.nodes.length)
      const lane = (this.rnd() < 0.5 ? -1 : 1) * (2.0 + this.rnd() * 2.2)
      const c = this.lanePoint(node, lane)
      if (!this.avoid(c.x, c.z)) spot = c
    }
    if (!spot) spot = this.nav.nodes[node]
    const npc = {
      role, look, fig, name: pick(look.name, this.rnd),
      x: spot.x, z: spot.z, yaw: 0, phase: this.rnd() * 6.28,
      speed: look.speed[0] + this.rnd() * (look.speed[1] - look.speed[0]),
      node, path: [], lane: 0, pause: this.rnd() * 2, stuck: 0,
    }
    fig.position.set(npc.x, 0, npc.z)
    this.scene.add(fig)
    this.npcs.push(npc)
    this.retarget(npc)
  }

  spawnFixed({ role, x, z, yaw = 0 }) {
    const look = LOOKS[role]
    const fig = makeFigure(look, this.rnd)
    const npc = { role, look, fig, name: pick(look.name, this.rnd), x, z, yaw, phase: 0, speed: 0, fixed: true, pause: 0 }
    fig.position.set(x, 0, z)
    fig.rotation.y = yaw
    this.scene.add(fig)
    this.npcs.push(npc)
  }

  retarget(npc) {
    const to = Math.floor(this.rnd() * this.nav.nodes.length)
    npc.path = bfs(this.nav, npc.node, to) ?? [npc.node]
    npc.path.shift()
    // Keep to a lane off the centre line, where the kiosks and planters are.
    npc.lane = (this.rnd() < 0.5 ? -1 : 1) * (2.0 + this.rnd() * 2.2)
  }

  // Where this walker is trying to stand next: the next node, offset into its
  // lane across the corridor it is currently walking along.
  goal(npc) {
    const next = this.nav.nodes[npc.path[0]]
    const cur = this.nav.nodes[npc.node]
    const shared = next.owners.find((o) => cur.owners.includes(o))
    const r = this.nav.rects[shared ?? next.owners[0]]
    const half = (r.wide ? r.z1 - r.z0 : r.x1 - r.x0) / 2 - 1.2
    const lane = Math.max(-half, Math.min(half, npc.lane))
    return r.wide ? { x: next.x, z: next.z + lane } : { x: next.x + lane, z: next.z }
  }

  update(dt, player) {
    for (const npc of this.npcs) {
      if (!npc.fixed) this.walk(npc, dt, player)
      this.animate(npc, dt)
      this.shade(npc)
    }
  }

  walk(npc, dt, player) {
    if (npc.pause > 0) { npc.pause -= dt; npc.moving = false; return }
    if (!npc.path.length) {
      npc.pause = this.rnd() < 0.35 ? 0.6 + this.rnd() * 2.4 : 0
      this.retarget(npc)
      return
    }

    const g = this.goal(npc)
    const dx = g.x - npc.x, dz = g.z - npc.z
    const d = Math.hypot(dx, dz)
    if (d < 0.35) { npc.node = npc.path.shift(); return }

    // Don't walk through the player; stop and wait.
    const pd = Math.hypot(player.x - npc.x, player.z - npc.z)
    const ahead = ((player.x - npc.x) * dx + (player.z - npc.z) * dz) / (d || 1)
    if (pd < 1.1 && ahead > 0) { npc.moving = false; return }

    const step = Math.min(d, npc.speed * dt)
    let nx = npc.x + (dx / d) * step
    let nz = npc.z + (dz / d) * step
    if (this.avoid(nx, nz)) {
      // Sidestep around whatever it is; flip lanes so the next leg avoids it.
      const px = -dz / d, pz = dx / d
      const side = npc.lane >= 0 ? -1 : 1
      const sx = npc.x + px * side * step * 1.5
      const sz = npc.z + pz * side * step * 1.5
      if (!this.avoid(sx, sz)) { nx = sx; nz = sz }
      else {
        npc.stuck += dt
        if (npc.stuck > 1.2) {
          npc.stuck = 0
          npc.lane = -Math.sign(npc.lane || 1) * (2.0 + this.rnd() * 2.2)
          const c = this.lanePoint(npc.node, npc.lane)
          if (!this.avoid(c.x, c.z)) { npc.x = c.x; npc.z = c.z }
          this.retarget(npc)
        }
        npc.moving = false
        return
      }
      npc.lane = -Math.sign(npc.lane || 1) * Math.abs(npc.lane)
    }
    npc.stuck = 0
    npc.x = nx; npc.z = nz
    npc.yaw = Math.atan2(dx, dz)
    npc.moving = true
  }

  animate(npc, dt) {
    const p = npc.fig.userData.parts
    if (npc.moving) npc.phase += dt * npc.speed * 4.2
    const sw = npc.moving ? Math.sin(npc.phase) * 0.55 : 0
    p.legL.rotation.x = sw; p.legR.rotation.x = -sw
    p.armL.rotation.x = -sw * 0.7; p.armR.rotation.x = sw * 0.7
    p.shoeL.position.z = 0.03 + Math.sin(npc.phase) * 0.12 * (npc.moving ? 1 : 0)
    p.shoeR.position.z = 0.03 - Math.sin(npc.phase) * 0.12 * (npc.moving ? 1 : 0)
    p.shoeL.position.y = 0.05 + Math.max(0, Math.sin(npc.phase)) * 0.06 * (npc.moving ? 1 : 0)
    p.shoeR.position.y = 0.05 + Math.max(0, -Math.sin(npc.phase)) * 0.06 * (npc.moving ? 1 : 0)
    npc.fig.position.set(npc.x, npc.moving ? Math.abs(Math.sin(npc.phase)) * 0.025 : 0, npc.z)
    // Turn smoothly toward the direction of travel.
    let dy = npc.yaw - npc.fig.rotation.y
    dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    npc.fig.rotation.y += dy * Math.min(1, dt * 8)
  }

  // Same baked light as the building, sampled at chest height.
  shade(npc) {
    if (!this.light) return
    const l = this.light.sample(npc.x, 1.2, npc.z, this.tmp)
    const k = Math.min(1.25, (l[0] + l[1] + l[2]) / 3)
    for (const m of Object.values(npc.fig.userData.parts)) {
      m.material.color.copy(m.userData.base).multiplyScalar(k)
    }
  }

  // The NPC the player is looking at, within reach — for the TALK prompt.
  facing(player, yaw, maxDist = 3.2) {
    let best = null, bestScore = 0.86
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw)
    for (const npc of this.npcs) {
      const dx = npc.x - player.x, dz = npc.z - player.z
      const d = Math.hypot(dx, dz)
      if (d > maxDist || d < 0.2) continue
      const dot = (dx * fx + dz * fz) / d
      if (dot > bestScore) { bestScore = dot; best = npc }
    }
    return best
  }

  talk(npc) {
    // Face the player and stop for a moment.
    npc.pause = Math.max(npc.pause, 4)
    return { name: npc.name, line: pick(npc.look.lines, this.rnd) }
  }
}
