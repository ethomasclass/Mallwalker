# Mallwalker

A first-person walking sim set in **Colonial Mall Decatur**, Alabama, as it
stood in 2000 — rebuilt in voxels.

No shopping, no objectives. You walk the concourse.

![](public/reference/interior-court.jpg)

**Play it in a browser:** https://claude.ai/code/artifact/90e8f7bd-7193-4152-9ad5-e9d53fae30e8

## Running it

```
npm install
npm run dev      # http://localhost:5173
```

Desktop: WASD to walk, mouse to look, Shift to power walk, Space to hop, Esc to
release the cursor. Phones and tablets get an on-screen stick (left thumb),
a look pad (right thumb), and RUN / HOP buttons — the mode is picked
automatically from `pointer: coarse`.

## What's modelled

Geometry is traced from the mall's own fold-out directories, scanned in
`public/reference/`. The building opened as Beltline Mall in 1978, was renamed
River Oaks Centre, gained the Sears and JCPenney wings in 1987, and was
Colonial Mall Decatur by 2000. The world is built to the **2000** directory;
the 1996 one is kept alongside it because the two together date every change.

Every numbered space on the map exists in the world at its real address, with
the tenant the directory lists in it:

| | |
|---|---|
| **100** | Sears |
| **200** | Castner Knott — Store for Men & Children |
| **300** | JCPenney |
| **400** | Castner Knott |
| **500** | Parisian |
| **600** | Castner Knott Market Centre *(outparcel)* |
| **601** | Regal Cinema *(outparcel)* |

…plus 51 named inline tenants (Camelot, KayBee, Lane Bryant, Sbarro's, CVS,
Victoria's Secret, Morrison's, the Decatur Public Library branch in 480, the
Decatur Police substation in 128, and so on), 22 spaces the directory shows as
vacant, the eight lettered kiosks, both restroom blocks, the mall office, and
the carousel the brochure advertises.

Between 1996 and 2000 the roster moved a lot, and the model follows it: Revco
became CVS in the 1997 buyout, Foot Locker moved out of 462 into the big unit
at 416, Friedman's became Marks & Morgan, Dollar Tree crossed the mall from
320 to 140, Bookland and Platters and AmSouth and Heel Quick! are gone, and
Victoria's Secret, Regency Jewelers and a police substation have arrived.

Interior detail — mauve-and-cream diamond tile, coved and lit ceiling soffits,
speckled granite columns, the skylit fountain court with its brass pots of
bromeliads — is drawn from period photography of the centre court.

**Every tenant has its own storefront.** `src/game/tenants.js` gives all 52
named spaces a closure type and a pair of house colours: KayBee's loudest
colour sits right at the lease line with stock stacked in the opening, because
that is exactly why the format existed; Camelot sits behind a dark display
window; Sbarro's has no glazing at all, just a tiled counter; AmSouth is a
solid front with one door and one window; the 23 vacancies are papered over
from inside and gated, with a SPACE AVAILABLE card. There is no logo artwork
anywhere — only the tenant's name, set plain.

Where a photograph exists the shopfront is built to it, in
`public/reference/`: RadioShack's black fascia over a red back wall; KayBee's
blue fascia with red letters, confetti piers, sale banners strung across the
ceiling and stock stacked into the opening; Pocket Change as the arcade it was
— black tile piers, an open front, and a dark room lit only by its cabinets;
Sbarro's red barrel awning over the servery; Foot Locker's stepped wood gable
with round shoe towers behind it; Bookland's tables of stock pushed out to the
lease line under yellow sale cards.

Storefront dimensions follow real mall tenant design criteria: the lease line
sits 22″ back from the face of the landlord's neutral pier, and blade signs
project 24″ with their underside 9′-0″ clear.

**Light is baked.** `src/engine/LightGrid.js` treats the lit ceiling soffits,
the court skylight and the shops' own ceilings as emitters and floods that
light through open space on a 1 m grid; meshing samples it per vertex. Solid
cells hold no light, so creases and undersides shade themselves — ambient
occlusion falls out of the same pass. Nothing is lit at runtime.

**The mall has three public doors**, and they are where the map says: the
spurs that run south to the exterior wall, chamfered at their ends, with
Customer Service standing at the head of the middle one exactly as the
brochure describes. The doors stay shut — the glazing is solid, so the shell
is still sealed — but the glass is thin enough that its light cell stays open,
so daylight floods up the spur. The mall's real hours are on the glass.

Add `?time=morning`, `evening` or `night`. With no windows but the doors and
the court skylight, the time of day reads almost entirely as how much light
comes through those two openings — at night the mall is lit only by its own
fixtures.

**There are people.** `src/game/npc.js` puts twenty-six walkers on the
corridor graph — retirees doing laps in windbreakers, teens, shoppers with
bags, kids, a security guard on his beat — plus two who stand where their job
puts them: the Foot Locker "Striper" in his referee shirt at the door of 416,
and the clerk beside Customer Service. They travel between random
destinations in lanes off the centre line, sidestep the fixtures, stop rather
than walk through you, and are shaded from the same baked light grid as the
building. Get within a few metres, look at one, and press **E** (or tap TALK)
— each has a few lines, and most of them are about the mall.

The corridor graph is built from the same corridor rectangles the building
is carved from, so it can never disagree with the walkable space. Corridors
that meet almost always *abut* rather than overlap — the wing ends on the
exact line where the concourse begins — which is worth knowing before writing
an overlap test.

**Signs read as the chains wrote them in 2000**, which is not always how the
directory's typesetter wrote them: RadioShack went camel-case in 1995, Kay-Bee
became "KB Toys" in 1998, and the anchors carry their own wordmark treatments
— Castner Knott's navy serif capitals, Parisian's black serif, the Sears and
JCPenney sans wordmarks.

**Sound is synthesised**, so the whole mall still ships as one file: an HVAC
bed, the fountain when you are near it, muzak leaking out of Camelot, and
footsteps in a room whose reverb opens up as the ceiling does. **M** mutes.

**Interiors are fitted out.** Each unit gets perimeter shelving, floor
fixtures suited to its trade — gondola runs in the discount stores, round racks
and mannequins in apparel, a kitchen line in the food units, a desk and chairs
in the service offices, chairs and mirrors in the salons — and a lay-in
acoustic ceiling with fluorescent troffers that feeds the light bake, so shops
glow through their own glass.

**The anchors are merchandised.** `src/game/anchors.js` divides each of the
five department stores into departments in normalised coordinates, laid out the
way a 1990s department store actually planned a floor: cosmetics and fine
jewellery on hard floor right inside the mall doors, soft goods on carpet
behind them, hard lines and the home store furthest from the entrance. Sears
keeps its own character — Appliances, Craftsman and Automotive along the back
wall. The gaps between departments become the aisles, so nobody has to draw an
aisle, and each department gets its own floor finish, its own fixtures (round
racks and four-ways, glass cosmetics counters with lit back units, gondola
runs, shoe benches, tall Craftsman gondolas, sofa groups) and a hanging sign on
rods.

The concourse follows the photographs in `public/reference/`: plain tile with a
band hugging the shopfronts and the maroon runner with lighter dashes down the
centre, tall coved and skylit ceilings over the main run, low acoustic tile
with troffers in the wings, glass-case kiosks, coin-op kiddie rides on a black
mat, banner stands and A-frame sale signs.

The you-are-here directories are drawn from the same plan data the world is
built from, so the map can never disagree with the building around it.

Add `?season=christmas` (or `backToSchool`) to swap the temporary tenants the
directory lists — Dippin' Dots, Railroad Bazaar, Silver Tree, Snows Gifts.

The concourse floor is laid as one-metre tiles with the grout drawn. It is
tempting to leave it as a flat wash — greedy meshing collapses it to almost
nothing — but without the grid the floor reads as grey concrete rather than
tile, which is most of what you look at while walking.

### Where the sources disagree

The 2000 brochure still lists both anchors as Castner Knott, but Castner
Knott was sold to Dillard's in the 1998 Mercantile Stores buyout, and the
brochure lists Camelot at 164 although Camelot had been folded into FYE in
late 1998. Directories lag their tenants; the model follows the directory,
since it is the only source that is specifically *this* mall, and notes the
lag here. Swap the anchor signs to Dillard's if you'd rather follow the
corporate record.

### Where the model departs from the map

The printed directory draws corridors far narrower than a person can walk, and
compresses the anchors. Corridors are therefore widened to real dimensions
(15.4 m main concourse, ~12.8 m on the wings) and the flanking bays pushed back.
Relative position, adjacency and unit numbering all follow the directory.

Two places the 2000 map is genuinely ambiguous, resolved rather than invented:
Morrison's dining room fills the block behind the 43x row and its only drawn
frontage is a narrow neck between 434 and 430, so the shopfront is built across
just that span; and the gap between the 416 block and 404/402 reads as
back-of-house, so 412 is given frontage on the recess and 408 — vacant in 2000
— is left solid rather than having a door invented for it.
Scale is fixed at **0.32 m per scan pixel**, which puts the mall at roughly
250 m end to end.

## How it's built

```
src/engine/    voxel storage, greedy mesher, palette, metre-space drawing
src/game/      the plan (data), the builder, player, touch controls
tools/shoot.mjs  headless screenshotter for checking the build
```

The world is a sparse 25 cm voxel grid. The mall is built **subtractively**:
every envelope block and anchor is filled as one solid mass, then corridors,
shops and anchor boxes are carved back out. Nothing the player can reach was
left to chance, and the building can't leak.

That grid is then greedy-meshed — runs of identical faces collapse into single
quads, taking the mall from ~1M coplanar floor quads to about 76k triangles
total, merged into 3×3-chunk sectors for frustum culling. Face shading is baked
into vertex colours, so it renders unlit and runs on a phone.

`src/game/plan.js` is the only file you need to touch to change the layout.
Rectangles are given in scan-pixel coordinates so they can be checked against
the map by eye.

### Packaging

`node tools/build-artifact.mjs` folds `dist/` into a single self-contained
`artifact/mallwalker.html` (~485 KB) with the bundle and stylesheet inlined —
nothing is fetched at runtime but the webfont, which has a real fallback stack.

### Checking the shell

```
node tools/leaktest.mjs
```

Floods air inward from outside the building and reports anywhere it reaches
interior space. Run it after any change to `plan.js` — a corridor extended to
the edge of its envelope block carves away its own end wall, and the hole is
invisible until you walk into it.

### Checking a change

```
npm run build
npx vite preview --port 4173 &
node tools/shoot.mjs ./shots '[["court", 96, 158, 4.2, -0.05]]'
```

Each viewpoint is `[name, x, z, yaw, pitch]` in world metres.

## Not there yet

- **NPCs.** The point of the whole thing: other walkers to pass and talk to.
  Nothing is stubbed for them yet.
- The exterior is a brick skin and a flat parking lot — no cars, no entrances
  from outside, no landscaping.
- The seasonal system only swaps carts. Centre-court decoration and window
  sale signage don't change yet.
- 360k triangles. Fine on a desktop, and it holds up on a phone, but the
  fixture density in the anchors is the first thing to trim if it doesn't.
- Bay geometry is eyeballed from the scan to about ±1 m. Worth a second pass
  against the modern floorplan in `public/reference/floorplan-modern.jpg`,
  which covers the same building with cleaner outlines.
