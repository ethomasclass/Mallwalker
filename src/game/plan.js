// Colonial Mall Decatur, Alabama — as directoried in 2000.
//
// The building is the same one the 1996 River Oaks Centre directory shows; by
// 2000 it had been renamed and re-tenanted. Geometry is traced from the mall's
// own fold-out directories (scans in public/reference/). Rectangles below are
// given in the 1996 scan's pixel space and converted to metres by PX; keeping
// the pixel numbers makes it easy to re-check a bay against either map.
//
// Where the printed map draws corridors thinner than a person can walk, the
// corridor is widened to a real-world dimension and the flanking bays are
// pushed back. Relative position, adjacency and unit numbering all follow the
// directory.

// Scan pixel -> metres. Sears reads ~207 px wide on the scan; at this scale
// that is a ~66 m anchor frontage, and the main concourse comes out ~15 m.
export const PX = 0.32
const OX = 330 // scan px of world origin X
const OZ = 150 // scan px of world origin Z

export const mx = (px) => (px - OX) * PX
export const mz = (pz) => (pz - OZ) * PX

// Rect helper: scan-pixel corners -> metre rect {x0,z0,x1,z1}
export const R = (px0, pz0, px1, pz1) => ({
  x0: mx(px0), z0: mz(pz0), x1: mx(px1), z1: mz(pz1),
})

// --- Vertical dimensions (metres) ----------------------------------------
export const H = {
  floor: 0,
  concourseCeil: 6.2,
  concourseCove: 5.4,
  storeCeil: 3.7,
  anchorCeil: 5.0,
  roof: 7.0,
  parapet: 7.8,
  storefrontHead: 3.2,
  signBand: 2.6,
}

// --- Tenants (directory, c. 1996) ----------------------------------------
// null = vacant / not listed in the directory.
export const TENANTS = {
  100: 'Sears',
  200: 'Castner Knott — Men & Children',
  300: 'JCPenney',
  400: 'Castner Knott',
  500: 'Parisian',
  600: 'Castner Knott Market Centre',

  102: 'Briarpatch', 104: "Sabghi's", 110: "Athlete's Feet",
  112: null, 116: null, 118: null, 119: null, 120: null,

  124: 'Pocket Change', 126: null,
  128: 'Decatur Police Substation',
  130: 'Card & Collectibles Empire', 134: null,
  140: 'Dollar Tree',
  142: 'MasterCuts', 144: 'University Collectibles',
  148: 'AcScents', 150: 'Bourbon Street Candy Co.',

  // Signs read as the chains wrote them by 2000: RadioShack went camel-case
  // in 1995, Kay-Bee became "KB Toys" in 1998.
  152: 'RadioShack', 154: 'KB Toys', 158: 'Lane Bryant',
  162: "Lynn's Hallmark", 164: 'Camelot Music',
  166: 'Bath & Body Works',

  202: 'Eyemaster', 206: null, 208: 'Great American Cookie Co.',
  212: 'General Nutrition', 214: 'Hibbett',
  218: null, 220: "Claire's Boutique", 222: 'Nail Studio',
  226: null, 228: null, 229: null, 230: null, 231: null,

  302: null, 304: 'Superior Alterations', 308: null,
  310: 'The Living Word', 318: 'Regency Jewelers', 320: null,

  402: 'Burch & Hatfield Formal Shop', 404: 'JayMark Jewelers',
  408: null, 412: 'Sterling Travel Express', 416: 'Footlocker',
  420: null, 424: 'Chick-fil-A', 426: 'Disc Jockey', 430: 'Regis',
  434: 'Payless', 436: "Victoria's Secret", 438: 'Exper-tees',
  440: 'Chongwah Express', 442: "Morrison's", 444: null,
  450: 'CVS Pharmacy', 452: null, 454: 'Snack Express',
  455: 'Footquarters', 456: 'Marks & Morgan Jewelers',
  460: "Judy's Place", 462: null, 464: "Sbarro's Pizza",
  470: 'Lerner', 472: 'Afterthoughts', 474: 'Expressions',
  476: null, 478: 'Joe Wheeler Electric',
  480: 'Decatur Public Library — Southwest Branch',
  484: 'The Shoe Department',
  // The 2000 brochure lists Merle Norman at 448, but no 448 appears anywhere
  // on its own map and 488 is drawn exactly where Merle Norman stood in 1996.
  // Treating the list number as a misprint.
  488: 'Merle Norman',
}

// `span` limits the shopfront to part of the bay's frontage, in scan pixels —
// needed where a big room opens through a narrow neck rather than across its
// whole edge.
const bay = (id, rect, face, span) => ({
  id, face, ...rect, name: TENANTS[id] ?? null,
  span: span && { a0: (span[0] - OX) * PX, a1: (span[1] - OX) * PX },
})

// --- Anchors --------------------------------------------------------------
export const ANCHORS = [
  { id: 100, name: 'Sears',    rect: R(483, 158, 690, 332), entry: { face: 'S', at: 592 } },
  { id: 500, name: 'Parisian', rect: R(340, 415, 512, 755), entry: { face: 'E', at: 628 } },
  { id: 200, name: 'Castner Knott — Men & Children', rect: R(715, 430, 885, 570), entry: { face: 'S', at: 757, half: 3.2 } },
  { id: 300, name: 'JCPenney', rect: R(940, 237, 1090, 452), entry: { face: 'S', at: 1022 } },
  { id: 400, name: 'Castner Knott', rect: R(1090, 545, 1268, 748), entry: { face: 'W', at: 628 } },
]

// Detached outparcels — visible from the parking lot, not walkable yet.
export const OUTPARCELS = [
  { id: 601, name: 'Regal Cinema', rect: R(1218, 190, 1330, 300), height: 9.0 },
  { id: 600, name: 'Castner Knott Market Centre', rect: R(1330, 437, 1478, 552), height: 7.5 },
]

// --- Corridors ------------------------------------------------------------
// Carved to full concourse height; these are the walkable spine.
export const CORRIDORS = [
  { ceilH: 4.8, id: 'north',      rect: R(572, 332, 612, 606) },  // Sears wing, N-S
  { id: 'main',       rect: R(512, 606, 1090, 654) }, // Parisian <-> Castner Knott 400
  { id: 'court',      rect: R(556, 588, 644, 654) },  // fountain court at the junction
  { ceilH: 4.8, id: 'jcp-spur',   rect: R(1004, 452, 1038, 606) },// N-S up to JCPenney
  { ceilH: 4.4, id: 'sw-pocket',  rect: R(578, 654, 604, 745), entrance: 'S' },
  // The 2000 map draws ONE spur running south off the concourse, with CVS and
  // 444 on its west side and 436/438/440 on its east. Kiosk C stands at its
  // head.
  { ceilH: 4.4, id: 'south-spur', rect: R(796, 654, 820, 772), entrance: 'S', main: true },
  // Morrison's is a cafeteria reached down a narrow neck between 434 and 430.
  { ceilH: 4.4, id: 'morrisons',  rect: R(876, 654, 894, 712) },
  { ceilH: 4.4, id: 'se-recess',  rect: R(998, 654, 1018, 772), entrance: 'S' },
  { ceilH: 4.4, id: 'ck200-entry',rect: R(746, 570, 768, 606) },  // vestibule into Castner Knott 200
]

// --- Inline bays ----------------------------------------------------------
export const BAYS = [
  // Sears wing, west column (faces east onto the north corridor)
  bay(120, R(512, 352, 572, 390), 'E'),
  bay(119, R(512, 390, 572, 412), 'E'),
  bay(118, R(512, 412, 572, 433), 'E'),
  bay(116, R(512, 433, 572, 455), 'E'),
  bay(112, R(512, 455, 572, 518), 'E'),
  bay(110, R(512, 518, 572, 548), 'E'),
  bay(102, R(512, 548, 552, 588), 'E'),
  bay(104, R(552, 548, 572, 588), 'E'),

  // Sears wing, east column (faces west onto the north corridor)
  bay(124, R(612, 352, 672, 392), 'W'),
  bay(126, R(612, 392, 672, 414), 'W'),
  bay(128, R(612, 414, 672, 436), 'W'),
  bay(130, R(612, 436, 672, 458), 'W'),
  bay(134, R(612, 458, 672, 480), 'W'),
  bay(140, R(612, 480, 672, 514), 'W'),
  bay(142, R(612, 514, 650, 540), 'W'),
  bay(144, R(612, 540, 650, 566), 'W'),
  bay(150, R(612, 566, 650, 588), 'W'),

  // Main concourse, north side (faces south)
  bay(148, R(644, 588, 672, 606), 'S'),
  bay(152, R(672, 570, 698, 606), 'S'),
  bay(154, R(698, 570, 722, 606), 'S'),
  bay(158, R(722, 570, 746, 606), 'S'),
  bay(162, R(768, 570, 790, 606), 'S'),
  bay(164, R(790, 570, 814, 606), 'S'),
  bay(166, R(814, 570, 844, 606), 'S'),
  bay(202, R(844, 570, 868, 606), 'S'),
  bay(206, R(868, 570, 886, 606), 'S'),
  bay(208, R(886, 570, 900, 606), 'S'),
  bay(212, R(900, 570, 926, 606), 'S'),
  bay(214, R(926, 520, 956, 606), 'S'),

  // JCPenney spur, west side (faces east)
  bay(231, R(956, 452, 1004, 476), 'E'),
  bay(230, R(956, 476, 1004, 498), 'E'),
  bay(229, R(956, 498, 1004, 520), 'E'),
  bay(228, R(956, 520, 1004, 542), 'E'),
  bay(226, R(956, 542, 1004, 566), 'E'),
  bay(222, R(956, 566, 1004, 586), 'E'),
  bay(220, R(956, 586, 1004, 606), 'E'),

  // JCPenney spur, east side (faces west)
  bay(302, R(1038, 452, 1064, 478), 'W'),
  bay(304, R(1038, 478, 1064, 500), 'W'),
  bay(308, R(1038, 500, 1090, 528), 'W'),
  bay(310, R(1038, 528, 1090, 570), 'W'),
  bay(318, R(1038, 570, 1064, 606), 'W'),
  bay(320, R(1064, 570, 1090, 606), 'W'),

  // Main concourse, south side — west pocket off the Parisian end
  bay(488, R(518, 654, 548, 700), 'N'),
  bay(484, R(548, 654, 578, 700), 'N'),
  bay(480, R(518, 700, 578, 745), 'E'),
  bay(472, R(604, 654, 626, 678), 'W'),
  bay(474, R(604, 678, 626, 700), 'W'),
  bay(476, R(604, 700, 626, 722), 'W'),
  bay(478, R(604, 722, 626, 745), 'W'),

  // Main concourse, south side — main run
  bay(470, R(626, 654, 654, 700), 'N'),
  bay(464, R(654, 654, 678, 700), 'N'),
  bay(462, R(678, 654, 702, 700), 'N'),
  bay(460, R(702, 654, 724, 700), 'N'),
  bay(455, R(724, 654, 748, 700), 'N'),
  bay(456, R(748, 654, 764, 700), 'N'),
  bay(454, R(764, 654, 780, 700), 'N'),
  bay(452, R(780, 654, 796, 700), 'N'),
  // West side of the south spur.
  bay(450, R(690, 700, 796, 748), 'E'),
  bay(444, R(690, 748, 796, 772), 'E'),

  // Main concourse, south side — east run. 436 is the corner unit at the head
  // of the spur; 438 and 440 run down its east side behind it.
  bay(436, R(820, 654, 848, 706), 'N'),
  bay(438, R(820, 706, 848, 740), 'W'),
  bay(440, R(820, 740, 848, 772), 'W'),
  bay(434, R(848, 654, 876, 706), 'N'),
  bay(430, R(894, 654, 918, 706), 'N'),
  bay(426, R(918, 654, 942, 706), 'N'),
  bay(424, R(942, 654, 976, 706), 'N'),
  // Morrison's dining room fills the block behind that row; its only frontage
  // is the neck, so the shopfront is built across just that span.
  bay(442, R(848, 712, 976, 772), 'N', [876, 894]),

  // South-east corner. By 2000 Foot Locker had moved out of 462 into 416,
  // which the map draws as the deepest unit on this end of the mall.
  //
  // The map is genuinely ambiguous about how 408 and 412 are reached — the
  // gap between the 416 block and the 404/402 block reads as back-of-house.
  // 412 is given frontage on the recess; 408, vacant in 2000, is left as
  // solid rather than inventing a door for it.
  bay(420, R(976, 654, 998, 706), 'N'),
  bay(416, R(1018, 654, 1064, 736), 'W'),
  bay(412, R(1018, 736, 1064, 772), 'W'),
  bay(404, R(1064, 654, 1078, 706), 'N'),
  bay(402, R(1078, 654, 1090, 706), 'N'),
]

// --- Kiosks & fixtures ----------------------------------------------------
// Kiosks are given as centre points; a retail merchandising unit is about
// 3 m square, not the fat blocks the printed map draws them as.
export const KIOSK_SIZE = 3.0
const kiosk = (id, name, px, pz) => ({
  id, name,
  at: { x0: mx(px) - KIOSK_SIZE / 2, z0: mz(pz) - KIOSK_SIZE / 2,
        x1: mx(px) + KIOSK_SIZE / 2, z1: mz(pz) + KIOSK_SIZE / 2 },
})

export const KIOSKS = [
  kiosk('G', 'Things Remembered', 652, 630),
  kiosk('F', 'Cellular Shop',     702, 630),
  kiosk('E', 'Sunglass Hut',      754, 630),
  kiosk('D', 'Silver Tree',       800, 630),
  kiosk('C', 'Customer Service',  846, 630),
  kiosk('B', 'Gems, Gold & More', 918, 630),
  kiosk('A', 'Pretzel Time',      972, 630),
  kiosk('H', 'Precious Jewelers', 598, 548),
]

export const RESTROOMS = [
  { id: 'R/T', name: 'Restrooms & Telephones', at: R(650, 514, 672, 540) },
  { id: 'R/T', name: 'Restrooms & Telephones', at: R(1064, 452, 1090, 478) },
  { id: 'MO',  name: 'Mall Office',            at: R(1064, 478, 1090, 502) },
]

export const FOUNTAIN = { x: mx(600), z: mz(620), r: 4.5 }

// "Even a carousel for the kids." — Colonial Mall Decatur brochure, 2000.
export const CAROUSEL = { x: mx(1010), z: mz(630), r: 3.6 }

// Start in the fountain court, ten metres back from the kerb and facing the
// fountain, so the first thing you see is the room rather than the water.
export const SPAWN = { x: mx(624), z: mz(640), heading: 0.88 }

// --- Building envelope ----------------------------------------------------
// The mall is built by filling these blocks solid and then carving corridors,
// shops and anchors back out of them. Carving from a solid mass means the
// building can never leak: any space the player can stand in was cut on
// purpose.
export const ENVELOPE = [
  R(512, 332, 676, 606),   // Sears wing
  R(556, 588, 644, 654),   // fountain court
  R(512, 606, 1090, 654),  // main concourse
  R(644, 520, 1010, 606),  // north side of the concourse + Hibbett + spur west
  R(926, 452, 1090, 606),  // JCPenney spur
  R(512, 654, 626, 745),   // south-west pocket
  R(626, 654, 796, 706),   // south run
  R(690, 700, 796, 772),   // CVS / 444
  R(816, 654, 1000, 706),  // south-east run
  R(816, 706, 980, 772),   // cafeteria block
  R(940, 654, 1090, 772),  // south-east corner
]

// Corridors are carved out of the envelope, so a corridor whose rect *is* an
// envelope block would remove its own walls and open to the sky wherever no
// neighbouring block happens to abut it. Filling a collar around every
// corridor gives each one a wall of its own.
export const COLLAR = 1.2

const grow = (r, m) => ({ x0: r.x0 - m, z0: r.z0 - m, x1: r.x1 + m, z1: r.z1 + m })

// Every rect the building occupies in plan: used to fill the solid mass, lay
// the floor slab, skin the exterior and deck the roof.
export const FOOTPRINT = [
  ...ENVELOPE,
  ...CORRIDORS.map((c) => grow(c.rect, COLLAR)),
]

// --- Seasonal state -------------------------------------------------------
//
// A late-90s mall was a seasonal machine. The directory's own "Temporary
// Tenants" list is the hook: those four carts came and went with the calendar.
// Pick with ?season=christmas etc.
export const TEMP_TENANTS = [
  { name: "Dippin' Dots",   at: [742, 630], seasons: ['summer', 'backToSchool'] },
  { name: 'Railroad Bazaar', at: [700, 630], seasons: ['summer', 'christmas'] },
  { name: 'Snow Gifts',      at: [880, 630], seasons: ['christmas'] },
  { name: 'Calendar Club',   at: [880, 630], seasons: ['backToSchool'] },
]

export const SEASONS = ['summer', 'backToSchool', 'christmas']

// Where the you-are-here directories stand.
export const DIRECTORY_BOARDS = [
  { at: [640, 636], rotY: Math.PI },        // fountain court, facing the concourse
  { at: [1000, 620], rotY: 0 },             // Castner Knott end
  { at: [592, 400], rotY: Math.PI / 2 },    // Sears wing
]
