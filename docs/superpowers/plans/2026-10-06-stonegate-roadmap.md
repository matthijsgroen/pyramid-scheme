# stoneGate: roadmap to a playable lock

> **For agentic workers:** this is the roadmap, not a task list. Each phase gets its own task-by-task plan
> (`2026-10-06-stonegate-phase-<n>-<name>.md`), written just before it runs, against what the earlier
> phases actually built. Execute a phase plan with superpowers:subagent-driven-development.

**Goal:** the designer's lock `src/game/locks/stoneGate.lock` plays end to end on a real pyramid floor
(Djoser, `expert_4`), with painted art for everything the player sees.

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (rules, contract, criteria). Read it with
this roadmap; a phase plan argues from both.

**Placement:** which lock stands on which junior and expert site, and which mechanics each lock combines, is
[`docs/game-design/lock-placement.md`](../../game-design/lock-placement.md).

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
  the hands are empty; `unladen` stands alone on its gate. Every one-way, like the way out, takes only empty
  hands (`leaveWith`).
- **Save.** The arrangement is the mechanism's state, saved in `journey.mechanismStates` like a lever's.
  A stone in hand is saved with it, so there is no new save field.

## Phases

| # | Phase | Ships | Depends on |
| --- | --- | --- | --- |
| 1 | **Stones in the engine** (done; also ships the `stonePlate` realisation and plates left bare with the mod off, pulled forward from phase 3 because the dev bake's toggle-off sweep needs it) | `weights` in the shared `Lock`; compiled to one weights control; plates placed on the carve with the record; `floorLock` walks it; a `.lock` file read at bake; twoStones (no gate loop) baked on the dev floor | — |
| 2 | **Play with stones** (done 2026-10-07, [plan](2026-10-07-stonegate-phase-2-play.md)) | the Lock playground story; "Lift the stone" / "Set the stone on the plate" prompts; plate drawn empty or full (placeholder art); a blocked walk says why (narrow passage, stairs, way out); door shows its plates; explorer `carrying` with frame fallback | 1 |
| 3 | **Narrow passage** (done 2026-10-08, [plan](2026-10-08-stonegate-phase-3-narrow-passage.md)) | a realisation for `unladen` gates (registry beside `oneWayRealisation`), drawn as a narrow passage; every one-way takes empty hands, and `unladen` on a drop or beside another owner is refused | 1 |
| 4 | **Gate loops in the carve** (done 2026-10-09, [plan](2026-10-08-stonegate-phase-4-gate-loops.md)) | `topologyFaults`, `offRouteChains` and the fork seams accept a gated join that closes a loop; stoneGate bakes on the dev floor | 1 |
| 5 | **Art** | painted plate (empty, with stone), narrow passage, torch; explorer carrying frames | runs beside 1–4; wiring needs 2–3 |
| 7 | **Zipline glide** — done 2026-10-06 ([plan](2026-10-06-zipline-glide.md)) | the ride: explorer hidden, a riding sprite slides launch to landing by CSS, behind `PlayTraversal` (`docs/superpowers/specs/2026-10-04-zipline-ride-acceptance.md`); its art is phase 5 task 2. The zipline's own art stays as it is | 5 (art), independent of the stones |
| 6 | **Djoser** | stoneGate on an `expert_4` floor through `floorLocks`; save impact settled | #315 merged, 1–5 |

**Start:** phase 1 begins from `main` after PR #315 (`world/authoring-locks`) is merged, since it changes the
realisation code phase 1 builds on (`degradeUnrealised`, the binding cascade, `floorLocks`).

**Phase plans:** [phase 1, stones in the engine](2026-10-06-stonegate-phase-1-engine.md) · [phase 2, play with stones](2026-10-07-stonegate-phase-2-play.md) · [phase 3, the narrow passage](2026-10-08-stonegate-phase-3-narrow-passage.md) · [phase 4, gate loops in the carve](2026-10-08-stonegate-phase-4-gate-loops.md) · [phase 5, art](2026-10-06-stonegate-phase-5-art.md).

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
- **One nest spot per lock, on a connection** (designer, 2026-10-08): written `a -&> b`, the inner lock's `in`
  at `a` and its `out` at `b`, on any connection without a barrier; a lock nests only there. Phase 4 builds it.

## Open after phase 1

- The §1 refusals "a gate needs more stones than the lock has", "a plate in the region it bars" and "a plate
  where no corridor reaches" do not exist yet; only `plateNamesNoRegion` and `carryWithoutStones` do.
- masonsRamp, counterweight and stoneOnAPlate are not baked on the dev floor and are in no phase yet.

## Open after phase 2

- A barred region (water, sand) owned by a plate does not move under the explorer's weight; doors do.
- A saved key the record lacks is read as `initial` by play and the face (`arrangementIn`), but `openDoorsFor`
  opens nothing from it, so a stale save's stone-held doors stay shut until the first stone move writes a key
  the record has.
- Sequence locks (`tilesInOrder`) do not carve on the playground's bench floor in reasonable time; the
  playground shows "not buildable yet" for them.
- The door face does not tell plates apart (by design: plates are all alike).

## Open after phase 3

- masonsRamp waits for the stone pipe: its chute sends a stone down a drop, and every one-way takes only empty
  hands, so `yarn lock masonsRamp` reports `out` never reached and the lock not solvable. It needs a stone-only
  pipe, a new mechanic designed later; its `.lock` stays as written until then.
- counterweight: `yarn lock counterweight` reports every region reachable, solvable and every piece bearing
  load, with `gallery >> chamber` (the zipline takes empty hands). It has not been baked on a floor.
- A passage on a corner draws `narrowAcross`; there is no corner art.
- The squeeze is drawn in front of the wall, not through it.
- Tapping the wall when the near side is itself a node bypasses that node's offer.

## Open after phase 4

- The lay prunes a branch where a placed region has fewer free sides than corridors still to lay
  (`src/game/layLocks.ts`), only on a plan with a cycle, so tree locks keep their baked layouts. Make it
  unconditional: one lay path, faster for every lock. It moves lock floors already in the world (sluice 15/20
  seeds, plates 16/20), so it comes with a re-bake and a check of what saved per-cell floor state does on a
  moved layout (migrate if needed). Designer: fine either way, as long as it is done.
- Every region stays reachable (designer, 2026-10-08): mechanism state is saved per floor, so a region the
  player could reach and a lock then seals for good can never be revisited, and a hidden corridor in it is lost.
  The walk checks only that every state reaches `out` (`strands`) and that no region is never reached
  (`deadRegions`). Add `lostRegions` beside `deadRegions` (`src/game/lockWalk.ts`): from every reachable state,
  every region ever reached is reachable again, leaving and re-entering at `in` counting as a way back; one
  backward sweep per region over the reachable states. Refused by name in `yarn lock` and the floor walk. Every
  region, not only hosts of side or hidden paths. Measure the catalogue first and show the designer what fails.
- A layout written longhand (no `locks`) still refuses a gate on a loop's second meeting: gate loops are the laid
  carve's (D3); a loop inside one region is fine in every carve.
- The side-chain carve cuts a cycle only at a branch spot from `RECOVERY_ATTEMPT` on; giving it more freedom from
  the first attempt (D5) would move world floors, so it waits for the designer's word on a world reshape.
- masonsRamp, counterweight and stoneOnAPlate are still not on the dev floor.
- The Lock playground carves stoneGate on its bench floor at seed 0, and it walks sound.
- No catalogue lock marks a nest spot yet. `yarn run lock` shows and checks a spot, but cannot say which stone
  case a nesting is; that surfaces in the bake's lock sweep, the floor's refusals and the Lock playground (D16).
- "On its route" for a pass-through lock is its own `regionRoute`; a lock with two equal routes is read on one.
- Two stone locks placed one after the other (not nested) are two weights records, so play could hold a stone of
  each; no floor places two.
- A lock with a one-way on its only route from `in` to `out` does not carve (`layoutNotFound`), even alone, and
  its carve can run synchronously for more than 20 s per seed.

## Open per phase

- **Phase 5:** the torch and the plate need `prim_*` geometry in `scripts/renderProp.py`, then the
  repaint pass (`docs/instructions/prop-pipeline.md`, `docs/instructions/repaint-queue.md`). The explorer
  carrying frames are an edit of the walking sheet (`art/README.md`, "The explorer"). Generating the images
  is done by hand in Gemini.
- **Phase 6:** which `expert_4` pyramid and floor, and its realisations (torch for `activator`, narrow
  passage: `unladen: "narrowPassage"`).
