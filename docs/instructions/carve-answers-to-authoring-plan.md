# The carve answers to the authoring — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** the builder checks the carve it produced against the lock it was given, and refuses by name when they disagree — closing lock criterion 1 and dissolving the `packing` sweep at the same time.

**This is lock criterion 1** (`docs/mods/floor-topology-design.md`): *"the authored graph and the compiled one are different objects, and NOTHING COMPARES THEM."* `floorLock` derives the lock by flooding the ASSEMBLED GRID, so what gets walked is whatever the carve produced.

## What was measured, 2026-09-30

> **The numbers below were swept against an assembler that predates `cec5058d`**, which made a one-way
> drop a run of 5 cells rather than one. The MECHANISM they identify is structural and still holds — a
> side chain's attach cell is not tied to its mouth region — but the specific sound/unsound values have
> moved: `doubleBack` now needs `packing: 7`. Re-sweep before quoting a number, and treat the counts
> below as evidence for the mechanism rather than as current data.

Swept on `doubleBack` at its own seed, over `packing` 1-150, against a clean HEAD assembler.

**`packing` is not a dial.** It feeds `targetDistance` (`siteAssembler.ts:1030`) and `deriveN` (`:1077`), so a different value yields an UNRELATED maze from the same RNG stream — the grid side is 29 rows at `packing` 5, **59** at 6, 33 at 7. It is an index into a family of unrelated carves.

**Counts never move; adjacency does.** All 150 values give 13 regions, 4 one-ways, 10 gates. Sound carves always have exactly 10 gate doors; unsound ones sometimes 11 or 12.

**The named failure.** At `packing` 5 the compiled lock is a tree matching the authoring. At 6:

```
authored:  entrance -forkRight- rightLower
carved:    leftLower -forkRight- rightLower
```

The fork has become a chain — entrance, forkLeft, leftLower, forkRight, rightLower — so setting the fork board to "right" opens a door nothing can reach, and the walk reports `unsolvable`. The same `leftLower~rightLower` pair appears at `packing` 7, 8, 10, 11, 15 and 16.

**Cause.** A top-level side chain hosting off-route regions takes its labels from `regionOfStep` with a virtual mouth (`:1988-2007`), but physically hangs off `attachedAt`, a main-path cell picked by a spaciousness score plus `rand()*3` jitter (`:1471-1530`, `:1585`). **Nothing ties that cell to the chain's mouth region.** `topologyFaults` (`src/game/obstacles.ts:108`) checks the CONFIG only.

**Derivation is impossible; a check is cheap.** 48 of 150 values are sound (32%), scattered, no trend, longest failing run 15. The lock's region graph, gate tree and longest chain are identical in all 150 — only the carve varies.

| Check on the finished carve | Rejects | False negatives |
| --- | --- | --- |
| label adjacency vs authored connections | 90 of 102 failures | **0** — all 48 sound carves pass |
| + every gate door touches exactly two regions | 6 more | 0 |
| + a drop's landing is gate-adjacent to its authored destination | most of the rest | 0 |

Cost: microseconds, against a carve at median 36 ms.

## Scope

**This plan builds the check.** It does NOT build the generate-time `packing` search, and it does NOT restructure how a side chain picks its attach cell — both are recorded at the end as follow-ons, because the check may make the first unnecessary and the second is a change to shared carving code.

## Global Constraints

- `yarn check-types` is the truth. **IDE diagnostics here have been wrong on EVERY occasion.** Ignore them.
- `yarn eslint <paths>` only. **NEVER `yarn lint --fix`.**
- **NEVER `git add`/`commit`/`stash`/`checkout`.** The controlling session commits.
- **NEVER `pkill`/`killall`.** Kill only a PID you started.
- **NEVER `yarn generate-world` or `INCLUDE_DEV=1 yarn generate-world`.** `validate-world` is safe with the flag. `md5 -q src/data/generatedWorld.ts` must stay `f67c3ea9303b04a1d7c9a558d0561620`.
- **CARVE BASELINE on every task** — all 206 shipped floors, each cell reduced to its `dirs`, before against after. **It must be EMPTY**: no shipped floor authors `regionLayout`, so this check must be inert for them.
- `src/game/` is the domain layer: no React, no `src/app/`.
- Comments state CURRENT state and why, never history.
- **Tests assert EVERY element of a collection.**
- **Every refusal is watched failing**, red output quoted.
- **Test mechanics, not content** — hand-built fixtures, not `doubleBack`.

**THE RULE:** the builder may refuse, but it may never decide quietly.

---

### Task 1: The carve's adjacency is compared to the authored graph

Add the check beside the assembler's existing structural refusals (`unseatedRegions`, `gateSeamMissing`), running only on floors that author `regionLayout`.

It rejects an attempt, **by name and naming the disagreement**, when the carve's region-label adjacency differs from the authored connections. The refusal must say which pair is wrong in the author's own vocabulary — the measured example reads *"rightLower attached through leftLower, authored entrance~rightLower"*. A refusal that says only "adjacency mismatch" is not worth building; the whole point is that the author learns what their floor did.

**Because each attempt re-seeds** (`mulberry32(seed + attempt*7919)`, `:1159`), rejecting an attempt may simply find a good carve at the authored `packing`. **Measure whether it does** — that is the difference between this closing the `packing` problem and merely reporting it. Report how many attempts `doubleBack` needs at `packing` 5, and at two values that are unsound today.

**Verify:** the check fires on a fixture whose carve disagrees with its authoring, watched failing; it is silent on every sound carve; carve baseline EMPTY.

---

### Task 2: The two cheaper filters

- **Every gate door touches exactly two lock regions.** Unsound carves sometimes produce 11 or 12 gate doors where the authoring asks for 10.
- **A drop's landing is gate-adjacent to its authored destination.** `packing` 3 lands `s1Chamber` in a gate-less `leftLower` pocket rather than in `leftLower+s2Chamber`, which is the trick `doubleBack` exists for.

Both name what they refuse. **Verify:** each watched failing on its own fixture; together with Task 1 they reject 96 of the 102 measured failures with no false negatives.

---

### Task 3: The criteria table tells the truth

`docs/mods/floor-topology-design.md`, lock criterion 1's row, currently reads *"type is real; nothing compares the carve to the authoring"*, and the paragraph under it explains the gap with the `packing` measurements. Rewrite both to what now holds, and record what the check does NOT cover — the measured residue is 6 of 150 values that pass every filter and still fail. State the current rule; no history.

---

## Follow-ons, deliberately not in this plan

- **A generate-time `packing` search.** Try values 1..64 in the builder and write the first sound one into `FloorConfig.packing`, failing by name after 64. Expected ~3 tries, ~0.2 s per floor; seconds for the world. **Do this only if Task 1's re-seeding does not already remove the need** — measure first.
- **The constructive fix.** Bias the attach-cell choice (`:1471-1530`) so a chain hosting off-route regions attaches where `stepRegion` equals its mouth. Removes the `leftLower~rightLower` class by construction, but touches shared carving code used by every floor, so it needs its own carve baseline and its own slice.
