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

**`starter/statue` and `starter/basin` — the last two merchant props outside the pipeline.** Both are
still 56x84 where everything else at that rank is 112x168, both have painted opaque shadows where every
other prop has a translucent rendered one, and neither has a rebuild line. They have masters
(`statue.webp`, `statue-shabti.webp`, `basin-sheet.webp`) but those are prompted returns, never drawn
over a scaffold — so a mask would cut a shape the art does not fill, exactly as it would have for the
market table. Each needs a re-roll over its geometry to join the rest:

- `basin` — a water jar on a three-legged stand. MODELLED: `prim_basin --contents=jar`, renders in
  `~/tile-previews/basin-starter*`, so it is in §4 and needs only the roll.
- `statue` — a Bes figure, and the one prop the pipeline sends to a museum scan. `statue-shabti.webp`
  suggests a shabti scan was already used once; `~/tile-previews/meshes/` is where those live.

Doing these two closes the merchant completely: every tile a return, every tile 2x, every tile on a
rebuild line.

## 4. Waiting on one roll — scaffold ready

Modelled, self-verified in the sheared render, and the three renders are in `~/tile-previews/`. Each needs
one repaint and one `import-tile` line and it is done.

| kind                   | primitive                       | renders                 |
| ---------------------- | ------------------------------- | ----------------------- |
| `starter/rubbleSpill`  | `rubblePile --contents=spill`   | `rubble-starter*`       |
| `starter/basin`        | `basin --contents=jar`          | `basin-starter*`        |
| `junior/pillar`        | `palm`                          | `palm-junior*`          |
| `junior/shrine`        | `falseDoor`                     | `falsedoor-junior*`     |
| `junior/chestProp`     | `sealedChest`                   | `sealedchest-junior*`   |
| `junior/basin`         | `basin --contents=bowl`         | `basin-junior*`         |
| `junior/lamp`          | `lamp --contents=stand`         | `lamp-junior*`          |
| `junior/shelf`         | `shelf --contents=linen`        | `shelf-junior*`         |
| `junior/offeringTable` | `market --contents=laid`        | `offeringtable-junior*` |
| `expert/niche`         | `niche --contents=sealed`       | `niche-expert*`         |
| `expert/sconce`        | `sconce --contents=chain`       | `sconce-expert*`        |
| `master/niche`         | `niche --contents=offering`     | `niche-master*`         |
| `master/sconce`        | `sconce --contents=mirror`      | `sconce-master*`        |
| `wizard/niche`         | `niche --contents=star`         | `niche-wizard*`         |
| `wizard/sconce`        | `sconce --contents=crystal`     | `sconce-wizard*`        |
| `expert/wallShrine`    | `wallShrine --contents=ajar`    | `wallshrine-expert*`    |
| `expert/veil`          | `hanging --contents=rail`       | `veil-expert*`          |
| `master/mask`          | `mask`                          | `mask-master*`          |
| `wizard/wallShrine`    | `wallShrine --contents=opening` | `wallshrine-wizard*`    |
| `wizard/starShaft`     | `starShaft`                     | `starshaft-wizard*`     |
| `junior/hanging`       | `hanging --contents=linen`      | `hanging-junior*`       |
| `expert/hanging`       | `hanging --contents=veil`       | `hanging-expert*`       |
| `master/hanging`       | `hanging --contents=gold`       | `hanging-master*`       |
| `wizard/hanging`       | `hanging --contents=aurora`     | `hanging-wizard*`       |

`starter/rubbleSpill` and `starter/basin` are the merchant's last two files, and `basin` also closes §3's
first bullet.

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
Sketchfab, mostly CC0/CC-BY). Reject Roman or Ptolemaic, gilded, or fragments BEFORE downloading.

- `junior/sarcophagus` — 20 rooms, anthropoid wooden coffin, painted face
- `junior/statue` — 8 rooms, ka-statue of the owner, seated

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

- **`breach` and `plug`** are missing from `WallDecorationKind`, so roughly 40 drawn files could not be
  used even if painted today. Two lines each, plus a line in `generateDummyTiles`' own `WALL_KINDS`.
- **The variant resolver** from the brief's §5 — picks `rubble-2.png` by positional hash. Not built, and
  it is what lets a kind have more than one drawing.
- **Patron gods** — designed, not built. A variant selector on `statue`, `shrine`, `wallShrine`, `stela`
  and `mask`; no new kinds, no pool edits, no world regeneration, and art can arrive one file at a time.
