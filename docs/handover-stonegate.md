# Handover: stoneGate, art and engine

Branch `topology/mechanics` (worktree `portal-zinc`), main merged up to #315. Written 2026-10-06 so a
fresh session can carry on. Read the roadmap first:
`docs/superpowers/plans/2026-10-06-stonegate-roadmap.md`.

## Where things stand

| Phase | State |
| --- | --- |
| 7 Zipline glide | **Done**, approved by the designer. Poses in `src/app/SiteMap/ridePoses.ts`, 200 ms a cell. Story `Topology/Zipline ride`. |
| 5 Art | Explorer carrying (task 1) and riding (task 2) done. Plate, torch and sequence tile are being imported now (see below). Narrow passage (task 5) waits on phase 3. Brazier retirement (task 7) waits on two designer answers. |
| 1 Stones in the engine | Plan written: `docs/superpowers/plans/2026-10-06-stonegate-phase-1-engine.md`. Not started. #315 is merged, so it can start. |
| 2, 3, 4, 6 | Not planned in detail yet. |

The art plan is `docs/superpowers/plans/2026-10-06-stonegate-phase-5-art.md`. Its subagent-driven ledger
(every dispatch, review, fix round and ruling) is
`.superpowers/sdd/2026-10-06-stonegate-phase-5-art/progress.md`. Trust it, and `git log`, over memory.

## In flight at handover

1. **Import agent (task 3b + 4b).** Re-imports the lit torch from `~/Downloads/torch-lit.jpeg`. That
   canvas is 1696×2700, taller than the unlit one's 2528, so the head and collar must land on the unlit
   tile's pixels. It also adds `default/plateDown` from `~/Downloads/Sinking the Stone Slab.jpeg`, and
   replaces `default/plateStone` with `~/Downloads/Limestone Block Painting Edit (1).jpeg`, the stone on the
   pressed plate. The plate story then shows all three looks. It writes
   `.superpowers/sdd/2026-10-06-stonegate-phase-5-art/task-3b-4b-report.md` and commits; it does not push.
   Then: review it, look at `torch-align.png` and `plate-story-2.png`, and push.
2. **Next: task 6, the sequence tile.** Import `~/Downloads/Sandstone Tile Painting Edit.jpeg`, an edit of
   the basalt painting; record the edit route in its queue entry. Then wire it in TDD:
   - `PlateShape` becomes `SequenceTileShape` and `plateLook` becomes `sequenceTileLook`;
   - the painted tile is drawn under the glyph via `tileOrPlaceholder`;
   - the glyph is drawn on the tile's top face in the floor projection, coloured by state: **dark** when
     not walked, **light blue** in order, **red** out of order;
   - **no tick and no cross**.

   Stage it in all three states. The designer approved a fine groove at the edge, provided the glyph stays
   readable.

## Designer decisions to keep (all recorded in the plans and specs)

- **Stones:**
  - a stone is always on a plate or in the hand, and stones have no ids;
  - a plate is written `p plate @r [stone]`, with `-[p]-` and `-[p:empty]-` gates;
  - **the explorer's weight presses a plate** while he stands on it, which teaches weight; it never lets him
    through, and route-finding treats a door held only by his weight as shut;
  - a plate has three looks: raised, pressed, and pressed with a stone.
- **Gate loops are allowed by design.** The carve can't lay them out yet (phase 4).
- **Every mechanic piece is shared `default` art,** the same at every difficulty, with rank-neutral prompts.
  Decor that resembles a mechanic is retired: the brazier, task 7.
- **The torch is a standing torch, not the brazier.**
- **The sequence tile is sandstone,** with a plain top; its state is the glyph's colour.
- **Art method:** a variant (lit, pressed, with a stone) is made as a Gemini EDIT of the painted master, not
  a fresh roll, so the two swap on one cell. Imports are unmasked with `--seat` when the scaffold mask clips
  the paint.
- **No unit tests on authored content.** `yarn lock` checks the locks; tests use made-up locks.
- **Stable world:** without `INCLUDE_DEV=1` the bake stays byte-identical, and saves are migrated, never
  reset.

## Open questions for the designer

- Is the torch's size (waist-high, slim) big enough at map scale?
- Is the plate's size (51.5 units tall, stone about 25 units wide) right?
- Brazier retirement (task 7): what replaces it in each rank's pool, and does its light move or go?
- Riding side pose: draw the handle end-on? Should depth and light follow north/south rides?

## Building overnight (designer's wish: "you can do the building when I sleep if we refine the tasks well")

Phase 1 is the candidate. Before running it unattended:
1. Re-read its plan against the code as it is now. Since it was written, #315 merged (`floorLocks`,
   `degradeUnrealised`) and the weight rule changed. The rule doesn't touch phase 1's walk or solver, as
   the stone spec explains.
2. Settle every guided spot the plan flags: the `carveLockFloor` fixture, the dev seed search, and the
   `Control` switch sites.
3. Run it with superpowers:subagent-driven-development. Commit and push freely on this branch; stop only for
   the four classes the skill names.
