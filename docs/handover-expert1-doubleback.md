# Handover: the doubleBack on expert_1, and what stands around it

Written 2026-10-04 to pick the work up after a shutdown. Two branches are in flight; this file lives on
`world/expert1-doubleback`.

## Where things stand

### PR #313 — `topology/tiles-and-barriers` — green, ready to merge

T19 (a sequence tile cannot be walked round; the walk forces the step and refuses an order no walk keeps),
T20 (a region barrier is realised from outside as water or sand, through the binding cascade) and T21 (a
barred region is drawn as a cover fading in over two cells from each way in, fading out in a second when
it opens), plus two dev floors to play: **dev pyramid 4, the sluice** (water) and **dev pyramid 10, the
procession** (three pressure plates, cellar → east → west, the cellar reached by the drop). CI green on
both builds. The superseded branches `topology/forced-tile-steps` and `topology/barrier-realisations` are
fully contained in it and can be deleted.

### This branch — `world/expert1-doubleback` — blocked on one decision and one bake

The designer's doubleBack stands on **expert_1 pyramid 4 (the `last`, patron Anubis), floor 0**:

| commit | what |
|---|---|
| `17b25a2f` | a pyramid-level `floorLocks: { [floor]: { locks, realisations } }` puts a lock on one floor of an auto-built pyramid without touching any other content (`.floor(n)` would have switched the pyramid to explicit floors and dropped its wing, side paths, mosaics and stair) |
| `c2fe07d0` | the world solver treats a gate a mechanism on the same floor owns as passable without a key; loot behind it counts only once the floor is reachable; a key gate on that floor still needs its key |
| `2d7f90c7` | the authoring itself, and the **revised mod-off rule** (below) |
| `e94888f2` | the bake's guards (`findUndrawnOneWays`, `findUndrawnHandles`, `findUnbakedSwitchBoards`) see what a lock floor compiles to; the Storybook journey inspector's assemble call is a shared helper with a test over every lock floor |
| `8f645f6e` | `yarn generate-seeds` reads the world the spec builds, not the bake, so seeds can be made before the world is baked |

Verified: the serialized world differs from `main` only by `locks` + `realisations` on that one floor (and
the derived `worldContentHash`) — **no reward, key, section or fragment moved**. The bake's own
`searchCarvePair` finds the floor at its address seed, attempt 0, packing 0.1; the lock walks sound over 68
states with no dead region. The release resets progress, so the reshaped floor needs no save migration.

## What is needed next, in order

1. **Done — levers and ziplines are not tied to difficulty.** Their art lives in `tiles/default/` and
   draws at every rank; `standOneWayDrops`/`standHandles` and the `findUndrawnOneWays`/`findUndrawnHandles`
   guards are gone, since nothing is left undrawn. A north/south drop now carves 1 obstacle cell
   (`oneWayRunCells` in `src/game/carveConstants.ts`), east/west keeps 3; only `expert_1/4/0` and
   `dev_topology/2/0` carve differently, so the bake below must follow it.
2. **The designer bakes**, plain (no `INCLUDE_DEV`), on this branch — back up the local playtest build in
   `src/data/generatedWorld.ts` / `src/data/carveLedger.json` first if it is to be kept:
   ```
   yarn generate-seeds --family=lightbeamSwitch   # expert boards for fork shapes adjacent, opposite, three
   yarn generate-world
   yarn verify-seeds
   ```
   Commit the regenerated `generatedWorld.ts`, `carveLedger.json` and seed data.
3. That turns **`src/data/tierFingerprints.spec.ts` green** — its 5 failures are expected: it hashes the
   BAKED world, while `src/data/tierFingerprints.json` already holds the spec's new expert hash
   `730bd316da87d67b` (`newFamilyIsNoOp.verify.ts` checks the spec side and is green).
4. Run the full gate in a **clean worktree** (see below), open the PR, watch CI.

## Decisions made this session (also in memory)

- **Mechanics are core plug-ins; realisations come from mods.** The five control kinds live in
  `src/game/mechanics/`; handle, torch, lightbeamSwitch, zipline, pressure-plate, water, sand are topology's.
- **Mod off = same carve, bare ground** (revised 2026-10-04, `docs/mods/ARCHITECTURE.md`): a realisation
  missing because its mod is absent leaves a bare node, open gates, an ordinary passage for a drop, plain
  corridor for tiles, plain ground for a barrier. An **unbound** role is still refused by name.
- **Locks first** (`docs/mods/lock-first-carve.md`): a lock floor is laid from its lock outward; the carve
  decides every length; ungated side-path content lands in the lock's corridors, gated ones stay branches.
- **Only a region barrier conceals** what lies past it; an edge gate never does.
- **A tile cannot be walked round**; the puzzle is the walk.

## Known limits and open findings

- A door that loses its mechanism owner (mod off) but also lists floor keys stays shut under `all`
  (`openDoorsFor` treats an unnamed key as a never-yes owner). No floor has that combination today.
- Under `any`, a door owned by a mechanism and a floor key whose chest is behind that same door is
  passable on the mechanism alone — matches play; the solver does not force the chest first.
- `docs/mods/mechanic-contract.md` §7 is behind `src/game/lockAuthoring.ts`: its `oneWays` is an array
  (the type is a record), gates are not named on connections, its appetites (`puzzles/nothing/reward`)
  carve 0 of 60 seeds (fixtures use `free`), and its `plates` sequence example is unsolvable (step 2 sits
  behind the sequence's own door). The designer owns that document.
- A sequence has at most five steps per floor (six glyphs, one taken by the mark).
- The Storybook journey inspector reads the committed bake: the new floor shows there after the bake.
  It assembles with no resolvers, so realisations draw through the registry-less fallbacks.
- Art owed (`docs/instructions/repaint-queue.md`, `art-tasks.md`): the water and sand cover textures, torch
  sprites at every rank, lever and drop art below expert, a pressure-plate sprite.

## Working rules this session paid for

- **Verify against the committed data.** The designer's playtest build sits modified in
  `src/data/`; a suite run there passed while CI failed six tests on #311. Before pushing, run the gate in
  a clean detached worktree with node_modules symlinked (`yarn` refuses there; call
  `node node_modules/typescript/bin/tsc -b`, `node node_modules/vitest/vitest.mjs run`,
  `node node_modules/eslint/bin/eslint.js . --max-warnings 17`,
  `CI=true node node_modules/@betterer/cli/bin/betterer.js --strict`), then `gh pr checks`.
- **Never run `yarn generate-world`** or touch the two data files; the designer bakes.
- **Carve baseline:** the untracked `src/worldGen/carveBaseline.scratch.spec.ts` dumps every floor's cell
  `dirs` to `BASELINE_OUT`; diff before/after any carve change. Serialized-world identity is checked the
  same way with `generateFile(buildConfigs(...))` against a detached worktree at `origin/main`.
- **Watched failing** for every new test, and **a red existing test is a finding** — two "fixes" this
  session were test exclusions hiding real bugs (a switch-door slot collision, a tile carve that depended on
  whether a switch stood); both were reverted and fixed in code.
