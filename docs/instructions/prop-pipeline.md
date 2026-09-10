# Making a prop — four steps, each with a gate

Every step here has a CHECK you can run before spending the next one. That is the whole design: the
expensive step is the repaint, and nothing should reach it that a measurement could have rejected.

Written after four merchant props were made by prompting alone and cost eighteen rolls. The pattern that
justifies the pipeline: a generator obeys the projection on BOXES (jar rack and market table, one roll
each once the wording settled) and refuses it on FIGURES and CURVES (ka-statue seven rolls, water jar
three). Geometry is not a thing to ask for. It is a matrix.

**Read that as an argument FOR handing a figure a scaffold, not against modelling one.** Those seven rolls
were prompt-only, before any of this existed, and for years this file drew the wrong conclusion from them
— that a statue needs a museum scan. A scaffold is precisely the fix for a projection a generator will not
obey: the priest's Anubis is a slab envelope carved by the repaint, and it took three rolls, none of them
lost to the projection. See `prim_statue`.

## Step 0 — decide what the object IS

From [tile-art-brief.md](../game-design/tile-art-brief.md) §2–§4: the kind, the rank, and what the rank's
row says it is made of. Also decide where the mesh comes from:

| the object is                                                    | mesh from                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| furniture, racks, chests, plinths, stands                        | a parametric primitive in `renderProp.py`                                            |
| a wall item WITH depth — a niche, anything standing off the wall | a parametric primitive too, rendered `--shear=0.5` (see below)                       |
| heaps of BRICK or cut stone                                      | a parametric primitive — a brick is a box (`prim_rubbleheap`)                        |
| a HOLE — in the floor or in a wall                               | a parametric primitive, its inside marked `VOID` (`prim_pit`)                        |
| a FIGURE — a statue, an animal, a coffin                         | a parametric primitive: `--contents` is a POSE (`prim_statue`), the face is paint. PROVEN by `expert/statue`, a black-resin Anubis carved off a slab envelope in three rolls. A museum scan is the fallback, not the default |
| a FLAT wall item — a plaque, a stela, a board                    | no mesh: straight to the generator                                                   |
| CLOTH — a hanging, an awning, a veil                             | a parametric primitive: cloth is a formula, not a simulation (`prim_hanging`)        |
| a DRIFT of sand                                                  | a full-bleed texture, cut to a generated alpha (`yarn drift-mask`)                   |
| loose scatter, sherds, dust                                      | still unsolved; paint by hand or generate                                            |

**A wall item is not exempt from projection.** The band is the same oblique world at HALF depth
(`mapScale`'s SIDE_W 14 imaging as 7, so k = 0.5 — cabinet, where a prop is cavalier at k = 1). Anything
with depth is therefore modelled and rendered with `--shear=0.5`; asked for in words, a recess comes back
receding to a vanishing point. Only a genuinely flat thing hanging against the surface skips the mesh.

**THE Y-Z PLANE COLLAPSES TO A VERTICAL LINE, and a wall bracket is the object that proves it.** Only x
is drawn horizontally; y and z both feed the vertical. So any structure living in the plane of the wall's
depth — a plate, an arm reaching out of it, the diagonal stay under that arm, the lamp on its end — draws
as one vertical stack however truthfully it is built, and at 28 units that is a smudge. `prim_sconce`
turns the arm into X instead: a cantilever a smith would frown at, and the only version that reads. A
brace goes in the x-z plane for the same reason — in y-z it is invisible by construction, not merely
small. `prim_lamp`'s "nothing may point at the viewer" is this same law, one axis over.

**A COMPACT wall item needs `--margin`, not a scale flag.** `SLOTS.wall` is `seat: false`: the import does
not trim and re-seat, it scales the whole FRAME into 56x28. A prop's frame is thrown away and its object
re-seated; a wall item's frame IS its placement. So a niche or a stela is authored to fill the band, and a
sconce — one bracket on a broad wall — is given air in the render (`--margin=1.4`) and keeps it.

**ONE PRIMITIVE, FIVE RANKS: the bay is the same and only `--contents` changes.** The brief gives every
rank a `niche`, and a cut recess is a cut recess — so `prim_niche` takes `--contents` and a rank costs a
repaint rather than a model. Render it at the SLOT'S ASPECT (`--width=448 --height=224` for the 56x28
band): the default frame is the prop's 2:3, and a 2:1 object dropped into it is framed to the width, so
the import trims a strip and the tile arrives a third of its height.

What the nobleman's lamp niche cost, because it is the same lesson every time and it is about 28 PIXELS:

- **A lamp is the wrong shape for this band.** It is a shallow dish, four times as wide as it is tall;
  on the sill its whole silhouette IS the sill, and it rendered as a smear with a tail. Put on a foot it
  became a spoon. Three renders.
- **A flattened mass only reads BESIDE a tall one.** The merchant's bundle is a sphere squashed to 0.62
  and it works — next to two tall jars. A bay of nothing but flattened masses came back as two dishes
  and a dot, twice. The lamps keep their height and lose their radius instead.
- **The bay's height is not negotiable.** A lintel twice as deep, to give the brief's soot a surface to
  fan across, cost more bay than the soot was worth. The opening is 78% of the drawn height and that is
  the only part anyone can see. Soot goes in the PROMPT, on the lintel and the upper interior, where the
  mask already covers.

**CLOTH IS A FORMULA, and calling it unsolved was a guess rather than a measurement.** It sat in the
table above beside sand and loose scatter for as long as nobody tried it, and it is one of the EASIEST
things this projection draws: a hanging is nearly all front face, and the front plane is the one the
shear leaves alone. Its folds run vertically and draw as vertical ridges, so neither `prim_lamp`'s rule
about pointing at the viewer nor `prim_sconce`'s about running away from him ever comes up.

No simulation, and not as a shortcut. A solver gives a drape that depends on the frame it was baked on,
and a primitive that renders differently every run cannot be judged against its last roll. A cloth hung
from a bar is a sine along its width, pinched to nothing where it is tied and swinging widest at the free
hem — two lines, deterministic. Displace the folds in Y and not in X: under z + k\*y a fold pushed back is
drawn HIGHER, so the ripple lands as a shift in the surface and its shading does the rest, where a
sideways displacement only makes the sheet narrower and wider and reads as a flag with a scalloped edge.

**A FIGURE THAT READS AS A CHARACTER IS A BRIEF PROBLEM, NOT A PAINTING PROBLEM — and the only way to
find that out was to MEASURE.** The nobleman's ka-statue came back a cartoon character twice, and two
rounds of sharper wording bought nothing at all. What settled it was numbers, against the fifteen landed
props at the same rank:

| | the return | landed junior props |
| --- | --- | --- |
| paint inside the mask | 85.4% IoU | it is a real repaint of the scaffold, not a redrawing |
| top-8 colour share | 53.1% | 24–71% |
| saturation | 44 | 15–57 |
| interior brush texture (smooth %) | 58.2% | 4.5–60.6% |
| warmth against the slab | −22 | −4 to −74 |

Every one inside the rank's own distribution. **There is no gouache-versus-cartoon signal in the pixels**,
and three plausible explanations died on that table: that the generator had stopped repainting and started
drawing, that it was filling flat cel shapes, and that it had lost the brushwork. It had done none of
those.

What was different was the SUBJECT. It was the only tile in the set with a bare torso, arms, knees and
separated toes, and the only one with a portrait face — where the set's other figure, the merchant's
shabti, is mummiform, a wrapped column with a flat mask and no limbs at all, and landed on the first roll.

So the brief changed. A long kilt to the shins covers exactly where the modelled anatomy and the
highlights were living, and the flesh is left as unpainted limestone, which takes the large saturated skin
mass out of the picture. Colour stays only on the nemes and the collar. It landed on the next roll.

Two things to carry:

- **Measure before rewriting a prompt twice.** `tile-stats` covers the imported tile; the colour-share,
  brush-texture and mask-IoU checks above were thrown away after use, and re-deriving them cost less than
  either wasted roll.
- **A statue's flesh is the thing to watch.** Bare painted skin is a large saturated mass with no
  equivalent anywhere else in a rank, and at 56 units it is what makes a carved object read as a person.
  Clothe the figure or leave the stone bare.

The one measurement that DID fall outside was the light end: 39.7% over the clamp on the roll that landed,
against 4.5% or below for every other prop at the rank. Pale limestone needs `--brightness` — 0.76 here,
because 0.86 fixed the clamp and left the tile exactly level with the floor, which fails the
ten-luminance separation rule outright.

**NEVER ASK FOR WRITING — ASK FOR MARKS.** The nobleman's ledger board asked for "columns of small
hieratic figures in a scribe's quick hand" and came back a modern accounting sheet: columns headed
*Bookkeeping*, *Entries*, *Totals*, figures in Arabic numerals with decimal commas, and a struck-through
line reading *stewarded on 1986*. The prompt's own guard — "must not be drawn as hieroglyphs, this is
cursive bookkeeping" — is what steered it there.

The distinction that matters is not Egyptian versus not:

- **Hieroglyphs are PICTURES**, and a generator has pictures to draw. Every entry that asks for a
  cartouche band or a row of incised signs has come back with plausible signs, the nobleman's coffin
  included. These are safe and stay.
- **Hieratic is HANDWRITING.** There is no pictorial vocabulary to fall back on, so what arrives is
  handwriting in the only script the model actually writes, which is English in a copperplate hand.

So anything that would be cursive is specified as COUNTING instead — strokes in groups of five, the fifth
struck through the other four — with an explicit "no letters, no words and no numerals, in any language
or any alphabet". The merchant's tally board landed on the first roll asking for exactly that, and a
stroke belongs to no language.

**A WALL ITEM MUST NOT BE TOLD IT IS ON A WALL.** The same return put the entire frame under white
brickwork and pushed the magenta out to a border, because the prompt opened "a board hanging flat against
a wall". A wall item hangs on nothing in its scaffold; the band behind it is the renderer's job. Say the
magenta fills the frame to its edges and there is no wall, no floor and no surface behind the object —
and state the FRAME'S ASPECT while you are there, since a flat item has no scaffold to imply one and this
one came back square for a slot that is twice as wide as it is tall.

**A HOLE CANNOT BE A PRODUCT SHOT — give it a FLOOR with `--context`.** Every other scaffold is an object
on magenta, which is a thing you could pick up. A hole is an absence in a surface, and with the surface
missing the picture is equally a tank, a panel or a flat pattern. The priest's sacred pool proved both
readings in turn: handed water in a rim it came back a raised stone TANK, and told that nothing may stand
up it came back a flat plan diagram with no depth at all. Words cannot fix this, and three rolls went into
trying.

`--context=WxD` lays the rank's own floor round the object **with a hole of that size cut in it**, so the
floor's own edge is the lip of the opening. It is added AFTER `add_camera`, so the frame is unchanged, and
it is passed only on the render that is handed over — the mask and the footprint never see it, so no floor
reaches the tile and the paint that lands on it is discarded exactly as an invented background is.

Six things it took a good many renders to get right, and the last three are traps for anything built
after a primitive, not just for a floor:

- **CUT, not laid behind.** The first version was a solid slab with the pool drawn over it, which is a
  fudge: with no opening the floor is a backdrop, nothing in the geometry says "cut into", and the paint
  has nothing to trust. Four boxes round a rectangle are a rectangle with a hole in it, at no cost.
- **The opening is DECLARED, not measured off the object.** Cut to the object's own bounds it swallowed
  everything standing BESIDE the hole, and the paving exists precisely so that something can stand on it.
  `--context=1` still means "hole = object bounds", for an object that is nothing but its hole.
- **It has to RUN OFF ALL FOUR EDGES** — front, both sides and back. Ground that stops inside the picture
  is a plinth the hole is cut into, and with a shadow under it, something floating. The paving is laid
  nine slabs each way against a frame about seven units wide, so it leaves on every side including the
  near one, which runs down out of the bottom of the frame towards the camera.
- **`box` applies SCALE ONLY, and `shear` transforms MESH DATA.** So a box's location lives on the object
  transform where the shear cannot see it: sheared, it is slanted about its own centre and never lifted
  by `k*y`. A grid of forty slabs drew as forty slabs piled into one band beside the hole with nothing
  anywhere else, and joining them first does not fix it. Translate the MESH — `o.data.transform(
  Matrix.Translation(...))` — before shearing. Primitives never meet this because `join_all` bakes every
  part's world position into one mesh before the shear.
- **Sizes are in the primitive's METRES, and seating has already rescaled the object.** `--context=WxD`
  taken literally cut a hole a seventh of the size of the pool it belonged to. `seat_and_normalise` makes
  everything exactly one unit tall, so a shallow prop is scaled hardest — the basin is 0.16m tall and
  leaves seating 6.3 times bigger, 6.96 units wide. It now returns that scale, and `--context` multiplies
  by it.
- **The floor plane is the primitive's own z=0**, which seating has moved. Every primitive is authored
  standing on z=0, and seating lifts that plane by the amount it shifted the mesh — 0.70 of a unit for
  the basin. Paving left at z=0 lies that far under the coping, with the dark base filling the gap.
  `seat_and_normalise` returns where the origin landed for the same reason it returns the scale.
- **The ground must be SHEARED like everything else** or it renders as nothing: the camera is an
  orthographic front view, and a horizontal plane in it is edge-on.

The frame then has no magenta in it, so a context prompt should not ask for any.

What a hole needs beyond the floor is things that CROSS ITS EDGE. `prim_pit` never needed `--context`
because it has them already — a ladder over the near lip, its spoil on the paving outside — and that is
the whole of why it reads where a clean rectangle of water did not. Steps that start on the paving and
walk down through the waterline do the same job: they are not the hole, and they are what proves there is
one.

**Border it ALL THE WAY ROUND, the near side included.** The pool was built once with its coping open at
the front, on the reasoning that a rim across the near edge is what makes a hole read as a container. That
was the wrong lesson from the right observation — what made the early rolls read as a tub was the object
having an OUTSIDE, not its having a coping. Open at the front the water stopped in mid-air with nothing to
stop it, and a border broken on the one side facing the viewer reads as unfinished rather than as open.
The near length draws in front of the water and occludes its bottom edge, which is exactly what a coping
does.

**A HOLE is one parallelogram deep, and its dark is geometry too.** Under z + k*y the ground in front of
an opening draws lower as it comes toward the viewer, so it covers the shaft below the near lip: the whole
of a floor hole is the band between its two lip lines, `k*d`tall, and a far wall of exactly that height fills it. Anything modelled deeper is behind the floor tile the sprite is composited onto, and anything hung over the NEAR lip is never drawn at all. The VALUE is not promptable either — a scaffold in one flat colour hands the generator a rack with a grey gap in it — so a primitive marks the inside of a hole with the`VOID`material and`--void` paints it near-black before the repaint ever sees it.

**"Scatter" is about SAND, not about rubble.** A merchant's rubble is broken mudbrick, and a brick is a
box — the modeller was always able to make it. What a heap needs is height put at the BACK (under z + k\*y
mass behind the centre buys drawn height twice over), every piece rolled off level and not merely yawed,
and contact judged in the SHEARED projection: two pieces touching in Blender need not touch on the page.

**Gate.** For a scan, reject it before downloading if it is Roman or Ptolemaic (armour, drapery,
naturalistic faces), gilded, or a fragment. A Horus scan rendered perfectly and suited no rank in the
game, because it was Roman. Check the RANK too: a shabti is right for a merchant because it is the
humblest thing in the catalogue, and wrong for a pharaoh for the same reason.

## The laws of this projection

Every one of these was paid for with renders, and every one was written down only where it was FOUND —
inside whichever primitive's docstring happened to discover it. That is the wrong place for a law: nobody
reads two thousand lines of Python before modelling a prop, so each of these has been re-discovered at
least once. Stated here, with a pointer to the code that carries the reasoning and the numbers.

The projection is `drawn = (x, z + k*y)`, k = 0.7 for a floor prop and 0.5 for a wall item. Everything
below follows from that one line.

| law                                                                                                                                                                                                 | consequence                                                                                                                                                                                                                                                                                                                       | paid for in                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Only x is horizontal.** y and z both feed the drawn vertical.                                                                                                                                     | Anything that must read as reaching sideways runs in X: a bracket's arm, a lamp's spout, a chest's cord. A structure built in the y-z plane draws as a vertical stack however truthfully it is built.                                                                                                                             | `prim_sconce`, `prim_lamp`        |
| **The shear taxes DEPTH into height.** Drawn height is `max(z + k*y) - min(z + k*y)`, not the z extent.                                                                                             | A round foot 0.44 across adds 0.31 of drawn height and eats the width it just bought. `seat_and_normalise` then scales by height, so a deep prop lands narrow: the lamp stand came out 27 units of 56 while every fix made it taller. Flatten in y what only needs to read from the front.                                        | `prim_lamp`                       |
| **Negative y draws LOWER.** A part in front of another is drawn `k*y` down from where it is built.                                                                                                  | A face resting exactly on a collar hangs a hairline above it in the picture; a border level with a hem draws below the cloth and reads as a plinth. Set z for where the shear DRAWS a part, not for where it sits.                                                                                                                | `prim_mask`, `prim_hanging`       |
| **A hairline is a gap.** At 28 units a pixel of background between two parts separates them.                                                                                                        | Parts overlap by ~0.03 rather than butting. Five blocks butted edge to edge drew as a crown floating over an egg between two pillars.                                                                                                                                                                                             | `prim_mask`                       |
| **A SLIVER is a gap too — contact is not a boolean.** An overlap that is thin, at a corner, or on one face only reads as NO contact.                                                                 | The altar's spout overlapped its cornice by 0.025 at one corner, so the arithmetic said "attached" and the generator painted it as a separate cube flying beside the altar. Judge the overlap's AREA in the drawn view, not whether the boxes intersect. The fix is usually to delete the projecting part and extend an existing one instead. | `prim_market` (`altar`)           |
| **A VOID recess must stand PROUD of the surface it cuts**, never level with it and never under it.                                                                                                  | The altar's channel, "sunk flush" at 0.013 below the slab's top face, vanished into solid stone. It went unnoticed because the repaint still came back with a groove in it — the PROMPT describes one — which is this pipeline running backwards, with words doing the geometry's job.                                                       | `prim_market` (`altar`)           |
| **A shadow may only be moved in X.** A floor point `(x, y, 0)` draws at `k*y`, so an unshifted footprint touches its object for free; shifting it in y moves it `k*dy` vertically and nothing else. | Toward the viewer it leaves a crescent under the object with nothing above it — reads as hovering at ANY magnitude, which is why three rounds of tuning `--sun` failed. Away, it hides entirely.                                                                                                                                  | `sun_offset`                      |
| **`tilt` turns a part about the WORLD ORIGIN**, not its own centre — `box` ends with `transform_apply(scale=True)`, which applies the location too.                                                 | A bar 0.30 long at z=0.60 turned 60 degrees swings out of the frame. Build at the origin, turn, then place: that is `turn`. `tilt` is kept only because painted masters were rendered through it.                                                                                                                                 | `tilt`, `turn`, `prim_rubbleheap` |
| **A frame with black inside is one tile, however many kinds ask for it.**                                                                                                                           | The wizard's shrine, his niche holding no star, and his star shaft all drew as a black rectangle in a thin frame. What separates them is silhouette: a shrine is a cabinet ON the wall, so its plinth and cavetto are both wider than the box between them.                                                                       | `prim_wallshrine`                 |
| **Blender inverts a cone's side normals when the top radius is the larger one**, and it renders near-black.                                                                                         | Turning the cone over does not help — the normals turn with it. `recalc_outward` does. Material slots read correctly the whole time, so only a low-pitch `--preview` shows it.                                                                                                                                                    | `recalc_outward`, `prim_basin`    |
| **A mean taken over the wrong pixels lies.**                                                                                                                                                        | Measure a FIXED REGION, not "pixels above a threshold": as a tile darkens, fewer pixels clear the threshold and the mean of the survivors barely moves, so the knob reads as dead. Four tiles were mistuned this way — the pit's spoil over a sprite 43% black, the shrine's whitewash, the awning's cloth, sand on a pale floor. | `art/rebuild.sh`                  |
| **Reproduction identifies a master where a metric cannot.**                                                                                                                                         | No distance metric could pick the merchant's floor from its candidates (5.5 against 6.2 on luminance, noise). Importing each one and LOOKING beside the shipped tile settled it in one sheet per slot.                                                                                                                            | `art/README.md`                   |

## Step 1 — geometry

```
yarn render-prop --primitive=market --depth=0.4 --colour=#a49781 --floor=#6c6257
yarn render-prop --mesh=~/tile-previews/meshes/shabti.stl --copies=4 --colour=#a49781
```

**Gate: look at the MESH, with `--preview`.**

```
yarn render-prop --primitive=rubbleHeap --colour=#a49781 --preview=1 --width=600 --height=450
```

A perspective three-quarter view, unsheared. Every other render in this pipeline goes through the shear,
which answers one question perfectly and another not at all: it says exactly what the map will draw, and
nothing about whether the thing is BUILT. Under z + k\*y two parts that touch in the world need not touch
on the page, and two far apart in depth can land on top of each other — `prim_rubbleheap` records a crown
that hid behind the brick it was meant to sit on, and `prim_sconce` a brace that floated under its own
arm. Both were obvious the moment the mesh was seen from the side, and neither was visible head-on.

Judge contact, overlap and proportion here. Judge the TILE in the sheared render and on the floor, never
the other way round: a heap that looks well built in three-quarter can still draw as a smudge at 56 units,
which is what most of the docstrings in `renderProp.py` are about.

**Gate: the numbers it prints.**

```
object 0.33 wide 0.22 deep, aspect 3.53
lands at 24x84 map units at --scale=1   (a cell is 56, the explorer is 40x70)
```

Read that line against the explorer, who is 40x70, and against what the thing really is. A shabti is a
20cm figurine and landed 84 units — as tall as a man — and nobody noticed until it had been painted.
Fix it with `--scale` (how much of the slot it may fill) or `--depth` (how deep the object is, which is
what decides how much TOP the shear reveals and therefore how tall it lands).

Sizes already agreed, for calibration: the hand-painted market table is 56x43, the jar rack 56x50, the
water jar 56x75, the shabti set 56x43 at `--scale=0.8`.

**Gate: the calibration cube**, if you ever doubt the projection itself.

```
yarn render-prop --primitive=cube --shear=0.7
```

At `--shear=1.0` a unit cube must measure height/width 2.000, no row narrowing, and a top/front split of
exactly 50/50. It measured 2.006 and 50.0% on Blender 5.2.1. If the cube is right, the matrix is right,
whatever a mesh does afterwards.

## Step 1b — give it a SPIN

Every free-standing prop is rendered at an angle on the floor. `--spin` turns the object BEFORE the shear,
which is the one thing a prompt could never do — and the reason it is a step of its own rather than a
per-prop whim is what a room looks like without it.

**Square-on props read as a sticker sheet.** A room now holds two of them (`companionProps`) and its floor
holds scatter besides, and if every one of them faces the viewer dead-on the cell stops looking like a
place someone left things in and starts looking like items laid out on a page. The paving is on the grid;
anything else on the grid joins it. `prim_mat` recorded half of this rule for one prop — "a rug lying askew
of the grid cannot be read as part of the paving, where an axis-aligned one can" — and it generalises to
every object that is not fixed to a wall.

It is BAKED, per tile, at render time. Rotating the sprite at runtime is not the same thing and is not
available: `shear`'s own docstring is the reason — turning an object and then shearing it is a projection,
turning an already-sheared sprite is a skew, and the second one throws the whole file's geometry away.

### How much

| class                                                                    | spin   | why                                                                                                                                                       |
| ------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| free-standing on the floor — a chest, a table, a basket group, a hanging | 15–45° | Nothing anchors it to an axis. This is where the variety has to come from.                                                                                |
| against a wall — a stela, a false door, a linen press, a shelf           | 0–8°   | Its back belongs flat to the wall behind it. A false door turned 30° reads as furniture that has fallen over.                                             |
| round, or nearly — a basin, a lamp stand, a brazier, a column            | 8–22°  | Spin is nearly invisible on a body of revolution, so it costs nothing and buys a little on whatever is asymmetric: a spout, a dipper, a capital's fronds. |
| a hole in the floor — `pit`                                              | 0      | Its mouth is a parallelogram cut to the cell. Turned, it stops agreeing with the paving it is cut into.                                                   |
| a wall item — niche, sconce, mask, shaft, wall shrine, veil              | 0      | It is ON the band, at half shear. There is no floor for it to be askew of.                                                                                |

Pick a number per prop and WRITE IT DOWN in the prop's `rebuild.sh` line, the way every other flag is
recorded. Do not derive it from a hash inside the renderer: a default that silently decides geometry is
the one kind of change that invalidates a master without anyone touching the master.

### The one hard constraint

**A painted tile's spin can never change.** The mask is cut from the render, the master was painted over
that mask, and a spin moves every edge of it — so adopting this step means adopting it for work that is not
yet painted. The merchant's rank is painted square-on except for his mat (9°) and his hanging (45°), and it
stays that way unless a tile is re-rolled for some other reason anyway.

Two spins of the SAME object are two variants, not one tile: `tileVariants` picks between `<name>.png` and
`<name>-2.png` by position, so a kind can be square in one room and turned in another. That costs a repaint
per angle, so it is worth it only where a kind fills a lot of rooms.

## Step 2 — the scaffold, the mask and the shadow

THREE renders from IDENTICAL parameters. Only the first is ever seen by a person; the other two are what
the import puts back together — the mask cuts the repaint to the render's own alpha, and the footprint is
laid back UNDER it translucent (Step 4), so it shades the floor rather than replacing it.

```
yarn render-prop … --out=~/tile-previews/render-x.png                              # hand this over
yarn render-prop … --shadow=0 --background=none --out=~/tile-previews/render-x-obj.png
yarn render-prop … --only=shadow --background=none --out=~/tile-previews/render-x-shadow.png
```

The scaffold KEEPS its shadow, because it is what tells the generator which way the light falls. The
mask does not, because the repaint's own shadow is never usable — see Step 4.

All three share one frame to the pixel: the camera and the backdrop are both fitted to the object, and
`--only=shadow` removes the object only after they have been. So they composite without alignment.

**Gate: look at the scaffold.** It must already read as the object — brown, in palette, its top clearly
lighter than its front. A GREY render is unrecognisable: asked to repaint an untextured grey table, the
generator read it as a pair of wooden door panels and filled them with photographic burl. `--colour`
exists for that, and it applies to meshes as well as primitives.

**Gate: COUNT THE PIECES.** One command, and it is the only check here that catches a fault the eye and the
arithmetic both miss — the altar's spout intersected its cornice on paper and still drew as a cube flying
beside the altar:

```sh
magick ~/tile-previews/<name>-<tier>-obj.png -alpha extract -threshold 15% \
  -define connected-components:verbose=true -define connected-components:area-threshold=40 \
  -connected-components 8 null:
```

**One white component is the pass.** Two means a part of the prop is a separate island in the drawn view,
whatever the mesh does in three dimensions, and the repaint will paint it detached because that is what it
can see. Component 0 is the background; ignore it.

**15%, and the threshold is load-bearing.** At 40% this reported the priest's sconce — shipped art, and
correct — as two pieces, because it cuts the anti-aliased chain the lamp hangs from and severs a connector
two pixels wide. Run it over the whole folder at 40% and you get false alarms on every thin link in the
set; at 15% only the real one survived. The cost of the low threshold is the opposite error: a part joined
by a hairline passes the count and can still read as detached, which is what the SLIVER law is about. The
count is a screen, and the picture is still the judge.

A prop that is MEANT to be several pieces — a rubble heap, a scatter — fails this by design, so it only
applies where the object is one thing. Everything else is worth a re-seat before a roll is spent on it.

**Paint the PARTS, not just the prop.** `--colour` puts one hex over everything, and that is only half the
argument for having it: a market table in a single brown is a brown table with brown things on it, and the
repaint is left to work out from silhouette alone which lump is metal and which is grain. A primitive
calls `mark(obj, "<name>")` on each of its pieces and `paint` gives each name its own hex — `body` takes
`--colour`, and `metal`, `accent`, `cloth` and `void` take `--colour-<name>` or the defaults in
`PART_COLOURS`. Three colours on the market table turned a beige assembly into a timber table with a grey
balance standing on it and an ochre heap beside it, and the generator stops having to guess.

Two rules come with it. Every piece of a primitive that marks ANY of itself has to be marked, `body`
included — `join_all` merges slots by name and polygons keep their indices, so an unmarked piece inherits
whatever slot lands at index 0. And keep the part colours IN the rank's palette: they are a scaffold's
hint, not the finished art, and a bright one invites a bright repaint.

**Gate: no wide flat slab at floor level.** This projection draws a footprint 0.7\*depth below the thing
that made it, and a slab has almost no height to separate the two — so a slab's shadow is a copy of the
slab, directly beneath it, and the eye reads a two-tier plinth. `--sun` cannot help: it shifts the
footprint in depth, not out from under a shape as wide as the shadow it makes. The pillar's stone pad was
the case, and it was invented rather than asked for; the wedges the brief does name read better and cast
nothing.

**Gate: nothing floats.** Under this shear a copy set further back is drawn HIGHER, which is correct in
the world and reads as hovering on a 40-pixel tile. That is why `--copies` varies rotation and size
generously and depth barely at all.

## Step 3 — the repaint

The prompts still owed, already written against their scaffolds, are in [repaint-queue.md](repaint-queue.md). What follows is why they are shaped the way they are.

The prompt says NOTHING about projection. Geometry is settled; the generator is being asked for material
and texture only. The full format is in
[starter-art-prompts.md](../game-design/starter-art-prompts.md) §3a. Its three load-bearing parts:

- **Name every part.** "The large light rectangle is the TABLETOP seen from above, the band below it is
  the front edge, the four bars are legs. It is a table, not a door." The first repaint failed for want
  of that sentence.
- **Name the background as hex.** It drifts off `#ff00ff` to a dulled purple, which the keyer will not
  catch: measured at `#ba409c`.
- **Name the shadow as hex anyway, and say it is part of the picture** — `#3a342c`, "no pink or purple
  in it at all". The import throws the painted shadow away and seats the prop with a rendered one
  (Step 4), so this is no longer what holds the prop up. It stays because it is what stops the generator
  lighting the object as if it were floating in a white room: asked for no shadow at all, it lights the
  underside as brightly as the top.

**When a return gets the projection wrong, do NOT answer it by describing the right one.** This is the
expensive way to read the line above, and the priest's wall shrine cost two rolls proving it. Told the
view was raked, it drew a cabinet in full low-angle perspective, converging edges and a vanishing point.
Handed the brief's `THE VIEW: FLAT ORTHOGRAPHIC HYBRID` block instead, it drew a flat elevation with no
top faces, no inner floor and two matching doors — because that block says "NEVER show the inside of any
object" and "STRICT SYMMETRY", and this scaffold shows the inside of its opening and has deliberately
unequal doors. **That block is for generating a WHOLE TILE, where nothing else carries the view. In a
repaint it competes with the scaffold, and a rule in words beats a picture every time.** The third roll
said nothing about the view and held it. Both directions are the same mistake: the fix for a projection
that drifted is another roll of the SAME prompt, or a change to the model, never a paragraph about
geometry.

The one non-material line that has earned its place is about the CANVAS: an instruction to keep the
reference's frame and not re-compose it square. A square return is the failure the attachment cannot
prevent by itself, and naming the frame is not naming the projection.

**A SPARSE scaffold pulls the reference image's CONTENT into the picture.** The reference is attached to
carry the paint and the projection without spending words on either, and on three dense scaffolds it did
exactly that. On the pillar — one thin post with most of the frame empty — the generator filled the empty
half with the reference's crate and baskets. The mask cut them away and the prop was still usable, but
the fix is to reference a SURFACE rather than an object: `~/tile-previews/<tier>-wall-panel.png` is the
same brush and the same palette with nothing in it to copy.

**And the surface has to be PLAIN, which `<tier>-wall-panel.png` is only at some ranks.** The nobleman's
lamp niche was rolled against `junior-wall-panel.png` and came back as that panel REDRAWN — four registers
of procession, the same jar bearers, the same cattle and geese, the same banquet row, and no niche in it
anywhere. The advice above was written against the merchant's panel, which is mudbrick and whitewash and
has nothing in it to copy; the nobleman's is a figured mural and is the most content-rich image in the
set. Cut the plain part out and reference THAT — `junior-plaster.png` is the dado and the plaster below
the lowest register. Same brush, same palette, nothing to draw.

**Gate: compare it against the scaffold before importing.** Two failures are visible at a glance — an
invented floor (harmless now: the mask is the object alone, so the floor AND the repaint's idea of a
shadow are both discarded, and Step 4's `--seat` puts a rendered shadow back) and a part that has MOVED
(not harmless: the mask keeps the render's silhouette, so a shifted part leaves background colour inside
the shape).

**The two tells, both cheap, and one of them is checkable before you even open the file.**

_The size._ A return that EDITED the attached scaffold usually comes back at the SCAFFOLD's own aspect —
1686x2528 for a 2:3 prop, about 2912x1440 for a 2:1 wall item — and one generated FRESH comes back
2048x2048, square, whatever the scaffold was. The nobleman's palm column arrived square, and
`statue.webp`, the other prompted-only return in the repository, is 2048x2048 too.

**But square does NOT prove the attachment was ignored, and this tell has been overstated in these docs
once already.** The priest's altar came back 2048x2048 having faithfully edited the scaffold — the cones,
the loaves and even a floating spout the model really had were all in the right places. So a square return
is a reason to LOOK, not a verdict.

It is unusable either way, which is the part worth acting on: the import scales the master to the slot, so
a 1:1 master squashed into a 2:3 prop slot is a third out. Re-roll it, or re-frame it to the scaffold's
aspect before storing it as the master — but do not import it as it stands.

_A PINK HALO inside the silhouette._ This is what "a part that has moved" actually looks like, and it is
worth knowing by sight because it is not what anyone expects. Masking that square column to the modelled
one left a pink outline down both sides of the shaft and clipped the capital's fronds: the painted column
was NARROWER than the modelled one, so the difference between the two silhouettes filled with the
generator's background. The mask cannot help — it is the thing cutting the hole — and no despill, key or
brightness reaches inside a shape. An invented background OUTSIDE the object costs nothing; the same paint
one pixel inside the outline costs the tile.

Either tell means re-roll with the scaffold attached. Neither means edit what came back.

**A MULTI-PIECE scaffold's layout will not be respected, and that is survivable.** Asked to repaint a
spill of fourteen brick fragments, the generator returned forty of its own, spread over the frame in its
own arrangement. Nothing in the prompt got that obeyed. It did not matter: `--mask` cuts the return to the
render's own alpha, so brick material lands inside the MODELLED silhouettes and the shape, the footprint
and the shadow all stay ours — some fragments cut through the middle of a brick, which at 23 drawn units
reads as brick. The lesson is which half to insist on. For a SINGLE object the silhouette comes back
faithfully and a moved part is a real failure (the Gate above); for a scatter of many, ask for the
material and let the mask decide the arrangement.

**Take the return from the generator's DOWNLOAD, not from a pasted image.** Gemini returns 1686x2528
and a paste resizes it to 1334x2000 — a fifth of the resolution, gone before the import has looked at it.
The tile is only 56x84 so the numbers barely move, but the MASTER is what the repository keeps, and it
cannot be re-made later.

## Step 4 — import

```
yarn import-tile ~/tile-previews/render-x-painted.png --tier=starter --name=offeringTable --slot=prop \
  --filter=smooth --mask=~/tile-previews/render-x-obj.png --seat=~/tile-previews/render-x-shadow.png \
  --scale=0.8 --saturation=1.3
```

`--mask` cuts to the render's own alpha, which is the true silhouette; keying runs as well, and removes
the background pixels that sit INSIDE the mask where a part shifted.

**The seat goes down TRANSLUCENT, and its colour is the rank's own floor.** `--seat-opacity` defaults to
0.55: an opaque footprint throws away the paving, joints and grit underneath and drops a flat slab of dark
in their place. On the merchant's near-black floor nobody saw it; on the nobleman's, 62 luminance lighter,
every prop sat in a hole. And `make_shadow` paints the floor colour darkened, so `--floor` has to name the
rank being built — left at its default, four of the nobleman's props were seated in a patch of the
MERCHANT's floor.

**A hole and a hanging thing take NO seat at all.** `--shadow=0` on every render and no `--seat`: a wall
item hangs, so there is nothing under it, and a pit is an absence — `make_shadow` would lay a second dark
parallelogram in front of the first and the tile reads as two holes.

**`--seat` exists because a repaint will not paint a shadow.** Told in words, told again as a hex, told
that it is part of the picture, the generator paints an invented FLOOR across the footprint instead — and
a mask that included the footprint then preserved a slab of floor-coloured pixels where the seating
should have been. The shelf and the crate both came back with nothing at all below 35, where the props
painted by hand sit at 2% to 11%, and both read as standing on nothing.

So the shadow is taken off the generator entirely. It is geometry: Blender knows the footprint, the
projection draws it for free, and `--seat` lays it back under the art after the mask. That also makes it
the SAME shadow on every prop of a rank, which no amount of prompting would have.

**A prop that LIES ON the floor needs its shadow dialled down, not off.** A mat has no gap to cast
into, so the standard `--shadow=0.8 --sun=0.30` puts a dark copy of the sheet's own silhouette directly
beneath the sheet and reads as a second step. Turning it off is worse and the numbers say why: the sheet
then measures 2 against the floor's own value — the vanishing the floor-gap number exists to catch — and
its warmth runs to +46, because the shadow was the only neutral thing in the frame. `--shadow=0.55 --sun=0.12` passes both. Note the flag order in `art/rebuild.sh`: `renderProp`'s `arg()` returns the
FIRST match, so the mask's `--shadow=0` must precede any per-prop `--shadow` or the footprint lands back
inside the mask — measured at 156,707 opaque pixels against 116,661.

**`--sun` is how far the footprint is pushed toward the viewer, and it scales with HEIGHT, not depth.**
A shadow's offset is `height / tan(elevation)`: a tall thing throws its shadow far and a flat thing
throws it barely at all, and the object's depth has nothing to do with it. It was multiplied by depth for
a long time, and the numbers came out close to random — the brick spill, the flattest object in the set,
got the LARGEST offset of any prop at 0.240, because a wide flat spread normalised to height 1 becomes
enormous in y; the awning, which stands tall, got 0.027. Every prop needed its own `--sun` to undo that.

`seat_and_normalise` makes every object exactly 1.0 tall, so height is a constant and `--sun` is simply
the offset: ONE number for the whole set, which is what a single sun elevation means. 0.12 is the
default, and the only override left in `art/rebuild.sh` is `--sun=0`, which means a thing casts nothing —
a hole, a wall item, anything that hangs.

Note the coupling: the shadow is inside the sprite's trim box, so a longer one SHRINKS the object in its
slot.

**The shadow dilutes the warmth number.** It is the floor colour darkened, so it is far less saturated
than painted timber, and it drags a prop's mean toward neutral: the shelf measured +22 before it was
seated and +20 after, on the same paint. Grade warmth AFTER the seat, and expect a notch more
`--saturation` than a prop needed without one.

**Gate: `yarn tile-stats <file> --tier=… --slot=prop`.** Four numbers decide a prop, and each has a
target taken from the props already painted by hand, not from taste:

| number                                   | target                       | lever if wrong                                                   |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| lighter than the palette's object colour | under 2%                     | `--brightness` below 1                                           |
| gap against the floor it stands on       | 10 or more, either direction | `--brightness`, or a re-roll if it cannot reach without clipping |
| warmth against the slab                  | +22 to +25 for the merchant  | `--saturation`, 1.3 lands +24                                    |

**`--saturation` runs BOTH ways, and both ends have been hit in one rank.** The mat came back photoreal
straw at +51 and needed 0.6; the brazier came back near-achromatic at +1 and needed 2.2. A repaint being
cooler than the painted set is the common case, not the only one — measure before reaching for 1.3.

**`--saturation` scales the chroma that is THERE, so it cannot warm a prop the generator painted grey.**
The shelf came back at +10 and needed 1.45; the crate came back at +14 and needed none at all once its
invented floor was masked away. The brazier came back at **+1** and 1.4 moved it to +5 — it took 2.2 to
reach +19, and 2.7 to reach the band, by which point humble clay reads as brass. The lever is a multiple,
not an offset.

Which makes the wording the real fix, and the brazier's prompt is where it went wrong: it said "do NOT
use the warm ochre accent anywhere" and "the ash is grey", and got a grey OBJECT. Say what is grey
RELATIVE to the palette — the ash is the coolest thing in the picture, the clay is still `#a49781` —
because the palette's own object colours are warm and banning the warm end throws the rank away.
| drawn size | against the explorer's 40x70 | `--scale` |

A prop is graded on its LIGHT end only — its dark end is its own shadow, which is what seats it.

**Gate: composite it on its own floor with the explorer beside it.** Storybook →
`App/SiteMap/PropSheet`, or a scratch composite. Measurement cannot see busy, cannot see lonely, and
cannot see an object that is the right value and the wrong size. Every prop in this set that shipped
wrong shipped wrong because it was judged from the generation instead of from the tile.

## What this bought, honestly

The pipeline did NOT make the market table better: that prop took one roll to paint by hand and looked
good, so replacing it demonstrates nothing. It was the wrong prop to prove it on.

What it bought is visible on the statue. Seven rolls of prompting produced a ka-statue 84 units tall
that failed the floor check; one pass through the pipeline produced a shabti at 43 units that passes
every number. And it bought three things prompting could not do at all: a size that can be chosen
(`--scale`), an object that can be turned (`--spin`), and statues that come from museum scans instead of
from a model's idea of Egypt.
