# A lock is placed on a floor — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** a lock becomes a container with its own ports that a floor PLACES, rather than the floor itself.

**Why this plan exists.** `regionLayout` is stretched over the floor's entire main path and the lock's ports are the floor's own entrance and exit, so **a lock is not placed on a floor, a lock IS the floor**. That single fact is why five acceptance criteria fail at once (`docs/mods/floor-topology-design.md`, "What makes a lock acceptable"):

| # | Criterion | Why it fails today |
| --- | --- | --- |
| 8 | a lock may stand anywhere in a larger map | it occupies the map |
| 10 | locks may be nested | there is no container to nest |
| 11 | a pyramid's exit may not stand inside a lock | the exit IS the lock's `out` |
| 12 | no route round a top-level lock | there is no outside to bypass through |
| 1 | the carve honours the authored connectivity | the authoring was only ever an instruction to the carve |

`doubleBack` works precisely because it is the whole floor. Building the container turns five gaps into one job.

**Spec:** `docs/game-design/regions-and-containers.md` — "Composition is authored outside the container", "Main path is derived, never authored", "A region is a stretch of the carve, not an area set aside". **Criteria:** `docs/mods/floor-topology-design.md`. The spec describes the model; the criteria are what a floor is accepted against, and where they disagree the criteria win.

## Scope, decided so this plan does not wait on open questions

`regions-and-containers.md` has an "Open" section with four unanswered questions. **None of them blocks slice 1, and this is how each is sidestepped rather than answered:**

- **What the container is called.** `topologyLock` collides with the catalogue's `sequenceLock`. **Slice 1 introduces no authoring verb** — the container is a type the builder consumes, placed by the same `regionLayout` field that exists today. The authoring name is chosen when authoring lands, by the owner, and nothing here prejudges it.
- **Whether region names become save addresses.** **No.** Addressing does not move in this slice. `cellSlot` and `cellAddress` are untouched, and any change to them is a separate, save-visible piece of work.
- **Whether a region may span floors.** **No.** A container lives on exactly one floor. A container authored with a staircase inside it is REFUSED BY NAME, which is the honest answer until `needs` above floor scope is designed.
- **Who counts capacity when a floor authors several containers.** Out of scope. The existing rule still holds and still refuses: everything authored is accounted for, and content that cannot be placed is refused by name before a wall is carved.

**Criterion 1's guarantee — comparing the carve against the authored graph — is NOT in this slice.** It is a second job that becomes possible once a container exists to compare, and it is the one with the measured evidence behind it (identical region and gate counts at six values of `packing`, flipping between solvable and unsolvable). Slice 1 builds the container; slice 2 makes the carve answer to it.

## Global Constraints

- `yarn check-types` is the truth. **IDE diagnostics in this repo have been wrong on EVERY occasion** — they name symbols that exist and files that do not. Ignore them; run the command.
- `yarn eslint <paths>` only. **NEVER `yarn lint --fix <path>`** — it does not scope and rewrites the repo.
- **NEVER `git add` / `git commit` / `git stash` / `git checkout`** in a task. The controlling session commits.
- **NEVER `pkill` or `killall`.** Other worktrees and the owner's playtest run dev servers on this machine. Kill only a PID you started.
- **NEVER run `INCLUDE_DEV=1 yarn generate-world`.** `yarn validate-world` is safe with the flag.
- `yarn generate-world && md5 -q src/data/generatedWorld.ts` must stay `eb7d34e5dcb1629a8d6b6033b077cfa1`.
- **That fingerprint does NOT cover the carve.** Every task here changes carve behaviour, so every task captures a CARVE BASELINE first — assemble every shipped floor at its real seed via `allFloors()`, reduce each cell to its `dirs`, diff before against after — and reports the diff. The shipped world authors no `regionLayout`, so the diff must be EMPTY until a task deliberately changes a shipped floor.
- `src/game/` is the domain layer: no React, no `src/app/`.
- Comments state CURRENT state and why, never history.
- **Tests assert EVERY element of a collection, never a representative one.**
- **Every refusal is watched failing** — break the thing it guards, quote the red output.
- **Test mechanics, not content.** Hand-built fixtures per mechanic, the way `src/app/SiteMap/movementInvariant.spec.ts` and `floorFixtures.testing.ts` do. `doubleBack` is content; the lock sweep in `validate-world` is where content is checked.

**THE RULE:** the builder may refuse, but it may never decide quietly.

---

### Task 1: A container has ports, and the floor has an entrance

**The blocker everything else waits on.** Today a lock's `in`/`out` ARE the floor's entrance and exit. Separate the two ideas: a container declares its own `in` and `out` regions, and a floor states where on its main path that container is entered and left.

**What to build:** a container type carrying its regions, connections and ports, and a placement that seats it on a stretch of the floor's main path. The floor's entrance and exit remain the floor's; the container's ports are its own, and they coincide with the floor's only when the placement says so — which is the `doubleBack` case and must keep carving identically.

**Design judgement this task owns** (state what you chose and why in the report):
- Whether a placement names the stretch it occupies, or the builder chooses it from the container's size. The spec says the builder shapes the stretches and the author names appetites, which argues for the builder — but a floor placing two containers needs a deterministic rule, not a lucky one.
- What a floor with a container and no other content carves as. That is `doubleBack` today, and it must not move.

**Verify:** `doubleBack` carves identically — carve baseline diffed and quoted. A fixture floor with a container occupying only part of its main path carves, with ordinary content before and after it. Every shipped floor's carve baseline is EMPTY.

---

### Task 2: Criterion 8 — a lock stands anywhere in a map

With ports separated, a container can sit mid-map with side sections hanging before its `in` and after its `out`.

**Verify:** a fixture floor with content before and after a container carves, and the content lands outside the container's regions — asserted per node, not by count. A container placed at the very start and at the very end both carve, since those are the boundary cases where "anywhere" is easiest to get wrong.

---

### Task 3: Criterion 11 — the exit may not stand inside a lock

Today the exit IS the lock's `out`, so the criterion cannot even be stated. Once a container is placed, a floor whose exit falls inside one is authoring something the criteria forbid.

**Verify:** refused by name, watched failing. A floor whose exit sits after a container's `out` is fine and carves — assert both sides, or the refusal is indistinguishable from "containers cannot be placed near the end".

---

### Task 4: Criterion 12 — no route round a top-level lock

**This is the criterion with no code behind it at all.** At the top level the container(s) must be the only way from entrance to exit. A side section that rejoins the main path past a container's `out` is a bypass, and the whole lock stops being a lock.

**The check is a reachability question the solver can already answer**: with the container's regions removed, the floor's exit must be unreachable from its entrance. Use what exists (`docs/game-design/keys-and-locks-solver.md`) rather than writing a second reachability walk.

**Verify:** a deliberately bypassed fixture is refused by name, watched failing, with the red output quoted. Every shipped floor still carves — they author no container, so the check must be inert for them, and the carve baseline must be empty.

---

### Task 5: Criterion 10 — a region may hold another container

**Only after 1-4.** The spec's rule is that composition is authored where the container is PLACED, never inside it: a region is filled by floor content OR by another container, decided by the placement.

`regions-and-containers.md` §"Why nesting does not explode the walk" states the requirement the walk must keep: a nested container is walked as a container, not as a product of states. **Assert the host's state count, not merely that it is sound** — a test that only asserted soundness would pass while the walk quietly became exponential.

**Verify:** a two-level fixture carves and walks sound; the host's state count is asserted exactly. Nesting one container in two different regions of a host produces two different floors from one authored piece — which is the point of the rule, and worth a test that says so.

---

### Task 6: The criteria table tells the truth

Update `docs/mods/floor-topology-design.md`'s lock criteria audit: rows 8, 10, 11 and 12, and the paragraph headed "THE ONE FACT BEHIND 8, 10, 11, 12 AND 1's GUARANTEE", which stops being true when this lands. State what enforces each now. Criterion 1's row keeps its gap and gains a pointer to slice 2. Current state only, never history.
