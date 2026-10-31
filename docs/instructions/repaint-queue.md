# The repaint queue

Every prompt still owed to the generator, with what to attach to each. One heading per tile, in the order
worth doing them. Entries are DELETED as they land, so the length of this file is the size of the backlog;
what each finished tile ended up needing is recorded in its `art/rebuild.sh` line instead.

**`yarn repaint <key>`** does the fetching for you: it copies that entry's prompt to the clipboard and
reveals both attachments in the Finder, ready to drag. `yarn repaint` with no argument lists every key
still owed. It parses THIS file, so a prompt edited here is the prompt that gets pasted — there is no second
copy anywhere.

It lists the story's characters alongside these tiles, from
[character-art-prompts.md](../game-design/story/character-art-prompts.md), under `portrait` and `ghost`.
Same handoff, different subject: an hour at the generator is an hour whichever kind of art it goes on.

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

**EDGES THAT CONVERGE MEAN THE SAME THING — re-roll, and suspect the scaffold is too deep.** This set is
drawn in an oblique shear with no vanishing point: parallel edges stay parallel, and depth is carried by
a thing being drawn HIGHER, never smaller. The scaffold normally holds that on its own. It stops holding
it once the object gets DEEP: the drop's mouth was lengthened from 0.80 to 4.16 to make a vertical gap
span its run, and three rolls came back in one-point perspective — long sides tapering, then the whole
object rotated off-axis with a coping built round the mouth — where the same prompt against the shallow
mouth had painted flat and square every time. Saying "the sides are parallel, there is no vanishing
point" in the prompt did not save the second roll. The depth was put back and the shortfall moved to
the renderer instead. Length in an object is the thing this pipeline buys most dearly.

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
   It is the top-left 1638 of `art/masters/surfaces/<tier>-floor.webp` scaled to 1024:
   `magick <floor>.webp -crop 1638x1638+0+0 +repage -resize 1024x1024 ~/tile-previews/<tier>-plain.png`.

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

## Rank surfaces — twelve

The floor, the wall face and the sill of the four ranks above the merchant, in the character of
[visual-direction.md](../game-design/visual-direction.md): ground plus metal, the floor darkening rank by rank
as the daylight does. They come BEFORE every prop in this file, because a prop is judged against its rank's
floor and wall and these are the floor and wall. These are SURFACES, not props — no scaffold, no mask. Each
block carries the whole preamble, the way the merchant's four did; the one attachment is a STYLE reference
whose colours the prompt tells the model to ignore.

| Rank             | Floor                                | Wall face                                      | Sill                                     |
| ---------------- | ------------------------------------ | ---------------------------------------------- | ---------------------------------------- |
| junior · copper  | mid-tone red sandstone, `#a87a52`    | dark, painted murals, ground `#6e4a30`         | sandstone with a copper strip, `#94683f` |
| expert · silver  | light cool polished tiles, `#c9d0d6` | dark cool stone, sunk relief, ground `#7c8a98` | alabaster with a lapis line, `#b4bdc5`   |
| master · gold    | **dark** granite, `#57534b`          | **light**, gilded relief, ground `#c4ad7c`     | red granite with a gold band, `#806a5e`  |
| wizard · emerald | **dark** midnight nebula, `#161c38`  | **light**, calcite lit from behind, `#8fc4ab`  | green stone with a gold line, `#3f6b5c`  |

**Floor first, rank by rank.** A rank's floor attaches the cave's rock floor,
`art/masters/surfaces/cave-floor.webp`, for paint quality only: it is painted to the current standard and has
no slabs, so the generator takes no layout from it. Attached the merchant's floor, it copied his slab layout.
Each rank lays its stone its own way — junior large offset squares, expert a straight grid of squares, master
long slabs, wizard fitted polygons — so no two read alike. Once a rank's floor lands, its master is `art/masters/surfaces/<rank>-floor.webp`,
which is the file that rank's wall face and sill attach: they are painted against the new ground. Painted
before the floor, they would be handed the old one.

**The old masters are not attached.** `art/masters/surfaces/<rank>-*.webp` and `art/masters/tombWall/<rank>.webp`
are the placeholder-era art: dark grey-brown, basalt and verdigris, the mud this direction replaces. A reference
carries colour as strongly as it carries handling, and a floor entry could not attach its own old master anyway:
it is the path `--land` writes the return to.

**The colours in these blocks are TARGETS.** `tierPalette` in `src/app/SiteMap/tileMaterials.ts` still holds the
placeholder art's tokens for these four ranks (master's granite is the exception, and the target here is the
same stone). After a rank's floor and wall face land, the ground tokens — `bed`, `slab`, `slabHi`, `slabLo`,
`joint`, `wall`, `wallTop`, `wallBase` — are re-sampled from the new art and `yarn rank-colour` is run: the wall
face at least 25 L\* off the floor (`MIN_STEP`). Junior and expert are light floors, so their faces are shadowed
below the floor and `faceNight` is re-solved for them; master and wizard are DARK floors, so the face and the
props sit on the LIGHT side, the face art carries the step on its own, and `faceNight` goes toward 0 as the
cave's does.

**A sill sits between the floor and the wall in value**, or it reads as a hole in the paving rather than a
step across it. On a light rank that is a step darker than the floor; on a dark rank, a step lighter.
`--brightness` on the import, in whichever direction the ordering asks.

**What `--land` does with them**: a floor is made seamless both ways and a face along x before the import. A
face that comes back a third of 8:1 is laid three side by side first, as the Sphinx's are:
`magick band.jpeg band.jpeg band.jpeg +append wide.png`.

### `junior/floor` — large red sandstone flagstones

**Re-roll:** the first roll came out pale honey sandstone, 6 L* under the merchant's limestone and the same hue (L* 69 against 75): the ranks did not tell apart. The ground is now mid-tone red sandstone, about L* 55. The second roll had the right ground, but its joints were near-black drawn lines (p5 lum 64 against a slab band of 129): they are now soft grooves only a step darker than the slab, #7a5434, and nothing on the floor goes darker than #6a4630. The third roll had soft joints, but every slab was the same size in a strict running bond, so it read as a red brick wall, and its petals were white specks repeating in a grid: the paving is now mixed sizes and the petals are gone. The fourth roll copied the merchant's own slab layout from the attached floor: the attachment is now the cave's slabless rock, and the paving is a few large square flagstones, unlike anything on the merchant's floor. The fifth roll was right in layout but red, the colour of the copper it should carry: its master was shifted to gold-ochre afterwards (hue +12, brightness ×1.18), so the metal lives on the walls and props and the ground stays calm.

**Attach:** `art/masters/surfaces/cave-floor.webp` — the cave's rock floor, for paint quality only: it has no slabs, so it hands the generator no layout to copy

```
FRAME: square, exactly 1:1. A seamless floor texture filling the whole frame. Do not re-compose it as a strip.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: a NOBLEMAN's tomb, built as his painted house — the second of five. Warm sandstone carrying murals,
copper vessels gone green at the rim, lotus and papyrus, rosettes, a banquet frieze. Festive and colourful,
a scented incense haze in the air.
Lit evenly by lamplight and daylight together — every corner of the room is visible, nothing sinks into
darkness.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #a87a52 / #b4865c / #9c704a on a #8a6040 bed, joints #7a5434,
walls #6e4a30 with #9a7050 tops and #3a2416 at the base, copper #c8642c with light #f2b48a and shade
#55210c, verdigris #4f9a86, painted red ochre #a8442a, Egyptian blue #2f6f8f.
Every colour comes from that list. Nothing on the floor lighter than #c09060, nothing darker than #6a4630 — the joints included.
Warm and clear, with real colour: the copper is saturated and reads from across the room. The STONE
stays calm — the ground is quiet so the copper and the paint can stand out on it.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture, nothing else.
Do NOT take its colours, its layout or its subject from it — the palette above is the only source of colour.

Seamless top-down floor texture, viewed straight down.
Red sandstone FLAGSTONES, LARGE and nearly SQUARE, well kept — the floor of a great house, not a
storeroom. COUNT THEM: about 4 flagstones across the width of the image and 4 down, each a little more or
less than a quarter of the frame, none exactly alike in size. Each row is shifted by about half a stone
against the next. No small filler stones, no strips, no bricks: few, big, calm stones. Square corners —
not rounded rectangles.
The slabs BUTT AGAINST EACH OTHER. The joint between two slabs is a shallow GROOVE: a soft narrow shadow
where the surface dips and rises again — modelled, never a drawn line, never black. No slab has a contour
around it. At its deepest a groove is #7a5434, one quiet step under the slab — the bond reads from the slabs' own tones, not from dark lines between them.
The slabs are RED SANDSTONE, #a87a52, varying from slab to slab across #b4865c and #9c704a so the bond
reads without the seams having to draw it. Terracotta and rust: MID-TONE, clearly darker and redder than
pale limestone or honey sandstone — never pale, never beige, never grey.
Lightly worn: shallow scuffs, a few softened corners showing the #8a6040 bed in the notch, fine hairline
cracks stopping at a slab's edge. All of it painted as depth and all of it SHALLOW.
The nobleman's life on it: a faint ring where a wine jar stood, and two or three tiny verdigris #4f9a86
specks where a copper vessel was set down. Small, scattered, few, and in the stone's own values — no
white, no pale speck that reads from across the room. No petals, no leaves, no loose objects. No painted pattern on the floor: the murals are on the walls.
It tiles, so NOTHING crosses the whole image: no crack, stain or scuff longer than an eighth of the frame,
and no feature touching two edges. Spread evenly — no corner busier than another.
Even lighting across the entire image, no hotspot, no vignette. Edge to edge texture.
```

**Import:** `yarn import-tile art/masters/surfaces/junior-floor.webp --tier=junior --name=floor --slot=floor --filter=smooth --key=none --repeat=2`

### `junior/wall-face` — a painted procession over a dado band

**Attach:** `art/masters/surfaces/junior-floor.webp` — the nobleman's NEW floor, as the style reference (paint `junior/floor` first)

```
FRAME: a wide strip, exactly 8 times as wide as it is tall. Do not crop it and do not re-compose it square.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: a NOBLEMAN's tomb, built as his painted house — the second of five. Warm sandstone carrying murals,
copper vessels gone green at the rim, lotus and papyrus, rosettes, a banquet frieze. Festive and colourful,
a scented incense haze in the air.
Lit evenly by lamplight and daylight together — every corner of the room is visible, nothing sinks into
darkness.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #a87a52 / #b4865c / #9c704a on a #8a6040 bed, joints #4e3320,
walls #6e4a30 with #9a7050 tops and #3a2416 at the base, copper #c8642c with light #f2b48a and shade
#55210c, verdigris #4f9a86, painted red ochre #a8442a, Egyptian blue #2f6f8f.
Every colour comes from that list. Nothing lighter than #e6c89a, nothing darker than #2a1a0e.
Warm and clear, with real colour: the copper is saturated and reads from across the room. The STONE
stays calm — the ground is quiet so the copper and the paint can stand out on it.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture. Do NOT take its
colours or its subject from it — the palette above is the only source of colour.

Seamless horizontal strip of a plastered wall, seen straight on from the front at eye level.
The whole wall is PAINTED, the way a nobleman's house is: smooth mud plaster over the stone, its ground a
deep red-brown #6e4a30, a clear step DARKER than the sandstone floor in front of it, never lighter, so the
room keeps its depth.
THREE REGISTERS of a painted procession run along it, small figures in profile the old Egyptian way, about
thirty figures across the whole strip: on top, offering bearers carrying baskets, lotus bunches and copper
jars; in the middle, cattle and geese driven along, one goose a little larger, painted where an owl would
be; at the bottom, a banquet — seated guests with lotus flowers, a harpist, servants pouring wine. The
figures are painted in red ochre #a8442a, Egyptian blue #2f6f8f, verdigris green #4f9a86 and pale linen,
on the ochre ground, the paint a little faded and rubbed.
A PAINTED DADO BAND along the foot of the wall, dark red ochre with a thin blue line above it; a narrow
lotus-and-rosette border along the top. Thin copper #c8642c lines divide the registers, gone green
#4f9a86 in places.
The very top edge carries a lighter cap #9a7050 where the wall's top surface catches the light; the very
bottom edge a darker base #4a3320 where it meets the floor. Those two bands, the dado, the border and the
register lines run unbroken the whole width — they are the only things that do.
It tiles left to right: no figure big enough to be recognised twice in a row, no crack or stain longer
than an eighth of the strip.
Even lighting left to right, no hotspot, no vignette. Edge to edge texture.
```

**Import:** `yarn import-tile art/masters/surfaces/junior-wall-face.webp --tier=junior --name=wall-face --slot=face --filter=smooth --key=none --headroom=0.14`

`--repeat=1`, the default: the procession comes back at one wall's height, and doubling it halves the
figures and puts the strip on the face twice.

### `junior/threshold` — a sandstone step with a copper strip

**Attach:** `art/masters/surfaces/junior-floor.webp` — the nobleman's NEW floor, as the style reference (paint `junior/floor` first)

```
FRAME: a wide strip, exactly 5 times as wide as it is tall, filling the frame edge to edge. Do not re-compose it square.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: a NOBLEMAN's tomb, built as his painted house — the second of five. Warm sandstone carrying murals,
copper vessels gone green at the rim, lotus and papyrus, rosettes, a banquet frieze. Festive and colourful,
a scented incense haze in the air.
Lit evenly by lamplight and daylight together — every corner of the room is visible, nothing sinks into
darkness.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #a87a52 / #b4865c / #9c704a on a #8a6040 bed, joints #4e3320,
walls #6e4a30 with #9a7050 tops and #3a2416 at the base, copper #c8642c with light #f2b48a and shade
#55210c, verdigris #4f9a86, painted red ochre #a8442a, Egyptian blue #2f6f8f.
Every colour comes from that list. Nothing lighter than #e6c89a, nothing darker than #2a1a0e.
Warm and clear, with real colour: the copper is saturated and reads from across the room. The STONE
stays calm — the ground is quiet so the copper and the paint can stand out on it.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture. Do NOT take its
colours or its subject from it — the palette above is the only source of colour.

A single worn sandstone step seen from straight above, spanning the full width of a doorway, with no
background.
It is ONE band of stone across the whole width: a soft shadow along its far edge where it drops to the
floor beyond, its own worn top surface across the middle, a soft shadow along its near edge. No object
sits on it and nothing crosses it end to end except those two edges and one copper strip.
The stone is the floor's own sandstone at #94683f — the same paving as the chamber, laid as one long
block, a step darker than the floor either side of it, never lighter.
Dished in the middle by feet, its ends a little crumbled. A thin strip of copper #c8642c set into the
stone along its near edge, bright where it is still polished, gone verdigris green #4f9a86 at both ends
where no foot reaches.
Even lighting left to right, no hotspot, no vignette.
```

**Import:** `yarn import-tile art/masters/surfaces/junior-threshold.webp --tier=junior --name=threshold --slot=sill --filter=smooth --key=none`

### `expert/floor` — pale polished temple tiles

**Attach:** `art/masters/surfaces/cave-floor.webp` — the cave's rock floor, for paint quality only: it has no slabs, so it hands the generator no layout to copy

```
FRAME: square, exactly 1:1. A seamless floor texture filling the whole frame. Do not re-compose it as a strip.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: a HIGH PRIEST's tomb, built as a clean temple — the third of five. Pale polished tiles and alabaster,
light satin curtains, silver lamps, lapis inlay, ceiling stars, djed and was pillars, sunk-relief text
columns, Thoth's ibis. Light, cool and serene; one slow thread of incense; nothing living.
Lit evenly by a cool clear light — every corner of the room is visible, nothing sinks into darkness.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #c9d0d6 / #d6dce1 / #bcc4cb on a #aab3bb bed, joints #6f7d8a,
walls #7c8a98 with #aeb9c4 tops and #2e3946 at the base, silver #9fb3c8 with light #e6eef6 and shade
#4b5d75, lapis #2c4f8c.
Every colour comes from that list. Nothing lighter than #eef2f5, nothing darker than #1a212a.
Cool and clear: the silver and the lapis read from across the room. The STONE stays calm — the ground is
quiet so the metal can stand out on it.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture, nothing else.
Do NOT take its colours, its layout, its warmth or its subject from it — the palette above is the only source of colour.

Seamless top-down floor texture, viewed straight down.
Pale polished temple tiles, SQUARE and all the SAME SIZE, laid in a STRAIGHT GRID, kept spotless. COUNT THE
TILES: exactly 5 across the width of the image and 5 down it, every joint running straight through from
edge to edge in both directions — a measured, ordered floor, nothing offset, nothing staggered. Crisp square
corners — not rounded.
The tiles BUTT AGAINST EACH OTHER. The joint between two tiles is a shallow GROOVE: a soft narrow shadow
where the surface dips and rises again — modelled, never a drawn line, never black. No tile has a contour
around it.
The tiles are PALE COOL LIMESTONE AND ALABASTER, #c9d0d6, varying from tile to tile across #d6dce1 and
#bcc4cb so the bond reads without the seams having to draw it. Cool grey-white with a faint blue in it,
never cream, never warm. Some tiles show the soft cloudy veining of alabaster, faint and low in contrast.
A soft satin sheen on the polish, painted as a gentle lift in value, never a glare or a reflection.
Barely worn: a few softened corners showing the #aab3bb bed, one or two fine hairline cracks stopping at a
tile's edge, and two or three tiny chips of lapis #2c4f8c lost in the joints. Small, scattered, and few.
No dust, no debris, no plants.
It tiles, so NOTHING crosses the whole image: no crack, vein or stain longer than an eighth of the frame,
and no feature touching two edges. Spread evenly — no corner busier than another.
Even lighting across the entire image, no hotspot, no vignette. Edge to edge texture.
```

**Prepare:** a straight grid of whole tiles is seamless as it comes, and `--land`'s make-seamless crossfades it against a shifted copy into doubled, ghosted joints. Save the download itself as the master, `art/masters/surfaces/expert-floor.webp`, and run the Import line.

**Import:** `yarn import-tile art/masters/surfaces/expert-floor.webp --tier=expert --name=floor --slot=floor --filter=smooth --key=none --repeat=2`

### `expert/wall-face` — cool dressed stone in sunk-relief columns

**Attach:** `art/masters/surfaces/expert-floor.webp` — the priest's NEW floor, as the style reference (paint `expert/floor` first)

```
FRAME: a wide strip, exactly 8 times as wide as it is tall. Do not crop it and do not re-compose it square.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: a HIGH PRIEST's tomb, built as a clean temple — the third of five. Pale polished tiles and alabaster,
light satin curtains, silver lamps, lapis inlay, ceiling stars, djed and was pillars, sunk-relief text
columns, Thoth's ibis. Light, cool and serene; one slow thread of incense; nothing living.
Lit evenly by a cool clear light — every corner of the room is visible, nothing sinks into darkness.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #c9d0d6 / #d6dce1 / #bcc4cb on a #aab3bb bed, joints #6f7d8a,
walls #7c8a98 with #aeb9c4 tops and #2e3946 at the base, silver #9fb3c8 with light #e6eef6 and shade
#4b5d75, lapis #2c4f8c.
Every colour comes from that list. Nothing lighter than #eef2f5, nothing darker than #1a212a.
Cool and clear: the silver and the lapis read from across the room. The STONE stays calm — the ground is
quiet so the metal can stand out on it.
No modern text, no Latin letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture. Do NOT take its
colours or its subject from it — the palette above is the only source of colour.

Seamless horizontal strip of a temple wall, seen straight on from the front at eye level.
Fine dressed blue-grey stone, #7c8a98, a clear step DARKER and cooler than the pale tiled floor in front
of it, never lighter, so the room keeps its depth. The blocks are large and their joints barely show.
The wall is cut with VERTICAL COLUMNS of sunk-relief hieroglyphs, about twenty columns across the whole
strip, each column a narrow panel of small signs cut INTO the stone and filled with lapis blue #2c4f8c,
the fill worn thin in places. The signs are small and soft, read as texture at this size, never as
letters. Between every few columns a taller carved emblem breaks the rhythm: a djed pillar, a was
sceptre, a crescent moon, an ibis standing — cut the same way, no larger than a column is wide.
A thin silver #9fb3c8 band inlaid along the top of the carved field, and a plain dado of the same stone
below it.
The very top edge carries a lighter cap #aeb9c4 where the wall's top surface catches the light; the very
bottom edge a darker base #2e3946 where it meets the floor. Those two bands and the silver line run
unbroken the whole width — they are the only things that do.
It tiles left to right: no emblem big enough to be recognised twice in a row, no crack or stain longer
than an eighth of the strip.
Even lighting left to right, no hotspot, no vignette. Edge to edge texture.
```

**Import:** `yarn import-tile art/masters/surfaces/expert-wall-face.webp --tier=expert --name=wall-face --slot=face --filter=smooth --key=none --headroom=0.14`

`--repeat=1`, the default: the columns come back at one wall's height.

### `expert/threshold` — an alabaster step with a lapis line

**Attach:** `art/masters/surfaces/expert-floor.webp` — the priest's NEW floor, as the style reference (paint `expert/floor` first)

```
FRAME: a wide strip, exactly 5 times as wide as it is tall, filling the frame edge to edge. Do not re-compose it square.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: a HIGH PRIEST's tomb, built as a clean temple — the third of five. Pale polished tiles and alabaster,
light satin curtains, silver lamps, lapis inlay, ceiling stars, djed and was pillars, sunk-relief text
columns, Thoth's ibis. Light, cool and serene; one slow thread of incense; nothing living.
Lit evenly by a cool clear light — every corner of the room is visible, nothing sinks into darkness.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #c9d0d6 / #d6dce1 / #bcc4cb on a #aab3bb bed, joints #6f7d8a,
walls #7c8a98 with #aeb9c4 tops and #2e3946 at the base, silver #9fb3c8 with light #e6eef6 and shade
#4b5d75, lapis #2c4f8c.
Every colour comes from that list. Nothing lighter than #eef2f5, nothing darker than #1a212a.
Cool and clear: the silver and the lapis read from across the room. The STONE stays calm — the ground is
quiet so the metal can stand out on it.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture. Do NOT take its
colours or its subject from it — the palette above is the only source of colour.

A single alabaster step seen from straight above, spanning the full width of a doorway, with no
background.
It is ONE band of stone across the whole width: a soft shadow along its far edge where it drops to the
floor beyond, its own polished top surface across the middle, a soft shadow along its near edge. No object
sits on it and nothing crosses it end to end except those two edges and one inlaid line.
The stone is cool alabaster at #b4bdc5, cloudy and faintly veined — one long block, a step darker than the
tiled floor either side of it, never lighter.
Polished smooth, a gentle hollow in the middle where feet cross it. One thin line of lapis #2c4f8c inlaid
along its near edge, edged in silver #9fb3c8, whole and clean.
Even lighting left to right, no hotspot, no vignette.
```

**Import:** `yarn import-tile art/masters/surfaces/expert-threshold.webp --tier=expert --name=threshold --slot=sill --filter=smooth --key=none`

### `master/floor` — dark polished granite, gold dust in the joints

**Attach:** `art/masters/surfaces/cave-floor.webp` — the cave's rock floor, for paint quality only: it has no slabs, so it hands the generator no layout to copy

```
FRAME: square, exactly 1:1. A seamless floor texture filling the whole frame. Do not re-compose it as a strip.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: a PHARAOH's tomb, its galleries cut for ceremony — the fourth of five. Dark granite underfoot, gold
everywhere it is carried: gilded statues, gold-inlaid coffins, a gilded shrine, braziers. Cartouches, the
winged sun disc, uraeus cobras, a kheker frieze. Still and ceremonial, gold dust catching the light;
nothing living.
Lit for ceremony: the floor is dark stone, and every part of it is still readable — nothing sinks into
black.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #57534b / #615c53 / #4e4a43 on a #4a4640 bed, joints #25221d,
walls #c4ad7c with #e8d4a0 tops and #6b4f12 in shade, gold #d9a93f with light #f5dc8e and shade #6b4f12,
red granite #806a5e.
Every colour comes from that list. The floor stone is nothing lighter than #77716a and nothing darker
than #141210; only the gold dust is brighter.
Dark and calm underfoot, the gold saturated and bright against it. The STONE stays quiet so the gold
can stand out on it.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality only — NOT its rough, broken rock: this floor is dressed and polished.
Do NOT take its colours, its layout, its lightness or its subject from it — the palette above is the only source of
colour.

Seamless top-down floor texture, viewed straight down.
Dark grey granite paving of LONG dressed slabs, ceremonial and polished. COUNT THE SLABS: each slab is
about a third of the frame long and a seventh of it wide, so three times as long as it is wide, laid in
courses running across the image, 7 courses down, each course's joints shifted by about a third of a slab.
Long, heavy, deliberate stones — not squares, not bricks, not small paving. Square corners — not rounded
rectangles.
The slabs BUTT AGAINST EACH OTHER. The joint between two slabs is a shallow GROOVE: a soft narrow shadow
where the surface dips and rises again — modelled, never a drawn line, never black. No slab has a contour
around it.
The slabs are DARK GRANITE, #57534b, varying from slab to slab across #615c53 and #4e4a43 so the bond reads
without the seams having to draw it. A fine salt-and-pepper grain of paler and darker crystals in every
slab, low in contrast. A soft polish, painted as a gentle lift in value, never a glare or a reflection.
Barely worn: a few softened corners showing the #4a4640 bed, one or two fine hairline cracks stopping at a
slab's edge. A little GOLD DUST #d9a93f settled in some of the joints and in a few hollows — tiny points,
never a line along a whole joint. Small, scattered, and few.
It tiles, so NOTHING crosses the whole image: no crack, stain or line of dust longer than an eighth of the
frame, and no feature touching two edges. Spread evenly — no corner busier than another.
Even lighting across the entire image, no hotspot, no vignette. Edge to edge texture.
```

**Prepare:** a laid floor whose courses run exactly to the edges is seamless as it comes, and `--land`'s make-seamless would crossfade it into doubled joints, as expert's grid did. If the courses meet themselves at the edges, save the download itself as the master, `art/masters/surfaces/master-floor.webp`, and run the Import line; if not, `--land` it.

**Import:** `yarn import-tile art/masters/surfaces/master-floor.webp --tier=master --name=floor --slot=floor --filter=smooth --key=none --repeat=2`

### `master/wall-face` — gilded relief under a kheker frieze

**Attach:** `art/masters/surfaces/master-floor.webp` — the pharaoh's NEW floor, as the style reference (paint `master/floor` first)

```
FRAME: a wide strip, exactly 8 times as wide as it is tall. Do not crop it and do not re-compose it square.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: a PHARAOH's tomb, its galleries cut for ceremony — the fourth of five. Dark granite underfoot, gold
everywhere it is carried: gilded statues, gold-inlaid coffins, a gilded shrine, braziers. Cartouches, the
winged sun disc, uraeus cobras, a kheker frieze. Still and ceremonial, gold dust catching the light;
nothing living.
Lit for ceremony: the floor is dark stone, and every part of it is still readable — nothing sinks into
black.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #57534b / #615c53 / #4e4a43 on a #4a4640 bed, joints #25221d,
walls #c4ad7c with #e8d4a0 tops and #6b4f12 in shade, gold #d9a93f with light #f5dc8e and shade #6b4f12,
red granite #806a5e.
Every colour comes from that list. Nothing lighter than #f5dc8e, nothing darker than #2a2012.
Dark and calm underfoot, the gold saturated and bright against it.
No modern text, no Latin letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture. Do NOT take its
colours, its darkness or its subject from it — the palette above is the only source of colour.

Seamless horizontal strip of a gallery wall, seen straight on from the front at eye level.
The wall is LIGHT and catches the light: fine pale limestone dressed smooth and washed with gold, #c4ad7c,
a clear step LIGHTER than the dark granite floor in front of it, never darker. The blocks are large and
their joints barely show.
Along the top, a KHEKER FRIEZE: a row of small tied-reed finials, gilded, standing side by side the whole
width. Below it the wall is carved in low raised relief and gilded: a row of CARTOUCHE OVALS, about twelve
across the whole strip, each a rounded frame of gold rope whose inside is plain polished gold, nothing
written in it; between each pair of cartouches a rearing uraeus cobra, small. The gold #d9a93f is
saturated, lit to #f5dc8e on its raised edges and shaded #6b4f12 in its cut sides.
A plain dado of the same pale stone along the foot of the wall, edged with one thin gold line.
The very top edge carries a lighter cap #e8d4a0 where the wall's top surface catches the light; the very
bottom edge a darker base #6b4f12 where it meets the floor. Those two bands, the frieze and the gold line
run unbroken the whole width — they are the only things that do.
It tiles left to right: no cobra or cartouche different enough to be recognised twice in a row, no crack
or stain longer than an eighth of the strip.
Even lighting left to right, no hotspot, no vignette. Edge to edge texture.
```

**Import:** `yarn import-tile art/masters/surfaces/master-wall-face.webp --tier=master --name=wall-face --slot=face --filter=smooth --key=none --headroom=0.14`

### `master/threshold` — a red granite step with a gold band

**Attach:** `art/masters/surfaces/master-floor.webp` — the pharaoh's NEW floor, as the style reference (paint `master/floor` first)

```
FRAME: a wide strip, exactly 5 times as wide as it is tall, filling the frame edge to edge. Do not re-compose it square.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: a PHARAOH's tomb, its galleries cut for ceremony — the fourth of five. Dark granite underfoot, gold
everywhere it is carried: gilded statues, gold-inlaid coffins, a gilded shrine, braziers. Cartouches, the
winged sun disc, uraeus cobras, a kheker frieze. Still and ceremonial, gold dust catching the light;
nothing living.
Lit for ceremony: the floor is dark stone, and every part of it is still readable — nothing sinks into
black.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #57534b / #615c53 / #4e4a43 on a #4a4640 bed, joints #25221d,
walls #c4ad7c with #e8d4a0 tops and #6b4f12 in shade, gold #d9a93f with light #f5dc8e and shade #6b4f12,
red granite #806a5e.
Every colour comes from that list. Nothing lighter than #f5dc8e, nothing darker than #141210.
Dark and calm underfoot, the gold saturated and bright against it.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture. Do NOT take its
colours or its subject from it — the palette above is the only source of colour.

A single polished granite step seen from straight above, spanning the full width of a doorway, with no
background.
It is ONE band of stone across the whole width: a soft shadow along its far edge where it drops to the
floor beyond, its own polished top surface across the middle, a soft shadow along its near edge. No object
sits on it and nothing crosses it end to end except those two edges and one gold band.
The stone is RED GRANITE, #806a5e, coarse-grained with darker and paler crystals — one long block, a step
LIGHTER and warmer than the dark grey granite floor either side of it, never darker.
Barely worn, a faint hollow in the middle where feet cross it. One band of gold leaf #d9a93f along its near
edge, bright, rubbed through to the stone only where every foot lands.
Even lighting left to right, no hotspot, no vignette.
```

**Import:** `yarn import-tile art/masters/surfaces/master-threshold.webp --tier=master --name=threshold --slot=sill --filter=smooth --key=none`

### `wizard/floor` — a still, mirror-dark floor holding the night sky

**Re-roll:** the ground was night-green, the same hue as the emerald it should carry, so the metal would sink into the floor. It is now midnight blue-black with a nebula in the stone and clearly visible inlaid stars; the emerald is kept to the seams of light, the walls and the props. The still-water roll copied the rank's symbols (ankh, eye, feather) onto the floor, drew five-pointed stars, repeated itself four times inside one image, and its cloud was a dull indigo: the floor now carries one colourful billowing nebula, its stars as fine dots, and no symbols. The designer's reference is a telescope photograph of a star-forming nebula, dimmed and leaning crimson and purple: the cloud is now mottled gas and dust rather than soft billows, its stars a dense field of fine specks.

**Re-roll:** the nebula roll came back as rough fitted stones. The floor is meant to be super clean, like walking on still water: one smooth jointless surface with the sky in it.

**Attach:** `art/masters/surfaces/cave-floor.webp` — the cave's rock floor, for paint quality only: it has no slabs, so it hands the generator no layout to copy

```
FRAME: square, exactly 1:1. A seamless floor texture filling the whole frame. Do not re-compose it as a strip.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: the tomb of the GODS — the richest of five, not of this world. Midnight stone holding the night sky,
translucent calcite lit from behind, the sky goddess Nut's stars, emerald with gold. Nothing living.
The floor is dark, and every part of it is still readable — nothing sinks into black.
HAND-PAINTED digital texture art: soft brushwork, forms modelled with soft shading, the surface itself
smooth and glossy. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #161c38 / #1d2547 / #11162d on a #0c1124 bed, joints #080b18, nebula crimson #7e2440, deep magenta #8a2e6a, purple #4e2470, deep blue #1c2350, a dim warm glow #b8743a, stars #fff6dc,
walls #8fc4ab with #d6f5e6 tops and #2c5a4a in shade, emerald #1f9e6b with light #9ee6c3 and shade
#0d4a33, gold #e3c46a, green stone #3f6b5c.
Every colour comes from that list. The dark of the surface is nothing darker than #070a16; the nebula stays DIM —
nothing in it lighter than #a85a8a — and only the stars are brighter than it.
Deep and calm underfoot, the stars and the gold bright against it; the emerald belongs to the walls and
the things standing on the floor, not to the floor. The STONE stays quiet so the light
can stand out on it.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality only — NOT its rough rock texture, which this floor must not have.
Do NOT take its colours, its layout, its lightness or its subject from it — the palette above is the only source of
colour.

Seamless top-down floor texture, viewed straight down.
ONE SMOOTH, SEAMLESS SURFACE — NO SLABS, NO STONES, NO JOINTS, NO TILES, NO CRACKS. A floor so clean and still
it reads as the surface of dark water at night: polished like black glass, perfectly flat, with the sky
lying in it.
The surface is MIDNIGHT BLUE-BLACK, #161c38, drifting softly across #1d2547 and #11162d. Never grey, never
green, never rough: no grit, no speckle, no texture of stone.
IN THE SURFACE, as a reflection, a DEEP-SPACE NEBULA, the way a telescope photograph of a star-forming
cloud looks, but DIMMED: dark, yet glowing as if it gives off its own light. Mostly crimson #7e2440, deep
magenta #8a2e6a and purple #4e2470, shading into deep blue #1c2350 at its edges, with a little dim warm
glow #b8743a in a few hot pockets. The cloud is MOTTLED AND GRAINY — patchy gas and dust, broken into
wisps, knots and dark dust lanes, never smooth soft billows. It spreads over most of the surface, and dark
sky shows through it in places.
Through it, a DENSE STAR FIELD of tiny bright round specks of #fff6dc, thousands of them, most a single
fine point, a few hundred a little bigger, a handful brighter with a soft glow round them, and here and
there a small tight cluster. NOT star shapes — no points, no five-pointed stars, no rays, no sparkle, no
cross-shaped glints.
NO SYMBOLS on the floor: no ankh, no eye, no feather, no hieroglyph, nothing drawn — only sky.
ONE SINGLE PICTURE: do not repeat the image inside itself, never two or four copies of the same cloud.
It tiles, so NOTHING crosses the whole image: no hard edge anywhere, the cloud fading into
the dark before it reaches the frame's edge on any side. Spread evenly — no corner busier than another.
Even lighting across the entire image, no hotspot, no vignette. Edge to edge texture.
```

**Scale:** a nebula has no stones to size, so it goes in at `--repeat=1`: at 2 its one cloud comes back every four cells and reads as wallpaper. `--stars=14` lifts the fine stars the resize averages away.

**Import:** `yarn import-tile art/masters/surfaces/wizard-floor.webp --tier=wizard --name=floor --slot=floor --filter=smooth --key=none --repeat=1 --stars=14`

### `wizard/wall-face` — calcite lit from behind, light in the joints

**Attach:** `art/masters/surfaces/wizard-floor.webp` — the gods' NEW floor, as the style reference (paint `wizard/floor` first)

```
FRAME: a wide strip, exactly 8 times as wide as it is tall. Do not crop it and do not re-compose it square.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: the tomb of the GODS — the richest of five, not of this world. Deep night-green stone, translucent
calcite lit from behind, a field of stars like the sky goddess Nut's, emerald with gold. The stars, the
ankh, the Eye of Horus, Ma'at's feather. Motes of light rising; nothing living.
The floor is dark, and every part of it is still readable — nothing sinks into black.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #161c38 / #1d2547 / #11162d on a #0c1124 bed, joints #080b18, nebula #3b2f6e / #27506f,
walls #8fc4ab with #d6f5e6 tops and #2c5a4a in shade, emerald #1f9e6b with light #9ee6c3 and shade
#0d4a33, gold #e3c46a, green stone #3f6b5c.
Every colour comes from that list. Nothing lighter than #e6faf0, nothing darker than #0a1a15.
Deep and calm underfoot, the emerald and the gold bright against it.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture. Do NOT take its
colours, its darkness or its subject from it — the palette above is the only source of colour.

Seamless horizontal strip of a wall built of translucent calcite, seen straight on from the front at eye
level.
COUNT THE BLOCKS: exactly 3 courses stacked in the strip's height and 16 blocks across its width, each
course offset half a block from the one above. Square corners.
The wall is LIGHT: pale green calcite #8fc4ab, cloudy and banded inside, LIT FROM BEHIND so it glows
softly from within, a clear step LIGHTER than the dark floor in front of it, never darker. Each block is
a little brighter in its middle and a little deeper toward its edges.
THE LIGHT LEAKS FROM THE JOINTS: the joint between two blocks is a thin soft seam of brighter light
#d6f5e6 to #9ee6c3, painted as light coming through a gap, never a drawn line, never dark.
Along the top of the wall, a narrow band of deep emerald #0d4a33 set with small five-pointed gold #e3c46a
stars, evenly spaced, the sky of Nut; below it the calcite, plain.
The very top edge carries a lighter cap #d6f5e6 where the wall's top surface catches the light; the very
bottom edge a darker base #2c5a4a where it meets the floor. Those two bands and the star band run
unbroken the whole width — they are the only things that do.
Light through stone only: no sparkle, no rays, no haze, no glow spilling past the wall.
It tiles left to right: nothing else crosses the full width, no crack or stain longer than an eighth of
it, and no block different enough to be recognised twice in a row.
Even lighting left to right, no hotspot, no vignette. Edge to edge texture.
```

**Import:** `yarn import-tile art/masters/surfaces/wizard-wall-face.webp --tier=wizard --name=wall-face --slot=face --filter=smooth --key=none --headroom=0.14 --repeat=2`

`--repeat=2`, the merchant's: a counted course of blocks comes back a size too big, as his bricks did.

### `wizard/threshold` — a green stone step with a gold line

**Attach:** `art/masters/surfaces/wizard-floor.webp` — the gods' NEW floor, as the style reference (paint `wizard/floor` first)

```
FRAME: a wide strip, exactly 5 times as wide as it is tall, filling the frame edge to edge. Do not re-compose it square.

Top-down dungeon game tile art for an ancient Egyptian tomb, New Kingdom period.
Rank: the tomb of the GODS — the richest of five, not of this world. Deep night-green stone, translucent
calcite lit from behind, a field of stars like the sky goddess Nut's, emerald with gold. The stars, the
ankh, the Eye of Horus, Ma'at's feather. Motes of light rising; nothing living.
The floor is dark, and every part of it is still readable — nothing sinks into black.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Palette, strictly: floor #161c38 / #1d2547 / #11162d on a #0c1124 bed, joints #080b18, nebula #3b2f6e / #27506f,
walls #8fc4ab with #d6f5e6 tops and #2c5a4a in shade, emerald #1f9e6b with light #9ee6c3 and shade
#0d4a33, gold #e3c46a, green stone #3f6b5c.
Every colour comes from that list. Nothing lighter than #e6faf0, nothing darker than #0a1a15.
Deep and calm underfoot, the emerald and the gold bright against it.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture. Do NOT take its
colours or its subject from it — the palette above is the only source of colour.

A single polished green stone step seen from straight above, spanning the full width of a doorway, with no
background.
It is ONE band of stone across the whole width: a soft shadow along its far edge where it drops to the
floor beyond, its own polished top surface across the middle, a soft shadow along its near edge. No object
sits on it and nothing crosses it end to end except those two edges and one gold line.
The stone is a mid green #3f6b5c, smooth and faintly banded like malachite — one long block, a step
LIGHTER than the night-green floor either side of it, never darker.
Unworn, as if no foot has crossed it. One thin line of gold #e3c46a inlaid along its near edge, whole and
bright.
Even lighting left to right, no hotspot, no vignette.
```

**Import:** `yarn import-tile art/masters/surfaces/wizard-threshold.webp --tier=wizard --name=threshold --slot=sill --filter=smooth --key=none`

---

## Priest — fifteen

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

## Floor scatter — four

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

## The Sphinx — four

The inside of the Sphinx is cut from the plateau's own bedrock: layered limestone, swept clean of the sand that
keeps burying the outside. Four surfaces, the same loop as the cave's.

### `sphinx/floor` — smooth limestone tiles crossed by gold horizon bands

**Re-roll:** the first roll was eroded cliff rock — deep pits, stepped ledges along the strata, cracks and sand — and it repeated itself four times inside one image. The floor is a mason's finished floor: dressed flat and smooth, strata as flat colour bands only, swept clean. The designer then chose a new floor altogether: smooth limestone tiles crossed by gold bands, the horizon lines of the god of the horizon. The first banded roll read as a brick wall — small 2:1 tiles, dark joints — and its two bands differed (a row of gold tiles, a bar with rounded ends that broke at the image edge): the slabs are now large, the joints faint, and both bands one continuous square-ended bar.

**Attach:** `art/masters/surfaces/cave-floor.webp` — the cave's rock floor, for paint quality only: it is uncut rock with no slabs, the nearest thing to bedrock

```
Top-down dungeon game tile art for the inside of the Great Sphinx, a passage cut into the desert bedrock.
A FINE CEREMONIAL FLOOR inside the Sphinx, the god of the horizon: smooth warm limestone tiles, dressed flat
and polished, kept clean, crossed by broad bands of GOLD like horizon lines.
Warm, dim and still: lamplight, no daylight. Every part of the floor is readable, nothing sinks into black.
HAND-PAINTED digital texture art: matte, visible soft brush texture, a fine even grain in the
surface, forms modelled with soft shading. Realistic materials, painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look, not
a comic, not a cartoon. An edge is a change of value, never a stroke.
Limestone #9a8462 / #a8916b / #8a7556, joints #5e4c36, gold #d9a93f with light #f5dc8e and shade #8a6a24.
Nothing lighter than #f5dc8e, nothing darker than #2a2117.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality only — NOT its rough, broken rock,
which this floor must not have. Do NOT take its colours, its layout or its subject from it.
THE CAMERA: straight down. A seamless square tile.
THE FLOOR SLABS: LARGE smooth limestone flagstones, each a little wider than it is tall — floor slabs, NOT
bricks, NOT a wall. COUNT THEM: exactly 3 slabs across the width of the image and 4 rows down it; each row
is shifted by half a slab against the next. The joints are fine shallow grooves, only a quiet step darker
than the stone — barely there, never dark lines, never black.
THE GOLD BANDS: exactly TWO IDENTICAL bands, each ONE CONTINUOUS BAR of polished gold #d9a93f with no joints
and no segments in it, running dead straight across the full width of the image and off BOTH side edges with
SQUARE, cut-off ends — no rounded ends, no caps. Each is as tall as a third of a row and lies flush in the
floor along a row joint — one a quarter of the way down, one three quarters. Smooth inlaid metal, a soft
lighter sheen #f5dc8e along its length and a darker edge #8a6a24 where it meets the stone. No pattern, no
glyphs on them.
ONE SINGLE PICTURE: do not repeat the image inside itself.
It tiles: the bands and the rows run unbroken off both side edges and line up with the next copy; nothing
else crosses the image. Value spread evenly over the stone.
Even lighting, no hotspot, no vignette.
```

**Prepare:** a laid floor is seamless only if its rows run exactly to the edges, and `--land`'s make-seamless would crossfade it into doubled joints. Cut one period, from the centre of one gold band to the centre of the next (half the image tall), stack it twice into the square master `art/masters/surfaces/sphinx-floor.webp`, so every vertical seam falls inside a band, and run the Import line.

**Import:** `yarn import-tile art/masters/surfaces/sphinx-floor.webp --tier=sphinx --name=floor --slot=floor --filter=smooth --key=none --repeat=1`

### `sphinx/wall-face` — the Sphinx's cut bedrock wall face

**Attach:** `art/masters/surfaces/cave-wall-face.webp` — the cave's face, for the frontal band and the paint only

```
Top-down dungeon game tile art for the inside of the Great Sphinx, a passage cut into the desert bedrock.
The standing face of a wall seen from the front: the plateau's own limestone, cut straight down by masons
and never built: horizontal strata stacked up the face, soft yellow layers worn back a little and harder
grey-buff layers standing proud of them, long diagonal chisel marks across every layer, a few small
hollows where the softest rock crumbled. NOTHING BUILT: no bricks, no blocks, no joints, no mortar, no
paint, no carving, no hieroglyphs.
Pale and lit, catching the lamplight, clearly lighter than the floor in front of it.
HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and fine speckle in the
surface, forms modelled with soft shading. Painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look.
Yellow limestone #b9a179, harder bands #a39a86, top light #d8c49c, shadow #5e4c36. Nothing lighter than
#e6d6b2, nothing darker than #3a2e20.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY. Match its paint quality and its texture. Do NOT take its
colours or its subject from it.
Flat frontal view, no perspective. A wide band, seamless left to right; the strata run the whole width,
nothing else does. Even lighting.
```

**Prepare:** the generator returns a band about a third of a face's 8:1. Lay three side by side and make it seamless along x; that band is the master, `art/masters/surfaces/sphinx-wall-face.webp`:
`magick band.jpeg band.jpeg band.jpeg +append wide.png && yarn make-seamless --axis=x wide.png`

**Import:** `yarn import-tile art/masters/surfaces/sphinx-wall-face.webp --tier=sphinx --name=wall-face --slot=face --filter=smooth --key=none --headroom=0.14 --repeat=1` (check the face against the floor with `yarn rank-colour` and set `--brightness` from it)

### `sphinx/threshold` — a step cut in the Sphinx's bedrock

**Attach:** `art/masters/surfaces/starter-threshold.webp` — the merchant's sill, for its camera and proportions only

```
Top-down dungeon game tile art for the inside of the Great Sphinx, a passage cut into the desert bedrock.
A sill where one cut passage meets the next: a low step left standing in the living limestone, its top
worn smooth and slightly dished by feet, chisel marks still on its face, a thin line of fine sand along
its foot. NOTHING LAID: no slab, no joints, no blocks, no paint.
Warm, dim and readable. HAND-PAINTED digital texture art: matte, visible soft brush texture, grit and
fine speckle in the surface, soft shading. Painted rather than drawn.
NO OUTLINES ANYWHERE — no black contour around anything, no ink, no cel shading, no vector look.
Limestone #8a7556, its harder bands #7d7462, shadow #4a3c2b, sand #b39b72. Nothing lighter than #c9b48c,
nothing darker than #2a2117.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS FOR CAMERA AND PROPORTIONS ONLY. Do NOT take its colours, its cut stone or its
subject from it.
Same camera and proportions as the attached sill. Even lighting.
```

**Import:** `yarn import-tile art/masters/surfaces/sphinx-threshold.webp --tier=sphinx --name=threshold --slot=sill --filter=smooth --key=none`

### `sphinx/wall-panel` — the inscription wall, inside the Sphinx

**Attach:** `art/masters/tombWall/starter.webp` — the merchant's encounter wall, for the frame's proportions only

```
A whole wall inside the Great Sphinx, seen straight on, for a puzzle's backdrop: the plateau's own
limestone cut straight down, horizontal strata of soft yellow and harder grey-buff layers, chisel marks
across them. In the middle of the wall the masons dressed one broad rectangle smooth and flat, a little
paler than the rock around it, its edges softened by age: the place where a line of writing is cut.
LEAVE THAT RECTANGLE PLAIN — no signs, no hieroglyphs, no carving, no cartouche, no figures: the writing
is laid over it by the game. A little fine sand along the foot of the wall, no more; the sand outside
never reached in here. Lamplit, warm, still.
HAND-PAINTED digital art: matte, soft brush texture, grit and speckle. NO OUTLINES — no black contour, no
ink, no cel shading, no vector look.
Yellow limestone #b9a179, harder bands #a39a86, the dressed panel #c9b48c, shadow #5e4c36. Nothing lighter
than #e6d6b2, nothing darker than #3a2e20.
No text, no letters, no watermark, no logo, no frame, no border, no vignette.
THE ATTACHED IMAGE IS A STYLE REFERENCE ONLY, for the frame's proportions and paint quality. Do NOT take
its colours or its subject from it. Same aspect as the reference; do not re-compose it square.
```

**Import:** `yarn import-panel art/masters/tombWall/sphinx.webp --tier=sphinx`

---

## Patrons — seventeen

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

---

## Mechanism styles — light and bone

The lever, torch, plate, gate, drop, pipe hole and narrow passage are shared art in `tiles/default/`, painted
mid-dark, and on a dark floor they vanish: through the renderer's night the cave floor reads L\* 27, master's
25 and wizard's 17, and the default pieces seat at L\* 20–30 — `yarn tsx scripts/mechanismColour.ts` has wizard's
lever 8.7 L\* off its floor with 2% of its paint reading, and the cave's lever, torch, plate and gate at 0%. The
thin shapes (the lever's shaft, the torch's post, the side-on gate) barely read on any floor. A style repaints
the pieces for the floors that use it (`MECHANISM_STYLE` in `src/app/SiteMap/mechanismStyle.ts`, chain and folders
in `tile-art-brief.md`): master and wizard draw `light`, the cave `light/bone`, the rest `default`.

**A style variant is the SAME object with the SAME silhouette.** The player learned these pieces once and must
not learn them again; only value and material change. So every entry here is an EDIT of the default piece's own
painted master, on its own canvas, and imports with the default piece's own masks, seats and scales — the
`art/rebuild.sh` lines, with `--tier=mechanism/light` (or `mechanism/light/bone`) so `import-tile` writes
`src/assets/tiles/mechanism/<style>/<name>.png`, the folder the style chain reads.

- **`light`** — the same pieces in light values, with catch-lights, to read on the DARK floors: master's gold
  galleries and wizard's nebula. Every default piece is a candidate; the sequence tile is not here because the
  review found it reads.
- **`light/bone`** — the cave paints only two things: the lever in weathered bone and ivory, and a bone-coloured
  pillar as the torch to light. Everything else in the cave falls back to `light`.

**The value target, for every entry.** At least 25 L\* off the floor it serves after the night (`MIN_STEP`) —
not on the mean alone but over most of its paint, since a mean can pass on a piece whose thin parts vanish.
And BOTH ways at once: a dark contact shadow where it meets the floor, so it seats, and a light catch-light
along its upper-left edges, so it reads against the dark. Master is the binding floor of the two `light` serves
(25 against 17), which is why the `light` entries attach it. Thicker silhouettes only where the default is
thin — the lever's shaft, the torch's post, the side-on gate — and then the same object, a little heavier.

**`--land` cannot measure these yet.** It grades against a rank, and `mechanism/light` is none, so it imports
and says "No rank to measure it against — look at it". Measure the master by hand against each floor it serves
(`yarn tile-stats <master> --tier=master --slot=prop`, again with `--tier=wizard`, and `--tier=cave` for bone),
and look at it on the review sheet (Storybook `app-topology-on-every-floor--sheet`). `mechanismColour.ts` reads
`tiles/default/` only, so it does not see a landed style either.

**The keys are `light/<name>` and `bone/<name>`** because `yarn repaint` reads a key as one `tier/name` pair;
the Import line is what names the real folder.

### `light/leverBase` — the floor lever's dome and kerb, in light values

The one painting `leverBaseBack` and `leverBaseFront` are both cut from, at the track's own near wall, exactly
as the default pair is: same master canvas, same two masks, so the arm still slots between them.

**Attach:**

1. `art/masters/props/default/leverBase.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: the base of a floor lever — a ribbed bronze DOME with a slot cut in its top, set in a low stone KERB. Same object, same silhouette, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Repaint value and light only.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT STANDS ON, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE CHANGE: paint the whole piece LIGHT, so it stands out clearly on that dark floor. The kerb becomes pale limestone, #cfc3a8, its top edge catching a pale cream catch-light. The dome becomes pale polished bronze, #d6b878, its ribs picked out with lighter tops and a soft pale catch-light along the upper-left curve; the slot stays a dark opening. Keep clear form shading — the dark side of the dome is still clearly lighter than the floor. A narrow dark band where the kerb meets the ground, so it sits on it.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece, exactly where it is in the reference. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold lever --contents=base --colour=#a7b2be --floor=#8d98a5
yarn render-prop --primitive=lever --contents=baseBack --shadow=0 --background=none --colour=#a7b2be --floor=#8d98a5 --out="$HOME/tile-previews/leverBaseBack-expert-obj.png"
yarn render-prop --primitive=lever --contents=baseFront --shadow=0 --background=none --colour=#a7b2be --floor=#8d98a5 --out="$HOME/tile-previews/leverBaseFront-expert-obj.png"
yarn import-tile art/masters/props/mechanism/light/leverBase.webp --tier=mechanism/light --name=leverBaseBack --slot=prop \
  --filter=smooth --mask="$HOME/tile-previews/leverBaseBack-expert-obj.png" --seat="$SHADOW" --no-trim
yarn import-tile art/masters/props/mechanism/light/leverBase.webp --tier=mechanism/light --name=leverBaseFront --slot=prop \
  --filter=smooth --mask="$HOME/tile-previews/leverBaseFront-expert-obj.png" --no-trim
```

### `light/leverArm` — the lever's arm, in light values, its shaft heavier

**Attach:**

1. `art/masters/props/default/leverArm.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: the arm of a floor lever — a straight wooden SHAFT, a bronze COLLAR near its top, and a squared bronze HANDLE block bent forward at the top. Same object, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image, except the one change of shape below — do not move, resize, straighten, add, remove or restyle any other part of it, and do not change the angle it stands at. Repaint value and light only, with ONE change of shape below.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT STANDS ON, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE ONE CHANGE OF SHAPE: the shaft is too thin to read. Paint it about half again as wide, the same straight post in the same place, centred on the same line, the same length. Nothing else changes size.

THE CHANGE OF VALUE: paint the whole arm LIGHT, so it stands out clearly on that dark floor. The shaft becomes pale bleached acacia, #c9b38a, with a pale catch-light running up its left edge and a darker right side that is still clearly lighter than the floor. The collar and the handle become pale polished bronze, #d6b878, the handle's top face the lightest thing on the arm.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold lever --contents=arm --shadow=0 --colour=#a7b2be --floor=#8d98a5
yarn import-tile art/masters/props/mechanism/light/leverArm.webp --tier=mechanism/light --name=leverArm --slot=prop \
  --filter=smooth --mask="$OBJ" --mask-grow=40 --no-trim
```

`--mask-grow=40` is a placeholder for the wider shaft: the scaffold's mask is the default arm's width, and
without it the new width is cut back off. Raise it until the shaft's edges survive, no further.

### `light/torchUnlit` — the standing torch, unlit, in light values, its post heavier

**Attach:**

1. `art/masters/props/default/torchUnlit.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: a standing torch — a stepped octagonal stone BASE, a tall wooden POST with a bronze collar at its foot and below its head, and a HEAD of wrapped cloth at the top, unlit. Same object, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image, except the one change of shape below — do not move, resize, straighten, add, remove or restyle any other part of it, and do not change the angle it stands at. Repaint value and light only, with ONE change of shape below.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT STANDS ON, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE ONE CHANGE OF SHAPE: the post is too thin to read. Paint it about half again as wide, the same straight post in the same place, the same height. The base, the collars and the head keep their size.

THE CHANGE OF VALUE: paint the whole torch LIGHT, so it stands out clearly on that dark floor. The base becomes pale limestone, #cfc3a8, each step's top edge catching a pale cream catch-light. The post becomes pale bleached acacia, #c9b38a, a catch-light up its left edge. The collars are pale polished bronze, #d6b878. The cloth head stays the darkest part — a mid-brown, #8a6f52, sooted at the top — still clearly lighter than the floor. A narrow dark band where the base meets the ground, so it sits on it.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow. No flame, no smoke.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold torch --spin=15 --drop=accent --colour-cloth=#3e3731 --colour=#a7b2be --floor=#8d98a5 --colour-deep=#5f6b77
yarn import-tile art/masters/props/mechanism/light/torchUnlit.webp --tier=mechanism/light --name=torchUnlit --slot=prop \
  --filter=smooth --seat="$SHADOW" --scale=0.5639
```

Cut unmasked, as the default is, so the wider post needs no grown mask. `--scale` is the default's and holds
while the painting's trimmed height is the default's 2110 px; if the return is taller or shorter, re-derive it
and `light/torchLit`'s together, the way `art/rebuild.sh` does for the pair.

### `light/torchLit` — the standing torch, lit, in light values

**WAITS ON `light/torchUnlit`.** It is an EDIT of the landed light unlit torch, as the default lit one is of the
default unlit one, so lighting it only adds the flame and the two coincide part for part.

**Attach:**

1. `art/masters/props/mechanism/light/torchUnlit.webp` — the light unlit torch, to edit
2. `art/masters/props/default/torchLit.webp` — the default lit torch: the flame to add, and how far it reaches

```
FRAME: portrait, exactly as the first reference, but taller at the top by the flame, as the second reference is. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS A STANDING TORCH, unlit, already painted. Keep every edge, every proportion and every silhouette of it exactly as it is — base, post, collars and cloth head unchanged, the same paint. Do not move, resize, straighten, add, remove or restyle any part of it.

THE SECOND ATTACHED IMAGE IS THE SAME TORCH LIT. Take ONLY its flame: add that flame on top of the cloth head, the same shape, the same size, the same place. The cloth head's top is lit warm orange where the flame sits on it.

The flame is matte painted orange and yellow tongues. No glow cast on the torch, no light pool, no halo, no smoke.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the torch and its flame. No floor, no gradient, no shadow on the magenta.
```

**Import:** `yarn import-tile art/masters/props/mechanism/light/torchLit.webp --tier=mechanism/light --name=torchLit --slot=prop --filter=smooth --scale=0.6513`

### `bone/leverBase` — the cave lever's base, a heap of pale stones

The cave's own lever. Cut into `leverBaseBack` and `leverBaseFront` from this one painting, as the default pair is.

**Re-roll:** the designer wants the cave lever's base to be a heap of stones the bone stands in, not a dome in bone colour. It keeps the dome's exact outline so the default's back and front masks still cut it. The first heap came back a tall cone filling the frame, with a bone standing in its slot: the heap is now held to the dome's low size, and the slot is empty.

**Attach:**

1. `art/masters/props/default/leverBase.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/cave-floor.webp` — the cave's rock floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: the base of a floor lever — a ribbed DOME with a slot cut in its top, set in a low KERB. Same object, same silhouette, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Repaint material, value and light only.

THE SECOND ATTACHED IMAGE IS THE CAVE FLOOR IT STANDS ON, dark rock. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE CHANGE: the dome and kerb become a HEAP OF STONES piled to exactly the dome's outline — a low round cairn of rounded cave stones, fist-sized and smaller, stacked tight, filling the reference's silhouette edge to edge, with the kerb's ring as a wider bottom course of flatter stones. PALE stones, #cfc6b4 to #b8ad98, each with a pale catch-light on its top and a warm shadow #8a7d68 underneath, the gaps between them a dark #2a221c, so the heap reads light against dark rock. The slot at the top stays an EMPTY dark hole between the topmost stones — nothing stands in it, nothing sticks out of it.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow. Stones only: NO BONE, no stick, no handle, no lever arm, no skull, nothing in or on the heap — the arm is a separate picture.
SIZE: the heap is LOW and exactly as big as the reference dome — the same width, the same height, standing in the same place in the BOTTOM of the frame. Everything above the reference dome's top stays plain magenta. Do not build it taller, do not let it grow into a cone or a tower.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece, exactly where it is in the reference. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold lever --contents=base --colour=#a7b2be --floor=#8d98a5
yarn render-prop --primitive=lever --contents=baseBack --shadow=0 --background=none --colour=#a7b2be --floor=#8d98a5 --out="$HOME/tile-previews/leverBaseBack-expert-obj.png"
yarn render-prop --primitive=lever --contents=baseFront --shadow=0 --background=none --colour=#a7b2be --floor=#8d98a5 --out="$HOME/tile-previews/leverBaseFront-expert-obj.png"
yarn import-tile art/masters/props/mechanism/light/bone/leverBase.webp --tier=mechanism/light/bone --name=leverBaseBack --slot=prop \
  --filter=smooth --mask="$HOME/tile-previews/leverBaseBack-expert-obj.png" --seat="$SHADOW" --no-trim
yarn import-tile art/masters/props/mechanism/light/bone/leverBase.webp --tier=mechanism/light/bone --name=leverBaseFront --slot=prop \
  --filter=smooth --mask="$HOME/tile-previews/leverBaseFront-expert-obj.png" --no-trim
```

### `bone/leverArm` — the cave lever's arm, a real long bone

**Re-roll:** the first prompt asked for the default arm in bone colour, and that is what came back: the same shaft, collar and squared handle. The designer wants the handle to BE a bone: the arm is now one real long bone with its knobbed joint end as the grip. Its silhouette is new, so it is keyed off its magenta rather than cut by the default arm's mask; `--no-trim` keeps it on the canvas where the dome turns it. The bone roll was right as a bone but came back on a painted cave floor (taken from the value reference) and full length with a knob at both ends: the floor reference is gone, the background is magenta only, and the bone stops square where the reference arm's foot is.

**Attach:**

1. `art/masters/props/default/leverArm.webp` — the piece itself, to edit: shape, silhouette, camera

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: the arm of a floor lever — a straight SHAFT, a COLLAR near its top, and a squared HANDLE block bent forward at the top. Same object, same camera. Keep its length, the line it stands on, where its foot is and the angle it stands at exactly as in the reference: the bone occupies exactly the space the reference arm occupies, top to bottom, and no more — the foot sits in the lever's dome and turns there. The SHAPE changes as described below; nothing else moves.

THE CHANGE OF SHAPE: the arm IS A BONE — one real long bone, like a thigh bone, used as the lever. Its shaft runs where the reference's shaft runs, about half again as wide, slightly waisted in the middle as a real bone is. Where the reference has its squared handle, the bone ends in its own rounded KNOB — the two smooth knuckles of a bone's joint end, a little wider than the shaft, which the hand grips. The collar is gone: a bone has none; at most a strip of old leather bound round the shaft where the collar was. The foot end is where the reference arm's foot is, cut off square there: it disappears into the lever's dome, so only ONE knob shows — the grip at the top.

THE MATERIAL: weathered bone, pale ivory #d8cdb4, faintly grained along its length, with a warm tan shadow #a8957a down its right side and a pale catch-light up its left; the knob's top is the palest thing on it. The leather strip, if any, is dark brown #4a3424.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow. One bone, nothing else: no skull, no teeth, no figures, no second bone.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the bone, exactly where the reference has magenta. NO floor, no rock, no ground, no texture, no gradient, no shadow behind it — the bone alone on magenta.
```

**Import:** `yarn import-tile art/masters/props/mechanism/light/bone/leverArm.webp --tier=mechanism/light/bone --name=leverArm --slot=prop --filter=smooth --no-trim`

### `bone/torchUnlit` — the cave's torch to light: a bone standing out of the ground, unlit

**Re-roll:** the first roll was the default torch in bone colour — base, collars and post — and the designer wants a real bone sticking out of the ground with the torch at its tip. The cave-floor reference is gone, so the background stays magenta.

**Attach:**

1. `art/masters/props/default/torchUnlit.webp` — the piece itself, to edit: shape, silhouette, camera

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: a standing torch — a stepped octagonal BASE, a tall POST with a collar at its foot and below its head, and a HEAD at the top, unlit. Same object, same camera. Keep its height, where it stands and the camera exactly as in the reference: the piece stands where the reference torch stands and is as tall. The SHAPE changes as described below.

THE CHANGE OF SHAPE: the torch IS A BONE — one real long bone, like a thigh bone, standing upright and stuck into the ground, as tall as the reference torch. NO octagonal base, no collars, no post: the bone's lower end goes straight down into a small heap of broken rock and grit at its foot, half buried, where the reference's base is. Its upper end, the bone's rounded KNOB, is the torch head: wrapped in old cloth soaked in pitch and bound with cord, where the reference's head is.

THE MATERIAL: weathered bone, pale ivory #d8cdb4, faintly grained, a warm tan shadow #a8957a down its right side and a pale catch-light up its left. The wrapping on the knob is dark and sooted, #4a3c30, the darkest thing on the piece. The rock heap at its foot is dark grey #3a332c with paler chips, and a dark contact shadow #2a221c where it meets the ground.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow. No flame, no smoke. One bone and its wrapping, nothing else: no skull, no teeth, no figures, no second bone.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece. NO floor, no rock beyond the small heap at its foot, no texture, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold torch --spin=15 --drop=accent --colour-cloth=#3e3731 --colour=#a7b2be --floor=#8d98a5 --colour-deep=#5f6b77
yarn import-tile art/masters/props/mechanism/light/bone/torchUnlit.webp --tier=mechanism/light/bone --name=torchUnlit --slot=prop \
  --filter=smooth --seat="$SHADOW" --scale=0.5639
```

### `bone/torchLit` — the cave's bone torch, lit

**WAITS ON `bone/torchUnlit`**, for `light/torchLit`'s reason: an edit of the landed unlit one, so the two coincide.

**Attach:**

1. `art/masters/props/mechanism/light/bone/torchUnlit.webp` — the bone torch unlit, to edit
2. `art/masters/props/default/torchLit.webp` — the default lit torch: the flame to add, and how far it reaches

```
FRAME: portrait, exactly as the first reference, but taller at the top by the flame, as the second reference is. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS A BONE STANDING OUT OF THE GROUND, its knob wrapped as a torch head, unlit, already painted. Keep every edge, every proportion and every silhouette of it exactly as it is — base, pillar, collars and head unchanged, the same paint. Do not move, resize, straighten, add, remove or restyle any part of it.

THE SECOND ATTACHED IMAGE IS A TORCH OF THE SAME SHAPE, LIT. Take ONLY its flame: add that flame on top of the head, the same shape, the same size, the same place. The head's top is lit warm orange where the flame sits in it.

The flame is matte painted orange and yellow tongues. No glow cast on the bone, no light pool, no halo, no smoke.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the torch and its flame. No floor, no gradient, no shadow on the magenta.
```

**Import:** `yarn import-tile art/masters/props/mechanism/light/bone/torchLit.webp --tier=mechanism/light/bone --name=torchLit --slot=prop --filter=smooth --scale=0.6513`

### `light/plate` — the pressure plate, raised, in light values

The three plate looks swap on one cell, so they are one paint chain as the default's are: `plate`, then
`plateDown` as an edit of it, then `plateStone` as an edit of that. **The limestone block in `plateStone` must
stay the palest thing on the plate**, so the slab goes light but stops a clear step short of it.

**Attach:**

1. `art/masters/props/default/plate.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: a pressure plate — a square SLAB raised a little above a stone KERB that frames it. Same object, same silhouette, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Repaint value and light only.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT STANDS ON, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE CHANGE: paint the plate LIGHT, so it stands out clearly on that dark floor. The kerb becomes pale limestone, #cfc3a8, its top edges catching a pale cream catch-light and a dark joint line, #2a2622, where it meets the ground. The slab becomes a mid-light polished bronze, #b39a68 — clearly lighter than the floor, but a clear step darker than the kerb's catch-light, so a pale stone set on it later would still stand out. A thin catch-light along the slab's upper-left edge, and a dark shadow line under its near edge where it stands proud of the kerb.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece, exactly where it is in the reference. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold plate --drop=limestone --colour=#a7b2be --floor=#8d98a5 --colour-deep=#5f6b77
yarn import-tile art/masters/props/mechanism/light/plate.webp --tier=mechanism/light --name=plate --slot=prop \
  --filter=smooth --seat="$SHADOW"
```

Cut unmasked with the default's flags: the painted kerb is larger than the scaffold's footprint.

### `light/plateDown` — the pressure plate, sunk, in light values

**WAITS ON `light/plate`.**

**Attach:**

1. `art/masters/props/mechanism/light/plate.webp` — the light plate, to edit
2. `art/masters/props/default/plateDown.webp` — the default sunk plate: what changes, and only that

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS A PRESSURE PLATE, raised, already painted. Keep every edge, every proportion and every silhouette exactly as in the reference image — the kerb and everything outside the slab the same paint, nothing moved, resized, added or removed.

THE SECOND ATTACHED IMAGE IS THE SAME PLATE PRESSED DOWN. Make the one change it shows: the slab is sunk level with its kerb, so the shadow line under its near edge is gone and a thin dark gap runs round it inside the kerb instead. The slab keeps its colour and its catch-light.

Matte paint, soft brush texture, no outlines, no gloss.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold plate --drop=limestone --colour=#a7b2be --floor=#8d98a5 --colour-deep=#5f6b77
yarn import-tile art/masters/props/mechanism/light/plateDown.webp --tier=mechanism/light --name=plateDown --slot=prop \
  --filter=smooth --seat="$SHADOW"
```

### `light/plateStone` — the sunk plate with the stone on it, in light values

**WAITS ON `light/plateDown`.**

**Attach:**

1. `art/masters/props/mechanism/light/plateDown.webp` — the light sunk plate, to edit
2. `art/masters/props/default/plateStone.webp` — the default plate with its stone: the stone to add

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS A PRESSURE PLATE, sunk, already painted. Keep every edge, every proportion and every silhouette exactly as in the reference image — the same paint, nothing moved, resized, added or removed.

THE SECOND ATTACHED IMAGE SHOWS A LIMESTONE BLOCK resting on the same plate. Add that block, the same shape, the same size, the same place. It is the palest thing on the plate: cream limestone #ece3cf, a catch-light on its top face, and a DARK contact shadow, #2a2622, tight under it where it rests on the slab, so it reads against the slab's own light bronze.

Matte paint, soft brush texture, no outlines, no gloss.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold plate --drop=limestone --colour=#a7b2be --floor=#8d98a5 --colour-deep=#5f6b77
yarn import-tile art/masters/props/mechanism/light/plateStone.webp --tier=mechanism/light --name=plateStone --slot=prop \
  --filter=smooth --seat="$SHADOW"
```

### `light/gate` — the gate, shut, face on, in light values

**THE GATE HAS NO PAINTED MASTER.** The default four are the Blender render imported as it stands
(`art/rebuild.sh`, "the ward gate"), so these four paint over a fresh render of the same scaffold — the same
object by construction. Render each attachment first:

**Prepare:** `yarn render-prop --primitive=gate --contents=shut --colour=#cbbd9c --floor=#57534b --out="$HOME/tile-previews/gate-light.png"` — and `--contents=open`, `shut-side`, `open-side` into `gate-open-light.png`, `gate-side-light.png`, `gate-open-side-light.png` for the three after it.

**Attach:**

1. `~/tile-previews/gate-light.png` — the scaffold: the gate's own geometry, the same object as the default
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE'S SHAPE: a gate in a doorway — two stone JAMBS, a LINTEL across their tops, and between them a GRILLE of upright bars on cross-rails, shut. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material, value and light.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT STANDS ON, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE PAINT: LIGHT values, so it stands out clearly on that dark floor. The jambs and the lintel are pale limestone, #cfc3a8, their top faces and upper-left edges catching a pale cream catch-light, dressed blocks with fine joints. The grille is pale bronze, #c9ad72, each bar with a thin catch-light down its left edge and a darker right edge that is still clearly lighter than the floor; the gaps between the bars stay open. A narrow dark band, #2a2622, where the jambs meet the ground.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the gate, between its bars included. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold gate --contents=shut
yarn import-tile art/masters/props/mechanism/light/gate.webp --tier=mechanism/light --name=gate --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `light/gate-side` — the gate, shut, side on, in light values, its bars heavier

**Attach:**

1. `~/tile-previews/gate-side-light.png` — the scaffold: the same gate in a wall running up the page
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE'S SHAPE: a gate seen side on, in a wall that runs away from you — a stone PIER behind, a stone PIER in front, and between them the GRILLE seen edge on, a thin line of bars. Keep every edge, every proportion and every silhouette exactly as in the reference image, except the one change of shape below — do not move, resize, straighten, add, remove or restyle any other part of it, and do not change the angle it stands at. Paint only material, value and light, with ONE change of shape below.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT STANDS ON, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE ONE CHANGE OF SHAPE: the grille seen edge on is too thin to read. Paint it about half again as thick, in the same place between the same two piers. The piers keep their size.

THE PAINT: LIGHT values, so it stands out clearly on that dark floor. The piers are pale limestone, #cfc3a8, top faces and upper-left edges catching a pale cream catch-light. The grille is pale bronze, #c9ad72, a catch-light along its top. A narrow dark band, #2a2622, where the piers meet the ground.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the gate. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold gate --contents=shut-side
yarn import-tile art/masters/props/mechanism/light/gate-side.webp --tier=mechanism/light --name=gate-side --slot=prop \
  --filter=smooth --mask="$OBJ" --mask-grow=40 --seat="$SHADOW"
```

### `light/gate-open` — the gate, open, face on, in light values

**Attach:**

1. `~/tile-previews/gate-open-light.png` — the scaffold: the same gate, its grille sunk into the threshold
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE'S SHAPE: an opened gate — the grille has sunk into the floor and only its top BAR lies flush in the threshold, a long thin bar across the doorway. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material, value and light.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT LIES IN, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE PAINT: the bar is pale bronze, #c9ad72, with a pale catch-light along its top face and a thin dark slot line, #2a2622, round it where it lies in the floor.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the bar. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold gate --contents=open
yarn import-tile art/masters/props/mechanism/light/gate-open.webp --tier=mechanism/light --name=gate-open --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `light/gate-open-side` — the gate, open, side on, in light values

**Attach:**

1. `~/tile-previews/gate-open-side-light.png` — the scaffold: the sunk bar aimed into depth
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE'S SHAPE: an opened gate seen side on — only the grille's top BAR, lying flush in the floor, running away from you. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material, value and light.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT LIES IN, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE PAINT: the bar is pale bronze, #c9ad72, with a pale catch-light along its top face and a thin dark slot line, #2a2622, round it where it lies in the floor.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the bar. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold gate --contents=open-side
yarn import-tile art/masters/props/mechanism/light/gate-open-side.webp --tier=mechanism/light --name=gate-open-side --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW" --scale=0.43
```

### `light/dropEast` — the one-way drop, riding east, in light values

The three drops are each their own painting, as the defaults are. Every flag is the default's: the edit keeps
the master's canvas, and `--tight` is master pixels to a map unit.

**Attach:**

1. `art/masters/props/default/dropEast.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: a one-way drop — a broken PIT in the paving, a flight of STEPS up onto a block at one lip, a tall POST there and a short POST at the far lip, a taut ROPE run between them, loose blocks round the edge. Same object, same silhouette, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Repaint value and light only.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT IS CUT IN, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE CHANGE: paint the stone LIGHT, so the drop stands out clearly on that dark floor. The paving round the pit, the steps, the block and the loose blocks become pale limestone, #cfc3a8, each top face and upper-left edge catching a pale cream catch-light and each block's underside a darker tan that is still clearly lighter than the floor. The posts are pale bleached wood, #c9b38a; the rope is pale hemp, #e0d2ae, the lightest line in the picture. The pit itself STAYS BLACK — the dark opening is what makes it a drop.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece, exactly where it is in the reference. No gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold pit --contents=drop --colour=#a7b2be --floor=#8d98a5 --colour-deep=#5f6b77
yarn import-tile art/masters/props/mechanism/light/dropEast.webp --tier=mechanism/light --name=dropEast --slot=prop --crop-below=1513 --tight=9.464 \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `light/dropNorth` — the one-way drop, riding north, in light values

**Attach:**

1. `art/masters/props/default/dropNorth.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: a one-way drop seen down its length — a broken PIT across the passage, a flight of STEPS up onto a block, a tall POST and a short POST with a taut ROPE run between them, loose blocks round the edge. Same object, same silhouette, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Repaint value and light only.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT IS CUT IN, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE CHANGE: paint the stone LIGHT, so the drop stands out clearly on that dark floor. The paving, the steps, the block and the loose blocks become pale limestone, #cfc3a8, each top face and upper-left edge catching a pale cream catch-light and each block's underside a darker tan that is still clearly lighter than the floor. The posts are pale bleached wood, #c9b38a; the rope is pale hemp, #e0d2ae, the lightest line in the picture. The pit itself STAYS BLACK — the dark opening is what makes it a drop.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece, exactly where it is in the reference. No gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold pit --contents=dropNorth --colour=#a7b2be --floor=#8d98a5 --colour-deep=#5f6b77
yarn import-tile art/masters/props/mechanism/light/dropNorth.webp --tier=mechanism/light --name=dropNorth --slot=prop --tight=15.375 \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

### `light/dropSouth` — the one-way drop, riding south, in light values

Cut by the chroma key alone, as the default is: its master was stretched by hand after painting, so the
render's mask no longer fits it. The edit keeps the stretch.

**Attach:**

1. `art/masters/props/default/dropSouth.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: a one-way drop seen down its length — a flight of STEPS and a wall of blocks at the far lip, a long black PIT, a tall POST and a short POST with a taut ROPE run between them, loose blocks at the near edge. Same object, same silhouette, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Repaint value and light only.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT IS CUT IN, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE CHANGE: paint the stone LIGHT, so the drop stands out clearly on that dark floor. The steps, the wall of blocks and the loose blocks become pale limestone, #cfc3a8, each top face and upper-left edge catching a pale cream catch-light and each block's underside a darker tan that is still clearly lighter than the floor. The posts are pale bleached wood, #c9b38a; the rope is pale hemp, #e0d2ae, the lightest line in the picture. The pit itself STAYS BLACK — the dark opening is what makes it a drop.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece, exactly where it is in the reference. No gradient, no shadow on the magenta.
```

**Import:** `yarn import-tile art/masters/props/mechanism/light/dropSouth.webp --tier=mechanism/light --name=dropSouth --slot=prop --tight=21.18 --filter=smooth`

### `light/pipeHole` — the stone pipe's mouth, in the master and wizard walls

**THE PIPE HOLE STANDS ON THE WALL, NOT THE FLOOR, and master's and wizard's walls are the LIGHT surface** of
their rank (the rank-surfaces table above). So this is the one `light` entry that does not go lighter: the
mouth stays black and the lip ring gets a dark inner shadow AND a pale catch-light on its outer rim, so it reads
against a light face. It **WAITS ON `master/wall-face`**, whose landed master is its value reference; painted
before it, it is judged against the placeholder face. Cut to the same `pipeHole-mask.png` ellipse as the default,
so only the mouth lands and the room's own wall shows round it.

**Attach:**

1. `art/masters/props/default/pipeHole.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/master-wall-face.webp` — the wall face it sits in, for value only

```
FRAME: landscape, two units wide by one tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: the round MOUTH of a stone pipe set in a wall, a thick stone LIP ring round a black opening, the wall's blocks round it. Same object, same silhouette, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it. Repaint value and light only.

THE SECOND ATTACHED IMAGE IS THE WALL FACE IT SITS IN. Take ONLY its value and colour range for the blocks round the mouth. Nothing of that wall's carving appears in the picture.

THE CHANGE: the blocks round the mouth take the second image's light values. The lip ring is pale limestone, #cfc3a8, with a pale cream catch-light round its upper-left outer rim and a deep shadow, #2a2622, round its inner edge where it turns into the pipe. The opening stays BLACK, deep, nothing in it.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the wall piece, exactly where it is in the reference. No gradient, no shadow on the magenta.
```

**Import:** `yarn import-tile art/masters/props/mechanism/light/pipeHole.webp --tier=mechanism/light --name=pipeHole --slot=wall --filter=smooth --mask=art/masters/props/default/pipeHole-mask.png`

### `light/pipeHoleStone` — the stone pipe's mouth with a stone in it

**WAITS ON `light/pipeHole`**: an edit of it, as the default is, so the two swap on one wall.

**Attach:**

1. `art/masters/props/mechanism/light/pipeHole.webp` — the light pipe mouth, to edit
2. `art/masters/props/default/pipeHoleStone.webp` — the default mouth with its stone: the stone to add

```
FRAME: landscape, two units wide by one tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS A PIPE MOUTH IN A WALL, already painted. Keep every edge, every proportion and every silhouette exactly as in the reference image — the same paint, nothing moved, resized, added or removed.

THE SECOND ATTACHED IMAGE SHOWS A LIMESTONE BLOCK lodged in the same mouth. Add that block, the same shape, the same size, the same place: cream limestone #ece3cf, a catch-light on its upper-left face, a dark shadow, #2a2622, where it meets the lip.

Matte paint, soft brush texture, no outlines, no gloss.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the wall piece. No gradient, no shadow on the magenta.
```

**Import:** `yarn import-tile art/masters/props/mechanism/light/pipeHoleStone.webp --tier=mechanism/light --name=pipeHoleStone --slot=wall --filter=smooth --mask=art/masters/props/default/pipeHole-mask.png`

### `light/narrowAcross` — the narrow passage, wall across the corridor, in light values

**Attach:**

1. `art/masters/props/default/narrowAcross.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: a block WALL across a corridor with a tall narrow CRACK through its middle, a coping along its top and fallen blocks at its foot. Same object, same silhouette, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Repaint value and light only.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT STANDS ON, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE CHANGE: paint the wall LIGHT, so it stands out clearly on that dark floor. The blocks, the coping and the fallen blocks become pale limestone, #cfc3a8, the coping's top face and each block's upper-left edge catching a pale cream catch-light, the joints a fine darker line. The crack STAYS BLACK, top to bottom — it is the way through. A dark band, #2a2622, where the wall and the fallen blocks meet the ground.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece, exactly where it is in the reference. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold narrow --contents=across --colour=#a7b2be --floor=#8d98a5 --colour-deep=#5f6b77
yarn import-tile art/masters/props/mechanism/light/narrowAcross.webp --tier=mechanism/light --name=narrowAcross --slot=prop \
  --filter=smooth --seat="$SHADOW"
```

### `light/narrowAlong` — the narrow passage, wall along the corridor, in light values

**Attach:**

1. `art/masters/props/default/narrowAlong.webp` — the piece itself, to edit: shape, silhouette, camera
2. `art/masters/surfaces/master-floor.webp` — the dark floor it must read on, for value only

```
FRAME: portrait, two units wide by three tall, exactly as the first reference. Do not re-compose it into a square. Paint over the first reference image itself.

THE FIRST ATTACHED IMAGE IS THE PIECE, already painted: the same block wall seen end on — its narrow END and its long TOP running away from you, the CRACK cut across the top, fallen blocks either side. Same object, same silhouette, same camera. Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Repaint value and light only.

THE SECOND ATTACHED IMAGE IS THE FLOOR IT STANDS ON, a dark polished stone. Take ONLY its darkness, as the value the piece must stand out against. Nothing of that floor appears in the picture.

THE CHANGE: paint the wall LIGHT, so it stands out clearly on that dark floor. The top, the end and the fallen blocks become pale limestone, #cfc3a8, the long top catching a pale cream catch-light and the end face a darker tan that is still clearly lighter than the floor. The crack STAYS BLACK — it is the way through. A dark band, #2a2622, where the wall and the fallen blocks meet the ground.

Matte paint, soft brush texture, no outlines: the catch-lights are lighter paint, not gloss, not shine, not a glow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) everywhere outside the piece, exactly where it is in the reference. No floor, no gradient, no shadow on the magenta.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold narrow --contents=along --colour=#a7b2be --floor=#8d98a5 --colour-deep=#5f6b77
yarn import-tile art/masters/props/mechanism/light/narrowAlong.webp --tier=mechanism/light --name=narrowAlong --slot=prop \
  --filter=smooth --seat="$SHADOW"
```

## Doors — six

The picture a shut door shows in its popup, above the key it asks for: one per ward tier (`door/ward-<tier>`) and one
plain door for every colour gate (`door/colour`), landing in `src/assets/doors/<name>.webp`. Until a file lands the
popup shows no door, so none of these blocks anything. The popup stands on the room's own wall, so each door is
painted against its rank's wall master for the brushwork and the stone.

**The door alone, never a doorway in a wall** (`tile-art-brief.md`: a doorway asked for comes back as a strip of
wall). Its frame and lintel are part of the door; past them is magenta. **No sign on it:** the key's own sign and
colour are drawn by the game beside the picture, so a carved glyph or a coloured band would contradict it.

**Wizard is the top difficulty, never a kind of magic** — the gods' door is the richest in material, and still a door.

### `door/ward-starter` — the merchant's ward door

1. `art/masters/tombWall/starter.webp` — the starter wall, for the brushwork and the stone only

```
FRAME: square, 1:1. The door stands alone, centred and seen straight on, filling about 85% of the height. Do not crop it and do not re-compose it.

STYLE: hand-painted digital art, matte: soft brush texture, grit and speckle, NO outlines anywhere, every edge is a change of value between painted areas. Even, soft light from the upper left, lamplit and warm. No glow cast on anything, no light pool, no cast shadow, no ground, no floor, no steps. No text, no letters, no hieroglyphs, no figures, no frame, no border.

THE ATTACHED IMAGE IS A WALL, already painted in the finished style of this set. Take ONLY its brushwork, its stone and its colour range. Nothing of the wall itself appears in the picture.

SUBJECT: A merchant's storeroom door: thick sun-bleached planks of acacia on two cross-battens, iron nails, a heavy wooden bar across it in two brackets. Over the join of bar and door a knot of palm-fibre cord, sealed with a lump of grey clay pressed with a plain round seal. Worn, honest, a little warped. The door is shut.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges, right up to the door's frame. No wall, no gradient, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/doors --name=ward-starter --size=512`

### `door/ward-junior` — the nobleman's ward door

1. `art/masters/tombWall/junior.webp` — the junior wall, for the brushwork and the stone only

```
FRAME: square, 1:1. The door stands alone, centred and seen straight on, filling about 85% of the height. Do not crop it and do not re-compose it.

STYLE: hand-painted digital art, matte: soft brush texture, grit and speckle, NO outlines anywhere, every edge is a change of value between painted areas. Even, soft light from the upper left, lamplit and warm. No glow cast on anything, no light pool, no cast shadow, no ground, no floor, no steps. No text, no letters, no hieroglyphs, no figures, no frame, no border.

THE ATTACHED IMAGE IS A WALL, already painted in the finished style of this set. Take ONLY its brushwork, its stone and its colour range. Nothing of the wall itself appears in the picture.

SUBJECT: A nobleman's door: a double-leaf door of dark cedar in a painted mud-plaster frame, the leaves edged in bronze strips, two heavy bronze bolts shot home. A cord across both handles, sealed with a broad red clay seal. Well kept, the owner's wealth in the wood. The door is shut.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges, right up to the door's frame. No wall, no gradient, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/doors --name=ward-junior --size=512`

### `door/ward-expert` — the high priest's ward door

1. `art/masters/tombWall/expert.webp` — the expert wall, for the brushwork and the stone only

```
FRAME: square, 1:1. The door stands alone, centred and seen straight on, filling about 85% of the height. Do not crop it and do not re-compose it.

STYLE: hand-painted digital art, matte: soft brush texture, grit and speckle, NO outlines anywhere, every edge is a change of value between painted areas. Even, soft light from the upper left, lamplit and warm. No glow cast on anything, no light pool, no cast shadow, no ground, no floor, no steps. No text, no letters, no hieroglyphs, no figures, no frame, no border.

THE ATTACHED IMAGE IS A WALL, already painted in the finished style of this set. Take ONLY its brushwork, its stone and its colour range. Nothing of the wall itself appears in the picture.

SUBJECT: A temple door: a tall double-leaf door of dark wood in a cut-stone frame shaped like a false-door stela, a torus moulding and a cavetto cornice above the lintel. Bronze hinge pins top and bottom, the leaves bound shut with cord through two bronze rings and sealed with a temple seal in grey clay. The door is shut.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges, right up to the door's frame. No wall, no gradient, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/doors --name=ward-expert --size=512`

### `door/ward-master` — the pharaoh's ward door

1. `art/masters/tombWall/master.webp` — the master wall, for the brushwork and the stone only

```
FRAME: square, 1:1. The door stands alone, centred and seen straight on, filling about 85% of the height. Do not crop it and do not re-compose it.

STYLE: hand-painted digital art, matte: soft brush texture, grit and speckle, NO outlines anywhere, every edge is a change of value between painted areas. Even, soft light from the upper left, lamplit and warm. No glow cast on anything, no light pool, no cast shadow, no ground, no floor, no steps. No text, no letters, no hieroglyphs, no figures, no frame, no border.

THE ATTACHED IMAGE IS A WALL, already painted in the finished style of this set. Take ONLY its brushwork, its stone and its colour range. Nothing of the wall itself appears in the picture.

SUBJECT: A pharaoh's tomb door: no leaves at all, a single great blocking stone of black granite lowered into the doorway between granite jambs, its face polished, a gold-leafed band along its top edge. The granite lintel above it carries a carved winged sun disc, no writing. The door is shut.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges, right up to the door's frame. No wall, no gradient, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/doors --name=ward-master --size=512`

### `door/ward-wizard` — the gods' ward door

1. `art/masters/tombWall/wizard.webp` — the wizard wall, for the brushwork and the stone only

```
FRAME: square, 1:1. The door stands alone, centred and seen straight on, filling about 85% of the height. Do not crop it and do not re-compose it.

STYLE: hand-painted digital art, matte: soft brush texture, grit and speckle, NO outlines anywhere, every edge is a change of value between painted areas. Even, soft light from the upper left, lamplit and warm. No glow cast on anything, no light pool, no cast shadow, no ground, no floor, no steps. No text, no letters, no hieroglyphs, no figures, no frame, no border.

THE ATTACHED IMAGE IS A WALL, already painted in the finished style of this set. Take ONLY its brushwork, its stone and its colour range. Nothing of the wall itself appears in the picture.

SUBJECT: The richest door in the land: a tall pylon gateway in miniature, its jambs faced with gilded panels and bands of blue faience tile, a winged sun disc in gold leaf over the lintel. In the opening a double-leaf door of ebony clad in hammered electrum, shut flush, heavy bronze bolts. Rich materials only, nothing glowing, nothing magical. The door is shut.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges, right up to the door's frame. No wall, no gradient, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/doors --name=ward-wizard --size=512`

### `door/colour` — the colour door, one for every floor

1. `art/masters/tombWall/starter.webp` — the starter wall, for the brushwork and the stone only

```
FRAME: square, 1:1. The door stands alone, centred and seen straight on, filling about 85% of the height. Do not crop it and do not re-compose it.

STYLE: hand-painted digital art, matte: soft brush texture, grit and speckle, NO outlines anywhere, every edge is a change of value between painted areas. Even, soft light from the upper left, lamplit and warm. No glow cast on anything, no light pool, no cast shadow, no ground, no floor, no steps. No text, no letters, no hieroglyphs, no figures, no frame, no border.

THE ATTACHED IMAGE IS A WALL, already painted in the finished style of this set. Take ONLY its brushwork, its stone and its colour range. Nothing of the wall itself appears in the picture.

SUBJECT: A plain inner door of a tomb: a single leaf of weathered wooden planks on two cross-battens, in a squared limestone frame, an iron ring for a handle and an empty iron hasp where a lock would hang. Plain, ordinary, nothing on it: the same door on every floor. The door is shut.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges, right up to the door's frame. No wall, no gradient, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/doors --name=colour --size=512`

## Collection icons — sellables

The pictures the Collection shows for the junk the player finds and sells: one per sellable (`sellable/<id>`, landing
in `src/assets/sellables/<id>.webp`). Until a file lands the item keeps its glyph, so none of these blocks anything.
A camp part keeps its structure's art: parts get no icon of their own.

**One attachment: the chest, for the BRUSHWORK** — the finished camp art's matte finish, which every icon is painted
against. It is in `art/masters/camp/`.

**A square canvas, flat `#ff00ff` to the edges.** `yarn import-camp` keys the magenta out, keeps the master
in `art/masters/camp/<folder>/` and writes the shipped file. An icon casts no contact shadow and records no
foot: it is shown alone, not stood on sand. A return with a ground patch or a cast shadow is a re-roll.

**Wizard is the top difficulty, never a kind of magic.** A higher-tier sellable is richer in material (bronze,
silver, gold, lapis), and still an ordinary, worn object.

Entries are deleted as they land, like the rest of this file.

### `sellable/sell_bronze_1` — Bent Bronze Amulet

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Bent Bronze Amulet (Verbogen Bronzen Amulet). A small cast bronze charm shaped like a protective sign, its loop and body bent crooked, dull warm brown.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_bronze_1 --size=256`

### `sellable/sell_bronze_2` — Corroded Bronze Mirror

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Corroded Bronze Mirror (Verweerde Bronzen Spiegel). A round hand mirror of bronze on a short handle, its face clouded with green corrosion.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_bronze_2 --size=256`

### `sellable/sell_bronze_3` — Dull Bronze Fishhook

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Dull Bronze Fishhook (Dof Bronzen Vishaak). A small plain bronze fishhook with a barb, dulled and darkened, a bit of old cord on its eye.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_bronze_3 --size=256`

### `sellable/sell_bronze_4` — Small Bronze Bell

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Small Bronze Bell (Kleine Bronzen Bel). A small bronze bell with a loop on top, dented, its brown surface dulled, no clapper showing.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_bronze_4 --size=256`

### `sellable/sell_bronze_5` — Tarnished Bronze Ring

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Tarnished Bronze Ring (Verkleurde Bronzen Ring). A plain bronze ring band, dull brown and tarnished green in places, slightly out of round.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_bronze_5 --size=256`

### `sellable/sell_silver_1` — Tarnished Silver Ankh

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Tarnished Silver Ankh (Verkleurde Zilveren Ankh). An ankh, the looped cross of life, in tarnished silver, dulled to a grey with darker patches.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_silver_1 --size=256`

### `sellable/sell_silver_2` — Silver Kohl Applicator

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Silver Kohl Applicator (Zilveren Kohl-Applicator). A slender silver rod with a rounded tip and a small collar, once used to line the eyes, dull and clean of paint.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_silver_2 --size=256`

### `sellable/sell_silver_3` — Dented Silver Bowl

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Dented Silver Bowl (Gedeukte Zilveren Schaal). A small shallow offering bowl of silver, crushed in on one side, tarnished grey.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_silver_3 --size=256`

### `sellable/sell_silver_4` — Silver Hair Pin

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Silver Hair Pin (Zilveren Haarspeld). A simple long silver hair pin with a plain rounded head, slightly bent, dull grey.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_silver_4 --size=256`

### `sellable/sell_silver_5` — Worn Silver Bracelet

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Worn Silver Bracelet (Versleten Zilveren Armband). A thin silver bracelet, its clasp broken open so the band lies in a loose open ring, worn dull.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_silver_5 --size=256`

### `sellable/sell_gold_1` — Small Gold Bead

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Small Gold Bead (Kleine Gouden Kraal). One small round gold bead with a hole through it, warm and slightly dented.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_gold_1 --size=256`

### `sellable/sell_gold_2` — Gold Leaf Fragment

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Gold Leaf Fragment (Gouden Bladfragment). A sliver of gold leaf, a thin curled flake with ragged edges, warm yellow.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_gold_2 --size=256`

### `sellable/sell_gold_3` — Thin Gold Earring

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Thin Gold Earring (Dunne Gouden Oorring). A thin hammered gold earring, a slim crescent hoop, pale warm gold, slightly bent.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_gold_3 --size=256`

### `sellable/sell_gold_4` — Gold-Flecked Shard

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Gold-Flecked Shard (Goudgespikkelde Scherf). A broken piece of pale gilded plaster with flecks of real gold still clinging to its surface.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_gold_4 --size=256`

### `sellable/sell_gold_5` — Chipped Gold Signet

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Chipped Gold Signet (Beschadigde Gouden Zegelring). A gold signet ring with a flat oval bezel, its engraving worn smooth, a small chip out of the band.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_gold_5 --size=256`

### `sellable/sell_divine_1` — Faded Lapis Scarab

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Faded Lapis Scarab (Vervaagde Lapis Scarabee). A scarab beetle carved from deep blue lapis lazuli, its colour faded and chalky in places, a few gold flecks left.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_divine_1 --size=256`

### `sellable/sell_divine_2` — Carnelian Eye Amulet

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Carnelian Eye Amulet (Carneool Oog-Amulet). A protective eye amulet carved from blood-red carnelian, the eye in the style of the Eye of Horus, smooth and glowing.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_divine_2 --size=256`

### `sellable/sell_divine_3` — Turquoise Inlay Chip

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Turquoise Inlay Chip (Turkoois Inlegstukje). A single small square mosaic tile of turquoise stone, one edge chipped, rich blue-green.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_divine_3 --size=256`

### `sellable/sell_divine_4` — Alabaster Canopic Shard

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Alabaster Canopic Shard (Albasten Canopische Scherf). A broken curved piece of a pale alabaster jar, with a smooth outer face and a jagged torn edge, creamy white.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_divine_4 --size=256`

### `sellable/sell_divine_5` — Obsidian Ritual Blade

1. `art/masters/camp/chest.webp` — the finished chest, for the brushwork only

```
FRAME: square, 1:1, exactly as the camp art. The object stands alone, centred, on an invisible ground line at about 88% of the height, filling about 70% of the width. Do not crop it and do not re-compose it.

STYLE: painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, every edge is a change of value between painted areas. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the upper left: full, rich, saturated colour. Mid-tone to dark values with clear form shading, so the object stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt, ash or ground patch under the object. No text, no frame, no border.

THE FIRST ATTACHED IMAGE IS A CHEST, already painted in the finished style of this set. Take ONLY its brushwork, its matte finish and the way it models form. Nothing of the chest itself appears in the picture.

SUBJECT: Obsidian Ritual Blade (Obsidiaan Ritueel Mes). A leaf-shaped ceremonial blade of black volcanic obsidian, ground to a fine edge, glassy but painted matte, with a short wrapped handle.

BACKGROUND: a flat, solid #ff00ff magenta (red 255 green 0 blue 255) that fills the whole square canvas to all four edges. No floor, no wall, no gradient, no sand, no shadow.
```

**Import:** `yarn import-camp <file> --out-dir=src/assets/sellables --name=sell_divine_5 --size=256`
