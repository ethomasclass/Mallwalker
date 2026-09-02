// What the daylight is doing outside.
//
// The mall has no windows except its entrance doors and the court skylight, so
// the time of day reads almost entirely as how much light spills in through
// those two openings. Pick with ?time=.

const PRESETS = {
  morning: {
    label: '10 a.m.',
    sky: 0xB3CFE0,
    fog: [110, 340],
    entrance: [1.55, 1.62, 1.70],
    skylight: [1.10, 1.24, 1.48],
  },
  midday: {
    label: '1 p.m.',
    sky: 0x9CC4DA,
    fog: [90, 320],
    entrance: [1.75, 1.80, 1.85],
    skylight: [1.15, 1.30, 1.55],
  },
  evening: {
    label: '7 p.m.',
    sky: 0xC58A5C,
    fog: [80, 260],
    entrance: [1.55, 1.05, 0.62],
    skylight: [0.92, 0.72, 0.55],
  },
  night: {
    label: '9 p.m.',
    sky: 0x141A26,
    fog: [70, 210],
    entrance: [0.16, 0.19, 0.30],
    skylight: [0.10, 0.12, 0.20],
  },
}

export const TIMES = Object.keys(PRESETS)

const asked = typeof location === 'undefined'
  ? null
  : new URLSearchParams(location.search).get('time')

export const TIME = TIMES.includes(asked) ? asked : 'midday'
export const LIGHT = PRESETS[TIME]
