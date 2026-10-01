# The bake finds the seed, the runtime carves once — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** a floor's carve seed is searched at BAKE time and written into the authored world, so the runtime carves once, deterministically, with no search and no widening ladder.

**The owner's framing:** *"With all the new criteria we introduce on a map with the locks, carving a map becomes a challenge — just as generating the puzzles. Maybe the map should have a fixed seed, that we can pre-generate when we bake the world."*

It is the `puzzleSeeds` model applied to floors, and for the same reason: **finding a good one is expensive, verifying one is cheap.** A carve plus `floorLock` plus `walkLock` is ~60 ms — nothing at bake time, unacceptable per door on a phone.

## What is already built, measured 2026-09-30

- **The bake already assembles all 206 shipped floors at their real runtime seeds** and fails the build on any that will not carve (`scripts/generateWorld.ts`, `assembleOnce` around :106-131, the refusal around :218-225). `worldFloorAssembly.spec.ts` holds the same line against the committed artifact.
- **`findStrandingLocks` (`validate.ts:306`) and `findDeadRegions` (`:345`) already carve every floor and run `floorLock` + `walkLock`.** Their inner loop IS the search, missing only the loop around it.
- **Cost:** all 206 floors carve in **1.83 s** (mean 8.9 ms, median 0.7 ms, p95 36.7 ms). `floorLock` + `walkLock` over all 206: **18 ms total**. `yarn validate-world` is 7.5 s today.
- **A seed is a far better dial than `packing`:** at the dev `doubleBack` floor, sweeping seeds costs **60 ms per try with ~15% sound**, against `packing` at **886 ms per try**. Expected search ≈ **7 tries, ~0.4 s** for the hardest floor.
- **Saves do not care.** Carve identity reaches saves through authoring addresses and slots, never through the carve. A changed seed is the *"moves the walls, costs nothing"* category — the same as `packing` (`docs/game-design/world-spec-stability.md`).

## The catch that shapes the design

**The runtime does not search across seeds — but it does search across ATTEMPTS.** `assembleFloor` runs up to `ASSEMBLY_ATTEMPTS = 60` (`siteAssembler.ts:364`, loop at :1148), widening the grid every 4 attempts and **doubling `packing` every 8**, with a further resize from attempt 30.

So **a floor that needs attempt 8 or later does not carve at its authored `packing` at all.** The code's own comment says the slowest shipped floor needed attempt 37. The authored value is not what produced the map.

**Therefore the search must find a seed that carves soundly on ATTEMPT 0.** Baking a seed while leaving the ladder in place reproduces today's instability with extra ceremony. Getting attempt 0 to succeed is what makes the authored `packing` real and the ladder dead weight.

**When all 60 attempts fail**, `assembleFloor` returns `{ success: false }`, `useAssembledFloor` yields a null grid, and `SiteMapScreen` renders *"Site layout unavailable."* — permanently, identically, for every player, because the carve is deterministic. That is the failure this removes.

## Global Constraints

- `yarn check-types` is the truth. **IDE diagnostics here have been wrong on EVERY occasion.**
- `yarn eslint <paths>` only. **NEVER `yarn lint --fix`.**
- **NEVER `git add`/`commit`/`stash`/`checkout`.** The controlling session commits.
- **NEVER `pkill`/`killall`.** If you start nothing, kill nothing.
- **NEVER `yarn generate-world` or `INCLUDE_DEV=1 yarn generate-world`** — except where a task explicitly says to, and then only after saying so. `validate-world` is safe with the flag.
- **CARVE BASELINE on every task.** Until a task deliberately stamps seeds, the diff must be EMPTY.
- `src/game/` is the domain layer: no React, no `src/app/`.
- Comments state CURRENT state and why, never history.
- **Tests assert EVERY element of a collection.**
- **Every refusal is watched failing**, red output quoted.

**THE RULE:** the builder may refuse, but it may never decide quietly.

---

### Task 1: A floor may be told its seed

`FloorConfig` gains `seed?: number`. **Read it inside `assembleFloor`** (`config.seed ?? seed`, near the `packing` read at `siteAssembler.ts:1046`) rather than at the call sites: `compassScanner.ts:95`, `stairTravel.ts:29` and `reachability.ts`'s `defaultSeedFor` each re-derive the seed formula by hand, and overriding at call sites would leave them drifting from the runtime.

The serializer is type-exhaustive over `keyof Required<FloorConfig>`, so a new field fails the build until an emitter exists — nothing can be baked and silently dropped. **Add `seed` to the tier fingerprints' excluded keys** (beside `FAMILY_RECORD_KEYS` in `src/data/tierFingerprints.ts`), or every re-pin will read as tier drift.

**Verify:** a floor with an authored seed carves at it, from every entry point — the runtime hook, stair travel, the compass scanner and the bake. Carve baseline EMPTY, since nothing authors a seed yet.

---

### Task 2: The bake searches, and demands attempt 0

Wrap `assembleOnce` with a search: for offsets 0..N, stamp `seed = base + d` and keep the first that **carves on attempt 0** and satisfies every criterion already checked — it carves, `walkLock` says sound, `deadRegions` is silent, and (once the carve-versus-authoring check lands, `docs/instructions/carve-answers-to-authoring-plan.md`) the carve matches the authored graph.

**`assembleFloor` must report which attempt succeeded** for the search to demand attempt 0. It does not today. Add it to the result rather than inferring it.

**Fail by name** after the budget, saying which floor and which criterion it could never satisfy.

**Measure and report:** how many floors need a non-zero offset; the worst offset; the added wall-clock on `yarn validate-world`; and **how many shipped floors currently succeed only past attempt 0** — that last number says how much hidden `packing` drift exists today.

---

### Task 3: A baked carve fingerprint, or the pin is only half real

A baked seed pins the INPUT, not the carve: change the assembler and the same seed yields a different floor. Neither the world md5 nor the per-tier fingerprints can see it — which is why every carve-changing task on this branch captured a baseline by hand.

Hash per floor, from the grid already in memory in `assembleOnce`: **each cell's `(row, col, type, dirs)`**, plus the region adjacency and the compiled `LockSpec`. **Do NOT hash `ordinal` or incidental corridor coordinates** — an ordinal shifts on any re-length, so hashing it would fire on harmless changes. Use `stableStringify` as `tierFingerprints.ts` does.

**The failure must name which floors moved**, not merely that something did; this check will fire on every intentional carve change and its job is to make the review cheap.

---

### Task 4: The ladder becomes dead weight, and says so

Once every floor carves at attempt 0, the widening ladder is reachable only by a floor whose seed was never searched. Decide, with measurement, whether it stays as a safety net or goes. **Do not remove it on reasoning alone** — measure how many floors would fail without it, and say. If it stays, its comment should say it is a net for unsearched floors rather than the normal path.

---

## Follow-on, recorded 2026-10-01: the search's answer goes back into the authoring

**Out of scope for the slices above; stated by the owner so it is not lost.**

Today the search starts at the packing the author wrote in `src/worldGen/spec/*.ts` and raises it until a
floor carves. The result is written to the BAKED world, never back to the authoring — so every fresh
search re-walks the same rungs to reach the same answer.

**Feed the final packing back into the authored spec** and the starting point becomes the known-good
value: the escalation finds it at rung 0, and the rungs are only ever climbed by a floor whose authoring
or assembler genuinely changed.

What it buys: the cold-cache bake (the `CARVE_RESEARCH=1` path, and the first run on an empty ledger)
stops being dominated by re-deriving answers already known. What it costs: the authored value stops
being purely the author's wish and becomes partly machine-written, so the diff on `spec/*.ts` needs to
read as a deliberate update rather than noise — and an author who then LOWERS it should expect the
search to raise it again rather than treating that as a fight.

Worth pairing with the question of whether a floor's authored packing should be a wish at all, given 38
of 206 floors needed it raised and 31 cannot carve at attempt 0 at any value because `deriveN` sizes
their grid too small. A third knob — grid size — may be the honest answer for those 31, and it would
change what "the authored packing" is for.
