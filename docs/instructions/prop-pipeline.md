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

## Step 2 — the scaffold and its mask

Two renders from IDENTICAL parameters, one on magenta to hand over and one cut-out to mask with:

```
yarn render-prop … --out=~/tile-previews/render-x.png
yarn render-prop … --background=none --out=~/tile-previews/render-x-mask.png
```

**Gate: look at the scaffold.** It must already read as the object — brown, in palette, its top clearly
lighter than its front. A GREY render is unrecognisable: asked to repaint an untextured grey table, the
generator read it as a pair of wooden door panels and filled them with photographic burl. `--colour`
exists for that, and it applies to meshes as well as primitives.

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
- **Name the shadow as hex, and say it is part of the picture.** Told only in words, the generator
  painted the shadow in its own background colour — `#b9419d` shadow against `#ba409c` background,
  identical — so the render's shadow vanished and the mask preserved a slab of purple. `#3a342c`, and
  "no pink or purple in it at all".

**Gate: compare it against the scaffold before importing.** Two failures are visible at a glance — an
invented floor (harmless, the mask removes it) and a part that has MOVED (not harmless: the mask keeps
the render's silhouette, so a shifted part leaves background colour inside the shape).

## Step 4 — import

```
yarn import-tile ~/tile-previews/render-x-painted.png --tier=starter --name=offeringTable --slot=prop \
  --filter=smooth --mask=~/tile-previews/render-x-mask.png --scale=0.8 --saturation=1.3
```

`--mask` cuts to the render's own alpha, which is the true silhouette; keying runs as well, and removes
the background pixels that sit INSIDE the mask where a part shifted.

**Gate: `yarn tile-stats <file> --tier=… --slot=prop`.** Four numbers decide a prop, and each has a
target taken from the props already painted by hand, not from taste:

| number                                   | target                       | lever if wrong                                                   |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| lighter than the palette's object colour | under 2%                     | `--brightness` below 1                                           |
| gap against the floor it stands on       | 10 or more, either direction | `--brightness`, or a re-roll if it cannot reach without clipping |
| warmth against the slab                  | +22 to +25 for the merchant  | `--saturation`, 1.3 lands +24                                    |
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
