# The art queue

What is left to draw, and what each item is waiting on. **`yarn art-census` is the authority on which
FILES are painted** — it assembles every floor of the generated world and counts rooms, so it cannot go
stale. This list is the other half: the work each gap needs, which a census cannot know.

Three things a census cannot tell you, and this list exists for them:

1. **What the gap is waiting on.** A placeholder needing one roll and a placeholder needing a museum scan
   read identically to a census.
2. **Files that are painted but not to the current standard.** A tile with no master, or a master that is
   a post-processing copy rather than a return, or one still stored at 1x. The census calls all of those
   "art".
3. **Work that is not a tile at all** — a missing kind, a resolver nobody has built.

---

## 1. Re-roll: bring the surfaces to the current standard

Twelve files. They are PAINTED and they look right; what they lack is a master that is a return, which is
what a rebuild line and 2x both depend on. `art/README.md` records why recovering their flags failed —
`--repeat=1` not 2.4, `--flatten` is not a discriminator, `make-seamless` and `--roll` both make it worse,
and `junior-floor.webp` carries an ochre band the shipped tile does not have. The masters are the right
lineage and not the shipped tiles' input, so the route is a re-roll rather than archaeology.

| rank   | floor | wall-face | threshold |
| ------ | ----- | --------- | --------- |
| junior | ✅    | ✅        | ✅        |
| expert | ✅    | ✅        | ✅        |
| master | ☐     | ☐         | ☐         |
| wizard | ☐     | ☐         | ☐         |

**The junior three are the worked example — read their block in `art/rebuild.sh` before rolling another
rank.** What the prompts had to learn, in the order it cost rolls:

1. **Count the features; never mention cells.** "A texture drawn at eight cells across" means nothing to
   a generator and came back at brick scale, needing `--repeat=4.5` — which multiplies every distinctive
   mark four or five times and turned the brief's ochre banding into a lattice. "About sixteen slabs
   across the width, in irregular sizes" came back at eight, needing 1.6.
2. **Forbid strong features outright.** Whatever is distinctive gets repeated. The accent belongs in a
   joint or a worn patch, never as a band.
3. **State the aspect and it is obeyed** — 8:1 for a face and 4:1 for a sill both came back within 1%.
4. **Name what the brief names.** The first face prompt described worn plaster and produced a good tile
   of the wrong thing; the brief wants a procession, and naming the three registers got all three.
5. **A face must measure DARKER than its floor** — junior's is 98 against 156. That difference is where
   the map's depth comes from, so check it every time.
6. **A sill is neither tiled nor repeated**, and it needs `--brightness` in whichever direction the
   ORDERING requires: a sill sits between the floor and the wall in value, or it reads as a hole in the
   paving rather than a step across it. The nobleman's came back too pale and cool (1.28 to lift it into
   warmth); the priest's basalt came back too dark at 94, level with his wall face (1.32 to put it at 124
   between the face's 98 and the floor's 138). The rule is the ordering, not the number.

Each one: roll it, `yarn import-tile` through the per-slot recipe, keep the download as
`art/masters/surfaces/<rank>-<slot>.webp`, add its rebuild line. Then that rank's surfaces are 2x and the
last of the resolution seam closes.

The merchant's five are DONE this way and are the worked example — see his block at the top of
`art/rebuild.sh`, and "How a master is matched back to its return" in `art/README.md` for how his were
identified rather than re-rolled.

## 2. One orphan, deliberately unmatched

`starter/arch` — painted timber, and its return is not in `~/Downloads` under any name. It is not a
variant of the doorway candidates that ARE there: the shipped lintel is a single flat plank where every
candidate has a stepped one with a dark reveal, and it is paler than all of them at any flatten. Left
unmatched because guessing would put a wrong master in the repository, which is worse than a gap. Closing
it means a re-roll, same as §1.

## 3. Painted, but wrong or not to standard

Nothing at the merchant's rank is below standard any more: every tile of his is a return, 2x, masked, on a
rebuild line, and seated in a rendered translucent shadow.

**`starter/statue` is to standard, and the only question left about it is one the DOCS disagree on.** The
shipped tile is a shabti, and:

- `tile-art-brief.md`'s merchant row asks for Bes (dwarf, lion mane, tongue out), Taweret (standing hippo),
  or a ka-statue still half block. A shabti is none of the three.
- `prop-pipeline.md`'s Gate says the opposite in as many words: "a shabti is right for a merchant because
  it is the humblest thing in the catalogue, and wrong for a pharaoh for the same reason."

Both were written deliberately, so this is a decision and not a defect. Nine rooms either way.

Both of its masters are worth knowing apart before anyone re-rolls it:

- `statue-shabti.webp` is the SHIPPED lineage: a repaint over a scaffold rendered from `shabti.stl`, and
  what kept it out of the pipeline for so long was never the geometry. It was the two things the repaint
  added — a soft grey field behind the figure and a painted black shadow at its foot — which `--mask` and
  `--seat` remove by construction. It needed no re-roll at all.
- `statue.webp` is the ON-BRIEF subject and NOT to standard: a half-block ka-statue, prompted at 2048
  square with no scaffold behind it and a painted shadow, so a mask would cut a shape its paint does not
  fill. It is kept as the record of what the brief actually wants here, not as an input to anything.

So the choice is the reader's: leave the shabti and let the Gate's argument stand, or roll one of the
brief's three over geometry. The rank is otherwise finished.

## 3b. A costed choice, not a defect

**`junior/lamp`'s foot is flattened in depth and reads as a skirt rather than a circle lying on the
floor.** `prim_lamp`'s stand has `foot.scale = (1.0, 0.55, 1.0)`, and the reason was real when it was
written: a round foot 0.44 across added 0.31 of drawn height and the stand landed 27 units of 56.

That reason has since expired and nobody noticed. The shaft was shortened in the same session, and
re-measured now the flattening buys FIVE units: 47 against 42. Round, the foot lands wider than the palm
column (37) and level with the basin (40), and it reads correctly — a circle on the floor instead of a cone
seen side-on, which is what the painted return made obvious.

So the change is one line and the cost is one re-roll, because the mask moves. The shipped tile is not
broken and is on a rebuild line; this is a choice about whether the foot is worth a roll, and it is
recorded here rather than made silently.

## 4. Waiting on one roll — scaffold ready

**The prompts for every one of these are written out in [repaint-queue.md](repaint-queue.md)**, with the two attachments each one takes and the import line to run afterwards. This section is the ledger; that file is the work.

Modelled, self-verified in the sheared render, and the three renders are in `~/tile-previews/`. Each needs
one repaint and one `import-tile` line and it is done.

| kind                        | primitive                             | renders                 |
| --------------------------- | ------------------------------------- | ----------------------- |
| `junior/pillar`             | `palm --spin=22`                      | `palm-junior*`          |
| `junior/shrine`             | `falseDoor --spin=6`                  | `falsedoor-junior*`     |
| `junior/chestProp`          | `sealedChest --spin=-27`              | `sealedchest-junior*`   |
| `junior/basin`              | `basin --contents=bowl --spin=14`     | `basin-junior*`         |
| `junior/lamp`               | `lamp --contents=stand --spin=8`      | `lamp-junior*`          |
| `junior/shelf`              | `shelf --contents=linen --spin=5`     | `shelf-junior*`         |
| `junior/offeringTable`      | `market --contents=laid --spin=-16`   | `offeringtable-junior*` |
| `expert/niche`              | `niche --contents=sealed`             | `niche-expert*`         |
| `expert/sconce`             | `sconce --contents=chain`             | `sconce-expert*`        |
| `master/niche`              | `niche --contents=offering`           | `niche-master*`         |
| `master/sconce`             | `sconce --contents=mirror`            | `sconce-master*`        |
| `wizard/niche`              | `niche --contents=star`               | `niche-wizard*`         |
| `wizard/sconce`             | `sconce --contents=crystal`           | `sconce-wizard*`        |
| `expert/wallShrine`         | `wallShrine --contents=ajar`          | `wallshrine-expert*`    |
| `expert/veil`               | `hanging --contents=rail`             | `veil-expert*`          |
| `master/mask`               | `mask`                                | `mask-master*`          |
| `wizard/wallShrine`         | `wallShrine --contents=opening`       | `wallshrine-wizard*`    |
| `wizard/starShaft`          | `starShaft`                           | `starshaft-wizard*`     |
| `junior/hanging`            | `hanging --contents=linen --spin=38`  | `hanging-junior*`       |
| `expert/hanging`            | `hanging --contents=veil --spin=42`   | `hanging-expert*`       |
| `master/hanging`            | `hanging --contents=gold --spin=33`   | `hanging-master*`       |
| `wizard/hanging`            | `hanging --contents=aurora --spin=47` | `hanging-wizard*`       |
| `starter/hanging` ↻         | `hanging --spin=45`                   | `hanging-starter*`      |
| `starter/offeringTable-2` ✚ | `market --contents=baskets`           | —                       |

↻ **`starter/hanging` already ships and is being REDRAWN**, so its `--spin=45` is not in `rebuild.sh` yet:
Step 1b's constraint is that a painted tile's spin cannot change, and set against the existing master the
frontal cloth was cut by a diagonal mask and came out a smear. The flag and the new master go in together.
What the repaint is for: `hanging` is tagged funerary and cosmos in `dressingTags`, so world-gen only puts
it where someone prayed or watched the sky, and the brief's merchant row describes a market awning — the one
object those rooms have no use for. Same cloth, same pole, described as a screening cloth.

✚ **`starter/offeringTable-2` is a VARIANT, not a new kind** — the second drawing of the merchant's trade
room, picked per room by `tileVariants`. Tomb painting shows goods sold out of big reed baskets set on the
floor at least as often as off a table, and both are the same statement, so they share a kind. Modelled as
`market --contents=baskets`; its renders still need generating at the rank's colours. Because it is a
variant and not a pool entry, adding it moves no furniture anywhere.

Every floor prop here carries a `--spin`, which is pipeline Step 1b: a room holds two props now
(`companionProps`) plus its scatter, and square-on they read as a sticker sheet rather than as a place
someone left things in. The angles are small where an object's back belongs to a wall and larger where
nothing anchors it — the step's table gives the ranges. Wall items take none: they are ON the band, at half
shear, with no floor to be askew of.

`wizard/hanging` is the one that imports differently: a curtain of aurora casts nothing, so it has no
shadow render and its line takes no `--seat`. It also wants `--colour-accent` set to the rank's own light —
the whole sheet is `accent`, and left at the default the scaffold goes to the generator in ochre.

All but three of these are one primitive serving several ranks on `--contents`, which is `prim_niche`'s
pattern and is what made the last three ranks' wall items cost renders instead of models. What each rank's
object actually IS still comes from the brief's own row — `palm` against `pillar` and `sealedChest` against
`chest` are different objects in the same slot, and confusing them cost real work once.

## 5. Waiting on a model

Nothing at the first two ranks, and no WALL ITEM anywhere: everything the merchant and the nobleman author
is painted, in §4, or in §6 waiting on a scan, and §4 holds every wall item of the last three ranks.

What is left is the last three ranks' CHAMBER PROPS. The biggest, by rooms: `chestProp` at master (42) and
wizard (35), `jarRack` at master (35), `pit` at expert (33), `statue` at master (29), `pillar` at master
(28), `offeringTable` at master (27) and `crystal` at wizard (27) — which is a kind no earlier rank draws
and the only one here with no primitive to build on. `sarcophagus` and `statue` are §6's business wherever
they appear.

Almost all the rest is `--contents` on a primitive that exists: `prim_niche`, `prim_sconce`, `prim_basin`,
`prim_lamp`, `prim_shelf`, `prim_market`, `prim_hanging`, `prim_wallshrine`, `prim_pit`, `prim_jarrack` and
`prim_rubbleheap` all take it, and `prim_hanging` alone now serves five ranks.

## 6. Waiting on a scan

Step 0's table sends statues and coffins to a museum scan (Scan the World, Smithsonian Open Access,
Sketchfab). Read `prop-pipeline.md`'s **Gate** before downloading anything: reject Roman or Ptolemaic,
gilded, or a fragment, and check the RANK as well as the object.

- `junior/sarcophagus` — 20 rooms, anthropoid wooden coffin, painted face
- `junior/statue` — 8 rooms, ka-statue of the owner, seated

**The merchant's scan is in the repository now**, decimated, with its licence recorded in `CREDITS.md`:
`art/masters/meshes/shabti.glb`, from Scan The World's shabtis of King Senkamanisken, CC BY-NC-SA 4.0.
`rebuild.sh`'s `meshscaffold` reads `$MESHES`, defaulting there, so the statue's line runs anywhere.

**`horus.stl` is REJECTED, not available** — it is the scan the Gate is written about ("A Horus scan
rendered perfectly and suited no rank in the game, because it was Roman"). It sits in
`~/tile-previews/meshes/` as a downloaded reject, and it is not a head start on the master's statue row.
Anyone reading a mesh off that folder should check the Gate first; the folder is a download history, not a
library.

## 7. Flat — a prompt and nothing else

No mesh, no mask; the generation's own silhouette is the tile.

- `junior/tallyBoard` — 5 rooms, estate ledger board, ink columns

## 8. The other three ranks

Every WALL ITEM the last three ranks author is now modelled and sitting in §4 — eleven of them, 940 rooms
between them, each waiting on one repaint. Nothing at these ranks is painted yet.

What is left is their CHAMBER PROPS, which none of the three has started: `yarn art-census` ranks them, and
the biggest are `pit` at expert (33 rooms), `sarcophagus` at expert (26) and `lamp` at expert (21). Most of
them already have a primitive at the merchant's or nobleman's rank, so the cheap route is the one §4 is
full of — `--contents` on what exists rather than a new model. `prim_niche`, `prim_sconce`, `prim_basin`,
`prim_lamp`, `prim_shelf`, `prim_market`, `prim_hanging` and `prim_wallshrine` all take it.

`yarn art-census` ranks all of it by rooms waiting.

## 9. Not a tile

- **`breach` and `plug`** are missing from `WallDecorationKind`, so they cannot be authored or drawn at
  all. Two lines each, plus a line in `generateDummyTiles`' own `WALL_KINDS`. Ten files' worth of art sit
  behind that (two kinds across five ranks) and NONE of it is drawn, so the gate is the kinds and not the
  art. Adding them lengthens the wall-item pools, which is the one edit that reshuffles placement.
- **Patron gods** — designed, and now UNBLOCKED rather than unbuilt: `tileVariants` is the selector they
  needed. A patron is `statue-2.png` beside `statue.png`, and the same for `shrine`, `wallShrine`, `stela`
  and `mask`. No new kinds, no pool edits, no world regeneration, and art can arrive one file at a time.

**Built since this list was written**, and noted because the list claimed otherwise for a while:

- The **variant resolver** is `tileVariants` in `tileAssets.ts`, picking `<name>-2.png` by the cell's own
  position. `starter/offeringTable-2` above is the first thing waiting on it.
- A **second prop per room** is `companionProps.ts`: one more piece of furniture of the SAME purpose, in a
  third of the rooms with space for it. Neither touches world generation — no pool changes length, so no
  floor needs regenerating.
