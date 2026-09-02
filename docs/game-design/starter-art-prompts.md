# Starter rank — generation prompts

23 prompts for the merchant tier: 4 surfaces, 15 chamber props, 4 wall items. Written for an image model
that accepts a reference image (Gemini), but nothing here depends on that beyond the consistency trick in
§0. Subjects come from [tile-art-brief.md](tile-art-brief.md); this is the same list, phrased for a model.

Floor scatter (planks, sand, sherds…) is deliberately absent: it has no renderer slot yet, so generating it
now would be art with nowhere to go.

## 0. How to run one

1. **Generate the floor first** and keep it. It is the style anchor: pass it back as a reference image with
   every later prompt so 23 files come out of one tomb rather than 23.
2. Generate at the **aspect the slot wants** (given per prompt). Aspect is the one thing the import cannot
   fix — it stretches to the slot rather than cropping, on purpose, so a wrong aspect shows up immediately.
3. **Measure it before importing** — the aspect it actually came back at, and whether it kept the palette:
   ```
   yarn tile-stats ~/Downloads/gen.png
   ```
   It prints the luminance spread and the share of pixels outside the palette's own ends, and says
   whether to import or regenerate. A generated tile is judged on that first and on craft second.
4. Import it:

   ```
   yarn import-tile ~/Downloads/gen.png --tier=starter --name=jarRack --slot=prop --filter=smooth
   ```

   Slots: `floor` (448²) · `face` (448×56) · `sill` (56×12) · `arch` (84×56) · `prop` (56×84) ·
   `wall` (56×28). Keys out the magenta, re-seats a prop on its floor line, resizes, writes it in.
   `--filter=smooth` on everything: the set is painted (brief, "The style").

   A SURFACE also gets two knobs a prop does not, both settled by looking rather than by prompting:
   `--repeat` shrinks the art and re-tiles it when the generator drew the stones too big, and `--flatten`
   blends toward the rank's slab colour so the floor sits behind the props. The merchant floor is
   `--repeat=2.4 --flatten=0.65`, on a source that was made seamless FIRST:

   ```
   yarn make-seamless ~/Downloads/gen.png
   yarn import-tile ~/Downloads/gen.png --tier=starter --name=floor --slot=floor \
     --filter=smooth --key=none --repeat=2.4 --flatten=0.65
   ```

5. **Megatiles**: `make-seamless` runs on the SOURCE, before the import — `--repeat` tiles a copy of it
   inside the slot, so a source that does not tile shows its seams in the middle of the megatile. Use
   `--axis=x` for `wall-face`, which repeats horizontally only.
6. Look at it: Storybook → `App/SiteMap/SiteMapView` → **World Floor Starter** for a real generated floor,
   and `yarn generate-dummy-tiles --preview` for five ranks side by side. A prop is judged against a wall,
   never against a swatch.

## 1. The preamble — paste above every prompt

Merchant hexes below. The other four ranks reuse this preamble verbatim with their own palette pasted in
from `tierPalette` in `src/app/SiteMap/tileMaterials.ts`, and their own rank line — everything else about
it is the style, which does not change per rank.

```
Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: a MERCHANT's tomb — the poorest of five. Mudbrick and limestone chips, whitewash worn thin,
nothing gilded, nothing carved by a master. Lit by daylight down a stairwell and one oil lamp.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft directional shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #6c6257 / #7b7166 / #5f564b on a #544b40 bed, mortar joints #282219,
walls #4a4137 with #736858 tops and #2b261f in shadow, objects #a49781 and #5c5347,
one warm ochre accent #b07a3c.
Every colour comes from that list. Nothing lighter than #a49781, nothing white, nothing pale grey:
worn paint reads as lighter DUST, not as white flakes. Nothing darker than #282219.
Muted, dusty, very low contrast — neighbouring surfaces sit within a few steps of each other.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
Not isometric, not photographic, no 3D render, no perspective convergence — flat orthographic.
Nothing Greek, Roman or Mesoamerican: no coopered barrels, no acanthus capitals, no step pyramids.
```

**Pass the merchant floor as the reference image** — `src/assets/tiles/starter/floor.png` once it is in, or
`src/assets/rushHour/market/ground.webp` before that. Painted, no contours, joints modelled as shallow
shadowed grooves, grit doing the texture work, and a value spread of _nine_ across the market skin. A
picture carries all of that in one go; the words above only carry it once the model already agrees.

The value clamp is the line a model drops first, and the outline instruction is the one that quietly
undoes it. A first floor came back spanning lum 36–179 against the palette's own 88–114 — white flakes
at one end, near-black slab outlines at the other. Four rolls in, the fix turned out not to be a tighter
clamp but deleting "outline everything in #15110c" from this preamble: asked for outlines, a model draws
a cartoon, and a cartoon is all contrast. Check every file — the numbers are in §5.

## 2. Surfaces — 4 files

**`floor` — 1:1 exactly, fills the frame, no background**

```
Seamless top-down floor texture, viewed straight down. Square image, exactly 1:1.
Trodden earth over broken limestone chips, mudbrick paving laid in a running bond. COUNT THE SLABS:
exactly 7 slabs across the width of the image and 14 rows down it, so each slab is twice as wide as it
is tall and takes up about a seventh of the frame. They are small paving stones, not flagstones.
Square corners — not rounded rectangles.
The slabs BUTT AGAINST EACH OTHER. The joint between two slabs is a shallow GROOVE: a soft narrow
shadow where the surface dips and rises again — modelled, never a drawn line, never black. No slab has
a contour around it.
The slabs are GREY-BROWN, #6c6257 — the same brown as wet clay gone grey, not chocolate and not ochre.
Red and blue sit close together in every slab colour: #6c6257, #7b7166, #5f564b. Slabs vary noticeably
from one to the next across that whole range, so the bond reads without the seams having to draw it.
The one ochre #b07a3c appears only in the spilled grain, nowhere in the stone.
This is a POOR tomb and the paving is BADLY DAMAGED. About a third of the slabs are hurt, in three ways,
all of them PAINTED AS DEPTH rather than drawn:
SCRATCHES — sled runners, dragged jars and sandalled feet have scored shallow grooves into the slab
faces, in bundles running one way, each a pale scored line with a soft shadow in it, cutting through
whatever stain lies over it.
CHIPS MISSING — corners knocked clean off and edges crumbled round, each a small facet catching the
light differently with the darker earth bed #544b40 down in the notch; smaller chips flaked out of the
middle of a face, shallow, the fresh break paler than the weathered surface around it. The broken chips
themselves lie loose nearby.
CRACKS — fine dark hairlines running across a slab and stopping at its edge, some forking, the stone
lipped up softly on either side, a few with the two halves settled a little out of line.
Damage stays SHALLOW: a chip shows the bed, never a black hole; a crack is a hairline, never a trench.
Nothing goes darker than #282219 and no scratch or fresh break goes lighter than #a49781.
Spilled grain and chaff in the hollows, dark rings where jars have stood, tally scratches near one edge.
It tiles, so NOTHING crosses the whole image: no crack, stain or scratch longer than an eighth of the
frame, and no feature touching two edges. Damage stays scattered, spread evenly — no corner busier
than another, no run of broken slabs in a line.
Even lighting across the entire image, no hotspot, no vignette. Edge to edge texture.
```

**`wall-face` — 8:1 strip (if the model refuses, 4:1 and let the import squash it), fills the frame**

```
Seamless horizontal strip of a mudbrick wall, seen straight on from the front, eye level.
Courses of mud brick offset half a brick per row, running unbroken across the whole strip.
Whitewash worn thin over the brick, more gone than left — the worn paint is dusty #a49781, never white,
and the joints between bricks are hairline, not dark outlines.
Merchant seals and tally marks in ochre, wooden peg holes, an iron awning bracket.
A lighter cap along the very top edge where the wall's top surface catches light, and a dark base along
the bottom edge. Even lighting left to right. It tiles left to right: nothing crosses the full width,
and no single object big enough to be recognised twice in a row.
```

**`threshold` — 4:1 (import crops to 56x12), fills the frame**

```
A single worn mudbrick step seen from above, spanning the full width of a doorway, twelve pixels tall.
Rounded by feet, mortar crumbling at both ends, one ochre line of paint left along its front edge.
```

**`arch` — 3:2, magenta #ff00ff background, middle open**

```
A doorway frame seen from the front: two mudbrick jambs at the far left and far right edges,
a timber lintel spanning the top, a thin mudbrick cornice above that. The MIDDLE IS EMPTY —
flat magenta #ff00ff showing through, since the player walks under it. Whitewash gone from the jambs,
the timber cracked and grey with age. Background flat magenta #ff00ff, no shadow cast on it.
```

## 3. Chamber props — 15 files, 2:3, magenta background

Each of these is one object, standing on the bottom edge of the frame, roughly two thirds of the frame
tall, with a small dark contact shadow under it. Append to every prop prompt:

```
Single object, isolated, orthographic front view with the camera tilted about 20 degrees down.
Standing on the bottom edge of the frame with a small dark contact shadow under it.
Background flat magenta #ff00ff, nothing else in frame, no ground plane drawn, no cast shadow
on the background.
```

| File            | Prompt                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statue`        | A small household shrine figure of the god BES: a squat bearded dwarf with a lion's mane and his tongue out, arms on his hips, carved in coarse limestone, paint mostly worn off. |
| `shrine`        | A mudbrick wall niche standing free, a small Bes amulet inside it and a lit clay oil lamp on its ledge, ochre paint around the opening.                                           |
| `sarcophagus`   | A plain undecorated wooden coffin, propped upright and leaning slightly, boards warped, one peg missing, no painted face.                                                         |
| `jarRack`       | A wooden rack of four Egyptian wine and oil amphorae, tall pointed pottery jars sealed with mud stoppers, ink dockets brushed on their shoulders, one jar tilted in its slot.     |
| `offeringTable` | A merchant's market table: a low wooden table with a two-pan balance scale on it, stone weights beside it, a heap of loose grain.                                                 |
| `basin`         | A large pottery water jar on a three-legged wooden stand, a small dipper cup hanging from the rim, a dark damp patch at the base.                                                 |
| `shelf`         | Mudbrick shelving of two levels: folded linen bundles, two mud-stoppered jars, and a limestone ostracon leaning against the back with tally strokes on it.                        |
| `chestProp`     | Two reed baskets and a rope-handled wooden crate stacked together, lid ajar, a mud-stoppered jar sitting on top.                                                                  |
| `lamp`          | A single-wick pottery oil lamp on a low wooden stool, a small flame, soot on the rim, the warm ochre accent used only for the flame's glow.                                       |
| `hanging`       | A patched linen awning cloth hung from a horizontal wooden pole, frayed at the bottom hem, hanging slightly askew.                                                                |
| `pillar`        | A rough timber prop holding up the ceiling, wooden wedges hammered in at its foot, the top out of frame, bark still on one side.                                                  |
| `brazier`       | A shallow clay dish on three short legs holding cold grey ash and one unburnt stick. No flame, no glow.                                                                           |
| `rubble`        | A spill of dry mortar, broken mudbricks and pottery sherds heaped on the ground, dust settling around it, one brick still whole.                                                  |
| `pit`           | A dark square cellar shaft cut into the floor, seen from just above, a knotted rope ladder hooked over its near lip and disappearing into black.                                  |
| `mat`           | A rolled and partly unrolled reed mat, frayed at both ends, one corner curled up, the weave visible.                                                                              |

## 4. Wall items — 4 files, 2:1, magenta background

These hang ON a wall and are painted into a band above a cell, so they are wider than tall and have no
ground under them. Append to every wall-item prompt:

```
Seen straight on from the front, mounted on a wall, nothing below it. Fills the frame width.
Background flat magenta #ff00ff, no cast shadow on the background.
```

| File         | Prompt                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `niche`      | A recess cut into a mudbrick wall holding a merchant's goods: two small sealed jars and a cloth bundle on a mud shelf, the recess interior in deep shadow.     |
| `tallyBoard` | A plank of wood hung on two wooden pegs, covered in scratched tally strokes grouped in fives, some crossed through, a stub of red ochre chalk resting on it.   |
| `stela`      | A rough limestone slab set into the wall with a name scratched into it by an unpractised hand, no relief carving, one corner chipped away.                     |
| `sconce`     | A wooden peg driven into a mudbrick wall with a small pottery oil lamp hung on it by a wire loop, a black fan of soot on the wall above the flame.             |
| `plug`       | A doorway filled in with mud brick and hand-smoothed over, the outline of the blocked opening still visible, fingerprints in the smoothing.                    |
| `breach`     | A robber's hole punched through a mudbrick wall, plaster fallen away around the edges, the hole itself black and empty, broken brick still hanging at the top. |

(`plug` and `breach` are the two new kinds — `WallDecorationKind` needs the names and the starter pool
needs them added before they render. Two lines each; see the brief §5.)

## 5. Order, and what to check as you go

1. `floor` — `yarn tile-stats` it, then look at it in **World Floor Starter** before drawing anything else.
   It sets the value the other 22 files are judged against, so it is the one file worth re-rolling over
   numbers alone. What passing looks like:

   ```
   448x448  aspect 1.00:1
   lum  p5 ~85  p50 ~98  p95 ~120
   outside the palette:  under 1% either end
   ```

   The floor is background. If its own p5–p95 spans more than about 60, it out-contrasts the props and the
   40×70 explorer standing on it, and no amount of craft in the other 22 files recovers that.

2. `wall-face` — check it against the floor for VALUE separation first, hue second. The palette test says
   the pair needs about 1.7 contrast; the eye check is whether a wall stops looking like floor at half zoom.
3. `arch`, `threshold` — the two structural pieces. Look at a ward gate (a rank seam) for these.
4. The five props a starter room draws most: `jarRack`, `chestProp`, `shelf`, `rubble`, `mat`.
5. The rest of the props, then the wall items.

If the set comes out and the map reads worse than the placeholders do, the likely culprit is contrast rather
than craft: run `yarn generate-dummy-tiles --palettes` and compare the numbers.

## 6. When it comes back as a sheet

The model will hand you a sheet whether or not you asked for one, and it will not obey a frame count: ask
for four columns and six come back. **Stop negotiating the count.** Cut the sheet and take what you need:

```
yarn cut-sheet ~/Downloads/sheet.png --out=/tmp/frames --rows=front,back,side --min=0.8
yarn import-tile /tmp/frames/front-1.png --tier=default --name=explorer-s --slot=explorer --filter=smooth
```

`cut-sheet` finds the sprites by their **gutters**, not by an even grid, because a generated sheet is never
on an exact pitch — on the one this was written against the columns sat at a 348px pitch inside 333px cells,
so grid-slicing cut the torch off one sprite and stapled it to the next. It also:

- **pads every frame to one box, bottom-centred.** The side views came back 465px tall against the front's
  382, and imported to their own tight boxes each facing fills the slot on its own terms — the character
  changes size when it turns around.
- **reports a frame the canvas edge clipped** rather than importing it half-width (`--min`). Every row of
  that sheet had one: the 6th sprite ran off the right edge.

Three things worth putting in the prompt, all learned from real returns:

1. **Ask for margin around the whole sheet**, or the last column loses an arm to the canvas edge.
2. **Nothing needs animating yet.** The renderer draws one sprite per facing, so three frames is the whole
   requirement; a walk cycle can be cut from the same sheet later.
3. **A flat magenta background comes back as `#fd25fd`, not `#ff00ff`** — close enough for the default
   tolerance, and `import-tile` despills what soaked into the art. Without that, every silhouette carries a
   purple rim: about half the outline pixels of a generated sprite are part background, and at 40px wide
   that halo is a visible fraction of the character. After import it measures under 1%.
