# A zipline is taken, not walked — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** a one-way drop is a thing the player USES from a launch cell, not a corridor they walk into.

**Stated by the owner 2026-09-30:**

> - cell where player can stand and walk to (launch)
> - cells of obstacle
> - cell where player can stand and walk to (landing)
>
> - When player is at landing, it cannot move in direction of obstacle
> - when player at launch, we use the tooltip "use zipline" (can be other text with other obstacles)
> - player becomes invisible, allows time (promise) for potential animation play and/or sound effect
> - player is visible at landing position
>
> So the carve is 2 cells for launch and landing, plus 'x' cells of obstacle

## What this supersedes

The run landed earlier tonight and this changes its middle. **Say so in the code comments as the current
rule, never as history.**

- **The obstacle's cells stop being walkable.** Today they are corridor cells with one direction, and the
  player may stand on the run's last cell and step back. In this design the player never enters them.
- **`walkableDirsFrom`'s one-way-mouth edge goes**, along with the notion of a "mouth" as somewhere to
  stand. The landing offers no move toward the obstacle, so nothing needs barring.
- **The barred arrow (`OneWayMouthArrow`) loses its job.** With no offered move there is nothing to bar,
  and the art now spans the obstacle. Remove it unless looking at the result says otherwise.
- **One-way criterion 3** in `docs/mods/floor-topology-design.md` ("a player may stand at the run's
  landing end and step back off it") is replaced by criteria 3 and 3b below.
- **The carve reserves `2 + x` cells**, not `x` between two existing nodes.

## The criteria this must satisfy

1. A one-way declares the space it needs; the carve reserves **launch + x obstacle cells + landing**.
2. The launch and the landing are ordinary standable cells the player can walk to from their own side.
3. **From the landing, no move toward the obstacle is offered** — not drawn, not tappable.
4. **From the launch, taking the zipline is an offered action**, named by the obstacle ("use zipline"),
   with the wording coming from the obstacle kind rather than hardcoded.
5. Taking it hides the player, waits for a promise, and shows them at the landing.
6. **Crossing remains impossible**: nothing the player can do moves them landing → launch.
7. A drop still compiles to ONE `oneWay` edge between the two authored regions.
8. A floor that cannot reserve `2 + x` is refused by name.

## Global Constraints

- `yarn check-types` is the truth. **IDE diagnostics here have been wrong on EVERY occasion.**
- `yarn eslint <paths>` only. **NEVER `yarn lint --fix`.**
- **NEVER `git add`/`commit`/`stash`/`checkout`.** The controlling session commits.
- **NEVER `pkill`/`killall`.** If you start nothing, kill nothing.
- **NEVER `yarn generate-world` or `INCLUDE_DEV=1 yarn generate-world`.** `validate-world` is safe with the flag.
- **CARVE BASELINE on every task** — all 206 shipped floors, each cell reduced to its `dirs`, before against after. **EMPTY**: no shipped floor authors a one-way.
- `src/game/` is the domain layer: no React, no `src/app/`.
- Comments state CURRENT state and why, never history.
- **Tests assert EVERY element of a collection.**
- **Every refusal is watched failing**, red output quoted.
- **Test mechanics, not content** — hand-built fixtures (`src/app/SiteMap/floorFixtures.testing.ts`), never `doubleBack`.

**THE RULE:** the builder may refuse, but it may never decide quietly.

---

### Task 1: The carve reserves a launch and a landing

`ONE_WAY_RUN_CELLS` obstacle cells, plus a launch cell before them and a landing cell after. The launch
and landing are standable and reachable from their own sides; the obstacle cells are not walkable at all.

**Design judgement this task owns** (state it): what the obstacle's cells ARE now that nobody stands on
them. They must still be drawn — the art spans them — and must still stop any walk. Decide between a
corridor that no walk can enter and something else, and say what makes crossing impossible BY
CONSTRUCTION rather than by a check.

**Verify:** a fixture carves with launch, x obstacle cells and landing, asserted cell by cell; the
refusal fires when `2 + x` will not fit, watched failing; carve baseline EMPTY.

---

### Task 2: Nothing walks into the obstacle

Remove the mouth edge from `walkableDirsFrom` and the notion of a standable mouth. From the landing, the
walkable set must contain no obstacle cell — **asserted as a whole set**, not as an absence. From the
launch, likewise: walking does not enter the obstacle; only the action crosses.

`floorLock` must still compile one authored drop to exactly ONE `oneWay`, from the launch's region to the
landing's. `isOneWayMouth` / `oneWayMouthDir` / `oneWayRuns` exist for the walkable-mouth model — keep,
repurpose or delete each deliberately, and say which and why for each.

**Verify:** whole-set walkability from launch, landing and every obstacle cell; one compiled `oneWay`;
`INCLUDE_DEV=1 yarn validate-world` valid, lock sweep 10 of 10, `doubleBack` sound and still stranding
without `dropToEntrance`.

---

### Task 3: Taking it

`useSiteNavigation`'s `offer(kind, row, col, accept, familyId)` already does walk-there-then-prompt for
stairs and the way out, and `stairPeerPosition` already repositions the player — follow those rather than
inventing a second mechanism.

- A new prompt kind for taking an obstacle, whose **wording comes from the obstacle** so a future kind
  reads differently. Do not hardcode "use zipline" at the call site.
- Taking it: hide the player, await a promise, then place them at the landing and show them.

**The promise is where an animation and a sound effect will live in a later iteration** (the owner has
said so). Nothing plays yet, so it must be an honest seam and not a stub that pretends to animate — but
it must carry enough that the animation can be written without reworking this. Whatever crosses the seam
knows **where the traversal starts, where it ends, and which way it runs**; without those three an
animation cannot be drawn and the seam would have to be widened later.

Two things NOT to build now, because they are guesses about a feature that does not exist: a duration
knob, and any easing or frame vocabulary. The awaited promise resolving IS the duration. Keep it to what
a later animation cannot do without, and let that later slice decide the rest.
- The position write goes through the same path every other move uses (`updatePosition`, which records
  `standingKey` and `positionKey`), so the save and the drawn explorer stay in step.

**Verify:** from the launch the prompt appears and is named by the obstacle; taking it leaves the player
at the landing with the save agreeing; the player is hidden for the promise's duration and shown after.
**Count work, never wall-clock** — this project's rule: mock the delay and assert the sequence, never
assert a duration.

---

### Task 4: The criteria say what a one-way is now

Rewrite "What makes a one-way acceptable" in `docs/mods/floor-topology-design.md` to the eight criteria
above, with what enforces each. Criterion 3's old form is gone, not amended. Current state only.
