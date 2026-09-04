# Making a prop — four steps, each with a gate

Every step here has a CHECK you can run before spending the next one. That is the whole design: the
expensive step is the repaint, and nothing should reach it that a measurement could have rejected.

Written after four merchant props were made by prompting alone and cost eighteen rolls. The pattern that
justifies the pipeline: a generator obeys the projection on BOXES (jar rack and market table, one roll
each once the wording settled) and refuses it on FIGURES and CURVES (ka-statue seven rolls, water jar
three). Geometry is not a thing to ask for. It is a matrix.

## Step 0 — decide what the object IS

From [tile-art-brief.md](../game-design/tile-art-brief.md) §2–§4: the kind, the rank, and what the rank's
row says it is made of. Also decide where the mesh comes from:

| the object is                             | mesh from                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| furniture, racks, chests, plinths, stands | a parametric primitive in `renderProp.py`                                            |
| statues, sarcophagi, canopic jars         | a museum scan — Scan the World, Smithsonian Open Access, Sketchfab, mostly CC0/CC-BY |
| cloth, heaps, rubble, scatter             | still unsolved; paint by hand or generate                                            |

**Gate.** For a scan, reject it before downloading if it is Roman or Ptolemaic (armour, drapery,
naturalistic faces), gilded, or a fragment. A Horus scan rendered perfectly and suited no rank in the
game, because it was Roman. Check the RANK too: a shabti is right for a merchant because it is the
humblest thing in the catalogue, and wrong for a pharaoh for the same reason.

## Step 1 — geometry

```
yarn render-prop --primitive=market --depth=0.4 --colour=#a49781 --floor=#6c6257
yarn render-prop --mesh=~/tile-previews/meshes/shabti.stl --copies=4 --colour=#a49781
```

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

## Step 2 — the scaffold, the mask and the shadow

THREE renders from IDENTICAL parameters. Only the first is ever seen by a person; the other two are what
the import puts back together.

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

**Gate: no wide flat slab at floor level.** This projection draws a footprint 0.7*depth below the thing
that made it, and a slab has almost no height to separate the two — so a slab's shadow is a copy of the
slab, directly beneath it, and the eye reads a two-tier plinth. `--sun` cannot help: it shifts the
footprint in depth, not out from under a shape as wide as the shadow it makes. The pillar's stone pad was
the case, and it was invented rather than asked for; the wedges the brief does name read better and cast
nothing.

**Gate: nothing floats.** Under this shear a copy set further back is drawn HIGHER, which is correct in
the world and reads as hovering on a 40-pixel tile. That is why `--copies` varies rotation and size
generously and depth barely at all.

## Step 3 — the repaint

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

**A SPARSE scaffold pulls the reference image's CONTENT into the picture.** The reference is attached to
carry the paint and the projection without spending words on either, and on three dense scaffolds it did
exactly that. On the pillar — one thin post with most of the frame empty — the generator filled the empty
half with the reference's crate and baskets. The mask cut them away and the prop was still usable, but
the fix is to reference a SURFACE rather than an object: `~/tile-previews/<tier>-wall-panel.png` is the
same brush and the same palette with nothing in it to copy.

**Gate: compare it against the scaffold before importing.** Two failures are visible at a glance — an
invented floor (harmless now: the mask is the object alone, so the floor AND the repaint's idea of a
shadow are both discarded, and Step 4's `--seat` puts a rendered shadow back) and a part that has MOVED
(not harmless: the mask keeps the render's silhouette, so a shifted part leaves background colour inside
the shape).

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
its warmth runs to +46, because the shadow was the only neutral thing in the frame. `--shadow=0.55
--sun=0.12` passes both. Note the flag order in `art/rebuild.sh`: `renderProp`'s `arg()` returns the
FIRST match, so the mask's `--shadow=0` must precede any per-prop `--shadow` or the footprint lands back
inside the mask — measured at 156,707 opaque pixels against 116,661.

**`--sun` is how far the footprint is pushed toward the viewer**, as a fraction of the object's depth.
0.10 matched the painted props for darkness and not for extent: at that offset the shear draws the
shadow almost entirely behind its own object and one pixel of it shows. 0.30 is the default and reads.
Note the coupling — the shadow is inside the sprite's trim box, so a longer one SHRINKS the object in its
slot; 0.55 cost the shelf and the crate visible size for a shadow no better than 0.30's.

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
| drawn size                               | against the explorer's 40x70 | `--scale`                                                        |

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
