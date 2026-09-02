// Department-store interiors.
//
// Each anchor is divided into departments given in normalised coordinates, so
// the layout reads at a glance and survives any change to the building's
// dimensions. Departments are laid out the way a 1990s department store
// actually merchandised: cosmetics and fine jewellery on the hard floor right
// inside the mall entrance, soft goods on carpet behind them, hard lines and
// the home store furthest from the door.

// u runs along the anchor's x axis, v along its z axis, both 0..1.
const D = (u0, v0, u1, v1, type, name) => ({ u0, v0, u1, v1, type, name })

export const DEPARTMENTS = {
  // Sears — mall entrance on the south. Softlines by the door, appliances,
  // Craftsman and automotive along the back wall by the service entrance.
  100: [
    D(0.00, 0.70, 0.50, 1.00, 'apparel', "Women's"),
    D(0.50, 0.70, 1.00, 1.00, 'apparel', "Men's"),
    D(0.00, 0.42, 0.34, 0.70, 'shoes', 'Shoes'),
    D(0.34, 0.42, 0.70, 0.70, 'home', 'Housewares'),
    D(0.70, 0.42, 1.00, 0.70, 'electronics', 'Electronics'),
    D(0.00, 0.04, 0.45, 0.40, 'appliance', 'Appliances'),
    D(0.45, 0.04, 0.76, 0.40, 'hardware', 'Craftsman'),
    D(0.76, 0.04, 1.00, 0.40, 'hardware', 'Automotive'),
  ],

  // Castner Knott — Store for Men & Children. Entrance on the south.
  200: [
    D(0.00, 0.62, 0.50, 1.00, 'apparel', "Men's Furnishings"),
    D(0.50, 0.62, 1.00, 1.00, 'apparel', "Men's Clothing"),
    D(0.00, 0.28, 0.50, 0.62, 'children', "Boys'"),
    D(0.50, 0.28, 1.00, 0.62, 'children', "Girls'"),
    D(0.00, 0.03, 0.55, 0.28, 'shoes', "Children's Shoes"),
    D(0.55, 0.03, 1.00, 0.28, 'fitting', 'Fitting Rooms'),
  ],

  // JCPenney — entrance on the south, into cosmetics and jewellery.
  300: [
    D(0.00, 0.74, 0.34, 1.00, 'cosmetics', 'Cosmetics'),
    D(0.34, 0.74, 0.68, 1.00, 'jewelry', 'Fine Jewelry'),
    D(0.68, 0.74, 1.00, 1.00, 'apparel', 'Accessories'),
    D(0.00, 0.42, 0.50, 0.72, 'apparel', "Women's"),
    D(0.50, 0.42, 1.00, 0.72, 'apparel', "Men's"),
    D(0.00, 0.14, 0.50, 0.40, 'children', "Children's"),
    D(0.50, 0.14, 1.00, 0.40, 'shoes', 'Shoes'),
    D(0.00, 0.02, 1.00, 0.12, 'home', 'Home Store'),
  ],

  // Castner Knott — the main store. Entrance on the west.
  400: [
    D(0.02, 0.00, 0.28, 0.50, 'cosmetics', 'Cosmetics'),
    D(0.02, 0.50, 0.28, 1.00, 'jewelry', 'Fine Jewelry'),
    D(0.30, 0.00, 0.62, 0.50, 'apparel', "Women's"),
    D(0.30, 0.50, 0.62, 1.00, 'apparel', 'Juniors'),
    D(0.64, 0.00, 1.00, 0.44, 'apparel', "Men's"),
    D(0.64, 0.46, 1.00, 0.74, 'shoes', 'Shoes'),
    D(0.64, 0.76, 1.00, 1.00, 'furniture', 'Home'),
  ],

  // Parisian — entrance on the east.
  500: [
    D(0.72, 0.00, 1.00, 0.38, 'cosmetics', 'Cosmetics'),
    D(0.72, 0.40, 1.00, 0.68, 'apparel', 'Accessories'),
    D(0.72, 0.70, 1.00, 1.00, 'jewelry', 'Fine Jewelry'),
    D(0.40, 0.00, 0.70, 0.48, 'apparel', "Women's"),
    D(0.40, 0.50, 0.70, 1.00, 'apparel', 'Juniors'),
    D(0.12, 0.00, 0.38, 0.44, 'apparel', "Men's"),
    D(0.12, 0.46, 0.38, 0.78, 'shoes', 'Shoes'),
    D(0.12, 0.80, 0.38, 1.00, 'children', "Children's"),
    D(0.00, 0.30, 0.10, 0.70, 'fitting', 'Fitting Rooms'),
  ],
}

// Floor finish per department type: soft goods on carpet, everything else on
// hard floor, which is how you could tell the departments apart with your eyes
// shut.
export const FLOORS = {
  apparel: 'carpetRose',
  children: 'carpetSand',
  shoes: 'carpetTaupe',
  furniture: 'carpetBlue',
  fitting: 'carpetTaupe',
  cosmetics: 'deptTile',
  jewelry: 'deptTile',
  home: 'deptTile',
  appliance: 'deptTile',
  hardware: 'deptTile',
  electronics: 'deptTile',
}

export const ACCENTS = {
  apparel: ['apparelNavy', 'apparelPlum', 'salonMauve', 'apparelTeal'],
  children: ['toyYellow', 'accessoryPink', 'toyBlue'],
  shoes: ['shoeOrange', 'apparelNavy'],
  furniture: ['sofaBlue', 'woodTable'],
  cosmetics: ['jewelryGold', 'accessoryPink'],
  jewelry: ['jewelryNavy', 'jewelryGold'],
  home: ['bookGreen', 'merchWarm'],
  appliance: ['applianceWhite', 'electronicsGrey'],
  hardware: ['craftsmanRed', 'toolBlack'],
  electronics: ['toolBlack', 'electronicsGrey'],
  fitting: ['carpetTaupe'],
}
