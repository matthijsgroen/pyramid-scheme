# stoneGate: roadmap to a playable lock

> **For agentic workers:** this is the roadmap, not a task list. Each phase gets its own task-by-task plan
> (`2026-10-06-stonegate-phase-<n>-<name>.md`), written just before it runs, against what the earlier
> phases actually built. Execute a phase plan with superpowers:subagent-driven-development.

**Goal:** the designer's lock `src/game/locks/stoneGate.lock` plays end to end on a real pyramid floor
(Djoser, `expert_4`), with painted art for everything the player sees.

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (rules, contract, criteria). Read it with
this roadmap; a phase plan argues from both.

## The shape of the solution

The stones are **one mechanism per lock**, built the way a sequence is. Its states are the stone
arrangements: which plates hold a stone, and whether the hand holds one. For example, `P1 P4` and
`P4 + hand` are states. The lock tool already enumerates them (`weightsMechanism` in
`src/game/lockWalkSpec.ts`).

- **Record.** The record is a `MechanismRecord` with `placedOnly: true`. Its transitions are placed at
  the plate cells: a lift and a set-down per arrangement. The record lives on one plate, and every other
  plate points back with `worksMechanism`, as sequence tiles do (`src/game/sequenceTiles.ts`).
- **Pressing a plate.** `pressAt` (`src/game/mechanismDoors.ts`) already picks the move a cell makes from
  the current state, and `floorLock` already walks placed transitions. So the engine's solver needs no new
  code, only the right record.
- **Doors.** `positions` maps each arrangement to the gates it opens: plate gates (weighted or `:empty`)
  and `unladen` gates (any arrangement without `+ hand`). A narrow passage is a door that stands open while
  the hands are empty.
- **Save.** The arrangement is the mechanism's state, saved in `journey.mechanismStates` like a lever's.
  A stone in hand is saved with it, so there is no new save field.

## Phases

| # | Phase | Ships | Depends on |
| --- | --- | --- | --- |
| 1 | **Stones in the engine** | `weights` in the shared `Lock`; compiled to one weights control; plates placed on the carve with the record; `floorLock` walks it; a `.lock` file read at bake; twoStones (no gate loop) baked on the dev floor | — |
| 2 | **Play with stones** | the Lock playground story; "Lift the stone" / "Set the stone on the plate" prompts; plate drawn empty or full (placeholder art); a blocked walk says why (narrow passage, stairs, way out); door shows its plates; explorer `carrying` with frame fallback | 1 |
| 3 | **Narrow passage** | a realisation for `unladen` gates (registry beside `oneWayRealisation`), drawn as a narrow passage; a zipline or narrow passage where a stone could pass is refused | 1 |
| 4 | **Gate loops in the carve** | `topologyFaults`, `offRouteChains` and the fork seams accept a gated join that closes a loop; stoneGate bakes on the dev floor | 1 |
| 5 | **Art** | painted plate (empty, with stone), narrow passage, torch; explorer carrying frames | runs beside 1–4; wiring needs 2–3 |
| 7 | **Zipline glide** | the ride: explorer hidden, a riding sprite slides launch to landing by CSS, behind `PlayTraversal` (`docs/superpowers/specs/2026-10-04-zipline-ride-acceptance.md`); its art is phase 5 task 2. The zipline's own art stays as it is | 5 (art), independent of the stones |
| 6 | **Djoser** | stoneGate on an `expert_4` floor through `floorLocks`; save impact settled | #315 merged, 1–5 |

**Start:** phase 1 begins from `main` after PR #315 (`world/authoring-locks`) is merged, since it changes the
realisation code phase 1 builds on (`degradeUnrealised`, the binding cascade, `floorLocks`).

**Phase plans:** [phase 1, stones in the engine](2026-10-06-stonegate-phase-1-engine.md) · [phase 5, art](2026-10-06-stonegate-phase-5-art.md).

Phases 2, 3 and 4 only need phase 1, so they can run side by side in separate worktrees. Phase 5 starts at
once: the prompts and scaffolds need no code. Each art item is wired in as soon as its phase lands, and
until then the drawing falls back to placeholder art.

## Judged in Storybook

Every mechanic is shown in Storybook, so its art and its feel are judged there before any pyramid gets it.

- **Lock playground** (`Topology/Lock playground`): pick any catalogue lock (`src/game/locks/**/*.lock`,
  loaded with `import.meta.glob(…, { query: "?raw" })` and `parseLock`, which is pure) and its realisations;
  the floor carves and plays with the real navigation, prompts and in-memory save, as
  `sequenceHarness.testing.tsx` already wires them. Built as phase 2's first task. It works at once for
  levers, torches, ziplines and sequences, and each later phase makes its own mechanic playable there.
- **Art staging stories**, one per new piece, in the style of `Lever.stories.tsx`: a plate empty and with a
  stone, the torch unlit and lit, the narrow passage across each direction, all on each rank's floor with the
  explorer for scale. The explorer's carrying frames go in the `Facings` story next to the walking ones.
- **A phase is done when its mechanic can be played in the playground** and its art is staged.

## Decisions taken

- **One source for a lock.** The world spec reads `src/game/locks/<name>.lock` at bake time, through
  `parseLock`. The bake runs in Node (`yarn generate-world`). No TypeScript copy of stoneGate exists.
- **Contract.** The shared `Lock` gains
  `weights?: { plates: Record<id, { in, stone: boolean, opens: { weighted, empty } }> }`. Gate owners may
  name a plate or `unladen`. The `Weights` type moves from `lockNotation.ts` into `lockAuthoring.ts`. The
  designer approved this shape on 2026-10-05.
- **No tests on authored content.** Engine tests use small made-up locks. `yarn lock` checks stoneGate and
  the catalogue.
- **Gate loops are allowed** (designer, 2026-10-06; `docs/mods/floor-topology-design.md`). Phase 4 makes
  the carve lay them out.
- **Placement is Djoser, `expert_4`** (designer, 2026-10-06). It needs `floorLocks` from PR #315 (branch
  `world/authoring-locks`, not merged yet). A shipped floor that changes shape falls under the
  save-migration rules: phase 6 decides between a migration and the world reshape release.

## Open per phase

- **Phase 2:** the wording of the blocked-walk lines (the spec has drafts). Where the message shows: a new
  prompt kind next to `ArrivalPrompt`, since the site map has no "can't go there" message yet.
- **Phase 3:** whether the narrow passage is a cell art on the corridor (like the zipline's run art) or a
  door room.
- **Phase 5:** the torch and the plate need `prim_*` geometry in `scripts/renderProp.py`, then the
  repaint pass (`docs/instructions/prop-pipeline.md`, `docs/instructions/repaint-queue.md`). The explorer
  carrying frames are an edit of the walking sheet (`art/README.md`, "The explorer"). Generating the images
  is done by hand in Gemini.
- **Phase 6:** which `expert_4` pyramid and floor, and its realisations (torch for `activator`, narrow
  passage for `unladen`).
