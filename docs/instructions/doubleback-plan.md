# `doubleBack`, assembled — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** `doubleBack` carves, walks sound, and can be played on the develop journey.

**Why this plan exists:** the gates slice built the MECHANISM half of `doubleBack` — brainstorm **D2**, "a lever elsewhere opens a door here" — and left the GEOMETRY half untouched. `doubleBack` is D2 composed with **A1**, the one-way ramp ("a real corridor, passable downhill only, landing at an authored room upstream"), on a floor whose graph branches and rejoins. Every task below is geometry.

**The fixture is the spec.** `doubleBack()` at `src/game/lockWalk.spec.ts:196-239`: six regions, five gates, three mechanisms, two drops. Do not design against the prose; design against that object, and when this plan and the fixture disagree, the fixture wins.

**Spec:** `docs/game-design/regions-and-containers.md`. Road: `docs/authored-locks-roadmap.md`, "What stands between here and `doubleBack`". Brainstorm: `docs/game-design/floor-as-puzzle-brainstorm.md` (A1, D2, A2).

## Global Constraints

- `yarn check-types` is the truth. **IDE diagnostics in this repo have been wrong on EVERY occasion** — they name symbols that exist and files that do not. Ignore them; run the command.
- `yarn eslint <paths>` only. **NEVER `yarn lint --fix <path>`** — it does not scope and rewrites the repo.
- **NEVER `git add` / `git commit` / `git stash`** in a task. The controlling session commits.
- **NEVER run `INCLUDE_DEV=1 yarn generate-world`.** `yarn validate-world` is safe with the flag.
- `yarn generate-world && md5 -q src/data/generatedWorld.ts` must stay `f67c3ea9303b04a1d7c9a558d0561620`.
- **That fingerprint does NOT cover the carve** — it holds authored `SiteConfig[]`, not walls. Any task changing carve behaviour captures a CARVE BASELINE first (assemble every shipped floor at its real seed via `allFloors()`, reduce each cell to its `dirs`, diff before against after) and reports the diff.
- `INCLUDE_DEV=1 yarn validate-world` valid, lock sweep walks every floor that authors a mechanism.
- `src/game/` is the domain layer: no React, no `src/app/`.
- Comments state CURRENT state and why, never history.
- **Tests assert EVERY element of a collection, never a representative one.**
- **Every refusal is watched failing** — break the thing it guards, quote the red output.
- There are NO existing saves.
- Delete every scratch file you create.

**THE RULE:** the builder may refuse, but it may never decide quietly.

---

### Task 1: A side path can be a region

**The blocker everything waits on.** `regionRoute` threads one shortest route and `regionOfStep` deals its regions along the MAIN PATH; a side path takes the region of the cell it grows from (`siteAssembler.ts`, the `cellRegion` block). So a layout whose graph branches has regions no step ever names, and the floor is refused `regionNotSeated`. Measured: a four-region diamond returns `{"type":"regionNotSeated","regions":["leftLower"]}`. `doubleBack` is a diamond twice over.

**What to build:** a region off the threaded route is seated by a SIDE PATH grown for it. The route still picks which regions the main path crosses; every declared region the route does not cross must be matched to a side section, and its cells labelled with it instead of inheriting the parent's.

**Design judgement this task owns** (state what you chose and why in the report):
- Which side section serves which region — authored, or matched by the builder? The design says the builder shapes the stretches and the author names appetites, so matching is the builder's; but a floor with two branches and two unseated regions needs a deterministic rule, not a lucky one.
- What happens when there are more unseated regions than side sections. `regionNotSeated` already exists and is the honest answer; it must fire AFTER the attempt budget, not at attempt 0, because `mainPath.length` and the side sections grow across attempts.
- A region seated on a side path is not on the main path, so `mainPathRegions` (already written, no production caller) becomes meaningful. Reconcile them or say why not.

**Verify:** the diamond fixture carves; every declared region appears on some cell; `regionNotSeated` still fires when a region genuinely cannot be seated, watched failing. Carve baseline diffed — shipped floors author no `regionLayout`, so it must be empty.

---

### Task 2: A gate on a connection off the threaded route

`obstacleOffRoute` refuses one today, honestly: a connection the route does not thread has no seam, because no two adjacent cells span it. Once Task 1 seats regions on side paths, a branch's mouth IS a boundary between two regions, so the refusal should stop firing on its own.

**Do not assume that.** Confirm it, and build the seam-finding for the side-path case: `seamIndexFor` answers over `stepRegion`, which is main-path only. A gate between `entrance` and `leftLower` stands where the side path leaves its parent.

**Verify:** the diamond fixture with a gate on each of its two branch connections carves, and each gate room stands at the right boundary. `obstacleOffRoute` still fires for a connection that is genuinely absent from the layout — watched failing.

---

### Task 3: Controls seated in any region

`S1` stands in `s1Chamber` and `S2` in `s2Chamber`, both branch regions. The control search walks the main path's content nodes. Extend it to a region seated on a side path, keeping the ordinal-stability rule the gates slice established: **a control taking a node must be invisible to every other room's identity** — `pathIndex` is the save address, and a puzzle that keeps its node keeps its number.

**Verify:** a control in a branch region seats and drives its gate; `controlNotSeated` still fires when no node is free, after the attempt budget. Assert content addresses are unchanged with the control present and absent — the whole set, not a count.

---

### Task 4: A one-way names regions

`FloorConfig.oneWays` names section addresses, checked against `knownSectionAddresses` (`siteAssembler.ts:697-700`). `doubleBack`'s drops are `s1Chamber → leftLower` and `leftLower → entrance` — region to region.

**This is brainstorm A1**, and the roadmap's step 1/2 rules still apply: a drop's mouth reads as an ordinary corridor until the art lands, so it ships on the develop journey only.

**The shape:** a one-way becomes an obstacle kind — `kind: "oneWay"`, `at: { on: "connection", between: [a, b] }` — which is what the two exhaustively-checked unions were built for. That forces `Control.opens` to grow from "which obstacles stand open" to "what condition each obstacle is in", because a direction is not open-or-shut. **Keep the existing section-addressed `oneWays` working** — the develop journey's pyramid 3 authors one and must not move.

**Verify:** a region-to-region drop carves as a directed passage and reaches `LockSpec.oneWays`; `floorLock` derives it from the assembled grid unchanged. The old section-addressed form still carves identically — carve baseline empty.

---

### Task 5: Toggle-off is identity-stable with several obstacles

Measured over seeds 0-49: 0 of 50 diverge with one obstacle, **24 of 50 with two** (`toggleOff.spec.ts`, currently `it.fails`). `mainZoneCandidates` compensates by COUNT while the list is sliced by contiguous range, and count-equal is not identity-equal. `doubleBack` authors five gates.

**The acceptance gate is the spec's own:** "toggle the topology mod off and the identical walls carve with every connection open. Not 'roughly the same amount of content' — the same floor."

**The design question this task owns:** make the carve's geometry independent of mod-owned fields by construction rather than by compensation. The candidate the gates slice rejected — reserving off the CORE region layout rather than the mod's obstacle list — is now more attractive, because after Task 1 the layout determines the shape anyway. Weigh it against simply not letting a gate's placement perturb any candidate list.

**Verify:** promote the `it.fails` sweep to a passing test across seeds 0-49 on one-, two- and five-obstacle floors. If it cannot be made green honestly, STOP and report — do not narrow the sweep.

---

### Task 6: A region no reachable state stands in

§5's "every region must be reachable" exists only structurally (`strandedRegions`). The state-aware form — *a region no reachable state stands in, every bounding gate of which is owned solely by on-floor mechanisms* — is not built. Measured when it was designed: 0 hits across 206 shipped floors, 4 on a deliberately deadlocked control.

`doubleBack` is exactly the shape where two mechanisms can deadlock each other and a structural check passes. The walk already proves this floor needs its second drop to stay sound (`lockWalk.spec.ts:246-255`), which is that fault class caught by hand.

**Verify:** fires on a deliberately deadlocked fixture, silent on `doubleBack` and on every shipped floor.

---

### Task 7: `doubleBack`, authored

Author the fixture as a real floor on the develop journey. Then **move the example out of `lockWalk.spec.ts`** — it is a fixture there only because there was nothing to author it with, and a design document plus a fixture are two lists that must agree by hand. What stays in that spec is what tests the walk: the moves, the owner fold, the two questions, the ceiling.

**Verify:** it carves; `INCLUDE_DEV=1 yarn validate-world` walks it sound; the lock sweep counts it; playtest instructions written for the owner naming what to try — including the early drop that strands without the second one.
