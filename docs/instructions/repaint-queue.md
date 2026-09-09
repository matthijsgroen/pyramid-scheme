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

**How to use one entry.** Attach the two images it names, paste the fenced block verbatim, take the result
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

---

## Nobleman — two

Both were believed blocked on a museum scan until `prim_statue` existed. Neither is: a figure is a POSE
and its face is paint, which the priest's canopic jars and his Anubis both proved. See `expert/statue`
for the worked example of a shape-free prompt, and the five numbered rules in it that keep one honest.

### `junior/statue` — the owner's ka-statue, seated

**Attach:**

1. `~/tile-previews/statue-junior.png` — the scaffold
2. `~/tile-previews/junior-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a KA-STATUE of the tomb's owner, seated on a throne, cut from one block of limestone. The
tapering block on his head is a NEMES headcloth, widening to his shoulders. The block across his hips is
a KILT.

IT IS A CARVED OBJECT AND NOT A PERSON, and this matters more than any other line here. Egyptian statuary
is BLOCK-CARVED: flat planes, hard arrises, and the figure never leaves the block it was cut from. His
upper arms stay joined to his sides, his hands stay flat on his knees, his calves stay merged with the
seat, and there is no daylight anywhere between a limb and the stone behind it. Nothing is undercut and
nothing projects past the front edge of the plinth.

NO ANATOMY IS MODELLED: no muscle bellies, no nipples, no navel, no tendons, no separated toes, and not
one highlight on a shoulder or a knee — a highlight there means a body is being painted, so paint the flat
plane instead. He has no expression, no gesture and no lifelike proportions. This is a cult object with a
fixed face, not a character and not an illustration of a man.

The stone is one material throughout, the figure and the throne and the plinth alike. Do not paint a
person sitting in front of a stone chair.

THE REFERENCE IS A ROUGHED-OUT BLOCK. It is stone cut to the pose and deliberately left fat, and your job
is to take the last of the waste off it.

CHANGE, freely, and ONLY this: the contour of the man himself, and only by CUTTING. A shoulder gets its
slope, a knee its front arris, a jaw its plane. These are chisel cuts on a block, not modelling in clay —
every mass stays square-shouldered and stays recognisably the mass it already is.

CARVE INWARD ONLY. Every cut goes INSIDE the rough shape you were given — take stone away, never add it
outside the block's outline. Nothing may end up further left, right, higher or lower than the rough shape
reaches.

EVERYTHING ELSE IS FIXED, and these five are not negotiable:

1. THE FRAME. Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square.
2. THE VIEW HAS NO PERSPECTIVE. There is no vanishing point and nothing converges. Every vertical line stays vertical and parallel; every horizontal line stays horizontal and parallel.
3. HE IS SEATED, facing the viewer, hands flat on his knees. The slab behind him is the THRONE BACK and the block under him the SEAT — they stay square-cut stone furniture, not part of his body.
4. THE PLINTH runs across the picture, its long edges horizontal at the same slight tilt as the reference. It does not turn to recede into the distance.
5. THE PLACEMENT AND THE SIZE. Every part stays where the reference puts it, and the whole object stays as tall and as wide in the frame as it already is.

Painted LIMESTONE, and the paint is PIGMENT LYING ON STONE, never skin: pale creamy stone underneath, the
flesh laid in flat warm red-brown with no shading, no blush and no soft edge where it meets the stone; the
nemes striped in blue and gold; the kilt white with a painted belt; the eye carved first and then outlined
in black kohl, flat, with no glint in it. The paint is worn thin on the knees, the shoulders and the nose
where it has been touched, showing bare stone through, and it is chipped along every arris. The throne and
plinth are plain limestone with an ochre band along the plinth.

You are re-carving a shape, not re-staging a photograph. If the plinth ends up pointing away from the viewer, the projection is wrong however good the figure is.

ANYTHING DRAWN OUTSIDE THE ROUGH SHAPE IS CUT OFF, fingers and toes included, and a clipped limb reads as an amputation. Nothing is added below the plinth either — no ground, no shadow, no floor.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Nobleman's tomb: dressed limestone, painted plaster, ochre and red banding. Warm sandstone, brightly painted, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=seated --spin=7 --colour=#e0c193 --colour-figure=#8a6a44 --floor=#c39c68
yarn import-tile art/masters/props/junior/statue.webp --tier=junior --name=statue --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `junior/sarcophagus` — an anthropoid coffin, painted face, yellow ground

**IT STANDS UPRIGHT, and that is deliberate.** A coffin's identity is its anthropoid outline, and lying on
a bier that outline is in the top face, which this shear compresses — two passes of it read as a chest
with a stepped lid. Stood up, the outline is in the front plane, the one plane the shear leaves alone.
Everything the brief asks of a coffin at any rank faces the viewer this way: a painted face, crossed arms,
a cartouche band, a hollow if it is open. See `prim_statue`.

**Attach:**

1. `~/tile-previews/sarcophagus-junior.png` — the scaffold
2. `~/tile-previews/junior-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. No perspective and no vanishing point: verticals stay vertical, horizontals stay horizontal.

The object: an ANTHROPOID COFFIN, standing upright and propped against its own plinth, seen from the
front. It is body-shaped — narrow at the head, widest at the shoulders, tapering to the feet. The raised
panel at the top is the FACE. The two bars across the chest are the ARMS, crossed. The slab it stands on
is the PLINTH.

It stands. Do not lay it down, and do not open it.

Carved and plastered wood, painted on a YELLOW GROUND — the whole case a warm ochre-yellow, divided into
panels by bands of blue, red and white. The face is painted flesh-red with a blue-and-gold striped wig
either side of it and heavy black kohl round the eyes. The crossed arms are painted dark red. Bands of
small dark hieroglyphs run down the front and across the chest, too fine to read. The plaster is chipped
at the foot and along one shoulder, showing pale wood beneath. The plinth is plain limestone.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Nobleman's tomb: dressed limestone, painted plaster, ochre and red banding. Warm sandstone, brightly painted, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=mummiform --spin=11 --colour=#e0c193 --colour-figure=#8a6a44 --floor=#c39c68
yarn import-tile art/masters/props/junior/sarcophagus.webp --tier=junior --name=sarcophagus --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

---

## Priest — eleven

His CHAMBER props, and none of them existed as a model until now: his rank had nothing but the veil and
the hanging. Six are new `--contents` variants — `statue` among them, which the table used to send to a scan — and five are geometry another rank already proved, which
is the difference between them worth knowing — a variant's silhouette is his, a reused one's is not, and
the prompt is all that makes the reused ones his rank's. His `tallyBoard` is here too, and it is the only
FLAT thing in the section: no mesh, no mask, straight to the generator.

Still missing after this: `sarcophagus`, which waits on a museum scan — unless `expert/statue` lands, in which case a coffin is a posture too (art-tasks §5).

### `expert/sarcophagus` — the priest's coffin, corded and sealed

Upright, for the reason `junior/sarcophagus` records: an anthropoid outline lives in the front plane,
which is the one plane this shear leaves alone.

**Attach:**

1. `~/tile-previews/sarcophagus-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

Portrait, two units wide by three tall, exactly as the reference. Do not re-compose it into a square. No perspective and no vanishing point: verticals stay vertical, horizontals stay horizontal.

The object: a PRIEST'S COFFIN, standing upright against its own plinth, seen from the front. It is
body-shaped — narrow at the head, widest at the shoulders, tapering to the feet. The raised panel at the
top is the FACE. The two bars across the chest are the ARMS, crossed. The slab it stands on is the PLINTH.

It stands, and it is SHUT. Do not lay it down and do not open it.

Dark cedar, oiled almost black, its grain running down the length of the case. The face is carved wood
left bare and rubbed paler, its eyes inlaid with white shell and dark stone. The crossed arms are carved
in low relief. A single band of small incised hieroglyphs runs down the front, filled with pale paste.

CORDED AND SEALED: an undyed linen cord is wound round the case twice, above and below the arms, and where
it crosses at the centre there is a lump of grey CLAY stamped with a mark. The seal is unbroken. Natron
dust has collected along the cords and in the carving.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=mummiform --spin=-6 --colour=#a7b2be --colour-figure=#6f6459 --floor=#8d98a5
yarn import-tile art/masters/props/expert/sarcophagus.webp --tier=expert --name=sarcophagus --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `expert/basin` — a sacred pool with steps down into it

**THE ONLY SCAFFOLD IN THIS FILE THAT COMES WITH A FLOOR, and three failed rolls are why.** A hole cannot
be a product shot. Every other scaffold is an object on magenta and an object on magenta is a thing you
could pick up; a hole is an ABSENCE IN A SURFACE, and with the surface missing the same picture is equally
a tank, a panel or a flat pattern. Told plainly, it came back a raised stone tub. Told that nothing may
stand up, it came back a flat plan diagram with no depth in it at all. Neither was disobedient — both
answered the only question the picture asked.

`pit` survives the same shape without a floor because it is full of things that CROSS ITS OWN EDGE: a
ladder over the near lip, its spoil on the paving outside. Where a hole has no such furniture, the surface
has to be drawn instead — so this one is handed over rendered `--context=1.04x0.74`, which puts the rank's
floor round it with a hole of exactly that size cut in it, so the floor's own edge is the coping's outer
edge. It is added after the camera, so the frame is unchanged, and the mask is rendered WITHOUT it. No
floor reaches the tile. The two numbers are the coping's own metres, measured off the primitive;
`prop-pipeline.md` has why that needs saying and what it cost.

**The floor runs off ALL FOUR EDGES**, the near one included. Ground that stops inside the frame is a
plinth with a hole in it, and with a shadow beneath, a slab floating in the air.

**AND THE COPING IS BEDDED FLUSH, which is what the fifth roll was for.** Built with the paving at the
water's rim the kerb stood a finger proud of it, and the painted return read exactly as that: a framed
slab lying ON the floor with its own shadow under it, which at 56 units is a picture hung on a wall. The
whole pool now drops until the coping's top IS the paving. Nothing stands above the floor any more, so
this is the one prop in the file imported with no `--seat` — there is nothing left to cast a shadow.

**Regenerating this one's scaffold takes an extra flag** that no other entry needs —
`--context=1.04x0.74 --shadow=0` on the handed-over render, and on that render only. The exact command is under
"Regenerating the attachments" at the foot of this file, because a fenced block cannot go here: `yarn
repaint` takes an entry's FIRST bare fence as the prompt, so a code block above it is what gets pasted.

**Which is why this prompt does not mention magenta.** There is none in the reference: the frame is
paving. The paint that lands on the paving is discarded by the mask exactly as an invented background is,
so it costs nothing and is not worth a word of the prompt.

**Attach:**

1. `~/tile-previews/basin-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A single object painted in flat matte gouache, seen from above and slightly in front, in the same raked
view as the reference. Portrait, two units wide by three tall, exactly as the reference. No perspective
and no vanishing point: verticals stay vertical, horizontals stay horizontal.

The scene: a SACRED POOL cut down into a stone floor. The whole frame is that floor, and the pool is a
hole in it. You are painting a floor with a pool in it, not an object standing on a surface.

The pale field filling the frame is the PAVING. The dark rectangle sunk into it is WATER, filling the pool
nearly to the brim. The low border running all the way round the water is a stone COPING, a course of kerb
laid flush with the paving on all four sides, and the length of it nearest you passes IN FRONT of the
water. The four ledges at the left, the lowest of them under the surface, are STEPS walking down into the
pool from the paving.

Nothing here is a tank, a tub, a trough or a basin, and nothing has an outside you could see. NOTHING
STANDS ABOVE THE PAVING — not even the coping, which is bedded level with it, its top face in the same
plane as the slabs it is set into. Everything else is below.

The paving is dark basalt, cool grey-blue, laid in large dressed slabs and dusted with natron. The ruled
grid across the whole frame gives the JOINTS between those slabs; keep every one of them where it is, so
the paving reads as one continuous floor running out of the picture on all four sides. The coping is the
same stone in one unbroken course with no joints in it, its inner edge rubbed pale where feet cross it —
that change of surface is all that separates it from the paving, so do not draw a shadow beside it. The
steps are worn hollow in their middles.

The water is a still flat surface, dark green-grey, a touch lighter where it meets the stone, and darker
in the far corners. A pale crust of NATRON has dried along the waterline all round and on the tread of the
step that stands clear of the water; the submerged step is darker and greener than the ones above it.


Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold basin --contents=pool --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/basin.webp --tier=expert --name=basin --slot=prop \
  --filter=smooth --mask="$OBJ" --brightness=0.9
```

### `expert/brazier` — a censer hanging on its stand

**Attach:**

1. `~/tile-previews/brazier-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a CENSER hanging from a stand. The disc on the floor is the stand's FOOT, the upright above it
the POST, and the bar reaching right from its top the ARM. The two thin verticals hanging from the arm are
CHAINS. The wide shallow vessel they hold is the CENSER, and the low round mass inside it is BURNING
INCENSE. Under the censer, its underside is in deep shade.

Cast bronze throughout the stand, chains and vessel, dark with a green-black patina, rubbed warmer along
the arm's upper edge and on the foot's rim where it is handled. The censer's inside is sooted black. The
burning incense is a dull ember red-orange, matte, darkest at its edges and only faintly brighter at its
centre — no glow, no light thrown on the bronze, and no flame.

Smoke may rise from it in a thin grey haze, but it must be faint enough to see the chains through and must
not touch the frame's edges.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold brazier --contents=censer --spin=22 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/brazier.webp --tier=expert --name=brazier --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `expert/pillar` — a papyrus-bundle column

**Attach:**

1. `~/tile-previews/pillar-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a PAPYRUS-BUNDLE COLUMN, running from the floor up out of the top of the picture. The shaft is
carved as a bundle of stems standing side by side, so its surface is a row of tall rounded RIBS and its
edges are scalloped rather than straight. The thick band low down and the one near the top are BINDINGS,
cord tied round the bundle. The swelling shape above the upper binding is the base of a CLOSED PAPYRUS BUD
capital, and only its lower part is in the picture.

Dark basalt, cool grey-blue, dressed smooth. Each rib carries SUNK RELIEF — shallow carved hieroglyph
columns, cut into the stone rather than raised on it, their insides a touch darker than the face. Natron
dust has collected along the lower binding and in the joints between the ribs. The bindings are the same
stone, carved to look like cord, with the cord's twist showing.

The ribs must stay as separate ribs down the whole shaft: do not smooth them into one round column.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold palm --contents=papyrus --spin=6 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/pillar.webp --tier=expert --name=pillar --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `expert/shrine` — a naos, doors shut and sealed

**Attach:**

1. `~/tile-previews/shrine-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a NAOS — a shrine cabinet standing on the floor, its doors shut. The slab under it is the
PLINTH; the two slabs stepping out at the top are a CAVETTO CORNICE; the uprights either side of the doors
are JAMBS. The two panels filling the front are the DOOR LEAVES, shut, with a narrow dark GAP where they
meet. The bar across both of them is a CORD, and the lump where it crosses the gap is a CLAY SEAL,
unbroken.

The doors are SHUT. There is no opening, no gap into an interior, and nothing visible inside.

The plinth, cornice and jambs are dark basalt, cool grey-blue, dressed smooth, with natron dust in the
cornice's step and along the plinth's top. The doors are cedar, dark red-brown, their grain running
vertically and dulled with age. The cord is undyed linen, grubby; the seal is grey clay stamped with a
mark.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold shrine --contents=sealed --spin=-19 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/shrine.webp --tier=expert --name=shrine --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `expert/pit` — a robbed-out hole, its lid slab broken beside it

The geometry is the MERCHANT's, unchanged, and so are the four below. Nothing about the shape is this
rank's — the prompt is the whole of what makes it his, which is why these five read as the cheap half of
the section. Reuse is the point: a variant was only modelled where the brief asks for a different OBJECT.

**Attach:**

1. `~/tile-previews/pit-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a HOLE cut through the floor, robbed out. The near-black rectangle is the SHAFT going down and
it must stay black. The raised stone edging round it is the KERB. The pole laid across its far lip is a
POLE and the ladder over it a ROPE LADDER going down. The broken slabs lying beside the hole are the
pieces of its LID, prised off and dropped.

The kerb and the lid pieces are dark basalt, cool grey-blue, dressed smooth on their faces and freshly
broken on the edges — the break is paler and rougher than the dressed face, which is what says recent.
Natron dust and grit are scattered round the kerb and over the lid pieces. The pole is dark cedar, the
ladder undyed linen rope.

The shaft is a HOLE. Paint darkness in it, never a floor, a wall or a back panel. No pink and no purple
anywhere in it.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold pit --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/pit.webp --tier=expert --name=pit --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `expert/rubblePile` — a collapsed door plug

**Attach:**

1. `~/tile-previews/rubblePile-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a HEAP of broken stone — the blocks of a door plug that has been knocked through and has
fallen inward. Every piece is a block of the same masonry, at a different angle.

Dark basalt, cool grey-blue. Each block has a DRESSED face, smooth and dust-filmed, and BROKEN faces that
are paler, rougher and sharper-edged: the contrast between the two is what says these were cut and are now
smashed. A pale crust of NATRON has dried over the pieces low in the heap. Scattered among them are a few
fragments of grey CLAY SEAL, some with part of a stamped mark still on them, and one short length of
undyed linen CORD.

The arrangement of the pieces does not matter and need not match the reference — paint the material and
let the pieces fall where they fall.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold rubblePile --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/rubblePile.webp --tier=expert --name=rubblePile --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `expert/mat` — a rush mat worn through in the middle

Its identity is PAINT: under this projection a flat thing on the floor has no silhouette at all, so
nothing but the material tells this from the merchant's. See `prim_mat`.

**Attach:**

1. `~/tile-previews/mat-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A flat rectangular MAT seen from above, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a rush mat lying on the floor before an altar, knelt on for years. It is woven from split
rush in a close plain weave, running in bands across its width, with a plaited edge all round.

Pale straw-buff, greyed and dulled with dust. It is WORN THROUGH IN THE MIDDLE: at the centre the weave
has gone thin and broken, showing dark gaps and loose frayed ends, and the wear fades out toward the
edges, which are still sound. The plaited edge is darker than the field, from handling.

Fill the whole shape to its edges. The wear is the subject: without it this is a new mat.

No highlights, no gloss, no rim light, no shadow, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold mat --spin=12 --shadow=0.5 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/mat.webp --tier=expert --name=mat --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `expert/chestProp` — a cedar relic box, seal intact

**Attach:**

1. `~/tile-previews/chestProp-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a RELIC BOX with its seal unbroken. The box standing on four short FEET is the body; the band
round its top is where the LID meets it and the slab above that is the lid. The strap running over the lid
and down its front is a CORD, and the lump where it lies against the front face is a CLAY SEAL, intact.

Cedar, dark red-brown, its grain running along the length of the box, the corners rubbed paler where it
has been carried. The lid band is dull bronze, dark with a green-black patina. The cord is undyed linen,
grubby. The seal is grey clay with a stamped mark still crisp on it — this box has not been opened.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold sealedChest --spin=-24 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/chestProp.webp --tier=expert --name=chestProp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `expert/lamp` — a tall oil stand on a papyrus shaft

**Attach:**

1. `~/tile-previews/lamp-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a tall OIL LAMP STAND. The wide flared cone at the bottom is its FOOT; the upright between
foot and top is the SHAFT; the collar partway up is a BAND; the shallow dish on top is the OIL BOWL and
the small nub above its right side is the FLAME.

Cast bronze, dark with a green-black patina, rubbed warmer on the foot's rim and on the band where it is
handled. The shaft is worked as a PAPYRUS COLUMN — narrow vertical ribs down its length, gathered in at
the band — and the ribs are the one thing on it that must read. The bowl holds a film of oil and is sooted
black around the flame. The flame is a small ochre-orange tongue, matte, with no glow around it and no
light thrown on the bronze.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold lamp --contents=stand --spin=11 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/expert/lamp.webp --tier=expert --name=lamp --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `expert/tallyBoard` — an ostracon board in red and black

FLAT, so it has NO scaffold and NO mask: a board hanging against a wall is a slab, and Step 0's table
sends flat things straight to the generator. Its own silhouette becomes the tile, which is why this one
has a single attachment and an import line with no `--mask`.

**Attach:**

1. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: an OSTRACON BOARD hanging flat against a wall — a thin rectangular plank, wider than it is
tall, with a peg at each top corner and a cord between them. Nothing about it stands out from the wall: it
is a flat board seen square on.

Whitewashed cedar, the wash thin enough that the grain shows through and chipped away at the corners. It
is written on in two colours: columns of small hieratic figures in BLACK, with the headings and every
total in RED, in a scribe's quick hand. The writing is too fine to read and must not be drawn as
hieroglyphs — this is cursive bookkeeping, not carved signs. Some lines are struck through and rewritten.
The pegs are dark cedar, the cord undyed linen.

Draw it perfectly square-on and flat. No thickness at the sides, no top face, no shadow.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
yarn import-tile art/masters/props/expert/tallyBoard.webp --tier=expert --name=tallyBoard --slot=wall \
  --filter=smooth --headroom=0.18
```

---

## Pharaoh — fifteen

Wall items and one curtain. Gold is a flat colour at this rank, never a metal — every prompt below says so, because the generator will otherwise return a chrome highlight.

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
2. THE VIEW HAS NO PERSPECTIVE. There is no vanishing point and nothing converges. Every vertical line stays vertical and parallel; every horizontal line stays horizontal and parallel.
3. HE STANDS, facing the viewer, one leg advanced. Both legs stay separate — do not merge them into a column or a mummy wrap.
4. THE PLINTH runs across the picture, its long edges horizontal at the same slight tilt as the reference. It does not turn to recede into the distance.
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

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

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
A wall-less product shot of a recess cut into a wall, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
scaffold mask --shear=0.5 --width=448 --height=224 --sun=0 --margin=1.2
yarn import-tile art/masters/props/master/mask.webp --tier=master --name=mask --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `master/hanging` — a gold-shot curtain with a weighted hem

**Attach:**

1. `~/tile-previews/hanging-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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

**Attach:**

1. `~/tile-previews/chestProp-master.png` — the scaffold
2. `~/tile-previews/master-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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

## Gods — seven

Four of the five contain a VOID: a black opening that must come back black. His shrine, his niche and his shaft are the same rectangle if their frames are not what tells them apart, so the frame is what each prompt names first.

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
2. THE VIEW HAS NO PERSPECTIVE. There is no vanishing point and nothing converges. Every vertical line stays vertical and parallel; every horizontal line stays horizontal and parallel.
3. HE STANDS, facing the viewer, one leg advanced. Both legs stay separate — do not merge them into a column.
4. THE PLINTH runs across the picture, its long edges horizontal at the same slight tilt as the reference. It does not turn to recede into the distance.
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

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold statue --contents=mummiform --open=1 --spin=-9 --colour=#8fd9bd --colour-figure=#7fa596 --floor=#5a8074
yarn import-tile art/masters/props/wizard/sarcophagus.webp --tier=wizard --name=sarcophagus --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `wizard/niche` — a niche holding one star

**Attach:**

1. `~/tile-previews/niche-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a recess cut into a wall, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a niche with a single star in it. The frame around the opening is the SURROUND — jambs, lintel
and sill; the opening itself is BLACK, a piece of night sky; the six-pointed shape floating in the middle
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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a shrine cabinet on a wall with nothing inside it. The wide slab over the top is a CAVETTO
CORNICE and the slab under it is the PLINTH, both overhanging the box between them; the uprights at the
sides are JAMBS; between them the opening is BLACK and completely empty.

The cornice, plinth and jambs are polished calcite, cool green-white, seamless, without tool marks or dust,
and light leaks faintly from the joints between them. The opening is a deep even black.

The near-black opening is a HOLE and must stay black — paint darkness in it, never a wall, a floor or a back panel. No pink and no purple anywhere in it. There is no statue, no door, no offering and no back wall in it: the shrine is an opening and
nothing else, and that emptiness is the subject.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. The gods' vault: polished calcite lit from beneath, star-field inlay, seamless stone with no tool marks and no dust at all. Cool green-white, and any light in it is a flat pale colour, never a glow.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold wallShrine --contents=opening --shear=0.5 --width=448 --height=224 --sun=0
yarn import-tile art/masters/props/wizard/wallShrine.webp --tier=wizard --name=wallShrine --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `wizard/starShaft` — a slot on the night

**Attach:**

1. `~/tile-previews/starshaft-wizard.png` — the scaffold
2. `~/tile-previews/wizard-plain.png` — the material reference

```
A wall-less product shot of a slot cut through a wall, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a shaft cut through the stone with stars showing in it. The band around the opening is the
FRAME — a bar above, a bar below, a jamb at each side; the opening itself is BLACK, open night; the three
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
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

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

## Regenerating the attachments

Both kinds of attachment live in `~/tile-previews/`, which is outside the repository on purpose: they are
reproducible from what IS in it, so committing them would be committing derived binaries. If the folder is
gone, or a primitive has changed, this is how they come back.

**The rank's colours** — every render command needs the pair. From `tierPalette` in `tileMaterials.ts`:

| rank    | `--colour` (prop) | `--floor` (its slab) |
| ------- | ----------------- | -------------------- |
| starter | `#a49781`         | `#6c6257`            |
| junior  | `#e0c193`         | `#c39c68`            |
| expert  | `#a7b2be`         | `#8d98a5`            |
| master  | `#d9a93f`         | `#57534b`            |
| wizard  | `#8fd9bd`         | `#5a8074`            |

**A floor prop's scaffold** — the magenta-backed render the generator paints over. This is the third render
of the three and the only one `rebuild.sh` does NOT make, because a repaint is not part of a rebuild:

```sh
yarn render-prop --primitive=sealedChest --spin=-27 \
  --colour=#e0c193 --floor=#c39c68 --out=~/tile-previews/sealedchest-junior.png
```

**A wall item's scaffold** — the slot's own aspect and half shear, and no floor shadow, because a wall item
stands on nothing:

```sh
yarn render-prop --primitive=niche --contents=sealed --shear=0.5 --width=448 --height=224 \
  --sun=0 --shadow=0 --colour=#a7b2be --out=~/tile-previews/niche-expert.png
```

Each entry's `scaffold`/`meshscaffold` line above gives the primitive, the contents and the spin to use;
add the rank's two colours and the wall flags where they apply.

**A PROP NEEDS BOTH COLOURS, and `--floor` is the one that gets forgotten.** `--colour` is obvious because
a wrong one is visible in the scaffold; `--floor` paints the FOOTPRINT, which no one looks at, and
`scaffold()` supplies the merchant's as a default — so a prop at another rank silently seats itself in a
patch of the wrong stone. `rebuild.sh`'s header has warned about this since the nobleman's props were
found sitting in merchant floor 62 luminance out.

It is worth knowing how small it looks and how it hides. On the priest it is 686 pixels of an 18,816-pixel
tile, RMSE 0.5% — nothing you would catch by eye. And the rebuild HIDES it: a tile imported by hand with
the right shadow is overwritten by the next `sh art/rebuild.sh`, so if you commit after a rebuild you
commit the rebuild's version, and every rebuild after that compares its own output against itself and
reports no change. Three of the priest's tiles shipped that way before anyone diffed the two shadows.

Every prop line in this file now carries `--floor`. Keep it there, and check the table above for the pair.

**All three renders**, which is what a prop actually needs — the scaffold to hand over, the mask to cut
the return to, and the footprint to seat it in. `rebuild.sh` makes the last two for itself, so they are
only wanted here when a repaint is going to be imported before the next rebuild:

```sh
r() { yarn render-prop --primitive=sealedChest --contents=cavetto --spin=25 \
  --colour=#d9a93f --floor=#57534b "$@"; }
P=~/tile-previews/chestProp-master
r --out=$P.png
r --shadow=0 --background=none --out=$P-obj.png
r --only=shadow --background=none --out=$P-shadow.png
```

The shared arguments go in a FUNCTION rather than a variable, and that is not a style choice: under zsh an
unquoted `$ARGS` does not word-split, so the whole string arrives as one argument and all three renders
fail silently into nothing. `"$@"` behaves the same in sh, bash and zsh — which is why `rebuild.sh`'s own
`scaffold()` is shaped this way.

They MUST agree on every parameter but the output and those two flags, or the mask keeps a silhouette the
paint no longer fills — the invariant `prop-pipeline.md` Step 2 states, and the one a stray `--spin` breaks
silently.

`render-prop` finds Blender in `/Applications` by itself; set `BLENDER` to point somewhere else, the same
override `art/rebuild.sh` takes.

**A HOLE's scaffold takes `--context`, and only the handed-over render does.** `expert/basin` is the one
entry that needs it: the floor goes round the object with a hole of the stated size cut in it, so the
generator can see what the hole is cut INTO. The mask is rendered without it, so no floor reaches the
tile. The size is in the primitive's own metres; `prop-pipeline.md` has the rest of the laws. There is no
footprint render here — nothing on this prop stands above the paving, so it casts nothing.

```sh
r() { yarn render-prop --primitive=basin --contents=pool --colour=#a7b2be --floor=#8d98a5 "$@"; }
P=~/tile-previews/basin-expert
r --context=1.04x0.74 --shadow=0 --out=$P.png
r --shadow=0 --background=none --out=$P-obj.png
```

**And no fenced block may sit above an entry's prompt.** `yarn repaint` takes the FIRST bare fence in a
block as the prompt, so a `sh` snippet added to an entry's prose silently becomes what gets pasted — the
match runs from that snippet's CLOSING fence to the prompt's opening one and copies the prose between
them. Caught here by the line count dropping from 29 to 10. Notes above the prompt stay prose; commands
go under this heading.

**The material references** — a quarter of each rank's own floor tile, upscaled. Plain by construction,
because a floor tile is a seamless texture with no object in it:

```sh
node -e '
const sharp = require("sharp");
(async () => {
  for (const t of ["starter", "junior", "expert", "master", "wizard"]) {
    const m = await sharp(`src/assets/tiles/${t}/floor.png`).metadata();
    await sharp(`src/assets/tiles/${t}/floor.png`)
      .extract({ left: 0, top: 0, width: Math.floor(m.width / 2), height: Math.floor(m.height / 2) })
      .resize(1024, 1024, { kernel: "cubic" })
      .toFile(`${process.env.HOME}/tile-previews/${t}-plain.png`);
  }
})();'
```

## When a return lands

`yarn tile-stats <file> --tier=<tier> --slot=<slot>` measures it, and the numbers to hit are the ones
`art/rebuild.sh` argues for tile by tile: about +22 to +25 warmth against the rank's slab, a tail under
roughly 4% over the light clamp, and at least 10 luminance of separation from the floor in EITHER direction
— under 10 a prop does not read against the ground it stands on, which is what sank the spill at 0.70.
`--brightness` and `--saturation` are how you get there, and `yarn on-floor <tile> <tier> <out>` is the
check that matters, because a number in band can still look wrong.

Nothing in this file is a rank's last word: `yarn art-census` is the authority on what is painted, and
`docs/instructions/art-tasks.md` on what each remaining gap is waiting for.
