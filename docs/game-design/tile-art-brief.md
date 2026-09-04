# Tile Art Brief — every piece the site map can draw

The commission list. `spritesheet-renderer-prep.md` says how the renderer works and why; this says **what to
draw**, one line per file, named specifically enough to hand over: which god the statue is, what the rubble is
rubble _of_.

Five ranks, and a rank is **whose tomb this is** — merchant, nobleman, priest, pharaoh, the gods
(`journeys.md` §4–§8 names them). A kind is a **silhouette**; the rank is its skin. That is what keeps the
fifth rank from costing as much to draw as the first.

## The contract

| Slot           | File                         | Size    | Anchor                                                                |
| -------------- | ---------------------------- | ------- | --------------------------------------------------------------------- |
| Floor megatile | `tiles/<rank>/floor.png`     | 448×448 | tiles both ways, world-aligned. `yarn make-seamless`                  |
| Wall face      | `tiles/<rank>/wall-face.png` | 448×56  | tiles horizontally only; **shown at 448×28** — see below              |
| Threshold sill | `tiles/<rank>/threshold.png` | 56×12   | laid across the way through, at a rank seam                           |
| Archway        | `tiles/<rank>/arch.png`      | 84×56   | middle transparent; jambs in the outer 14px each side                 |
| Chamber prop   | `tiles/<rank>/<kind>.png`    | 56×84   | **bottom-anchored**; the top 28 is headroom, used only by tall things |
| Wall item      | `tiles/<rank>/<kind>.png`    | 56×28   | painted on the face band                                              |
| Floor scatter  | `tiles/<rank>/<kind>.png`    | 56×56   | flat on the floor, soft-edged (**needs building** — §5)               |
| Shared         | `tiles/default/<name>.png`   | varies  | not a rank: the explorer, the scarab                                  |

**A face is the one slot whose file is not the shape it is seen at.** The renderer draws a 448×56 face
into a band `WALL_H` = 28 tall, so art drawn at 8:1 arrives on screen at 16:1 and every sign, brick and
figure on it is twice as wide as it should be. Draw it at 8:1 anyway — a model handles that aspect and not
16:1 — and import with `--repeat=2`, which on a face lays the art down twice ACROSS only. The file then
holds art at twice its final width, and the renderer's squash puts it right.

**The sizes above are MAP UNITS, not pixels.** A cell is 56 units; a painted file is drawn far larger and
`import-tile` resizes it into the slot. Everything else in the table — which slot,
which anchor, what has to tile — holds whatever the art turns out to be.

Fixed regardless of style: transparent background, an outline where a shape meets the floor and a contact
shadow under anything standing (that is what makes an object sit ON the ground in a top-down view, in any
medium), and the megatiles tiling. A missing file falls back to `default/`, then to a placeholder glyph — so
this list can land one file at a time and nothing breaks while it is half-drawn.

## The camera — one angle for the whole set

Every file is drawn from the SAME viewpoint, and the renderer pins it. A side wall seen edge-on is
`SIDE_W` = 14 units thick, and the strip of its top surface that shows above a face is `FACE_TOP` = 7. The
same 14 units of depth images as 7 going away from the viewer, so:

```
cos θ = 7 / 14 = 0.5   →   θ ≈ 60° off vertical, i.e. 30° above the floor
```

A fairly LOW camera, not a steep one. What follows from it:

- **Depth going away from you images at half its true size** (`cos 60°`). A surface facing UP — a floor, the
  top of a wall, the top of a beam, the lid of a chest — is squashed to half its depth, but keeps its full
  width.
- **Height images at nearly full size** (`sin 60°` ≈ 0.87). A surface facing the viewer is barely
  foreshortened.
- **So a square-section timber shows a top face about 0.58 as deep as its front is tall** — a visible band,
  not a sliver, and not a dominant plane either. That ratio is the single number to check a drawing
  against; a generated archway measured 0.28 and read as though seen from standing height.
- **Everything with height still shows its top.** Its absence is what makes a wall look like a painted line
  and an archway like a sticker.
- **There are exactly TWO planes in this world: facing the viewer, and facing up.** There is no third.
  A side wall is a flat strip with no face of its own, so nothing may show a left or right side, turn away,
  or be seen at an angle — every edge is horizontal or vertical. A block is two stacked rectangles: an
  up-facing band on top, a viewer-facing rectangle below. An archway drawn with a shaded inner reveal broke
  this, and read as wrong against its own wall while measuring correctly.
- **Never draw a surface the geometry hides.** A post's top is under the beam resting on it; asked for one
  anyway, a generator invents a capital to justify it.
- **Verticals stay vertical, horizontals stay horizontal.** An orthographic squash, never a vanishing
  point. Nothing is drawn from behind or three-quarter: one camera, or a room of objects disagrees with
  itself.

An earlier draft of this section said 25° off vertical, derived by assuming a wall is exactly one cell
tall. Nothing says that, and the assumption asked for arches seven times more top-down than the wall the
same document had already accepted.

## Writing a prompt — the rules a generation keeps breaking

Every one of these cost at least one roll. They are here, in the brief, rather than in a handover,
because this is the document open when a prompt is written.

**Draw a thing as an OBJECT when the slot holds an object.** The merchant's arch took eight rolls, and the
turn came when it stopped being "a doorway in a wall" and became "a wooden frame alone on magenta". A wall
drawn around the subject is a wall whose proportions the model picks, and it picked jambs a third of the
frame every time when a sixth was asked for. There is no wall in a doorway's picture.

**A reference image carries LAYOUT as strongly as it carries colour, and words do not beat it.** A
nobleman's arch given the nobleman's WALL as a style reference — with "do not copy its layout" written in
the prompt — came back as an 8:1 strip of wall with a doorway in it. Reference the thing whose SHAPE you
want (the previous rank's arch, for an arch) and override the material in words: material is the part a
reference gives up more easily. Say what the attachment is FOR, inside the prompt.

**A number a model cannot see is not an instruction.** "Slabs roughly 64x32 pixels" and "jambs a sixth of
the frame" were both ignored, repeatedly. Ask for COUNTS and for fractions of something visible in the
drawing — "exactly 7 slabs across", "the top face is the upper third of the block". Fix the rest at import
(`--repeat`, the arch's slot fitting), which is deterministic where a prompt is not.

**Ask for the camera as a ROTATION with a fraction, not as an angle.** Every abstract phrasing has
lost: "30 degrees above the floor", "orthographic", "depth squashed to half" all came back as
three-quarter perspective, on arches and on props alike. What works is telling the model to rotate the
object and saying how much of it that should reveal: _rotate this object towards the camera over the
horizontal axis, so that the TOP of it shows as about one third of the object's height and the front as
the other two thirds._ One third is this camera — a square-section timber shows a top face 0.58 as deep
as its front is tall, so top over total is 0.58 / 1.58. Asking for two thirds gives a view looking DOWN
into the object, which no wall in this set agrees with.

**The rotation line does not carry orthographic on its own — say PARALLEL as something measurable.**
Asked to rotate, a model rotates in perspective: the rack's uprights converged and its top narrowed
toward the back. Two statements fix it, and both can be checked while drawing: _the object is exactly as
wide at the top as at the bottom — measure across the top edge and across the bottom edge and the two
numbers are the same_, and _a top face is a rectangle, not a trapezoid: its far edge is exactly as long
as its near edge and as the front face below it_. Those go WITH the rotation, never instead of it.

**Check a proportion at SLOT size before writing it.** "The cornice takes the top fifth, and its top face
is part of that" is five pixels in a 49-tall sprite: the model drew it and nobody could see it. The
merchant's working arch made its beam two fifths of the frame and the top face a third of THAT. Do the
arithmetic down to the slot.

**Proportions belong to the OBJECT, not the canvas.** The import trims to the drawn thing, so the frame's
own aspect is what reaches the slot — a 2:1 canvas with a margin gives a frame that is not 2:1. State the
ratio as measured from the outer edge of one part to the other.

**Never ask for a surface the geometry hides.** A post's top is under the beam resting on it. Asked for one
anyway, a generator invents a capital to justify it.

**Anything crossing the whole frame tiles into wallpaper.** A floor with one corner-to-corner crack repeats
that crack in every cell; a nobleman's ochre band across the paving became a red stripe every eight cells.
Only a wall's cap, base and dado may cross, because a face tiles in one direction and those bands are what
register it.

**Detail below the slot's resolution is wasted.** At 40×70 a compass, vest pockets and the X on a map are
all gone. Simplify rather than embellish.

**The value clamp is the first thing dropped, and an outline instruction is what undoes it.** Asked to
outline, a model draws cel-shaded line art, and line art is all contrast. Say NO OUTLINES, and say what the
palette's two ends are.

**`--flatten` is a corrective, not a step in the recipe.** The merchant's wall needed 0.6 because it
arrived at median 129 against a target of 66. The nobleman's arrived at 104 against 111, and flattening it
out of habit pulled its cap and base away from spec and washed its frieze. Import at 0; reach for flatten
only when the numbers say the roll missed.

## The style

**Painted, generated well above map size and scaled down.** Settled on the merchant floor: an image model
draws at 2000² and `import-tile` resizes into the slot, so a file's own resolution stopped being a
question — only the map units below matter. `ART_IMAGE_RENDERING` is `"auto"` to suit it, and
`useMapZoom` keeps its smooth continuous zoom, which is what a painted set wanted anyway.

What painted means for a drawing, and every one of these was learned by measuring a failure:

- **No outlines on a surface.** Matte, soft brush texture, grit; an edge is a change of value, never a
  stroke. Asking a model to outline is asking it for cel-shaded line art, and line art is all contrast.
  Objects keep the soft darker edge and contact shadow that seat them on the floor — that is not an ink line.
- **A floor is background.** It sits behind the props and the explorer rather than competing. The merchant
  floor measures a p5–p95 luminance spread of 19, inside the palette's own slab band, nothing outside
  either end. Detail survives at 1:1 and disappears when the map is zoomed out; that is the target.
- **The palette is a clamp, not a suggestion.** Nothing lighter than the lightest object colour, nothing
  darker than the mortar. `yarn tile-stats` measures both ends and the hue drift before a file is imported.
- **Scale is fixed at import, not in the prompt.** A model cannot see the grid it draws at.
  `import-tile --repeat` shrinks and re-tiles; `--flatten` blends toward the rank's slab colour. The
  merchant floor came in at `--repeat=2.4 --flatten=0.65`.

**Variants**: `rubble.png`, `rubble-2.png`, `rubble-3.png`. Same kind, different drawing, picked per cell.
(**Needs building** — §5.)

## Colour, before the art

The merchant palette was settled with `yarn generate-dummy-tiles --palettes` (see the prep doc's tools) and
is **dark grey-brown** — a cellar of mudbrick and limestone chips lit by the stair and a wick, not a gallery
of pale dressed stone. The pale cool grey the placeholders wore was measurably the worst of the candidates:
the gold click marker sat at 1.78 contrast against its floor where the chosen one gives 4.31, and props
separated from the ground at 1.29 against 2.08.

Two constraints came out of that test and hold for the other four ranks:

- **A rank must not out-brown the rank above it.** Junior is dressed sandstone with ochre paint, so it has
  to read as the step UP in wealth; the mudbrick candidate lost partly for being more ochre than junior.
- **Value separation, not hue separation.** Floor against wall face, floor against wall mass, floor against
  outline, floor against prop, floor against the marker — the table prints all five, and a candidate that
  goes below what already ships is flagged. Hue is taste; those numbers are not.

Run it before drawing a rank, not after.

## 1. Surfaces — 4 per rank

| Rank         | Floor megatile                                                                               | Wall face                                                                                            | Sill                       | Arch                                             |
| ------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| **merchant** | trodden earth over limestone chips, spilled grain, jar rings, tally scratches                | mudbrick courses, flaking whitewash, tally marks, merchant seals, peg holes, awning brackets         | a worn mudbrick step       | timber lintel on mudbrick jambs, whitewash gone  |
| **nobleman** | dressed limestone slabs, ochre banding painted on, plaster patched at the joints             | full plaster, procession murals (banquet, hunt, granary), painted dado band                          | dressed limestone, painted | plastered jambs, painted lintel, a small cornice |
| **priest**   | dark basalt paving, natron dust, a water channel along one side, hollows worn at thresholds  | sunk-relief hieroglyph columns, mud-brick plugs with cord seals, censer soot, a star band at ceiling | basalt, hollowed by feet   | granite jambs, cavetto cornice, sunk-relief text |
| **pharaoh**  | black granite with faience inlay bands, alabaster panels, gold leaf in the joints            | gilded panels, cartouche friezes, electrum banding, faience tile registers                           | alabaster, gold-lined      | gilded pylon gate, winged disc over the lintel   |
| **gods**     | polished calcite lit from beneath, star-field inlay, seams stopping mid-slab, no dust at all | seamless ashlar, no tool marks, inlaid constellations, light leaking from the joints                 | a line of light            | an opening with no visible structure holding it  |

Both megatiles must survive being **cut by a wall at any offset** — masonry, veins, cracks, stains, courses,
inscription bands are all safe; anything with an outline the player expects whole is not, and belongs in §2–§5.

## 2. Chamber props — 16 kinds × 5 ranks

One per claimed room cell, drawn standing on the floor. **A `·` means the rank's pool does not author it** —
but draw it anyway if cheap: a pocket authored at one rank can sit inside a site of another, and two of those
exist in the world today, so `starter/sarcophagus.png` really can be asked for.

| Kind              | merchant                                                                                           | nobleman                                                                                           | priest                                                                                                       | pharaoh                                                                                 | the gods                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **statue**        | **Bes** — dwarf, lion mane, tongue out; **Taweret** — standing hippo; a ka-statue still half block | painted limestone **ka-statue of the owner**, seated, kilt and wig; **Hathor**, cow horns and disc | **Anubis** recumbent jackal on a naos; **Thoth** ibis-headed with palette; **Sekhmet** lioness with sun disc | gilded **Osiris** colossus, crook and flail, atef crown; **Horus** falcon, double crown | **Ra-Horakhty** falcon with disc; **Nut** arched and star-covered; **Ma'at** with her feather |
| **shrine**        | goods niche with a Bes figure and a lamp                                                           | miniature false-door stela with an offering table before it                                        | **naos, doors shut**, cord-sealed                                                                            | gilded shrine, Anubis couchant on the lid                                               | **a window on the cosmos** — night sky inside                                                 |
| **sarcophagus**   | · plain wooden coffin, undecorated, propped upright                                                | anthropoid wooden coffin, painted face, yellow ground                                              | priest's coffin, corded, crossed arms                                                                        | gold-inlaid stone, lid ajar, cartouche band                                             | open, empty, radiant                                                                          |
| **jarRack**       | **wine and oil amphorae**, mud-stoppered, wooden rack, ink dockets                                 | estate jars labelled by year and vineyard, one tipped                                              | **four canopic jars** — Imsety human, Hapi baboon, Duamutef jackal, Qebehsenuef falcon                       | sealed gold vessels, alabaster ointment jars                                            | vessels holding nothing                                                                       |
| **offeringTable** | market table, balance scales, weights, a heap of grain                                             | dining table laid: bread cones, roast duck, figs, a wine jar                                       | **altar** with a libation channel cut in it, bread and incense                                               | tribute laid in state on a gilded table                                                 | a slab with no supports, offerings hovering                                                   |
| **basin**         | water jar on a wooden stand, dipper cup                                                            | ablution basin, painted rim                                                                        | **sacred pool**, steps down into it, natron crust at the waterline                                           | libation basin, alabaster, gold rim                                                     | pool with stars in it, no bottom                                                              |
| **shelf**         | mudbrick shelving: linen bundles, sealed jars, a tally ostracon leaning                            | linen press, folded sheets, a mirror case, paired sandals                                          | **papyrus rolls** in a cedar rack, ends clay-sealed, one unrolled                                            | tribute shelf: gold vessels, lapis inlay boxes                                          | ledge of grown calcite, things resting on nothing                                             |
| **chestProp**     | reed baskets and a rope-handled crate, stoppered jars on top                                       | sealed chest, wax seals on a knotted cord, painted panels                                          | relic box, cedar, seal intact                                                                                | gilded chest, cavetto lid, inlaid cartouche                                             | reliquary of light                                                                            |
| **lamp**          | single-wick pottery lamp on a stool                                                                | bronze lamp stand, shallow oil bowl                                                                | **tall oil-fed stand**, papyrus-column shaft                                                                 | gilded lamp tree, several wicks, alabaster shades                                       | lights with nothing holding them                                                              |
| **hanging**       | patched awning cloth on a pole                                                                     | linen hanging, dyed border                                                                         | **veil before the shrine**, folded back on one side                                                          | gold-shot curtain, weighted hem                                                         | a curtain of aurora                                                                           |
| **pillar**        | timber prop holding the roof, wedges at its foot                                                   | palm column, painted capital                                                                       | papyrus-bundle column, sunk relief on the shaft                                                              | gilded column, cartouche band, faience inlay                                            | column of light                                                                               |
| **brazier**       | cold ash in a clay dish                                                                            | lit and smoking on an iron tripod                                                                  | **censer on a chain**, incense smoke                                                                         | gold, burning low, hieroglyph frieze                                                    | cold light, no flame                                                                          |
| **rubble**        | mortar spill, broken mudbrick, potsherds                                                           | plaster fall, painted fragments face-up                                                            | collapsed door plug, cord-seal fragments, natron crust                                                       | shattered alabaster, gold-leaf flakes in the dust                                       | stone shattered from within, edges still lit                                                  |
| **pit**           | cellar shaft, rope ladder over the lip                                                             | · lifted floor slab, dark below                                                                    | robbed-out hole, broken lid slab beside it                                                                   | · shaft with its seal broken off                                                        | a shaft with no bottom, stars in it                                                           |
| **mat**           | reed matting, frayed, one corner curled                                                            | reed mat, dyed border                                                                              | rush mat before the altar, worn through in the middle                                                        | · gold-threaded mat                                                                     | · a mat of woven light                                                                        |
| **crystal**       | · calcite lump part-cut from the wall                                                              | ·                                                                                                  | natron and quartz crust in a cut                                                                             | ·                                                                                       | **calcite cluster lit from inside**                                                           |

## 3. Wall items — 8 kinds × 5 ranks, plus the two holes

Painted into the face band above a cell — bounded things that hang **on** a wall.

| Kind           | merchant                                                 | nobleman                                        | priest                                                | pharaoh                                           | the gods                                          |
| -------------- | -------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| **niche**      | **goods niche** — jars and bundles on a mud shelf        | lamp niche, soot fanning above it               | wall shrine niche, cord-sealed doors                  | **offering niche**, gilded surround               | a niche holding one star                          |
| **stela**      | rough limestone slab, a name scratched on it             | **false-door stela**, painted, offering formula | sunk-relief: the dead before Osiris                   | granite, cartouches, gold leaf in the cuts        | a stela of light with nothing written on it       |
| **sconce**     | peg with a lamp hung on it                               | bronze bracket and oil lamp                     | **hanging lamp on a chain**                           | **bronze mirror sconce**, disc catching the flame | crystal bracket, light with no lamp               |
| **veil**       | sacking hung on a cord                                   | linen drape on a rail                           | **veil rail and veil** before the shrine              | gold-shot drape, weighted                         | aurora on a rail                                  |
| **wallShrine** | mud niche with a Bes amulet                              | painted shrine box                              | **wall shrine**, doors ajar, lamp lit inside          | gilded shrine, winged disc above                  | a shrine that is only an opening                  |
| **tallyBoard** | **tally board** — scratched strokes, a plank on two pegs | estate ledger board, ink columns                | ostracon board, hieratic in red and black             | inventory in gold on a black panel                | a board of moving figures                         |
| **mask**       | plaster face-cast, unpainted                             | painted cartonnage face                         | jackal-headed ritual mask on a peg                    | **gilded mask**, lapis stripes                    | a face of light                                   |
| **starShaft**  | ·                                                        | ·                                               | slot in the ceiling with a star band round it         | ·                                                 | **star shaft** — a slot on the night, stars in it |
| **breach** ⭑   | robbers' hole punched through mudbrick, plaster fallen   | plaster hacked through, mural cut in half       | **plug removed**, cord seal hanging, dark void behind | pried-off inlay, sockets left in the gold         | a crack with light coming through it              |
| **plug** ⭑     | mud-brick fill, hand-smoothed                            | plastered-over doorway, outline showing         | **mud-brick plug, cord seal intact**                  | granite blocking stone, half-lowered              | an opening that closed itself                     |

⭑ = new kind, no code change needed — `WallDecorationKind` takes them and the pools author them.

## 4. Floor scatter — what is lying about

**This is the group that has no home yet** (§5). Props stand one per room; scatter is small stuff strewn
where the player walks, corridors included, several to a floor.

| Kind         | What it is                         | merchant                                        | nobleman                                 | priest                                | pharaoh                               | the gods                         |
| ------------ | ---------------------------------- | ----------------------------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------------- | -------------------------------- |
| **sand**     | a drift blown in                   | fan of sand through a breach, footprint-scuffed | sand over a threshold, swept to one side | sand and natron crust in a corner     | fine sand in the joints of the paving | no sand at all — a clean seam    |
| **planks**   | timber left behind                 | sledge runners, a broken ladder, rope coil      | scaffold poles, lashings still knotted   | coffin trestles, a snapped pole       | gilded prop, split                    | ·                                |
| **sherds**   | pottery broken where it fell       | jar smashed, mud stopper rolled aside           | wine cup shattered, a stain under it     | broken canopic lid, seal fragments    | alabaster splinters, gold flakes      | glass that fell without breaking |
| **plunder**  | a robbery, mid-act                 | basket tipped, contents gone                    | shabti box smashed, figures spilled      | mummy wrappings pulled out and heaped | pried chest, lid split, inlay sockets | an emptiness with a shape        |
| **stain**    | something spilled long ago         | oil pooled and dried black                      | wine, sunk into plaster                  | resin and natron, crusted white       | scorch under a lamp tree              | a spill of light                 |
| **tilework** | a patch of the floor that is finer | one salvaged tile set into the earth            | ochre band painted across the slabs      | faience panel, tiles missing from it  | inlay panel, lapis and gold, complete | star-field inlay, still moving   |

## 5. What has to be built for §3–§4

| Needed for                | Change                                                                                                                                                | Size   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `breach`, `plug` (§3)     | two names in `WallDecorationKind`, two entries per rank pool                                                                                          | tiny   |
| Variants (`rubble-2.png`) | resolve `<kind>-N` from the asset glob, pick per cell by the same positional hash the props use — the prep doc already sketches it                    | small  |
| Floor scatter (§4)        | a scatter layer: N per floor, deterministic cells, drawn over the floor and under props; needs its own pool field (`scatter`) or a fixed per-rank set | medium |
| Statues by name           | nothing — three statue variants per rank is exactly what the variant pick above is for                                                                | —      |

## 6a. The prompts

The merchant rank's 23 prompts are written out in
[starter-art-prompts.md](starter-art-prompts.md), with the palette, the view, the aspect per slot and the
import command. Generate the floor first and reuse it as a reference image, or 23 files come out of 23
different tombs.

## 6. Counts, and what to draw first

| Group                                                      | Files    |
| ---------------------------------------------------------- | -------- |
| Surfaces (§1)                                              | 20       |
| Chamber props (§2), all ranks × all kinds                  | 80       |
| Wall items (§3), 8 existing kinds                          | 40       |
| The two holes (§3)                                         | 10       |
| Floor scatter (§4)                                         | 30       |
| Variants — statue ×3, rubble/sherds/sand ×3 each, per rank | ~40      |
| Shared: explorer ×3, scarab                                | 4        |
| **Total**                                                  | **~224** |

Today **123 placeholder files** exist for the slots that already resolve, all generated
(`yarn generate-dummy-tiles`), all deliberately crude.

**Draw the merchant first, end to end** — it is the rank the player meets, and it is the shortest way to find
out whether the whole idiom holds: 4 surfaces + 15 props + 4 wall items + 6 scatter = **29 files**. Everything
else in this document is that same list four more times, with better stone.
