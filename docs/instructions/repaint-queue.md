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

---

## Priest — three

Two wall items and one prop. No prop of his beyond the veil is modelled yet; see art-tasks §5.

### `expert/wallShrine` — a wall shrine, doors ajar, lamp lit inside

**Attach:**

1. `~/tile-previews/wallshrine-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

**This one keeps coming back with a view of its own**, so it carries one extra line and NOTHING else. The
tell is the download's SIZE, before it is opened: 2912x1440 is the scaffold edited, 2048x2048 is a fresh
square drawing with the attachment thrown away, unimportable, and no flag rescues it. Re-roll a square
without measuring it.

**Do not answer a wrong projection by describing the right one.** Two rolls were lost to that. Called
raked, it drew a cabinet in full low-angle perspective; handed the brief's `FLAT ORTHOGRAPHIC HYBRID`
block, it drew a flat elevation with no top faces, no inner floor and two matching doors. That block is
for generating a whole tile, where nothing carries the view — here it CONTRADICTS the scaffold, which
shows the inside of the opening and whose doors are deliberately unequal, and a rule in words beats a
picture every time. The scaffold is the projection. The prompt's only job is material.

The extra line is about the CANVAS, not the geometry, which is why it is allowed to stay: a square
re-composition is the one failure the attachment cannot prevent by itself.

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

Match the reference image's FRAME exactly: the same 2:1 landscape shape, the object in the same place in it, at the same size. Do not re-compose it into a square.

The object: a small shrine cabinet standing against a wall, its doors part open. The wide slab over the
top is a CAVETTO CORNICE and the slab under it is the PLINTH, both overhanging the box between them; the
uprights at the sides are JAMBS; the two dark panels are the DOOR LEAVES, one covering more of the opening
than the other; between them is a black GAP into the shrine's inside, and standing in it is a small LAMP
with a FLAME above it.

The cornice, plinth and jambs are dark basalt, cool grey-blue, dressed smooth. The doors are cedar, dark
red-brown. The lamp is buff pottery, sooted at the lip; its flame is a small ochre-orange tongue, matte.

The near-black opening is a HOLE and must stay black — paint darkness in it, never a wall, a floor or a back panel. No pink and no purple anywhere in it. The lamp is the only lit thing and it throws no light on the doors.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold wallShrine --contents=ajar --shear=0.5 --width=448 --height=224 --sun=0
yarn import-tile art/masters/props/expert/wallShrine.webp --tier=expert --name=wallShrine --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `expert/veil` — a veil on its rail, drawn back

**Attach:**

1. `~/tile-previews/veil-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a veil hanging from a rail across a wall, drawn back to one side. The thin bar across the top
is the RAIL and the blocks at its ends are its BRACKETS; the wide sheet in vertical folds hanging from the
left two thirds is the VEIL; the three narrow bundles at the right are the same cloth GATHERED where it has
been pulled aside.

Fine bleached linen, cool white with grey shadow in the folds, so thin that it is slightly darker where it
doubles in the gathers. A woven band of dull blue-green runs along its lower hem. The rail and brackets are
dark bronze with a green patina.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold hanging --contents=rail --shear=0.5 --width=448 --height=224 --sun=0
yarn import-tile art/masters/props/expert/veil.webp --tier=expert --name=veil --slot=wall \
  --filter=smooth --mask="$OBJ" --headroom=0.18
```

### `expert/hanging` — a veil before the shrine, on posts

**Attach:**

1. `~/tile-previews/hanging-expert.png` — the scaffold
2. `~/tile-previews/expert-plain.png` — the material reference

```
A wall-less product shot of a single object, painted in flat matte gouache, no background, on pure magenta #FF00FF.

The object: a veil on a pole between two posts, standing at an angle on the floor, drawn back to one side.
The wide sheet in vertical folds is the VEIL; the bar across the top is the POLE; the uprights at the ends
are POSTS standing on the floor; the narrow bundles at the right are the cloth GATHERED where it has been
pulled aside.

Fine bleached linen, cool white with grey shadow in the folds and darker where it doubles in the gathers.
A woven band of dull blue-green along the hem. The posts and pole are dark cedar.

Keep every edge, every proportion and every silhouette exactly as in the reference image — do not move, resize, straighten, add, remove or restyle any part of it, and do not change the angle it stands at. Paint only material and wear.

The shadow at its foot is part of the picture: paint it #3A342C, with no pink and no purple in it at all.

No highlights, no gloss, no rim light, no ground plane, no reflections. Matte throughout, as if lit by one dull lamp. Priest's tomb, Egyptian New Kingdom: dark basalt, natron dust, bronze and cedar. Cool grey-blue stone, nothing gilded.
```

Then, once the return is in `~/Downloads`:

```sh
scaffold hanging --contents=veil --spin=42
yarn import-tile art/masters/props/expert/hanging.webp --tier=expert --name=hanging --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

---

## Pharaoh — four

Wall items and one curtain. Gold is a flat colour at this rank, never a metal — every prompt below says so, because the generator will otherwise return a chrome highlight.

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
scaffold hanging --contents=gold --spin=33
yarn import-tile art/masters/props/master/hanging.webp --tier=master --name=hanging --slot=prop \
  --filter=smooth --mask="$OBJ" --seat="$SHADOW"
```

---

## Gods — five

Four of the five contain a VOID: a black opening that must come back black. His shrine, his niche and his shaft are the same rectangle if their frames are not what tells them apart, so the frame is what each prompt names first.

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
