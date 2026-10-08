# Handover: stoneGate, art and engine

Branch `topology/mechanics` (worktree `portal-zinc`), main merged up to #315. A fresh session can carry on from
here. Read the roadmap first: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md`, then the spec
`docs/superpowers/specs/2026-10-04-stones-acceptance.md`.

## Where things stand

| Phase                          | State                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Stones in the engine         | **Done.** Plan: `docs/superpowers/plans/2026-10-06-stonegate-phase-1-engine.md`.                                                                                        |
| 2 Play with stones             | **Done.** Plan: `docs/superpowers/plans/2026-10-07-stonegate-phase-2-play.md`.                                                                                          |
| 3 Narrow passage               | **Done.** Plan: `docs/superpowers/plans/2026-10-08-stonegate-phase-3-narrow-passage.md`.                                                                                |
| 4 Gate loops and nested stones | **Planned, not run.** Plan: `docs/superpowers/plans/2026-10-08-stonegate-phase-4-gate-loops.md`. It waits for the designer's answers to its "Questions before running". |
| 5 Art                          | **Landed** (see below). The brazier stays as decor.                                                                                                                     |
| 6 Djoser                       | After phase 4: stoneGate on an `expert_4` floor through `floorLocks`; save impact settled.                                                                              |
| 7 Zipline glide                | **Done.** Poses in `src/app/SiteMap/ridePoses.ts`, 200 ms a cell. Story `Topology/Zipline ride`.                                                                        |

Phase 4 covers gate loops in the carve (`topologyFaults`, the fork seams) and the nested-stone rules from the
spec's "Nested locks": a lock that holds no stones lets a stone pass through, a lock nested in a stone lock is
contained, and locks that share stones are walked as one pool.

### Art that landed

- **Plate:** raised, pressed, and pressed with a stone.
- **Torch:** painted, with a lit pool of light and no shadow.
- **Sequence tile:** sandstone with a plain top; the glyph is drawn on it and its colour carries the state.
- **Narrow passage walls:** `narrowAcross` and `narrowAlong`.
- **Explorer squeeze frames:** east and south drawn; north reuses south, west mirrors east.
- **Water texture:** a caustic painting, recoloured at import.

The art plan is `docs/superpowers/plans/2026-10-06-stonegate-phase-5-art.md`. Its subagent-driven ledger (every
dispatch, review, fix round and ruling) is `.superpowers/sdd/2026-10-06-stonegate-phase-5-art/progress.md`.
Trust it, and `git log`, over memory.

## Designer decisions to keep (recorded in the roadmap and the spec)

- **Stones:**
  - a stone is always on a plate or in the hand, and stones have no ids;
  - a plate is written `p plate @r [stone]`, with `-[p]-` and `-[p:empty]-` gates;
  - **the explorer's weight presses a plate** while he stands on it, which teaches weight; it never lets him
    through, and route-finding treats a door held only by his weight as shut;
  - a plate has three looks: raised, pressed, and pressed with a stone.
- **Gate loops are allowed by design** (2026-10-06). Phase 4 makes the carve lay them out.
- **Nested stones:** pass through, contained, shared (spec, "Nested locks", 2026-10-08).
- **Placement is Djoser, `expert_4`** (2026-10-06).
- **One source for a lock:** `src/game/locks/<name>.lock`, read at bake time through `parseLock`. No TypeScript
  copy of stoneGate exists.
- **Contract:** the shared `Lock` gains `weights`; gate owners may name a plate. `unladen` stands alone as the
  narrow passage, and every one-way takes empty hands (designer, 2026-10-08).
- **Every mechanic piece is shared `default` art,** the same at every difficulty, with rank-neutral prompts.
  The brazier stays as decor: the standing torch is distinct enough (2026-10-07).
- **The torch is a standing torch, not the brazier.**
- **The sequence tile is sandstone,** with a plain top; its state is the glyph's colour: dark when not walked,
  light blue in order, red out of order; no tick and no cross.
- **Art method:** a variant (lit, pressed, with a stone) is made as a Gemini EDIT of the painted master, not a
  fresh roll, so the two swap on one cell. Imports are unmasked with `--seat` when the scaffold mask clips the
  paint.
- **No unit tests on authored content.** `yarn lock` checks the locks; tests use made-up locks.
- **Stable world:** without `INCLUDE_DEV=1` the bake stays byte-identical, and saves are migrated, never reset.

## Open questions for the designer

- **Phase 4:** the ten "Questions before running" in its plan (gate loops on laid floors only, `gateBypassed`,
  the crossing's starting side, stoneGate on dev pyramid 12, the edge of a contained lock, shared stones, state
  bounds, which locks join a pool, `yarn lock` and nesting, a dev floor for nested stones).
- **The roadmap's "Open after phase 2" and "Open after phase 3" lists:** barred regions under the explorer's
  weight, stale saves and stone-held doors, sequence locks on the playground bench, masonsRamp's chute (it waits
  for the stone pipe), counterweight on a floor, corner passages, the squeeze drawn in front of the wall, and
  tapping a wall whose near side is a node.
- **`docs/playtest-backlog.md`:** the stoneGate phase 2 and 3 entries, notably the plate icon clipping a door face's
  ring and the explorer looking washed out in the exit's light shaft while carrying.
- **Open art questions:** is the torch's size (waist-high, slim) big enough at map scale? Riding side pose: draw
  the handle end-on? Should depth and light follow north/south rides?
- **`src/mods/puzzleSeeds.verify.ts`:** delete the "nothing else moved" test? It pins authored room counts.

## How to run things

- **Storybook** for judging art and feel: `Topology/Lock playground`, `Topology/NarrowPassage`,
  `Topology/Zipline ride`. Screenshot with `npx playwright screenshot` (the playwright MCP may be down; playwright
  1.61.1 matches the cached browsers).
- **PATH:** put `~/.asdf/shims` first; `/usr/local/bin/node` is broken.
- **Content checks:** `yarn verify-content` is fully green. `yarn lock <name>` checks a lock.
- **Execution:** run phase plans with superpowers:subagent-driven-development. Commit and push freely on this
  branch.
