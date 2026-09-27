# The repaint queue

Every prompt still owed to the generator, with what to attach to each. One heading per tile, in the order
worth doing them. Entries are DELETED as they land, so the length of this file is the size of the backlog;
what each finished tile ended up needing is recorded in its `art/rebuild.sh` line instead.

**`yarn repaint <key>`** does the fetching for you: it copies that entry's prompt to the clipboard and
reveals both attachments in the Finder, ready to drag. `yarn repaint` with no argument lists every key
still owed. It parses THIS file, so a prompt edited here is the prompt that gets pasted — there is no second
copy anywhere.

The loop stays manual on purpose. Driving Gemini's web UI is against Google's terms, and the API bills per
image; neither is worth it for two dozen tiles, so the paste is done by hand and the script only saves the
searching — the right block out of nine hundred lines, and two files out of a folder of two hundred renders.

**A 2048x2048 SQUARE RETURN MEANS THE SCAFFOLD WAS NOT USED — re-attach it and roll again.** An edited
scaffold comes back at the scaffold's own aspect, 1686x2528 for a prop and 2912x1440 for a wall item; a
generation made from the prompt alone comes back square. The nobleman's three Anubis tiles all came back
2048x2048 and all three were re-staged into three-quarter isometric, which is what a prompt gets when
there is no geometry under it — `prop-pipeline.md`'s opening says a generator refuses this projection,
and the scaffold is the only thing that has ever made it obey.

A square return is also unimportable as it stands, whatever it looks like: the import scales the master
into the slot, and a 1:1 master in a 2:3 slot is a third out.

**Which is why every prompt here now opens by naming its FRAME** — portrait two by three for a prop,
landscape two by one for a wall item, "exactly as the reference", and do not re-compose it square. It is
the one non-material sentence a repaint may carry: naming the canvas is not naming the projection, which
is what the scaffold is for. The priest's naos is why it is in all of them rather than in thirteen — a
fresh chat with both files attached still answered from the words alone, and the sentence landed the very
next roll on the scaffold. A new entry gets the line too.

**How to use one entry.** START A NEW CHAT — a thread that has already done a tile is the commonest
cause of a re-roll, and `prop-pipeline.md` measures why, under "Working the loop". Then attach the two images it names, paste the fenced block verbatim, take the result
from the generator's DOWNLOAD (not a pasted image — a paste resizes 1686x2528 to 1334x2000 and the master
is what the repository keeps), and drop it in `~/Downloads`. The import line under each block is what turns
it into a tile; it is recorded here so the flags are not re-derived, but the brightness and saturation in it
are placeholders until the return is measured against the rank's floor with `yarn tile-stats`.

**Why every block repeats itself.** A block is the unit of use, so each one carries the whole prompt — the
background hex, the shadow hex, the do-not-move sentence. The rules behind them are in
`prop-pipeline.md` Step 3 and are not repeated here; the reason they appear in every block is that you
paste one block, not a block plus a preamble.

**The two attachments, and why they are those two.**

1. **The scaffold** — `~/tile-previews/<name>.png`. This is the geometry, the projection and the rank's
   colour, already correct. The prompt says nothing about any of it.
2. **A material reference** — `~/tile-previews/<tier>-plain.png`. NOT `<tier>-wall-panel.png`. The panel is
   the trap `prop-pipeline.md` records twice: a sparse scaffold pulls the reference's CONTENT into the
   picture, and the nobleman's lamp niche came back as his wall panel redrawn — four registers of
   procession and no niche in it anywhere. The priest's panel is worse, being solid hieroglyph columns.
   `<tier>-plain.png` is a crop of that rank's own floor: same palette, same brush, nothing in it to copy.

**What NOT to fix in a prompt.** An invented background and an invented shadow are both harmless — the mask
is the object alone, so both are discarded and Step 4 seats a rendered shadow instead. A part that has
MOVED is the failure to look for. For a scatter of many pieces the arrangement will drift anyway and that
is fine: ask for the material and let the mask decide the layout.

**STATUES ARE THE EXCEPTION, and only statues.** Every other entry here says keep every edge, because
every other scaffold hands over the object's real silhouette. A figure's does not: boxes cannot describe a
carved contour, and a generator will not leave one alone anyway. So a statue's scaffold is an ENVELOPE —
roughed-out stone, deliberately a little fat — and its prompt splits the difference explicitly: hold the
projection, the pose, the placement and the overall size; carve the contour freely; and cut INWARD only,
so the deviation lands inside the mask instead of being clipped by it. See `prim_statue`, and
`expert/statue` for the worked example.

**THE ONE SENTENCE EVERY OTHER ENTRY ENDS WITH DOES TWO JOBS, and dropping it costs you the second.**
"Keep every edge, every proportion and every silhouette exactly as in the reference image … and do not
change the angle it stands at" holds the SHAPE and the ROTATION together. Cut it to free a statue's
contour and the rotation goes with it: the first Anubis came back beautifully carved and completely
re-staged, its plinth swung round to recede into the distance in a three-quarter isometric view. The art
was excellent and the tile was unusable.

So a shape-free prompt has to nail the rest DOWN, in the words the general sentence used to cover for
free — the frame's aspect, that there is no perspective, which way the long axis of the base runs, which
way the figure faces, and that placement and size are unchanged. Releasing one constraint means writing
the others out explicitly, because they were never separate sentences.

**AND THE ENVELOPE HAS TO SAY WHICH SLAB IS THE ANIMAL.** The second Anubis held the frame, the
projection and the facing — every rule above worked — and still came back wrong: the jackal had shrunk to
a third of its size and the plinth had grown into a tall pedestal. Cause was the model, not the words. A
rough slab of body sitting flush on a rough slab of plinth, both painted the rank's one stone, is a single
mass, and the generator resolved it by reading the body AS pedestal and carving a small jackal on top.

`prim_statue` now marks the figure a different PART from its base, so the scaffold arrives told apart —
`prim_niche`'s rule, and the reason a marked primitive marks all of itself. This is the failure mode a
loose prompt invites: the freer the paint, the less ambiguity the geometry may contain.

**AND A HUMAN FIGURE'S BARE FLESH IS THE THING THAT BREAKS THE STYLE.** The nobleman's ka-statue came
back a cartoon character twice and two rounds of sharper wording changed nothing, because the wording was
never the fault: measured against the fifteen landed props at that rank, the return sat inside the
distribution on mask overlap, colour-share, saturation and brush texture alike. What was different was
the subject — the only tile in the set with a bare torso, arms, knees and separated toes. Painted skin is
a large saturated mass with no equivalent anywhere else in a rank, and at 56 units it is what makes a
carved object read as a person. Clothe the figure, or leave its stone unpainted. The roll after that
landed. `prop-pipeline.md` has the numbers.

---

## Priest — three

His CHAMBER props, and none of them existed as a model until now: his rank had nothing but the veil and
the hanging. Some are new `--contents` variants and some are geometry another rank already proved, which
is the difference between them worth knowing — a variant's silhouette is his, a reused one's is not, and
the prompt is all that makes the reused ones his rank's. His `tallyBoard` is here too, and it is the only
FLAT thing in the section: no mesh, no mask, straight to the generator.

### `master/statue` — a gilded Osiris colossus

**Attach:**

1. `~/tile-previews/statue-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a colossal statue of OSIRIS, cut from one block of black granite. The tapering block on his
head is his ATEF CROWN, a tall conical cap. The block across his hips is a KILT. He holds a CROOK and a
FLAIL crossed over his chest — draw them as two short staffs, and they must not stand out past the edges
of his own shoulders.

IT IS A CARVED OBJECT AND NOT A PERSON, and this matters more than any other line here. Egyptian statuary
is BLOCK-CARVED: flat planes, hard arrises, and the figure never leaves the block it was cut from. His
upper arms stay joined to his sides, the crook and flail stay flat against his chest, the stone between
his advanced leg and the block behind it is never cut through, and there is no daylight anywhere between
a limb and the stone behind it. Nothing is undercut and nothing projects past the front edge of the
plinth.

NO ANATOMY IS MODELLED: no muscle bellies, no nipples, no navel, no tendons, no separated toes, and not
one highlight on a shoulder or a knee — a highlight there means a body is being painted, so paint the flat
plane instead. He has no expression, no gesture and no lifelike proportions. This is a cult object with a
fixed face, not a character and not an illustration of a man.

The stone is one material throughout, the figure and the plinth alike. Gilding is a flat colour laid over
that stone, not a skin the figure wears.

THE REFERENCE IS A ROUGHED-OUT BLOCK. It is stone cut to the pose and deliberately left fat, and your job
is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the contour of the figure himself, and only by CUTTING. A shoulder gets its
slope, a calf its front arris, a jaw its plane. These are chisel cuts on a block, not modelling in clay —
every mass stays square-shouldered and stays recognisably the mass it already is.

CARVE INWARD ONLY. Every cut goes INSIDE the rough shape you were given — take stone away, never add it
outside the block's outline. Nothing may end up further left, right, higher or lower than the rough shape
reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the reference image exactly and do not reason about them: whatever it does with verticals, with top faces, with depth and with which way the object is turned, do the same. It is not a photograph and not an isometric view, and it is not for you to correct into either. This is the ONE thing about the picture you are given rather than asked for.
3. HE STANDS, facing the viewer, one leg advanced. Both legs stay separate — do not merge them into a column or a mummy wrap.
4. THE PLINTH IS EXACTLY AS THE REFERENCE DRAWS IT — its angle, its rotation, how much of its top shows, how its edges run. Do not swing it round, do not flatten it, do not straighten it.
5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

GILDED: gold leaf over black granite, a flat warm ochre-yellow, worn through to the dark stone on the
shins, the forearms and the crown's front edge — every surface a hand reaches. His face and hands are left
BARE GRANITE, polished near-black, which is how Osiris is finished and the one contrast that carries him.
The crown is gilded with a band of blue-green faience at its base. The plinth is black granite with a
gilded cartouche band along its front.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

You are re-carving a shape, not re-staging a photograph. If the plinth ends up pointing away from the viewer, the projection is wrong however good the figure is.

ANYTHING DRAWN OUTSIDE THE ROUGH SHAPE IS CUT OFF, fingers and toes included, and a clipped limb reads as an amputation. Nothing is added below the plinth either — no ground, no shadow, no floor.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=standing --spin=-12 --colour=#d9a93f --colour-figure=#8a7434 --floor=#57534b
yarn import-tile art/masters/props/master/statue.webp --tier=master --name=statue --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/sarcophagus` — gold-inlaid stone, cartouche band

Upright, for the reason `junior/sarcophagus` records. The brief asks for the LID AJAR at this rank and
that is PAINT here, not geometry: a lid slid back is two pixels at slot size, so it is a dark seam down
one side rather than a displaced mass. If it ever needs to be real, `prim_statue` takes `--open`.

**Attach:**

1. `~/tile-previews/sarcophagus-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. No perspective and no vanishing point: verticals stay vertical, horizontals stay horizontal.

The object: a STONE SARCOPHAGUS, standing upright against its own plinth, seen from the front. It is
body-shaped — narrow at the head, widest at the shoulders, tapering to the feet. The raised panel at the
top is the FACE. The two bars across the chest are the ARMS, crossed. The slab it stands on is the PLINTH.

It stands. Do not lay it down.

Polished black granite, close-grained, INLAID with gold: a broad CARTOUCHE BAND across the chest under the
arms, its oval frames filled with hieroglyphs in gold and blue-green faience, and narrow gold strips down
the length of the case dividing it into panels. The face is carved granite left bare and polished, its
eyes inlaid with alabaster and dark lapis. The crossed arms hold a gold crook and flail in low relief.

THE LID IS AJAR: draw a dark seam running down the case a little off centre, where the lid has been slid
back and no longer meets the shell, with a hairline of shadow inside it. The lid is not lifted off and
nothing of the inside shows but that dark line.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

THE REFERENCE IS A ROUGHED-OUT BLOCK, NOT A FINISHED COFFIN. It is timber cut to the shape and left
square, and your job is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the OUTLINE of the coffin itself. An anthropoid coffin is narrow at the
head, widest at the shoulders and tapers to the feet, and every edge of it is a curve — cut all of that.
The head is a rounded mass and not a cube, the shoulders slope, the arms are rounded limbs lying on the
chest. If a face is drawn on a square plaque and the arms are drawn as rectangular bars, the block has
been painted rather than carved.

CARVE INWARD ONLY. Every curve you cut goes INSIDE the rough shape you were given — take timber away,
never add it outside the block's outline. Nothing may end up further left, right, higher or lower than
the rough shape reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the reference image exactly and do not reason about them: whatever it does with verticals, with top faces, with depth and with which way the object is turned, do the same. It is not a photograph and not an isometric view, and it is not for you to correct into either.
3. IT STANDS UPRIGHT, propped against its own plinth, facing the viewer. It does not lie down and it does not lean away.
4. THE PLINTH IS EXACTLY AS THE REFERENCE DRAWS IT — its angle, its rotation, how much of its top shows, how its edges run. It is a SLAB the coffin stands on and not a flat panel behind it: do not swing it round, do not flatten it, do not straighten it, and do not lose the top face it shows you.
5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

You are re-carving a shape, not re-staging a photograph.


No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=mummiform --spin=14 --colour=#d9a93f --colour-figure=#8a7434 --floor=#57534b
yarn import-tile art/masters/props/master/sarcophagus.webp --tier=master --name=sarcophagus --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/niche` — an offering niche, gilded surround

**Attach:**

1. `~/tile-previews/niche-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a recess cut into a wall, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: an offering niche with food set in it. The frame around the opening is the SURROUND — jambs,
lintel and sill; inside, the shallow oval dish is a PLATTER, the three domed shapes on it are LOAVES of
bread, and the tall stoppered vessel standing in a ring at the right is a WINE JAR.

The surround is GILDED: gold leaf laid over the dressed stone, a flat warm ochre-yellow, worn through to
the grey granite beneath along the sill's front edge and at the lintel's corners. The recess behind is in
shade. The platter and jar are pale alabaster; the loaves are baked ochre-brown and floury.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold niche --contents=offering --shear=0.5 --width=448 --height=224 --sun=0
yarn import-tile art/masters/props/master/niche.webp --tier=master --name=niche --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `master/sconce` — a bronze mirror sconce

**Attach:**

1. `~/tile-previews/sconce-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a mirror sconce on a wall. The upright plate at the left is fixed to the WALL; the bar reaching
right is the ARM; the diagonal below it is a BRACE; the large disc standing upright at the arm's end is a
polished bronze MIRROR; the small vessel in front of the disc is the LAMP, and the nub above it the FLAME.

The bracket is dark bronze with a green-black patina. The mirror disc is a warmer, paler bronze, rubbed
bright in the middle and tarnished round its rim — it is a matte metal disc, not a reflective surface, and
nothing is reflected in it. The lamp is alabaster, sooted at its lip; the flame is a small ochre-orange
tongue.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold sconce --contents=mirror --shear=0.5 --width=448 --height=224 --sun=0 --margin=1.4
yarn import-tile art/masters/props/master/sconce.webp --tier=master --name=sconce --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `master/mask` — a gilded funerary mask

**Attach:**

1. `~/tile-previews/mask-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a gilded funerary mask hanging on a wall. The rounded mass behind and above is the NEMES
HEADDRESS; the oval in front of it is the FACE; the two bars flanking the face are the headdress's LAPPETS
hanging down at the sides; the small block below the chin is the false BEARD; the wide band at the bottom
is the broad COLLAR the mask sits in.

The face is gold leaf — a flat warm ochre-yellow, evenly laid, with the brows and eye rims inlaid in dark
blue lapis. The lappets and the headdress are STRIPED: alternating bands of gold and deep lapis blue
running down them, the stripes narrow and even. The collar is banded faience in blue-green, dark blue and
gold. The beard is dark blue lapis.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine anywhere on it.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold mask --shear=0.5 --width=448 --height=224 --sun=0 --margin=1.2 --colour=#d9a93f
yarn import-tile art/masters/props/master/mask.webp --tier=master --name=mask --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `master/hanging` — a gold-shot curtain with a weighted hem

**Attach:**

1. `~/tile-previews/hanging-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a heavy curtain on a pole between two posts, standing at an angle on the floor. The wide sheet
in deep vertical folds is the CURTAIN; the bar across the top is the POLE; the uprights are POSTS; the
blocks over the pole are TIES; the scalloped lower edge is the HEM, and the four small beads hanging below
it are WEIGHTS sewn into it.

Fine linen shot through with gold thread: a pale warm ground with narrow gold lines woven down it, catching
nowhere and lying flat. The folds are deep and the shadow between them warm brown. The weights are gilded
lead beads, a flat ochre-yellow. The pole and posts are black granite.

Gold here is a flat colour, not a metal: no highlights, no shine, no sparkle.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold hanging --contents=gold --spin=33 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/hanging.webp --tier=master --name=hanging --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/lamp` — a gilded lamp tree

**Attach:**

1. `~/tile-previews/lamp-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a LAMP TREE with three lights. The flared cone on the floor is its FOOT, the upright above it
the STEM, and the horizontal bar across the stem the ARM. At each end of the arm and at the top of the
stem is a shallow SAUCER; over each saucer is a domed SHADE; between saucer and shade is a small nub of
FLAME. The centre light stands higher than the two on the arm.

Count them: there are three lights.

Gilded bronze — gold leaf over the metal, a flat warm ochre-yellow, worn through to dark green-black
patina along the arm's upper edge and round the foot's rim. Each saucer is sooted black where its wick
sits. The shades are pale alabaster, faintly banded, and slightly warmer where the flame is behind them.
The flames are small ochre-orange tongues, matte, with no glow around them and no light thrown on the
metal.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold lamp --contents=tree --spin=9 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/lamp.webp --tier=master --name=lamp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/pillar` — a gilded column with a cartouche band

**Attach:**

1. `~/tile-previews/pillar-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a dressed COLUMN, running from the floor up out of the top of the picture, tapering very
slightly as it rises. The three collars round it are BANDS. The middle band is the widest and is the
CARTOUCHE BAND.

Black granite, close-grained and faintly flecked, dressed smooth. The bands are GILDED — gold leaf over
the stone, a flat warm ochre-yellow, worn through to the granite along their lower edges. The cartouche
band carries a row of oval CARTOUCHES with hieroglyphs inside them, cut into the gold and filled with
blue-green FAIENCE. The shaft between the bands is plain polished stone: no relief, no writing.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold palm --contents=banded --spin=-7 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/pillar.webp --tier=master --name=pillar --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/chestProp` — a gilded chest with a cavetto lid

**This is the TREASURE NODE's art, not a room's furniture.** No pool authors a chest any more — a
chest that opens and a chest that is furniture cannot be the same picture — so `yarn art-census` counts
zero rooms for it and every treasure room in the rank draws it beside its marker.

**Attach:**

1. `~/tile-previews/chestProp-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a CHEST on four short feet. The band round its top is where the LID meets the body. Above that
the three slabs stepping out one over the other are a CAVETTO CORNICE forming the lid. The sunken
rectangle on the front face is an INLAID PANEL.

Gilded throughout — gold leaf over wood, a flat warm ochre-yellow — worn through to dark timber along the
cornice's steps, on the front lip and at the corners of the feet, which is where a chest is handled. The
lid band is a darker gold. The inlaid panel is set with a CARTOUCHE in blue-green faience and dark blue
lapis, its hieroglyphs picked out in the surrounding gold.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine. There is no cord and no
seal on this chest.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold sealedChest --contents=cavetto --spin=25 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/chestProp.webp --tier=master --name=chestProp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/jarRack` — gold vessels and alabaster ointment jars

**Attach:**

1. `~/tile-previews/jarRack-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a treasury rack holding FOUR VESSELS, and no two are the same shape. The two uprights and two
rails are the RACK. From the left: a squat lidded JAR with a small knob on its lid; a tall footed VASE — a
round belly on a stem standing on its own foot, with a long neck; then two short wide-shouldered OINTMENT
JARS with flat lids.

The squat jar and the footed vase are GILDED — gold leaf, a flat warm ochre-yellow, worn through to dark
metal on the vase's foot rim and along the jar's lid joint. The squat jar's lid joint is sealed with a
band of grey clay stamped with a mark.

The two ointment jars are pale creamy ALABASTER, faintly banded, translucent-looking at their thin rims,
dulled with dust. They must read as stone and not as gold — that difference is the point of the group.

The rack is black granite.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold jarrack --contents=vessels --spin=-16 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/jarRack.webp --tier=master --name=jarRack --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/shrine` — a gilded shrine, Anubis couchant on the lid

**Attach:**

1. `~/tile-previews/shrine-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a SHRINE with a figure lying on its roof. The box standing on a plinth is the shrine; the slab
stepping out over it is a CAVETTO CORNICE; the dark opening in its front is the shrine's inside, in deep
shade. Lying along the top is ANUBIS as a recumbent JACKAL — the long low mass is his body, the upright
block at the left his chest, the shape above it his head with its MUZZLE reaching left and two pointed
EARS standing up, and the short mass hanging over the right end is his TAIL.

The jackal is the subject: he is lying down, alert, head up, facing left along the roof.

The shrine is gilded — gold leaf over wood, a flat warm ochre-yellow — worn through to dark timber on the
cornice's step and along the plinth's front edge. The jackal is BLACK: not dark gold but black resin over
wood, matte and slightly dusty, the way Anubis is always finished, with a thin gold collar at his neck and
gold lining his ears' insides. His eyes are two small marks of gold and dark blue lapis.

The opening is a HOLE and must stay black — paint darkness in it, never a wall, a floor or a back panel.
No pink and no purple anywhere in it.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold shrine --contents=couchant --spin=18 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/shrine.webp --tier=master --name=shrine --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/offeringTable` — tribute laid in state

The geometry is the NOBLEMAN's laid table, unchanged, and so are the three below. What makes these his is
the prompt alone — a variant was only modelled where the brief asks for a different object, and a table
laid with better things is still a laid table.

**Attach:**

1. `~/tile-previews/offeringTable-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a low TABLE with tribute laid out on it. The slab on four legs is the table. Standing at the
back is a stoppered JAR in a ring; the flat round in the middle is a PLATTER with three loaves of BREAD on
it; the two small drums at the right are CUPS.

The table is gilded — gold leaf over wood, a flat warm ochre-yellow — worn to dark timber along the top's
front edge and at the feet. Its legs end in carved BULL'S HOOVES. The platter and the cups are pale
creamy alabaster with thin gold rims. The jar is alabaster too, its stopper sealed with grey clay stamped
with a mark. The loaves are baked ochre-brown and floury, the one plain thing on a table of treasure.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold market --contents=laid --spin=-21 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/offeringTable.webp --tier=master --name=offeringTable \
  --slot=prop --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/brazier` — gold, burning low

**Attach:**

1. `~/tile-previews/brazier-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a shallow DISH on three splayed legs, burning low. The three legs are a TRIPOD; the wide
shallow vessel is the dish; the low mass inside it is EMBERS; the small nub above them is a FLAME; the bar
laid across the rim is an unburnt STICK.

Gilded bronze — gold leaf over the metal, a flat warm ochre-yellow — worn through to dark green-black
patina on the legs' feet and all round the dish's rim, where the heat has taken it. A band of HIEROGLYPHS
runs round the outside of the dish, cut into the gold and filled dark. The dish's inside is sooted black.
The embers are a dull ember red-orange, matte, brightest at the centre and dark at the edges; the flame is
a small ochre-orange tongue with no glow around it and no light thrown on the metal. The stick is charred
black at one end and pale timber at the other.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold brazier --lit=1 --spin=14 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/brazier.webp --tier=master --name=brazier --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/basin` — an alabaster libation basin, gold rim

**Attach:**

1. `~/tile-previews/basin-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a shallow BASIN on a stand. The three splayed legs and the drum they meet are the STAND; the
flared open vessel above it is the basin; the ring round its top edge is the RIM; the dark disc inside it
is WATER.

The basin is pale creamy ALABASTER, faintly banded, its wall thin enough at the rim to look translucent,
dulled with dust in the hollow of the flare. The rim ring is GILDED — gold leaf, a flat warm ochre-yellow,
worn through to stone at the front where it is touched. The stand is black granite with a gold collar on
the drum.

The water is a still dark surface, not a hole: a flat dark green-grey, lighter where it meets the rim, with
a pale line of dried salt on the stone just above the waterline.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold basin --contents=bowl --spin=-9 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/basin.webp --tier=master --name=basin --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/shelf` — a tribute shelf of gold vessels and inlay boxes

**Attach:**

1. `~/tile-previews/shelf-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: SHELVING with treasure stacked in it. The frame with a shelf across its middle is the unit. In
the upper opening stand two round-bellied VESSELS with short necks. In the lower one are two stacked flat
BOXES at the left and a taller drum-shaped JAR at the right. Lying on the top course is a flat slab, a
BOX LID.

The frame is black granite, close-grained, dressed smooth, and the openings behind the objects are in deep
shade. The two vessels are GILDED — gold leaf, a flat warm ochre-yellow, worn to dark metal on their
shoulders. The stacked boxes are dark timber with lids of blue-green FAIENCE inlay set in gold strips, and
the deep blue in the pattern is lapis. The drum jar is pale creamy alabaster. The lid on the top course is
gilded, with a cartouche cut into it and filled dark.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold shelf --spin=17 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/shelf.webp --tier=master --name=shelf --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

---

## Gods — sixteen

The rank's whole tomb, and the largest block left in the file: two figures, ten chamber props and five
wall items. It was the biggest gap in the census by a distance — 257 rooms — and until now only the
figures and the wall items were written down, which is the reason this section is where the file grew.

**Four of the wall items contain a VOID**: a black opening that must come back black. The shrine, the
niche and the shaft are the same rectangle if their frames are not what tells them apart, so the frame is
what each prompt names first.

**And this rank asks for things a prop cannot be.** Its brief is full of absences — a slab with no
supports, lights with nothing holding them, a shaft with no bottom, a column of light — and there is no
geometry for any of that, because a scaffold's job is the projection and the pose. So three of these
prompts PAINT A PART OUT: the reference renders the stem, the arm or the legs so the rest is placed
correctly, and the prompt says to paint them the plain magenta of the background. The import keys magenta
BEFORE it masks, so a part painted out arrives as a keyed hole rather than as stone. It also means those
tiles fail Step 2's piece count by design — that gate is for a prop meant to be one thing, and these are
not.

**`wizard/crystal` is BLOCKED**, alone in this file, on a primitive nobody has written. Its entry says so
and carries no prompt; `yarn repaint` therefore does not list it, and the twenty-seven rooms behind it
are the best argument for the next piece of geometry.

### `wizard/statue` — Ra-Horakhty, falcon-headed, standing

**Attach:**

1. `~/tile-previews/statue-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: RA-HORAKHTY, a standing figure with a falcon's head, cut from one block of calcite. The
tapering block above his head is the SUN DISC he wears — carve it round, and it sits on the crown of his
skull rather than floating over it. The block across his hips is a KILT.

IT IS A CARVED OBJECT AND NOT A CREATURE, and this matters more than any other line here. Egyptian
statuary is BLOCK-CARVED: flat planes, hard arrises, and the figure never leaves the block it was cut
from. His upper arms stay joined to his sides, the stone between his advanced leg and the block behind it
is never cut through, and there is no daylight anywhere between a limb and the stone behind it. Nothing is
undercut and nothing projects past the front edge of the plinth.

NO ANATOMY IS MODELLED: no muscle bellies, no nipples, no navel, no tendons, no separated toes, and not
one highlight on a shoulder or a knee. He has no expression, no gesture and no lifelike proportions. This
is a cult object with a fixed face, not a character.

The stone is one material throughout, the figure and the plinth alike. Do not paint a creature standing
in front of a stone slab.

THE REFERENCE IS A ROUGHED-OUT BLOCK. It is stone cut to the pose and deliberately left fat, and your job
is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the contour of the figure himself, and the shape of his head, which is a
FALCON'S and not a man's — a curved beak, a domed skull, no muzzle. Cut those, and only by CUTTING: every
mass stays square-shouldered and stays recognisably the mass it already is.

CARVE INWARD ONLY. Every cut goes INSIDE the rough shape you were given — take stone away, never add it
outside the block's outline. Nothing may end up further left, right, higher or lower than the rough shape
reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the reference image exactly and do not reason about them: whatever it does with verticals, with top faces, with depth and with which way the object is turned, do the same. It is not a photograph and not an isometric view, and it is not for you to correct into either. This is the ONE thing about the picture you are given rather than asked for.
3. HE STANDS, facing the viewer, one leg advanced. Both legs stay separate — do not merge them into a column.
4. THE PLINTH IS EXACTLY AS THE REFERENCE DRAWS IT — its angle, its rotation, how much of its top shows, how its edges run. Do not swing it round, do not flatten it, do not straighten it.
5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

Polished calcite, cool green-white, seamless and without a tool mark or a speck of dust on it. It is lit
FROM WITHIN AND FROM BENEATH: the stone is faintly brighter at its lower edges and in the hollows, as
though the light is coming up through it, and there is no shadow anywhere on the figure itself. His eye is
a flat pale ring. The sun disc is a flat pale gold, a colour and not a shine. Star-field inlay runs in a
band round the plinth — small pale points in dark stone.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

You are re-carving a shape, not re-staging a photograph. If the plinth ends up pointing away from the viewer, the projection is wrong however good the figure is.

ANYTHING DRAWN OUTSIDE THE ROUGH SHAPE IS CUT OFF, fingers and toes included, and a clipped limb reads as an amputation. Nothing is added below the plinth either — no ground, no shadow, no floor.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=standing --spin=5 --colour=#8fd9bd --colour-figure=#7fa596 --floor=#5a8074
yarn import-tile art/masters/props/wizard/statue.webp --tier=wizard --name=statue --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/sarcophagus` — open, empty, radiant

The only coffin in the set rendered with `--open`, because the brief's row for this rank is three words
and one of them is EMPTY. A hollow is geometry, not paint: the VOID panel down its front is what makes it
read as opened rather than as a coffin with a dark stripe.

**Attach:**

1. `~/tile-previews/sarcophagus-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. No perspective and no vanishing point: verticals stay vertical, horizontals stay horizontal.

The object: an OPEN, EMPTY COFFIN, standing upright against its own plinth, seen from the front. It is
body-shaped — narrow at the head, widest at the shoulders, tapering to the feet. The lid is GONE. The dark
panel down the front is the HOLLOW INSIDE, and there is nothing in it.

It stands, and it is open and empty. Do not lay it down, do not put a lid on it, and do not put a body,
a wrapping or an object inside it.

Polished calcite, cool green-white, seamless and without a tool mark or a speck of dust. It is lit FROM
WITHIN: the shell is faintly brighter along its inner edges, as though the light is coming up out of the
hollow, and there is no cast shadow on the stone anywhere.

The HOLLOW is the subject. It is dark but it is not black: a deep cool green-grey, a little lighter where
it meets the rim, so it reads as a lined space with nothing in it rather than as a hole punched through
the case. No pink and no purple anywhere in it. A band of star-field inlay runs round the plinth — small
pale points in dark stone.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

THE REFERENCE IS A ROUGHED-OUT BLOCK, NOT A FINISHED COFFIN. It is timber cut to the shape and left
square, and your job is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the OUTLINE of the coffin itself. An anthropoid coffin is narrow at the
head, widest at the shoulders and tapers to the feet, and every edge of it is a curve — cut all of that.
The head is a rounded mass and not a cube, the shoulders slope, the arms are rounded limbs lying on the
chest. If a face is drawn on a square plaque and the arms are drawn as rectangular bars, the block has
been painted rather than carved.

CARVE INWARD ONLY. Every curve you cut goes INSIDE the rough shape you were given — take timber away,
never add it outside the block's outline. Nothing may end up further left, right, higher or lower than
the rough shape reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the reference image exactly and do not reason about them: whatever it does with verticals, with top faces, with depth and with which way the object is turned, do the same. It is not a photograph and not an isometric view, and it is not for you to correct into either.
3. IT STANDS UPRIGHT, propped against its own plinth, facing the viewer. It does not lie down and it does not lean away.
4. THE PLINTH IS EXACTLY AS THE REFERENCE DRAWS IT — its angle, its rotation, how much of its top shows, how its edges run. It is a SLAB the coffin stands on and not a flat panel behind it: do not swing it round, do not flatten it, do not straighten it, and do not lose the top face it shows you.
5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

You are re-carving a shape, not re-staging a photograph.


No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=mummiform --open=1 --spin=-9 --colour=#8fd9bd --colour-figure=#7fa596 --floor=#5a8074
yarn import-tile art/masters/props/wizard/sarcophagus.webp --tier=wizard --name=sarcophagus --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/chestProp` — a reliquary of light

**This is the TREASURE NODE's art, not a room's furniture.** No pool authors a chest any more — a
chest that opens and a chest that is furniture cannot be the same picture — so `yarn art-census` counts
zero rooms for it and every treasure room in the rank draws it beside its marker.

Thirty-five rooms, the largest single gap left in the file.

**Attach:**

1. `~/tile-previews/chestProp-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a CHEST on four short feet. The band round its top is where the LID meets the body. Above that
the three slabs stepping out one over the other are a CAVETTO CORNICE forming the lid. The sunken
rectangle on the front face is an INLAID PANEL.

Polished calcite, cool green-white, seamless and without a tool mark or a speck of dust on it, its walls
thin enough to look faintly translucent at the cornice's steps. It is LIT FROM WITHIN: the stone is palest
along the lower edge of each step and in the panel's recess, as though what the chest holds is shining
through it, and there is no shadow anywhere on the object. The inlaid panel is a flat pale gold, a colour
and not a shine, with a band of star-field inlay along the lid — small pale points in dark stone.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold sealedChest --contents=cavetto --spin=-19 --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/chestProp.webp --tier=wizard --name=chestProp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/crystal` — a calcite cluster lit from inside

**BLOCKED ON GEOMETRY, and it is the only entry in this file that is.** There is no `crystal` primitive:
the merchant's is a lump part-cut from the wall and the priest's a natron crust in a cut, and neither has
been modelled either. Twenty-seven rooms wait on it, which makes it the most valuable primitive still
unwritten. It stays here so the backlog is honest — do not paste this one until a scaffold exists.

What it needs from geometry: a cluster of four or five prisms of different heights leaning out of a common
base, each a four- or six-sided column cut off at a slant. Flat faces, because `prim_statue` records what
a smooth mass does under this shear — it shades uniformly and reads as a blob — and a crystal is the one
subject where flat faces are also the truth.

### `wizard/jarRack` — vessels holding nothing

**Attach:**

1. `~/tile-previews/jarRack-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a rack holding FOUR VESSELS, and no two are the same shape. The two uprights and two rails are
the RACK. From the left: a squat lidded JAR with a small knob on its lid; a tall footed VASE — a round
belly on a stem standing on its own foot, with a long neck; then two short wide-shouldered JARS with flat
lids.

THEY HOLD NOTHING, and that is the subject. Every vessel is open to the eye: the stone of each is pale
enough to see into, and where a jar's belly should hold shadow it holds the same clear pale stone as its
wall. Nothing is sealed, nothing is stoppered, nothing is full.

Polished calcite throughout, cool green-white, seamless and without a tool mark or a speck of dust. The
rack is the same stone as the vessels. It is all LIT FROM WITHIN AND FROM BENEATH: palest at the lower
edge of every belly and in every hollow, as though the light comes up through the stone, and there is no
shadow anywhere on the object.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold jarrack --contents=vessels --spin=13 --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/jarRack.webp --tier=wizard --name=jarRack --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/offeringTable` — a slab with no supports, offerings hovering

**Attach:**

1. `~/tile-previews/offeringTable-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a low TABLE with offerings laid on it. The slab on four legs is the table. Standing at the
back is a JAR in a ring; the flat round in the middle is a PLATTER with three loaves of BREAD on it; the
two small drums at the right are CUPS.

THE TABLE HAS NO SUPPORTS. The four legs in the reference are there to hold the slab up for you and are
not part of what you paint: paint them as EMPTY AIR, the plain magenta of the background, so the slab
floats with nothing under it. Everything above the slab stays exactly where the reference puts it.

Polished calcite, cool green-white, seamless and without a tool mark or a speck of dust on it. The slab,
the jar, the platter, the cups and the loaves are all the same stone — nothing here is bread or clay any
more, only the shape of it cut in calcite. It is LIT FROM WITHIN AND FROM BENEATH: palest along the slab's
lower edge and under each object, as though the light comes up through it, and there is no shadow anywhere
on the object. A band of star-field inlay runs along the slab's front edge — small pale points in dark
stone.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

**The legs are painted OUT, and the mask keeps them out.** `--mask` cuts the return to the render's own
alpha, so a leg painted magenta arrives as a keyed hole rather than as stone — the import keys magenta
BEFORE it masks, which is the same order that leaves the altar its eight transparent pixels. If the
generator paints them anyway, the tile is still correct and the table simply has legs; re-roll only if the
hovering reads as worth another paste.

Then, once the return is in `~/Downloads`:

```sh
scaffold market --contents=laid --spin=-15 --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/offeringTable.webp --tier=wizard --name=offeringTable --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/basin` — a pool with stars in it and no bottom

**TAKES `--context`, the second entry in the file to need it.** A hole cannot be a product shot: with the
surface missing the same picture is equally a tank, a panel or a flat pattern, and the priest's sacred
pool spent five rolls proving it. `--context=1.04x0.74` on the handed-over render alone lays the rank's
own floor round the object with a hole of exactly that size cut in it, running off all four edges of the
frame. The mask is rendered without it, so no floor reaches the tile. `prop-pipeline.md` has the laws;
the exact command is under "Regenerating the attachments".

**No `--seat`.** The coping is bedded flush with the paving, so nothing on this prop stands above the
floor and there is nothing to cast — the priest's pool records why a bar of shadow under a hole is the one
thing that makes a hole read as a slab.

**Attach:**

1. `~/tile-previews/basin-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A single object painted in flat matte gouache, seen from above and slightly in front, in the same raked Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.
view as the reference. Portrait, two units wide by three tall, exactly as the reference. No perspective
and no vanishing point: verticals stay vertical, horizontals stay horizontal.

The scene: a POOL cut down into a stone floor. The whole frame is that floor, and the pool is a hole in
it. You are painting a floor with a pool in it, not an object standing on a surface.

The pale field filling the frame is the PAVING. The dark rectangle sunk into it is the pool. The low
border running all the way round it is a stone COPING, bedded flush with the paving on all four sides, and
the length of it nearest you passes IN FRONT of the pool. The four ledges at the left, the lowest of them
below the surface, are STEPS walking down into it.

THE POOL HAS NO BOTTOM AND IT HAS STARS IN IT. What fills the opening is not water and not stone: it is
NIGHT, a deep blue-black going down further than the floor is thick, with small pale STARS scattered in
it, smaller and fainter toward the far end. Nothing floats on it and nothing reflects off it. Do not paint
a floor, a wall or a back panel inside the opening — paint depth.

Nothing here is a tank, a tub, a trough or a basin, and nothing has an outside you could see. NOTHING
STANDS ABOVE THE PAVING — not even the coping, which is bedded level with it, its top face in the same
plane as the slabs it is set into.

The paving is polished calcite, cool green-white, seamless and without a tool mark or a speck of dust. The
ruled grid across the whole frame gives the JOINTS between the slabs; keep every one of them where it is,
and let a thin line of pale light lie in each joint, so the paving reads as one continuous floor running
out of the picture on all four sides. The coping is the same stone in one unbroken course with no joints
in it, palest along its inner edge where it meets the night, and there is no shadow beside it.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold basin --contents=pool --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/basin.webp --tier=wizard --name=basin --slot=prop \
  --filter=smooth --mask="$OBJ"
```

### `wizard/shelf` — a ledge of grown calcite, things resting on nothing

**Attach:**

1. `~/tile-previews/shelf-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: SHELVING with things standing in it. The frame with a shelf across its middle is the unit. In
the upper opening stand two round-bellied VESSELS with short necks. In the lower one are two stacked flat
BOXES at the left and a taller drum-shaped JAR at the right. Lying on the top course is a flat slab, a
BOX LID.

THE LEDGE IS GROWN, NOT BUILT. It is one piece of calcite that has crystallised into the shape of
shelving — no joints, no courses, no dressed faces, no mason's marks. Its edges are very slightly uneven
the way a crystal face is, never the way a cut stone is.

Polished calcite throughout, cool green-white, seamless and without a tool mark or a speck of dust. Every
object on it is the same stone as the ledge, so nothing reads as timber, metal or clay. It is LIT FROM
WITHIN AND FROM BENEATH: palest at the lower edge of the shelf and under each object, as though the light
comes up through the stone. The openings behind the objects are NOT in shade — they are the same pale
stone, so nothing has a dark side and nothing is seen to rest on anything.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold shelf --spin=-13 --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/shelf.webp --tier=wizard --name=shelf --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/shrine` — a window on the cosmos

**Attach:**

1. `~/tile-previews/shrine-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a SHRINE — a box standing on a plinth, the slab stepping out over it a CAVETTO CORNICE, and
the opening in its front standing open.

WHAT IS INSIDE IS THE NIGHT SKY, and it is the subject. The opening is not a dark interior and not a box
with a back to it: it is a WINDOW ON THE COSMOS, a deep blue-black going back further than the shrine is
deep, with pale STARS scattered through it, denser toward the middle and fainter at the edges. Do not
paint a back panel, a floor or a wall behind them. Nothing stands in the opening.

The shrine itself is polished calcite, cool green-white, seamless and without a tool mark or a speck of
dust. It is LIT FROM WITHIN AND FROM BENEATH: palest along the cornice's lower step and round the
opening's rim, as though the light comes up through the stone, and there is no shadow anywhere on it. A
band of star-field inlay runs along the plinth — small pale points in dark stone, the same night in
miniature as the opening holds whole.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold shrine --spin=-11 --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/shrine.webp --tier=wizard --name=shrine --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/lamp` — lights with nothing holding them

**Attach:**

1. `~/tile-previews/lamp-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a LAMP TREE with three lights. The flared cone on the floor is its FOOT, the upright above it
the STEM, and the horizontal bar across the stem the ARM. At each end of the arm and at the top of the
stem is a shallow SAUCER; over each saucer is a domed SHADE; between saucer and shade is a small nub of
LIGHT. The centre light stands higher than the two on the arm.

Count them: there are three lights.

NOTHING HOLDS THEM UP. The stem and the arm in the reference are there to place the lights for you and are
not part of what you paint: paint the stem and the arm as EMPTY AIR, the plain magenta of the background,
so the three lights and their saucers hang with nothing between them. Keep the foot. Everything stays
exactly where the reference puts it.

The foot, the saucers and the shades are polished calcite, cool green-white, seamless and without a tool
mark or a speck of dust, thin enough at the shades to look faintly translucent. Each light is a flat pale
gold, a colour and not a shine, with no flame and no wick. The stone is palest where it is nearest a
light. There is no shadow anywhere on the object.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

**Painting a part OUT is the gods' rank trick and it has a ceiling**: `--mask` cuts the return to the
render's alpha, and the import keys magenta first, so a stem painted magenta arrives as a keyed hole. The
piece count then reports three or four islands instead of one, which is correct here and not a fault — the
gate in `prop-pipeline.md` Step 2 applies to a prop that is meant to be one thing, and this one is not.

Then, once the return is in `~/Downloads`:

```sh
scaffold lamp --contents=tree --spin=-8 --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/lamp.webp --tier=wizard --name=lamp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/pillar` — a column of light

**Attach:**

1. `~/tile-previews/pillar-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a COLUMN, running from the floor up out of the top of the picture, tapering very slightly as
it rises. The three collars round it are BANDS.

IT IS A COLUMN OF LIGHT. The shaft is not stone: it is a standing body of pale light, a flat pale
green-white all the way up, palest at its lower edge where it meets the floor and cooling very slightly as
it rises. It has no grain, no joints, no courses and no relief. It is a flat colour and not a beam — no
rays, no bloom, nothing streaming out of it.

The three bands ARE stone: polished calcite, cool green-white, seamless and without a tool mark or a speck
of dust, each set with star-field inlay — small pale points in dark stone. They are the only part of this
with an edge you could touch, and they are what proves the shaft has none.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold palm --contents=banded --spin=6 --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/pillar.webp --tier=wizard --name=pillar --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/niche` — a niche holding one star

**NO ROOM AT THIS RANK DRAWS A NICHE TODAY**, so `art-census` does not list it and painting it changes
nothing on the map until the gods' wall pool includes one. It is the only entry in the file in that
position, and it is kept because the brief asks for it and because a pool is a one-line change where a
painting is a paste. Do the ones with rooms behind them first.

**Attach:**

1. `~/tile-previews/niche-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a recess cut into a wall, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a niche with a single star in it. The frame around the opening is the SURROUND — jambs, lintel
and sill; the opening itself is black, a piece of night sky; the six-pointed shape floating in the middle
of it is one STAR.

The surround is polished calcite, cool green-white, seamless and without tool marks or dust. The opening is
a deep even black — not a wall in shadow, but night. The star is a flat pale colour, cool white with the
faintest green in it, and it does not glow: it has no halo, no rays and it throws no light on the surround.

The near-black opening is a HOLE and must stay black — paint darkness in it, never a wall, a floor or a back panel. No pink and no purple anywhere in it.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold niche --contents=star --shear=0.5 --width=448 --height=224 --sun=0
yarn import-tile art/masters/props/wizard/niche.webp --tier=wizard --name=niche --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `wizard/sconce` — a crystal bracket, light with no lamp

**Attach:**

1. `~/tile-previews/sconce-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a crystal bracket on a wall, with light on it and no lamp anywhere. The upright plate at the
left is fixed to the WALL; the bar reaching right is the ARM; the diagonal below it is a BRACE; the three
tapering spikes standing on the arm are CRYSTAL SHARDS; the rounded shape nested among their tips is the
LIGHT itself.

The bracket and the shards are the same polished calcite, cool green-white, seamless. The shards are
faceted and slightly translucent, a little paler at their tips. The light is a flat pale cool colour sitting
among them — there is no lamp, no wick, no flame and no vessel for anything to burn in, and it casts no
glow, no rays and no brightness onto the arm.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold sconce --contents=crystal --shear=0.5 --width=448 --height=224 --sun=0 --margin=1.4
yarn import-tile art/masters/props/wizard/sconce.webp --tier=wizard --name=sconce --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `wizard/wallShrine` — a shrine that is only an opening

**Attach:**

1. `~/tile-previews/wallshrine-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a shrine cabinet on a wall with nothing inside it. The wide slab over the top is a CAVETTO
CORNICE and the slab under it is the PLINTH, both overhanging the box between them; the uprights at the
sides are JAMBS; between them the opening is black and completely empty.

The cornice, plinth and jambs are polished calcite, cool green-white, seamless, without tool marks or dust,
and light leaks faintly from the joints between them. The opening is a deep even black.

The near-black opening is a HOLE and must stay black — paint darkness in it, never a wall, a floor or a back panel. No pink and no purple anywhere in it. There is no statue, no door, no offering and no back wall in it: the shrine is an opening and
nothing else, and that emptiness is the subject.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold wallShrine --contents=opening --shear=0.5 --width=448 --height=224 --sun=0 --colour=#8fd9bd
yarn import-tile art/masters/props/wizard/wallShrine.webp --tier=wizard --name=wallShrine --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `wizard/starShaft` — a slot on the night

**Attach:**

1. `~/tile-previews/starshaft-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a slot cut through a wall, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a shaft cut through the stone with stars showing in it. The band around the opening is the
FRAME — a bar above, a bar below, a jamb at each side; the opening itself is black, open night; the three
six-pointed shapes in it are STARS.

The frame is polished calcite, cool green-white, seamless and dustless, with light leaking faintly from its
joints. The opening is a deep even black going right through the wall. The stars are flat pale cool shapes
of three different sizes, and they do not glow: no halos, no rays, no light thrown on the frame.

The near-black opening is a HOLE and must stay black — paint darkness in it, never a wall, a floor or a back panel. No pink and no purple anywhere in it. This is a hole through to the sky, not a picture of the sky hung on a wall.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold starShaft --shear=0.5 --width=448 --height=224 --sun=0
yarn import-tile art/masters/props/wizard/starShaft.webp --tier=wizard --name=starShaft --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `wizard/hanging` — a curtain of aurora

**Attach:**

1. `~/tile-previews/hanging-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

Imports differently: light casts nothing, so it takes NO `--seat` and its scaffold is rendered with `--shadow=0`. `--colour-accent` must name the rank's light or the scaffold goes to the generator in ochre.

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a curtain of light, standing at an angle, hanging from nothing. The whole shape is the CURTAIN:
a broad sheet falling in a few wide vertical folds, its top edge rippling in a slow wave and its lower edge
rippling likewise. There is no pole, no rail, no post and no hook anywhere — do not add one.

It is aurora, not cloth: a flat pale cool green-white, a little deeper in the folds and paler along the
rippling edges, with faint vertical streaks of green and blue-white running down it. It has no weave, no
hem, no seam and no patches. It does not glow — no halo, no rays, nothing lit around it — it is simply a
pale flat colour where the light stands.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold hanging --contents=aurora --spin=47 --colour-accent=<the rank's own light>
yarn import-tile art/masters/props/wizard/hanging.webp --tier=wizard --name=hanging --slot=prop \
  --filter=smooth --mask="$OBJ"
```

---

## Floor scatter — five

**FLOOR SCATTER IS PLACED BY RULE, not by an author**, so every rank draws all three of `mat`,
`rubblePile` and `rubbleSpill` and a missing one shows on every floor of that rank rather than in a
handful of rooms. `art-census` prints no room count for them for the same reason. That makes these the
cheapest coverage left in the file: five tiles, two primitives already proved, and no new geometry.

The spill and the pile are the SAME primitive at different `--contents`: `rubblePile` is the standing
heap, `rubblePile --contents=spill` the flat scatter, and `--contents=plaster` the nobleman's variant with
two shards leaning on it. Whichever a rank uses for its pile, its spill is `--contents=spill`.

### `master/rubbleSpill` — shattered alabaster, gold leaf in the dust

**Attach:**

1. `~/tile-previews/rubbleSpill-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a SPILL of shattered stone lying flat on the floor — a broken alabaster vessel and the pieces
of the gilded fitting it stood in, each at a different angle.

Most pieces are pale creamy ALABASTER, faintly banded, polished on the face that used to show and matt
and sugary on every broken edge. A few are black granite. Lying among them are curled FLAKES OF GOLD LEAF
that have lifted off what they covered — a flat warm ochre-yellow, thin enough to have crumpled, never a
metallic shine — and the dust between the pieces glints with smaller flakes of the same. Two fragments
carry part of a blue-green FAIENCE inlay still set in a strip of gold.

The arrangement of the pieces does not matter and need not match the reference — paint the material and
let the pieces fall where they fall.

No highlights, no gloss, no rim light, no shadow, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold rubblePile --contents=spill --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/rubbleSpill.webp --tier=master --name=rubbleSpill --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/rubbleSpill` — stone shattered from within, edges still lit

**Attach:**

1. `~/tile-previews/rubbleSpill-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a SPILL of shattered stone lying flat on the floor, each piece at a different angle.

Polished calcite, cool green-white, seamless and without a tool mark or a speck of dust on any face that
used to show. IT BROKE FROM WITHIN: every fracture runs outward, and the BROKEN EDGES ARE STILL LIT — each
new face is palest right at its edge, as though the light that was inside the stone has not finished
leaving it, and the pieces lying deepest in the spill are the brightest. Nothing is scorched and nothing
is dirty. There is no dust between them.

The arrangement of the pieces does not matter and need not match the reference — paint the material and
let the pieces fall where they fall.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

No highlights, no gloss, no rim light, no shadow, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold rubblePile --contents=spill --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/rubbleSpill.webp --tier=wizard --name=rubbleSpill --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/mat` — a gold-threaded mat

**Attach:**

1. `~/tile-previews/mat-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A flat rectangular MAT seen from above, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a mat laid before a shrine in a king's tomb. It is woven from fine reed in a close plain
weave, running in bands across its width, with a plaited edge all round.

Deep red-brown reed, and GOLD THREAD worked through it: a line of gold running with every third band, and
a broader gold border inside the plaited edge, carrying a row of small woven CARTOUCHES. The gold is a
flat warm ochre-yellow, a colour and not a metal — no shine anywhere in it. The thread has pulled and
broken in the middle where the mat is knelt on, so the gold line goes dotted and then absent across the
centre, and a few loose ends lie on the surface.

Fill the whole shape to its edges. The worn gold is the subject: without it this is a new mat.

No highlights, no gloss, no rim light, no shadow, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold mat --spin=9 --shadow=0.5 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/mat.webp --tier=master --name=mat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/mat` — a mat of woven light

**Attach:**

1. `~/tile-previews/mat-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A flat rectangular MAT seen from above, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a mat lying on the floor of the gods' vault, woven from LIGHT rather than from reed. It has
the structure of a mat and none of its substance: a close plain weave running in bands across its width,
with a plaited edge all round, and every strand of it a thread of pale light.

Flat pale green-white throughout, a colour and not a glow. The weave reads as a grid of slightly lighter
and slightly darker strands crossing, and the plaited edge is the palest part of it. It is not frayed, not
worn and not dusty — nothing here decays. Toward the middle the weave is very slightly OPEN, the strands
further apart, so a darker gap shows between them; that is the only variation in it.

Fill the whole shape to its edges.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

No highlights, no gloss, no rim light, no shadow, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold mat --spin=9 --shadow=0.5 --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/mat.webp --tier=wizard --name=mat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

---

## Patrons — nineteen

**IF A GOD COMES BACK AS THE HEAP, `prim_shrine` TAKES `--contents=standing`.** The default contents is
BES — two wide domes, squat and big-headed — so a shrine's god is painted onto or beside a rounded mass.
Both of the priest's went that way and both shipped: Anubis stands beside the heap, Thoth is painted onto
it as a coiled ibis. The flag is there for the god that cannot be — something upright with a staff, or a
long neck that needs a silhouette rather than a lump. It puts a narrow standing figure in the box with a
gap at the neck. Regenerate the attachment if you use it, and remember the mask: a tile already painted
over Bes keeps the Bes scaffold for ever.

**A PATRON IS WHOSE TOMB A PYRAMID IS**, and it reaches the map through one mechanism only: for five
kinds — `statue`, `shrine`, `wallShrine`, `stela` and `mask` — `patronTileUrl` prefers
`<kind>-<patron>.png` over the generic drawing, and falls back silently where that file is absent. So
none of these is a placeholder and nothing on the map is wrong without them. They are the difference
between a rank whose every tomb looks the same and one where the god is legible from the corridor.

**Twenty-seven pairings, not forty-five**, and eight of them have landed. The count grew when dedicated
floors started keeping a room for their god: more rooms show a patron, so more pairings exist to paint.
Re-read `yarn art-census` rather than this number. Nine gods across five kinds is forty-five files, and painting
forty-five is not the job: a god authored on a pyramid holding none of those five kinds draws nothing
whatever, and the same god at another rank is a different painting. `yarn art-census`'s PATRONS section
counts the pairings the world actually makes, in room order, and that list is what this section is.
Re-run it after authoring a journey — a god moved to another pyramid changes which files are worth
having.

**TWO BELOW CAN BE ROLLED TODAY**, and they are only 3 of the 137 rooms still owed here: `junior/statue-thoth`
at 1 room, whose first roll came back a flat elevation, and `expert/wallShrine-anubis` at 2. Six have
landed — Bastet, the vault's three Anubis tiles, and the nobleman's Thoth stela and shrine — 82 rooms
including the two largest pairings in the world. Six of the eight are the nobleman's, worth 79 rooms — 68 of them Anubis's
alone — and his rank is finished, so nothing about them waits on anything.

The other fourteen sit on a kind that is still a placeholder, including
`master/mask-osiris` at 33 rooms, `master/mask-maat` at 32, `wizard/wallShrine-maat` at 19 and
`master/statue-osiris` at 13. A god's variant painted before the kind he varies is out of order twice
over: the rank still draws a dummy in every room no patron reaches, and the variant has nothing to be
judged against. Each blocked entry names what it waits on.

**AND TWO GODS PER RANK IS THE FLOOR FOR ANY OF THIS TO SHOW.** A patron tells one pyramid from another
WITHIN a rank; where a rank names only one god, `<kind>-<god>.png` is its generic drawing under another
name and painting it buys nothing. That was true of the nobleman until the Noble's Hidden Vault was
dedicated to Anubis beside the Temple of Thoth — one line in `spec/junior.ts`, and it is what turned his
three patron tiles from decoration into 68 rooms. Check `art-census` before painting for a rank: starter
still has one visible god, and until it has two its Bastet is exactly this trap.

**Each variant reuses its generic's own scaffold**, so it drops into the same footprint at the same size
and a room reads as the same furniture with a different god on it. Where the generic's scaffold carries a
deity of its own — the pharaoh's shrine has Anubis couchant on its lid — the patron version drops that
`--contents` and takes the plain form instead, because a jackal cannot be repainted into Ma'at.

**The god has to be legible at 56 units, so each prompt names ONE identifying mark and leans on it.**
This is the same argument the canopic jars settled: a face is paint at this size, and what carries it is
the silhouette of a head plus one attribute, never a costume.

| god     | the one mark                                                            |
| ------- | ----------------------------------------------------------------------- |
| anubis  | a jackal's head, black — long muzzle, two tall pointed ears             |
| bastet  | a cat's head, small and round-eared                                     |
| horus   | a falcon's head under the double crown, red round white                 |
| maat    | a woman's head with one tall straight OSTRICH FEATHER standing up on it |
| osiris  | mummiform and wrapped, the tall white ATEF crown with a plume each side |
| ra      | a falcon's head carrying a SUN DISC, the disc ringed by a cobra         |
| sekhmet | a lioness's head carrying a sun disc — a mane where Bastet has none     |
| sobek   | a crocodile's head, long flat snout                                     |
| thoth   | an IBIS head, a long curved down-swept beak                             |

### `master/mask-osiris` — Osiris on the pharaoh's funerary mask

**33 rooms, the biggest patron pairing in the world — and it WAITS ON `master/mask`,** which is still a
placeholder. Paint the generic first: until it exists there is nothing to judge this against, and every
room at the rank that no patron reaches still draws a dummy.

**Attach:**

1. `~/tile-previews/mask-osiris-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a funerary mask hanging on a wall. The rounded mass behind and above is the HEADDRESS; the
oval in front of it is the FACE; the two bars flanking the face are the headdress's LAPPETS hanging down
at the sides; the small block below the chin is the false BEARD; the wide band at the bottom is the broad
COLLAR the mask sits in.

IT IS OSIRIS, and the headdress is his ATEF CROWN rather than a nemes: paint the mass above the face as a
tall smooth white cone, narrowing as it rises, with a single narrow PLUME standing against it on each
side. The lappets hang plain and undecorated below it.

His FACE IS GREEN — a flat dull green, the colour of new growth, which is how Osiris is finished and the
one thing that names him at a glance. The brows and eye rims are inlaid in dark blue lapis. The atef
crown is unpainted white, its plumes banded in ochre and dull green. The beard is dark blue lapis, long
and squared off, and it is PLAITED — cross-hatched, not smooth. The collar is banded faience in
blue-green, dark blue and gold; the gold is a flat warm ochre-yellow.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine anywhere on it.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold mask --shear=0.5 --width=448 --height=224 --sun=0 --margin=1.2 --colour=#d9a93f
yarn import-tile art/masters/props/master/mask-osiris.webp --tier=master --name=mask-osiris --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `master/mask-maat` — Ma'at on the pharaoh's funerary mask

32 rooms. **WAITS ON `master/mask`.**

**Attach:**

1. `~/tile-previews/mask-maat-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a funerary mask hanging on a wall. The rounded mass behind and above is the HEADDRESS; the
oval in front of it is the FACE; the two bars flanking the face are the headdress's LAPPETS hanging down
at the sides; the small block below the chin is a squared TAB; the wide band at the bottom is the broad
COLLAR the mask sits in.

IT IS MA'AT, and one mark names her: a single tall straight OSTRICH FEATHER standing upright out of the
headdress, its shaft dead vertical and its vane splitting to a soft point. Paint the mass above the face
as a plain dark WIG, smooth and close, and stand the feather up out of the middle of it. There is nothing
else on her head.

Her face is gold leaf — a flat warm ochre-yellow, evenly laid, brows and eye rims inlaid in dark blue
lapis. The wig and lappets are solid dark blue lapis, undecorated, so the feather reads against them. The
feather is white with a fine ochre midrib. The collar is banded faience in blue-green, dark blue and
gold.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine anywhere on it.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold mask --shear=0.5 --width=448 --height=224 --sun=0 --margin=1.2 --colour=#d9a93f
yarn import-tile art/masters/props/master/mask-maat.webp --tier=master --name=mask-maat --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `wizard/wallShrine-maat` — Ma'at's feather in the gods' opening

19 rooms. **WAITS ON `wizard/wallShrine`.** The generic is an opening with nothing in it at all, and
that emptiness is its subject; a patron version is the same opening with ONE thing in it.

**Attach:**

1. `~/tile-previews/wallShrine-maat-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a shrine cabinet on a wall. The wide slab over the top is a CAVETTO CORNICE and the slab
under it is the PLINTH, both overhanging the box between them; the uprights at the sides are JAMBS;
between them is the opening.

Inside the opening, and nothing else in it, stands a single tall OSTRICH FEATHER — Ma'at's feather —
upright, its shaft dead vertical and its vane splitting to a soft point. It is drawn as a flat pale
green-white light against the dark of the opening, a colour and not a glow, and it does not touch the
sides or the top.

The cornice, plinth and jambs are polished calcite, cool green-white, seamless, without tool marks or
dust, and light leaks faintly from the joints between them. The opening behind the feather is a deep even
black going back further than the box is deep.

The opening is a HOLE and stays black — paint darkness in it, never a wall, a floor or a back panel. No pink and no purple anywhere in it.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold wallShrine --contents=opening --shear=0.5 --width=448 --height=224 --sun=0 --colour=#8fd9bd
yarn import-tile art/masters/props/wizard/wallShrine-maat.webp --tier=wizard --name=wallShrine-maat --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `master/statue-osiris` — the pharaoh's Osiris colossus, as his patron

13 rooms. **WAITS ON `master/statue`.** That entry already asks for Osiris, so this file is very nearly
the same painting; it exists because the resolver reads a filename and the generic has to stay generic
for the rooms no patron reaches. When `master/statue` lands, roll this one from the same prompt with the
atef crown and the green face pushed harder, and keep the generic drier.

**Attach:**

1. `~/tile-previews/statue-osiris-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a colossal statue of OSIRIS, cut from one block of black granite. The slab at the bottom is
the PLINTH. The tapering block on his head is his ATEF CROWN — a tall smooth cone with a narrow plume
standing against it on each side. The block across his hips is a KILT. He holds a CROOK and a FLAIL
crossed over his chest, two short staffs, and they must not stand out past the edges of his own
shoulders.

IT IS A CARVED OBJECT AND NOT A PERSON. Egyptian statuary is BLOCK-CARVED: flat planes, hard arrises, and
the figure never leaves the block. His upper arms stay joined to his sides, the crook and flail stay flat
against his chest, the stone between his advanced leg and the block behind it is never cut through.
Nothing is undercut and nothing projects past the front edge of the plinth. No anatomy is modelled and no
highlight sits on a shoulder or a shin.

GILDED, and his FACE AND HANDS ARE GREEN. Gold leaf over the granite everywhere else — a flat warm
ochre-yellow, worn through to the dark stone on the shins, the forearms and the crown's front edge, which
is every surface a hand reaches. His face and hands are a flat dull green, the colour of new growth,
which is how Osiris is finished and the one thing that names him at a glance. The atef crown is
unpainted white with its plumes banded ochre and dull green. The plinth is black granite with a gilded
band along its front.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

THE REFERENCE IS A ROUGHED-OUT BLOCK. It is stone cut to the pose and deliberately left fat, and your job
is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the contour of the figure himself, and only by CUTTING. A shoulder gets
its slope, a calf its front arris, a jaw its plane. These are chisel cuts on a block, not modelling in clay — every mass stays square-shouldered and stays recognisably
the mass it already is.

CARVE INWARD ONLY. Every cut goes INSIDE the rough shape you were given — take stone away, never add it
outside the block's outline. Nothing may end up further left, right, higher or lower than the rough shape
reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the reference image exactly and do not reason about them: whatever it does with verticals, with top faces, with depth and with which way the object is turned, do the same. It is not a photograph and not an isometric view, and it is not for you to correct into either. This is the ONE thing about the picture you are given rather than asked for.
3. HE STANDS, facing the viewer, one leg advanced. Both legs stay separate — do not merge them into a column or a mummy wrap.
4. THE PLINTH IS EXACTLY AS THE REFERENCE DRAWS IT — its angle, its rotation, how much of its top shows, how its edges run. Do not swing it round, do not flatten it, do not straighten it.
5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

You are re-carving a shape, not re-staging a photograph. If the plinth ends up pointing away from the viewer, the projection is wrong however good the figure is.

ANYTHING DRAWN OUTSIDE THE ROUGH SHAPE IS CUT OFF, fingers and toes included, and a clipped limb reads as an amputation. Nothing is added below the plinth either — no ground, no shadow, no floor.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=standing --spin=-12 --colour=#d9a93f --colour-figure=#8a7434 --floor=#57534b
yarn import-tile art/masters/props/master/statue-osiris.webp --tier=master --name=statue-osiris --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/wallShrine-ra` — Ra's disc in the gods' opening

12 rooms. **WAITS ON `wizard/wallShrine`.**

**Attach:**

1. `~/tile-previews/wallShrine-ra-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a shrine cabinet on a wall. The wide slab over the top is a CAVETTO CORNICE and the slab
under it is the PLINTH, both overhanging the box between them; the uprights at the sides are JAMBS;
between them is the opening.

Inside the opening, and nothing else in it, hangs a single SUN DISC — Ra's disc — a plain flat circle,
centred, touching nothing. A COBRA is coiled once round it, its head raised at the disc's right edge, so
the circle is not a bare ring. The disc is a flat pale gold, a colour and not a shine.

The cornice, plinth and jambs are polished calcite, cool green-white, seamless, without tool marks or
dust, and light leaks faintly from the joints between them. The opening behind the disc is a deep even
black going back further than the box is deep.

The opening is a HOLE and stays black — paint darkness in it, never a wall, a floor or a back panel. No pink and no purple anywhere in it.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight — the disc is a circle of flat colour and casts nothing.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold wallShrine --contents=opening --shear=0.5 --width=448 --height=224 --sun=0 --colour=#8fd9bd
yarn import-tile art/masters/props/wizard/wallShrine-ra.webp --tier=wizard --name=wallShrine-ra --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `master/statue-maat` — Ma'at in the pharaoh's tomb

7 rooms. **WAITS ON `master/statue`.**

**Attach:**

1. `~/tile-previews/statue-maat-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a standing statue of MA'AT, cut from one block of black granite. The slab at the bottom is
the PLINTH. The block across her hips is a long sheath DRESS reaching her ankles. The tapering block on
her head is her WIG, and standing up out of it is her one attribute.

HER ONE MARK IS THE FEATHER: a single tall straight OSTRICH FEATHER standing upright out of the top of
her wig, shaft dead vertical, vane splitting to a soft point. Carve it out of the tapering block the
reference gives you. Nothing else identifies her and nothing else needs to.

IT IS A CARVED OBJECT AND NOT A PERSON. Egyptian statuary is BLOCK-CARVED: flat planes, hard arrises, and
the figure never leaves the block. Her upper arms stay joined to her sides, the stone between her legs is
never cut through, nothing is undercut and nothing projects past the front edge of the plinth. No anatomy
is modelled and no highlight sits on a shoulder.

Black granite, close-grained and dressed smooth. GILDED in three places only: the feather, the broad
collar at her throat and the band round the plinth, all a flat warm ochre-yellow worn through to the
stone along their lower edges. Her face, arms and the dress are bare polished granite. The gold on the
feather is what carries her across a room.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

THE REFERENCE IS A ROUGHED-OUT BLOCK. It is stone cut to the pose and deliberately left fat, and your job
is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the contour of the figure herself, and only by CUTTING. A shoulder gets
its slope, a calf its front arris, a jaw its plane. These are chisel cuts on a block, not modelling in clay — every mass stays square-shouldered and stays recognisably
the mass it already is.

CARVE INWARD ONLY. Every cut goes INSIDE the rough shape you were given — take stone away, never add it
outside the block's outline. Nothing may end up further left, right, higher or lower than the rough shape
reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the reference image exactly and do not reason about them: whatever it does with verticals, with top faces, with depth and with which way the object is turned, do the same. It is not a photograph and not an isometric view, and it is not for you to correct into either. This is the ONE thing about the picture you are given rather than asked for.
3. SHE STANDS, facing the viewer, one leg advanced. Both legs stay separate — do not merge them into a column.
4. THE PLINTH IS EXACTLY AS THE REFERENCE DRAWS IT — its angle, its rotation, how much of its top shows, how its edges run. Do not swing it round, do not flatten it, do not straighten it.
5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

You are re-carving a shape, not re-staging a photograph. If the plinth ends up pointing away from the viewer, the projection is wrong however good the figure is.

ANYTHING DRAWN OUTSIDE THE ROUGH SHAPE IS CUT OFF, fingers and toes included, and a clipped limb reads as an amputation. Nothing is added below the plinth either — no ground, no shadow, no floor.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=standing --spin=-12 --colour=#d9a93f --colour-figure=#8a7434 --floor=#57534b
yarn import-tile art/masters/props/master/statue-maat.webp --tier=master --name=statue-maat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/shrine-maat` — Ma'at in the pharaoh's shrine

4 rooms. **WAITS ON `master/shrine`.** It drops the generic's `--contents=couchant`: that scaffold puts
Anubis on the lid, and a jackal cannot be repainted into Ma'at.

**Attach:**

1. `~/tile-previews/shrine-maat-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a SHRINE standing on a plinth, the slab stepping out over it a CAVETTO CORNICE, and an
opening in its front.

Standing in the opening is MA'AT: a slim figure in a long sheath dress, facing the viewer, with a single
tall straight OSTRICH FEATHER standing upright out of her wig — shaft dead vertical, vane splitting to a
soft point. The feather is her whole identity and it must clear the top of her head cleanly against the
dark of the opening.

The shrine is gilded — gold leaf over wood, a flat warm ochre-yellow — worn through to dark timber on the
cornice's steps, along the front lip and at the corners, which is where a shrine is handled. The plinth
is black granite with a gilded band. Inside, the back of the shrine is deep shade. Ma'at is pale creamy
ALABASTER against it, her dress unpainted, her collar and her feather gilded.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the
reference image exactly and do not reason about them: whatever it does with verticals, with top faces,
with depth and with which way the object is turned, do the same. It is not a photograph and not an
isometric view, and it is not for you to correct into either.


Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold shrine --spin=18 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/shrine-maat.webp --tier=master --name=shrine-maat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/mask-sekhmet` — Sekhmet on the pharaoh's mask

3 rooms. **WAITS ON `master/mask`.** The mask scaffold is a human oval, so the lioness has to be carved
out of it inward — a broad flat muzzle and a mane filling the headdress, and nothing reaching past the
outline the reference gives.

**Attach:**

1. `~/tile-previews/mask-sekhmet-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a funerary mask hanging on a wall. The rounded mass behind and above is the HEADDRESS; the
oval in front of it is the FACE; the two bars flanking the face are the headdress's LAPPETS hanging down
at the sides; the wide band at the bottom is the broad COLLAR the mask sits in.

IT IS SEKHMET, so the face is a LIONESS'S: a broad flat muzzle low in the oval, a wide short nose, small
round ears set at the top corners, and a MANE filling the headdress behind — ruffed, not striped. Carve
all of that INSIDE the outline the reference gives; nothing may reach past it. Above the mane sits a
plain flat SUN DISC.

The lioness's face is gold leaf — a flat warm ochre-yellow — with the muzzle and the eye rims inlaid in
dark blue lapis. The mane is a deeper red-gold, worked in short strokes so it reads as fur where a nemes
would read as stripes. The sun disc is a flat deep red, ringed by a fine gold line. The collar is banded
faience in blue-green, dark blue and gold.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine anywhere on it.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold mask --shear=0.5 --width=448 --height=224 --sun=0 --margin=1.2 --colour=#d9a93f
yarn import-tile art/masters/props/master/mask-sekhmet.webp --tier=master --name=mask-sekhmet --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `wizard/shrine-ra` — Ra's disc in the gods' window on the cosmos

3 rooms. **WAITS ON `wizard/shrine`.**

**Attach:**

1. `~/tile-previews/shrine-ra-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a SHRINE — a box standing on a plinth, the slab stepping out over it a CAVETTO CORNICE, and
the opening in its front standing open.

What is inside is the NIGHT SKY: a deep blue-black going back further than the shrine is deep, with pale
STARS scattered through it. Hanging in the middle of that night, touching nothing, is a single SUN DISC —
Ra's disc — a plain flat circle with a COBRA coiled once round it, its head raised at the disc's right
edge. The disc is a flat pale gold, a colour and not a shine, and the stars thin out around it.

Do not paint a back panel, a floor or a wall behind them. The disc hangs in depth.

The shrine itself is polished calcite, cool green-white, seamless and without a tool mark or a speck of
dust, LIT FROM WITHIN AND FROM BENEATH so it is palest along the cornice's lower step and round the
opening's rim. A band of star-field inlay runs along the plinth.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the
reference image exactly and do not reason about them: whatever it does with verticals, with top faces,
with depth and with which way the object is turned, do the same. It is not a photograph and not an
isometric view, and it is not for you to correct into either.


Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold shrine --spin=-11 --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/shrine-ra.webp --tier=wizard --name=shrine-ra --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/statue-maat` — Ma'at in the gods' vault

3 rooms. **WAITS ON `wizard/statue`.**

**Attach:**

1. `~/tile-previews/statue-maat-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a standing statue of MA'AT, cut from one block of calcite. The slab at the bottom is the
PLINTH. The block across her hips is a long sheath DRESS to her ankles. The tapering block above her head
is her one attribute.

HER ONE MARK IS THE FEATHER: a single tall straight OSTRICH FEATHER standing upright out of her wig,
shaft dead vertical, vane splitting to a soft point. Carve it out of the tapering block the reference
gives you, and nothing else identifies her.

IT IS A CARVED OBJECT AND NOT A PERSON. Egyptian statuary is BLOCK-CARVED: flat planes, hard arrises, and
the figure never leaves the block. Her upper arms stay joined to her sides, the stone between her legs is
never cut through, nothing is undercut and nothing projects past the front edge of the plinth. No anatomy
is modelled.

Polished calcite, cool green-white, seamless and without a tool mark or a speck of dust. It is LIT FROM
WITHIN AND FROM BENEATH: the stone is faintly brighter at its lower edges and in the hollows, as though
the light comes up through it, and there is no shadow anywhere on the figure. The FEATHER is the palest
part of her, a flat pale green-white brighter than the stone it rises from. Her eye is a flat pale ring.
Star-field inlay runs round the plinth — small pale points in dark stone.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

THE REFERENCE IS A ROUGHED-OUT BLOCK. It is stone cut to the pose and deliberately left fat, and your job
is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the contour of the figure herself, and only by CUTTING. A shoulder gets
its slope, a calf its front arris, a jaw its plane. These are chisel cuts on a block, not modelling in clay — every mass stays square-shouldered and stays recognisably
the mass it already is.

CARVE INWARD ONLY. Every cut goes INSIDE the rough shape you were given — take stone away, never add it
outside the block's outline. Nothing may end up further left, right, higher or lower than the rough shape
reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the reference image exactly and do not reason about them: whatever it does with verticals, with top faces, with depth and with which way the object is turned, do the same. It is not a photograph and not an isometric view, and it is not for you to correct into either. This is the ONE thing about the picture you are given rather than asked for.
3. SHE STANDS, facing the viewer, one leg advanced. Both legs stay separate — do not merge them into a column.
4. THE PLINTH IS EXACTLY AS THE REFERENCE DRAWS IT — its angle, its rotation, how much of its top shows, how its edges run. Do not swing it round, do not flatten it, do not straighten it.
5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

You are re-carving a shape, not re-staging a photograph. If the plinth ends up pointing away from the viewer, the projection is wrong however good the figure is.

ANYTHING DRAWN OUTSIDE THE ROUGH SHAPE IS CUT OFF, fingers and toes included, and a clipped limb reads as an amputation. Nothing is added below the plinth either — no ground, no shadow, no floor.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=standing --spin=5 --colour=#8fd9bd --colour-figure=#7fa596 --floor=#5a8074
yarn import-tile art/masters/props/wizard/statue-maat.webp --tier=wizard --name=statue-maat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/shrine-maat` — Ma'at's feather in the gods' shrine

2 rooms. **WAITS ON `wizard/shrine`.** Same object as `wizard/shrine-ra` with the other god's mark in
the opening, so roll them together.

**Attach:**

1. `~/tile-previews/shrine-maat-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a SHRINE — a box standing on a plinth, the slab stepping out over it a CAVETTO CORNICE, and
the opening in its front standing open.

What is inside is the NIGHT SKY: a deep blue-black going back further than the shrine is deep, with pale
STARS scattered through it. Standing in the middle of that night, touching nothing, is a single tall
OSTRICH FEATHER — Ma'at's feather — upright, shaft dead vertical, vane splitting to a soft point. It is a
flat pale green-white against the dark, a colour and not a glow, and the stars thin out around it.

Do not paint a back panel, a floor or a wall behind them. The feather stands in depth.

The shrine itself is polished calcite, cool green-white, seamless and without a tool mark or a speck of
dust, LIT FROM WITHIN AND FROM BENEATH so it is palest along the cornice's lower step and round the
opening's rim. A band of star-field inlay runs along the plinth.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the
reference image exactly and do not reason about them: whatever it does with verticals, with top faces,
with depth and with which way the object is turned, do the same. It is not a photograph and not an
isometric view, and it is not for you to correct into either.


Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold shrine --spin=-11 --colour=#8fd9bd --floor=#5a8074
yarn import-tile art/masters/props/wizard/shrine-maat.webp --tier=wizard --name=shrine-maat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/mask-horus` — Horus on the pharaoh's mask

1 room. **WAITS ON `master/mask`.**

**Attach:**

1. `~/tile-previews/mask-horus-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Landscape, two units wide by one tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a funerary mask hanging on a wall. The rounded mass behind and above is the HEADDRESS; the
oval in front of it is the FACE; the two bars flanking the face are the headdress's LAPPETS hanging down
at the sides; the wide band at the bottom is the broad COLLAR the mask sits in.

IT IS HORUS, so the face is a FALCON'S: a short hooked BEAK low in the oval, a smooth domed skull, and a
dark stripe running back and down from each eye — the falcon's mark, and the thing that says bird rather
than man at any size. Carve it INSIDE the outline the reference gives; nothing may reach past it. Above
the headdress sits the DOUBLE CROWN — a tall white cone standing inside a red one that flares behind it.

The falcon's head is gold leaf — a flat warm ochre-yellow — with the beak and eye stripe in dark blue
lapis and the eye rimmed the same. The headdress and lappets are striped in gold and deep lapis blue,
narrow and even. The double crown is flat unpainted white inside flat deep red, no shading in either. The
collar is banded faience in blue-green, dark blue and gold.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine anywhere on it.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold mask --shear=0.5 --width=448 --height=224 --sun=0 --margin=1.2 --colour=#d9a93f
yarn import-tile art/masters/props/master/mask-horus.webp --tier=master --name=mask-horus --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `master/shrine-sekhmet` — Sekhmet in the pharaoh's shrine

1 room. **WAITS ON `master/shrine`.** Drops `--contents=couchant` for the same reason `master/shrine-maat`
does.

**Attach:**

1. `~/tile-previews/shrine-sekhmet-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a SHRINE standing on a plinth, the slab stepping out over it a CAVETTO CORNICE, and an
opening in its front.

Standing in the opening is SEKHMET: a figure in a long sheath dress with a LIONESS'S HEAD — a broad flat
muzzle, a wide short nose, small round ears and a ruffed mane at the shoulders. A plain flat SUN DISC
sits on top of her head. She is a lioness and not a cat: the mane is the difference and it must show.

The shrine is gilded — gold leaf over wood, a flat warm ochre-yellow — worn through to dark timber on the
cornice's steps, along the front lip and at the corners. The plinth is black granite with a gilded band.
Inside, the back of the shrine is deep shade. Sekhmet is dark polished granite against it, her dress
unpainted, her sun disc a flat deep red ringed with gold and her collar gilded.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the
reference image exactly and do not reason about them: whatever it does with verticals, with top faces,
with depth and with which way the object is turned, do the same. It is not a photograph and not an
isometric view, and it is not for you to correct into either.


Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold shrine --spin=18 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/shrine-sekhmet.webp --tier=master --name=shrine-sekhmet --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/statue-ra` — Ra in the gods' vault

1 room. **WAITS ON `wizard/statue`.** That entry already asks for Ra-Horakhty, falcon-headed with a sun
disc, so this file is very nearly the same painting — it exists because the resolver reads a filename and
the generic has to stay generic for the rooms no patron reaches. Roll it from the same prompt once
`wizard/statue` has landed.

**Attach:**

1. `~/tile-previews/statue-ra-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a standing statue of RA, falcon-headed, cut from one block of calcite. The slab at the bottom
is the PLINTH. The block across his hips is a KILT. The tapering block above his head is the SUN DISC he
wears — carve it round, and sit it on the crown of his skull rather than floating over it.

HIS HEAD IS A FALCON'S: a short hooked beak, a smooth domed skull, no muzzle, and a dark stripe running
back and down from the eye.

IT IS A CARVED OBJECT AND NOT A CREATURE. Egyptian statuary is BLOCK-CARVED: flat planes, hard arrises,
and the figure never leaves the block. His upper arms stay joined to his sides, the stone between his
advanced leg and the block behind it is never cut through, nothing is undercut and nothing projects past
the front edge of the plinth. No anatomy is modelled.

Polished calcite, cool green-white, seamless and without a tool mark or a speck of dust, LIT FROM WITHIN
AND FROM BENEATH so the stone is faintly brighter at its lower edges and in the hollows, with no shadow
anywhere on the figure. The SUN DISC is a flat pale gold, a colour and not a shine, with a COBRA coiled
once round it. His eye is a flat pale ring. Star-field inlay runs round the plinth.

Any light in this is a flat pale colour. No glow, no bloom, no rays, no highlight.

THE REFERENCE IS A ROUGHED-OUT BLOCK. It is stone cut to the pose and deliberately left fat, and your job
is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the contour of the figure himself, and only by CUTTING. A shoulder gets
its slope, a calf its front arris, the beak its hook. These are chisel cuts on a block, not modelling in clay — every mass stays square-shouldered and stays recognisably
the mass it already is.

CARVE INWARD ONLY. Every cut goes INSIDE the rough shape you were given — take stone away, never add it
outside the block's outline. Nothing may end up further left, right, higher or lower than the rough shape
reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the reference image exactly and do not reason about them: whatever it does with verticals, with top faces, with depth and with which way the object is turned, do the same. It is not a photograph and not an isometric view, and it is not for you to correct into either. This is the ONE thing about the picture you are given rather than asked for.
3. HE STANDS, facing the viewer, one leg advanced. Both legs stay separate — do not merge them into a column.
4. THE PLINTH IS EXACTLY AS THE REFERENCE DRAWS IT — its angle, its rotation, how much of its top shows, how its edges run. Do not swing it round, do not flatten it, do not straighten it.
5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

You are re-carving a shape, not re-staging a photograph. If the plinth ends up pointing away from the viewer, the projection is wrong however good the figure is.

ANYTHING DRAWN OUTSIDE THE ROUGH SHAPE IS CUT OFF, fingers and toes included, and a clipped limb reads as an amputation. Nothing is added below the plinth either — no ground, no shadow, no floor.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=standing --spin=5 --colour=#8fd9bd --colour-figure=#7fa596 --floor=#5a8074
yarn import-tile art/masters/props/wizard/statue-ra.webp --tier=wizard --name=statue-ra --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/shrine-osiris` — Osiris in the pharaoh's shrine

25 rooms, and the largest of the pairings the shrine rooms created. **WAITS ON `master/shrine`.** Drops
the generic's `--contents=couchant` for the reason `master/shrine-maat` does: that scaffold puts Anubis
on the lid, and a jackal cannot be repainted into Osiris.

**Attach:**

1. `~/tile-previews/shrine-osiris-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. Paint over the reference image itself.

The object: a SHRINE standing on a plinth, the slab stepping out over it a CAVETTO CORNICE, and an
opening in its front.

Standing in the opening is OSIRIS: a mummiform figure, wrapped straight from the shoulders down so he
has no separate legs, with a tall smooth white ATEF CROWN on his head and a narrow plume standing
against it on each side. A CROOK and a FLAIL are crossed on his chest as two short staffs. His face and
hands are a flat dull green, which is how Osiris is finished and the one thing that names him.

The shrine is gilded — gold leaf over wood, a flat warm ochre-yellow — worn through to dark timber on
the cornice's steps, along the front lip and at the corners, which is where a shrine is handled. The
plinth is black granite with a gilded band. Inside, the back of the shrine is deep shade, and Osiris
stands against it wrapped in unbleached linen with his crown unpainted white.

Gold here is a flat colour, not a metal: no highlights, no reflections, no shine.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold shrine --spin=18 --colour=#d9a93f --floor=#57534b
yarn import-tile art/masters/props/master/shrine-osiris.webp --tier=master --name=shrine-osiris --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/statue-sekhmet` — Sekhmet in the pharaoh's tomb

1 room. **WAITS ON `master/statue`.**

**Attach:**

1. `~/tile-previews/statue-sekhmet-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a standing statue of SEKHMET, cut from one block of black granite. The slab at the bottom is
the PLINTH. The block across her hips is a long sheath DRESS to her ankles. The tapering block above her
shoulders is her head and what she wears on it.

HER HEAD IS A LIONESS'S: a broad flat muzzle, a wide short nose, small round ears set at the top corners
and a ruffed MANE at the shoulders. She is a lioness and not a cat — the mane is the difference and it
must show. A plain flat SUN DISC sits on top of her head.

IT IS A CARVED OBJECT AND NOT A CREATURE. Egyptian statuary is BLOCK-CARVED: flat planes, hard arrises,
and the figure never leaves the block. Her upper arms stay joined to her sides, the stone between her
legs is never cut through, nothing is undercut and nothing projects past the front edge of the plinth.
No anatomy is modelled and no highlight sits on a shoulder.

Black granite, close-grained and dressed smooth. GILDED in three places only: the sun disc, the broad
collar at her throat and the band round the plinth, all a flat warm ochre-yellow worn through to the
stone along their lower edges. Her face, mane, arms and dress are bare polished granite. The disc is a
flat deep red inside its gold ring.

THE REFERENCE IS A ROUGHED-OUT BLOCK. It is stone cut to the pose and deliberately left fat, and your job
is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the contour of the figure herself, and only by CUTTING. A shoulder gets
its slope, a calf its front arris, the muzzle its plane. These are chisel cuts on a block, not modelling
in clay — every mass stays square-shouldered and stays recognisably the mass it already is.

CARVE INWARD ONLY. Every cut goes INSIDE the rough shape you were given — take stone away, never add it
outside the block's outline. Nothing may end up further left, right, higher or lower than the rough shape
reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the reference image exactly and do not reason about them: whatever it does with verticals, with top faces, with depth and with which way the object is turned, do the same. It is not a photograph and not an isometric view, and it is not for you to correct into either. This is the ONE thing about the picture you are given rather than asked for.

3. SHE STANDS, facing the viewer, one leg advanced. Both legs stay separate — do not merge them into a column.
4. THE PLINTH IS EXACTLY AS THE REFERENCE DRAWS IT — its angle, its rotation, how much of its top shows, how its edges run. Do not swing it round, do not flatten it, do not straighten it.

5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

You are re-carving a shape, not re-staging a photograph. If the plinth ends up pointing away from the viewer, the projection is wrong however good the figure is.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=standing --spin=-12 --colour=#d9a93f --colour-figure=#8a7434 --floor=#57534b
yarn import-tile art/masters/props/master/statue-sekhmet.webp --tier=master --name=statue-sekhmet --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `master/statue-horus` — Horus in the pharaoh's tomb

1 room. **WAITS ON `master/statue`.** Same object as `master/statue-sekhmet` with the other god's head,
so roll them together.

**Attach:**

1. `~/tile-previews/statue-horus-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a standing statue of HORUS, cut from one block of black granite. The slab at the bottom is
the PLINTH. The block across his hips is a KILT. The tapering block above his shoulders is his head and
the crown on it.

HIS HEAD IS A FALCON'S: a short hooked BEAK low in the mass, a smooth domed skull, no muzzle, and a dark
stripe running back and down from the eye — the falcon's mark, and what says bird rather than man at any
size. Above it sits the DOUBLE CROWN, a tall cone standing inside a second one that flares behind it.

IT IS A CARVED OBJECT AND NOT A CREATURE. Egyptian statuary is BLOCK-CARVED: flat planes, hard arrises,
and the figure never leaves the block. His upper arms stay joined to his sides, the stone between his
advanced leg and the block behind it is never cut through, nothing is undercut and nothing projects past
the front edge of the plinth. No anatomy is modelled and no highlight sits on a shoulder.

Black granite, close-grained and dressed smooth. The beak and the eye stripe are inlaid in dark blue
lapis. GILDED in three places only: the crown, the broad collar at his throat and the band round the
plinth, a flat warm ochre-yellow worn through to the stone along their lower edges. The crown's inner
cone is flat unpainted white and the flare behind it flat deep red, no shading in either.

THE REFERENCE IS A ROUGHED-OUT BLOCK. It is stone cut to the pose and deliberately left fat, and your job
is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the contour of the figure himself, and only by CUTTING. A shoulder gets
its slope, a calf its front arris, the beak its hook. These are chisel cuts on a block, not modelling in
clay — every mass stays square-shouldered and stays recognisably the mass it already is.

CARVE INWARD ONLY. Every cut goes INSIDE the rough shape you were given — take stone away, never add it
outside the block's outline. Nothing may end up further left, right, higher or lower than the rough shape
reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE PERSPECTIVE, THE PROJECTION, THE ANGLE AND THE ROTATION ARE THE REFERENCE'S. Take all four from the reference image exactly and do not reason about them: whatever it does with verticals, with top faces, with depth and with which way the object is turned, do the same. It is not a photograph and not an isometric view, and it is not for you to correct into either. This is the ONE thing about the picture you are given rather than asked for.

3. HE STANDS, facing the viewer, one leg advanced. Both legs stay separate — do not merge them into a column.
4. THE PLINTH IS EXACTLY AS THE REFERENCE DRAWS IT — its angle, its rotation, how much of its top shows, how its edges run. Do not swing it round, do not flatten it, do not straighten it.

5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

You are re-carving a shape, not re-staging a photograph. If the plinth ends up pointing away from the viewer, the projection is wrong however good the figure is.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Pharaoh's tomb: black granite, alabaster, faience inlay and gold leaf. Rich, but matte — gold here is a flat warm ochre-yellow, never a metallic highlight.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=standing --spin=-12 --colour=#d9a93f --colour-figure=#8a7434 --floor=#57534b
yarn import-tile art/masters/props/master/statue-horus.webp --tier=master --name=statue-horus --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

## The last three to expert — one room each

Everything else at starter, junior and expert is drawn. These three are the whole remaining gap below
master, and every one of them is a SINGLE room — which is why they sat unqueued while 62 rooms' worth of
expert work went in ahead of them. They are here because "done up to expert" is not done with dummies
still in it, not because any of them is urgent.

## Overgrown — seven

The condition's own pool. An overgrown floor draws THREE THINGS — a tuft in the paving joints, a root
through the wall band, a plant standing on a chamber floor — and today each of those is one sprite, so
every rank is overgrown with the same weed and nothing on the floor is any colour but green and stone.
These seven turn each of the three into a pool the renderer draws from
(docs/superpowers/specs/2026-09-26-overgrown-oasis-design.md).

**They are FLAT, and that changes the prompt.** No mesh, no scaffold, no mask: the generator's own
outline becomes the tile and the magenta is keyed out (`prop-pipeline.md` Step 0, "a FLAT wall item"). So
none of these carries the "keep every edge" sentence — there is no reference silhouette to hold paint to.
What they carry instead is the FRAME and the word FLAT, because a generator handed a plant with no
geometry under it will light it, shade it and stand it in a scene.

**One skin for every rank.** These import at `--tier=default` like the three they join: a merchant's
cellar and a god's vault get the same greenery, which is what keeps seven tiles at seven and not
thirty-five.

**The reference is the family, not a scaffold.** Each entry attaches whichever of the three landed tiles
it has to sit beside, so the new ones match their handling — same flat gouache, same weight of line, same
green. A tile that arrives prettier than the three it joins is the failure to look for.

**`tile-stats` WILL CALL THESE TOO CONTRASTY, AND THAT IS ACCEPTED.** The tool asks whether a tile sits
inside the stone's own value band — the right question for a chest or a statue, which are furniture cut
from the same rock as the room. A PLANT IS NOT. It is alive, the stone is not, and on an overgrown floor
it is the thing the eye is supposed to go to. So these seven are painted with real contrast and real
saturation, they will read "too contrasty" and sometimes "too warm", and that is the tile doing its job.

What the tool is still worth running for on these: the LIGHTNESS, which has to land near the tiles it
stands beside, and the keying. Take its `p50` seriously and ignore its verdict on the span.

An earlier pass told these prompts the opposite — a narrow value clamp, no highlights, all the light left
to the renderer — and the flat, matte plants that came back are why the rule is written down here now.
`overgrown-palm` landed under that older rule and is flatter than the six around it; it wants a re-roll
against this section once the rest are in.

**Saturation and brightness in the import lines are the ones its neighbours took, and are PLACEHOLDERS**
until the return is measured against the floor it lies on with `yarn tile-stats` — same rule as every
other block in this file.

### `default/overgrown-palm` — a young date palm in a broken chamber

**Attach:** `~/tile-previews/lush-light-reference.png` — and ONLY this. Take from it the LIGHT and the
COLOUR: how sun lands on a leaf, how saturated living green is beside stone, how far a lit face sits from
a shadowed one. Take nothing else — not the subject, not the perspective, not the photographic detail.

```
A single plant, a painted illustration with clear light and shade, matte surfaces, no background, on pure magenta #FF00FF. A SQUARE frame, one unit by one. Do not re-compose it into a portrait.


**THREE RULES THAT DECIDE WHETHER THIS TILE IS USABLE AT ALL. Read them before anything else.**

1. **NOTHING BUT THE PLANT.** No ground, no floor, no soil, no plinth, no earth under it, no scene — not
   even a sliver at the bottom. The plant is cut out and dropped into the game on its own. A painted
   ground survives as a hard BAR of colour across the bottom of the finished tile, and there is no flag
   and no mask that removes it; the tile is simply thrown away.
2. **THE BACKGROUND IS ONE FLAT MAGENTA, EVERYWHERE, UNTOUCHED.** Do not tint it, darken it, shade it, or
   lay a disc or pool of shadow behind or beneath the plant. The magenta is removed by EXACT colour, so a
   darkened magenta is not removed — it survives as a ring of dirty purple.
3. **NO CAST SHADOW ANYWHERE.** The only dark permitted is the small contact one described further down,
   and it sits ON the plant where it meets the ground, not on the ground itself.

The object: a YOUNG DATE PALM that has seeded itself in a tomb chamber and grown up toward the hole in
the roof. A single slender trunk, patterned with the diamond scars of old frond bases, leaning very
slightly. Five or six arching fronds at the top, each one a long rib with stiff leaflets along both
sides — draw the leaflets as a comb of short strokes, not as a feather. A few dead fronds hang down
against the trunk under the green ones, DRY AND DUSTY, a grey-ochre going to straw, never orange or rust.

It STANDS ON THE FLOOR and is seen from the front, the way a piece of furniture in this tomb is seen. Its
base is at the bottom edge of the frame and its crown at the top. It is a tile about the size of a jar
rack, so the whole plant reads at a glance: fewer, larger fronds beat many small ones.

NOTHING LIES AT ITS FOOT. No fallen fronds, no litter, no debris on the ground — those are their own tile
(`default/overgrown-fronds`), and painted here they feather into the magenta and key out as pink specks.

EVERY SHAPE HAS A CLEAN, SOLID EDGE. Do not feather, blur or fade anything into the background: a soft
edge over the magenta keys out as a fringe of pink specks, and a flat tile has no mask to rescue it.

IT SITS ON THE GROUND, AND IT DARKENS WHERE IT TOUCHES. Pool a soft dark into the very bottom of the
plant — the base of the trunk or crown, and the ground immediately around it — fading out within a
fraction of the plant's own width. Every prop in this game bakes one of these into its bottom rows, and a
tile without one lies on the paving like a sticker however well the map lights it.

THIS IS CONTACT, NOT A CAST SHADOW. It does not fall to one side, it carries no direction, and it does
not reach away across the floor — a thing resting on the ground is dark where it meets the ground,
whichever way the light comes from — so it is true of this tile wherever the map happens to put it.

**THE CAMERA IS 30° ABOVE THE FLOOR, AND EVERY TILE IN THIS GAME AGREES ON IT.** You are looking
slightly DOWN on the plant, not at it from the side. What follows is not a mood, it is arithmetic:

- Anything facing UP is squashed to HALF its depth but keeps its full width. A crown of fronds spraying
  outward is an up-facing thing: it reads as a wide, shallow ELLIPSE — about twice as wide as it is deep
  — and you see the UPPER surfaces of the fronds that go away from you, not their profile.
- Anything facing the VIEWER is barely foreshortened. A trunk keeps its height.
- **A plant with height still shows its top.** Drawn as a flat fan, symmetrical, seen edge-on, it reads
  as a sticker standing on the floor — which is exactly what the last roll of this tile did, and it is
  the one thing that makes a tile disagree with the room around it.
- Verticals stay vertical and horizontals stay horizontal: an orthographic squash, never a vanishing
  point. Nothing is drawn from three-quarter or from behind.

Check it against a jar rack or a timber post in this game: you see the top of the rail, the elliptical top
of the post. That is the angle.

**THE LIGHT COMES FROM THE FRONT AND SLIGHTLY ABOVE** — from where the viewer is, tilted down. The
upper surfaces and the parts facing the viewer take the light; the undersides of the leaves, the far
side of the stem and anything tucked behind another part fall into shadow.

STRAIGHT ON, AND NOT FROM ONE SIDE. The source is square in front, so there is NO brighter flank —
nothing lighter on the left than on the right. That is load-bearing: the renderer turns and MIRRORS these
sprites at random to keep a floor from repeating, and light from a side would land on the wrong flank in
half the cells. Light from the front survives both.

**MAKE THE LIGHT OBVIOUS.** This is the whole point of the tile: it should look like something the sun is
falling on, not a diagram of a plant. Push the lit parts well clear of the shadowed ones — a real range
from bright to dark within the tile — and let the brightest touches sit on the few surfaces most square
to the viewer. A flat silhouette in one value is the failure.

**NAME THE COLOURS, BECAUSE "SATURATED" KEEPS COMING BACK GREY.** Four rolls of this family have
returned the same washed sage and chalky pastel, and they are not what is wanted. The greens are WARM and
deep — olive, moss, a yellow-green where the light strikes — and never the pale blue-grey sage of a dried
herb. Where the light falls they go golden-green and almost yellow; in shadow they go deep and rich, not
merely darker. Flowers are STRONG colour: hot rose, deep coral, clear cream, not tinted white.

Think of a plant in full afternoon sun in a warm country, not a botanical plate and not a faded tapestry.

Draw it square on, in straight orthographic projection — no perspective, no vanishing point, no
foreshortening. That is what "square on" governs: it says nothing about the light, which is meant to be
plainly visible. No perspective, no scene, no floor under it, no pot, no wall behind it.

Matte surfaces throughout: lit, never polished — no gloss, no shine, no wet highlights.
```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-ferns.webp --tier=default --name=overgrown-ferns --slot=growth \
  --filter=smooth --saturation=3.2 --brightness=0.82
```

```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-palm.webp --tier=default --name=overgrown-palm --slot=growth \
  --filter=smooth --saturation=1.0 --brightness=1.0
```

### `default/overgrown-plant` — a leafy plant standing in a chamber

**Attach:** `~/tile-previews/lush-light-reference.png` — and ONLY this. Take from it the LIGHT and the
COLOUR: how sun lands on a leaf, how saturated living green is beside stone, how far a lit face sits from
a shadowed one. Take nothing else — not the subject, not the perspective, not the photographic detail.

```
A single plant, a painted illustration with clear light and shade, matte surfaces, no background, on pure magenta #FF00FF. A SQUARE frame, one unit by one. Do not re-compose it into a portrait.


**THREE RULES THAT DECIDE WHETHER THIS TILE IS USABLE AT ALL. Read them before anything else.**

1. **NOTHING BUT THE PLANT.** No ground, no floor, no soil, no plinth, no earth under it, no scene — not
   even a sliver at the bottom. The plant is cut out and dropped into the game on its own. A painted
   ground survives as a hard BAR of colour across the bottom of the finished tile, and there is no flag
   and no mask that removes it; the tile is simply thrown away.
2. **THE BACKGROUND IS ONE FLAT MAGENTA, EVERYWHERE, UNTOUCHED.** Do not tint it, darken it, shade it, or
   lay a disc or pool of shadow behind or beneath the plant. The magenta is removed by EXACT colour, so a
   darkened magenta is not removed — it survives as a ring of dirty purple.
3. **NO CAST SHADOW ANYWHERE.** The only dark permitted is the small contact one described further down,
   and it sits ON the plant where it meets the ground, not on the ground itself.

The object: a BROAD LEAFY PLANT that has taken over a corner of a tomb chamber — not a palm and not a
fern, but something thick and bushy with big soft leaves, the kind that grows fast wherever light and
water arrive together. A dense mound of overlapping leaves on short stems, widest across its middle,
rising from a crown at the bottom.

It is the BULK of the chamber pool: where the palm is tall and the ferns are fine, this is the one that
fills a corner. It replaces an older tile that came back spiky and grey, closer to an agave than to
anything lush.

It STANDS ON THE FLOOR and is seen from the front, the way a piece of furniture in this tomb is seen. Its
base is at the bottom edge of the frame; nothing is cut off by any edge.

EVERY SHAPE HAS A CLEAN, SOLID EDGE. Do not feather, blur or fade anything into the background: a soft
edge over the magenta keys out as a fringe of pink specks, and a flat tile has no mask to rescue it.

IT SITS ON THE GROUND, AND IT DARKENS WHERE IT TOUCHES. Pool a soft dark into the very bottom of the
plant — the base of the trunk or crown, and the ground immediately around it — fading out within a
fraction of the plant's own width. Every prop in this game bakes one of these into its bottom rows, and a
tile without one lies on the paving like a sticker however well the map lights it.

THIS IS CONTACT, NOT A CAST SHADOW. It does not fall to one side, it carries no direction, and it does
not reach away across the floor — a thing resting on the ground is dark where it meets the ground,
whichever way the light comes from — so it is true of this tile wherever the map happens to put it.

**THE CAMERA IS 30° ABOVE THE FLOOR, AND EVERY TILE IN THIS GAME AGREES ON IT.** You are looking
slightly DOWN on the plant, not at it from the side. What follows is not a mood, it is arithmetic:

- Anything facing UP is squashed to HALF its depth but keeps its full width. A crown of fronds spraying
  outward is an up-facing thing: it reads as a wide, shallow ELLIPSE — about twice as wide as it is deep
  — and you see the UPPER surfaces of the fronds that go away from you, not their profile.
- Anything facing the VIEWER is barely foreshortened. A trunk keeps its height.
- **A plant with height still shows its top.** Drawn as a flat fan, symmetrical, seen edge-on, it reads
  as a sticker standing on the floor — which is exactly what the last roll of this tile did, and it is
  the one thing that makes a tile disagree with the room around it.
- Verticals stay vertical and horizontals stay horizontal: an orthographic squash, never a vanishing
  point. Nothing is drawn from three-quarter or from behind.

Check it against a jar rack or a timber post in this game: you see the top of the rail, the elliptical top
of the post. That is the angle.

**THE LIGHT COMES FROM THE FRONT AND SLIGHTLY ABOVE** — from where the viewer is, tilted down. The
upper surfaces and the parts facing the viewer take the light; the undersides of the leaves, the far
side of the stem and anything tucked behind another part fall into shadow.

STRAIGHT ON, AND NOT FROM ONE SIDE. The source is square in front, so there is NO brighter flank —
nothing lighter on the left than on the right. That is load-bearing: the renderer turns and MIRRORS these
sprites at random to keep a floor from repeating, and light from a side would land on the wrong flank in
half the cells. Light from the front survives both.

**MAKE THE LIGHT OBVIOUS.** This is the whole point of the tile: it should look like something the sun is
falling on, not a diagram of a plant. Push the lit parts well clear of the shadowed ones — a real range
from bright to dark within the tile — and let the brightest touches sit on the few surfaces most square
to the viewer. A flat silhouette in one value is the failure.

**NAME THE COLOURS, BECAUSE "SATURATED" KEEPS COMING BACK GREY.** Four rolls of this family have
returned the same washed sage and chalky pastel, and they are not what is wanted. The greens are WARM and
deep — olive, moss, a yellow-green where the light strikes — and never the pale blue-grey sage of a dried
herb. Where the light falls they go golden-green and almost yellow; in shadow they go deep and rich, not
merely darker. Flowers are STRONG colour: hot rose, deep coral, clear cream, not tinted white.

Think of a plant in full afternoon sun in a warm country, not a botanical plate and not a faded tapestry.

Draw it square on, in straight orthographic projection — no perspective, no vanishing point, no
foreshortening. That is what "square on" governs: it says nothing about the light, which is meant to be
plainly visible. No perspective, no scene, no floor under it, no pot, no wall behind it.

Matte surfaces throughout: lit, never polished — no gloss, no shine, no wet highlights.
```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-ferns.webp --tier=default --name=overgrown-ferns --slot=growth \
  --filter=smooth --saturation=3.2 --brightness=0.82
```

```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-plant.webp --tier=default --name=overgrown-plant --slot=growth \
  --filter=smooth --saturation=1.0 --brightness=1.0
```

### `default/overgrown-wall` — a root forcing through the wall band

**Attach:** `~/tile-previews/lush-light-reference.png` — and ONLY this. Take from it the LIGHT and the
COLOUR: how sun lands on a leaf, how saturated living green is beside stone, how far a lit face sits from
a shadowed one. Take nothing else — not the subject, not the perspective, not the photographic detail.

```
A root and its leaves, a painted illustration with clear light and shade, matte surfaces, no background, on pure magenta #FF00FF. A PORTRAIT frame, two units wide by three tall. Do not re-compose it into a square.


**THREE RULES THAT DECIDE WHETHER THIS TILE IS USABLE AT ALL. Read them before anything else.**

1. **NOTHING BUT THE PLANT.** No ground, no floor, no soil, no plinth, no earth under it, no scene — not
   even a sliver at the bottom. The plant is cut out and dropped into the game on its own. A painted
   ground survives as a hard BAR of colour across the bottom of the finished tile, and there is no flag
   and no mask that removes it; the tile is simply thrown away.
2. **THE BACKGROUND IS ONE FLAT MAGENTA, EVERYWHERE, UNTOUCHED.** Do not tint it, darken it, shade it, or
   lay a disc or pool of shadow behind or beneath the plant. The magenta is removed by EXACT colour, so a
   darkened magenta is not removed — it survives as a ring of dirty purple.
3. **NO CAST SHADOW ANYWHERE.** The only dark permitted is the small contact one described further down,
   and it sits ON the plant where it meets the ground, not on the ground itself.

The object: a THICK ROOT that has forced its way through the brick and is hanging down the inside face of
the wall. One main woody root entering at the TOP EDGE, splitting into two or three as it falls, with
small leaves breaking out along its length and clustering where it has found the light.

A ROOT THROUGH A WALL IS THE THING THAT SAYS A BUILDING IS LOSING, which is this tile's whole job — a
weed in a joint is untidiness, this is structural. Make it look strong: woody, thick at the top where it
comes through, not a trailing vine.

IT MUST REACH BOTH EDGES. It enters at the top edge and its ends pass out through the bottom — this is
stretched down a wall band by the renderer, and a plant that stops inside the frame reads as a stain
painted on the wall instead of something growing through it.

EVERY SHAPE HAS A CLEAN, SOLID EDGE. Do not feather, blur or fade anything into the background: a soft
edge over the magenta keys out as a fringe of pink specks, and a flat tile has no mask to rescue it.

IT SITS ON THE GROUND, AND IT DARKENS WHERE IT TOUCHES. Pool a soft dark into the very bottom of the
plant — the base of the trunk or crown, and the ground immediately around it — fading out within a
fraction of the plant's own width. Every prop in this game bakes one of these into its bottom rows, and a
tile without one lies on the paving like a sticker however well the map lights it.

THIS IS CONTACT, NOT A CAST SHADOW. It does not fall to one side, it carries no direction, and it does
not reach away across the floor — a thing resting on the ground is dark where it meets the ground,
whichever way the light comes from — so it is true of this tile wherever the map happens to put it.

**THE LIGHT COMES FROM THE FRONT AND SLIGHTLY ABOVE** — from where the viewer is, tilted down. The
upper surfaces and the parts facing the viewer take the light; the undersides of the leaves, the far
side of the stem and anything tucked behind another part fall into shadow.

STRAIGHT ON, AND NOT FROM ONE SIDE. The source is square in front, so there is NO brighter flank —
nothing lighter on the left than on the right. That is load-bearing: the renderer turns and MIRRORS these
sprites at random to keep a floor from repeating, and light from a side would land on the wrong flank in
half the cells. Light from the front survives both.

**MAKE THE LIGHT OBVIOUS.** This is the whole point of the tile: it should look like something the sun is
falling on, not a diagram of a plant. Push the lit parts well clear of the shadowed ones — a real range
from bright to dark within the tile — and let the brightest touches sit on the few surfaces most square
to the viewer. A flat silhouette in one value is the failure.

**NAME THE COLOURS, BECAUSE "SATURATED" KEEPS COMING BACK GREY.** Four rolls of this family have
returned the same washed sage and chalky pastel, and they are not what is wanted. The greens are WARM and
deep — olive, moss, a yellow-green where the light strikes — and never the pale blue-grey sage of a dried
herb. Where the light falls they go golden-green and almost yellow; in shadow they go deep and rich, not
merely darker. Flowers are STRONG colour: hot rose, deep coral, clear cream, not tinted white.

Think of a plant in full afternoon sun in a warm country, not a botanical plate and not a faded tapestry.

Draw it square on, in straight orthographic projection — no perspective, no vanishing point, no
foreshortening. That is what "square on" governs: it says nothing about the light, which is meant to be
plainly visible. No perspective, no scene, no floor under it, no pot, no wall behind it.

Matte surfaces throughout: lit, never polished — no gloss, no shine, no wet highlights.
```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-ferns.webp --tier=default --name=overgrown-ferns --slot=growth \
  --filter=smooth --saturation=3.2 --brightness=0.82
```

```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-wall.webp --tier=default --name=overgrown-wall --slot=growthWall \
  --filter=smooth --saturation=1.0 --brightness=1.0
```

### `default/overgrown-ferns` — a clump of ferns on a chamber floor

**Attach:** `~/tile-previews/lush-light-reference.png` — and ONLY this. Take from it the LIGHT and the
COLOUR: how sun lands on a leaf, how saturated living green is beside stone, how far a lit face sits from
a shadowed one. Take nothing else — not the subject, not the perspective, not the photographic detail.

```
A single plant, a painted illustration with clear light and shade, matte surfaces, no background, on pure magenta #FF00FF. A SQUARE frame, one unit by one. Do not re-compose it into a portrait.


**THREE RULES THAT DECIDE WHETHER THIS TILE IS USABLE AT ALL. Read them before anything else.**

1. **NOTHING BUT THE PLANT.** No ground, no floor, no soil, no plinth, no earth under it, no scene — not
   even a sliver at the bottom. The plant is cut out and dropped into the game on its own. A painted
   ground survives as a hard BAR of colour across the bottom of the finished tile, and there is no flag
   and no mask that removes it; the tile is simply thrown away.
2. **THE BACKGROUND IS ONE FLAT MAGENTA, EVERYWHERE, UNTOUCHED.** Do not tint it, darken it, shade it, or
   lay a disc or pool of shadow behind or beneath the plant. The magenta is removed by EXACT colour, so a
   darkened magenta is not removed — it survives as a ring of dirty purple.
3. **NO CAST SHADOW ANYWHERE.** The only dark permitted is the small contact one described further down,
   and it sits ON the plant where it meets the ground, not on the ground itself.

The object: a CLUMP OF FERNS grown up out of a cracked tomb floor where water collects. Seven or eight
fronds rising from one crown at the bottom, each arching outward and over — tall in the middle, shorter
and more horizontal at the sides, so the clump is a fountain shape wider at the top than at its base.
Each frond is a rib with rounded lobes along it, biggest at the middle of the frond and smaller toward
the tip. One or two fronds are still curled at the tip in a tight crozier.

It STANDS ON THE FLOOR and is seen from the front, the way a piece of furniture in this tomb is seen. Its
crown is at the bottom edge of the frame; nothing is cut off by any edge.

A deep cool green, darker and bluer than a palm, with the undersides of the lobes paler where a frond
turns over. Nothing about it is dry — this is the plant that found the wet corner.

EVERY SHAPE HAS A CLEAN, SOLID EDGE. Do not feather, blur or fade anything into the background: a soft
edge over the magenta keys out as a fringe of pink specks, and a flat tile has no mask to rescue it.

IT SITS ON THE GROUND, AND IT DARKENS WHERE IT TOUCHES. Pool a soft dark into the very bottom of the
plant — the base of the trunk or crown, and the ground immediately around it — fading out within a
fraction of the plant's own width. Every prop in this game bakes one of these into its bottom rows, and a
tile without one lies on the paving like a sticker however well the map lights it.

THIS IS CONTACT, NOT A CAST SHADOW. It does not fall to one side, it carries no direction, and it does
not reach away across the floor — a thing resting on the ground is dark where it meets the ground,
whichever way the light comes from — so it is true of this tile wherever the map happens to put it.

**THE CAMERA IS 30° ABOVE THE FLOOR, AND EVERY TILE IN THIS GAME AGREES ON IT.** You are looking
slightly DOWN on the plant, not at it from the side. What follows is not a mood, it is arithmetic:

- Anything facing UP is squashed to HALF its depth but keeps its full width. A crown of fronds spraying
  outward is an up-facing thing: it reads as a wide, shallow ELLIPSE — about twice as wide as it is deep
  — and you see the UPPER surfaces of the fronds that go away from you, not their profile.
- Anything facing the VIEWER is barely foreshortened. A trunk keeps its height.
- **A plant with height still shows its top.** Drawn as a flat fan, symmetrical, seen edge-on, it reads
  as a sticker standing on the floor — which is exactly what the last roll of this tile did, and it is
  the one thing that makes a tile disagree with the room around it.
- Verticals stay vertical and horizontals stay horizontal: an orthographic squash, never a vanishing
  point. Nothing is drawn from three-quarter or from behind.

Check it against a jar rack or a timber post in this game: you see the top of the rail, the elliptical top
of the post. That is the angle.

**THE LIGHT COMES FROM THE FRONT AND SLIGHTLY ABOVE** — from where the viewer is, tilted down. The
upper surfaces and the parts facing the viewer take the light; the undersides of the leaves, the far
side of the stem and anything tucked behind another part fall into shadow.

STRAIGHT ON, AND NOT FROM ONE SIDE. The source is square in front, so there is NO brighter flank —
nothing lighter on the left than on the right. That is load-bearing: the renderer turns and MIRRORS these
sprites at random to keep a floor from repeating, and light from a side would land on the wrong flank in
half the cells. Light from the front survives both.

**MAKE THE LIGHT OBVIOUS.** This is the whole point of the tile: it should look like something the sun is
falling on, not a diagram of a plant. Push the lit parts well clear of the shadowed ones — a real range
from bright to dark within the tile — and let the brightest touches sit on the few surfaces most square
to the viewer. A flat silhouette in one value is the failure.

**NAME THE COLOURS, BECAUSE "SATURATED" KEEPS COMING BACK GREY.** Four rolls of this family have
returned the same washed sage and chalky pastel, and they are not what is wanted. The greens are WARM and
deep — olive, moss, a yellow-green where the light strikes — and never the pale blue-grey sage of a dried
herb. Where the light falls they go golden-green and almost yellow; in shadow they go deep and rich, not
merely darker. Flowers are STRONG colour: hot rose, deep coral, clear cream, not tinted white.

Think of a plant in full afternoon sun in a warm country, not a botanical plate and not a faded tapestry.

Draw it square on, in straight orthographic projection — no perspective, no vanishing point, no
foreshortening. That is what "square on" governs: it says nothing about the light, which is meant to be
plainly visible. No perspective, no scene, no floor under it, no pot, no wall behind it.

Matte surfaces throughout: lit, never polished — no gloss, no shine, no wet highlights.
```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-ferns.webp --tier=default --name=overgrown-ferns --slot=growth \
  --filter=smooth --saturation=3.2 --brightness=0.82
```

### `default/overgrown-scrub` — a dry tussock in a joint

**Attach:** `~/tile-previews/lush-light-reference.png` — and ONLY this. Take from it the LIGHT and the
COLOUR: how sun lands on a leaf, how saturated living green is beside stone, how far a lit face sits from
a shadowed one. Take nothing else — not the subject, not the perspective, not the photographic detail.

```
A small clump of grass, a painted illustration with clear light and shade, matte surfaces, no background, on pure magenta #FF00FF. A SQUARE frame, one unit by one. Do not re-compose it into a portrait.


**THREE RULES THAT DECIDE WHETHER THIS TILE IS USABLE AT ALL. Read them before anything else.**

1. **NOTHING BUT THE PLANT.** No ground, no floor, no soil, no plinth, no earth under it, no scene — not
   even a sliver at the bottom. The plant is cut out and dropped into the game on its own. A painted
   ground survives as a hard BAR of colour across the bottom of the finished tile, and there is no flag
   and no mask that removes it; the tile is simply thrown away.
2. **THE BACKGROUND IS ONE FLAT MAGENTA, EVERYWHERE, UNTOUCHED.** Do not tint it, darken it, shade it, or
   lay a disc or pool of shadow behind or beneath the plant. The magenta is removed by EXACT colour, so a
   darkened magenta is not removed — it survives as a ring of dirty purple.
3. **NO CAST SHADOW ANYWHERE.** The only dark permitted is the small contact one described further down,
   and it sits ON the plant where it meets the ground, not on the ground itself.

The object: a TUSSOCK OF DRY GRASS in a paving joint, the kind that lives on almost nothing. A spray of
stiff narrow blades from one point, most of them standing and a few bent right over and broken. Half the
clump is still green at the base and the rest has gone straw-pale toward the tips, so the tile carries
both.

It is the DRY one of this set. The floors it lies on already carry a green tuft and a green root; this is
what a floor looks like where the light gets in but the water does not, and it should read as a different
plant rather than as the same one drawn again.

It LIES ON THE PAVING and is seen from above, flat to the floor. It is a small thing, about a third of a
floor slab, and it will be drawn small — so keep the blades few and clear rather than fine and many.

EVERY SHAPE HAS A CLEAN, SOLID EDGE. Do not feather, blur or fade anything into the background: a soft
edge over the magenta keys out as a fringe of pink specks, and a flat tile has no mask to rescue it.

IT LIES ON THE PAVING, AND IT DARKENS WHERE IT TOUCHES. Put a thin soft dark directly beneath the mass,
just under the leaves and stems where they meet the stone, fading out within a leaf's width. Every prop
in this game bakes one of these into its bottom rows, and a tile without one lies on the paving like a
sticker however well the map lights it.

THIS IS CONTACT, NOT A CAST SHADOW. It does not fall to one side, it carries no direction, and it does
not reach away across the floor — a thing resting on the ground is dark where it meets the ground,
whichever way the light comes from — so it is true of this tile wherever the map happens to put it.

**THE CAMERA IS 30° ABOVE THE FLOOR, AND EVERY TILE IN THIS GAME AGREES ON IT.** This lies on the
paving, so you are looking down its length at that angle, not straight down from overhead. What follows
is arithmetic, not mood: anything facing UP is squashed to HALF its depth but keeps its full width, so a
rosette lying on the stone reads as a wide, shallow ELLIPSE — about twice as wide as it is deep — never
as a circle. Leaves reaching toward the viewer and away from the viewer are the ones that shorten; leaves
reaching left and right keep their length. Verticals stay vertical: an orthographic squash, never a
vanishing point.

**THE LIGHT COMES FROM THE FRONT AND SLIGHTLY ABOVE** — from where the viewer is, tilted down. The
tops of the petals and leaves take the light; what lies under them, what is deeper in the clump, and the
ground showing between them fall into shadow.

STRAIGHT ON, AND NOT FROM ONE SIDE. The source is square in front, so there is NO brighter flank —
nothing lighter on the left than on the right. That is load-bearing: the renderer turns and MIRRORS these
sprites at random to keep a floor from repeating, and light from a side would land on the wrong flank in
half the cells. Light from the front survives both.

**MAKE THE LIGHT OBVIOUS.** This is the whole point of the tile: it should look like something the sun is
falling on, not a diagram of a plant. Push the lit parts well clear of the shadowed ones — a real range
from bright to dark within the tile — and let the brightest touches sit on the few surfaces most square
to the viewer. A flat silhouette in one value is the failure.

**NAME THE COLOURS, BECAUSE "SATURATED" KEEPS COMING BACK GREY.** Four rolls of this family have
returned the same washed sage and chalky pastel, and they are not what is wanted. The greens are WARM and
deep — olive, moss, a yellow-green where the light strikes — and never the pale blue-grey sage of a dried
herb. Where the light falls they go golden-green and almost yellow; in shadow they go deep and rich, not
merely darker. Flowers are STRONG colour: hot rose, deep coral, clear cream, not tinted white.

Think of a plant in full afternoon sun in a warm country, not a botanical plate and not a faded tapestry.

Draw it square on, in straight orthographic projection — no perspective, no vanishing point, no
foreshortening. That is what "square on" governs: it says nothing about the light, which is meant to be
plainly visible. No perspective, no scene, no paving under it, no crack, no soil.

Matte surfaces throughout: lit, never polished — no gloss, no shine, no wet highlights.
```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-scrub.webp --tier=default --name=overgrown-scrub --slot=growth \
  --filter=smooth --saturation=2.6 --brightness=0.58
```

### `default/overgrown-fronds` — fallen fronds on the paving

**Attach:** `~/tile-previews/lush-light-reference.png` — and ONLY this. Take from it the LIGHT and the
COLOUR: how sun lands on a leaf, how saturated living green is beside stone, how far a lit face sits from
a shadowed one. Take nothing else — not the subject, not the perspective, not the photographic detail.

```
Fallen leaves, a painted illustration with clear light and shade, matte surfaces, no background, on pure magenta #FF00FF. A SQUARE frame, one unit by one. Do not re-compose it into a portrait.


**THREE RULES THAT DECIDE WHETHER THIS TILE IS USABLE AT ALL. Read them before anything else.**

1. **NOTHING BUT THE PLANT.** No ground, no floor, no soil, no plinth, no earth under it, no scene — not
   even a sliver at the bottom. The plant is cut out and dropped into the game on its own. A painted
   ground survives as a hard BAR of colour across the bottom of the finished tile, and there is no flag
   and no mask that removes it; the tile is simply thrown away.
2. **THE BACKGROUND IS ONE FLAT MAGENTA, EVERYWHERE, UNTOUCHED.** Do not tint it, darken it, shade it, or
   lay a disc or pool of shadow behind or beneath the plant. The magenta is removed by EXACT colour, so a
   darkened magenta is not removed — it survives as a ring of dirty purple.
3. **NO CAST SHADOW ANYWHERE.** The only dark permitted is the small contact one described further down,
   and it sits ON the plant where it meets the ground, not on the ground itself.

The object: TWO OR THREE DEAD PALM FRONDS that have dropped onto the paving and are lying where they
fell. Each is a long rib with stiff leaflets along it, curled and split, one crossing another. They are
not arranged: they lie at odd angles to each other, and one has broken across its middle.

It is LITTER AND NOT A PLANT, which is what it contributes — a floor with only living things on it looks
tended. These say something above has been shedding for years.

Dry throughout: straw and pale ochre, going grey where a frond has lain longest, with no green left
anywhere in them.

It LIES ON THE PAVING and is seen from above, flat to the floor, filling more width than height. The
arrangement need not match the reference.

EVERY SHAPE HAS A CLEAN, SOLID EDGE. Do not feather, blur or fade anything into the background: a soft
edge over the magenta keys out as a fringe of pink specks, and a flat tile has no mask to rescue it.

IT LIES ON THE PAVING, AND IT DARKENS WHERE IT TOUCHES. Put a thin soft dark directly beneath the mass,
just under the leaves and stems where they meet the stone, fading out within a leaf's width. Every prop
in this game bakes one of these into its bottom rows, and a tile without one lies on the paving like a
sticker however well the map lights it.

THIS IS CONTACT, NOT A CAST SHADOW. It does not fall to one side, it carries no direction, and it does
not reach away across the floor — a thing resting on the ground is dark where it meets the ground,
whichever way the light comes from — so it is true of this tile wherever the map happens to put it.

**THE CAMERA IS 30° ABOVE THE FLOOR, AND EVERY TILE IN THIS GAME AGREES ON IT.** This lies on the
paving, so you are looking down its length at that angle, not straight down from overhead. What follows
is arithmetic, not mood: anything facing UP is squashed to HALF its depth but keeps its full width, so a
rosette lying on the stone reads as a wide, shallow ELLIPSE — about twice as wide as it is deep — never
as a circle. Leaves reaching toward the viewer and away from the viewer are the ones that shorten; leaves
reaching left and right keep their length. Verticals stay vertical: an orthographic squash, never a
vanishing point.

**THE LIGHT COMES FROM THE FRONT AND SLIGHTLY ABOVE** — from where the viewer is, tilted down. The
tops of the petals and leaves take the light; what lies under them, what is deeper in the clump, and the
ground showing between them fall into shadow.

STRAIGHT ON, AND NOT FROM ONE SIDE. The source is square in front, so there is NO brighter flank —
nothing lighter on the left than on the right. That is load-bearing: the renderer turns and MIRRORS these
sprites at random to keep a floor from repeating, and light from a side would land on the wrong flank in
half the cells. Light from the front survives both.

**MAKE THE LIGHT OBVIOUS.** This is the whole point of the tile: it should look like something the sun is
falling on, not a diagram of a plant. Push the lit parts well clear of the shadowed ones — a real range
from bright to dark within the tile — and let the brightest touches sit on the few surfaces most square
to the viewer. A flat silhouette in one value is the failure.

**NAME THE COLOURS, BECAUSE "SATURATED" KEEPS COMING BACK GREY.** Four rolls of this family have
returned the same washed sage and chalky pastel, and they are not what is wanted. The greens are WARM and
deep — olive, moss, a yellow-green where the light strikes — and never the pale blue-grey sage of a dried
herb. Where the light falls they go golden-green and almost yellow; in shadow they go deep and rich, not
merely darker. Flowers are STRONG colour: hot rose, deep coral, clear cream, not tinted white.

Think of a plant in full afternoon sun in a warm country, not a botanical plate and not a faded tapestry.

Draw it square on, in straight orthographic projection — no perspective, no vanishing point, no
foreshortening. That is what "square on" governs: it says nothing about the light, which is meant to be
plainly visible. No perspective, no scene, no paving under them, no soil.

Matte surfaces throughout: lit, never polished — no gloss, no shine, no wet highlights.
```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-fronds.webp --tier=default --name=overgrown-fronds --slot=growth \
  --filter=smooth --saturation=2.6 --brightness=0.58
```

### `default/overgrown-creeper` — a creeper hanging down the wall band

**Attach:** `~/tile-previews/lush-light-reference.png` — and ONLY this. Take from it the LIGHT and the
COLOUR: how sun lands on a leaf, how saturated living green is beside stone, how far a lit face sits from
a shadowed one. Take nothing else — not the subject, not the perspective, not the photographic detail.

```
A hanging plant, a painted illustration with clear light and shade, matte surfaces, no background, on pure magenta #FF00FF. A PORTRAIT frame, two units wide by three tall. Do not re-compose it into a square.


**THREE RULES THAT DECIDE WHETHER THIS TILE IS USABLE AT ALL. Read them before anything else.**

1. **NOTHING BUT THE PLANT.** No ground, no floor, no soil, no plinth, no earth under it, no scene — not
   even a sliver at the bottom. The plant is cut out and dropped into the game on its own. A painted
   ground survives as a hard BAR of colour across the bottom of the finished tile, and there is no flag
   and no mask that removes it; the tile is simply thrown away.
2. **THE BACKGROUND IS ONE FLAT MAGENTA, EVERYWHERE, UNTOUCHED.** Do not tint it, darken it, shade it, or
   lay a disc or pool of shadow behind or beneath the plant. The magenta is removed by EXACT colour, so a
   darkened magenta is not removed — it survives as a ring of dirty purple.
3. **NO CAST SHADOW ANYWHERE.** The only dark permitted is the small contact one described further down,
   and it sits ON the plant where it meets the ground, not on the ground itself.

The object: a CREEPER that has come in over the top of a wall and is hanging down the face of it. Two or
three thin woody stems enter at the TOP EDGE of the frame and fall the whole height, with heart-shaped
leaves alternating along them, largest near the top and smaller toward the trailing ends. A tendril or
two curls away from the stem into the air.

IT MUST REACH BOTH EDGES. It enters at the top edge and its ends pass out through the bottom edge — this
is stretched down a wall band by the renderer, and a plant that stops inside the frame reads as a stain
painted on the wall instead of something growing over it.

A living mid-green, a little yellower than the root it hangs beside, with the woody stems grey-brown.

EVERY SHAPE HAS A CLEAN, SOLID EDGE. Do not feather, blur or fade anything into the background: a soft
edge over the magenta keys out as a fringe of pink specks, and a flat tile has no mask to rescue it.

IT COMES OUT OF THE STONE, AND IT DARKENS WHERE IT EMERGES. Put a soft dark at the TOP EDGE where the
stems come through, fading out within a stem's length as they fall clear. A plant growing through a wall
is in shadow at the hole it came through, and without that it reads as painted onto the brick rather than
growing out of it.

THIS IS CONTACT, NOT A CAST SHADOW: no direction, nothing thrown sideways onto the wall.

**THE LIGHT COMES FROM THE FRONT AND SLIGHTLY ABOVE** — from where the viewer is, tilted down. The
upper surfaces and the parts facing the viewer take the light; the undersides of the leaves, the far
side of the stem and anything tucked behind another part fall into shadow.

STRAIGHT ON, AND NOT FROM ONE SIDE. The source is square in front, so there is NO brighter flank —
nothing lighter on the left than on the right. That is load-bearing: the renderer turns and MIRRORS these
sprites at random to keep a floor from repeating, and light from a side would land on the wrong flank in
half the cells. Light from the front survives both.

**MAKE THE LIGHT OBVIOUS.** This is the whole point of the tile: it should look like something the sun is
falling on, not a diagram of a plant. Push the lit parts well clear of the shadowed ones — a real range
from bright to dark within the tile — and let the brightest touches sit on the few surfaces most square
to the viewer. A flat silhouette in one value is the failure.

**NAME THE COLOURS, BECAUSE "SATURATED" KEEPS COMING BACK GREY.** Four rolls of this family have
returned the same washed sage and chalky pastel, and they are not what is wanted. The greens are WARM and
deep — olive, moss, a yellow-green where the light strikes — and never the pale blue-grey sage of a dried
herb. Where the light falls they go golden-green and almost yellow; in shadow they go deep and rich, not
merely darker. Flowers are STRONG colour: hot rose, deep coral, clear cream, not tinted white.

Think of a plant in full afternoon sun in a warm country, not a botanical plate and not a faded tapestry.

Draw it square on against the wall, in straight orthographic projection — no perspective, no vanishing
point. That governs the PROJECTION only, and says nothing about the light, which is meant to be plainly
visible. No perspective, no scene, no bricks behind
it, no wall.

Matte surfaces throughout: lit, never polished — no gloss, no shine, no wet highlights.
```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-creeper.webp --tier=default --name=overgrown-creeper --slot=growthWall \
  --filter=smooth --saturation=2.4 --brightness=0.85
```

### `default/overgrown-curtain` — a curtain of roots down the wall band

**Attach:** `~/tile-previews/lush-light-reference.png` — and ONLY this. Take from it the LIGHT and the
COLOUR: how sun lands on a leaf, how saturated living green is beside stone, how far a lit face sits from
a shadowed one. Take nothing else — not the subject, not the perspective, not the photographic detail.

```
Hanging roots, a painted illustration with clear light and shade, matte surfaces, no background, on pure magenta #FF00FF. A PORTRAIT frame, two units wide by three tall. Do not re-compose it into a square.


**THREE RULES THAT DECIDE WHETHER THIS TILE IS USABLE AT ALL. Read them before anything else.**

1. **NOTHING BUT THE PLANT.** No ground, no floor, no soil, no plinth, no earth under it, no scene — not
   even a sliver at the bottom. The plant is cut out and dropped into the game on its own. A painted
   ground survives as a hard BAR of colour across the bottom of the finished tile, and there is no flag
   and no mask that removes it; the tile is simply thrown away.
2. **THE BACKGROUND IS ONE FLAT MAGENTA, EVERYWHERE, UNTOUCHED.** Do not tint it, darken it, shade it, or
   lay a disc or pool of shadow behind or beneath the plant. The magenta is removed by EXACT colour, so a
   darkened magenta is not removed — it survives as a ring of dirty purple.
3. **NO CAST SHADOW ANYWHERE.** The only dark permitted is the small contact one described further down,
   and it sits ON the plant where it meets the ground, not on the ground itself.

The object: a CURTAIN OF AERIAL ROOTS let down the inside face of a wall by something growing above it.
Many fine roots hanging close together and nearly straight, of several lengths, a few of them fused into
thicker ropes where they have twisted together. No leaves anywhere: this is the plant's underside.

IT MUST REACH BOTH EDGES. The roots enter at the TOP EDGE and hang out through the BOTTOM — this is
stretched down a wall band by the renderer, and roots that stop inside the frame read as a stain painted
on the wall.

It is the DENSE one of this set, where the other wall tile is a single root forcing through brick: this
one is a veil you would have to push through, and it should read as mass rather than as line.

Pale grey-brown and dusty, barely green at all — these have never seen the light.

EVERY SHAPE HAS A CLEAN, SOLID EDGE. Do not feather, blur or fade anything into the background: a soft
edge over the magenta keys out as a fringe of pink specks, and a flat tile has no mask to rescue it.

IT COMES OUT OF THE STONE, AND IT DARKENS WHERE IT EMERGES. Put a soft dark at the TOP EDGE where the
stems come through, fading out within a stem's length as they fall clear. A plant growing through a wall
is in shadow at the hole it came through, and without that it reads as painted onto the brick rather than
growing out of it.

THIS IS CONTACT, NOT A CAST SHADOW: no direction, nothing thrown sideways onto the wall.

**THE LIGHT COMES FROM THE FRONT AND SLIGHTLY ABOVE** — from where the viewer is, tilted down. The
upper surfaces and the parts facing the viewer take the light; the undersides of the leaves, the far
side of the stem and anything tucked behind another part fall into shadow.

STRAIGHT ON, AND NOT FROM ONE SIDE. The source is square in front, so there is NO brighter flank —
nothing lighter on the left than on the right. That is load-bearing: the renderer turns and MIRRORS these
sprites at random to keep a floor from repeating, and light from a side would land on the wrong flank in
half the cells. Light from the front survives both.

**MAKE THE LIGHT OBVIOUS.** This is the whole point of the tile: it should look like something the sun is
falling on, not a diagram of a plant. Push the lit parts well clear of the shadowed ones — a real range
from bright to dark within the tile — and let the brightest touches sit on the few surfaces most square
to the viewer. A flat silhouette in one value is the failure.

**NAME THE COLOURS, BECAUSE "SATURATED" KEEPS COMING BACK GREY.** Four rolls of this family have
returned the same washed sage and chalky pastel, and they are not what is wanted. The greens are WARM and
deep — olive, moss, a yellow-green where the light strikes — and never the pale blue-grey sage of a dried
herb. Where the light falls they go golden-green and almost yellow; in shadow they go deep and rich, not
merely darker. Flowers are STRONG colour: hot rose, deep coral, clear cream, not tinted white.

Think of a plant in full afternoon sun in a warm country, not a botanical plate and not a faded tapestry.

Draw it square on against the wall, in straight orthographic projection — no perspective, no vanishing
point. That governs the PROJECTION only, and says nothing about the light, which is meant to be plainly
visible. No perspective, no scene, no bricks behind
it, no wall.

Matte surfaces throughout: lit, never polished — no gloss, no shine, no wet highlights.
```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/surfaces/overgrown-curtain.webp --tier=default --name=overgrown-curtain --slot=growthWall \
  --filter=smooth --saturation=2.4 --brightness=0.85
```
