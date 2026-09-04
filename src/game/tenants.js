// Storefront identity, per tenant.
//
// A 1996 mall concourse does not read as one repeated shopfront. KayBee put
// its loudest colour right at the lease line precisely because nobody came to
// the mall for KayBee; Camelot sat behind a dark display window; Sbarro's had
// no glazing at all, just a tiled counter. This table gives every space in the
// directory its own treatment, built from a small kit of closure types.
//
// Colours are voxel-art approximations chosen for recognition at a glance —
// there is no logo artwork anywhere in the build, only the tenant's name set
// in a plain face.

// --- Closure types --------------------------------------------------------
//
// glazing:
//   full     floor-to-head glass with a kick rail (most apparel)
//   window   solid bulkhead to `sill`, glass above (display-window tenants)
//   none     open frontage, no glass at all (toys, shoes, discount)
//   counter  service counter across the frontage at `sill` (food)
//   service  mostly solid wall with a door and one small window
//   papered  glazed but papered over from inside (vacant space)
export const STYLES = {
  glass:   { glazing: 'full' },
  window:  { glazing: 'window', sill: 0.95 },
  salon:   { glazing: 'window', sill: 1.15 },
  open:    { glazing: 'none', merch: true },
  counter: { glazing: 'counter', sill: 1.05 },
  service: { glazing: 'service' },
  vacant:  { glazing: 'papered', noSign: true, noBlade: true },
}

// --- Per-space treatment --------------------------------------------------
// [style, fascia colour, accent colour]
const T = {
  102: ['window',  'cardGreen',      'merchWarm'],      // Briarpatch
  104: ['window',  'jewelryNavy',    'jewelryGold'],    // Sabghi's
  110: ['glass',   'apparelNavy',    'athleticStripe'], // Athlete's Feet

  // Pocket Change was the arcade: black tile piers, an open front, and a dark
  // room lit only by its cabinets.
  124: ['open',    'musicBlack',     'electronicsRed',
        { arcade: true, pilaster: 'musicBlack', interior: 'arcadeCab',
          walls: 'arcadeCab' }],

  128: ['service', 'phoneBlue',      'chrome'],         // Police substation
  130: ['window',  'cardGreen',      'jewelryGold'],    // Card & Collectibles
  140: ['open',    'pizzaGreen',     'toyYellow'],      // Dollar Tree
  142: ['salon',   'salonMauve',     'counterTile'],    // MasterCuts
  144: ['window',  'cafeteriaMaroon','jewelryGold'],    // University Collectibles
  148: ['window',  'apparelPlum',    'merchWarm'],      // AcScents
  150: ['counter', 'cafeteriaMaroon','jewelryGold'],    // Bourbon Street Candy

  // RadioShack (one word since the 1995 logo): charcoal fascia, stone piers
  // with dark accent squares, and the red back wall you could see from across
  // the concourse.
  152: ['full',    'musicBlack',     'electronicsGrey',
        { interior: 'electronicsRed', pilaster: 'neutralPier', pierDots: 'musicBlack' }],

  // KayBee: blue fascia, red letters, confetti on the piers, sale banners
  // strung across the ceiling and stock stacked into the opening.
  154: ['open',    'toyBlue',        'toyRed',
        { pilaster: 'toyBlue', confetti: true, banners: true, interior: 'toyBlue' }],

  158: ['window',  'apparelPlum',    'jewelryGold'],    // Lane Bryant
  162: ['window',  'jewelryGold',    'musicBlack'],     // Lynn's Hallmark
  // Camelot's wordmark sat on a warm wood fascia, not a black one.
  164: ['window',  'woodFront',      'musicPurple', { interior: 'musicBlack' }],

  // Bath & Body Works: white shopfront under a hunter-green striped awning.
  166: ['glass',   'bathWhite',      'bathGreen',
        { stripes: ['bathGreen', 'bathWhite'], interior: 'bathWhite',
          pilaster: 'bathWhite' }],

  202: ['window',  'apparelTeal',    'electronicsGrey'],// Eyemaster
  208: ['counter', 'chickenRed',     'counterTile'],    // Great American Cookie
  212: ['window',  'nutritionNavy',  'nutritionGold'],  // General Nutrition
  214: ['glass',   'apparelNavy',    'athleticStripe'], // Hibbett

  // Claire's: white fascia with the purple wordmark, purple piers, a wide open
  // front and walls of accessories.
  220: ['open',    'bathWhite',      'clairePink',
        { pilaster: 'musicPurple', interior: 'clairePink', ink: '#5b3e8e' }],

  222: ['salon',   'salonMauve',     'jewelryGold'],    // Nail Studio
  304: ['service', 'apparelNavy',    'counterTile'],    // Superior Alterations
  310: ['open',    'bookGreen',      'merchWarm'],      // The Living Word
  318: ['window',  'jewelryNavy',    'jewelryGold'],    // Regency Jewelers
  402: ['window',  'musicBlack',     'jewelryGold'],    // Burch & Hatfield
  404: ['window',  'jewelryNavy',    'jewelryGold'],    // JayMark Jewelers
  412: ['service', 'utilityBlue',    'counterTile'],    // Sterling Travel

  // Foot Locker's 90s shopfront was a stepped wood gable, not a flat fascia,
  // with round shoe towers just inside. It moved into 416 by 2000.
  416: ['open',    'woodFront',      'athleticStripe',
        { gable: true, pilaster: 'woodFront', towers: true, interior: 'shoeWall' }],

  424: ['counter', 'chickenRed',     'counterTile'],    // Chick-fil-A
  426: ['window',  'musicPurple',    'toyYellow'],      // Disc Jockey
  430: ['salon',   'musicBlack',     'salonMauve'],     // Regis
  434: ['open',    'shoeOrange',     'apparelNavy'],    // Payless

  // Victoria's Secret: pink-and-white striped awning over a dark, framed
  // shopfront.
  436: ['window',  'vsPink',         'vsCream',
        { stripes: ['vsPink', 'vsCream'], interior: 'vsPink', sill: 0.8 }],

  438: ['open',    'apparelTeal',    'toyYellow'],      // Exper-tees
  440: ['counter', 'pizzaRed',       'jewelryGold'],    // Chongwah Express
  442: ['window',  'cafeteriaMaroon','counterTrim'],    // Morrison's

  // Revco became CVS in the 1997 buyout. The "CVS/pharmacy" identity was a
  // red awning with white lettering over wide glass.
  450: ['glass',   'cvsRed',         'shelfWhite',
        { interior: 'shelfWhite', awning: true }],

  454: ['counter', 'accessoryPink',  'counterTile'],    // Snack Express
  455: ['glass',   'shoeOrange',     'apparelNavy'],    // Footquarters
  456: ['window',  'jewelryNavy',    'jewelryGold'],    // Marks & Morgan
  460: ['window',  'apparelPlum',    'merchWarm'],      // Judy's Place

  // Sbarro's red barrel awning over the servery.
  464: ['counter', 'pizzaRed',       'pizzaGreen', { awning: true }],

  470: ['glass',   'apparelNavy',    'accessoryPink'],  // Lerner
  472: ['glass',   'accessoryPink',  'jewelryGold'],    // Afterthoughts
  474: ['salon',   'salonMauve',     'counterTile'],    // Expressions
  478: ['service', 'utilityBlue',    'nutritionGold'],  // Joe Wheeler Electric
  480: ['service', 'libraryBrick',   'bookGreen'],      // Decatur Public Library
  484: ['open',    'shoeOrange',     'counterTile'],    // The Shoe Department
  488: ['window',  'salonMauve',     'jewelryGold'],    // Merle Norman
}

const VACANT = ['vacant', 'neutralPier', 'papered', undefined]

export function storefront(bay) {
  const [style, fascia, accent, opts] = T[bay.id] ?? VACANT
  return { ...STYLES[style], name: style, fascia, accent, ...opts }
}

// Anchor entrance signage: each chain's own wordmark treatment, from their
// logos of the period — Castner Knott's navy serif caps, Parisian's black
// serif, the JCPenney and Sears sans wordmarks.
export const ANCHOR_SIGNS = {
  100: { fascia: 'searsBlue',   ink: '#f6f2e8', serif: false, text: 'SEARS' },
  200: { fascia: 'jewelryNavy', ink: '#f6f2e8', serif: true,  text: 'CASTNER KNOTT' },
  300: { fascia: 'musicBlack',  ink: '#f6f2e8', serif: false, text: 'JCPenney' },
  400: { fascia: 'jewelryNavy', ink: '#f6f2e8', serif: true,  text: 'CASTNER KNOTT' },
  500: { fascia: 'musicBlack',  ink: '#f6f2e8', serif: true,  text: 'Parisian' },
}

// Fascias this dark want light lettering; the pale ones want dark.
const DARK_FASCIAS = new Set([
  'musicBlack', 'jewelryNavy', 'apparelNavy', 'nutritionNavy', 'cafeteriaMaroon',
  'bankGreen', 'bookGreen', 'cardGreen', 'apparelPlum', 'musicPurple',
  'utilityBlue', 'drugBlue', 'pizzaGreen', 'pizzaRed', 'toyRed', 'toyBlue',
  'chickenRed', 'electronicsRed', 'apparelTeal', 'libraryBrick', 'shoeOrange',
  'athleticStripe', 'salonMauve', 'clairePink', 'cvsRed', 'vsPink', 'phoneBlue',
  'bathGreen',
])

export const signInk = (fascia) => (DARK_FASCIAS.has(fascia) ? '#f6f2e8' : '#1d1a17')
