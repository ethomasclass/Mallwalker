# Mallwalker

A first-person walking sim set in **River Oaks Centre**, Decatur, Alabama, as it
stood in the mid-1990s — rebuilt in voxels.

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

Geometry is traced from the mall's own fold-out directory, scanned in
`public/reference/directory-1990s.jpg`. Every numbered space on that map exists
in the world at its real address, with the tenant the directory lists in it:

| | |
|---|---|
| **100** | Sears |
| **200** | Castner Knott — Store for Men & Children |
| **300** | JCPenney |
| **400** | Castner Knott |
| **500** | Parisian |
| **600** | Castner Knott — Store for Home *(outparcel)* |
| **601** | River Oaks Cinema 8 *(outparcel)* |

…plus 52 named inline tenants (Camelot, KayBee, Lane Bryant, Sbarro's, Revco,
Morrison's Cafeteria, the Decatur Public Library branch in 480, and so on),
23 spaces the directory shows as vacant, the eight lettered kiosks, both
restroom blocks and the mall office.

Interior detail — mauve-and-cream diamond tile, coved and lit ceiling soffits,
speckled granite columns, the skylit fountain court with its brass pots of
bromeliads — is drawn from period photography of the centre court.

### Where the model departs from the map

The printed directory draws corridors far narrower than a person can walk, and
compresses the anchors. Corridors are therefore widened to real dimensions
(15.4 m main concourse, ~12.8 m on the wings) and the flanking bays pushed back.
Relative position, adjacency and unit numbering all follow the directory.
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
- Anchor interiors are empty shells; shop interiors are bare boxes.
- No sound. A mall without HVAC hum and a distant food court is missing half of
  itself.
- The exterior is a brick skin and a flat parking lot — no cars, no entrances
  from outside, no landscaping.
- Bay geometry is eyeballed from the scan to about ±1 m. Worth a second pass
  against the modern floorplan in `public/reference/floorplan-modern.jpg`,
  which covers the same building with cleaner outlines.
