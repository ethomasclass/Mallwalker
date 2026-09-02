// Palette for River Oaks Centre, c. 1996.
//
// Index 0 is reserved for "empty". Everything below is keyed by name and
// resolved to an index at build time via `C.<name>`.
//
// Colours are pulled from period photography of the mall: cream/mauve
// diamond tile, speckled granite columns, cream coved ceilings, brass trim,
// teal fountain water.

const HEX = {
  // --- Floors -------------------------------------------------------------
  tileCream:      0xEDE6DA,
  tileMauve:      0x9C6870,
  tileRose:       0xC79AA0,
  tileGrey:       0xD3CCC2,
  terrazzo:       0xDDD6C9,
  courtBand:      0x8B4F58,
  anchorFloor:    0xD9D2C6,
  storeFloor:     0xCFC6B7,
  storeCarpet:    0x8A7F79,

  // --- Walls & structure --------------------------------------------------
  wallCream:      0xE7DECF,
  wallTan:        0xD5C4AC,
  wallWarm:       0xDBCBB4,
  bulkhead:       0xEFE8DC,
  neutralPier:    0xCEC4B2,
  anchorWall:     0xDED5C7,
  exteriorBrick:  0x8E6A55,
  exteriorTrim:   0xB6A38C,

  // --- Ceiling ------------------------------------------------------------
  ceiling:        0xF1ECE2,
  ceilingCove:    0xFFF7E4,
  ceilingLight:   0xFFFDF2,
  skylight:       0xCFE7F2,
  soffit:         0xE3DACB,

  // --- Detail -------------------------------------------------------------
  columnGranite:  0xBAB3A7,
  columnBase:     0x8D8479,
  brass:          0xC7A34A,
  storefrontGlass:0xB9D2D9,
  storefrontDark: 0x3B3A40,
  signBoard:      0x2F2E36,
  signLight:      0xF4EFE2,
  planter:        0x4E4B46,
  planterRim:     0x7C7268,
  foliageDark:    0x35592F,
  foliageMid:     0x4A7A3E,
  foliageLight:   0x699B4C,
  trunk:          0x5A4634,
  water:          0x3FA3BC,
  waterDeep:      0x2A7C93,
  fountainRim:    0xB5A895,
  bench:          0xE9E4D9,
  benchLeg:       0x6E6A63,
  trash:          0x7A736A,
  kioskWood:      0xA97E4E,
  kioskTop:       0x4F4A46,
  carousel:       0xC9435A,

  // --- Storefronts --------------------------------------------------------
  // Approximate house colours for the chains the 1996 directory lists. These
  // are voxel-art approximations for recognition at a glance, not logo art.
  toyRed:         0xC8102E,
  toyYellow:      0xF5C02C,
  toyBlue:        0x1E64B4,
  musicBlack:     0x1C1A20,
  musicPurple:    0x5B3E8E,
  electronicsRed: 0xCE0E2D,
  electronicsGrey:0xD9D9D6,
  pizzaRed:       0xA81B2C,
  pizzaGreen:     0x1F6B3C,
  chickenRed:     0xD4262F,
  nutritionGold:  0xC8A951,
  nutritionNavy:  0x1B3A5C,
  accessoryPink:  0xE58FA8,
  apparelNavy:    0x27334C,
  apparelPlum:    0x6B3A5B,
  apparelTeal:    0x2E8B93,
  athleticStripe: 0xE0402F,
  shoeOrange:     0xE0662A,
  drugBlue:       0x1B5FA8,
  bookGreen:      0x2E6146,
  cafeteriaMaroon:0x6E2230,
  bankGreen:      0x1F5C46,
  libraryBrick:   0x8A5A3C,
  salonMauve:     0xB98CA0,
  jewelryGold:    0xD4B45A,
  jewelryNavy:    0x1A2740,
  utilityBlue:    0x2C5C86,
  cardGreen:      0x2F7A55,
  papered:        0xD9CFB8,
  leaseCard:      0xF2EDE0,
  counterTile:    0xE3E0D6,
  counterTrim:    0x8E6A55,
  merchWarm:      0xD8A24A,
  merchCool:      0x5B8FB9,
  gate:           0x9A968D,

  // --- Outside ------------------------------------------------------------
  asphalt:        0x4B4A4E,
  parkingLine:    0xC9C6BC,
  grass:          0x6E8F52,
  roof:           0x63636A,
  roofUnit:       0x84848C,
  sky:            0x9CC4DA,
}

export const NAMES = Object.keys(HEX)

// Colours above are written as sRGB hex (what you'd pick in an image editor).
// The renderer converts linear -> sRGB on output, so the palette is stored
// linear; skip this and every surface washes out.
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

// palette[i] = [r, g, b] linear, with index 0 = empty.
export const palette = [[0, 0, 0]].concat(
  NAMES.map((n) => {
    const h = HEX[n]
    return [
      toLinear(((h >> 16) & 255) / 255),
      toLinear(((h >> 8) & 255) / 255),
      toLinear((h & 255) / 255),
    ]
  })
)

// C.tileCream -> 1, C.tileMauve -> 2, ...
export const C = {}
NAMES.forEach((n, i) => { C[n] = i + 1 })

export const SKY_HEX = HEX.sky
