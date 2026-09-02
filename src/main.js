import * as THREE from 'three'

import { VoxelWorld } from './engine/VoxelWorld.js'
import { Brush } from './engine/Brush.js'
import { meshChunk } from './engine/greedyMesher.js'
import { palette, SKY_HEX } from './engine/palette.js'
import { VOXEL } from './game/config.js'
import { buildMall } from './game/buildMall.js'
import { Player, Input } from './game/Player.js'
import { MergedInput, TouchControls, isTouchDevice } from './game/TouchControls.js'
import { ANCHORS, BAYS, CORRIDORS, KIOSKS, RESTROOMS, SPAWN } from './game/plan.js'

// --- Scene ----------------------------------------------------------------

const canvas = document.getElementById('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
const TOUCH = isTouchDevice()
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2))
renderer.setSize(innerWidth, innerHeight)

const scene = new THREE.Scene()
scene.background = new THREE.Color(SKY_HEX)
scene.fog = new THREE.Fog(SKY_HEX, 90, 320)

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 900)

// Parking lot / site.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(1400, 1200),
  new THREE.MeshBasicMaterial({ color: 0x4b4a4e })
)
ground.rotation.x = -Math.PI / 2
ground.position.set(160, -0.5, 150)
scene.add(ground)

// --- Build ----------------------------------------------------------------

const world = new VoxelWorld()
const brush = new Brush(world, VOXEL)

const loading = document.getElementById('loading')
const startBtn = document.getElementById('start')
const overlay = document.getElementById('overlay')

requestAnimationFrame(() => {
  const t0 = performance.now()
  const { signs } = buildMall(world, brush)
  const tBuild = performance.now() - t0

  const t1 = performance.now()
  const stats = meshWorld()
  const tMesh = performance.now() - t1

  signs.forEach(addSign)

  loading.textContent =
    `${stats.tris.toLocaleString()} triangles · ${stats.meshes} sectors · ` +
    `built in ${Math.round(tBuild)} ms, meshed in ${Math.round(tMesh)} ms`
  startBtn.disabled = false
})

// Chunks are merged into 3x3 sectors: enough meshes for useful frustum
// culling, few enough to keep draw calls sane.
function meshWorld() {
  const material = new THREE.MeshBasicMaterial({ vertexColors: true })
  const sectors = new Map()

  for (const chunk of world.chunks.values()) {
    const key = `${Math.floor(chunk.cx / 3)},${Math.floor(chunk.cz / 3)}`
    let out = sectors.get(key)
    if (!out) sectors.set(key, (out = { positions: [], colors: [], indices: [] }))
    meshChunk(world, chunk, palette, VOXEL, out)
  }

  let tris = 0
  let meshes = 0
  for (const out of sectors.values()) {
    if (!out.indices.length) continue
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(out.positions, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(out.colors, 3))
    g.setIndex(new THREE.Uint32BufferAttribute(out.indices, 1))
    g.computeBoundingSphere()
    scene.add(new THREE.Mesh(g, material))
    tris += out.indices.length / 3
    meshes++
  }
  return { tris, meshes }
}

// --- Storefront signage ---------------------------------------------------

function addSign(s) {
  const pad = 28
  const probe = document.createElement('canvas').getContext('2d')
  const font = `600 72px "Helvetica Neue", Helvetica, Arial, sans-serif`
  probe.font = font
  const tw = Math.ceil(probe.measureText(s.text).width)

  const canvas = document.createElement('canvas')
  canvas.width = tw + pad * 2
  canvas.height = 110
  const ctx = canvas.getContext('2d')
  ctx.font = font
  ctx.fillStyle = '#f4efe2'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(s.text, canvas.width / 2, canvas.height / 2 + 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.anisotropy = 4

  const ratio = canvas.width / canvas.height
  let h = 0.62
  let w = h * ratio
  if (w > s.width) { w = s.width; h = w / ratio }

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  )
  mesh.position.set(s.x, s.y, s.z)
  mesh.rotation.y = s.rotY
  scene.add(mesh)
}

// --- Where am I? ----------------------------------------------------------

const ZONES = [
  ...BAYS.map((b) => ({ ...b, label: b.name ?? 'For Lease', zone: `Space ${b.id}` })),
  ...ANCHORS.map((a) => ({ ...a.rect, label: a.name, zone: `Anchor ${a.id}` })),
  ...RESTROOMS.map((r) => ({ ...r.at, label: r.name, zone: r.id })),
  ...KIOSKS.map((k) => ({
    x0: k.at.x0 - 1.5, z0: k.at.z0 - 1.5, x1: k.at.x1 + 1.5, z1: k.at.z1 + 1.5,
    label: k.name, zone: `Kiosk ${k.id}`,
  })),
]
const CORRIDOR_ZONES = CORRIDORS.map((c) => ({
  ...c.rect,
  label: c.id === 'court' ? 'Center Court' : '',
  zone: {
    north: 'Sears Wing', main: 'Main Concourse', court: 'Center Court',
    'jcp-spur': 'JCPenney Wing', 'sw-pocket': 'West Pocket',
    'south-court': 'South Court', 'food-spur': 'Cafeteria Court',
    'se-recess': 'East Recess',
  }[c.id] ?? c.id,
}))

const inRect = (r, x, z) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1

function locate(x, z) {
  for (const r of ZONES) if (inRect(r, x, z)) return r
  for (const r of CORRIDOR_ZONES) if (inRect(r, x, z)) return r
  return { zone: 'River Oaks Centre', label: '' }
}

const readoutZone = document.getElementById('readout-zone')
const readoutStore = document.getElementById('readout-store')
let lastZone = ''

// --- Loop -----------------------------------------------------------------

const player = new Player(world, camera, SPAWN)
const keyboard = new Input(canvas)
const touch = TOUCH ? new TouchControls((dx, dy) => player.look(dx, dy)) : null
const input = new MergedInput(...(touch ? [keyboard, touch] : [keyboard]))

document.body.classList.toggle('touch', TOUCH)

// Touch devices have no pointer lock: tapping Start just drops you in, and a
// small Pause chip brings the overlay back.
let walking = false

function setWalking(on) {
  walking = on
  document.body.classList.toggle('playing', on)
  overlay.classList.toggle('hidden', on)
  if (!on) startBtn.textContent = 'Resume walking'
}

startBtn.addEventListener('click', () => {
  if (TOUCH) setWalking(true)
  else canvas.requestPointerLock()
})

if (TOUCH) {
  const pause = document.createElement('button')
  pause.id = 'btn-pause'
  pause.textContent = 'II'
  pause.addEventListener('pointerdown', (e) => { e.stopPropagation(); setWalking(false) })
  document.body.appendChild(pause)
} else {
  document.addEventListener('pointerlockchange', () => {
    setWalking(document.pointerLockElement === canvas)
  })
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) player.look(e.movementX, e.movementY)
  })
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

let last = performance.now()
renderer.setAnimationLoop(() => {
  const now = performance.now()
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  if (walking) player.update(dt, input)

  const here = locate(player.pos.x, player.pos.z)
  const key = here.zone + here.label
  if (key !== lastZone) {
    lastZone = key
    readoutZone.textContent = here.zone
    readoutStore.textContent = here.label
  }

  renderer.render(scene, camera)
})

// Handy while tuning the plan.
window.mall = { world, player, scene, locate }
