import * as THREE from 'three'

import { VoxelWorld } from './engine/VoxelWorld.js'
import { Brush } from './engine/Brush.js'
import { meshChunk } from './engine/greedyMesher.js'
import { LightGrid } from './engine/LightGrid.js'
import { C, palette, SKY_HEX } from './engine/palette.js'
import { VOXEL } from './game/config.js'
import { buildMall } from './game/buildMall.js'
import { Player, Input } from './game/Player.js'
import { MergedInput, TouchControls, isTouchDevice } from './game/TouchControls.js'
import { ANCHORS, BAYS, CORRIDORS, FOUNTAIN, KIOSKS, RESTROOMS, SPAWN } from './game/plan.js'
import { drawDirectory, markYouAreHere } from './game/directoryMap.js'
import { MallAudio } from './game/audio.js'
import { SEASON_LABEL } from './game/season.js'

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

document.querySelector('.eyebrow').textContent = `Decatur, Alabama \u00b7 ${SEASON_LABEL}`

requestAnimationFrame(() => {
  const t0 = performance.now()
  const { signs, boards } = buildMall(world, brush)
  const tBuild = performance.now() - t0

  const t1 = performance.now()
  const light = new LightGrid(world, {
    voxelSize: VOXEL,
    cell: 1.0,
    ambient: 0.24,
    emitters: {
      [C.ceilingLight]: [1.30, 1.22, 1.02],   // lit ceiling soffits
      [C.skylight]:     [1.15, 1.30, 1.55],   // daylight over the court
      [C.ceiling]:      [0.62, 0.59, 0.53],   // suspended ceilings, in and out
      [C.ceilingCove]:  [0.95, 0.90, 0.78],
      [C.signLight]:    [0.35, 0.33, 0.28],
    },
  }).build()
  const tLight = performance.now() - t1

  const t2 = performance.now()
  const stats = meshWorld(light)
  const tMesh = performance.now() - t2

  signs.forEach(addSign)
  boards.forEach(addDirectoryBoard)

  loading.textContent =
    `${stats.tris.toLocaleString()} triangles · ${stats.meshes} sectors · ` +
    `built ${Math.round(tBuild)} ms · lit ${Math.round(tLight)} ms · meshed ${Math.round(tMesh)} ms`
  startBtn.disabled = false
})

// Chunks are merged into 3x3 sectors: enough meshes for useful frustum
// culling, few enough to keep draw calls sane.
function meshWorld(light) {
  const material = new THREE.MeshBasicMaterial({ vertexColors: true })
  const sectors = new Map()

  for (const chunk of world.chunks.values()) {
    const key = `${Math.floor(chunk.cx / 3)},${Math.floor(chunk.cz / 3)}`
    let out = sectors.get(key)
    if (!out) sectors.set(key, (out = { positions: [], colors: [], indices: [] }))
    meshChunk(world, chunk, palette, VOXEL, out, { light, maxRun: 8 })
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
  ctx.fillStyle = s.ink ?? '#f4efe2'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(s.text, canvas.width / 2, canvas.height / 2 + 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.anisotropy = 4

  const ratio = canvas.width / canvas.height
  let h = s.blade ? 0.3 : 0.62
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

// --- You-are-here directories --------------------------------------------

function addDirectoryBoard(b) {
  const map = drawDirectory(3.1)
  markYouAreHere(map, b.x, b.z)

  const texture = new THREE.CanvasTexture(map.canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.anisotropy = 8

  const ratio = map.canvas.width / map.canvas.height
  let w = b.width
  let h = w / ratio
  if (h > b.height) { h = b.height; w = h * ratio }

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture })
  )
  const out = b.depth + 0.07
  mesh.position.set(b.x + Math.sin(b.rotY) * out, b.y, b.z + Math.cos(b.rotY) * out)
  mesh.rotation.y = b.rotY
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
let lastStep = 0

// --- Loop -----------------------------------------------------------------

const player = new Player(world, camera, SPAWN)
const keyboard = new Input(canvas)
const touch = TOUCH ? new TouchControls((dx, dy) => player.look(dx, dy)) : null
const input = new MergedInput(...(touch ? [keyboard, touch] : [keyboard]))

document.body.classList.toggle('touch', TOUCH)

// Pointer lock is a nice-to-have, not a requirement: it can be refused
// outright when the page is embedded in a sandboxed frame. So Start always
// drops you in, and looking falls back to click-and-drag.
let walking = false
let locked = false

function setWalking(on) {
  walking = on
  document.body.classList.toggle('playing', on)
  overlay.classList.toggle('hidden', on)
  if (!on) startBtn.textContent = 'Resume walking'
}

function setLocked(on) {
  locked = on
  document.body.classList.toggle('unlocked', !on)
}
setLocked(false)

const audio = new MallAudio()
const CAMELOT = BAYS.find((b) => b.id === 164)
const MUZAK_AT = [(CAMELOT.x0 + CAMELOT.x1) / 2, (CAMELOT.z0 + CAMELOT.z1) / 2]
const FOUNTAIN_AT = [FOUNTAIN.x, FOUNTAIN.z]

startBtn.addEventListener('click', () => {
  setWalking(true)
  audio.start()
  if (!TOUCH) canvas.requestPointerLock?.()
})

let muted = false
const muteBtn = document.createElement('button')
muteBtn.id = 'btn-mute'
muteBtn.textContent = 'SOUND'
muteBtn.title = 'Mute (M)'
const setMuted = (m) => {
  muted = m
  audio.setMuted(m)
  muteBtn.classList.toggle('off', m)
  muteBtn.textContent = m ? 'MUTED' : 'SOUND'
}
muteBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); setMuted(!muted) })
document.body.appendChild(muteBtn)
addEventListener('keydown', (e) => { if (e.code === 'KeyM') setMuted(!muted) })

const pause = document.createElement('button')
pause.id = 'btn-pause'
pause.textContent = 'II'
pause.title = 'Pause'
pause.addEventListener('pointerdown', (e) => { e.stopPropagation(); setWalking(false) })
document.body.appendChild(pause)

if (!TOUCH) {
  document.addEventListener('pointerlockchange', () => {
    const now = document.pointerLockElement === canvas
    if (locked && !now) setWalking(false)   // Esc out of a locked session
    setLocked(now)
  })

  let dragging = false
  canvas.addEventListener('mousedown', () => { if (walking && !locked) dragging = true })
  addEventListener('mouseup', () => { dragging = false })
  addEventListener('mousemove', (e) => {
    if (!walking || (!locked && !dragging)) return
    player.look(e.movementX, e.movementY)
  })
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && walking && !locked) setWalking(false)
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

  if (walking) {
    // Bigger rooms get a longer tail; a shop interior is nearly dry.
    const openness = here.zone === 'Center Court' ? 1
      : CORRIDOR_ZONES.includes(here) ? 0.55 : 0.15
    audio.update(player.pos.x, player.pos.z,
      { fountain: FOUNTAIN_AT, muzak: MUZAK_AT, openness })

    const phase = Math.floor((player.bob * 2) / Math.PI)
    if (phase !== lastStep && player.onGround) {
      lastStep = phase
      audio.step(!CORRIDOR_ZONES.includes(here))
    }
  }
  const key = here.zone + here.label
  if (key !== lastZone) {
    lastZone = key
    readoutZone.textContent = here.zone
    readoutStore.textContent = here.label
  }

  renderer.render(scene, camera)
})

// Handy while tuning the plan.
window.mall = { world, player, scene, locate, audio }
