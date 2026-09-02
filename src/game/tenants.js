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
  124: ['open',    'toyBlue',        'toyYellow'],      // Pocket Change
  130: ['window',  'cardGreen',      'jewelryGold'],    // Card & Collectible Empire
  142: ['salon',   'salonMauve',     'counterTile'],    // MasterCuts
  144: ['window',  'cafeteriaMaroon','jewelryGold'],    // University Collectibles
  148: ['open',    'accessoryPink',  'toyYellow'],      // Kid's Avenue
  150: ['window',  'apparelTeal',    'electronicsGrey'],// Van's Photo
  152: ['window',  'electronicsRed', 'electronicsGrey'],// Radio Shack
  154: ['open',    'toyRed',         'toyYellow'],      // KayBee Toys
  158: ['glass',   'apparelPlum',    'jewelryGold'],    // Lane Bryant
  162: ['window',  'jewelryGold',    'musicBlack'],     // Lynn's Hallmark
  164: ['window',  'musicBlack',     'musicPurple'],    // Camelot Music
  166: ['glass',   'bookGreen',      'counterTile'],    // Bath & Body Works
  202: ['window',  'apparelTeal',    'electronicsGrey'],// Eyemasters
  208: ['counter', 'chickenRed',     'counterTile'],    // Great American Cookie
  212: ['window',  'nutritionNavy',  'nutritionGold'],  // General Nutrition
  214: ['glass',   'apparelNavy',    'athleticStripe'], // Hibbett
  220: ['glass',   'accessoryPink',  'jewelryGold'],    // Claire's Boutique
  222: ['salon',   'salonMauve',     'jewelryGold'],    // Nail Studio
  304: ['service', 'apparelNavy',    'counterTile'],    // Superior Alterations
  310: ['open',    'bookGreen',      'merchWarm'],      // The Living World
  320: ['open',    'pizzaGreen',     'toyYellow'],      // Dollar Tree
  402: ['window',  'musicBlack',     'jewelryGold'],    // Burch & Hatfield
  404: ['window',  'jewelryNavy',    'jewelryGold'],    // JayMark Jewelers
  408: ['counter', 'cafeteriaMaroon','counterTrim'],    // Platters
  412: ['service', 'utilityBlue',    'counterTile'],    // Sterling Travel
  416: ['glass',   'bookGreen',      'merchWarm'],      // Bookland
  424: ['counter', 'chickenRed',     'counterTile'],    // Chick-fil-A
  426: ['window',  'musicPurple',    'toyYellow'],      // Disc Jockey
  430: ['salon',   'musicBlack',     'salonMauve'],     // Regis
  434: ['open',    'shoeOrange',     'apparelNavy'],    // Payless
  438: ['open',    'apparelTeal',    'toyYellow'],      // Exper-tees
  440: ['counter', 'pizzaRed',       'jewelryGold'],    // Chongwah Express
  442: ['window',  'cafeteriaMaroon','counterTrim'],    // Morrison's Cafeteria
  444: ['service', 'bankGreen',      'jewelryGold'],    // AmSouth Bank
  450: ['glass',   'drugBlue',       'electronicsGrey'],// Revco
  452: ['service', 'shoeOrange',     'counterTile'],    // Heel Quick!
  454: ['counter', 'accessoryPink',  'counterTile'],    // Love Tucky's Yogurt
  455: ['glass',   'shoeOrange',     'apparelNavy'],    // Footquarters
  456: ['window',  'jewelryNavy',    'jewelryGold'],    // Friedman's Jewelry
  460: ['window',  'apparelPlum',    'merchWarm'],      // Judy's Place
  462: ['open',    'athleticStripe', 'electronicsGrey'],// Footlocker
  464: ['counter', 'pizzaRed',       'pizzaGreen'],     // Sbarro's Pizza
  470: ['glass',   'apparelNavy',    'accessoryPink'],  // Lerner
  472: ['glass',   'accessoryPink',  'jewelryGold'],    // Afterthoughts
  474: ['salon',   'salonMauve',     'counterTile'],    // Expressions
  478: ['service', 'utilityBlue',    'nutritionGold'],  // Joe Wheeler Electric
  480: ['service', 'libraryBrick',   'bookGreen'],      // Decatur Public Library
  484: ['open',    'shoeOrange',     'counterTile'],    // The Shoe Department
  488: ['window',  'salonMauve',     'jewelryGold'],    // Merle Norman
}

const VACANT = ['vacant', 'neutralPier', 'papered']

export function storefront(bay) {
  const [style, fascia, accent] = T[bay.id] ?? VACANT
  return { ...STYLES[style], name: style, fascia, accent }
}

// Fascias this dark want light lettering; the pale ones want dark.
const DARK_FASCIAS = new Set([
  'musicBlack', 'jewelryNavy', 'apparelNavy', 'nutritionNavy', 'cafeteriaMaroon',
  'bankGreen', 'bookGreen', 'cardGreen', 'apparelPlum', 'musicPurple',
  'utilityBlue', 'drugBlue', 'pizzaGreen', 'pizzaRed', 'toyRed', 'toyBlue',
  'chickenRed', 'electronicsRed', 'apparelTeal', 'libraryBrick', 'shoeOrange',
  'athleticStripe', 'salonMauve',
])

export const signInk = (fascia) => (DARK_FASCIAS.has(fascia) ? '#f6f2e8' : '#1d1a17')
