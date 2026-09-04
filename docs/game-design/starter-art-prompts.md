# Starter rank — generation prompts

23 prompts for the merchant tier: 4 surfaces, 15 chamber props, 4 wall items. Written for an image model
that accepts a reference image (Gemini), but nothing here depends on that beyond the consistency trick in
§0. Subjects come from [tile-art-brief.md](tile-art-brief.md); this is the same list, phrased for a model.

Floor scatter (planks, sand, sherds…) is deliberately absent: it has no renderer slot yet, so generating it
now would be art with nowhere to go.

## 0. The loop, one file at a time

Two people and a model, and the file is not done until BOTH have looked. Never start the next file
while the current one is still open — a set drifts when two are in flight.

1. **Claude hands over a full prompt** — preamble and per-file prompt as one block, ready to paste, plus
   which reference image to supply. Never a delta against a previous message: the whole thing, every time,
   because a delta gets pasted on top of the wrong base.
2. **You generate** and paste the result back.
3. **Claude verifies by measuring** — `yarn tile-stats`, against the rank's palette and against the files
   already in the folder. Value, hue, aspect, and for a surface, whether it sits behind what stands on it.
   Numbers first, opinion second, and the verdict says import or re-roll.
4. **You verify by looking** — Storybook, `App/SiteMap/SiteMapView` → **World Floor Starter**. Hard-refresh;
   Vite caches by URL and the path does not change. Measurement cannot see busy, and busy is what kills a
   tile. A prop is judged against a wall, never against a swatch.
5. **Iterate on the same file** until you both say good. Some of it is post-fixable at import
   (`--repeat`, `--flatten`) and does not need a re-roll; Claude says which.
6. **Then, and only then, the next file.** The accepted file becomes the reference image for the one after,
   so the set comes out of one tomb.

The one thing that breaks this: reporting a step as done without running it. A file is written when
`tile-stats` has been run on the file ON DISK and the numbers are in the message.

## 0b. The commands

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

   Slots: `floor` (448²) · `face` (448×56, drawn into 448×28 — import it `--repeat=2`) · `sill` (56×12) ·
   `arch` (84×56) · `prop` (56×84) ·
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
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality, its texture, its restraint and
its lighting. Do NOT take its colours or its subject from it — the palette below is the only source of
colour, and it may be a different rank's stone entirely.
THE CAMERA, the same for every file: 30 degrees above the floor, looking slightly down.
Depth going away from the viewer is squashed to HALF: the top of a wall, the top of a beam, the lid of a
chest are all seen as bands half as deep as they really are, at full width. Height is barely squashed at
all: a surface facing the viewer is close to its true height.
So a square wooden beam shows a top face a bit more than HALF as deep as the front of it is tall — a clear
band, not a sliver. Everything with height shows its top that way, and that is what gives it depth.
Verticals stay vertical, horizontals stay horizontal: an orthographic squash, never a vanishing point.
Not isometric, not photographic, no 3D render, no perspective convergence.
Nothing Greek, Roman or Mesoamerican: no coopered barrels, no acanthus capitals, no step pyramids.
```

The reference line has to be IN the prompt, not said to the model alongside it. A reference carries
colour as strongly as it carries handling, and the ranks differ by colour more than by anything else: a
merchant floor attached to a nobleman prompt is an instruction to paint the nobleman's limestone
grey-brown. Naming the reference's job in the prompt is what stops that.

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

Seen from the FRONT, not from above: this is the face of the wall the player looks at, standing behind
every chamber. It repeats left to right forever and is only 56 units tall, so a brick is small and a
whole wall is mostly texture.

```
Seamless horizontal strip of a mudbrick wall, seen straight on from the front at eye level.
Wide strip, exactly 8 times as wide as it is tall.
COUNT THE BRICKS: exactly 3 courses stacked in the strip's height and 16 bricks across its width,
each course offset half a brick from the one above. Small mud bricks, square corners.
The bricks BUTT AGAINST EACH OTHER. The joint between two bricks is a shallow GROOVE: a soft narrow
shadow where the surface dips and rises again — modelled, never a drawn line, never black. No brick
has a contour around it.
The wall is DARK. Base mud brick #4a4137, and that is the colour most of the wall actually is — DARKER
than the stone floor standing in front of it, not lighter. A poor merchant's mudbrick: brown and
earthen, not pale dressed limestone, not grey.
Whitewash survives only in PATCHES over about a third of the wall, soft-edged, fading out at their
edges rather than flaking off in hard-edged chips. Worn paint is dusty #a49781, never white, and no
patch is lighter than #736858. Most of what you see is bare brick.
A merchant's wall, so it has been USED: ochre tally marks and a pressed clay seal, two wooden peg
holes with a peg still in one, an iron awning bracket, a dark rubbed band at hand height where people
have leaned. All of it painted as depth, none of it outlined.
The very top edge carries a lighter cap where the wall's top surface catches the light; the very
bottom edge a darker base where it meets the floor. Those two bands run unbroken the whole width —
they are the only things that do.
It tiles left to right: nothing else crosses the full width, no crack or stain longer than an eighth
of it, and no object big enough to be recognised twice in a row.
Even lighting left to right, no hotspot, no vignette. Edge to edge texture.
```

**`threshold` — 5:1 strip (import fits it to 56×12), fills the frame**

The sill on a ward-gate seam, where one rank's stone gives way to the next. It is 56×12 — a twelfth of a
cell tall — so it is a BAND, not an object: no shape a player could lose half of, and it is seen from
directly above like the floor, not from the front like the wall.

```
A single worn mudbrick step seen from straight above, spanning the full width of a doorway.
Wide strip, exactly 5 times as wide as it is tall, filling the frame edge to edge with no background.
It is ONE band of stone across the whole width: a soft shadow along its far edge where it drops to the
floor beyond, its own worn top surface across the middle, a soft shadow along its near edge. No object
sits on it and nothing crosses it end to end except those two edges.
The stone is the floor's own mudbrick, #6c6257, a step darker where it is worn hollow — this is the same
paving as the chamber, laid as one long block. Slightly DARKER than the floor either side of it, never
lighter.
Rounded and dished in the middle by feet, mortar crumbled at both ends, one ochre #b07a3c line of paint
left along its near edge, mostly rubbed away.
Painted, matte, soft brush texture and grit. NO OUTLINES: every edge is a change of value, never a
stroke, and nothing goes darker than #282219 or lighter than #a49781.
Even lighting left to right, no hotspot, no vignette.
```

**`arch` — the frame 2.7:1 (84×31), magenta #ff00ff EVERYWHERE except the gateway itself**

The import FITS an arch to the slot rather than trusting the drawing: it finds the posts and the opening
and rescales the three bands to `SIDE_W` : `CELL` : `SIDE_W` — 14 : 56 : 14 — so the jambs land in the
corner slots and the way through is exactly a cell wide. Two things follow. The horizontal proportions in
the prompt are a guide, not a requirement; and the beam's overhang past the posts is DISCARDED, because
the slot is the doorway plus one corner either side and nothing more.

What the import cannot fix is the frame's vertical proportion: drawn at 2:1 and fitted into a 2.7:1 slot,
the merchant's arch lost a quarter of its beam thickness. Draw the remaining ranks at 2.7:1.

An OBJECT, not a piece of wall. Three rolls were spent drawing a doorway in a stretch of masonry, and each
time the wall around it squeezed the way through: asked for jambs a sixth of the frame the model drew a
third, twice, which imports to a 29px opening for a 40-wide explorer. Drawn as a free-standing gateway
there is no wall to get the proportions wrong with, the import trims to the timber, and its brick can no
longer disagree with the wall's brick because it has none.

```
A free-standing wooden doorway frame, alone on a flat magenta #ff00ff background. Nothing else in the
picture: no wall, no floor, no ground, no shadow cast on the magenta.
Two thick upright wooden posts, one at the left and one at the right, and a heavy beam lying across the
top of them. THE MIDDLE IS EMPTY — flat magenta #ff00ff between the posts, from under the beam all the
way down and off the bottom edge of the picture. Magenta OUTSIDE the frame too, left of the left post,
right of the right post, and above the beam.
Each post is about a sixth of the picture's width. The gap between them is the remaining two thirds.
The wood is a warm mid BROWN, clearly browner and warmer than any grey stone: #6f5334 in the light,
#4a3a24 in shadow. Old rough-hewn timber, split along the grain, adze marks, the ends of the beam left
rough where it was cut.
EVERY PIECE SHOWS ITS TOP. The beam is seen from slightly above, so its whole upper face is visible as a
band running the full width, lighter than the front of the beam beneath it. Each post shows the small top
face where the beam rests on it. That top-and-front is what gives the gateway its depth — a frame with no
tops reads as a flat sticker.
The underside of the beam, where it overhangs the opening, is in deep shadow. The inner face of each post
is in shadow too. That dark edge around the empty middle is what makes the gateway read as a way through.
Painted, matte, soft brush texture and visible wood grain. NO OUTLINES: no black contour around anything,
no ink, no cel shading. Every edge is a change of value.
Even lighting left to right, no hotspot, no vignette.
```

## 3a. The prop preamble — paste above every prop, unchanged

Settled on the jar rack and the Bes/ka-statue, at a cost of fifteen rolls. Paste it verbatim: every
attempt to improve the wording mid-set cost a roll and taught nothing, because the theory and the
phrasing changed together.

```
straight-on oblique projection. 50% top, 50% front, no sides.
imagined on a parallel grid used in top down 16 bit games

One object alone, painted and matte, with soft brush texture and grit. Soft modelled shading,
never flat cel shading. NO OUTLINES: no dark contour around the object or any part of it —
every edge is a change of value, never a stroke.

It stands on the bottom edge of the picture, centred. A soft dark shadow lies on the ground
beneath it, darkest where it meets the floor, no wider than the object and reaching no further
below it than a tenth of its height. No hard edge, no drawn ellipse.

Everything that is not the object or its shadow is flat magenta #ff00ff to all four edges — no
floor, no wall, no room, no gradient, no glow.

Palette, strictly: objects #a49781 and #5c5347, one warm ochre accent #b07a3c, against floor
#6c6257 and walls #4a4137. NOTHING LIGHTER THAN #a49781 — no white, no cream, no pale grey, no
highlight brighter than that, no shine, no gloss. Nothing darker than #282219.

It will be shown very small, about as tall as a fingernail. It must read as a SILHOUETTE: few,
large, simple shapes and nothing finer than a tenth of the object. No text, no letters, no
hieroglyphs, no watermark, no frame, no border.
```

Then one line of subject from the table below, and one line of ASPECT — which is what sets the prop's
size on the map, since the import trims to the object: drawn height in the cell is `56 x (height /
width)`, capped at 84. As wide as tall lands about a cell; 1.25 times wider than tall lands waist-high;
2:3 or taller fills the slot.

Two more things learned the hard way. **Never ask for strict symmetry and asymmetric damage in the same
prompt** — a broken shoulder against "perfectly symmetrical left-to-right" degraded the geometry every
time; establish the shape first, add damage after. And **a prop always comes back too light**:
`--brightness=0.72` fixed the statue, `0.92` the rack, and no wording has ever prevented it.

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
