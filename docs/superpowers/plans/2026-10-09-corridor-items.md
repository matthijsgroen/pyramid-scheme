# Corridors carry items, aligned — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Ready to run.** The spec was approved by the designer on 2026-10-09. The designer's later decisions of the same day
> (the four Claude-designed locks the compile verdict marks ✗ are fixed, not renamed; doubleBack's twin folds with no
> save migration) are folded in below. A task that meets something its "Check what this task stands on" step does not
> expect stops and reports; it never re-decides a ruling.

**Goal:** a lock's corridor carries an ordered list of items (gates, the narrow passage, one drop, the nest spot); a
second line on one pair is a second corridor; dashes round a gate say how close it stands to its neighbours; `<<` is
a drop read right to left. Compile, plan, lay and seat follow; the walk already does. `yarn lock` says whether a lock
compiles. doubleBack is read from its `.lock` file everywhere, and the four Claude locks the new verdict refuses are
fixed so the whole catalogue but masonsRamp reads ✓.

**Architecture:** the notation tokenises a connection line into regions and items (`readJoins`, `lockNotation.ts`)
and writes `LockConnection.align`. `compileLock` numbers a pair's corridors (drop-only corridors excluded), writes
`at.corridor` on a gate of corridor `k > 0`, and a `barrierOrder` entry (with `corridor`, `align`, and the drop where
it stands) for every corridor with more than one item or an aligned one. On the floor, one reader,
`floorCorridors` (`obstacles.ts`), turns layout connections plus falling-corridor `barrierOrder` entries into
corridors; `topologyFaults`, `barrierRuns` and `planLockFloor` read corridors through it. A falling corridor is
planned as its drop plus a stretch on each side, each stretch a `PlanCorridor` to a one-node plan region
(`answersTo` its real region), so `layLockPlan` lays it with the machinery it has. `seatLaidFloor` stands doors by a
pure gap rule, `seatItems` (`laidFloor.ts`), which is today's placement when nothing is aligned.

**Tech Stack:** TypeScript, Vitest (`yarn vitest run <files>`, `yarn verify-content`), `yarn run lock`
(`scripts/lock.ts`, `scripts/lockTable.ts`), `yarn generate-world` (Node bake).

**Spec:** `docs/superpowers/specs/2026-10-09-corridor-items-design.md` (every section; "Done when"). **Contract:**
`docs/mods/mechanic-contract.md`. **Topology:** `docs/mods/floor-topology-design.md`. **Handover:**
`docs/handover-stonegate.md`.

**Written against `5e62139e`** (branch `topology/mechanics`). Every path and symbol below was checked there; find
each edit by the symbol named beside it, not by line number. The two untracked files at the repository root
(`circle.lock`, `stoneGate.lock`) are the designer's scratch: never stage them. Stage strictly by path, never
`git add -A` or `git add .`.

**A concurrent agent is placing lessons in the world** (`src/worldGen/spec/*.ts`, `src/data/generatedWorld.ts`,
`docs/game-design/lock-placement.md`, and the verifies that count lock floors). At `5e62139e` its work sat
uncommitted in this worktree (`junior.ts`, `generatedWorld.ts`, `carveLedger.json`, `tierFingerprints.json`, three
verifies). Never stage, edit, stash or restore a file it is working on. Task 1 checks it has committed; every bake
proof is floor by floor against the then-current `HEAD`.

Scratch files go in `$S`:

```bash
S=/private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-portal-zinc/91db0f47-ea1f-450c-8ae4-d5507da7217a/scratchpad
mkdir -p $S
```

## What was measured before writing this

**`checkLock` on the catalogue at `5e62139e`**, and with every drop-only connection removed from `connections` (which
is what such a corridor compiles to once corridors carry items; the JSON-compatibility reading of spec section 2):

| lock                     | refused now                                                    | with drop-only corridors compiled as drops                                               |
| ------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| doubleBack               | `connectionRepeated` leftLower–in                              | nothing                                                                                  |
| seesaw                   | `connectionRepeated` east–in                                   | nothing                                                                                  |
| counterweight            | `connectionRepeated` gallery–chamber, `edgeGateUnnamed` behind | nothing                                                                                  |
| clockwork                | `connectionRepeated` west–in                                   | `gateOwnedTwice` in-west (Y), `gateOwnedTwice` in-out (Y), `gateOwnedOffSeam` in-out (Y) |
| lamplighter              | `connectionRepeated` east–in                                   | `gateOwnedOffSeam` in-east (Y)                                                           |
| observatory              | `connectionRepeated` west–in                                   | `gateOwnedOffSeam` in-north (Y)                                                          |
| relay                    | `oneWaySharesConnection` r3–in                                 | the same (a falling corridor: measured once it compiles, task 11)                        |
| lessons/boardPicksTheWay | `gateOwnedOffSeam` in-out (Y)                                  | the same                                                                                 |
| every other lock, lesson | nothing                                                        | nothing                                                                                  |

The simulation ran `checkLock`, whose topology call passes `{ laid: true }`, so **phase 4's laid-floor seat rules
(`forkSeams(…, { laid: true })`) are already applied and do not accept the four**: a fork's seams are the corridors
leaving its region that the route does not take, and in all four the fork gates a corridor on the route (clockwork
also has the fork and the lever owning one gate). So all four are fixed (task 11).

**The fixes, measured** with the same simulation plus `lockChecks` (`scripts/lockTable.ts`) and `solveLock`:

| lock             | change (smallest that keeps the trick)                                                                          | faults | sound | cheapest | `lockQuality` notes                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ------ | ----- | -------- | --------------------------------------------------------------- |
| boardPicksTheWay | `in -[Y]- out` → `in -- out`; add `in -[Y]- right`                                                              | none   | ✓     | 0        | under two actions; gate in-right does nothing                   |
| lamplighter      | `in -[Y]- east -[A+B]- out` → `in -[Y]- east` and `in -[A+B]- out`                                              | none   | ✓     | 3        | drop west>east an optional shortcut (the header's own claim)    |
| observatory      | `in -[Y]- north -[L+K]- out` → `in -[Y]- north` and `in -[L+K]- out`                                            | none   | ✓     | 3        | gate in-north does nothing; drop east>west an optional shortcut |
| clockwork        | `in -[Y+A:a]- west` → `in -[Y]- -[A:a]- west`; `in -[Y+A]- out` → `in -[A]- out`; add `in -[Y]- east`, `east *` | none   | ✓     | 2        | gate in-east does nothing                                       |

Clockwork without `out >> west` loses west for good (`✗ a region is lost`), so that line stays. A fork with one arm
is refused at the carve (`fewerThanTwoSeams`), which is why clockwork and boardPicksTheWay gain a second arm.

**The made-up test locks used below all walk sound** at `5e62139e` (written without alignment, which the parser cannot
read yet): two gated corridors on one pair (1 action), a gate then a drop (0), a drop between two gates owned by one
lever, and all of them together. A falling corridor's stretch is named `in|pit#1.1` by `walkSpecOf`.

**The walk ignores a `oneWays` entry no connection names** (`walkSpecOf` reads only `lock.connections`); compile
already emits it as a drop. Test fixtures (`mirrorForkLock`, `src/game/testSupport/lockFixtures.ts`) are written that
way. Left as it is (spec section 6: the walk needs no change); listed under "Open after".

**Where the code reads a pair, not a corridor**, at `5e62139e`: `lockFaults` (`connectionRepeated`), `translate`
(`barrierOrder` by connection), `topologyFaults` (`joined`, `gatedJoins`, `barrierOrderFaults` keyed by pair),
`barrierRuns`, `planLockFloor` (`gatesOn`, `stated`, region-door seats per layout connection), `doorsOnCorridor`
(door seats matched by entrance only), `corridorSplit` (doors packed from `firstDoor`). `regionRoute` and
`offRouteChains` already tolerate a repeated pair (a neighbour list and a `Set`). The assembler takes a laid floor's
gate cells from `laid.gateDoor` by gate id and its drops from `laid.drops`, so a gate on a falling stretch needs only a
`gateDoor` entry; the carve-agreement checks (`gateKeys` bounds, `dropLandingFaults`) read runs by pair.

**Betterer** (`.betterer.ts`) counts `§` in a `src` comment and a quoted mod family id (`"torch"`, `"handle"`, …) in
core source: write neither.

## Decisions (settled)

Binding (designer, unless noted). Each names the task that builds it.

- **D1. The spec as approved**: items in order, `<<`, alignment by dashes, repeated pairs, falling corridors, the gap
  rule, `yarn lock` printing `corridors:` and the compile verdict (tasks 2-11).
- **D2. The four locks the verdict marks ✗ are fixed, not renamed `-blocked`** (designer): clockwork, lamplighter,
  observatory, lessons/boardPicksTheWay, all Claude's. The smallest change that keeps each lock's trick; `yarn run lock` ✓ after (task 11). Only doubleBack and stoneGate are the designer's; neither is edited.
- **D3. doubleBack compiles as written at `0ae27925`**; its TS twin `src/worldGen/spec/locks/doubleBack.ts` is
  deleted; `expert.ts` and `dev.ts` read `freeRegions(catalogueLock("doubleBack"))`; `expert_1`'s last pyramid
  (pyramid 4) re-bakes to the designer's lock (task 12).
- **D4. No save migration** (designer): `RELAID_FLOORS_VERSION` stays 1; no save is rewritten.
- **D5. No new changelog entry** (spec section 9): "The Valley of the Kings' last pyramid has a zipline back into the
  lever chamber…" is already under Unreleased and becomes true of the designer's lock here; the lock fixes are not
  placed and not user-facing.
- **D6. Tests use made-up locks only**, never a catalogue lock's contents; `yarn run lock` checks the catalogue.
  Count work, never wall-clock.
- **D7. Stable world**: the bake differs from its baseline in `expert_1` pyramid 4 floor 0 only (and in a floor
  standing one of the four fixed locks, if the concurrent agent placed one by then); every carve-ledger change is a
  `"hash"` line; the tier fingerprint of each moved tier is refreshed as a deliberate act (precedent `52b3d536`,
  `087377ca`).
- **D8. Mod off = same carve, bare nodes, open corridors** for every new shape (spec section 8; task 9).

## Rulings made without the designer

- **Ruling: a falling corridor's stretches answer wholly to the region each hangs from.** The upstream stretch, its
  doors and its ledge are labelled the region the drop falls from; the downstream stretch and its landing the region
  it leads to. — Why: the spec's node-to-region rule reads "past the first door, the far region"; a stretch's far end
  is its drop's end, which belongs to the region the stretch hangs from. Labelling the ledge as the landing region
  would join the two regions by a two-way walk in the carve, and `adjacencyFaults` (`carveAgreement.ts`) would refuse
  it `regionAttachedThrough`, since the layout joins them by no connection. — Cost if wrong: the `answersTo` of the
  two synthetic regions in `planLockFloor`, two lines.
- **Ruling: the ledge and the landing are plan regions of one node, ids `<drop>:ledge` and `<drop>:landing`, with
  `answersTo` set**; each stretch is a `PlanCorridor` from its real region to that node (upstream) or from that node
  to its real region (downstream); the drop runs between them. Such a region takes no extra node in the lay and no
  lengthening. — Why: `layLockPlan` already lays regions, corridors, pinned drops and loop-closing corridors; three
  small guards reuse all of it. — Cost if wrong: a dedicated lay step for a fall.
- **Ruling: a corridor index counts the corridors that compile to a layout connection or a falling corridor, in
  written order; a drop-only corridor has none.** On the floor, a pair's falling corridors keep the index their
  `barrierOrder` entry states, and its layout connections take the remaining indices in order. — Why: the spec's
  rule; it keeps every placed lock's fragment free of a `corridor` field (doubleBack's `leftLower >> in` is
  drop-only). — Cost if wrong: one counter in `translate` and one in `floorCorridors`.
- **Ruling: the first layout corridor of a pair keeps the id `from>to` and is the one on the route; corridor `k` of
  the pair is `from>to~k`.** — Why: spec section 4; `~` appears in no drop or gate id (`#` does). A falling corridor
  is never on the route, so "corridor 0 is on the route" is read as "the pair's first layout corridor". — Cost if
  wrong: the id format, one line.
- **Ruling: a region barrier's door seat names its corridor (`corridor: <PlanCorridor id>`) only where its pair has
  two or more corridors**; `doorsOnCorridor` matches a seat with no `corridor` by entrance alone. A falling corridor's
  stretch gets no region door. — Why: without it, each of two corridors into a barred region would take both doors;
  with it always written, every existing plan's seats would change. A drop launching from a barred region gets no door
  today either. — Cost if wrong: one field.
- **Ruling: a fork's gate on a falling corridor is never refused `gateOwnedOffSeam`.** — Why: the parse already
  requires a fork's gate to be first on a join leaving its region, and `forkGateNotFirst` keeps a JSON order honest;
  the seam set (`forkSeams`) is about layout connections, which a falling corridor is not. — Cost if wrong: one
  condition in `topologyFaults`.
- **Ruling: the junction end of a corridor is its `from` when `from` is a junction region, else its `to` when `to`
  is one.** That gap is closed; the default gap is the one at the other end. — Why: exactly today's `corridorSplit`
  (`firstDoor = k - m` only when `to` is a junction region and `from` is not), so a corridor joining two junction
  regions seats as now. — Cost if wrong: one expression in `corridorSeats`.
- **Ruling: a gate on a falling corridor bounds no region in the carve-agreement check, and a drop whose falling
  corridor carries a gate downstream of it is not asked `dropLandsApart`.** — Why: such a gate stands on a stretch of
  its own region, and such a drop lands on its stretch by construction, not in the region's ground; the lay test
  (task 8) pins the landing. `gateDoorMisplaced` still checks every door separates two grounds. — Cost if wrong: two
  filters in `siteAssembler.ts`.
- **Ruling: the compile verdict is printed after the parse's refusals and drafts, before reachability**, as
  `✓ compiles` or `✗ refused: <type> <key>=<value> …` for the first fault (`describeLockFault`). — Why: the table
  shows the first `✗`; a lock that does not compile cannot be baked, which outranks how it walks. — Cost if wrong:
  move one line.
- **Ruling: the `corridors:` block writes a gate's alignment back as `-[A]---` (left), `---[A]-` (right),
  `--[A]--` (centre)**, a state the owner opens in by its default (no suffix) when it is the owner's second state, a
  drop as `>>` or `<<` by its direction against the written pair, and `-&>` where the lock's nest spot is that pair in
  that direction. — Why: the shortest text that reads back to the same connection. — Cost if wrong: `corridorLine`.
- **Ruling: the four fixes are the measured table above, and clockwork's header is rewritten** (its old text says the
  exit wants the board; it no longer does). The other three headers stay true and stay. — Why: D2; the handover
  allows correcting a Claude lock's header. — Cost if wrong: the text of four files.
- **Ruling: the parse's "already joined by a corridor" refusal is retired.** Two bare corridors on one pair are two
  open corridors; a bare corridor beside a nest spot is `nestSpotShared`. — Why: spec, "a repeated pair is a second
  corridor". — Cost if wrong: one check.
- **Ruling: a hyphenated word on a connection line (`left-lower`) is still refused as a region name**, before the
  dashes are read as a corridor. — Why: keeps the existing message for the common typo. — Cost if wrong: one regex.

## Global Constraints

- **PATH:** `export PATH="$HOME/.asdf/shims:$PATH"` first; `/usr/local/bin/node` is broken.
- **Shell:** commands are POSIX; in fish, wrap a command in `bash -c '…'`.
- **`yarn run lock`**, not `yarn lock`; vitest only as `yarn vitest run <files>`; the content sweeps as
  `yarn verify-content` or `yarn vitest run --config vitest.verify.config.ts <files>`.
- **One bake, one gate, at the end (designer).** Tasks 1-11 run only their own focused specs
  (`yarn vitest run <files>`), `yarn check-types` and `yarn lint`: no `yarn generate-world`, no `yarn verify-content`,
  no `vitest.verify.config.ts` file, no clean worktree. Task 12 bakes once, proves the world floor by floor, refreshes
  the carve ledger and the tier fingerprints, runs the content verifies, and runs the clean-worktree gate.
- **Review weight:** each task says `light` (mechanical: the reviewer checks it matches the plan) or `full`
  (soundness: notation grammar, topology, lay and carve, walk — the reviewer reasons about inputs the tests do not
  name).
- **The carve ledger:** any edit to a file in the carve's source graph (`src/game/**`, `src/worldGen/**`,
  `src/mods/**` that `siteAssembler.ts` reaches — even a comment) moves every `"hash"` line in
  `src/data/carveLedger.json`. It stays stale through tasks 2-11 and is refreshed once, hash-only, by task 12's
  bake. A carve-graph edit after that bake (a review fix, a lint fix) means `yarn generate-world` again and a commit
  `chore: refresh the carve ledger hashes`.
- **Stable world:** D7. `git status --short src/data/` prints nothing before a bake; a bake made with `INCLUDE_DEV=1`
  is never committed.
- **Tier fingerprints:** when a tier's baked floors move, run
  `yarn vitest run --config vitest.verify.config.ts src/data/tierFingerprints.verify.ts`, copy the new hash its
  failure names into `src/data/tierFingerprints.json` for that tier only, and commit it with the bake.
- **`.lock` files** change only in task 11 (four files). doubleBack and stoneGate are never edited.
- **Tests** use made-up locks only; no duration asserts; a test name carries the claim, no doc-comment block above a
  test.
- **Comments state the current rule and why**, never history; no `§` in a `src` comment; no quoted mod family id in
  core source.
- **Known failures, not yours:** `src/mods/puzzleSeeds.verify.ts` may fail its 3 known tests ("the switch's three
  shapes…", "owes the switch a board…", "names the floor and the shape…"). Leave them.
- **Storybook**, if ever started: never on port 6006 (the designer's); run it in the background on a spare port and
  stop it by that port (`lsof -ti tcp:<port> | xargs kill`).
- **Never force-push. Never `git stash` bare.** Before each commit run `git status --short` and stage only the files
  the task lists.
- **Commits:** one short line, then the trailer lines exactly:
  ```
  git commit -m "<type(scope)>: <what changed>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
  ```

## Review Focus

1. **A corridor nobody aligned, at a junction end, at both ends, or at neither.** Its doors must stand on exactly the
   nodes they stand on now, or every laid floor moves. Test: task 6, "seats free items where the carve seats them
   now", over `m` 0..4, `k` m..m+5, every junction end; and task 12's floor-by-floor bake diff.
2. **A barred region joined to one neighbour by two corridors.** Each corridor needs its own region door, or one
   corridor is an open way past the barrier. Test: task 7, "gives a barred region a door on each corridor from one
   neighbour".
3. **A `<<` falling corridor with an aligned gate.** Read in travel order the items reverse, so "left" (toward the
   region written first) must flip to the stretch's own orientation. Test: task 4, `fallingStretches` table, the
   reversed rows.
4. **A gate with an open corridor beside it, and a gate on a falling corridor beside an open one.** The first is
   `gateBypassed`; the second is not, because a falling corridor is never walked both ways. Test: task 4, both cases.
5. **The topology mod off with every new shape on one floor.** Same walls, doors open, drops plain. Test: task 9,
   `corridorItemsFloor` in `carveNeverDependsOnAMod.spec.ts`.

---

### Task 1: Check what the work stands on; take the baselines

**Review weight:** light (mechanical).

**Files:**

- Create: `$S/parse.ts`, `$S/check.ts` (scratch, never committed)
- Test: none. The baselines are what tasks 2, 11, 11 and 12 compare against.

**Interfaces:**

- Consumes: nothing.
- Produces: `$S/parse-before.json`, `$S/check-before.json`, `$S/lock-before.txt`, `$S/head-at-start.txt`.

- [ ] **Step 1: The concurrent agent has committed, and the bake is clean**

```bash
export PATH="$HOME/.asdf/shims:$PATH"
git log --oneline -8
git status --short
git status --short src/data/ src/worldGen/ docs/game-design/lock-placement.md
git rev-parse HEAD > $S/head-at-start.txt
```

Expected: `git status --short` shows at most `?? circle.lock` and `?? stoneGate.lock`. If anything under `src/data/`,
`src/worldGen/`, `src/mods/topology/*.verify.ts` or `docs/game-design/lock-placement.md` is modified, the concurrent
agent is mid-work: stop and report; do not touch, stage, stash or restore those files.

- [ ] **Step 2: The designer's doubleBack is the one the spec measured**

```bash
git diff 0ae27925 -- src/game/locks/doubleBack.lock
ls src/worldGen/spec/locks/doubleBack.ts
grep -rn 'doubleBackLock' src | grep -v '^src/data/'
grep -rn 'catalogueLock("\(clockwork\|lamplighter\|observatory\|relay\)")\|lessonOnMainFloor("boardPicksTheWay")\|lessonFloor("boardPicksTheWay")' src/worldGen/spec
```

Expected: no diff; the twin exists; `doubleBackLock` is named in `src/worldGen/spec/dev.ts`, `src/worldGen/spec/expert.ts`,
`src/worldGen/spec/locks/doubleBack.ts` and `src/worldGen/devJourney.verify.ts` only. Note any placement the last
grep finds: that floor will move in task 12's bake and is added to its expected list.

- [ ] **Step 3: The baselines**

`$S/parse.ts`:

```ts
import {
  LESSONS,
  LOCK_CATALOGUE,
} from "/Users/matthijsgroen/.warp/worktrees/pyramid-scheme/portal-zinc/src/game/lockCatalogue"
const all = { ...LOCK_CATALOGUE, ...Object.fromEntries(Object.entries(LESSONS).map(([k, v]) => [`lessons/${k}`, v])) }
console.log(JSON.stringify(all, null, 1))
```

`$S/check.ts`:

```ts
import {
  LESSONS,
  LOCK_CATALOGUE,
} from "/Users/matthijsgroen/.warp/worktrees/pyramid-scheme/portal-zinc/src/game/lockCatalogue"
import { checkLock } from "/Users/matthijsgroen/.warp/worktrees/pyramid-scheme/portal-zinc/src/game/lockCompile"
const all = { ...LOCK_CATALOGUE, ...Object.fromEntries(Object.entries(LESSONS).map(([k, v]) => [`lessons/${k}`, v])) }
for (const [name, { lock }] of Object.entries(all))
  console.log(name.padEnd(26), JSON.stringify(checkLock(lock).map(f => (f.type === "topology" ? f.fault : f))))
```

```bash
yarn tsx $S/parse.ts > $S/parse-before.json
yarn tsx $S/check.ts > $S/check-before.json
yarn run lock > $S/lock-before.txt 2>&1; echo "exit $?"
grep -c '✓$' $S/lock-before.txt
grep '✗' $S/lock-before.txt
```

Expected: `$S/check-before.json` matches the first column of the table under "What was measured"; the lock table's
only `✗` is `masonsRamp … ✗ never reached: out`; exit 1 (masonsRamp).

---

### Task 2: The notation reads corridors and their items

**Review weight:** full (soundness: notation grammar).

**Files:**

- Modify: `src/game/lockAuthoring.ts` (`Alignment`, `LockConnection`, `alignOf`, the `LockConnection` and `LockOneWay`
  comments)
- Modify: `src/game/lockNotation.ts` (`LOCK_SYNTAX`, `readJoins`, `join`, connection assembly; `EDGE` goes)
- Test: `src/game/lockNotation.spec.ts`, `src/game/nestSpot.spec.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `export type Alignment = "left" | "right" | "center"` and
  `alignOf(connection: LockConnection): Readonly<Record<BarrierId, Alignment>>` from `lockAuthoring.ts`;
  `LockConnection`'s object shape gains `readonly align?: Readonly<Record<BarrierId, Alignment>>`. A drop's id,
  `>>` or `<<`, is `launch>landing`: its direction of travel.

- [ ] **Step 1: Write the failing tests**

In `src/game/lockNotation.spec.ts`, in the big `it.each([...])("refuses %j", …)` table of `parseLock`: delete the row
`["in -- out\nout -- in", "line 2: out and in are already joined by a corridor on line 1"]`, and change the row
`["in -- -[H]- out", "line 1: -- is a bare corridor and carries no barriers"]` to
`["in -- -[H]- out", "line 1: -- is a bare corridor, exactly two dashes, and carries no items"]`. Then append:

```ts
describe("a corridor's items", () => {
  it.each([
    ["-[A]-", undefined],
    ["--[A]--", "center"],
    ["---[A]---", "center"],
    ["-[A]--", "left"],
    ["-[A]---", "left"],
    ["---[A]-", "right"],
    ["--[A]---", "left"],
  ])("reads %s as aligned %s", (gate, side) => {
    const { lock } = parseLock(`in ${gate} out\nA toggle @in`)
    expect(lock.connections[0]).toEqual({
      between: ["in", "out"],
      barriers: ["in-out"],
      ...(side ? { align: { "in-out": side } } : {}),
    })
  })

  it("reads << as a drop from the region on its right, named by its direction of travel", () => {
    const { lock } = parseLock("in -- out\nin << pit\npit -- out")
    expect(lock.oneWays).toEqual({ "pit>in": { from: "pit", to: "in" } })
    expect(lock.connections[1]).toEqual({ between: ["in", "pit"], barriers: ["pit>in"] })
  })

  it("reads a gate before a << drop as standing beside the region the drop leads to", () => {
    const { lock } = parseLock("in -[Y]- << hall\nin -- out\nhall -- out\nY toggle @in")
    expect(lock.connections[0]).toEqual({ between: ["in", "hall"], barriers: ["in-hall", "hall>in"] })
  })

  it("reads two lines on one pair as two connections, the first written first", () => {
    const { lock, refused } = parseLock("in -[Y]- hall\nhall >> in\nhall -- out\nY toggle @in")
    expect(refused).toEqual([])
    expect(lock.connections.slice(0, 2)).toEqual([
      { between: ["in", "hall"], barriers: ["in-hall"] },
      { between: ["hall", "in"], barriers: ["hall>in"] },
    ])
  })

  it("reads two bare lines on one pair as two open corridors", () => {
    expect(parseLock("in -- out\nout -- in").lock.connections).toEqual([
      ["in", "out"],
      ["out", "in"],
    ])
  })

  it("reads a chain as two connections joined at the region between", () => {
    const { lock } = parseLock("in -- out\nin -- west\nwest >> east >> in")
    expect(lock.connections.slice(2)).toEqual([
      { between: ["west", "east"], barriers: ["west>east"] },
      { between: ["east", "in"], barriers: ["east>in"] },
    ])
  })

  it("reads a chain that comes back to a region as a second corridor on its pair", () => {
    const { lock } = parseLock("in -[X]- out -[Y]- in\nX toggle @in\nY toggle @in")
    expect(lock.connections).toEqual([
      { between: ["in", "out"], barriers: ["in-out"] },
      { between: ["out", "in"], barriers: ["out-in"] },
    ])
  })

  it("reads a line with no space between a region and an item as one with spaces", () => {
    expect(parseLock("in-[S]->>hall\nhall -- out\nS toggle @in").lock).toEqual(
      parseLock("in -[S]- >> hall\nhall -- out\nS toggle @in").lock
    )
  })

  it("writes no align on a lock that aligns nothing", () => {
    const { lock } = parseLock("in -[A]- hall -[B]- out\nhall >> in\nA toggle @in\nB toggle @hall")
    expect(lock.connections.some(c => "between" in c && c.align !== undefined)).toBe(false)
  })

  it.each([
    ["in -[A]---[B]- out\nA toggle @in\nB toggle @in", "line 1: items on a corridor stand apart: write -[A]- -[B]-"],
    ["in -[A]->> out\nA toggle @in", "line 1: items on a corridor stand apart: write -[A]- >>"],
    ["in [A] out\nA toggle @in", "line 1: a gate stands between dashes: write -[A]-"],
    ["in -[A] out\nA toggle @in", "line 1: a gate stands between dashes: write -[A]-"],
    ["in -[A]- -- out\nA toggle @in", "line 1: -- is a bare corridor, exactly two dashes, and carries no items"],
    ["in --- out", "line 1: -- is a bare corridor, exactly two dashes, and carries no items"],
    ["in ->> out", 'line 1: cannot read "->>" on a corridor: an item is -[…]-, >>, << or -&>'],
    ["in -<<- out", 'line 1: cannot read "-<<-" on a corridor: an item is -[…]-, >>, << or -&>'],
    ["in >> -[A]- >> out\nA toggle @in", "line 1: a corridor falls once: put a region between two drops"],
    ["in >> << out", "line 1: a corridor falls once: put a region between two drops"],
  ])("refuses %j", (text, message) => {
    expect(() => parseLock(text)).toThrow(message)
  })
})
```

In `src/game/nestSpot.spec.ts`, replace the test
`"is a corridor, so a second corridor beside it is refused: %j"` with:

```ts
it.each(["in -- hall\nin -&> hall", "in -&> hall\nin -- hall"])(
  "is a corridor of its own, so a second corridor beside it is refused nestSpotShared: %j",
  text => {
    const line = text.split("\n").indexOf("in -&> hall") + 1
    expect(parseLock(`${text}\nhall -- out`, "twin").refused).toEqual([
      `line ${line}: nestSpotShared: in and hall have another connection, and a nest spot is a corridor of its own`,
    ])
  }
)
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockNotation.spec.ts src/game/nestSpot.spec.ts`
Expected: FAIL — the alignment rows (`-[A]--` is not read), `<<`, the bare twin, the new refusals and the nest-spot
twin (still thrown as "already joined").

- [ ] **Step 3: The shared Lock carries alignment**

`src/game/lockAuthoring.ts`, after `export type MechanicId = string`:

```ts
/**
 * Where an author stands a gate on its corridor, written with dashes: `left` right after what is written left of it
 * (a region or another item), `right` right before what is written right of it, `center` with room for puzzles on
 * both sides. A gate it does not name is free: the carve decides. It is a preference: it never refuses a lock and
 * never lengthens a corridor.
 */
export type Alignment = "left" | "right" | "center"
```

Replace the `LockConnection` comment and type:

```ts
/**
 * A CORRIDOR between two regions. Bare, it is a passage the player walks: that is what lets two regions be distinct
 * PLACES with nothing between them, which a sequence needs to put its tiles somewhere the author chose.
 *
 * `barriers` are its items IN ORDER from the first region to the second: gates and at most one drop, by one id space.
 * The carve decides the distances; `align` names the gates the author placed. Two connections on one pair are two
 * corridors, the first written first. A fork puzzle's gate is always first on its connection — checked, not authored.
 */
export type LockConnection =
  | readonly [RegionId, RegionId]
  | {
      readonly between: readonly [RegionId, RegionId]
      readonly barriers?: readonly BarrierId[]
      readonly align?: Readonly<Record<BarrierId, Alignment>>
    }
```

Replace the `LockOneWay` comment's second paragraph ("It carries an id because…") with:

```ts
 * It carries an id because it is an item of the corridor it stands on, named in that connection's `barriers` where it
 * stands, and may share the corridor with gates. An entry no connection names is a corridor of its own carrying only
 * that drop. Every realisation of it is taken THROUGH A PROMPT, whatever it is dressed as, so the player never crosses
 * by accident and finds they cannot return. The prompt says it cannot be recrossed; it does not say where it lands.
```

After `barriersOf`:

```ts
/** The gates a connection's author aligned; a gate it does not name is free. */
export const alignOf = (connection: LockConnection): Readonly<Record<BarrierId, Alignment>> =>
  "between" in connection ? connection.align ?? {} : {}
```

- [ ] **Step 4: The notation reads items**

`src/game/lockNotation.ts`. Imports: add `Alignment` to the type import from `./lockAuthoring`.

Replace `LOCK_SYNTAX` with:

```ts
export const LOCK_SYNTAX = `
  in -- hall                    corridor, nothing on it; in and out are the way in and the way out
  in -[S1]- hall                gate: open while S1 is in its second state
  in -[S1:a]- hall              gate: open while S1 is in state a
  in -[A+B]- hall               every owner   ·   -[A|B]- any owner
  hall >> in   in << hall       a drop, one-way along the arrow, taken only with empty hands
  in -[Y]- >> hall              one corridor, its items in order from the left region, apart by spaces
  in -[A]--- hall   in ---[A]- hall   aligned left: right after what stands left of it; aligned right: right before
  in --[A]-- hall               centred: room for puzzles either side   ·   -[A]- free: the carve decides
  in -[Y]- hall   hall >> in    two lines on one pair: two corridors side by side
  hall -[sluice:wet]            region gate: hall impassable unless sluice is wet
  S1 toggle @s1                 two states a b, back and forth, starts at a
  sluice toggle @hall dry wet   the same, its states named
  T1 activator @hall            off then on, for good: a floor key, or a prize; water and sand never touch it
  T torch @hall   T torch @hall lit   off until lit, or lit from the start; water or sand over its region
                                puts it out, and it can be lit again
  Y fork @in                    a fork puzzle: the gates naming it are its ways
  P sequence hall vault reset hall-vault   steps in order, reset at that gate; -[P]- opens when done
  p1 plate @hall   p2 plate @hall stone   a plate, empty or with a stone on it; any stone presses any plate
  in -[p1]- hall   in -[p1:empty]- hall    open while a stone rests on p1, or while none does
  in -[unladen]- hall           a narrow passage, only with empty hands; never on a corridor with a drop
  in -&> hall                   the nest spot: another lock may be spliced in here, its in at in, its out at hall;
                                one per lock, a plain corridor where nothing nests, ignored beside other items
  hall *   s2 $   spare ?   corridor -     takes puzzles, a reward, anything, nothing
  // comment
`.slice(1)
```

Delete `const EDGE = …`. Below `const APPETITE …` add:

```ts
type Item =
  | { kind: "gate"; condition: string; left: number; right: number }
  | { kind: "drop"; arrow: ">>" | "<<" }
  | { kind: "nest" }
type Piece = { spaced: boolean; text: string } & (
  | { kind: "region"; name: string }
  | { kind: "dashes"; count: number }
  | { kind: "item"; item: Item }
)

// A gate with its dash runs, the nest spot and its two misspellings, a drop, a dash run, a word, a bracket missing a
// dash run, anything else.
const PIECE = /(-+)\[([^\]]*)\](-+)|-&>|-&-|<&-|>>|<<|-+|\w+|-*\[([^\]]*)\]-*|\S/y
const HYPHENATED = /(?:^|\s)(\w+(?:-\w+)+)(?=\s|$)/
const TOUCHING = /\[([^\]]*)\]-*\[([^\]]*)\]/
const ITEMS = "an item is -[…]-, >>, << or -&>"

const written = (item: Item) =>
  item.kind === "gate" ? `-[${item.condition}]-` : item.kind === "drop" ? item.arrow : "-&>"

/** Equal runs of one are free, equal runs of two or more centre, and unequal runs align toward the shorter side. */
const alignmentOf = (left: number, right: number): Alignment | undefined =>
  left === right ? (left === 1 ? undefined : "center") : left < right ? "left" : "right"

/** One connection line as its regions and, between each two, the corridor's items in the order written. */
const readJoins = (line: string, fail: (message: string) => never): { regions: string[]; corridors: Item[][] } => {
  const hyphenated = line.match(HYPHENATED)
  if (hyphenated) fail(`cannot read a region called "${hyphenated[1]}"`)
  const touching = line.match(TOUCHING)
  if (touching) fail(`items on a corridor stand apart: write -[${touching[1]}]- -[${touching[2]}]-`)
  const pieces: Piece[] = []
  let spaced = true
  for (let at = 0; at < line.length; ) {
    if (/\s/.test(line[at])) {
      spaced = true
      at++
      continue
    }
    PIECE.lastIndex = at
    const m = PIECE.exec(line)!
    at = PIECE.lastIndex
    const text = m[0]
    if (text === "-&-" || text === "<&-") fail("a nest spot is written a -&> b, from the nested lock's in to its out")
    if (m[4] !== undefined) fail(`a gate stands between dashes: write -[${m[4]}]-`)
    const piece: Piece | undefined =
      m[1] !== undefined
        ? { spaced, text, kind: "item", item: { kind: "gate", condition: m[2], left: m[1].length, right: m[3].length } }
        : text === ">>" || text === "<<"
        ? { spaced, text, kind: "item", item: { kind: "drop", arrow: text } }
        : text === "-&>"
        ? { spaced, text, kind: "item", item: { kind: "nest" } }
        : /^-+$/.test(text)
        ? { spaced, text, kind: "dashes", count: text.length }
        : /^\w+$/.test(text)
        ? { spaced, text, kind: "region", name: text }
        : undefined
    if (!piece) fail(`cannot read "${line}"`)
    pieces.push(piece)
    spaced = false
  }
  // A dash touching a drop belongs to no gate.
  pieces.forEach((piece, i) => {
    if (piece.kind !== "item" || piece.item.kind !== "drop") return
    let [from, to] = [i, i]
    while (from > 0 && !pieces[from].spaced && pieces[from - 1].kind === "dashes") from--
    while (to + 1 < pieces.length && !pieces[to + 1].spaced && pieces[to + 1].kind === "dashes") to++
    if (from < i || to > i)
      fail(
        `cannot read "${pieces
          .slice(from, to + 1)
          .map(p => p.text)
          .join("")}" on a corridor: ${ITEMS}`
      )
  })
  const regions: string[] = []
  const corridors: Item[][] = []
  let items: Item[] = []
  let dashes: number[] = []
  pieces.forEach((piece, i) => {
    if (piece.kind === "region") {
      if (regions.length > 0) {
        if (items.length === 0 && dashes.length === 0) fail(`cannot read "${line}"`)
        if (dashes.length > 0 && (items.length > 0 || dashes.length > 1 || dashes[0] !== 2))
          fail("-- is a bare corridor, exactly two dashes, and carries no items")
        corridors.push(items)
      }
      regions.push(piece.name)
      items = []
      dashes = []
      return
    }
    if (regions.length === 0) fail("a line starts and ends with a region")
    const before = pieces[i - 1]
    if (piece.kind === "item" && before.kind === "item" && !piece.spaced)
      fail(`items on a corridor stand apart: write ${written(before.item)} ${written(piece.item)}`)
    if (piece.kind === "item") items.push(piece.item)
    else dashes.push(piece.count)
  })
  if (items.length > 0 || dashes.length > 0) fail("a line starts and ends with a region")
  if (regions.length < 2) fail(`cannot read "${line}"`)
  return { regions, corridors }
}
```

In `parseLock`, change `joins` to
`const joins: { between: [string, string]; barriers: string[]; align: Record<string, Alignment>; n: number }[] = []`
and replace `join` with:

```ts
const join = (n: number, from: string, to: string, items: Item[]) => {
  if (from === to) fail(n, `a join leads from ${from} to ${to}`)
  if (items.filter(item => item.kind === "drop").length > 1)
    fail(n, "a corridor falls once: put a region between two drops")
  if (items.some(item => item.kind === "nest")) spots.push({ from, to, n })
  const align: Record<string, Alignment> = {}
  const barriers = items.flatMap(item => {
    if (item.kind === "nest") return []
    if (item.kind === "drop") {
      const [launch, landing] = item.arrow === ">>" ? [from, to] : [to, from]
      const id = unique(`${launch}>${landing}`)
      oneWays[id] = { from: launch, to: landing }
      return [id]
    }
    const { list, owners, mode } = condition(n, item.condition)
    const id = unique(`${from}-${to}`)
    gates[id] = { from, to, owners, ...(mode ? { mode } : {}) }
    terms[id] = { n, list }
    const side = alignmentOf(item.left, item.right)
    if (side) align[id] = side
    return [id]
  })
  joins.push({ between: [from, to], barriers, align, n })
}
```

Replace the final `else { const parts = line.split(EDGE) … }` branch of the line loop with:

```ts
    } else {
      const { regions: names, corridors } = readJoins(line, message => fail(n, message))
      corridors.forEach((items, i) => join(n, region(n, names[i]), region(n, names[i + 1]), items))
    }
```

Replace the `connections` assembly:

```ts
const connections: LockConnection[] = joins.map(j =>
  j.barriers.length > 0
    ? { between: j.between, barriers: j.barriers, ...(Object.keys(j.align).length > 0 ? { align: j.align } : {}) }
    : j.between
)
```

Leave the fork-first check, `unladenFaults`, `nestSpotsRepeated` and `nestSpotShared` as they are; the last already
counts every join on the spot's pair. Read the file back: no reference to `EDGE` or `ops` is left.

- [ ] **Step 5: Run them to see them pass, and the catalogue parses as before**

```bash
yarn vitest run src/game/lockNotation.spec.ts src/game/nestSpot.spec.ts src/game/lockWalkSpec.spec.ts src/game/lockDraw.spec.ts scripts/lockTable.spec.ts
yarn tsx $S/parse.ts > $S/parse-after-2.json
diff $S/parse-before.json $S/parse-after-2.json && echo same
yarn check-types && yarn lint
```

Expected: PASS; `same` (no catalogue lock writes alignment, `<<`, touching items or a bare twin, spec section 9);
exit 0. `nestSpot.spec.ts`'s "refuses a JSON lock whose spot's pair has two connections as a repeated connection"
still passes here (it changes in task 3).

- [ ] **Step 6: Commit**

```bash
git add src/game/lockAuthoring.ts src/game/lockNotation.ts src/game/lockNotation.spec.ts src/game/nestSpot.spec.ts
git commit -m "feat(locks): a corridor carries its items in order, aligned by dashes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 3: The shared Lock takes two corridors on a pair and a drop beside a gate

**Review weight:** full (soundness: what the shared Lock refuses).

**Files:**

- Modify: `src/game/lockAuthoring.ts` (`NestSpotFault`, `nestSpotFaults`, `nestSpotOf`, `spotConnections` comment)
- Modify: `src/game/lockCompile.ts` (`LockFault`, `lockFaults`)
- Test: `src/game/lockCompile.spec.ts`, `src/game/nestSpot.spec.ts`

**Interfaces:**

- Consumes: `alignOf` (task 2).
- Produces: `LockFault` without `connectionRepeated` and `oneWaySharesConnection`, with
  `{ type: "corridorFallsTwice"; between: [string, string]; barriers: string[] }`,
  `{ type: "alignOffConnection"; between: [string, string]; barrier: string }`,
  `{ type: "alignOnDrop"; barrier: string }`; `NestSpotFault` gains `{ type: "nestSpotShared"; from; to }`.

- [ ] **Step 1: Write the failing tests**

In `src/game/lockCompile.spec.ts`, delete the tests `"refuses one connection declared twice"` and
`"refuses a one-way standing on a connection beside a gate, which the floor cannot say"`, and append a describe at the
end of the file (add `parseLock` to the imports if absent; `kinds` and `fragmentOf` are the file's own):

```ts
describe("corridors on a pair, and a drop among a corridor's items", () => {
  const own = (lock: Lock) => checkLock(lock, kinds).filter(fault => fault.type !== "topology")

  it("takes a gate corridor and a drop-only corridor on one pair", () => {
    expect(checkLock(parseLock("in -[S]- hall\nhall >> in\nhall -- out\nS toggle @hall", "pair").lock, kinds)).toEqual(
      []
    )
  })

  it("takes a drop beside a gate on one corridor, with nothing of the lock's own to refuse", () => {
    expect(own(parseLock("in -- out\nin -[A]- >> pit\npit -- out\nA toggle @in", "fall").lock)).toEqual([])
  })

  it("refuses two drops on one connection", () => {
    const base = parseLock("in -- hall\nhall -- out", "falls").lock
    const twice: Lock = {
      ...base,
      connections: [{ between: ["in", "hall"], barriers: ["in>hall", "in>hall#2"] }, ["hall", "out"]],
      oneWays: { "in>hall": { from: "in", to: "hall" }, "in>hall#2": { from: "in", to: "hall" } },
    }
    expect(own(twice)).toEqual([
      { type: "corridorFallsTwice", between: ["in", "hall"], barriers: ["in>hall", "in>hall#2"] },
    ])
  })

  it("refuses an alignment naming a barrier its connection does not carry", () => {
    const { lock } = parseLock("in -[A]- hall\nhall -[B]- out\nA toggle @in\nB toggle @hall", "aligned")
    const off: Lock = {
      ...lock,
      connections: [
        { between: ["in", "hall"], barriers: ["in-hall"], align: { "hall-out": "left" } },
        lock.connections[1],
      ],
    }
    expect(own(off)).toEqual([{ type: "alignOffConnection", between: ["in", "hall"], barrier: "hall-out" }])
  })

  it("refuses an alignment naming a drop", () => {
    const { lock } = parseLock("in -[A]- >> hall\nhall -- out\nA toggle @in", "aligned")
    const onDrop: Lock = {
      ...lock,
      connections: [
        { between: ["in", "hall"], barriers: ["in-hall", "in>hall"], align: { "in>hall": "left" } },
        lock.connections[1],
      ],
    }
    expect(own(onDrop)).toEqual([{ type: "alignOnDrop", barrier: "in>hall" }])
  })

  it("compiles a drop no connection names to the fragment of one its own connection names", () => {
    const named = parseLock("in -- hall\nhall >> in\nhall -- out", "drop").lock
    const unnamed: Lock = { ...named, connections: named.connections.filter(c => !("between" in c)) }
    expect(fragmentOf(unnamed)).toEqual(fragmentOf(named))
  })
})
```

In `src/game/nestSpot.spec.ts`, replace the test
`"refuses a JSON lock whose spot's pair has two connections as a repeated connection"` with:

```ts
it("refuses a JSON lock whose spot's pair has two connections nestSpotShared, as the notation does", () => {
  const { lock } = parseLock("in -&> hall\nin -[L]- hall\nhall -- out\nL toggle @in", "shared")
  const result = compileLock(lock, BINDING)
  expect(result.ok === false && result.faults).toContainEqual({ type: "nestSpotShared", from: "in", to: "hall" })
  expect(nestSpotOf(lock)).toBeUndefined()
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockCompile.spec.ts src/game/nestSpot.spec.ts`
Expected: FAIL — `connectionRepeated`, `oneWaySharesConnection`, no `corridorFallsTwice`/`align*`/`nestSpotShared`.

- [ ] **Step 3: Nest spot faults**

`src/game/lockAuthoring.ts`: the comment on `spotConnections` becomes
`/** Every connection joining the spot's pair: one in a lock that compiles, more in one refused nestSpotShared. */`.
`nestSpotOf` takes a spot only on a pair with exactly one connection:

```ts
export const nestSpotOf = (lock: Lock): { from: RegionId; to: RegionId } | undefined =>
  lock.nestSpot && spotConnections(lock).length === 1 && nestSpotBusy(lock).length === 0 ? lock.nestSpot : undefined
```

Replace `NestSpotFault` and `nestSpotFaults`:

```ts
/** A nest spot naming a connection the lock does not have (a JSON lock's typo; the notation cannot write one), or a
 * pair with another connection beside the spot, which is a corridor of its own. */
export type NestSpotFault =
  | { type: "nestSpotOnNoConnection"; from: RegionId; to: RegionId }
  | { type: "nestSpotShared"; from: RegionId; to: RegionId }

export const nestSpotFaults = (lock: Lock): NestSpotFault[] => {
  if (!lock.nestSpot) return []
  const count = spotConnections(lock).length
  if (count === 0) return [{ type: "nestSpotOnNoConnection", ...lock.nestSpot }]
  return count > 1 ? [{ type: "nestSpotShared", ...lock.nestSpot }] : []
}
```

- [ ] **Step 4: The lock's own faults read corridors**

`src/game/lockCompile.ts`: import `alignOf` beside `barriersOf`. In `LockFault`, delete the `connectionRepeated` and
`oneWaySharesConnection` members and add, where `oneWaySharesConnection` stood:

```ts
  /** Two drops stand on one connection: a corridor falls once, and a region between them makes two corridors. */
  | { type: "corridorFallsTwice"; between: [string, string]; barriers: string[] }
  /** `align` names a barrier its connection does not carry. */
  | { type: "alignOffConnection"; between: [string, string]; barrier: string }
  /** `align` names a drop, which is never aligned. */
  | { type: "alignOnDrop"; barrier: string }
```

In `lockFaults`, delete `const emptyHandsOnDrop = …` and replace the `for (const connection of lock.connections)` loop
with:

```ts
for (const connection of lock.connections) {
  const join = pairOf(joinOf(connection))
  const [a, b] = join
  need(`connection ${a}-${b}`, a)
  need(`connection ${a}-${b}`, b)
  const key = keyOf(a, b)
  declared.add(key)
  const barriers = barriersOf(connection)
  for (const barrier of barriers) {
    namedOn.set(barrier, (namedOn.get(barrier) ?? 0) + 1)
    const gate = lock.gates[barrier]
    const oneWay = oneWays[barrier]
    if (!gate && !oneWay) faults.push({ type: "barrierUndefined", between: join, barrier })
    else if (gate && isRegionGate(gate)) faults.push({ type: "regionGateOnConnection", barrier, between: join })
    else {
      const standing = gate && !isRegionGate(gate) ? gate : oneWay
      if (standing && keyOf(standing.from, standing.to) !== key)
        faults.push({ type: "barrierOffItsConnection", barrier, between: join })
    }
  }
  const drops = barriers.filter(barrier => Object.hasOwn(oneWays, barrier))
  if (drops.length > 1) faults.push({ type: "corridorFallsTwice", between: join, barriers: drops })
  for (const barrier of Object.keys(alignOf(connection))) {
    if (!barriers.includes(barrier)) faults.push({ type: "alignOffConnection", between: join, barrier })
    else if (Object.hasOwn(oneWays, barrier)) faults.push({ type: "alignOnDrop", barrier })
  }
}
```

Keep `faults.push(...unladen)` (the `const unladen = unladenFaults(lock)` line stays).

- [ ] **Step 5: Run them to see them pass**

```bash
yarn vitest run src/game/lockCompile.spec.ts src/game/nestSpot.spec.ts src/game/lockNotation.spec.ts src/game/nestedLocks.spec.ts src/game/floorLocks.spec.ts
yarn check-types && yarn lint
grep -rn 'connectionRepeated\|oneWaySharesConnection' src scripts
```

Expected: PASS; exit 0; the grep prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/game/lockAuthoring.ts src/game/lockCompile.ts src/game/lockCompile.spec.ts src/game/nestSpot.spec.ts
git commit -m "feat(locks): two corridors may share a pair, and a drop may share a corridor with gates" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 4: The floor reads corridors, not pairs

**Review weight:** full (soundness: topology per corridor).

**Files:**

- Modify: `src/game/obstacles.ts` (`EdgeGateObstacle.at`, `BarrierOrder`, `BarrierRun`; new `FloorCorridor`,
  `floorCorridors`, `corridorIndexOf`, `flipAlign`, `fallingStretches`, `dropsLandingOnAStretch`; `topologyFaults`,
  `barrierOrderFaults`, `barrierRuns`)
- Test: `src/game/obstacles.spec.ts`

**Interfaces:**

- Consumes: `Alignment` (task 2).
- Produces (all from `obstacles.ts`):

  - `EdgeGateObstacle.at: { on: "connection"; between: readonly [string, string]; corridor?: number }`
  - `BarrierOrder = { between; barriers; corridor?: number; align?: Readonly<Record<string, Alignment>> }`
  - `type FloorCorridor = { key: string; between: readonly [string, string]; index: number; drop?: string; barriers: readonly string[]; align: Readonly<Record<string, Alignment>> }`
  - `floorCorridors(layout: RegionGraph, obstacles: readonly Obstacle[], barrierOrder: readonly BarrierOrder[]): FloorCorridor[]`
  - `corridorIndexOf(gate: EdgeGateObstacle): number`
  - `flipAlign(align: Readonly<Record<string, Alignment>>): Record<string, Alignment>`
  - `fallingStretches(corridor: Pick<FloorCorridor, "between" | "barriers" | "align">, drop: OneWayObstacle): { launch: string; landing: string; upstream: string[]; downstream: string[]; align: Record<string, Alignment> }`
  - `dropsLandingOnAStretch(obstacles: readonly Obstacle[], barrierOrder: readonly BarrierOrder[]): Set<string>`
  - `BarrierRun` gains `falling?: true`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/obstacles.spec.ts` (add the imports it lacks: `fallingStretches`, `floorCorridors`,
`topologyFaults` and the types `BarrierOrder`, `Control`, `Obstacle`, `OneWayObstacle` from `./obstacles`,
`RegionGraph` from `./regions`, `resolveMechanicKind` from `./mechanics`). If a field of `StatefulControl` is
required that `lever` below lacks, copy it from an existing control in this file.

```ts
describe("the corridors of a laid floor", () => {
  const layout = (connections: [string, string][]): RegionGraph => ({
    regions: ["in", "hall", "out"].map(name => ({ name, appetite: "free" as const })),
    connections,
    in: "in",
    out: "out",
  })
  const lever = (opens: string[]): Control => ({
    id: "S",
    in: "in",
    states: ["a", "b"],
    initial: "a",
    returnsToInitial: true,
    opens: { a: [], b: opens },
  })
  const gate = (id: string, corridor?: number): Obstacle => ({
    id,
    kind: "gate",
    at: { on: "connection", between: ["in", "hall"], ...(corridor === undefined ? {} : { corridor }) },
  })
  const fall: OneWayObstacle = { id: "fall", kind: "oneWay", at: { on: "connection", between: ["in", "hall"] } }
  const laid = (l: RegionGraph, obstacles: Obstacle[], controls: Control[], order: BarrierOrder[] = []) =>
    topologyFaults(l, obstacles, controls, [], order, resolveMechanicKind, { laid: true })

  it("stands a gate on the second corridor of a pair", () => {
    const twin = layout([
      ["in", "hall"],
      ["in", "hall"],
      ["hall", "out"],
    ])
    expect(laid(twin, [gate("A"), gate("B", 1)], [lever(["A", "B"])])).toEqual([])
  })

  it("refuses a gate an open corridor beside it goes round", () => {
    const twin = layout([
      ["in", "hall"],
      ["in", "hall"],
      ["hall", "out"],
    ])
    expect(laid(twin, [gate("A")], [lever(["A"])])).toEqual([
      { type: "gateBypassed", id: "A", between: ["in", "hall"] },
    ])
  })

  it("refuses a gate on a corridor its pair does not have", () => {
    expect(
      laid(
        layout([
          ["in", "hall"],
          ["hall", "out"],
        ]),
        [gate("A", 1)],
        [lever(["A"])]
      )
    ).toEqual([{ type: "obstacleNamesNoConnection", id: "A" }])
  })

  it("stands a gate on a falling corridor the layout does not join", () => {
    const order: BarrierOrder[] = [{ between: ["in", "hall"], barriers: ["A", "fall"] }]
    expect(
      laid(
        layout([
          ["in", "out"],
          ["out", "hall"],
        ]),
        [gate("A"), fall],
        [lever(["A"])],
        order
      )
    ).toEqual([])
  })

  it("never counts a falling corridor as a way round a gate, nor the gate on it as bypassed", () => {
    const order: BarrierOrder[] = [{ between: ["in", "hall"], barriers: ["A", "fall"], corridor: 1 }]
    expect(
      laid(
        layout([
          ["in", "hall"],
          ["hall", "out"],
        ]),
        [gate("A", 1), fall],
        [lever(["A"])],
        order
      )
    ).toEqual([])
  })

  it("orders the gates of one corridor apart from those of the corridor beside it", () => {
    const twin = layout([
      ["in", "hall"],
      ["in", "hall"],
      ["hall", "out"],
    ])
    const order: BarrierOrder[] = [{ between: ["in", "hall"], barriers: ["A", "B"], corridor: 1 }]
    expect(laid(twin, [gate("C"), gate("A", 1), gate("B", 1)], [lever(["A", "B", "C"])], order)).toEqual([])
    expect(laid(twin, [gate("C"), gate("A", 1), gate("B", 1)], [lever(["A", "B", "C"])])).toEqual([
      { type: "barrierUnordered", id: "A", between: ["in", "hall"] },
      { type: "barrierUnordered", id: "B", between: ["in", "hall"] },
    ])
  })

  it("numbers a pair's layout corridors round the index its falling corridor states", () => {
    const corridors = floorCorridors(
      layout([
        ["in", "hall"],
        ["in", "hall"],
        ["hall", "out"],
      ]),
      [gate("A"), gate("B", 2), fall],
      [{ between: ["in", "hall"], barriers: ["fall"], corridor: 1 }]
    )
    expect(corridors.map(c => [c.between.join("-"), c.index, c.drop, c.barriers])).toEqual([
      ["in-hall", 0, undefined, ["A"]],
      ["in-hall", 2, undefined, ["B"]],
      ["hall-out", 0, undefined, []],
      ["in-hall", 1, "fall", ["fall"]],
    ])
  })
})

describe("a falling corridor split at its drop", () => {
  const drop = (from: string, to: string): OneWayObstacle => ({
    id: "d",
    kind: "oneWay",
    at: { on: "connection", between: [from, to] },
  })
  it.each([
    [
      "a gate then a drop, written along the fall",
      ["A", "d"],
      ["in", "pit"],
      { A: "right" },
      { upstream: ["A"], downstream: [], align: { A: "right" } },
    ],
    [
      "a drop then a gate, written along the fall",
      ["d", "A"],
      ["in", "pit"],
      { A: "left" },
      { upstream: [], downstream: ["A"], align: { A: "left" } },
    ],
    [
      "a gate then a drop written against the fall (<<)",
      ["A", "d"],
      ["pit", "in"],
      { A: "left" },
      { upstream: [], downstream: ["A"], align: { A: "right" } },
    ],
    [
      "gates on both sides, written against the fall",
      ["A", "d", "B"],
      ["pit", "in"],
      { A: "center", B: "right" },
      { upstream: ["B"], downstream: ["A"], align: { A: "center", B: "left" } },
    ],
  ] as const)("%s", (_, barriers, [from, to], align, expected) => {
    expect(fallingStretches({ between: ["in", "pit"], barriers, align }, drop(from, to))).toEqual({
      launch: from,
      landing: to,
      ...expected,
    })
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/obstacles.spec.ts`
Expected: FAIL — `floorCorridors`/`fallingStretches` are not exported; `at.corridor` is not a field.

- [ ] **Step 3: The vocabulary and the reader**

`src/game/obstacles.ts`: `import type { Alignment } from "./lockAuthoring"`. Change the edge gate's `at`:

```ts
export type EdgeGateObstacle = GateTerms & {
  id: string
  kind: "gate"
  /** `corridor`: which of the corridors joining `between` it stands on, by its place among them; absent, the first. */
  at: { on: "connection"; between: readonly [string, string]; corridor?: number }
}
```

Replace `BarrierOrder` and its comment:

```ts
/**
 * THE ITEMS STANDING ON ONE CORRIDOR, written from `between[0]` to `between[1]`. Stated where a corridor carries more
 * than one item or an aligned one; a falling corridor's names its drop where it stands, and is how the floor knows
 * the gates beside it stand on it. The carve keeps this order and chooses the spacing, as `align` prefers.
 */
export type BarrierOrder = {
  between: readonly [string, string]
  barriers: readonly string[]
  /** Which corridor of the pair, as on its gates; absent, the first. */
  corridor?: number
  /** The aligned gates, as the lock wrote them; a gate it does not name is free. */
  align?: Readonly<Record<string, Alignment>>
}
```

After `connectionKey`, add:

```ts
/**
 * ONE CORRIDOR OF A FLOOR: a layout connection, or a falling corridor — a drop with gates beside it, which the layout
 * does not join and whose `barrierOrder` entry names the drop. `barriers` are its items from `between[0]` to
 * `between[1]`, the drop among them; `index` is its place among the corridors of its pair.
 */
export type FloorCorridor = {
  key: string
  between: readonly [string, string]
  index: number
  drop?: string
  barriers: readonly string[]
  align: Readonly<Record<string, Alignment>>
}

export const corridorIndexOf = (gate: EdgeGateObstacle): number => gate.at.corridor ?? 0

/** The same alignment read from the other end: left and right swap, centre stays. */
export const flipAlign = (align: Readonly<Record<string, Alignment>>): Record<string, Alignment> =>
  Object.fromEntries(
    Object.entries(align).map(([id, side]) => [id, side === "left" ? "right" : side === "right" ? "left" : side])
  )

const slotOf = (key: string, index: number) => `${key}#${index}`

/**
 * EVERY CORRIDOR OF A FLOOR, layout connections in layout order and then falling corridors in `barrierOrder` order.
 * A falling corridor keeps the index its entry states; the pair's layout connections take the other indices in order.
 */
export const floorCorridors = (
  layout: RegionGraph,
  obstacles: readonly Obstacle[],
  barrierOrder: readonly BarrierOrder[]
): FloorCorridor[] => {
  const drops = new Set(obstacles.flatMap(o => (o.kind === "oneWay" ? [o.id] : [])))
  const falling = barrierOrder.filter(order => order.barriers.some(id => drops.has(id)))
  const taken = new Map<string, Set<number>>()
  for (const order of falling) {
    const key = connectionKey(...order.between)
    taken.set(key, new Set([...(taken.get(key) ?? []), order.corridor ?? 0]))
  }
  const next = new Map<string, number>()
  const corridors: FloorCorridor[] = []
  for (const [a, b] of layout.connections) {
    const key = connectionKey(a, b)
    let index = next.get(key) ?? 0
    while (taken.get(key)?.has(index)) index++
    next.set(key, index + 1)
    const order = barrierOrder.find(
      o => connectionKey(...o.between) === key && (o.corridor ?? 0) === index && !o.barriers.some(id => drops.has(id))
    )
    const reversed = order !== undefined && order.between[0] !== a
    const barriers = order
      ? reversed
        ? [...order.barriers].reverse()
        : [...order.barriers]
      : obstacles.flatMap(o =>
          isEdgeGate(o) && connectionKey(...o.at.between) === key && corridorIndexOf(o) === index ? [o.id] : []
        )
    const align = order?.align ?? {}
    corridors.push({ key, between: [a, b], index, barriers, align: reversed ? flipAlign(align) : align })
  }
  for (const order of falling)
    corridors.push({
      key: connectionKey(...order.between),
      between: order.between,
      index: order.corridor ?? 0,
      drop: order.barriers.find(id => drops.has(id)),
      barriers: order.barriers,
      align: order.align ?? {},
    })
  return corridors
}

/**
 * A FALLING CORRIDOR SPLIT AT ITS DROP: the items between the region it falls from and the drop, in travel order
 * (`upstream`), and those between the drop and the region it leads to, in travel order (`downstream`). Alignment is
 * turned with them, so `left` means toward where the player comes from on either stretch.
 */
export const fallingStretches = (
  corridor: Pick<FloorCorridor, "between" | "barriers" | "align">,
  drop: OneWayObstacle
): { launch: string; landing: string; upstream: string[]; downstream: string[]; align: Record<string, Alignment> } => {
  const at = corridor.barriers.indexOf(drop.id)
  const forward = drop.at.between[0] === corridor.between[0]
  const before = corridor.barriers.slice(0, at)
  const after = corridor.barriers.slice(at + 1)
  return {
    launch: drop.at.between[0],
    landing: drop.at.between[1],
    upstream: forward ? before : [...after].reverse(),
    downstream: forward ? after : [...before].reverse(),
    align: forward ? { ...corridor.align } : flipAlign(corridor.align),
  }
}

/** The drops whose falling corridor carries a gate past them: each lands on its own stretch, not in its region's ground. */
export const dropsLandingOnAStretch = (
  obstacles: readonly Obstacle[],
  barrierOrder: readonly BarrierOrder[]
): Set<string> => {
  const drops = new Map(obstacles.flatMap(o => (o.kind === "oneWay" ? [[o.id, o] as const] : [])))
  const found = new Set<string>()
  for (const order of barrierOrder) {
    const id = order.barriers.find(barrier => drops.has(barrier))
    if (id === undefined) continue
    const { downstream } = fallingStretches({ ...order, align: order.align ?? {} }, drops.get(id)!)
    if (downstream.length > 0) found.add(id)
  }
  return found
}
```

- [ ] **Step 4: `topologyFaults` asks of corridors**

In `topologyFaults`, after the obstacle-id loop has built `obstacleById` (move the loop's gate branch below so it can
read `corridorAt`): compute, before the obstacle loop,

```ts
const corridors = floorCorridors(layout, obstacles, barrierOrder)
const corridorAt = new Map(corridors.map(corridor => [slotOf(corridor.key, corridor.index), corridor]))
```

and replace the edge-gate tail of the obstacle loop (`const key = connectionKey(a, b)` … `obstacleOffRoute`) with:

```ts
const key = connectionKey(a, b)
const corridor = corridorAt.get(slotOf(key, corridorIndexOf(obstacle)))
// A side-chain carve lays one corridor per pair on its seams; a laid floor lays every corridor.
const seated =
  laid || (seatable.has(key) && corridor !== undefined && corridor.index === 0 && corridor.drop === undefined)
if (!corridor) faults.push({ type: "obstacleNamesNoConnection", id: obstacle.id })
else if (!seated) faults.push({ type: "obstacleOffRoute", id: obstacle.id })
```

Replace the open-way block (`const gatedJoins …` through the `gateBypassed` loop) with:

```ts
// AN OPEN WAY ROUND A GATE, per corridor: the walk from one side of the gate to the other over corridors that carry
// no edge gate and touch no barred region. A falling corridor is never open: it is not walked both ways.
const gatedSlots = new Set(
  obstacles.flatMap(o => (isEdgeGate(o) ? [slotOf(connectionKey(...o.at.between), corridorIndexOf(o))] : []))
)
const barred = new Set(obstacles.flatMap(o => (isRegionGate(o) ? [o.at.region] : [])))
const openNeighbours = new Map<string, string[]>()
for (const corridor of corridors) {
  const [a, b] = corridor.between
  if (corridor.drop !== undefined || gatedSlots.has(slotOf(corridor.key, corridor.index))) continue
  if (barred.has(a) || barred.has(b)) continue
  openNeighbours.set(a, [...(openNeighbours.get(a) ?? []), b])
  openNeighbours.set(b, [...(openNeighbours.get(b) ?? []), a])
}
```

keep `openlyJoined` as it is, and change its loop to skip a gate on no corridor or on a falling one:

```ts
for (const obstacle of obstacles) {
  if (!isEdgeGate(obstacle)) continue
  const corridor = corridorAt.get(slotOf(connectionKey(...obstacle.at.between), corridorIndexOf(obstacle)))
  if (!corridor || corridor.drop !== undefined) continue
  const [a, b] = obstacle.at.between
  if (barred.has(a) || barred.has(b)) continue
  if (openlyJoined(a, b)) faults.push({ type: "gateBypassed", id: obstacle.id, between: [a, b] })
}
```

In the fork-owner loop, the off-seam condition reads the gate's own corridor (ruling: a fork gate on a falling
corridor is never off seam):

```ts
const key = connectionKey(obstacle.at.between[0], obstacle.at.between[1])
const onFall = corridorAt.get(slotOf(key, corridorIndexOf(obstacle)))?.drop !== undefined
if (regions.has(fork.in) && joined.has(key) && !onFall && !seamsFor(fork.in).has(key))
  faults.push({ type: "gateOwnedOffSeam", id: obstacle.id, owner })
```

Call `barrierOrderFaults(corridorAt, obstacleById, obstacles, barrierOrder, forkSwitches, gatesOwnedBy)` (its first
parameter is now `corridorAt: ReadonlyMap<string, FloorCorridor>` in place of `joined`), and rewrite its body keyed by
slot:

```ts
const faults: TopologyFault[] = []
const orderOf = new Map<string, BarrierOrder>()
for (const order of barrierOrder) {
  const between = pairOf(order.between)
  const key = connectionKey(...between)
  const slot = slotOf(key, order.corridor ?? 0)
  const corridor = corridorAt.get(slot)
  if (!corridor) {
    faults.push({ type: "barrierOrderNamesNoConnection", between })
    continue
  }
  if (orderOf.has(slot)) {
    faults.push({ type: "barrierOrderRepeated", between })
    continue
  }
  orderOf.set(slot, order)
  const listed = new Set<string>()
  for (const id of order.barriers) {
    if (listed.has(id)) {
      faults.push({ type: "barrierListedTwice", id, between })
      continue
    }
    listed.add(id)
    const obstacle = obstacleById.get(id)
    if (!obstacle) faults.push({ type: "barrierNotDefined", id, between })
    else if (
      obstacle.kind === "oneWay"
        ? id !== corridor.drop || connectionKey(...obstacle.at.between) !== key
        : !isEdgeGate(obstacle) ||
          connectionKey(...obstacle.at.between) !== key ||
          corridorIndexOf(obstacle) !== (order.corridor ?? 0)
    )
      faults.push({ type: "barrierNotOnConnection", id, between })
  }
}

const gatesOn = new Map<string, EdgeGateObstacle[]>()
for (const obstacle of obstacles)
  if (isEdgeGate(obstacle)) {
    const slot = slotOf(connectionKey(...obstacle.at.between), corridorIndexOf(obstacle))
    gatesOn.set(slot, [...(gatesOn.get(slot) ?? []), obstacle])
  }
```

keep `refusedAsForkSeam` (pair keys) and make the unordered loop and the fork-first loop read slots:

```ts
for (const [slot, gates] of gatesOn) {
  if (gates.length < 2 || refusedAsForkSeam.has(connectionKey(...gates[0].at.between))) continue
  const listed = new Set(orderOf.get(slot)?.barriers ?? [])
  for (const gate of gates)
    if (!listed.has(gate.id)) faults.push({ type: "barrierUnordered", id: gate.id, between: pairOf(gate.at.between) })
}

for (const [owner, gates] of [...forkSwitches].map(([id, fork]) => [fork, gatesOwnedBy.get(id) ?? []] as const)) {
  for (const gate of gates) {
    const order = orderOf.get(slotOf(connectionKey(...gate.at.between), corridorIndexOf(gate)))
    if (!order || order.barriers.length < 2 || !order.barriers.includes(gate.id)) continue
    const first = order.between[0] === owner.in
    const standsFirst = first ? order.barriers[0] === gate.id : order.barriers[order.barriers.length - 1] === gate.id
    if (!standsFirst)
      faults.push({ type: "forkGateNotFirst", id: gate.id, owner: owner.id, between: pairOf(order.between) })
  }
}
return faults
```

Update `barrierOrderFaults`'s doc comment: "an id in an order must be a gate on that very corridor, or the drop of the
falling corridor it describes".

- [ ] **Step 5: `barrierRuns` per corridor**

```ts
/** A corridor's gates, in the order they stand from `between[0]` to `between[1]`; `falling` on a falling corridor. */
export type BarrierRun = { between: readonly [string, string]; gates: EdgeGateObstacle[]; falling?: true }

/**
 * EVERY CORRIDOR THAT CARRIES A GATE, with its gates in the order stated. A corridor with one gate is its own run; one
 * with several is ordered by `barrierOrder`, which `topologyFaults` has already proven lists each of them exactly once.
 */
export const barrierRuns = (obstacles: readonly Obstacle[], barrierOrder: readonly BarrierOrder[]): BarrierRun[] => {
  const drops = new Set(obstacles.flatMap(o => (o.kind === "oneWay" ? [o.id] : [])))
  const bySlot = new Map<string, EdgeGateObstacle[]>()
  for (const obstacle of obstacles.filter(isEdgeGate)) {
    const slot = slotOf(connectionKey(...obstacle.at.between), corridorIndexOf(obstacle))
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), obstacle])
  }
  return [...bySlot].map(([slot, gates]) => {
    const order = barrierOrder.find(entry => slotOf(connectionKey(...entry.between), entry.corridor ?? 0) === slot)
    const falling = order?.barriers.some(id => drops.has(id)) ? { falling: true as const } : {}
    if (gates.length < 2 || !order) return { between: gates[0].at.between, gates, ...falling }
    const byId = new Map(gates.map(gate => [gate.id, gate]))
    return { between: order.between, gates: order.barriers.flatMap(id => byId.get(id) ?? []), ...falling }
  })
}
```

- [ ] **Step 6: Run them to see them pass**

```bash
yarn vitest run src/game/obstacles.spec.ts src/game/barrierOrder.spec.ts src/game/siteAssembler.spec.ts src/game/lockCompile.spec.ts src/game/regions.spec.ts
yarn check-types && yarn lint
```

Expected: PASS; exit 0. A pre-existing test that pins a `barrierOrderFaults`/`gateBypassed` result for a single
corridor per pair must pass unchanged; if one fails, the rewrite changed a one-corridor answer: fix the code, never
the test.

- [ ] **Step 7: Commit**

```bash
git add src/game/obstacles.ts src/game/obstacles.spec.ts
git commit -m "feat(floor): gates, orders and open ways are read per corridor, falling corridors included" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 5: Compile writes the corridor index, falling corridors and alignment

**Review weight:** full (soundness: what compile writes).

**Files:**

- Modify: `src/game/lockCompile.ts` (`translate`, its doc comment)
- Test: `src/game/lockCompile.spec.ts`

**Interfaces:**

- Consumes: `alignOf` (task 2); the floor vocabulary of task 4.
- Produces: a fragment whose gate on corridor `k > 0` carries `at.corridor: k`, and whose `barrierOrder` has an
  entry `{ between, barriers (drop where it stands), corridor? (k > 0), align? }` for every corridor with more than
  one item or an aligned gate.

- [ ] **Step 1: Write the failing tests**

Append to the describe added in task 3 in `src/game/lockCompile.spec.ts`:

```ts
it("compiles two corridors on one pair, the second's gate and order carrying its index", () => {
  const f = fragmentOf(
    parseLock("in -[A]- hall\nin -[B]- -[C]- hall\nhall -- out\nA toggle @in\nB toggle @in\nC toggle @in", "pair").lock
  )
  expect(f.regionLayout.connections.filter(([a, b]) => a === "in" && b === "hall")).toHaveLength(2)
  expect(f.obstacles.filter(o => o.kind === "gate").map(o => [o.id, o.at])).toEqual([
    ["in-hall", { on: "connection", between: ["in", "hall"] }],
    ["in-hall#2", { on: "connection", between: ["in", "hall"], corridor: 1 }],
    ["in-hall#3", { on: "connection", between: ["in", "hall"], corridor: 1 }],
  ])
  expect(f.barrierOrder).toEqual([{ between: ["in", "hall"], barriers: ["in-hall#2", "in-hall#3"], corridor: 1 }])
})

it("refuses a gate an open corridor beside it goes round", () => {
  expect(checkLock(parseLock("in -[S]- hall\nin -- hall\nhall -- out\nS toggle @in", "round").lock, kinds)).toEqual([
    { type: "topology", fault: { type: "gateBypassed", id: "in-hall", between: ["in", "hall"] } },
  ])
})

it("compiles a gate and a drop on one corridor to a falling corridor: a drop, its gate, an order and no layout join", () => {
  const f = fragmentOf(parseLock("in -- out\nin -[A]- >> pit\npit -- out\nA toggle @in", "fall").lock)
  expect(f.regionLayout.connections).toEqual([
    ["in", "out"],
    ["pit", "out"],
  ])
  expect(f.barrierOrder).toEqual([{ between: ["in", "pit"], barriers: ["in-pit", "in>pit"] }])
  expect(f.obstacles.map(o => o.id).sort()).toEqual(["in-pit", "in>pit"])
})

it("writes an aligned gate's order, alone on its corridor", () => {
  const f = fragmentOf(parseLock("in ---[A]- hall\nhall -- out\nA toggle @in", "aligned").lock)
  expect(f.barrierOrder).toEqual([{ between: ["in", "hall"], barriers: ["in-hall"], align: { "in-hall": "right" } }])
})

it("compiles a lock that repeats no pair and aligns nothing with no corridor field anywhere", () => {
  const f = fragmentOf(parseLock("in -[A]- hall -[B]- out\nhall >> in\nA toggle @in\nB toggle @hall", "plain").lock)
  expect(JSON.stringify(f)).not.toContain('"corridor"')
  expect(JSON.stringify(f)).not.toContain('"align"')
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockCompile.spec.ts`
Expected: FAIL — no `corridor` on the second corridor's gates; `obstacleNamesNoConnection` for `in-pit`; no order for
a lone aligned gate.

- [ ] **Step 3: Translate**

`src/game/lockCompile.ts`: import `alignOf` and `type LockConnection`. In `translate`, replace the `standsAlone` /
`connections` block with:

```ts
const oneWays = lock.oneWays ?? {}
const isDrop = (id: string) => Object.hasOwn(oneWays, id)
// A corridor's index is its place among the corridors of its pair the floor keeps (layout connections and falling
// corridors), in written order; a corridor carrying only a drop compiles to the drop and takes none.
const counted = new Map<string, number>()
const indexOf = new Map<LockConnection, number>()
for (const connection of lock.connections) {
  const barriers = barriersOf(connection)
  if (barriers.length === 1 && isDrop(barriers[0])) continue
  const key = keyOf(...joinOf(connection))
  indexOf.set(connection, counted.get(key) ?? 0)
  counted.set(key, (counted.get(key) ?? 0) + 1)
}
const corridorOfGate = new Map<string, number>()
for (const [connection, index] of indexOf)
  for (const id of barriersOf(connection)) if (!isDrop(id)) corridorOfGate.set(id, index)
const connections = lock.connections
  .filter(connection => !barriersOf(connection).some(isDrop))
  .map(connection => {
    const [a, b] = joinOf(connection)
    return [name(a), name(b)] as const
  })
```

(remove the later `const oneWays = lock.oneWays ?? {}` if it is now declared twice). The edge gate obstacle's `at`
becomes:

```ts
            at: {
              on: "connection",
              between: [name(gate.from), name(gate.to)],
              ...((corridorOfGate.get(id) ?? 0) > 0 ? { corridor: corridorOfGate.get(id)! } : {}),
            },
```

Replace the `barrierOrder` block:

```ts
const barrierOrder: BarrierOrder[] = lock.connections.flatMap(connection => {
  const barriers = barriersOf(connection)
  const align = alignOf(connection)
  const aligned = Object.keys(align).length > 0
  if (barriers.length < 2 && !aligned) return []
  const [a, b] = joinOf(connection)
  const index = indexOf.get(connection) ?? 0
  return [
    {
      between: [name(a), name(b)] as const,
      barriers: barriers.map(name),
      ...(index > 0 ? { corridor: index } : {}),
      ...(aligned ? { align: Object.fromEntries(Object.entries(align).map(([id, side]) => [name(id), side])) } : {}),
    },
  ]
})
```

In the doc comment above `translate`, replace the two bullets about connections with:

```ts
 * - region -> region of the layout, `takes` -> appetite; a corridor -> a layout connection, unless it carries a drop:
 *   a drop alone is the drop, a drop with gates a falling corridor (the drop, its gates and its order, no layout join).
 *   A gate on a pair's corridor `k > 0` carries `at.corridor: k`.
```

and the last bullet: `- sequence -> a sequence control; a corridor's items -> barrierOrder where it has several or an aligned one.`

- [ ] **Step 4: Run them to see them pass**

```bash
yarn vitest run src/game/lockCompile.spec.ts src/game/floorLocks.spec.ts src/game/nestedLocks.spec.ts src/game/floorLock.spec.ts
yarn tsx $S/check.ts > $S/check-after-5.json; diff $S/check-before.json $S/check-after-5.json
yarn check-types && yarn lint
```

Expected: PASS. The diff shows only the rows of the "What was measured" table: doubleBack, seesaw and counterweight
now `[]`; clockwork, lamplighter and observatory their fork faults; relay its falling-corridor verdict (note it for
task 11); boardPicksTheWay unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/game/lockCompile.ts src/game/lockCompile.spec.ts
git commit -m "feat(locks): compile numbers a pair's corridors and writes falling corridors" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 6: The gap rule, as a pure function

**Review weight:** full (soundness: the gap rule).

**Files:**

- Modify: `src/game/laidFloor.ts` (new export `seatItems`)
- Test: `src/game/seatItems.spec.ts` (new)

**Interfaces:**

- Consumes: `Alignment` (task 2).
- Produces: `seatItems(k: number, aligns: ReadonlyArray<Alignment | undefined>, junction?: "start" | "end"): number[]`
  — the node index of each item, ascending; `k >= aligns.length`.

- [ ] **Step 1: Write the failing test**

`src/game/seatItems.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import type { Alignment } from "./lockAuthoring"
import { seatItems } from "./laidFloor"

type Row = [string, number, (Alignment | undefined)[], "start" | "end" | undefined, number[]]

describe("where a corridor's items stand among its nodes", () => {
  it.each<Row>([
    ["free items leave the spare nodes after the last", 5, [undefined, undefined], undefined, [0, 1]],
    ["a junction at the end draws the items to it", 5, [undefined, undefined], "end", [3, 4]],
    ["a junction at the start keeps the items beside it", 5, [undefined, undefined], "start", [0, 1]],
    ["aligned right, the last item stands right before its region", 4, [undefined, "right"], undefined, [0, 3]],
    ["aligned left behind a junction at the end, the spare nodes go between", 5, ["left", undefined], "end", [0, 4]],
    ["centred, an item keeps a node either side", 4, ["center"], undefined, [1]],
    ["centred beside a junction, only its far side gets one", 3, ["center"], "start", [0]],
    ["two centred items fill the gap they share once", 5, ["center", "center"], undefined, [1, 3]],
    ["centring stops when the spare nodes run out", 3, ["center", "center"], undefined, [1, 2]],
    ["every gap closed, the default gap takes them anyway", 3, ["left"], "end", [2]],
    ["no spare node seats every item in order, whatever is written", 2, ["center", "right"], "start", [0, 1]],
  ])("%s", (_, k, aligns, junction, expected) => {
    expect(seatItems(k, aligns, junction)).toEqual(expected)
  })

  it("seats free items where the carve seats them now, at either junction end and at none", () => {
    const now = (k: number, m: number, end?: "start" | "end") =>
      Array.from({ length: m }, (_, j) => (end === "end" ? k - m : 0) + j)
    for (const end of [undefined, "start", "end"] as const)
      for (let m = 0; m <= 4; m++)
        for (let k = m; k <= m + 5; k++)
          expect(seatItems(k, Array<undefined>(m).fill(undefined), end), `k=${k} m=${m} ${end}`).toEqual(now(k, m, end))
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `yarn vitest run src/game/seatItems.spec.ts`
Expected: FAIL, `seatItems` is not exported.

- [ ] **Step 3: Write it**

`src/game/laidFloor.ts`: `import type { Alignment } from "./lockAuthoring"`, and above `doorsOnCorridor`:

```ts
/**
 * WHERE EACH OF A CORRIDOR'S ITEMS STANDS AMONG ITS `k` NODES. Its `k - m` spare nodes fall into `m + 1` gaps: before
 * the first item, between each two, after the last. A gap is closed when the item after it is aligned left, the item
 * before it is aligned right, or it touches the junction end. Each centred item first takes one spare node into each
 * open gap beside it (a shared gap once); the rest go to the default gap — after the last item, or before the first
 * when the junction is at the end — or, closed, to the nearest open gap, or, every gap closed, to it anyway. With
 * nothing aligned this is where the carve has always stood a corridor's doors.
 */
export const seatItems = (
  k: number,
  aligns: ReadonlyArray<Alignment | undefined>,
  junction?: "start" | "end"
): number[] => {
  const m = aligns.length
  const gaps = Array<number>(m + 1).fill(0)
  const closed = gaps.map(
    (_, g) =>
      aligns[g] === "left" ||
      aligns[g - 1] === "right" ||
      (g === 0 && junction === "start") ||
      (g === m && junction === "end")
  )
  let spare = k - m
  const filled = new Set<number>()
  aligns.forEach((align, j) => {
    if (align !== "center") return
    for (const g of [j, j + 1])
      if (!closed[g] && !filled.has(g) && spare > 0) {
        gaps[g]++
        filled.add(g)
        spare--
      }
  })
  const preferred = junction === "end" ? 0 : m
  const open = gaps.map((_, g) => g).filter(g => !closed[g])
  const into =
    closed[preferred] && open.length > 0
      ? open.reduce((best, g) => (Math.abs(g - preferred) < Math.abs(best - preferred) ? g : best))
      : preferred
  gaps[into] += spare
  const at: number[] = []
  let node = gaps[0]
  for (let j = 0; j < m; j++) {
    at.push(node)
    node += 1 + gaps[j + 1]
  }
  return at
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `yarn vitest run src/game/seatItems.spec.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/laidFloor.ts src/game/seatItems.spec.ts
git commit -m "feat(floor): the gap rule stands a corridor's items among its nodes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 7: The plan makes a corridor of each connection and two stretches of a fall

**Review weight:** full (soundness: the plan).

**Files:**

- Modify: `src/game/lockPlan.ts` (`PlanSeat`, `PlanRegion`, `PlanCorridor`, `planLockFloor`)
- Test: `src/game/lockPlan.spec.ts`

**Interfaces:**

- Consumes: `floorCorridors`, `fallingStretches` (task 4); `Alignment`.
- Produces: `PlanSeat` door `{ for: "door"; barrier; entrance; corridor?: string }`; `PlanRegion.answersTo?: string`;
  `PlanCorridor.align?: Record<string, Alignment>` (oriented from `from` to `to`); ids `from>to`, `from>to~k`,
  `<drop>:ledge`, `<drop>:landing`; `PlanDrop.launch`/`landing` name the ledge/landing region where a stretch exists.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/lockPlan.spec.ts` (add `freeRegions` from `./lockAuthoring` and `parseLock` from `./lockNotation`
to the imports):

```ts
describe("corridors that share a pair, and corridors that fall", () => {
  const plan = (text: string, name: string) => planOf([{ lock: freeRegions(parseLock(text, name).lock) }])!

  it("makes a corridor of each connection on a pair, the first keeping its id and the route", () => {
    const p = plan("in -[A]- out\nin -[B]- out\nA toggle @in\nB toggle @in", "twin")
    expect(p.corridors.filter(c => c.barriers.length > 0)).toEqual([
      {
        id: "twin.in>twin.out",
        from: "twin.in",
        to: "twin.out",
        onRoute: true,
        barriers: ["twin.in-out"],
        minNodes: 0,
      },
      {
        id: "twin.in>twin.out~1",
        from: "twin.in",
        to: "twin.out",
        onRoute: false,
        barriers: ["twin.in-out#2"],
        minNodes: 0,
      },
    ])
  })

  it("plans a gate then a drop as a stretch to a ledge of its own, the drop leaving the ledge", () => {
    const p = plan("in -- out\nin -[A]- >> pit\npit -- out\nA toggle @in", "fall")
    expect(p.regions).toContainEqual({
      id: "fall.in>pit:ledge",
      owner: "fall",
      onRoute: false,
      answersTo: "fall.in",
      seats: [],
      minNodes: 1,
    })
    expect(p.corridors).toContainEqual({
      id: "fall.in>fall.in>pit:ledge",
      from: "fall.in",
      to: "fall.in>pit:ledge",
      onRoute: false,
      barriers: ["fall.in-pit"],
      minNodes: 0,
    })
    expect(p.drops).toEqual([{ id: "fall.in>pit", launch: "fall.in>pit:ledge", landing: "fall.pit" }])
  })

  it("plans a drop then a gate as a landing of its own on a stretch hung from the region it leads to", () => {
    const p = plan("in -- out\nin >> -[A]- pit\npit -- out\nA toggle @in", "fall")
    expect(p.regions).toContainEqual({
      id: "fall.in>pit:landing",
      owner: "fall",
      onRoute: false,
      answersTo: "fall.pit",
      seats: [],
      minNodes: 1,
    })
    expect(p.corridors).toContainEqual({
      id: "fall.in>pit:landing>fall.pit",
      from: "fall.in>pit:landing",
      to: "fall.pit",
      onRoute: false,
      barriers: ["fall.in-pit"],
      minNodes: 0,
    })
    expect(p.drops).toEqual([{ id: "fall.in>pit", launch: "fall.in", landing: "fall.in>pit:landing" }])
  })

  it("carries a corridor's alignment, turned to the way it is laid", () => {
    const p = plan("in -[A]--- -[B]- hall\nhall -- out\nA toggle @in\nB toggle @in", "aligned")
    expect(p.corridors.find(c => c.id === "aligned.in>aligned.hall")).toMatchObject({
      barriers: ["aligned.in-hall", "aligned.in-hall#2"],
      align: { "aligned.in-hall": "left" },
    })
  })

  it("gives a barred region a door on each corridor from one neighbour", () => {
    const p = plan("in -- hall\nin -- hall\nhall -- out\nhall -[S]\nS toggle @in", "barred")
    expect(p.regions.find(r => r.id === "barred.hall")!.seats).toEqual([
      { for: "door", barrier: "barred.hall:barred", entrance: "barred.in", corridor: "barred.in>barred.hall" },
      { for: "door", barrier: "barred.hall:barred", entrance: "barred.in", corridor: "barred.in>barred.hall~1" },
      { for: "door", barrier: "barred.hall:barred", entrance: "barred.out" },
    ])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockPlan.spec.ts`
Expected: FAIL — one corridor per pair id, no ledge/landing, no `align`, door seats with no `corridor`.

- [ ] **Step 3: The plan**

`src/game/lockPlan.ts`. Imports: `import type { Alignment } from "./lockAuthoring"`; from `./obstacles` add
`fallingStretches`, `floorCorridors` and the type `OneWayObstacle`.

```ts
export type PlanSeat =
  | { for: "control"; control: string }
  | { for: "tile"; control: string; step: number }
  | { for: "junction"; control: string }
  /** `corridor`: the corridor it stands on, named where its pair has more than one. */
  | { for: "door"; barrier: string; entrance: string; corridor?: string }
```

In `PlanRegion` add after `mouth`:

```ts
  /** A falling corridor's ledge or landing: one node the layout does not name, answering to this region. */
  answersTo?: string
```

In `PlanCorridor` add after `barriers`:

```ts
  /** The aligned gates, read from `from` to `to`; a gate it does not name is free. */
  align?: Record<string, Alignment>
```

Rewrite `planLockFloor` from `const drops = …` through the region-barrier seats (keep `seatsOf`, `route`, `onRoute`,
`routeLinks`, `ownerOf`, the control seats, `regions`, `junctions`, the return):

```ts
const regionDrops = obstacles.flatMap(obstacle =>
  obstacle.kind === "oneWay" ? [[obstacle.at.between[0], obstacle.at.between[1]] as const] : []
)
const route = regionRoute(layout)
const onRoute = new Set(route)
const routeLinks = new Set(route.slice(1).map((region, i) => keyOf(route[i], region)))
const mouthOf = new Map<string, string>()
for (const { mouth, regions } of offRouteChains(layout, regionDrops))
  for (const region of regions) mouthOf.set(region, mouth)
const ownerOf = new Map(placed.flatMap(({ instance, regions }) => regions.map(region => [region, instance] as const)))

const pick = (align: Readonly<Record<string, Alignment>>, ids: readonly string[]) => {
  const kept = Object.fromEntries(ids.flatMap(id => (align[id] ? [[id, align[id]] as const] : [])))
  return Object.keys(kept).length > 0 ? { align: kept } : {}
}
const corridors: PlanCorridor[] = []
const stretchEnds: PlanRegion[] = []
const ends = new Map<string, { launch: string; landing: string }>()
const firstOfPair = new Set<string>()
const pairCount = new Map<string, number>()
const floor = floorCorridors(layout, obstacles, config.barrierOrder ?? [])
for (const corridor of floor)
  if (corridor.drop === undefined) pairCount.set(corridor.key, (pairCount.get(corridor.key) ?? 0) + 1)
const layoutCorridors: { corridor: PlanCorridor; repeated: boolean }[] = []
for (const corridor of floor) {
  if (corridor.drop === undefined) {
    const [from, to] = corridor.between
    const first = !firstOfPair.has(corridor.key)
    firstOfPair.add(corridor.key)
    const planned: PlanCorridor = {
      id: first ? corridorId(from, to) : `${corridorId(from, to)}~${corridor.index}`,
      from,
      to,
      onRoute: first && routeLinks.has(corridor.key),
      barriers: [...corridor.barriers],
      minNodes: Math.max(0, corridor.barriers.length - 1),
      ...pick(corridor.align, corridor.barriers),
    }
    corridors.push(planned)
    layoutCorridors.push({ corridor: planned, repeated: (pairCount.get(corridor.key) ?? 0) > 1 })
    continue
  }
  // A FALLING CORRIDOR: its drop, with a stretch hung from each region it joins for the items on that side.
  const drop = obstacles.find(o => o.id === corridor.drop) as OneWayObstacle
  const { launch, landing, upstream, downstream, align } = fallingStretches(corridor, drop)
  const end = (id: string, answersTo: string): PlanRegion => ({
    id,
    ...(ownerOf.get(answersTo) === undefined ? {} : { owner: ownerOf.get(answersTo) }),
    onRoute: false,
    answersTo,
    seats: [],
    minNodes: 1,
  })
  const ledge = upstream.length > 0 ? `${drop.id}:ledge` : launch
  const lands = downstream.length > 0 ? `${drop.id}:landing` : landing
  if (upstream.length > 0) {
    stretchEnds.push(end(ledge, launch))
    corridors.push({
      id: corridorId(launch, ledge),
      from: launch,
      to: ledge,
      onRoute: false,
      barriers: upstream,
      minNodes: upstream.length - 1,
      ...pick(align, upstream),
    })
  }
  if (downstream.length > 0) {
    stretchEnds.push(end(lands, landing))
    corridors.push({
      id: corridorId(lands, landing),
      from: lands,
      to: landing,
      onRoute: false,
      barriers: downstream,
      minNodes: downstream.length - 1,
      ...pick(align, downstream),
    })
  }
  ends.set(drop.id, { launch: ledge, landing: lands })
}
const drops: PlanDrop[] = obstacles.flatMap(obstacle =>
  obstacle.kind === "oneWay"
    ? [
        {
          id: obstacle.id,
          launch: ends.get(obstacle.id)?.launch ?? obstacle.at.between[0],
          landing: ends.get(obstacle.id)?.landing ?? obstacle.at.between[1],
        },
      ]
    : []
)
```

Replace the region-barrier seat loop:

```ts
for (const obstacle of obstacles) {
  if (!isRegionGate(obstacle)) continue
  const { region } = obstacle.at
  for (const { corridor, repeated } of layoutCorridors)
    if (corridor.from === region || corridor.to === region)
      seat(region, {
        for: "door",
        barrier: obstacle.id,
        entrance: corridor.from === region ? corridor.to : corridor.from,
        ...(repeated ? { corridor: corridor.id } : {}),
      })
}
```

`regions` becomes `[...layout.regions.map(…as now…), ...stretchEnds]`. Delete the old `gatesOn` map and the old
`corridors` `layout.connections.map(…)`. `junctions`, which reads `corridors`, now also finds a falling corridor's
upstream stretch as an arm when its first gate is the fork's.

- [ ] **Step 4: Run them to see them pass, and nothing else planned moves**

```bash
yarn vitest run src/game/lockPlan.spec.ts src/game/layLocks.spec.ts src/game/laidFloor.spec.ts src/game/laidCarve.spec.ts
yarn check-types && yarn lint
```

Expected: PASS. If `laidFloor.spec.ts` fails on a door
seat, `doorsOnCorridor` has not learned `corridor` yet: that is task 8's first step; do it here instead and keep it.

- [ ] **Step 5: Commit**

```bash
git add src/game/lockPlan.ts src/game/lockPlan.spec.ts
git commit -m "feat(floor): the plan lays each corridor of a pair, and a fall as two stretches" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 8: The lay and the seat follow the plan

**Review weight:** full (soundness: lay and seat).

**Files:**

- Modify: `src/game/layLocks.ts` (`regionStep`'s `reserve`)
- Modify: `src/game/laidFloor.ts` (`doorsOnCorridor`, `corridorSplit` → `corridorSeats`, `corridorLabels`,
  `seatLaidFloor`, `lengtheningCandidates`)
- Test: `src/game/layLocks.spec.ts`, `src/game/laidFloor.spec.ts`

**Interfaces:**

- Consumes: `seatItems` (task 6), the plan of task 7.
- Produces: `LaidFloor.label` maps a ledge/landing node to its `answersTo` region; `gateDoor` holds every gate of a
  falling corridor's stretches; `seatDemand` has no entry for a ledge or landing.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/layLocks.spec.ts`:

```ts
describe("laying corridors that share a pair, and corridors that fall", { timeout: 120_000 }, () => {
  const planFor = (text: string, name: string) => planOf([{ lock: freeRegions(parseLock(text, name).lock) }])
  const nodesOf = (laid: { regions: { id: string; nodes: string[] }[] }, id: string) =>
    laid.regions.find(region => region.id === id)!.nodes
  const layAll = (plan: ReturnType<typeof planFor>) =>
    SEEDS.slice(0, 20).flatMap(seed => {
      const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
      if (!result.ok) return []
      expectLaidPlan(plan, result.laid)
      return [result.laid]
    })

  it("lays both corridors of one pair, only the first on the route", () => {
    const plan = planFor("in -[A]- hall\nin -[B]- hall\nhall -- out\nA toggle @in\nB toggle @in", "twin")
    const laid = layAll(plan)
    expect(laid.length).toBeGreaterThanOrEqual(15)
    for (const floor of laid) {
      const second = floor.corridors.find(c => c.id === "twin.in>twin.hall~1")!
      expect(nodesOf(floor, "twin.in")).toContain(second.start)
      expect(nodesOf(floor, "twin.hall")).toContain(second.end)
      expect(second.nodes.some(node => floor.route.includes(node))).toBe(false)
    }
  })

  it("lays a falling corridor's door, its ledge, and a drop from the ledge landing on a node of its region", () => {
    const plan = planFor("in -- out\nin -[A]- >> pit\npit -- out\nA toggle @in", "fall")
    const laid = layAll(plan)
    expect(laid.length).toBeGreaterThanOrEqual(15)
    for (const floor of laid) {
      const drop = floor.drops.find(d => d.id === "fall.in>pit")!
      expect(nodesOf(floor, "fall.in>pit:ledge")).toEqual([drop.from])
      expect(nodesOf(floor, "fall.pit")).toContain(drop.to)
      expect(floor.corridors.find(c => c.id === "fall.in>fall.in>pit:ledge")!.nodes.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("lands a drop with items on both sides on its downstream stretch", () => {
    const plan = planFor("in -- out\nin -[A]- >> -[A]- pit\npit -- out\nA toggle @in", "fall")
    const laid = layAll(plan)
    expect(laid.length).toBeGreaterThanOrEqual(15)
    for (const floor of laid) {
      const drop = floor.drops.find(d => d.id === "fall.in>pit")!
      expect(nodesOf(floor, "fall.in>pit:landing")).toEqual([drop.to])
      expect(nodesOf(floor, "fall.in>pit:ledge")).toEqual([drop.from])
    }
  })
})
```

Append to `src/game/laidFloor.spec.ts` (add `freeRegions`, `parseLock` imports if absent):

```ts
describe("doors on corridors that carry items", { timeout: 60_000 }, () => {
  const planFor = (text: string, name: string) => planOf([{ lock: freeRegions(parseLock(text, name).lock) }])

  it("labels a falling corridor's stretches and ledge by the region each hangs from, and stands its door on them", () => {
    const plan = planFor("in -- out\nin -[A]- >> -[A]- pit\npit -- out\nA toggle @in", "fall")
    for (const seed of SEEDS) {
      const floor = seated(plan, seed)
      const up = floor.gateDoor.get("fall.in-pit")!
      const down = floor.gateDoor.get("fall.in-pit#2")!
      expect(floor.label.get(up)).toBe("fall.in")
      expect(floor.label.get(down)).toBe("fall.pit")
      const [drop] = floor.drops
      expect(floor.label.get(drop.from)).toBe("fall.in")
      expect(floor.label.get(drop.to)).toBe("fall.pit")
      expect(floor.seatDemand.has("fall.in>pit:ledge")).toBe(false)
    }
  })

  it("stands a door aligned right on the node beside the region after it", () => {
    const base = planFor("in ---[A]- hall\nhall -- out\nA toggle @in", "aligned")
    const plan = { ...base, corridors: base.corridors.map(c => ({ ...c, minNodes: c.minNodes + 2 })) }
    for (const seed of SEEDS) {
      const toLay = planToLay(plan, WANTS)
      const result = layLockPlan(toLay, { seed, n: startingGridSize(toLay) })
      if (!result.ok) continue
      const floor = seatLaidFloor(plan, result.laid)
      const nodes = result.laid.corridors.find(c => c.id === "aligned.in>aligned.hall")!.nodes
      expect(floor.gateDoor.get("aligned.in-hall")).toBe(nodes[nodes.length - 1])
    }
  })
})
```

(`planToLay` with a raised `minNodes` keeps the larger of the two; if it resets corridors to their door count, raise
`minNodes` on `toLay`'s corridors instead, as `layLocks.spec.ts`'s "roomy" test does.)

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/layLocks.spec.ts src/game/laidFloor.spec.ts`
Expected: FAIL — ledge/landing labelled by their own ids, the aligned door on node 0.

- [ ] **Step 3: The lay**

`src/game/layLocks.ts`, in `regionStep`'s `run`:

```ts
const reserve =
  entrance || region.id === plan.route[plan.route.length - 1] || region.answersTo !== undefined
    ? 0
    : MAX_EXTRA_PER_REGION
```

- [ ] **Step 4: The seat**

`src/game/laidFloor.ts`. `doorsOnCorridor` matches a door seat to its corridor:

```ts
seat.for === "door" && seat.entrance === entrance && (seat.corridor === undefined || seat.corridor === corridor.id)
```

Replace `corridorSplit` and `corridorLabels`:

```ts
/** The region a plan region's nodes answer to: a ledge's or a landing's own region, otherwise itself. */
const labelOf = (plan: LockPlan, id: string): string => plan.regions.find(region => region.id === id)?.answersTo ?? id

/**
 * WHERE A CORRIDOR OF `k` NODES STANDS ITS DOORS (`seatItems`, its junction end closed) and how it is split between
 * its two regions: the nodes before its first door answer to `from`, the rest to `to`; with no door, halfway.
 */
const corridorSeats = (plan: LockPlan, corridor: PlanCorridor, k: number): { doors: number[]; split: number } => {
  const junctionRegions = new Set(plan.junctions.map(junction => junction.region))
  const end = junctionRegions.has(corridor.from) ? "start" : junctionRegions.has(corridor.to) ? "end" : undefined
  const doors = seatItems(
    k,
    doorsOnCorridor(plan, corridor).map(door => (door.kind === "gate" ? corridor.align?.[door.id] : undefined)),
    end
  )
  return { doors, split: doors.length > 0 ? doors[0] : Math.ceil(k / 2) }
}

const corridorLabels = (plan: LockPlan, corridor: PlanCorridor, k: number): string[] => {
  const { split } = corridorSeats(plan, corridor, k)
  return Array.from({ length: k }, (_, i) => labelOf(plan, i < split ? corridor.from : corridor.to))
}
```

In `seatLaidFloor`: the region labels read `label.set(node, labelOf(plan, region.id))`; the corridor loop reads

```ts
    const { doors: at } = corridorSeats(plan, corridor, k)
    laidCorridor.nodes.forEach((node, i) => label.set(node, labels[i]))
    doors.forEach((door, j) => {
      const cell = laidCorridor.nodes[at[j]]
```

(delete `const { firstDoor } = corridorSplit(…)`), and `seatDemand` skips ledges and landings:

```ts
    seatDemand: new Map(
      plan.regions.filter(region => region.answersTo === undefined).map(region => [region.id, nodesForSeats(plan, region)])
    ),
```

In `lengtheningCandidates`, a ledge or landing is never lengthened:

```ts
for (const region of plan.regions)
  if (region.answersTo === undefined) consider("region", region.id, region.id, region.onRoute)
```

`grep -n corridorSplit src/game/laidFloor.ts` must print nothing.

- [ ] **Step 5: Run them to see them pass**

```bash
yarn vitest run src/game/layLocks.spec.ts src/game/laidFloor.spec.ts src/game/seatItems.spec.ts src/game/laidCarve.spec.ts src/game/lockPlan.spec.ts
yarn check-types && yarn lint
```

Expected: PASS; exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/game/layLocks.ts src/game/laidFloor.ts src/game/layLocks.spec.ts src/game/laidFloor.spec.ts
git commit -m "feat(floor): lay parallel and falling corridors, and stand doors by the gap rule" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 9: The carve, and the carve with the topology mod off

**Review weight:** full (soundness: carve and mod off).

**Files:**

- Modify: `src/game/siteAssembler.ts` (the carve-agreement `gateKeys` and `dropLandingFaults` input)
- Create: `src/game/testSupport/corridorFixtures.ts`
- Test: `src/game/corridorItemsCarve.spec.ts` (new), `src/mods/topology/carveNeverDependsOnAMod.spec.ts`

**Interfaces:**

- Consumes: `dropsLandingOnAStretch`, `BarrierRun.falling` (task 4); tasks 5-8.
- Produces: `CORRIDOR_ITEMS: string` and `corridorItemsFloor(): FloorConfig` from
  `src/game/testSupport/corridorFixtures.ts`.

- [ ] **Step 1: The fixture and the failing tests**

`src/game/testSupport/corridorFixtures.ts`:

```ts
import { freeRegions } from "@/game/lockAuthoring"
import { parseLock } from "@/game/lockNotation"
import type { FloorConfig } from "@/game/siteTypes"
import { BINDING } from "./lockFixtures"

/** A made-up lock with every new corridor shape: a gate aligned right, a second corridor on its pair, and a fall
 * between two gates the one lever owns. */
export const CORRIDOR_ITEMS =
  "in ---[A]- hall\nin -[B]- hall\nhall -- out\nhall -[A]- >> -[A]- pit\npit -- out\nA toggle @in\nB toggle @in"

export const corridorItemsFloor = (): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: BINDING,
  locks: [{ lock: freeRegions(parseLock(CORRIDOR_ITEMS, "corridorItems").lock) }],
})
```

`src/game/corridorItemsCarve.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { walkFloorLock } from "./floorLockWalk"
import { freeRegions } from "./lockAuthoring"
import { parseLock } from "./lockNotation"
import { CORRIDOR_ITEMS } from "./testSupport/corridorFixtures"
import { BINDING, carveLockFloor } from "./testSupport/lockFixtures"

describe("a lock whose corridors carry items, carved", { timeout: 180_000 }, () => {
  it.each([
    ["two corridors on one pair", "in -[A]- hall\nin -[B]- hall\nhall -- out\nA toggle @in\nB toggle @in"],
    ["a gate then a drop", "in -- out\nin -[A]- >> pit\npit -- out\nA toggle @in"],
    ["a drop between two gates", "in -- out\nin -[A]- >> -[A]- pit\npit -- out\nA toggle @in"],
    ["a gate aligned right", "in ---[A]- hall\nhall -- out\nA toggle @in"],
    ["every shape at once", CORRIDOR_ITEMS],
  ])("carves %s and walks it sound", (_, text) => {
    const grid = carveLockFloor(freeRegions(parseLock(text, "items").lock), BINDING)
    expect(walkFloorLock(grid)).toEqual({ sound: true, states: expect.any(Number) })
  })
})
```

In `src/mods/topology/carveNeverDependsOnAMod.spec.ts`: import `corridorItemsFloor` from
`@/game/testSupport/corridorFixtures` and add `corridorItemsFloor,` to `FIXTURES`.

- [ ] **Step 2: Run them to see what fails**

```bash
yarn vitest run src/game/corridorItemsCarve.spec.ts
```

Expected: the parallel and aligned cases may already pass; a falling case fails with `carved at none of 12 seeds`
and a reason. The likeliest, by the measurement above: `dropLandsApart` (a drop landing on its stretch is asked
to reach every door bounding its region) or a `gateDoorMisplaced`/`regionAttachedThrough` naming a ledge.

- [ ] **Step 3: The carve agreement reads falling corridors**

`src/game/siteAssembler.ts`, where `gateKeys` and `dropIdsWithRuns` are built for the carve agreement (search
`const gateKeys = runs.flatMap`): import `dropsLandingOnAStretch` from `./obstacles`, and write

```ts
const gateKeys = runs.flatMap(run =>
  run.gates.map((o, i) => ({
    id: o.id,
    between: o.at.between,
    key: gateKeyOf(o.id),
    // A gate on a falling corridor stands on a stretch of its own region and bounds no region a drop lands in.
    bounds: run.falling
      ? []
      : [...(i === 0 ? [run.between[0]] : []), ...(i === run.gates.length - 1 ? [run.between[1]] : [])],
  }))
)
// A drop with a gate past it lands on its own stretch, laid for it, never in its region's ground.
const landsOnItsStretch = dropsLandingOnAStretch(authoredConfig.obstacles ?? [], authoredConfig.barrierOrder ?? [])
```

and pass `dropIdsWithRuns.filter(({ o }) => !landsOnItsStretch.has(o.id)).map(…)` to `dropLandingFaults`.

Run the spec again. If a falling case still refuses, follow superpowers:systematic-debugging: print the first
refusal (`carveLockFloor`'s error carries it), find the check that raises it (`grep -n '"<type>"' src/game/*.ts`),
and read it against the rulings above (stretches answer to the region they hang from; a ledge or landing is a laid
node, held from content as a drop end). Fix the reading, never a test. Report each such fix.

- [ ] **Step 4: Run them to see them pass, the mod off included**

```bash
yarn vitest run src/game/corridorItemsCarve.spec.ts src/mods/topology/carveNeverDependsOnAMod.spec.ts src/mods/topology/toggleOff.spec.ts src/game/siteAssembler.spec.ts src/game/laidCarve.spec.ts
yarn check-types && yarn lint
```

Expected: PASS. If `corridorItemsFloor` carves rarely with every mod (the mod-off sweep's
`notCarvedWithMod` outcomes are most of its 20), add it to `RARE` with `{ carved: 2, ceiling: 60 }`, as
`designerDoubleBack` is.

- [ ] **Step 5: Commit**

```bash
git add src/game/siteAssembler.ts src/game/testSupport/corridorFixtures.ts src/game/corridorItemsCarve.spec.ts src/mods/topology/carveNeverDependsOnAMod.spec.ts
git commit -m "feat(floor): a falling corridor carves, with the topology mod on or off" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 10: The walk's tests, and the drawing

**Review weight:** full for Part A (the walk's claims); Part B (the drawing) is light.

#### Part A: the walk's tests for the new shapes

**Files:**

- Test: `src/game/lockWalkSpec.spec.ts`

**Interfaces:** none. Spec section 6: the walk needs no change; these pin that it reads the new shapes.

- [ ] **Step 1: The tests**

Append to the `describe("walkSpecOf", …)` block in `src/game/lockWalkSpec.spec.ts` (`solveLock` from
`./lockReview`):

```ts
it("never climbs a gate-then-drop corridor from below: the stretch past the gate only falls", () => {
  const spec = compiled("in -- out\nin -[H]- >> pit\npit -- out\nH toggle @in")
  expect(spec.oneWays).toEqual([{ from: "in|pit#1.1", to: "pit" }])
  expect(Object.values(spec.gates).filter(gate => gate.from === "pit" || gate.to === "pit")).toEqual([
    expect.objectContaining({ from: "pit", to: "out" }),
  ])
})

it("walks a << corridor one way, from the region on the right onto the stretch beside its gate", () => {
  const spec = compiled("in -- out\nin -[H]- << pit\npit -- out\nH toggle @in")
  expect(spec.oneWays).toEqual([{ from: "pit", to: "in|pit#1.1" }])
  expect(spec.gates["in-pit"]).toMatchObject({ from: "in", to: "in|pit#1.1" })
})

it("walks two gated corridors on one pair as two ways", () => {
  const spec = compiled("in -[A]- out\nin -[B]- out\nA toggle @in\nB toggle @in")
  expect(spec.gates["in-out"]).toMatchObject({ from: "in", to: "out", owners: ["A"] })
  expect(spec.gates["in-out#2"]).toMatchObject({ from: "in", to: "out", owners: ["B"] })
  expect(solveLock(spec)!.actions).toBe(1)
})
```

- [ ] **Step 2: Run them**

Run: `yarn vitest run src/game/lockWalkSpec.spec.ts`
Expected: PASS (they characterise the walk; if one fails, the stretch name differs: read `walkSpecOf`'s
`${a}|${b}#${c}.${i + 1}` and correct the test's expected name, never the walk).

- [ ] **Step 3: Commit**

```bash
git add src/game/lockWalkSpec.spec.ts
git commit -m "test(locks): the walk reads falling, reversed and parallel corridors" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

#### Part B: the drawing shows falling and parallel corridors

**Files:**

- Modify: `src/game/lockDraw.ts` (`Sketch.drops`, `drawSketch`, `sketchOf`)
- Test: `src/game/lockDraw.spec.ts`

**Interfaces:** `drawLock(lock, drafts)` unchanged.

- [ ] **Step 1: Write the failing tests**

In `src/game/lockDraw.spec.ts`, replace `"lists a drop that carries a gate under the map"` with:

```ts
it("writes a falling corridor's gate on its drop line", () => {
  const art = draw("in -[H]- >> hall\nhall -- out\nH toggle @in")
  expect(art).toContain("■H:b")
  expect(art).not.toContain("no room to draw")
})
```

and append:

```ts
describe("drawLock, with corridors that share a pair", () => {
  it("draws both corridors and both gates", () => {
    const art = draw("in -[S]- hall\nin -[T]- hall\nhall -- out\nS toggle @in\nT toggle @in")
    expect(art).toContain("■S:b")
    expect(art).toContain("■T:b")
    expect(art).not.toContain("no room to draw")
  })

  it("draws a drop no connection names", () => {
    const { lock } = parseLock("in -- hall\nhall >> in\nhall -- out")
    const unnamed = { ...lock, connections: lock.connections.filter(c => !("between" in c)) }
    expect(drawLock(unnamed)).toContain("◀")
  })
})
```

(The landing arrow is one of `▲▶▼◀` by direction; if the layout lands it from another side, assert
`toMatch(/[▲▶▼◀]/)` instead.)

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockDraw.spec.ts`
Expected: FAIL — `■H:b` only in a note line under the map is still "contained"; if that test passes already, keep
it and check the note line is gone in step 4. The unnamed drop is not drawn.

- [ ] **Step 3: Draw**

`src/game/lockDraw.ts`: `Sketch.drops` becomes `{ from: string; to: string; token?: string }[]`. In `drawSketch`,
pull the spot-finding loop of the loop-closing joins into a helper used by both:

```ts
// A token goes on the longest straight stretch of a path with room for it; a path with none gets a note.
const placeToken = (path: Node[], token: string): boolean => {
  for (let i = 0; i < path.length; i++) {
    let j = i
    while (j + 1 < path.length && path[j + 1].y === path[i].y) j++
    if (j - i + 1 < token.length + 2) continue
    write(
      Math.min(path[i].x, path[j].x) + Math.floor((Math.abs(path[j].x - path[i].x) + 1 - token.length) / 2),
      path[i].y,
      token
    )
    return true
  }
  return false
}
```

The loop-gate code calls `if (!placeToken(path, token)) sketch.notes.push(…)` in place of its inline loop. The drop
loop, after `trace(path, drop)` and the two ends:

```ts
if (token !== undefined && !placeToken(path, token)) sketch.notes.push(`${from} -[${token}]- >> ${to}`)
```

(destructure `{ from, to, token }`). In `sketchOf`, a connection with a drop and other barriers pushes its gates'
tokens with the drop:

```ts
const others = barriers.filter(id => id !== drop)
drops.push({ ...lock.oneWays![drop], ...(others.length > 0 ? { token: others.map(token).join(" ") } : {}) })
```

(delete the old `notes.push` for it), and after the `forEach`, a drop no connection names is drawn too:

```ts
const named = new Set(lock.connections.flatMap(connection => barriersOf(connection)))
for (const [id, oneWay] of Object.entries(lock.oneWays ?? {})) if (!named.has(id)) drops.push(oneWay)
```

- [ ] **Step 4: Run them to see them pass**

```bash
yarn vitest run src/game/lockDraw.spec.ts
yarn run lock relay | head -30
```

Expected: PASS (the doubleBack snapshot is unchanged: its made-up text has no falling corridor); relay draws
`■C:on` on its drop line or in a note, and no "no room to draw".

- [ ] **Step 5: Commit**

```bash
git add src/game/lockDraw.ts src/game/lockDraw.spec.ts
git commit -m "feat(lock tool): draw a falling corridor's gates on its drop, and every corridor of a pair" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 11: `yarn lock` says whether a lock compiles; the four refused locks fixed

**Review weight:** light (tool output and four `.lock` files; the compile and walk they report are tasks 2-10).

#### Part A: `yarn lock` says whether a lock compiles, and writes its corridors back

**Files:**

- Modify: `src/game/lockNotation.ts` (new `corridorLine`)
- Modify: `src/game/lockCompile.ts` (new `describeLockFault`)
- Modify: `scripts/lockTable.ts` (`lockChecks`, new `corridorLines`), `scripts/lock.ts` (`report`)
- Test: `src/game/lockNotation.spec.ts`, `scripts/lockTable.spec.ts`

**Interfaces:**

- Produces: `corridorLine(lock: Lock, connection: LockConnection): string` (`lockNotation.ts`);
  `describeLockFault(fault: LockFault): string` (`lockCompile.ts`); `corridorLines(lock: Lock): string[]`
  (`scripts/lockTable.ts`); `lockChecks` returns `sound` false when `checkLock` refuses.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/lockNotation.spec.ts` (import `corridorLine`):

```ts
describe("a corridor written back", () => {
  const MECHANICS = "S toggle @in\nG toggle @in wet dry\nT torch @in\np plate @in stone\nY fork @in"
  it.each([
    "in -[S]--- >> hall",
    "in ---[S:a]- hall",
    "in --[G:wet]-- -[T]- hall",
    "in -[S|T]- << hall",
    "in -[p:empty]- -[S+T]- hall",
    "in -[Y]- -[S]- hall",
    "hall -[S]- in",
  ])("reads %s back to the same connection", line => {
    const text = `${line}\nin -- out\nhall -- out\nin -[Y]- out2\nout2 -- out\n${MECHANICS}`
    const { lock } = parseLock(text, "back")
    const written = corridorLine(lock, lock.connections[0])
    expect(written).toBe(line)
    expect(parseLock(text.replace(line, written), "back").lock).toEqual(lock)
  })
})
```

Append to `scripts/lockTable.spec.ts` (import `corridorLines` from `./lockTable`, `lockChecks` too):

```ts
describe("the compile verdict and the corridors", () => {
  const forkOnRoute = parseLock(["in -[Y]- west", "in -[Y]- out", "Y fork @in"].join("\n"), "forked")

  it("says ✓ compiles of a lock that compiles", () => {
    expect(lockChecks(solvable).checks).toContain("✓ compiles")
  })

  it("refuses by name a lock that walks and does not compile, and calls it unsound", () => {
    const row = lockRow("forked", forkOnRoute)
    expect(row).toMatchObject({ checks: "✗ refused: gateOwnedOffSeam id=in-out owner=Y", sound: false })
  })

  it("writes back every corridor with several items, an alignment, or a pair it shares", () => {
    const { lock } = parseLock(
      "in -[A]--- >> hall\nin -[B]- hall\nhall -- out\nin -[A]- out\nA toggle @in\nB toggle @in",
      "c"
    )
    expect(corridorLines(lock)).toEqual(["in -[A]--- >> hall", "in -[B]- hall"])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/lockNotation.spec.ts scripts/lockTable.spec.ts`
Expected: FAIL — `corridorLine`, `corridorLines` not exported; no compile line.

- [ ] **Step 3: Write it**

`src/game/lockNotation.ts` (import `alignOf`, `barriersOf`, `joinOf` and the types `Lock`, `LockConnection`):

```ts
/** A gate's condition as the notation writes it: an owner bare where its second state (or a plate's stone, a fork,
 * a sequence) opens it, otherwise `owner:state`. */
const conditionText = (lock: Lock, id: string): string => {
  const gate = lock.gates[id]
  return gate.owners
    .map(owner => {
      const plate = lock.weights?.plates[owner]
      if (plate) return plate.opens.empty.includes(id) ? `${owner}:empty` : owner
      const m = lock.mechanics[owner]
      if (!m || m.control === "fork-switch" || m.control === "sequence") return owner
      const states = Object.keys(m.opens)
      const opening = states.find(state => m.opens[state].includes(id))
      return opening === undefined || opening === states[1] ? owner : `${owner}:${opening}`
    })
    .join(gate.mode === "any" ? "|" : "+")
}

const DASHES: Record<Alignment, [number, number]> = { left: [1, 3], right: [3, 1], center: [2, 2] }

/** A connection written back in the notation, its items in order with their alignment: reading it gives the same corridor. */
export const corridorLine = (lock: Lock, connection: LockConnection): string => {
  const [a, b] = joinOf(connection)
  const align = alignOf(connection)
  const items = barriersOf(connection).map(id => {
    const drop = lock.oneWays?.[id]
    if (drop) return drop.from === a ? ">>" : "<<"
    const [left, right] = align[id] ? DASHES[align[id]] : [1, 1]
    return `${"-".repeat(left)}[${conditionText(lock, id)}]${"-".repeat(right)}`
  })
  const spot = lock.nestSpot?.from === a && lock.nestSpot.to === b ? ["-&>"] : []
  const all = [...items, ...spot]
  return `${a} ${all.length > 0 ? all.join(" ") : "--"} ${b}`
}
```

`src/game/lockCompile.ts`:

```ts
/** A fault in one line, its type then the names it carries: `gateOwnedOffSeam id=in-out owner=Y`. */
export const describeLockFault = (fault: LockFault): string => {
  const { type, ...rest } = fault.type === "topology" ? fault.fault : fault
  const names = Object.entries(rest).map(
    ([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : String(value)}`
  )
  return [type, ...names].join(" ")
}
```

`scripts/lockTable.ts`: import `checkLock`, `describeLockFault` from `../src/game/lockCompile`, `corridorLine` from
`../src/game/lockNotation`, `barriersOf`, `alignOf`, `joinOf` from `../src/game/lockAuthoring`. In `lockChecks`:

```ts
const faults = checkLock(lock)
const compiles = faults.length === 0
```

insert into `checks` right after the drafts line:

```ts
    compiles ? "✓ compiles" : `✗ refused: ${describeLockFault(faults[0])}`,
```

and `const sound = refused.length === 0 && drafts.length === 0 && compiles && reachable && walked.sound`. Add:

```ts
/** Every corridor worth writing back: one with several items, an aligned gate, or a pair it shares. */
export const corridorLines = (lock: Lock): string[] => {
  const pairKey = (connection: Lock["connections"][number]) => [...joinOf(connection)].sort().join("|")
  const perPair = new Map<string, number>()
  for (const connection of lock.connections)
    perPair.set(pairKey(connection), (perPair.get(pairKey(connection)) ?? 0) + 1)
  return lock.connections
    .filter(
      connection =>
        barriersOf(connection).length > 1 ||
        Object.keys(alignOf(connection)).length > 0 ||
        (perPair.get(pairKey(connection)) ?? 0) > 1
    )
    .map(connection => corridorLine(lock, connection))
}
```

`scripts/lock.ts`, in `report`, after `drawLock(lock, drafts)` is pushed:

```ts
const corridors = corridorLines(lock)
if (corridors.length > 0) lines.push("", "corridors:", ...corridors.map(line => `  ${line}`))
```

(import `corridorLines` from `./lockTable`).

- [ ] **Step 4: Run them to see them pass; read the catalogue**

```bash
yarn vitest run src/game/lockNotation.spec.ts scripts/lockTable.spec.ts src/game/lockCompile.spec.ts
yarn run lock doubleBack | grep -A4 '^corridors:'
yarn run lock > $S/lock-after-12.txt 2>&1; echo "exit $?"
grep '✗' $S/lock-after-12.txt
```

Expected: PASS; doubleBack's block lists `in -[Y]- leftLower` and `leftLower >> in`; the table's `✗` rows are
masonsRamp (`never reached: out`), clockwork (`✗ refused: gateOwnedTwice id=in-west owner=Y`), lamplighter and
observatory and lessons/boardPicksTheWay (`✗ refused: gateOwnedOffSeam …`), and relay only if its falling corridor
is refused (note the line for Part B).

- [ ] **Step 5: Commit**

```bash
git add src/game/lockNotation.ts src/game/lockCompile.ts scripts/lockTable.ts scripts/lock.ts src/game/lockNotation.spec.ts scripts/lockTable.spec.ts
git commit -m "feat(lock tool): yarn lock says whether a lock compiles, and writes its corridors back" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

#### Part B: the four refused locks fixed; relay measured

**Files:**

- Modify: `src/game/locks/clockwork.lock`, `src/game/locks/lamplighter.lock`, `src/game/locks/observatory.lock`,
  `src/game/locks/lessons/boardPicksTheWay.lock`
- Test: none of its own; `yarn run lock` against Part A's table.

**Interfaces:** none.

- [ ] **Step 1: Check what this task stands on**

```bash
git status --short
git diff $(cat $S/head-at-start.txt) -- src/game/locks/clockwork.lock src/game/locks/lamplighter.lock src/game/locks/observatory.lock src/game/locks/lessons/boardPicksTheWay.lock
grep -rn 'catalogueLock("\(clockwork\|lamplighter\|observatory\)")\|"boardPicksTheWay"' src/worldGen/spec
```

Expected: no diff (if the concurrent agent changed one of these files, re-measure that lock and skip it if it reads
✓); the grep prints only `LESSON_BINDINGS`'s `boardPicksTheWay:` key in `src/worldGen/spec/locks/lessons.ts`. A
placement (`lessonOnMainFloor("boardPicksTheWay")`, `catalogueLock("clockwork")`, …) means that floor moves in
task 12's bake: add it to task 12's expected list.

- [ ] **Step 2: The four files**

Write each file whole (read it first; the `// designed by: Claude` line and the header stay unless named):

`src/game/locks/lessons/boardPicksTheWay.lock`:

```
// designed by: Claude
// LESSON, junior: a board in a junction decides which way opens.

in -[Y]- left
in -[Y]- right
in -- out
Y fork @in
left $
```

`src/game/locks/lamplighter.lock`:

```
// designed by: Claude
// master. Light west first and the board is solved once; light east first and
// it is solved twice. The west-east drop is the optional shortcut.

in -[Y]- west
in -[Y]- east
in -[A+B]- out
west >> east >> in
Y fork @in
A toggle @west
B toggle @east
```

`src/game/locks/observatory.lock`:

```
// designed by: Claude
// master. A three-way board and two prizes; going east first, the drop to west
// saves a board solve.

in -[Y]- west
in -[Y]- north
in -[L+K]- out
in -[Y]- east
east >> west
west >> in
Y fork @in
L activator @west
K activator @east
north *
```

`src/game/locks/clockwork.lock`:

```
// designed by: Claude
// master. The exit wants the lever thrown, and the lever stands behind the
// board: throwing it shuts the board's way behind you, so only a drop takes
// you home.

in -[Y]- -[A:a]- west
in -[Y]- east
in -[A]- out
west >> in
out >> west
Y fork @in
A toggle @west
west *
east *
```

- [ ] **Step 3: The sweep**

```bash
yarn run lock > $S/lock-after-13.txt 2>&1; echo "exit $?"
diff $S/lock-before.txt $S/lock-after-13.txt
for l in clockwork lamplighter observatory lessons/boardPicksTheWay relay; do yarn run lock $l | grep -E '^(✓|✗|cheapest|!)'; done
```

Expected: exit 1 (masonsRamp only); the diff shows the four rows' steps (2, 3, 3, 0 — the measured cheapest) and
nothing else but relay's row if its verdict changed; each of the four prints `✓ compiles`, `✓ every region is reachable`, `✓ solvable`. **Relay:** if it reads `✗ refused: …`, do not edit it (the designer's instruction covers
the four); record the line for "Open after" and the report. If any of the four is not ✓, stop and report the line.

- [ ] **Step 4: Commit**

```bash
git add src/game/locks/clockwork.lock src/game/locks/lamplighter.lock src/game/locks/observatory.lock src/game/locks/lessons/boardPicksTheWay.lock
git commit -m "fix(locks): clockwork, lamplighter, observatory and boardPicksTheWay keep their forks off the route" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 12: doubleBack from its file, the docs, the one bake, the gate, push

**Review weight:** full (the world moves here, once).

The only task that bakes, runs content verifies (`vitest.verify.config.ts`, `yarn verify-content`), refreshes the
carve ledger and the tier fingerprints, and runs the clean-worktree gate. Part A edits the world spec and the verifies,
bakes and proves the world; Part B writes the docs, runs the gate and pushes.

#### Part A: doubleBack from its file

**Files:**

- Delete: `src/worldGen/spec/locks/doubleBack.ts`
- Modify: `src/worldGen/spec/expert.ts`, `src/worldGen/spec/dev.ts` (the placement, the import)
- Modify: `src/worldGen/devJourney.verify.ts`, `src/worldGen/lockPlanWorld.verify.ts` (and any verify step 6 finds
  pinning the twin)
- Modify: `src/data/generatedWorld.ts`, `src/data/carveLedger.json`, `src/data/tierFingerprints.json` (the bake)
- Test: the verifies; the floor-by-floor diff.

**Interfaces:**

- Consumes: every earlier task.
- Produces: `expert_1` pyramid 4 floor 0 and the dev pyramid 2 floor 0 placing `freeRegions(catalogueLock("doubleBack"))`.

- [ ] **Step 1: Check what this task stands on**

```bash
git status --short
git status --short src/data/
git log --oneline $(cat $S/head-at-start.txt)..HEAD -- src/worldGen/spec src/data
```

Expected: nothing under `src/data/`; the log lists the concurrent agent's commits since task 1, if any (their floors
are already in `HEAD`'s bake and are the baseline). Anything uncommitted under `src/data/` or `src/worldGen/`: stop.

- [ ] **Step 2: The baseline**

```bash
git show HEAD:src/data/generatedWorld.ts > $S/before.ts
cat > $S/floorDiff.ts <<EOF
import { generatedWorldConfigs as before } from "$S/before"
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
yarn tsx $S/floorDiff.ts
```

Expected: `no floor moved`.

- [ ] **Step 3: Fold the twin**

```bash
git rm src/worldGen/spec/locks/doubleBack.ts
```

`src/worldGen/spec/expert.ts`: delete `import { doubleBackLock } from "./locks/doubleBack"`; in the
`journey("expert_1").pyramid("last", { floorLocks: … })` rule, `locks: [{ lock: doubleBackLock() }]` →
`locks: [{ lock: freeRegions(catalogueLock("doubleBack")) }]`, and its comment becomes:

```ts
// The Valley of the Kings' last pyramid opens on the designer's doubleBack, read from its .lock file: a mirror fork
// whose far side is reached by ziplines. Every region takes `free`, so the floor's own content goes where the carve
// puts it; the lock stands on the main floor and the pyramid's other content is untouched.
```

`src/worldGen/spec/dev.ts`: delete the `doubleBackLock` import; in pyramid 2's `.floor(0, …)`,
`locks: [{ lock: doubleBackLock() }]` → `locks: [{ lock: freeRegions(catalogueLock("doubleBack")) }]`, and the
comment above `journey(DEV_JOURNEY_ID)` for pyramid 2 says "The designer's lock, read from its .lock file and placed
whole" in place of "The designer's lock, placed whole". `freeRegions` and `catalogueLock` are already imported in both
files; check with `grep -n 'freeRegions\|catalogueLock' src/worldGen/spec/expert.ts src/worldGen/spec/dev.ts`.

- [ ] **Step 4: The verifies stop pinning the twin**

`src/worldGen/devJourney.verify.ts`: replace the `doubleBackLock` import with
`import { freeRegions } from "@/game/lockAuthoring"`, `import { compileLock } from "@/game/lockCompile"` and
`import { catalogueLock } from "./spec/locks/catalogue"` (skip any already imported). Then:

- In "places the designer's doubleBack lock on pyramid 2, …":
  `expect(floor.locks).toEqual([{ lock: freeRegions(catalogueLock("doubleBack")) }])`.
- Replace the body of "compiles doubleBack's six regions, five gates and its drops, …", renamed
  `"compiles the catalogue doubleBack's regions, gates and drops between the floor's entrance and exit"`:

```ts
const [floor] = withDev[DEV_JOURNEY_ID][1]
const expanded = expandFloorLocks(floor as GameFloorConfig)
if (!expanded.ok) throw new Error(`doubleBack did not compile: ${JSON.stringify(expanded.reasons)}`)
const own = compileLock(freeRegions(catalogueLock("doubleBack")), floor.realisations!, { namespace: "doubleBack" })
if (!own.ok) throw new Error(`doubleBack did not compile alone: ${JSON.stringify(own.faults)}`)
const { regionLayout, obstacles } = expanded.config
expect(regionLayout!.regions.map(region => region.name)).toEqual([
  "entrance",
  ...own.fragment.regionLayout.regions.map(region => region.name),
  "exit",
])
expect(regionLayout!.connections).toEqual([
  ["entrance", "doubleBack.in"],
  ...own.fragment.regionLayout.connections,
  ["doubleBack.out", "exit"],
])
expect(obstacles).toEqual(own.fragment.obstacles)
```

- Replace the body of "compiles doubleBack's three controls: …", renamed
  `"compiles the catalogue doubleBack's controls, dressed by the floor's binding"`:

```ts
const [floor] = withDev[DEV_JOURNEY_ID][1]
const expanded = expandFloorLocks(floor as GameFloorConfig)
if (!expanded.ok) throw new Error(`doubleBack did not compile: ${JSON.stringify(expanded.reasons)}`)
const own = compileLock(freeRegions(catalogueLock("doubleBack")), floor.realisations!, { namespace: "doubleBack" })
if (!own.ok) throw new Error("doubleBack did not compile alone")
expect(expanded.config.controls).toEqual(own.fragment.controls)
```

If the floor's region or connection list orders the lock's part differently from the fragment, assert the
fragment's entries with `expect.arrayContaining` and the total length instead; never write the lock's contents out.

`src/worldGen/lockPlanWorld.verify.ts`, the test "lists the parts the designer's drawing shows: …", renamed
`"plans the catalogue doubleBack: its regions, corridors and drops between the floor's entrance and exit"`:

```ts
const floor = floorsOf(DEV_JOURNEY_ID).find(candidate => candidate.locks?.[0]?.lock.name === "doubleBack")!
const expanded = expandFloorLocks(floor)
if (!expanded.ok) throw new Error(`refused: ${JSON.stringify(expanded.reasons)}`)
const plan = planOf(floor)!
const layout = expanded.config.regionLayout!
expect(plan.route).toEqual(regionRoute(layout))
expect(plan.regions.map(region => region.id)).toEqual(layout.regions.map(region => region.name))
expect(plan.corridors.map(corridor => [corridor.from, corridor.to])).toEqual(layout.connections)
expect(plan.drops).toEqual(
  Object.entries(floor.locks![0].lock.oneWays ?? {}).map(([id, { from, to }]) => ({
    id: `doubleBack.${id}`,
    launch: `doubleBack.${from}`,
    landing: `doubleBack.${to}`,
  }))
)
expect(plan.junctions.map(junction => junction.control)).toEqual(["doubleBack.Y"])
```

(import `regionRoute` from `@/game/regions` if absent.)

- [ ] **Step 5: The dev floor still carves at its pinned seed**

```bash
yarn check-types && yarn lint
yarn vitest run --config vitest.verify.config.ts src/worldGen/devJourney.verify.ts src/worldGen/lockPlanWorld.verify.ts src/worldGen/layLocksWorld.verify.ts src/worldGen/laidCarveWorld.verify.ts src/app/SiteMap/devFloorWayOut.verify.ts src/worldGen/spec/locks/catalogue.spec.ts
```

Expected: PASS. If "carves pyramid 2 at its own pinned seed on the first attempt, sound" fails, re-record the seed:
write `$S/devSeed.ts` that builds the dev world the way that test does (copy its `withDev`, `assembleFloor` call and
acceptance — `refusal(result) === null`, `walkFloorLock` sound, `deadFloorRegions` empty — from
`devJourney.verify.ts`), tries `seed` from `floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), 2, 0)` upward
through `seedAtOffset` (`src/worldGen/carveSeedSearch.ts`) offsets 0..200, and prints the first that passes; put it
in `dev.ts`'s `seed:` and the verify's `expect(floor.seed).toBe(…)`, and rerun. Any other failure that pins the
twin's shape (`rightLower-s1`, `dropToLeft`, `S1` opening `a`): rewrite it to read the catalogue lock as above, and
list it in the report.

- [ ] **Step 6: Bake**

`git status --short src/data/` — expected: nothing. Then (long: every ledgered floor is searched again; run it in the
background or with the longest timeout):

```bash
yarn generate-world > $S/bake.log 2>&1; echo "exit $?" >> $S/bake.log
tail -30 $S/bake.log
```

Expected: `exit 0`; no `✗` line; `Lock sweep:` walks every floor that authors a mechanism.

- [ ] **Step 7: Prove what moved**

```bash
yarn tsx $S/floorDiff.ts
git diff --stat src/data/
git diff -U0 src/data/carveLedger.json | grep -E '^[-+] ' | grep -v '"hash":'
```

Expected: the floor diff prints exactly `expert_1 pyramid 4 floor 0` (plus any floor task 1 or task 11 added to the
list); `git diff --stat` lists `src/data/generatedWorld.ts` and `src/data/carveLedger.json`; the ledger grep prints
nothing. The `generatedWorld.ts` diff is that floor's lock JSON, its seed or packing if the search moved them, and the
`worldContentHash` line. Anything else: `git checkout -- src/data/`, stop, report what moved.

- [ ] **Step 8: The tier fingerprints and the content sweeps**

```bash
yarn vitest run --config vitest.verify.config.ts src/data/tierFingerprints.verify.ts 2>&1 | grep -E 'moved|->' | head
```

For each tier it names (expert, and junior only if a fixed lesson stands in the world), copy the new hash from
`(<old> -> <new>)` into `src/data/tierFingerprints.json`, and rerun: PASS. Then:

```bash
yarn verify-content 2>&1 | tee $S/verify.log | grep -E "×|Test Files|Tests "
```

Expected: only the three known `src/mods/puzzleSeeds.verify.ts` failures (or none); `toggleOff.verify.ts` and
`carveNeverDependsOnAMod.verify.ts` pass. Any other failure: stop and report it.

- [ ] **Step 9: Commit**

```bash
git add src/worldGen/spec/expert.ts src/worldGen/spec/dev.ts src/worldGen/devJourney.verify.ts src/worldGen/lockPlanWorld.verify.ts src/data/generatedWorld.ts src/data/carveLedger.json src/data/tierFingerprints.json
git add <each other verify step 5 led you to edit, by path>
git status --short
git commit -m "feat(world): doubleBack is read from its file, and the Valley's last pyramid re-bakes to it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

(`git rm` in step 3 already staged the twin's deletion.)

---

#### Part B: the docs

**Files:**

- Modify: `docs/mods/mechanic-contract.md`, `docs/mods/floor-topology-design.md`,
  `docs/game-design/world-spec-stability.md`, `docs/handover-stonegate.md`

**Interfaces:** none. Prettier reflows markdown tables: edit a table row by line and read the file back.

- [ ] **Step 1: The contract** (`docs/mods/mechanic-contract.md`, "## 7. The lock format")

1. Replace the JSON example with the JSON `yarn run lock doubleBack` prints last (the designer's lock, `connections`
   with `barriers`, `oneWays` an object), copied verbatim into the ```json block.
2. "### The nest spot": replace "a JSON lock writes one spot, and repeats a pair only as `connectionRepeated`" with
   "`compileLock` refuses a JSON lock's spot on a pair with another connection `nestSpotShared` too". The sentence on
   a spot "on a connection that also carries a gate, a drop or any other barrier is ignored" stays.
3. Replace "### Connections" with:

```markdown
### Connections

`connections` is the whole shape of the lock. A connection is a **corridor** between two regions; with nothing on
it, it is a passage the player simply walks, which is what lets two regions be distinct places without a barrier
between them — needed to put a sequence's tiles in different regions that nothing separates.

`barriers` are the corridor's **items, in order** from `between[0]` to `between[1]`: gates and at most one drop, one id
space. A drop stays an entry in `oneWays` (`from`/`to`, its direction of travel) and is named in its connection's
`barriers` where it stands; it makes the corridor one-way from where it stands, and a corridor falls once
(`corridorFallsTwice`). A `oneWays` entry no connection names is a corridor of its own carrying only that drop.

`align` names the gates the author placed (`-[A]---` left, `---[A]-` right, `--[A]--` centre in the notation): left
stands a gate right after what is written before it, right right before what follows, centre leaves room for puzzles
either side. It is a preference to the carve: it never refuses a lock and never lengthens a corridor. A gate it does
not name is free; a drop is never aligned (`alignOnDrop`), and an alignment names only its connection's own gates
(`alignOffConnection`).

**Two connections on one pair are two corridors**, the first written first. An edge gate stands ON a connection, so
every `from`/`to` gate must name a pair that is declared; a gate naming a pair that was never declared is an error
rather than a new passage. A region gate needs no connection: it bars a region rather than an edge.
```

- [ ] **Step 2: Topology and stability**

`docs/mods/floor-topology-design.md`, "### One-ways": after the code block, add the paragraph "A drop is an item of
its corridor: a corridor may carry gates and one drop, in order (`in -[Y]- >> hall`). The stretch either side of the
drop is walked both ways and the drop only along its arrow; on the floor it is a **falling corridor**, a drop with a
stretch hung from each region for the items on that side." Criterion 6, "**A connecting corridor may absorb side
paths.**", gains on its line: "Where on it they can go is the author's alignment: a gate aligned against a region or
an item leaves no node between them."

`docs/game-design/world-spec-stability.md`, "## Moves the walls" table: add a row (edit by line, then
`yarn prettier --write docs/game-design/world-spec-stability.md` and read it back):

```markdown
| A placed lock's alignment or parallel corridors | Structural: which node a door stands on, and how many corridors join two regions. Re-carves the lock's floor. |
```

- [ ] **Step 3: The handover**

`docs/handover-stonegate.md`: delete the bullet "**doubleBack's TypeScript twin cannot fold yet.** …" (answered:
corridors carry items; the twin is folded) and, under "Unanswered", the bullet "should `yarn lock` show every
`checkLock` fault (e.g. `connectionRepeated`)?" (answered: it prints the first, as `✓ compiles` / `✗ refused`). Under
"Designer decisions to keep" add:

```markdown
- **Corridors carry items** (2026-10-09): a corridor carries gates and one drop in order, dashes align a gate, two
  lines on one pair are two corridors, `<<` reads right to left. doubleBack is read from its `.lock` file; clockwork,
  lamplighter, observatory and boardPicksTheWay were fixed so their forks stay off the route. Plan:
  `docs/superpowers/plans/2026-10-09-corridor-items.md`.
```

If relay read `✗` in task 11, add under "Unanswered": "relay's falling corridor is refused `<fault>`: fix it, or name
it `-blocked`?"

- [ ] **Step 4: Commit the docs**

```bash
git add docs/mods/mechanic-contract.md docs/mods/floor-topology-design.md docs/game-design/world-spec-stability.md docs/handover-stonegate.md
git commit -m "docs: corridors carry items, in the contract and the topology" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 5: The whole gate in a clean worktree**

```bash
G=$S/gate
git worktree add $G HEAD && cd $G && yarn install --immutable && yarn verify && yarn verify-content && yarn build
```

Expected: all pass but the three known `puzzleSeeds.verify.ts` failures. If `lint --fix` rewrote a file, copy the
change back, commit it in the real worktree (`style: lint`), and run the gate again. If betterer reports moved line
positions, run `yarn betterer:update` in the real worktree and commit `.betterer.results`
(`chore: refresh the betterer line positions`). If a lint or betterer fix edits a carve-graph file, re-run Part A
steps 6-7 and commit the ledger (`chore: refresh the carve ledger hashes`). Then `cd -`,
`git worktree remove $G`, `git push` (never forced), and `gh pr checks` if a PR exists for the branch.

- [ ] **Step 6: The report**

`git diff --stat $(cat $S/head-at-start.txt)..HEAD`; relay's verdict line; every verify rewritten in task 12 and
why; any carve fix task 9 needed; the dev seed if it was re-recorded; the floors the bake moved.

---

## Open after

- **The walk and an unnamed drop.** Compile reads a JSON `oneWays` entry no connection names as a corridor of its
  own; `walkSpecOf` does not walk it. No placed lock writes one once the twin is folded, and the notation cannot;
  test fixtures (`mirrorForkLock`) do. Make the walk read it, or make the fixtures name their drops.
- **relay** (task 11's measurement): if refused, its falling corridor `r3 -[C]- >> in` waits on the designer.
- **The fork-on-the-route rule** stands (`gateOwnedOffSeam`); the four fixes work round it. A fork that gates the way
  out is a designer question for a later spec.
- **A falling corridor out of a barred region** gets no region door on its stretch, as a drop launching from one gets
  none today.
- **Alignment of a drop or the nest spot, a nest spot among a corridor's items, two drops on a corridor, alignment
  that lengthens a corridor**: not in scope (spec, "Not in scope").

## Self-review notes

- **Spec section 1** (tokens, alignment table, refusals, `LOCK_SYNTAX`): task 2. **Section 2** (the shared Lock,
  `align`, retired and new faults, `nestSpotShared` for JSON): tasks 2, 3. **Section 3** (corridor index, falling
  corridors, `barrierOrder`, `topologyFaults` per corridor, route counting a pair once): tasks 4, 5. **Section 4**
  (parallel and falling corridors in plan and lay; what answers to which region): tasks 7, 8 and the first ruling.
  **Section 5** (the gap rule): tasks 6, 8. **Section 6** (walk): task 10. **Section 7** (drawing, `corridors:`, the
  verdict): tasks 10, 11. **Section 8** (mod off): task 9. **Section 9** (doubleBack, catalogue, world): tasks 11, 12. **Section 10** (docs): task 12. **Section 11** (proof): each task's tests; the stable world in task 12.
- **The settled decisions after the spec:** the four fixes (D2, task 11, measured table); doubleBack folded with no
  migration (D3, D4, task 12); the concurrent agent (task 1 step 1, task 11 Part B step 1, task 12 Part A steps 1-2, 7); the
  process constraints (Global Constraints).
- **Review Focus → tests:** 1 task 6 (equivalence) and task 12 (bake); 2 task 7 (door per corridor); 3 task 4
  (`fallingStretches` reversed rows); 4 task 4 (`gateBypassed` and the falling case); 5 task 9 (mod-off fixture).
- **Type consistency:** `Alignment`/`alignOf` (task 2) are read by tasks 3, 4, 5, 6, 7, 11; `FloorCorridor`,
  `floorCorridors`, `fallingStretches`, `flipAlign`, `corridorIndexOf`, `dropsLandingOnAStretch`,
  `BarrierRun.falling` (task 4) by tasks 7 and 9; `seatItems` (task 6) by task 8's `corridorSeats`;
  `PlanRegion.answersTo`, `PlanCorridor.align`, the door seat's `corridor` (task 7) by task 8; `corridorLine`,
  `describeLockFault`, `corridorLines` (task 11) by `scripts/lock.ts`.
