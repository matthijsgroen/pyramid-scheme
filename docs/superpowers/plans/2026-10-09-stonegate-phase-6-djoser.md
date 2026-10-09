# stoneGate Phase 6: stoneGate in Djoser — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Ready to run.** The designer delegated the placement pick ("Plan and execute, I pick", 2026-10-09): this plan
> picks the pyramid and the floor, records why under "Rulings made without the designer", and the designer judges it
> by reading this plan. No question is open. A task that meets something its "Check what this task stands on" step
> does not expect stops and reports; it never re-decides a ruling.

**Goal:** the designer's lock `src/game/locks/stoneGate.lock` stands on the main floor (floor 0) of the Pyramid of
Djoser's last pyramid (`expert_4` pyramid 5) through `floorLocks`, bound to stone plates, a torch and a narrow
passage; the plain bake changes that one floor and nothing else; and a save that was standing inside a pyramid a
lock has re-laid resumes at that pyramid's entrance instead of past a door it never opened.

**Architecture:** placement is one world-spec rule in `src/worldGen/spec/expert.ts`, written exactly as the
Valley of the Kings' doubleBack is (`journey("expert_1").pyramid("last", { floorLocks: { 0: { locks, realisations } } })`), reading the lock from its `.lock` file with `catalogueLock` and giving every region `free` with
`freeRegions`, as every lock floor does today. `buildSite`'s `applyFloorLocks` overlays the lock on the auto-built
floor and leaves its other content (rooms, side paths, the ward wing's stair) as authored; the bake's own carve
search (`searchCarvePair`, `scripts/generateWorld.ts`) picks the seed and packing and writes them into
`src/data/generatedWorld.ts`, so no seed is pinned by hand. A save names its rooms by authoring address and slot,
so exploration and loot come back on the re-laid floor; only the lock's own new rooms are new ground (pinned in
task 2). What does not come back sound is where the player stands: a saved place is resolved on the new carve, and
there it can lie past a door the lock has not opened. A once-per-save launch step (stamped `relaidFloorsVersion`,
the pattern of `useMechanismSlotBackfill`) forgets the standing place of a save whose current pyramid a release
re-laid, so it resumes at the entrance; everything else in the save is kept.

**Tech Stack:** TypeScript, React 19 hooks, Vitest (`yarn vitest run`, `yarn verify-content`), `yarn run lock`
(`scripts/lock.ts`), `yarn generate-world` (Node bake), Storybook + `npx playwright screenshot` for the look.

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` ("The rules"; §3 "Carve and bake"; §5 "Save";
"Done when"). **Roadmap:** `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 6 row; "Decisions
taken": placement is Djoser, `expert_4`, and "a shipped floor that changes shape falls under the save-migration
rules: phase 6 decides between a migration and the world reshape release"; "Open per phase", Phase 6).
**Placement:** `docs/game-design/lock-placement.md` (Part 1, expert_4), `docs/game-design/lock-curriculum.md`.
**Saves:** `docs/game-design/world-stability.md` ("Remembering a cell", "Storage version", "What resets and what
doesn't"), `docs/instructions/world-reshape-release.md`.

**Written against `b8ce20e7`** (branch `topology/mechanics`; phases 1-5 and 7 done). Every path, symbol and line
cited below was checked there; line numbers drift as other work lands, so find each edit by the symbol named beside
it. The two untracked files at the repository root (`circle.lock`, `stoneGate.lock`) are the designer's scratch:
never stage them. Stage strictly by path, never `git add -A` or `git add .`. Another session is adding `lostRegions`
(handover "Next work" 1) on this branch and may rename a refused catalogue lock to `<name>-blocked.lock`: task 1's
first step checks for that. Before each task run `git status --short` and leave files you did not touch alone.

## What was measured before writing this

The expert_4 floors as baked at `b8ce20e7` (`src/data/generatedWorld.ts`), beside the world's one lock floor:

| site                            | floors | floor 0 main rooms | floor 0 side sections                                                            | authored                                               |
| ------------------------------- | ------ | ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| expert_4 pyramid 1              | 1      | 4                  | 7 (two ward-gated chests, a hidden path)                                         | —                                                      |
| expert_4 pyramid 2              | 1      | 5                  | 7 (a floor-key gate)                                                             | `keyColors: 2`, `packing: 0.2`, `FLOOR_KEY_PATH`       |
| expert_4 pyramid 3              | 1      | 5                  | 7                                                                                | —                                                      |
| expert_4 pyramid 4              | 2      | 6                  | 9 (a floor-key gate, the ward wing's stair)                                      | `keyColors: 2`, `packing: 0.2`, master ward wing       |
| **expert_4 pyramid 5**          | 2      | 6                  | 8 (two ward-gated chests, four junk paths, a hidden path, the ward wing's stair) | wizard ward wing, dense junk side paths (`isLast`)     |
| expert_1 pyramid 4 (doubleBack) | 2      | 5                  | 9 (the same shape as expert_4 pyramid 5)                                         | wizard ward wing, dense junk side paths, patron Anubis |

`yarn run lock stoneGate`: `✓ every region is reachable`, `✓ solvable`, "every piece bears load", cheapest 9
actions; nine regions, five plates (two stones), one torch (`S1 activator @hall5`), one narrow passage
(`hall3 -[unladen]- hall2`), no drop, no fork. Unannotated regions read `in` as `puzzles` and every other region as
`nothing` (`parseLock`), which is why the floor takes `freeRegions`.

A made-up stone lock (`SHELF_AND_DOOR`, `src/game/testSupport/stoneFixtures.ts`) placed on the walked floor of
`src/app/SiteMap/authoringChangeCost.spec.ts`: every room of the walk-it-all save comes back explored (`main/p0`-`p3`,
`main/xtreasure-chest`, `s0/p0`, `s0/p1`, `s0/xtreasure-chest`, `main/entrance`, `main/exit`); unexplored are only
the lock's own rooms, `main/xobstacle:stones.hall-out`, `main/xplate:stones.p`, `main/xplate:stones.shelf`.

Where the player stands is read in `useAssembledFloor` (`explorerPos`): `resolveStanding(standingKey) ?? resolveStanding(positionKey) ?? grid.entrancePos`, against the floor as it is carved now. `visitLevel`,
`completeLevel` and `completeJourney` clear `position`, `positionKey` and `standingKey`, so a saved place survives
only while the player stays inside one pyramid (a reload mid-floor, or a return from its ward wing).

Releases: the last is 0.44.0 (2026-09-18). doubleBack on expert_1 pyramid 4 (#315) and the floor reshape of every
floor (#303, "a floor that carves the same on every engine", shorter corridors) are both in `## Unreleased`, so the
next release already re-carves every floor, and two lock floors in it are new.

A plain bake run while the other session's uncommitted `lostRegions` work was in the tree (2026-10-09) reported
`✗ 1 floor(s) hold a lock a player can be stranded in: expert_1 level 4 floor 0 … can never be reached again`: the
new check may refuse the doubleBack already in the world. That is the `lostRegions` work's finding to settle, not this
phase's; task 1 stops on it rather than baking past it.

## Decisions (settled)

Binding (designer, unless noted). Each names the task that builds it.

- **D1. stoneGate is placed in Djoser, `expert_4`** (designer, 2026-10-06; roadmap "Decisions taken"; task 1).
- **D2. Through `floorLocks`, as doubleBack is** (roadmap phase 6 row; task 1). The lock is read from its `.lock` file
  at bake time (`catalogueLock`); there is no TypeScript copy.
- **D3. Realisations: `weights: "stonePlate"`, `activator: "torch"`, `unladen: "narrowPassage"`** (roadmap "Open per
  phase", Phase 6, and dev pyramid 12; task 1).
- **D4. Saves are migrated, never reset**, alpha or not: write new, read new then old, backfill once per save with a
  stamp (`docs/game-design/world-stability.md`, "Storage version"; task 3).
- **D5. Every mechanic piece is shared `default` art**, the same at every difficulty (phase 5): nothing to draw.
- **D6. No unit tests on authored content.** `yarn run lock` checks stoneGate; tests use made-up locks and a made-up
  list of re-laid pyramids.
- **D7. Stable world:** the plain bake changes only the floor the lock stands on (task 1 proves it floor by floor).
- **D8. The comment at the top of `src/game/locks/stoneGate.lock` is the designer's text** ("not placed yet, not
  buildable yet"). It is left alone; the handover lists it for their yes (task 4).

## Rulings made without the designer

- **Ruling: the pick is `expert_4` pyramid 5 ("last"), floor 0** (the main floor; floor 1 is the wizard ward wing).
  — Why:
  1. **It is the capstone slot.** stoneGate combines four mechanics (torch, a door that waits for two, stones and
     plates, the narrow passage) and two of them, stones and the narrow passage, no earlier Djoser site teaches. The
     curriculum puts its capstone on a journey's last site (`lock-curriculum.md`, "Expert": **doubleBack** closes
     expert_1, expert_3 and expert_4), and a lock this demanding belongs where the journey ends, not between
     cellar and overlook.
  2. **It has the shape of the floor doubleBack already stands on.** expert_4 pyramid 5 and expert_1 pyramid 4 are
     both the last pyramid of an expert journey: one main floor with 5-6 rooms, the same two ward-gated chests, four
     junk paths, a hidden path and a wizard ward wing up a stair. A lock floor of exactly this shape bakes, walks
     sound and has played since #315.
  3. **It carries no floor keys.** Pyramids 2 and 4 author `keyColors: 2`, a broad `packing` and a floor-key gate
     (`FLOOR_KEY_PATH`); a floor-key room inside a stone lock's regions is a combination nothing has carved or
     walked yet. Pyramids 1 and 3 hold the curriculum's first lesson and first lock (doorWaitsForTwo, cellar).
  4. **It costs the least curriculum.** It displaces doubleBack, which still closes expert_1 and expert_3; Djoser's
     capstone becomes a stone lock, which suits "Djoser's building site" (`lock-curriculum.md`, "Stones").
     — Cost if wrong: one rule moves to another pyramid and the bake runs again; the migration's list changes with it
     (task 3).
- **Ruling: stoneGate is placed without a stone lesson earlier in Djoser.** — Why: the placement is the designer's
  (D1) and the lesson's site is theirs to choose; stoneOnAPlate at Djoser pyramid 3 or 4 is the obvious candidate
  (`lock-placement.md`, "Where the curriculum and the world spec disagree"). — Cost if wrong: the first stone a
  player meets is in a four-mechanic lock until the lesson is placed; recorded under the roadmap's "Open after phase 6"
  (task 4).
- **Ruling: every region takes `free` (`freeRegions(catalogueLock("stoneGate"))`).** — Why: the `.lock` file marks no
  appetite, so `parseLock` reads `in` as `puzzles` and the other eight regions as `nothing`, which would crowd the
  floor's six rooms, eight side paths and the wing's stair into `in`. doubleBack's world copy and every dev lock
  floor take `free` everywhere. — Cost if wrong: the designer marks appetites in the `.lock` file (`*`, `$`, `?`) and
  the rule drops `freeRegions`; one re-bake.
- **Ruling: the binding sits on the overlay (`floorLocks[0].realisations`), not on the pyramid.** — Why: that is how
  doubleBack binds, and the wing floor places no lock. — Cost if wrong: one line moves.
- **Ruling: a save migration, not the world reshape release.** The roadmap leaves phase 6 to choose. — Why:

  1. **Exploration and loot already carry across a re-carve.** A save names a room by its section's authoring
     address and its slot (`world-stability.md`, "Remembering a cell"); placing a lock keeps every section and every
     slot, and adds the lock's own rooms (`xplate:…`, `xobstacle:…`, `xmech:…`) as new ground. Measured above and
     pinned in task 2. Nothing is re-earned, nothing is collected twice.
  2. **Mechanism state has nothing stale.** `mechanismStates` is keyed by the mechanism's own cell address, and the
     floor had no mechanism before: a save reads every plate, the torch and the stones at their authored start.
  3. **Where the player stands does not carry.** `positionKey`/`standingKey` resolve on the new carve, and there a
     room the player stood in can lie past a door the lock has not opened (beyond `P1+P2`, in `backroom` with the
     altar's stone still down): they would skip the lock, or stand where no way back is open. This is the one thing
     to migrate.
  4. **The reshape release is the wrong tool.** It resets in full only saves that skipped the capture release
     (`world-reshape-release.md`); every other save keeps everything. A lock placement is an ordinary re-authoring,
     the case `world-stability.md` says is migrated.

  The migration: `RELAID_FLOORS_VERSION` stamps every save (born stamped in `startJourney`); on the first launch with
  this code a save not yet stamped whose current pyramid (`journeyId` + `levelNr`) is in `RELAID_PYRAMIDS` forgets
  `position`, `positionKey` and `standingKey`, exactly the three fields `visitLevel` clears, and keeps `levelNr`,
  `interiorLevelNr`, exploration, mechanism states, traps, stock and everything else. — Cost: a player who was inside
  one of those pyramids when the release lands (or up its ward wing) resumes at its entrance once. The fog a
  remembered room lifts beyond a shut door stays lifted, as it does for any re-carve. A save that never launched the
  capture release (`cellKeyVersion` below 3) still re-keys its coordinates against the new carve, the reshape
  release's known gap, on these two floors as on every other. The floor summary that lights a pyramid on the travel
  map (`floorExploration`) is recomputed on the floor's next visit and is not re-derived here.

- **Ruling: `RELAID_PYRAMIDS` holds expert_1 pyramid 4 as well as expert_4 pyramid 5.** — Why: doubleBack's
  placement (#315) is unreleased and re-lays a shipped floor in the same release, with the same stale place; one
  list, one stamp, one launch. — Cost if wrong: delete one line of the list before the release.
- **Ruling: the migration's pure parts live in `src/app/SiteMap/relaidPyramids.ts`, the launch hook in
  `src/app/SiteMap/useRelaidFloorsBackfill.ts`, mounted last in `App.tsx`.** — Why: the other three save backfills
  live in `src/app/SiteMap/` and mount in `App.tsx`; mounted last, its write lands after the re-key's, so a
  `positionKey` the re-key derives for such a save is cleared too. The hook takes the list as an argument defaulting
  to `RELAID_PYRAMIDS`, so its test uses a made-up list. — Cost if wrong: a file moves.
- **Ruling: one `CHANGELOG.md` line, under `### Added`.** The resume-at-entrance is too small to list.

## Global Constraints

- **PATH:** `export PATH="$HOME/.asdf/shims:$PATH"` first; `/usr/local/bin/node` is broken.
- **Shell:** the commands below are POSIX (`$(…)`, `VAR=1 cmd`, heredocs). In fish, wrap a command in `bash -c '…'`.
- **`yarn run lock`**, not `yarn lock` with flags before it; vitest only as `yarn vitest run <files>`.
- **Stable world:** a plain `yarn generate-world` changes `src/data/generatedWorld.ts` in the expert_4 pyramid 5
  floor 0 config and the `worldContentHash` line only. Task 1 proves it floor by floor against the committed bake.
  `src/data/carveLedger.json` does not change (no carve code changes; a ledger line appears only for a floor no seed
  carves). If either moves elsewhere, stop and report.
- **No uncommitted playtest bake:** `git status --short src/data/` prints nothing before a bake. A bake made with
  `INCLUDE_DEV=1` is never committed.
- **No tests on authored content** (D6). Never assert what stoneGate, doubleBack or any world-spec lock contains,
  nor which pyramids `RELAID_PYRAMIDS` lists.
- **Count work, never wall-clock**, in tests.
- **Comments state the current rule and why**, never history ("replaces", "used to", "now"). A test name carries the
  claim; no doc-comment block above a test.
- **Mod off = same carve, bare nodes, open corridors:** `src/mods/topology/toggleOff.verify.ts` and
  `carveNeverDependsOnAMod.verify.ts` stay green with stoneGate on a world floor.
- **Known failures, not yours:** `src/mods/puzzleSeeds.verify.ts` may fail its 3 known tests ("the switch's three
  shapes…", "owes the switch a board…", "names the floor and the shape…"). Leave them.
- **Commits:** one short line, then the trailer lines exactly:
  ```
  git commit -m "<type(scope)>: <what changed>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
  ```

## Review Focus

1. **A player who reloads mid-floor in Djoser 5 after the release.** They resume at the entrance, never inside the
   lock's far side; their explored rooms and looted chests stay as they were. Test in task 3 (`setRelaidFloors`
   clears the three place fields, keeps `levelNr`, `interiorLevelNr`, `exploredCells`, `mechanismStates`) and task 2
   (the cost of placing a lock).
2. **A player up Djoser 5's ward wing when the release lands.** Their save names floor 1, and the wing comes down onto
   the re-laid floor 0: they resume at the pyramid's entrance too, because the step asks the pyramid, not the floor.
   Test in task 3 (a place on floor 1 of a re-laid pyramid is forgotten).
3. **A save stamped once is never touched again,** and a journey started after the release is born stamped, so a
   player who reaches Djoser 5 later and reloads there keeps their place. Test in task 3 (two tests).
4. **A save in a pyramid the release did not re-lay,** or one standing nowhere yet, is stamped and otherwise left
   exactly as it was. Test in task 3.
5. **The re-laid floor's content.** Every room, chest, side path, hidden path and the wing's stair is still on the
   floor and reachable, and the lock walks sound with them around it. Proved by the bake (its reachability solver and
   lock sweep) and `yarn verify-content` in task 1, and seen in the journey inspector in task 4.

---

### Task 1: stoneGate on Djoser's last pyramid

**Files:**

- Modify: `src/worldGen/spec/expert.ts` (imports; a rule after doubleBack's in `expertRules`)
- Modify: `src/data/generatedWorld.ts` (the plain bake)
- Modify (the shipped world's lock floors, which these sweeps pin): `src/worldGen/devJourney.verify.ts`,
  `src/worldGen/lockFloorInspector.verify.ts`, `src/mods/topology/carveNeverDependsOnAMod.verify.ts`
- Test: none of its own. The proof is the bake (carve search, reachability, lock sweep), the floor-by-floor diff and
  `yarn verify-content`, never a content assertion.

**Interfaces:**

- Consumes: `catalogueLock(name: string): Lock` from `./locks/catalogue`; `freeRegions(lock: Lock): Lock` from
  `@/game/lockAuthoring`; the binding keys `weights`, `activator`, `unladen` and realisations `stonePlate`, `torch`,
  `narrowPassage` (all used by dev pyramid 12 in `src/worldGen/spec/dev.ts`).
- Produces: `generatedWorldConfigs.expert_4[4][0].locks` holding stoneGate; tasks 2-4 read nothing from it by name.

- [ ] **Step 1: Check what this task stands on**

```bash
export PATH="$HOME/.asdf/shims:$PATH"
git status --short
ls src/game/locks/ | grep -i stonegate
```

Expected: `git status` shows at most `?? circle.lock` and `?? stoneGate.lock` plus files another session is editing
(leave them); the listing prints exactly `stoneGate.lock`. **If it prints `stoneGate-blocked.lock` (or no
`stoneGate.lock`), the `lostRegions` check refused the lock: stop and report; do not place it.**

```bash
yarn run lock stoneGate 2>&1 | head -6
```

Expected: `✓ every region is reachable` and `✓ solvable`, and no `✗` line (if `lostRegions` has landed, its line is a
`✓` too). Anything else: the designer's lock changed or is refused; stop and report.

```bash
grep -n 'journey("expert_4")' src/worldGen/spec/expert.ts
```

Expected: two rules, `.pyramid(2, …)` and `.pyramid(4, …)` (floor keys); no `floorLocks` on expert_4.

- [ ] **Step 2: Take the baseline the bake is compared against**

```bash
mkdir -p /tmp/djoser
git show HEAD:src/data/generatedWorld.ts > /tmp/djoser/before.ts
cat > /tmp/djoser/floorDiff.ts <<EOF
import { generatedWorldConfigs as before } from "/tmp/djoser/before"
import { generatedWorldConfigs as after } from "$PWD/src/data/generatedWorld"
const moved: string[] = []
for (const j of new Set([...Object.keys(before), ...Object.keys(after)])) {
  const a = before[j] ?? [], b = after[j] ?? []
  for (let p = 0; p < Math.max(a.length, b.length); p++)
    for (let f = 0; f < Math.max(a[p]?.length ?? 0, b[p]?.length ?? 0); f++)
      if (JSON.stringify(a[p]?.[f]) !== JSON.stringify(b[p]?.[f])) moved.push(\`\${j} pyramid \${p + 1} floor \${f}\`)
}
console.log(moved.length ? moved.join("\n") : "no floor moved")
EOF
yarn tsx /tmp/djoser/floorDiff.ts
```

Expected: `no floor moved` (the script works and the tree holds the committed bake).

- [ ] **Step 3: Author the placement**

`src/worldGen/spec/expert.ts`, imports (top of file): beside `import { doubleBackLock } from "./locks/doubleBack"` add

```ts
import { freeRegions } from "@/game/lockAuthoring"
import { catalogueLock } from "./locks/catalogue"
```

In `expertRules`, directly after the doubleBack rule (`journey("expert_1").pyramid("last", { floorLocks: … })`) and
before `journey("expert_3").pyramid("last", { patron: "sobek" })`, add:

```ts
  // Djoser's last pyramid opens on the designer's stoneGate, read from its .lock file: lifting the stone off the altar
  // opens the back way and shuts the way in, a stone parked on the backroom shelf lets the explorer squeeze through
  // the narrow passage, and both stones are spent twice. It stands on the main floor as the journey's capstone; the
  // file marks no appetites, so every region takes `free` and the floor's own content goes where the carve puts it.
  journey("expert_4").pyramid("last", {
    floorLocks: {
      0: {
        locks: [{ lock: freeRegions(catalogueLock("stoneGate")) }],
        realisations: { weights: "stonePlate", activator: "torch", unladen: "narrowPassage" },
      },
    },
  }),
```

Run: `yarn check-types`
Expected: exits 0.

- [ ] **Step 4: Bake the plain world**

Run: `git status --short src/data/` — expected: nothing.

Run (about 5 minutes): `yarn generate-world 2>&1 | tee /tmp/djoser/bake.log | tail -25`

Expected: exits 0; no `✗` line; `Lock sweep: walked 3 of 3 floor(s) that author a mechanism`; no
`unsatisfiable: expert_4 level 5 floor 0` line (`grep -n "expert_4 level 5" /tmp/djoser/bake.log` prints nothing, or
only a packing line `expert_4#5#0: … -> …`). If the bake names that floor as unsatisfiable, as a stranding lock, or
throws "Floor expert_4#… cannot be assembled", stop and report the line verbatim (a `lockNotLaid` names the part the
lay could not place); do not work around it, and do not try another pyramid: the pick is a ruling the designer
reads. If the only `✗` names `expert_1 level 4 floor 0` (doubleBack refused by `lostRegions`), that is the
`lostRegions` work's to settle: restore the bake (`git checkout -- src/data/`), stop and report.

- [ ] **Step 5: Prove only Djoser's floor moved**

```bash
yarn tsx /tmp/djoser/floorDiff.ts
git diff --stat src/data/
git diff -U0 src/data/generatedWorld.ts | grep -E '^[-+]' | grep -v '^[-+]{3}' | grep -c worldContentHash
```

Expected: the script prints exactly `expert_4 pyramid 5 floor 0`; `git diff --stat` lists `src/data/generatedWorld.ts`
only (no `carveLedger.json`); the last command prints `2` (the content hash's old and new line). If any other floor
moved, or the ledger changed, stop and report which.

Run: `grep -n '"name":"stoneGate"\|name: "stoneGate"' src/data/generatedWorld.ts | head -3`
Expected: one hit in the `expert_4` block (the baked lock).

- [ ] **Step 6: Count the new lock floor in the sweeps that pin the shipped world's**

The numbers below are those at `b8ce20e7`; if a later commit moved one, add the Djoser floor to what is there.

`src/worldGen/devJourney.verify.ts` ("the floors the lock sweep walks"):

- the header comment's "the shipped world stands two mechanism floors" becomes "three mechanism floors";
- `"walks the two mechanism floors the shipped world stands, and finds no strand"` becomes `"walks the three mechanism floors the shipped world stands, and finds no strand"`, with `expect(plainSweep.walked).toHaveLength(3)`;
- `"walks fourteen once the dev journey stands its twelve, and finds no strand"` becomes `"walks fifteen once the dev journey stands its twelve, and finds no strand"`, with `toHaveLength(15)`.

`src/worldGen/lockFloorInspector.verify.ts`: the test `"assembles the shipped world's lock floor, expert pyramid 4's first floor"` becomes

```ts
it("assembles the shipped world's lock floors, the first floor of expert_1 pyramid 4 and of expert_4 pyramid 5", () => {
  const shipped = lockFloors(plain)
  expect(shipped.map(({ journeyId, pyramidNumber, floorIndex }) => [journeyId, pyramidNumber, floorIndex])).toEqual([
    ["expert_1", 4, 0],
    ["expert_4", 5, 0],
  ])
  expect(shipped.map(assembles)).toEqual([true, true])
})
```

`src/mods/topology/carveNeverDependsOnAMod.verify.ts`: the comment above `FLOORS_WITH_MECHANICS` becomes "The floors
of the real world that stand a mechanic with every mod, whole sets: the shipped junior_2 switch, the expert_1 pyramid
whose first floor opens on the doubleBack, the expert_4 pyramid whose first floor opens on the stoneGate, and every
dev floor.", and `"expert_4 level 5 floor 0"` joins the list after `"expert_1 level 4 floor 0"`. `FLOORS_WITH_DROPS`
is unchanged (stoneGate has no drop). If the test reports the labels in another order, take the order it reports.

Run: `yarn verify-content 2>&1 | tee /tmp/djoser/verify.log | grep -E "×|Test Files|Tests "`

Expected: only the three known `src/mods/puzzleSeeds.verify.ts` failures (or none). `toggleOff` and
`carveNeverDependsOnAMod` pass: with the topology mod off, Djoser's plates and torch are bare nodes and its passage
open ground, on the same walls. If a seed sweep reports a board shortfall for expert_4, run `yarn generate-seeds`,
then `yarn verify-seeds`, and stage what it wrote under `src/data/` with this task. Any other failure: stop and
report it.

- [ ] **Step 7: Commit**

```bash
git add src/worldGen/spec/expert.ts src/data/generatedWorld.ts src/worldGen/devJourney.verify.ts src/worldGen/lockFloorInspector.verify.ts src/mods/topology/carveNeverDependsOnAMod.verify.ts
git status --short
git commit -m "feat(world): stoneGate on Djoser's last pyramid" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 2: What placing a lock costs a save, pinned

**Files:**

- Modify: `src/app/SiteMap/authoringChangeCost.spec.ts` (one case in "what re-authoring a floor costs a player")

**Interfaces:**

- Consumes: `parseLock(text, name)` from `@/game/lockNotation`; `SHELF_AND_DOOR` from
  `@/game/testSupport/stoneFixtures` (a made-up lock); the file's own `floorWith`, `cost`.
- Produces: the evidence the save ruling stands on; nothing later reads it.

This case pins a premise the code already holds (measured at `b8ce20e7`), so it passes on first run. It is the
row task 4 adds to the table in `world-stability.md`, whose every row is a case in this file.

- [ ] **Step 1: Write the case**

Add the imports at the top of `src/app/SiteMap/authoringChangeCost.spec.ts`:

```ts
import { parseLock } from "@/game/lockNotation"
import { SHELF_AND_DOOR } from "@/game/testSupport/stoneFixtures"
```

Append inside `describe("what re-authoring a floor costs a player", …)`, after the last case:

```ts
it("costs only the lock's own rooms when a lock is placed on the floor", () => {
  const placed = floorWith({
    locks: [{ lock: parseLock(SHELF_AND_DOOR, "stones").lock }],
    realisations: { weights: "stonePlate" },
  })
  const { explored, unexplored } = cost(floorWith(), placed)

  expect(unexplored).toEqual(["main/xobstacle:stones.hall-out", "main/xplate:stones.p", "main/xplate:stones.shelf"])
  expect(explored).toEqual(
    expect.arrayContaining(["main/p0", "main/p3", "main/xtreasure-chest", "s0/p1", "s0/xtreasure-chest"])
  )
})
```

- [ ] **Step 2: Run it**

Run: `yarn vitest run src/app/SiteMap/authoringChangeCost.spec.ts`
Expected: PASS, 12 tests. If the unexplored list differs, stop and report it: the save ruling stands on this list
holding only the lock's own rooms.

- [ ] **Step 3: Commit**

```bash
git add src/app/SiteMap/authoringChangeCost.spec.ts
git commit -m "test(saves): placing a lock costs only the lock's own rooms" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 3: A save inside a re-laid pyramid resumes at its entrance

**Files:**

- Create: `src/app/SiteMap/relaidPyramids.ts`
- Create: `src/app/SiteMap/relaidPyramids.spec.ts`
- Create: `src/app/SiteMap/useRelaidFloorsBackfill.ts`
- Create: `src/app/SiteMap/useRelaidFloorsBackfill.spec.ts`
- Modify: `src/app/state/useJourneys.ts` (`StoredJourneyStateV3.relaidFloorsVersion`; `JourneyAPI` and
  `createJourneysV3Api`: `journeysNeedingRelaidFloors`, `setRelaidFloors`; `startJourney` stamps)
- Modify: `src/app/state/useJourneys.spec.ts` (the known-writers list; a `describe` for the step)
- Modify: `src/App.tsx` (mount the hook last)

**Interfaces:**

- Produces, in `@/app/SiteMap/relaidPyramids`:
  - `export type RelaidPyramid = { journeyId: string; levelNr: number }`
  - `export const RELAID_FLOORS_VERSION = 1`
  - `export const RELAID_PYRAMIDS: readonly RelaidPyramid[]`
  - `export const standsInRelaidPyramid(stored: Pick<StoredJourneyStateV3, "journeyId" | "levelNr" | "position" | "positionKey" | "standingKey">, relaid: readonly RelaidPyramid[]): boolean`
- Produces, on `JourneyAPI` (`@/app/state/useJourneys`):
  - `journeysNeedingRelaidFloors: () => StoredJourneyStateV3[]`
  - `setRelaidFloors: (journeyId: string, resumeAtEntrance: boolean) => void`
  - `StoredJourneyStateV3.relaidFloorsVersion?: number`
- Produces, in `@/app/SiteMap/useRelaidFloorsBackfill`:
  `useRelaidFloorsBackfill(journeys: Pick<JourneyAPI, "journeysNeedingRelaidFloors" | "setRelaidFloors">, relaid: readonly RelaidPyramid[] = RELAID_PYRAMIDS): void`

- [ ] **Step 1: Write the failing tests for the pure part**

Create `src/app/SiteMap/relaidPyramids.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import type { StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { standsInRelaidPyramid, type RelaidPyramid } from "./relaidPyramids"

const RELAID: readonly RelaidPyramid[] = [{ journeyId: "made_up", levelNr: 2 }]

const save = (overrides: Partial<StoredJourneyStateV3> = {}): StoredJourneyStateV3 => ({
  journeyId: "made_up",
  levelNr: 2,
  completionCount: 0,
  active: true,
  exploredSections: {},
  position: "0:3,4",
  positionKey: "main#0/p3",
  standingKey: "main#0/~12",
  interiorLevelNr: 2,
  ...overrides,
})

describe("standsInRelaidPyramid", () => {
  it("holds for a save standing on the re-laid pyramid's main floor", () => {
    expect(standsInRelaidPyramid(save(), RELAID)).toBe(true)
  })

  it("holds for a save standing up the re-laid pyramid's ward wing, which comes down onto the re-laid floor", () => {
    expect(standsInRelaidPyramid(save({ positionKey: "s7#1/p0", standingKey: "s7#1/p0" }), RELAID)).toBe(true)
  })

  it("holds for a save carrying only the coordinate archive, which the re-key turns into a place", () => {
    expect(standsInRelaidPyramid(save({ positionKey: undefined, standingKey: undefined }), RELAID)).toBe(true)
  })

  it("does not hold for another pyramid of the same journey", () => {
    expect(standsInRelaidPyramid(save({ levelNr: 3 }), RELAID)).toBe(false)
  })

  it("does not hold for the same pyramid number in another journey", () => {
    expect(standsInRelaidPyramid(save({ journeyId: "other" }), RELAID)).toBe(false)
  })

  it("does not hold for a save standing nowhere yet, which has no place to forget", () => {
    expect(standsInRelaidPyramid(save({ position: null, positionKey: null, standingKey: null }), RELAID)).toBe(false)
  })
})
```

Run: `yarn vitest run src/app/SiteMap/relaidPyramids.spec.ts`
Expected: FAIL, "Failed to resolve import "./relaidPyramids"".

- [ ] **Step 2: Write the pure part**

Create `src/app/SiteMap/relaidPyramids.ts`:

```ts
import type { StoredJourneyStateV3 } from "@/app/state/useJourneys"

/** A shipped pyramid whose floor a release re-laid by placing a lock on it, named as a save names its level. */
export type RelaidPyramid = { journeyId: string; levelNr: number }

/** Which re-laying of shipped pyramids a save has been through. 1: the doubleBack on the Valley of the Kings' last
 * pyramid and the stoneGate on Djoser's. Bumped together with a new entry in RELAID_PYRAMIDS. */
export const RELAID_FLOORS_VERSION = 1

/** The pyramids RELAID_FLOORS_VERSION re-lays. */
export const RELAID_PYRAMIDS: readonly RelaidPyramid[] = [
  { journeyId: "expert_1", levelNr: 4 },
  { journeyId: "expert_4", levelNr: 5 },
]

/**
 * Whether a save stands inside a re-laid pyramid. Its saved place names a room of the floor as it was; on the
 * re-laid floor that room can lie past a door the lock has not opened, so the place is forgotten and the save resumes
 * at the entrance. Asked of the pyramid, not the floor: a player up the ward wing comes down onto the re-laid floor.
 * A save standing nowhere yet has nothing to forget.
 */
export const standsInRelaidPyramid = (
  stored: Pick<StoredJourneyStateV3, "journeyId" | "levelNr" | "position" | "positionKey" | "standingKey">,
  relaid: readonly RelaidPyramid[]
): boolean =>
  (stored.position ?? stored.positionKey ?? stored.standingKey ?? null) !== null &&
  relaid.some(pyramid => pyramid.journeyId === stored.journeyId && pyramid.levelNr === stored.levelNr)
```

Run: `yarn vitest run src/app/SiteMap/relaidPyramids.spec.ts`
Expected: PASS, 6 tests.

- [ ] **Step 3: Write the failing tests for the store**

In `src/app/state/useJourneys.spec.ts`:

1. In `describe("standingKey clears wherever positionKey does", …)`, the known-writers list in `"the writers it finds are the ones known, so a probe gone blind or a new writer is noticed"` gains `"setRelaidFloors"` (the probe calls it
   with `[REAL_ID, 2]`, a truthy second argument, so it is found).

2. Add, after `describe("cellKeyVersion as a record of having been through this release", …)`:

```ts
describe("the re-laid pyramids step", () => {
  const stateful = (stored: StoredJourneyStateV3) => {
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    return { api, current: () => state[0] }
  }

  const standing = makeStoredJourney({
    levelNr: 2,
    interiorLevelNr: 2,
    position: "0:1,2",
    positionKey: "main#0/p2",
    standingKey: "main#0/~7",
    exploredCells: { "2:main": ["0/p0", "0/p2"] },
    mechanismStates: { "2:main#0/xmech:lever": "open" },
  })

  it("offers every save not yet stamped, standing anywhere or nowhere", () => {
    const api = makeApi([makeStoredJourney()])

    expect(api.journeysNeedingRelaidFloors().map(j => j.journeyId)).toEqual([REAL_ID])
  })

  it("leaves a save already stamped alone", () => {
    const api = makeApi([makeStoredJourney({ relaidFloorsVersion: RELAID_FLOORS_VERSION })])

    expect(api.journeysNeedingRelaidFloors()).toEqual([])
  })

  it("forgets where a save inside a re-laid pyramid stands, and keeps its level, its exploration and its mechanisms", () => {
    const { api, current } = stateful(standing)

    api.setRelaidFloors(REAL_ID, true)

    expect(current()).toEqual({
      ...standing,
      position: null,
      positionKey: null,
      standingKey: null,
      relaidFloorsVersion: RELAID_FLOORS_VERSION,
    })
  })

  it("only stamps a save that stands elsewhere", () => {
    const { api, current } = stateful(standing)

    api.setRelaidFloors(REAL_ID, false)

    expect(current()).toEqual({ ...standing, relaidFloorsVersion: RELAID_FLOORS_VERSION })
  })

  it("starts a new journey already stamped, so a place taken after the release is kept", async () => {
    let state: StoredJourneyStateV3[] = []
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })

    await api.startJourney({ id: REAL_ID, levelCount: REAL_LEVEL_COUNT } as Parameters<typeof api.startJourney>[0])

    expect(state[0].relaidFloorsVersion).toBe(RELAID_FLOORS_VERSION)
  })
})
```

and add `import { RELAID_FLOORS_VERSION } from "@/app/SiteMap/relaidPyramids"` to the file's imports.

Run: `yarn vitest run src/app/state/useJourneys.spec.ts`
Expected: FAIL: `api.journeysNeedingRelaidFloors is not a function`, `api.setRelaidFloors is not a function`, the
new journey's `relaidFloorsVersion` undefined, and the known-writers list missing `setRelaidFloors`.

- [ ] **Step 4: Write the store's half**

`src/app/state/useJourneys.ts`:

Import beside the other `@/app/SiteMap` imports:

```ts
import { RELAID_FLOORS_VERSION } from "@/app/SiteMap/relaidPyramids"
```

In `StoredJourneyStateV3`, after `mechanismSlotVersion`:

```ts
  /** Which re-laying of shipped pyramids this save has been through (RELAID_FLOORS_VERSION), so the step that
   *  forgets a place on a re-laid floor runs once per save. */
  relaidFloorsVersion?: number
```

In `JourneyAPI`, after `setMechanismSlotBackfill`:

```ts
  /** Saves not yet through the current re-laying of shipped pyramids — see useRelaidFloorsBackfill. */
  journeysNeedingRelaidFloors: () => StoredJourneyStateV3[]
  /** Stamps the save; with `resumeAtEntrance` it also forgets where the save stands, as visitLevel does, and keeps
   *  the level it is on. */
  setRelaidFloors: (journeyId: string, resumeAtEntrance: boolean) => void
```

In `startJourney`'s `newJourney`, after `mechanismSlotVersion: MECHANISM_SLOT_VERSION,`:

```ts
      relaidFloorsVersion: RELAID_FLOORS_VERSION,
```

After `setMechanismSlotBackfill`'s definition:

```ts
// Stamped on every journey, standing or not, so the stamp is the exact record of which saves came through.
const journeysNeedingRelaidFloors = () => journeys.filter(j => j.relaidFloorsVersion !== RELAID_FLOORS_VERSION)

const setRelaidFloors = (journeyId: string, resumeAtEntrance: boolean) => {
  setJourneys(prev =>
    prev.map(j =>
      j.journeyId === journeyId
        ? {
            ...j,
            ...(resumeAtEntrance ? { position: null, positionKey: null, standingKey: null } : {}),
            relaidFloorsVersion: RELAID_FLOORS_VERSION,
          }
        : j
    )
  )
}
```

In the object `createJourneysV3Api` returns, after `setMechanismSlotBackfill,`:

```ts
    journeysNeedingRelaidFloors,
    setRelaidFloors,
```

Run: `yarn vitest run src/app/state/useJourneys.spec.ts src/app/SiteMap/relaidPyramids.spec.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for the launch hook**

Create `src/app/SiteMap/useRelaidFloorsBackfill.spec.ts`:

```ts
// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { StoredJourneyStateV3 } from "@/app/state/useJourneys"
import type { RelaidPyramid } from "./relaidPyramids"
import { useRelaidFloorsBackfill } from "./useRelaidFloorsBackfill"

const RELAID: readonly RelaidPyramid[] = [{ journeyId: "made_up", levelNr: 2 }]

const save = (journeyId: string, levelNr: number): StoredJourneyStateV3 => ({
  journeyId,
  levelNr,
  completionCount: 0,
  active: true,
  exploredSections: {},
  position: null,
  positionKey: "main#0/p1",
  interiorLevelNr: levelNr,
})

const fakeJourneys = (outstanding: StoredJourneyStateV3[]) => ({
  journeysNeedingRelaidFloors: vi.fn(() => outstanding),
  setRelaidFloors: vi.fn(),
})

describe("useRelaidFloorsBackfill", () => {
  it("stamps every outstanding save, and forgets the place only of one inside a re-laid pyramid", () => {
    const journeys = fakeJourneys([save("made_up", 2), save("made_up", 3), save("other", 2)])

    renderHook(() => useRelaidFloorsBackfill(journeys, RELAID))

    expect(journeys.setRelaidFloors.mock.calls).toEqual([
      ["made_up", true],
      ["made_up", false],
      ["other", false],
    ])
  })

  it("runs once, however often the app re-renders", () => {
    const journeys = fakeJourneys([save("made_up", 2)])

    const { rerender } = renderHook(() => useRelaidFloorsBackfill(journeys, RELAID))
    rerender()
    rerender()

    expect(journeys.setRelaidFloors).toHaveBeenCalledTimes(1)
  })

  it("writes nothing when every save is stamped", () => {
    const journeys = fakeJourneys([])

    renderHook(() => useRelaidFloorsBackfill(journeys, RELAID))

    expect(journeys.setRelaidFloors).not.toHaveBeenCalled()
  })
})
```

Run: `yarn vitest run src/app/SiteMap/useRelaidFloorsBackfill.spec.ts`
Expected: FAIL, "Failed to resolve import "./useRelaidFloorsBackfill"".

- [ ] **Step 6: Write the hook and mount it**

Create `src/app/SiteMap/useRelaidFloorsBackfill.ts`:

```ts
import { useEffect, useRef } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { RELAID_PYRAMIDS, standsInRelaidPyramid, type RelaidPyramid } from "./relaidPyramids"

/**
 * Forgets where a save stands when a release has re-laid the pyramid it stands in, once per save, on the first launch
 * that has this code (`relaidFloorsVersion`). A saved place resolves on the new carve, where it can lie past a door
 * the lock has not opened; the save resumes at the entrance instead. Exploration, loot and mechanism states are named
 * by authored address and carry across the re-carve, so nothing else is touched.
 */
export const useRelaidFloorsBackfill = (
  journeys: Pick<JourneyAPI, "journeysNeedingRelaidFloors" | "setRelaidFloors">,
  relaid: readonly RelaidPyramid[] = RELAID_PYRAMIDS
) => {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    const outstanding = journeys.journeysNeedingRelaidFloors()
    if (!outstanding.length) return
    done.current = true
    for (const stored of outstanding) journeys.setRelaidFloors(stored.journeyId, standsInRelaidPyramid(stored, relaid))
  }, [journeys, relaid])
}
```

`src/App.tsx`: import beside the other backfills,

```ts
import { useRelaidFloorsBackfill } from "@/app/SiteMap/useRelaidFloorsBackfill"
```

and after `useMechanismSlotBackfill(journeys)`:

```ts
// After the re-key: a place it derives for a save inside a re-laid pyramid is forgotten with the rest.
useRelaidFloorsBackfill(journeys)
```

Run: `yarn vitest run src/app/SiteMap/useRelaidFloorsBackfill.spec.ts src/app/SiteMap/relaidPyramids.spec.ts src/app/state/useJourneys.spec.ts`
Expected: PASS.

Run: `yarn check-types && yarn lint`
Expected: both exit 0 (lint's `--max-warnings` cap unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/app/SiteMap/relaidPyramids.ts src/app/SiteMap/relaidPyramids.spec.ts src/app/SiteMap/useRelaidFloorsBackfill.ts src/app/SiteMap/useRelaidFloorsBackfill.spec.ts src/app/state/useJourneys.ts src/app/state/useJourneys.spec.ts src/App.tsx
git commit -m "feat(saves): a save inside a re-laid pyramid resumes at its entrance" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 4: Look at it, say so, and the whole gate

**Files:**

- Modify: `CHANGELOG.md` (`## Unreleased`, `### Added`)
- Modify: `docs/game-design/lock-placement.md` (expert_4 site 5 row; "Where the curriculum and the world spec
  disagree", Djoser; "From a row to the world"; the stoneGate row of "Every lock and lesson"; the "Pairs" note on
  stoneGate being unplaced)
- Modify: `docs/game-design/lock-curriculum.md` (the stoneGate row of "The locks"; the expert_4 row of "Expert";
  the sentence under that table)
- Modify: `docs/game-design/world-stability.md` ("What resets and what doesn't": a row)
- Modify: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 6 row; "Open per phase"; a new "Open after
  phase 6")
- Modify: `docs/handover-stonegate.md` (phase 6 row; "Next work"; "Waiting on the designer")
- Modify: `docs/playtest-backlog.md`

- [ ] **Step 1: Look at it**

`git status --short src/data/` must print nothing. Start Storybook on a spare port (6006 is the designer's):

```bash
yarn storybook -p 6116 --ci > /tmp/djoser/storybook.log 2>&1 &
until curl -sf http://localhost:6116/index.json > /tmp/djoser/index.json; do sleep 3; done
grep -o '"id":"[^"]*journeyinspector--inspector"' /tmp/djoser/index.json
```

Take the story id it prints (expected `app-sitemap-journeyinspector--inspector`) and screenshot Djoser's fifth
pyramid, floor 0 (expert is the third tier; expert_4 is `journeyIndex` 3):

```bash
npx playwright@1.61.1 screenshot --viewport-size=1600,1200 --wait-for-timeout=4000 \
  "http://localhost:6116/iframe.html?id=app-sitemap-journeyinspector--inspector&args=tier:expert;journeyIndex:3;pyramidNumber:5" \
  /tmp/djoser/inspector-djoser-5.png
```

Read the screenshot back and describe it in the report: the header names the Pyramid of Djoser, pyramid 5/5; the
floor shows five plates (two holding a stone, two of them in one room by the way out), a torch, the narrow passage,
the loops of the lock, and the floor's own rooms, side paths and the ward wing's stair around it. If the inspector
shows another pyramid, correct `journeyIndex` from its header. Then stop Storybook (`kill %1`).

- [ ] **Step 2: The changelog**

`CHANGELOG.md`, `## Unreleased` → `### Added`, directly after the line "The last pyramid of the Valley of the Kings
opens on a mirror fork with ziplines: …":

```markdown
- Djoser's last pyramid opens on a stone lock: lift the stone off the altar, park one on a shelf, and squeeze through the narrow passage.
```

- [ ] **Step 3: The placement and the curriculum**

Prettier reflows markdown tables: edit table rows by line and read the file back after each edit.

`docs/game-design/lock-placement.md`:

- the expert_4 table, site 5's row becomes
  `| 5 | 1 | 1 | wizard ward wing | **doubleBack** | stoneGate | ✓ |`;
- under "Where the curriculum and the world spec disagree", the **Djoser** bullet becomes: "**Djoser.** stoneGate
  stands on Djoser's last pyramid (site 5, floor 0), where the curriculum suggests doubleBack: the journey's capstone,
  on the floor shape doubleBack already stands on in expert_1, and with no floor keys. The curriculum has no stone
  lesson on any expert site yet, so the player meets stones and the narrow passage first in stoneGate; stoneOnAPlate
  at site 3 or 4 would teach them first.";
- "From a row to the world": the sentence "A lock on a shipped floor re-carves that floor, and saves are keyed by
  authoring address, so placing locks is part of a world reshape release (`docs/instructions/world-reshape-release.md`)."
  becomes "A lock on a shipped floor re-carves that floor. Saves name rooms by authoring address, so exploration and
  loot carry across; only where a save stands does not, so the pyramid joins `RELAID_PYRAMIDS`
  (`src/app/SiteMap/relaidPyramids.ts`) and `RELAID_FLOORS_VERSION` goes up by one, and a save inside it resumes at
  its entrance once.";
- after the paragraph on expert_1's doubleBack, add: "expert_4's stoneGate stands the same way, read from its
  `.lock` file with `catalogueLock` and every region `free` (`freeRegions`), bound `weights` `stonePlate`,
  `activator` `torch`, `unladen` `narrowPassage`.";
- "Every lock and lesson", the stoneGate row: its second cell becomes `expert capstone (Djoser 5), stones` and its
  last cell `solvable`;
- under "Pairs", "(observatory, relay; stoneGate is unplaced)" becomes "(observatory, relay), and stoneGate at
  Djoser's capstone".

`docs/game-design/lock-curriculum.md`:

- "The locks", the stoneGate row: `| stoneGate | expert capstone (Djoser) | lifting the stone off the altar opens the back way and shuts the way in; park a stone on a shelf to fit through the narrow passage; both stones spent twice |`;
- "Expert", the expert_4 row: `| expert_4 (5) | doorWaitsForTwo · twoLamps · cellar · overlook · **stoneGate** |`;
- the sentence under that table, "Every lock in a journey leans only on lessons that journey or junior has taught.
  doubleBack closes three of the four." becomes "Every lock in a journey leans only on lessons that journey or junior
  has taught, but one: stoneGate, which closes expert_4, meets stones and the narrow passage before any lesson does.
  doubleBack closes expert_1 and expert_3."

- [ ] **Step 4: The save table**

`docs/game-design/world-stability.md`, "What resets and what doesn't": add a row after "A section is hidden" (edit by
line, read back):

```markdown
| A lock is placed on a floor | Only the lock's own rooms; a save inside that pyramid resumes at its entrance, once | No |
```

- [ ] **Step 5: The roadmap and the handover**

`docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (edit by line, read back):

- the phase 6 row: `**Djoser**` becomes `**Djoser** (done <date>, [plan](2026-10-09-stonegate-phase-6-djoser.md))`, and
  its "Ships" cell `stoneGate on expert_4 pyramid 5, floor 0, through floorLocks; a save inside a re-laid pyramid resumes at its entrance`;
- the "Phase plans" line gains ` · [phase 6, Djoser](2026-10-09-stonegate-phase-6-djoser.md)`;
- "Open per phase": delete the **Phase 6** bullet;
- add above "## Open per phase":

```markdown
## Open after phase 6

- No stone lesson stands before Djoser's capstone: the player meets stones and the narrow passage first in stoneGate.
  stoneOnAPlate at Djoser site 3 or 4 is the obvious place (designer's pick).
- The header comment of `src/game/locks/stoneGate.lock` still says "not placed yet, not buildable yet"; it is the
  designer's text.
- `RELAID_PYRAMIDS` lists expert_1 pyramid 4 and expert_4 pyramid 5 under `RELAID_FLOORS_VERSION` 1. A later lock on a
  shipped floor adds its pyramid and bumps the version.
```

`docs/handover-stonegate.md`:

- the table row `| 6 Djoser | **Next, not planned.** …` becomes `| 6 Djoser | **Done.** Plan: \`docs/superpowers/plans/2026-10-09-stonegate-phase-6-djoser.md\`. stoneGate on expert_4 pyramid 5, floor 0. |`
  (edit by line; read back);
- "Next work, in order": delete item 2 (Phase 6);
- "Waiting on the designer", "Unanswered": add "- correct the header comment of `stoneGate.lock` (\"not placed yet,
  not buildable yet\") now it stands in Djoser?" and under "Lock placement" add "stoneOnAPlate before Djoser's
  capstone (site 3 or 4)".

- [ ] **Step 6: The playtest backlog**

Add at the top of `docs/playtest-backlog.md`, below the intro paragraph:

```markdown
## stoneGate phase 6 — Djoser

- **Pyramid of Djoser, pyramid 5 (develop mode to jump there).** The main floor opens on stoneGate among its own
  rooms and side paths: play it to the end and leave by the way out. Do the plates, the torch and the passage read
  at a glance on a full floor? Leave mid-way, take the ward wing's stair and come back down: every stone where you
  set it.
- **A save from before this release, standing inside that pyramid** (or the Valley of the Kings' last): it resumes
  at the entrance, with every room it had explored still explored.
```

- [ ] **Step 7: Commit the docs and the changelog**

```bash
git add CHANGELOG.md docs/game-design/lock-placement.md docs/game-design/lock-curriculum.md docs/game-design/world-stability.md docs/superpowers/plans/2026-10-06-stonegate-roadmap.md docs/handover-stonegate.md docs/playtest-backlog.md
git commit -m "docs: stoneGate stands in Djoser, a re-laid pyramid resumes at its entrance" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 8: The whole gate in a clean worktree**

```bash
git worktree add /tmp/stonegate-phase6 HEAD && cd /tmp/stonegate-phase6 && yarn install --immutable && yarn verify && yarn verify-content && yarn build
```

Expected: all pass but the three known `puzzleSeeds.verify.ts` failures. If `yarn verify`'s `lint --fix` rewrote a
file, copy the change back, commit it ("style: lint") in the real worktree, and run the gate again. If betterer
reports moved line positions, run `yarn betterer:update` in the real worktree and commit `.betterer.results`
("chore: refresh the betterer line positions"). Then `cd -`, `git worktree remove /tmp/stonegate-phase6`,
`git push`, and check `gh pr checks` if a PR exists for the branch.

---

## Self-review notes

- **Roadmap phase 6 row:** stoneGate on an `expert_4` floor through `floorLocks` (task 1); save impact settled (the
  migration ruling; tasks 2 and 3). "Open per phase", Phase 6: the pyramid and floor (ruling), the realisations (D3).
- **Spec §3:** the plain bake changes only the floor the lock stands on (task 1 step 5); the carve is identical with
  the mod off (task 1 step 6, `toggleOff`, `carveNeverDependsOnAMod`). **Spec §5:** a save without stone state reads
  the authored start (the save ruling, point 2; nothing to build). **"Done when"** is the dev floor's; the roadmap's goal, playing
  stoneGate on a real pyramid floor, is the playtest backlog entry (task 4 step 6).
- **Placement table:** "Chosen lock" and "Placed" filled for expert_4 site 5 (task 4 step 3).
- **Review Focus → tests:** 1 task 3 ("forgets where a save inside…") and task 2; 2 `relaidPyramids.spec.ts` (ward
  wing); 3 task 3 ("leaves a save already stamped alone", "starts a new journey already stamped"); 4
  `relaidPyramids.spec.ts` (other pyramid, other journey, nowhere yet) and "only stamps a save that stands elsewhere";
  5 the bake and `yarn verify-content` (task 1), the look (task 4).
- **Type consistency:** `RelaidPyramid`, `RELAID_FLOORS_VERSION`, `RELAID_PYRAMIDS`, `standsInRelaidPyramid(stored, relaid)` (task 3 step 2) are read by `useJourneys.ts` (the version) and `useRelaidFloorsBackfill(journeys, relaid)`
  (step 6); `journeysNeedingRelaidFloors()` and `setRelaidFloors(journeyId, resumeAtEntrance)` (step 4) by the hook
  and its spec; `relaidFloorsVersion` on `StoredJourneyStateV3`.
- **Not covered:** the fog a remembered room lifts beyond a shut door after any re-carve (cosmetic, every re-carve);
  a save that skipped the capture release re-keying coordinates on these two floors (the reshape release's gap); the
  travel map's floor summary until the floor's next visit.
