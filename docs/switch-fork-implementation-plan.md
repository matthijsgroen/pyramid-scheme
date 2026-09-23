# Switch Fork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fork room can carry an encounter and own the gates on its own exits, so a puzzle standing in a fork can decide which way out opens.

**Architecture:** A fork is already the attachment cell of a group of side sections, so it already knows where its ways out go. This slice gives it that knowledge explicitly — each exit's compass direction and what lies that way — lets a fork also be an encounter room, and has the assembler place the encounter's gates on the exits nothing else has claimed. No puzzle work: the encounter is any family, and the gates are keyed on ids it will later mint.

**Tech Stack:** TypeScript, Vitest (co-located `*.spec.ts`), the world-gen DSL and `siteAssembler`.

**Spec:** `docs/mods/floor-topology-design.md`, sections "A fork knows its exits, and a switch is a fork that carries an encounter" and "The unit of a claim is a room-to-corridor boundary".

## Global Constraints

- Core (`src/app`, `src/ui`, `src/game`, `src/data`, `src/worldGen`) may not import `@/mods/<name>/`; no mod may import a sibling; `@/mods/core/**` is allowed. Both are eslint errors at a zero backlog.
- **No authored floor uses the new authoring until the last task**, so `src/data/generatedWorld.ts` must stay byte-identical until then. If a change would rewrite it earlier, stop and report rather than committing the rewrite.
- A blocker may sit on the main path only when its opener is reachable first. At a fork the opener is the room the player stands in, which satisfies it by construction — but the invariant is what the validator checks, not the argument.
- Comments state current behaviour and why: never history, never narration of the task, and **never a `§` doc-section citation** (a zero-backlog betterer guard fails the build on one).
- Commit subject line only, `type: what changed`, ≤72 chars.
- Run `yarn test <path>`, `yarn tsc -b`, `yarn lint`, `yarn betterer`. World changes also run `yarn generate-world` and `yarn validate-world`.

---

## File Structure

| File                                           | Responsibility                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `src/game/siteTypes.ts`                        | `RoomCell` gains the fork's typed exits                                   |
| `src/game/siteAssembler.ts`                    | computes exits; lets a fork carry an encounter; places the switch's gates |
| `src/worldGen/dsl.ts`, `src/worldGen/types.ts` | authoring for a switch fork                                               |
| `src/worldGen/spec/junior.ts`                  | the authored example, in the last task                                    |
| `src/game/siteValidator.ts`                    | the boundary-claim and opener-order checks                                |

---

### Task 1: A fork's exits, typed

**Files:**

- Modify: `src/game/siteTypes.ts`, `src/game/siteAssembler.ts`
- Test: `src/game/siteAssembler.spec.ts`

**Interfaces:**

- Produces: `RoomCell.exits?: { dir: Direction; kind: "main" | "side" | "ward" | "fork" }[]` on fork rooms — the compass direction of each way out and what lies that way.

Kinds, so the implementer does not have to guess: **main** is the main path continuing; **side** is an attached side section; **ward** is an exit whose first room carries a `tomb-key` gate; **fork** is an exit whose neighbour node is itself a fork.

- [ ] **Step 1: Write the failing test**

Add to `src/game/siteAssembler.spec.ts` a case that assembles a floor whose main path carries a fork with at least one side section, finds the `roomType === "fork"` cell, and asserts its `exits` names one `"main"` per main-path direction and one `"side"` per attached section, each with the compass direction that actually leaves that cell. Derive the expected directions from the assembled grid's own `dirs`, not from a hand-written literal — the carve chooses them, so a literal would pin the seed rather than the behaviour.

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/game/siteAssembler.spec.ts -t "fork exits"`
Expected: FAIL — `exits` is undefined.

- [ ] **Step 3: Implement**

`forkPositions` is built at `siteAssembler.ts:1231` from each section group's `attachedAt`, and a fork room is written at `:1287-1288`. The attached sections for a group are in scope there. Compute `exits` from the cell's own `dirs` (each names the neighbour node one `NODE_STEP` away) and classify each by what that neighbour is.

- [ ] **Step 4: Run it and watch it pass**

Run: `yarn test src/game/siteAssembler.spec.ts -t "fork exits"`

- [ ] **Step 5: Prove the world did not move**

Run: `yarn test src/app/SiteMap/worldFloorAssembly.spec.ts && yarn generate-world`
Expected: sweep green, and `git diff --stat src/data/generatedWorld.ts` empty. `exits` is derived, not authored, so nothing may change.

- [ ] **Step 6: Commit**

```bash
git add src/game/siteTypes.ts src/game/siteAssembler.ts src/game/siteAssembler.spec.ts
git commit -m "feat(world): give a fork its exits and what they lead to"
```

---

### Task 2: A fork may also be an encounter

**Files:**

- Modify: `src/game/siteAssembler.ts`
- Test: `src/game/siteAssembler.spec.ts`

**Interfaces:**

- Consumes: Task 1's `exits`.
- Produces: a cell that is both `roomType: "fork"` and carries a `family`, rather than the two being mutually exclusive.

`siteAssembler.ts:1288` reads `if (!roomSpecs.has(pk)) roomSpecs.set(pk, { roomType: "fork" })` — so an attachment cell that already holds an encounter never becomes a fork, and a fork never gains an encounter. That single condition is what makes a switch fork impossible.

- [ ] **Step 1: Write the failing test**

Assemble a floor where a fork's attachment cell is also given an encounter, and assert the resulting cell has both `roomType === "fork"` and the expected `family`, and that its `exits` from Task 1 survive.

- [ ] **Step 2: Run it and watch it fail**

Expected: FAIL — one identity wins and the other is absent.

- [ ] **Step 3: Implement**

Let the two coexist. Be careful with everything downstream that switches on `roomType`: the decoration pass treats forks as dressable (`:1624`, `:1712`), `clickTargets` and `useSiteNavigation` branch on `roomType === "fork"` versus `"encounter"`, and the validator's blandness check counts forks. Read each before changing it and say in the report which ones needed a decision.

- [ ] **Step 4: Run it and watch it pass**

- [ ] **Step 5: Prove the world did not move**

Run: `yarn test && yarn generate-world`, `git diff --stat src/data/generatedWorld.ts` empty.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(world): let a fork room carry an encounter"
```

---

### Task 3: The builder places a switch fork's gates

**Files:**

- Modify: `src/worldGen/dsl.ts`, `src/worldGen/types.ts`, `src/game/siteTypes.ts`, `src/game/siteAssembler.ts`
- Test: `src/game/siteAssembler.spec.ts`, `src/worldGen/dsl.spec.ts`

**Interfaces:**

- Produces: authoring that marks a fork as a switch and names the key id per gated exit. The **author does not choose which exits**; the builder does, and reports what it chose.

The rules, from the spec:

- an exit toward an existing ward gate is **not available** — that boundary is already owned;
- an exit toward another fork is **not available** — a gate there cuts one open space in two;
- what remains — the main path onward, and side paths — is where gates go;
- at least two gates, or the fork is not a switch and the build fails saying so.

- [ ] **Step 1: Write the failing tests**

Three cases, each asserting behaviour rather than a fixed layout: a switch fork gets a gate on at least two of its available exits, each carrying the authored key id and `keyIsAuthored`; a ward-gated exit is never gated a second time; an exit toward another fork is never gated.

- [ ] **Step 2: Run them and watch them fail**

- [ ] **Step 3: Implement**

Gates on side sections are written at `siteAssembler.ts:1322-1342`; that is the shape to follow for the gate cell itself. The new work is choosing which exits, and refusing when fewer than two are available.

- [ ] **Step 4: Run them and watch them pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(world): gate a switch fork's own ways out"
```

---

### Task 4: The invariants, checked

**Files:**

- Modify: `src/game/siteValidator.ts`, `src/game/siteAssembler.ts` (rule 4, placement-side), `src/app/SiteMap/useAssembledFloor.ts` (rule 5, masking)
- Test: `src/game/siteValidator.spec.ts`, `src/game/siteAssembler.spec.ts`, `src/app/SiteMap/useAssembledFloor.spec.ts`

Five rules the spec states and nothing enforces. The design doc's "What holds each rule" table is the
register; these are the floor-shaped entries on it, and this task is what lets them stop saying
"nothing yet".

1. **No boundary is gated twice.** Two gates on one room-to-corridor boundary is the readability failure the exclusive-claim rule exists to prevent.
2. **A switch's gates are reachable only through the switch.** The opener must come before the blocker; at a fork that is true by construction, and the check is what keeps it true when something else moves.
3. **A switch's family is re-enterable.** Not a preference. Keys accumulate and the cost of a choice is a walk, so a switch whose family cannot be re-entered strands a player who spent their choice on a side branch behind the gate on the main path onward. `FamilyMeta.reEnterable` already exists; nothing requires a switch to have it.
4. **A switch never gates a hidden branch.** A gate the player can see says something is there; a hidden section says nothing is, until they find otherwise. Placement-side, so the spoiler never exists rather than being cleaned up afterwards.
5. **A room's exits do not outlive its directions through masking.** `maskHiddenCells` prunes `dirs` and carries `exits` through untouched, so even an ungated exit toward a hidden branch has the board drawing a door the player has not found. Measured: the switch gated the hidden section's first node in 40 of 40 seeds before rule 4 existed.

Rules 4 and 5 are two halves of one guarantee — one stops it being chosen, the other stops it being
drawn — and both are needed, because a floor can hide a section that was already gated.

**Not in this task**, because neither is floor-shaped and both want the whole world in view: that an
authored gate's key is actually minted by whoever owns it, and that every collection's target count is
reachable. They get their own slice, and it comes next rather than last — the second is what a person
counting by hand had to catch once already.

- [ ] **Step 1: Write the failing tests**

One case per rule, built by hand rather than generated, so each fails for its own reason and a single
mistake cannot make several of them pass together.

- [ ] **Step 2: Run them and watch them fail**

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and watch them pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(world): refuse a boundary gated twice"
```

---

### Task 5: Author one, and regenerate

**Files:**

- Modify: `src/worldGen/spec/junior.ts`, `src/data/generatedWorld.ts` (generated)
- Test: `src/worldGen/configBuilder.integration.spec.ts`

This is the first task where `generatedWorld.ts` is **expected** to change.

- [ ] **Step 1: Write the failing test**

Assert the authored pyramid has a fork room carrying the encounter, with at least two gated exits whose key ids match what the mechanic will mint.

- [ ] **Step 2: Run it and watch it fail**

- [ ] **Step 3: Author it**

Replace the witness door's current authoring in `src/worldGen/spec/junior.ts` — the main-path `nodes` selector and its two hand-hung gated side sections — with a switch fork. The hand-authored key-id strings stay hand-authored, pinned against the mod's own helper by the existing integration spec, because core may not import a mod.

- [ ] **Step 4: Regenerate and verify**

Run: `yarn generate-world && yarn validate-world && yarn test`
Report what changed in `generatedWorld.ts` beyond the authored pyramid, and confirm no gate, encounter, role or `pathPuzzles` moved anywhere else — compare before and after, not two runs of the same build.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(world): make the junior fork a switch"
```

---

## What this slice deliberately leaves out

- **The puzzle.** Any family may sit in the switch fork; the board that reads the exits and mints the keys is the next slice.
- **The feature registry.** The authoring here is direct. Registration by name, ownership lookup and weaving-by-intensity arrive with the second feature, which is what makes them worth building.
- **Removing the `witnessDoor` mod.** It still works; it goes when the puzzle moves into lightbeam's switch role.
