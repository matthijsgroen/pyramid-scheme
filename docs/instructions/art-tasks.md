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
| junior | ☐     | ☐         | ☐         |
| expert | ☐     | ☐         | ☐         |
| master | ☐     | ☐         | ☐         |
| wizard | ☐     | ☐         | ☐         |

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

## 3. Waiting on one roll — scaffold ready

- **`starter/rubbleSpill`** — `prim_rubbleheap --contents=spill` is modelled and its three renders are in
  `~/tile-previews/rubble-starter*`. The merchant's last file.

## 4. Waiting on a model

Every one of these is a primitive in `renderProp.py` plus one roll. The nobleman's column is the brief's
§2 row, and it is NOT the merchant's object — that mistake cost real work before, so read the row.

| kind                 | rooms | what the nobleman's is                                  |
| -------------------- | ----- | ------------------------------------------------------- |
| `junior/pillar`      | 25    | palm column, painted capital — not a leaning timber prop |
| `junior/chestProp`   | 21    | one sealed chest, wax seals on a cord — not baskets      |
| `junior/shrine`      | 22    | miniature false-door stela with an offering table        |
| `junior/basin`       | 19    | ablution basin, painted rim                              |
| `junior/offeringTable` | 12  | a laid dining table — not a balance and grain            |
| `junior/shelf`       | 9     | linen press, folded sheets, a mirror case                |
| `junior/lamp`        | 8     | bronze lamp stand — not a lamp on a stool                |

`prim_niche` is the pattern to copy: one primitive, `--contents` per rank, so a rank costs a repaint and
not a model. It already covers two ranks.

## 5. Waiting on a scan

Step 0's table sends statues and coffins to a museum scan (Scan the World, Smithsonian Open Access,
Sketchfab, mostly CC0/CC-BY). Reject Roman or Ptolemaic, gilded, or fragments BEFORE downloading.

- `junior/sarcophagus` — 20 rooms, anthropoid wooden coffin, painted face
- `junior/statue` — 8 rooms, ka-statue of the owner, seated

## 6. Flat — a prompt and nothing else

No mesh, no mask; the generation's own silhouette is the tile.

- `junior/tallyBoard` — 5 rooms, estate ledger board, ink columns

## 7. The other three ranks

Expert, master and wizard have no props or wall items painted at all. The biggest single kinds are
`wallShrine` at wizard (129 rooms), `mask` at master (117), `sconce` at master (105) and `wallShrine` at
expert (95). `prim_niche` and `prim_sconce` already exist, so the niche and shrine family is contents
edits rather than new models — the cheapest large block on the board.

`yarn art-census` ranks all of it by rooms waiting.

## 8. Not a tile

- **`breach` and `plug`** are missing from `WallDecorationKind`, so roughly 40 drawn files could not be
  used even if painted today. Two lines each, plus a line in `generateDummyTiles`' own `WALL_KINDS`.
- **The variant resolver** from the brief's §5 — picks `rubble-2.png` by positional hash. Not built, and
  it is what lets a kind have more than one drawing.
- **Patron gods** — designed, not built. A variant selector on `statue`, `shrine`, `wallShrine`, `stela`
  and `mask`; no new kinds, no pool edits, no world regeneration, and art can arrive one file at a time.
