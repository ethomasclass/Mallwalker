// Touch controls for phones and tablets.
//
// Left half of the screen is a floating stick that appears wherever you put
// your thumb down; right half is a look pad. Both track pointerId, so walking
// and looking work at the same time. Exposes the same shape as the keyboard
// Input class, so Player doesn't need to know which one it's reading.

const STICK_RADIUS = 58

export class TouchControls {
  constructor(onLook) {
    this.onLook = onLook
    this.vec = { x: 0, y: 0 }
    this.running = false
    this.jumping = false
    this.move = null   // { id, ox, oy }
    this.look = null   // { id, x, y }

    this.root = document.createElement('div')
    this.root.id = 'touch'
    this.root.innerHTML = `
      <div id="stick"><div id="stick-knob"></div></div>
      <button id="btn-run" type="button">RUN</button>
      <button id="btn-jump" type="button">HOP</button>
    `
    document.body.appendChild(this.root)

    this.stick = this.root.querySelector('#stick')
    this.knob = this.root.querySelector('#stick-knob')

    const run = this.root.querySelector('#btn-run')
    run.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      this.running = !this.running
      run.classList.toggle('on', this.running)
    })

    const jump = this.root.querySelector('#btn-jump')
    jump.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      this.jumping = true
      setTimeout(() => { this.jumping = false }, 120)
    })

    addEventListener('pointerdown', (e) => this.down(e), { passive: false })
    addEventListener('pointermove', (e) => this.moveEvt(e), { passive: false })
    addEventListener('pointerup', (e) => this.up(e))
    addEventListener('pointercancel', (e) => this.up(e))
  }

  down(e) {
    if (e.pointerType === 'mouse') return
    if (e.target.closest('button')) return
    if (e.clientX < innerWidth * 0.45) {
      if (this.move) return
      this.move = { id: e.pointerId, ox: e.clientX, oy: e.clientY }
      this.stick.style.left = `${e.clientX}px`
      this.stick.style.top = `${e.clientY}px`
      this.stick.classList.add('on')
      this.setKnob(0, 0)
    } else if (!this.look) {
      this.look = { id: e.pointerId, x: e.clientX, y: e.clientY }
    }
  }

  moveEvt(e) {
    if (this.move && e.pointerId === this.move.id) {
      let dx = e.clientX - this.move.ox
      let dy = e.clientY - this.move.oy
      const len = Math.hypot(dx, dy)
      if (len > STICK_RADIUS) { dx *= STICK_RADIUS / len; dy *= STICK_RADIUS / len }
      this.setKnob(dx, dy)
      this.vec.x = dx / STICK_RADIUS
      this.vec.y = dy / STICK_RADIUS
      e.preventDefault()
    } else if (this.look && e.pointerId === this.look.id) {
      this.onLook((e.clientX - this.look.x) * 1.7, (e.clientY - this.look.y) * 1.7)
      this.look.x = e.clientX
      this.look.y = e.clientY
      e.preventDefault()
    }
  }

  up(e) {
    if (this.move && e.pointerId === this.move.id) {
      this.move = null
      this.vec.x = this.vec.y = 0
      this.stick.classList.remove('on')
      this.setKnob(0, 0)
    }
    if (this.look && e.pointerId === this.look.id) this.look = null
  }

  setKnob(dx, dy) {
    this.knob.style.transform = `translate(${dx - 22}px, ${dy - 22}px)`
  }

  // --- Input interface ---
  get forward() { return -this.vec.y }
  get strafe() { return this.vec.x }
  get run() { return this.running }
  get jump() { return this.jumping }
}

// Reads whichever control surface is actually being used this frame.
export class MergedInput {
  constructor(...sources) { this.sources = sources }
  sum(prop) {
    let v = 0
    for (const s of this.sources) v += s[prop] || 0
    return Math.max(-1, Math.min(1, v))
  }
  any(prop) { return this.sources.some((s) => s[prop]) }
  get forward() { return this.sum('forward') }
  get strafe() { return this.sum('strafe') }
  get run() { return this.any('run') }
  get jump() { return this.any('jump') }
}

export const isTouchDevice = () =>
  matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
