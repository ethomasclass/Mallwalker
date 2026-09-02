// Everything you hear is synthesised at runtime — no audio files, so the whole
// mall still ships as one self-contained page.
//
// Four layers, which together are most of what an empty mall actually sounds
// like: an HVAC bed that never stops, the fountain when you're near it, muzak
// leaking out of the record shop, and your own footsteps in a room whose
// reverb changes as the ceiling opens up.

const noiseBuffer = (ctx, seconds, brown) => {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * white) / 1.02
      d[i] = last * 3.5
    } else {
      d[i] = white
    }
  }
  return buf
}

// A plausible room: exponentially decaying noise, slightly darker over time.
const impulse = (ctx, seconds, decay) => {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay
    }
  }
  return buf
}

const loop = (ctx, buffer, dest, gain) => {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const g = ctx.createGain()
  g.gain.value = gain
  src.connect(g).connect(dest)
  src.start()
  return g
}

export class MallAudio {
  constructor() {
    this.ctx = null
    this.ready = false
  }

  // Must be called from a user gesture.
  start() {
    if (this.ctx) { this.ctx.resume(); return }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = (this.ctx = new Ctx())

    this.out = ctx.createGain()
    this.out.gain.value = 0.9
    this.out.connect(ctx.destination)

    // Dry path plus a convolved path; the wet send rises in the big rooms.
    this.dry = ctx.createGain()
    this.dry.connect(this.out)
    this.wet = ctx.createGain()
    this.wet.gain.value = 0.18
    const verb = ctx.createConvolver()
    verb.buffer = impulse(ctx, 2.6, 2.6)
    this.wet.connect(verb).connect(this.out)

    const bus = (node) => { node.connect(this.dry); node.connect(this.wet); return node }

    const brown = noiseBuffer(ctx, 4, true)
    const white = noiseBuffer(ctx, 4, false)

    // --- HVAC bed: the sound of a building being kept at 72 degrees.
    const hvacFilter = ctx.createBiquadFilter()
    hvacFilter.type = 'lowpass'
    hvacFilter.frequency.value = 230
    hvacFilter.Q.value = 0.6
    bus(hvacFilter)
    loop(ctx, brown, hvacFilter, 0.85)

    const airFilter = ctx.createBiquadFilter()
    airFilter.type = 'bandpass'
    airFilter.frequency.value = 900
    airFilter.Q.value = 0.4
    bus(airFilter)
    loop(ctx, white, airFilter, 0.012)

    // --- Fountain: bright, splashy, and strictly local.
    const fFilter = ctx.createBiquadFilter()
    fFilter.type = 'bandpass'
    fFilter.frequency.value = 2400
    fFilter.Q.value = 0.7
    this.fountain = ctx.createGain()
    this.fountain.gain.value = 0
    fFilter.connect(this.fountain)
    bus(this.fountain)
    loop(ctx, white, fFilter, 0.5)

    // --- Muzak bleeding out of Camelot Music, heavily muffled by the wall.
    this.muzak = ctx.createGain()
    this.muzak.gain.value = 0
    const muzakFilter = ctx.createBiquadFilter()
    muzakFilter.type = 'lowpass'
    muzakFilter.frequency.value = 620
    muzakFilter.Q.value = 0.5
    muzakFilter.connect(this.muzak)
    bus(this.muzak)
    this.startMuzak(muzakFilter)

    // --- Footsteps.
    this.stepBus = ctx.createGain()
    this.stepBus.gain.value = 1
    bus(this.stepBus)
    this.stepNoise = white

    this.ready = true
  }

  // A slow, harmless chord loop. Deliberately generic: it is what you would
  // half-hear through a storefront, not a song.
  startMuzak(dest) {
    const ctx = this.ctx
    const chords = [
      [220.0, 277.2, 329.6],   // A major
      [196.0, 246.9, 293.7],   // G major
      [174.6, 220.0, 261.6],   // F major
      [196.0, 246.9, 329.6],   // G6
    ]
    const bar = 4.0
    const mix = ctx.createGain()
    mix.gain.value = 0.09
    mix.connect(dest)

    const play = (freqs, at) => {
      for (const f of freqs) {
        const o = ctx.createOscillator()
        o.type = 'triangle'
        o.frequency.value = f
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, at)
        g.gain.linearRampToValueAtTime(0.33, at + 0.5)
        g.gain.setValueAtTime(0.33, at + bar - 0.9)
        g.gain.linearRampToValueAtTime(0, at + bar - 0.05)
        o.connect(g).connect(mix)
        o.start(at)
        o.stop(at + bar)
      }
    }

    let i = 0
    let next = ctx.currentTime + 0.4
    const schedule = () => {
      while (next < ctx.currentTime + 8) {
        play(chords[i++ % chords.length], next)
        next += bar
      }
    }
    schedule()
    this.muzakTimer = setInterval(schedule, 2000)
  }

  step(hard) {
    if (!this.ready) return
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.stepNoise
    src.playbackRate.value = 0.8 + Math.random() * 0.4
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = hard ? 1900 : 900
    f.Q.value = 1.4
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(hard ? 0.16 : 0.09, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13)
    src.connect(f).connect(g).connect(this.stepBus)
    src.start(t, Math.random() * 3)
    src.stop(t + 0.15)
  }

  // Called every frame with the listener's position and how open the space is.
  update(x, z, { fountain, muzak, openness }) {
    if (!this.ready) return
    const at = this.ctx.currentTime
    const near = (p, radius) => {
      const d = Math.hypot(x - p[0], z - p[1])
      return Math.max(0, 1 - d / radius) ** 1.7
    }
    this.fountain.gain.setTargetAtTime(near(fountain, 26) * 0.5, at, 0.15)
    this.muzak.gain.setTargetAtTime(near(muzak, 22) * 0.85, at, 0.2)
    this.wet.gain.setTargetAtTime(0.10 + openness * 0.30, at, 0.4)
  }

  setMuted(muted) {
    if (!this.ready) return
    this.out.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.05)
  }
}
