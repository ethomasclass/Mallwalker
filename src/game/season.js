// Which calendar the mall is running. Read once, from ?season=.
import { SEASONS } from './plan.js'

// Guarded so the headless build tools (leaktest, shoot) can import the world
// without a DOM.
const asked = typeof location === 'undefined'
  ? null
  : new URLSearchParams(location.search).get('season')
export const SEASON = SEASONS.includes(asked) ? asked : 'summer'

export const SEASON_LABEL = {
  summer: 'July 2000',
  backToSchool: 'August 2000',
  christmas: 'December 2000',
}[SEASON]
