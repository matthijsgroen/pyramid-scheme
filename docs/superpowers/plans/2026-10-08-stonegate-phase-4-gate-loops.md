# stoneGate Phase 4: Gate Loops in the Carve, One Nest Spot per Lock, and Stones in Nested Locks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a lock whose gated joins close a loop is accepted by the floor topology, carves, is proved sound by the
floor walk, and stoneGate (`src/game/locks/stoneGate.lock`) bakes on the dev floor as pyramid 12 (tasks 1-6). Each
lock marks at most one region as its nest spot, and a lock nests only in its host's spot (tasks 7-8). Then a floor
that nests locks may hold stones: each nesting is a pass-through, a contained or a shared one (spec, "Nested locks"),
the floor walk proves it with the stones as one pool, and the blanket refusal `STONES_NESTED` goes (tasks 9-14).

**Architecture (gate loops, tasks 1-6):** a lock floor is laid before it is carved (`layLockPlan`,
`src/game/layLocks.ts`): every connection of the plan becomes a laid corridor, loops included, and the grown maze can
never join two regions. What refuses a gate loop today is older than the lay: `topologyFaults`
(`src/game/obstacles.ts`) only seats a gate on a route link or on a link of a side chain (`offRouteChains`,
`src/game/regions.ts`), the model of the side-chain carve, and a fork's seams are read off those same chains. This
phase tells `topologyFaults` when the floor is laid: then every connection is a seat, a fork's seams are every join of
its region the route does not take (`forkSeams`), and a gate an open loop goes round is refused by name
(`gateBypassed`), since no carve could stand its door between two grounds. The carve, `gateDoorFaults` and the floor
walk already work on any graph and need no change; the walk is what proves each carved loop sound. A floor carved as
side chains (no `locks`) keeps every refusal it has.

**Architecture (one nest spot, tasks 7-8):** the notation gains a region appetite `&`, read into
`takes: "nest"` (`LockAppetite = RegionAppetite | "nest"`, `src/game/lockAuthoring.ts`). The rules placement asks of
a host region today (`seatNested`, `src/game/floorLocks.ts`: not a port, not barred, no mechanic in it, exactly two
joins, one nearer the host's `in`) move into `lockAuthoring.ts` as `seatOf(lock, region)`, and `nestSpotFaults(lock)`
asks them of the spot when the lock is authored: a second spot is refused `nestSpotsRepeated`, a spot no lock could
stand in `nestSpotUnseatable`, by `parseLock` (so `yarn run lock`) and by `compileLock`. Placement refuses a nesting
anywhere but the host's spot (`notNestSpot`) and seats it there exactly as today: the spot leaves the layout, its join
nearer the host's `in` is re-pointed at the inner's `in`, the other at the inner's `out`. The compile reads an unused
spot as `free`, so the carve never sees `nest`. `lockDraw` marks the spot `⊞nest` in its region's box and
`yarn run lock` prints `nest spot: <region>`.

**Architecture (nested stones, tasks 9-14):** the expansion (`expandFloorLocks`) classifies every nested placement
against the locks it stands in (`stoneNestings`) and writes the case on `LockNesting.stones`; a pass-through lock
holding a one-way is refused by name (`oneWayInPassThrough`), because every one-way takes empty hands. A shared
nesting's stones are compiled into ONE weights control (`poolStones`, `src/game/mechanics/weights.ts`), so play has one
hand and one arrangement across both locks. A contained lock's edge is a line a carrying walk does not cross: one pure
function (`crossesContainedEdge`, new `src/game/stoneBounds.ts`) answers it for the walk (`floorLock` tags the compiled
passages and door gates on that line `keepsStones`, and `movesFrom` takes a tagged way only with empty hands) and for
play (the navigation stops a carrying walk on the near side, "Cannot pass with a stone"). The walk spec's `leaveWith`
carries two rules, the floor's way out AND every one-way, so it is renamed `emptyHands` (and `mayLeave`
`handsEmpty`) before anything nests stones. The composed walk (`src/game/floorLockWalk.ts`) gives every level the
`emptyHands` of the stones it holds, so a contained lock's drops and a shared inner lock's drops still turn a stone
away; a nested level's way out is its port, left by `nestedFree`'s terminals, empty-handed only across a
`keepsStones` way or a one-way. A shared nesting is walked fused with its pool's level (the product, since stones move
between them), so its inner way out is no edge at all: the rule relaxed there is the edge, never `emptyHands`. The cut
stays for pass-through and contained nestings (exact, because nothing outside a contained lock carries its stones and
nothing inside a pass-through lock reads a hand), and a pooled failure names its instances.

**Tech Stack:** TypeScript, Vitest, `yarn run lock` (`scripts/lock.ts`), `yarn generate-world` (Node bake).

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (§3 Carve and bake; "Done when"; "The rules";
§1 "Nested locks (designer, 2026-10-08)", binding for tasks 7-14). **Contract:** `docs/mods/mechanic-contract.md`
§3.2 "Stones on plates" (every one-way takes empty hands; `unladen` stands alone). **Roadmap:**
`docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 4 row; "Decisions taken": gate loops are allowed).
**Design:** `docs/mods/floor-topology-design.md` ("The rules that keep a lock buildable": "Gates may form loops").

**Written against `608a067e`, re-verified against `2afa135a`** (branch `topology/mechanics`; phases 1, 2 and 3
done, then the empty-hands correction `a573eb65`, `469bbbfe`, `34f31c70` and the squeeze choreography `c2e7c322`,
`2afa135a`). Every path, symbol and line cited below was checked at `2afa135a`; line numbers drift as other work lands
on the branch, so find each edit by the symbol named beside it. The two untracked files at the repository root
(`circle.lock`, `stoneGate.lock`) are the designer's scratch: never stage them. Stage strictly by path, never
`git add -A` or `git add .`. Other sessions commit to this branch: before each task, `git status --short` and leave
files you did not touch alone.

## What was measured before writing this

Made-up locks carved through `assembleFloor` at `608a067e` (every region `?`, the `lockFixtures.ts` binding):

| lock | refused with |
| --- | --- |
| `in -[L]- hall`, `hall -- out`, `in -- side`, `side -[L:a]- hall` | `obstacleOffRoute` on `side-hall` (the join closing the loop) |
| `in -[Y]- a`, `in -[Y]- b`, `a -- b`, `in -- out`, `Y fork @in` | `gateOwnedOffSeam` on `in-b` (only `in-a` is a chain's seam) |
| a stone loop whose closing join `back -- hall` is open | carves (the gates sit on chain links) |
| `in -[L]- hall`, `hall -- out`, `in -- side`, `side -- hall` | every seed `gateDoorMisplaced` (`touches: 1`): one door, an open way round it |
| stoneGate, every region `free` | `obstacleOffRoute` on `altar-backroom`, `hall3-hall2`, `hall2-hall5`, `hall3-passage` |

`yarn run lock` reports "gate loop" as not buildable for stoneGate only; no other catalogue lock has a loop.

At `2afa135a`: no catalogue lock, dev floor or world floor nests a lock (`grep -c lockNesting
src/data/generatedWorld.ts` is 0); the only nested placements are in tests (`nestedLocks.spec.ts`, `layLocks.spec.ts`,
`lockPlan.spec.ts`), all in the `hall` of `leverLock`/`strandingLock` (`src/game/testSupport/floorLockFixtures.ts`)
except the seat-refusal tests, which nest in `sluiceLock` (world spec content), `ringLock` and `middleLeverLock`.

## Questions before running

### Settled

- **S1. Order.** Phase 3 is on the branch, so every task runs in order: task 5 binds `unladen: "narrowPassage"`
  and task 6 edits phase 3's `passageCrossing`.
- **S2. Every one-way takes empty hands; `-[unladen]-` stands alone** (designer correction; spec "The rules",
  contract §3.2). One rule in `movesFrom` (`mayLeave`, renamed `handsEmpty` in task 11) for every one-way, and play
  turns a carrying walk away at every launch. `-[unladen]-` beside `>>` is refused `unladenOnDrop`, beside another
  owner `unladenCombined` (`unladenFaults`, `src/game/lockAuthoring.ts`, surfaced by `parseLock` and `yarn run lock`).
  So this plan tags no drop and adds no one-way field: `absorbUnladen`, `dropConditionsOn`, `OneWayObstacle.unladen`,
  `oneWays[].unladen`, `stonePasses`, a one-way's `handsFull` and the door face's "empty hands" marker are gone and no
  task brings one back.
- **S3. Each lock has a single nest spot** (designer, 2026-10-08: "I don't expect a lot of nesting, but it could
  increase puzzle difficulty"). Tasks 7-8; the three nesting cases still apply (tasks 9-14).

### Open (the plan is written assuming each recommendation)

1. **Only laid floors accept a gate loop; `offRouteChains` stays as it is.** Recommendation: yes. The roadmap row
   names `offRouteChains`, but on a lock floor nothing carves from it: the lay reads the plan, and the only readers
   left are `topologyFaults`' seat test, the fork seams and `PlanRegion.mouth` (which the lay never reads). A floor
   written longhand (a `regionLayout` with no `locks`) is carved as side chains, which cannot stand the second meeting
   of a loop; it keeps `obstacleOffRoute`. Alternative: teach the side-chain carve to close loops, which has no
   consumer (no shipped or dev floor writes a layout longhand with a loop).
2. **A gate an open loop goes round is refused by name before the carve (`gateBypassed`).** Recommendation: yes,
   on laid floors. Today such a lock fails every carve with `gateDoorMisplaced`, sixty attempts per seed, and the
   author reads a cell coordinate. Alternative: leave it to the carve's own check.
3. **The squeeze starts from the nearer side (task 6).** Recommendation: yes. Phase 3 starts it from the first side
   in the wall cell's `dirs`; on stoneGate both sides of the passage between `hall3` and `hall2` are walkable, so a tap
   could send the explorer the long way round the loop only to squeeze back. The side he starts from is the
   traversal's `from`, and the squeeze's choreography already reads its heading off that (`squeezeWay`,
   `src/app/SiteMap/useSqueeze.ts`; `poseOf`, `SqueezeRider.tsx`): head-on going north he starts on the wall's face and
   fades behind it, going south he comes out from behind it, sideways he slides along behind the wall
   (`SQUEEZE_SIDEWAYS_MS_PER_LEG`, lifted `SQUEEZE_SIDEWAYS_LIFT`). `Squeeze.stories.tsx` plays all four directions, so
   no choreography changes. Alternative: a playtest backlog line instead.
4. **stoneGate takes dev pyramid 12, expert, every region `free`** (as twoStones on pyramid 11), bound
   `{ weights: "stonePlate", activator: "torch", unladen: "narrowPassage" }`. The comment at the top of
   `src/game/locks/stoneGate.lock` ("not placed yet, not buildable yet (stones, gate loop)") is the designer's and is
   left alone.
5. **The nest spot is written `&`.** Recommendation: `&` ("and a lock here"), on the takes line beside the others:
   `hall *   s2 $   spare ?   corridor -   cell &`. It is free in the notation: `*` `$` `?` `-` are appetites, `@`
   places a mechanic, `+` and `|` combine owners, `>>` is a one-way, `//` starts a comment. Alternative: `#` (a frame
   another lock stands in). `@` is not offered: it already means "placed at".
6. **A spot nothing nests in takes `free`.** Recommendation: the compile reads an unused spot as `free`, so marking a
   spot never makes a lock poorer where nothing nests, and the carve never sees `nest`. Alternative: `nothing`, a bare
   stretch the player walks through.
7. **The spot's seat rules are asked when the lock is authored.** Recommendation: yes. `nestSpotUnseatable` names
   the rule the spot breaks (`atPort`, `regionBarred`, `regionHoldsMechanic`, `notPassThrough`,
   `directionAmbiguous`) in `yarn run lock` beside the drawing and in `compileLock`, through the same `seatOf` placement
   uses, so a designer never finds out on a bake. Placement then refuses only what depends on the floor: an unknown
   host or region, a region that is not the spot (`notNestSpot`), a spot already holding a lock (`regionShared`), a
   cycle. Alternative: mark only, and keep every seat rule at placement as today.
8. **A pass-through lock holds no one-way at all (`oneWayInPassThrough`, task 9).** The spec: "no `-[unladen]-` and
   no one-way stands on its route once it is solved". `-[unladen]-` in a lock without stones is already refused
   `carryWithoutStones`. Every one-way takes empty hands, so a drop in a pass-through lock turns the host's stone
   away; and the cut walks a pass-through without the host's stones, where the drop would let it ride, so the cut is
   exact only while nothing inside it reads a hand. Recommendation: refuse any one-way in a pass-through lock (and in
   any lock between it and its pool), naming the drops, at placement. Alternative: refuse only a one-way on the
   inner's route, and walk a pass-through holding an off-route one-way fused with its pool's level, as a shared
   nesting is.
9. **How is a contained lock's edge kept?** The spec says a contained lock's way out "takes empty hands, as a lock's
   way out always does". Nothing physical stands at a nested lock's ports today: its regions meet the host's along an
   ordinary corridor. Recommendation: **an invisible edge, the floor exit's rule moved inward** (tasks 11 and 13). A
   carrying walk that would cross the line between a contained lock's ground and the rest stops on the near side with
   the one blocked line, "Cannot pass with a stone", exactly as the way out does; one function
   (`crossesContainedEdge`) decides it for play and for the walk, read off the cells' authored region labels, so the
   two cannot disagree. The walk tags the compiled passages and door gates on the line `keepsStones`; a drop across it
   needs no tag, since every one-way already takes empty hands. No carve change, no binding, no prompt. Alternatives:
   (a) the compile stands a `-[unladen]-` narrow passage on each of the contained lock's two port joins, which needs no
   new walk or play code but adds a crack wall and a "Squeeze through" prompt every time the player enters or leaves
   the lock, changes the carve, and needs `unladen` bound; (b) no play rule, and the walk refuses a contained nesting
   whose inner lock lets a stone reach its edge at all, which refuses nearly every stone lock (a stone on a shelf by
   the way in already does).
10. **"The player leaves the inner lock with a stone only by solving it for one" (shared).** Stones are alike, so a
   state does not know whose stone is in hand, nor whether the inner was solved before. Recommendation: **read it as
   design guidance that the pooled soundness walk proves through, with no extra check**: one pool (task 10), the
   inner's way out lets a stone through (it is no edge: the inner is fused into its pool's level, task 12), the inner's
   drops and the floor's ways out still take empty hands (`emptyHands` on the fused level, task 12), and if taking an
   inner stone out unsolved can strand the floor, the pooled walk refuses it, naming both instances (`pooled`,
   task 12). Alternative: a memoryless count rule ("a stone leaves the inner by its way in only while its plates hold
   at least the stones it was authored with, or while it stands open in to out"), which over-refuses: a player who
   solves the inner, carries its stone back and later swaps it for the outer's breaks it.
11. **How does the state space grow, and is a bound needed?** Pass-through and contained nestings keep the cut: the
   host walks the inner as ground, so the host's states never multiply by the inner's (tested by counting states,
   task 12). A shared nesting is walked fused with its pool's level, which is the product of both locks' mechanisms;
   the pooled arrangement count is C(P, S) + C(P, S - 1) for P plates and S stones (P = 8, S = 3: 84).
   Recommendation: **no new bound**: `reachableStates` already refuses a level whose ceiling (regions × the product of
   every mechanism's state count) passes `MAX_LOCK_STATES` (50 000), and a fused level that does is refused `tooLarge`
   inside `pooled`, naming the instances (task 12 tests it). With one nest spot per lock, a pool grows by one lock per
   level of nesting, never by siblings. Alternative: a tighter per-pool ceiling, which has no consumer yet.
12. **Which locks join a pool?** Recommendation: **a nested lock is read against the nearest lock it stands in that
   holds stones, at any depth** (`stoneNestings`, task 9). So in `A(stones) ⊃ B(none) ⊃ C(stones)` B is a
   pass-through and C shares A's pool (A's stone is carried through B into C), and B is walked fused with A and C.
   Read against the direct host only, C would be contained, and its edge would stop A's stone half-way through B,
   breaking B's pass-through rule. Alternative: refuse a stone lock inside a pass-through lock by name.
13. **Where does `yarn run lock` surface the nesting rules?** It now shows and checks the nest spot (task 7). It still
   cannot say which stone case a nesting is: that depends on the inner lock, and nesting is said only where locks are
   placed (`PlacedLock.inside`). Recommendation: **nothing more in `yarn run lock` now**; the case and each refusal
   surface where a nesting exists: the bake's lock sweep and `walkFloorLock` (`describeFloorWalkFailure`), the floor's
   `AssemblerReason`s, and the Lock playground (task 14), which nests one catalogue lock in another's spot. Recorded
   under "Open after phase 4". Alternative: a `yarn run lock <host> --nest <inner>` that carves a bench floor with the
   inner in the host's spot and prints the case and the floor walk's verdict.
14. **A dev floor for nested stones?** Recommendation: **no**: made-up test fixtures prove each case (task 12), and
   the playground plays them (task 14). A dev floor would churn every dev-journey count again (task 5 already moves
   them to 12) for no case the tests do not cover. Alternative: dev pyramid 13 with a shared nesting.

## Rulings made without the designer

- **Ruling: `topologyFaults` takes a last optional argument `{ laid?: boolean }`.** `checkLock` (a lock is always
  laid when it is baked) and the assembler on a floor with a plan pass `laid: true`. — Why: the seat question has
  two honest answers, one per carve, and only the caller knows which carve follows. — Cost if wrong: one argument.
- **Ruling: on a laid floor, a fork's seams are its chains' seams first, then every other join of its region the
  route does not take, in connection order (`forkSeams`).** — Why: on an acyclic layout the second list is empty,
  so every floor that carves today gets the same seams in the same order; the loop's joins are only appended. —
  Cost if wrong: an ordering change in one function.
- **Ruling: `gateBypassed` asks only two-way joins: a connection carrying any edge gate is no way round, and a region
  under a region barrier is not passed through (nor asked from).** — Why: that is the ground `gateDoorFaults`
  floods (`twoWayNeighbours`; a drop is never ground), and the barrier's doors stand at every entrance. — Cost if
  wrong: a few more locks reach the carve and fail there as they do today.
- **Ruling: no `CHANGELOG.md` entry and no save change.** — Why: stoneGate plays only on the dev journey and in
  Storybook until phase 6; no world floor changes, and no world floor nests a lock or holds stones. The nest spot is
  authoring vocabulary no catalogue lock writes yet.
- **Ruling: the seat rules move into `lockAuthoring.ts` (`seatOf`, `sidesOf`, `regionsHeldBy`).** — Why: they read
  the lock alone, and both the authoring check (`nestSpotFaults`, read by `lockCompile.ts` and `lockNotation.ts`) and
  placement (`floorLocks.ts`, which imports `lockCompile.ts`) need them; `lockAuthoring.ts` is imported by all three,
  so no import cycle. — Cost if wrong: a file move.
- **Ruling: the test fixtures `leverLock` and `strandingLock` mark `hall` as their nest spot.** — Why: every test
  that nests one lock in another nests in their `hall`, and an unused spot compiles as `free`, exactly what `hall`
  takes today, so every test that places them unnested carves the same floor. `sluiceLock`
  (`src/worldGen/spec/locks/sluice`) is world content and is not touched: the two tests that nested in it, and the two
  local `ringLock`/`middleLeverLock` ones, become authoring tests on made-up locks. — Cost if wrong: two fixture lines.
- **Ruling: the walk spec's `leaveWith` is renamed `emptyHands`, and `mayLeave` `handsEmpty` (task 11, before
  anything reads it per level).** — Why: it is read by the floor's way out AND every one-way (and, from task 11, every
  `keepsStones` way), so a level that relaxes the way out must keep it; a name that says "the way out" invites
  dropping it. Task 12 pins the one-way rule on a nested level with a test. — Cost if wrong: a rename.
- **Ruling: the contained edge's tag is `keepsStones`, not `unladen`.** — Why: `unladen` is the narrow passage's
  keyword and stands alone (S2); the edge is no passage the author writes, and a drop needs no tag at all. — Cost if
  wrong: a rename.
- **Ruling: the pooled control takes the pool instance's id, `<pool>.stones`, and the first plate's slot like any
  weights record.** — Why: the record is filed under its first plate (`xplate:<id>`), so a pooled floor saves as one
  arrangement with no new field. No shipped floor pools, so no save changes. — Cost if wrong: a rename.
- **Ruling: the contained edge is read off authored region labels (`cell.region`), the way `regionsOf` already
  splits compiled regions.** — Why: a compiled region holds one label, so a compiled passage or a door's gate crosses
  the edge exactly when the two cells' labels do, and play reads the same labels. — Cost if wrong: one function.

## Global Constraints

- **Generation proves nothing.** Each carved loop is proved sound by `walkFloorLock` (`src/game/floorLockWalk.ts`)
  in the tests, and by the bake's lock sweep (`findStrandingLocks`) on the dev floor. A test that only asserts "it
  carved" is not enough.
- **No tests on authored content.** Tests use small made-up locks written inline. `yarn run lock` checks
  `src/game/locks/*.lock`. Never assert what stoneGate (or any catalogue or world-spec lock, `sluiceLock` included)
  contains.
- **Stable world:** a plain `yarn generate-world` leaves `src/data/generatedWorld.ts` byte-identical. This plan edits
  files the carve imports (`scripts/carveLedger.ts` hashes every transitive import: `src/game/obstacles.ts`,
  `regions.ts`, `siteAssembler.ts`, and in tasks 7-13 `lockAuthoring.ts`, `lockNotation.ts`, `lockCompile.ts`,
  `floorLocks.ts`, `mechanics/weights.ts`, `floorLock.ts`, `lockWalk.ts`, `floorLockWalk.ts`), so
  `src/data/carveLedger.json` changes in its `"hash"` lines only; that refresh is committed (task 5, again in task
  15). Where the world could move, and why it does not: an unused nest spot compiles as `free` and no world lock
  writes one; `stoneArrangements` is refactored (task 10) and every stone floor reads it, but no world floor holds
  stones and the dev floors' arrangement keys are pinned by `weights.spec.ts`; `floorLock` tags edges only where
  `grid.lockNesting` names a contained lock, and no world floor nests; `walkFloorLock` changes only for nested floors.
  A `"refusal"` line changing in the ledger means a world floor's search ended differently: stop and find the task.
- **Every one-way takes empty hands; `-[unladen]-` stands alone** (S2). No task adds a field, tag or binding to a
  one-way, and no task reads `unladen` as anything but the narrow passage's keyword.
- **Authoring encounters never changes corridor structure** (`docs/game-design/world-spec-stability.md`). Nothing
  here reads an encounter; the seat and seam questions read the layout and the obstacles only.
- **Mod off = same carve, bare nodes, open corridors.** `topologyFaults` and `forkSeams` read core vocabulary only;
  the toggle-off sweeps (`src/mods/topology/toggleOff.verify.ts`, `carveNeverDependsOnAMod.verify.ts`) must stay
  green with stoneGate on the dev floor.
- **Comments state the current rule and why**, never history ("replaces", "used to", "now").
- **Count work, never wall-clock**, in tests: no duration assertions. State-space claims are asserted as state
  counts (`walk.states`, `reachableStates(...).order.length`).
- **One source for each rule** (spec, "The rules"): the arrangement search lives in `weights.ts` only, the contained
  edge in `stoneBounds.ts` only, the seat rules in `lockAuthoring.ts` (`seatOf`) only; walk, play, authoring and
  placement all call them.
- **Commits:** one short line, then the trailer lines exactly:
  ```
  git commit -m "<type(scope)>: <what changed>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
  ```
- **Shell:** commands run in zsh; an unmatched glob is an error, so quote globs passed to tools.
- **Known failures, not yours:** `src/mods/puzzleSeeds.verify.ts` fails 3 tests ("the switch's three shapes…",
  "owes the switch a board…", "names the floor and the shape…"). Leave them.
- **`yarn run lock`**, not `yarn lock` with flags before it: `yarn -s lock` prints Yarn's own help.

## Review Focus

1. **A loop with one door.** A designer writes a loop and gates one side only; they must read which gate and why
   before any carve, not `gateDoorMisplaced` at a cell. Test in task 2 (`gateBypassed`, unit and through
   `compileLock`).
2. **A fork whose two ways meet again.** The junction must still have exactly its two gated exits, and the fork-switch
   one state per exit. Test in task 3 (`ARMS_REJOIN` carves, two gated exits, walk sound).
3. **A floor written longhand with a loop.** It must keep its refusal (`obstacleOffRoute`), not crash in the carve.
   Test in task 1 ("still refuses that gate on a floor carved as side chains") and the existing
   `siteAssembler.spec.ts` "still refuses an obstacle on a connection the carve produces no seam for", which must
   stay green unchanged.
4. **A loop through a barred region.** A way round that passes a region barrier is not open; the gate must not be
   refused. Test in task 2 ("is no way round through a barred region").
5. **A stone carried round a loop.** The plate's two doors on one loop: the walk must find the way round with the
   stone and back to set it down. Test in task 1 (`ROUND_THE_ROOM`, walk sound, no dead region).

One nest spot (tasks 7-8):

6. **A lock placed unnested that marks a spot.** It must carve exactly as the same lock with the spot written `?`.
   Test in task 7 (`compileLock` gives the spot appetite `free`; the fragments are equal).
7. **A designer marks two spots, or a spot at a port.** They must read the rule and the line in `yarn run lock`,
   not a placement refusal on a bake. Test in task 7 (`parseLock` refused lines; `nestSpotFaults`).
8. **A bench floor (`freeRegions`) on a lock with a spot.** The playground and the dev floors free every region; the
   spot must survive, or nothing can ever nest there. Test in task 7 (`freeRegions` keeps `nest`).

Nested stones (tasks 9-14):

9. **Two stones in hand.** A shared nesting compiled as two weights records would let the player lift in the inner
   while carrying the outer's stone. The pooled floor must have exactly one weights control, and no arrangement may
   name the hand twice. Test in task 10 ("one control for the pool") and the `poolStones` unit ("never two in hand").
10. **A stone down a drop inside a nesting.** A level built without `emptyHands`, or a pass-through walked without
   the host's stones, would let a stone ride a drop. Test in task 12 ("a contained lock's drop and a shared inner's
   drop still turn a stone away") and task 9 (`oneWayInPassThrough`).
11. **Leaving the floor with a stone, through a nesting.** The floor's own level must keep `emptyHands`. Test in task
   12 ("keeps the floor's way out for empty hands on a nested floor").
12. **A contained stone carried out by a door the host owns.** A host gate re-pointed onto the inner's port join puts
   a door cell on the edge; play and the walk must stop at the same step. Test in task 11 (every tagged edge has
   exactly one side on the inner's ground; the door's gates included) and task 13 (the carrying walk stops on the
   inner's side).
13. **A pooled level too large to walk.** It must be refused by name, not hang the bake. Test in task 12
   (`tooLarge` inside `pooled`, with a lowered ceiling handed in, never a timing).
14. **A floor with no nesting.** Every change here must leave it walked exactly as before. The existing
   `nestedLocks.spec.ts` "a floor without nesting is walked exactly as it was" stays green unchanged, and task 11
   asserts `floorLock` tags nothing on a floor without a contained lock.

---

### Task 1: A laid floor seats a gate on every connection

**Files:**
- Modify: `src/game/obstacles.ts` (`topologyFaults`: options argument; `seatable` on a laid floor; doc comment)
- Modify: `src/game/lockCompile.ts:357-362` (`topologyOf` passes `{ laid: true }`)
- Modify: `src/game/siteAssembler.ts:821-827` (passes `{ laid: plan !== undefined }`; import `resolveMechanicKind`)
- Create: `src/game/gateLoops.spec.ts`
- Test: `src/game/obstacles.spec.ts`

**Interfaces:**
- Produces: `topologyFaults(layout, obstacles, controls, forks = [], barrierOrder = [], kinds = resolveMechanicKind,
  options: TopologyOptions = {}): TopologyFault[]` and `export type TopologyOptions = { laid?: boolean }` in
  `@/game/obstacles`. Tasks 2 and 3 read `laid` inside `topologyFaults`.
- Produces (test file, extended by tasks 2 and 3): `src/game/gateLoops.spec.ts` with the fixtures
  `ROUND_THE_SIDE`, `ROUND_THE_ROOM`, and helpers `doorCells(grid)`, `carveStones(text)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/obstacles.spec.ts`:

```ts
describe("a floor laid from a lock plan", () => {
  // `cellar` meets the route twice, at `hall` and at `vault`. The lay stands a corridor on both joins.
  const loop: RegionGraph = {
    regions: [
      { name: "mouth", appetite: "free" },
      { name: "hall", appetite: "free" },
      { name: "vault", appetite: "free" },
      { name: "cellar", appetite: "free" },
    ],
    connections: [
      ["mouth", "hall"],
      ["hall", "vault"],
      ["hall", "cellar"],
      ["vault", "cellar"],
    ],
    in: "mouth",
    out: "vault",
  }
  // `cellar` holds two branches, `attic` and `crypt`; a side chain is laid as one line, a lock plan as a tree.
  const pendant: RegionGraph = {
    regions: [
      { name: "mouth", appetite: "free" },
      { name: "hall", appetite: "free" },
      { name: "vault", appetite: "free" },
      { name: "cellar", appetite: "free" },
      { name: "attic", appetite: "free" },
      { name: "crypt", appetite: "free" },
    ],
    connections: [
      ["mouth", "hall"],
      ["hall", "vault"],
      ["hall", "cellar"],
      ["cellar", "attic"],
      ["cellar", "crypt"],
    ],
    in: "mouth",
    out: "vault",
  }
  const bothSides = [gate("g1", ["vault", "cellar"]), gate("g2", ["hall", "cellar"])]

  it("seats a gate on the join that closes a loop", () => {
    const faults = topologyFaults(loop, bothSides, [lever("s1", { left: ["g1"], right: ["g2"] })], [], [], undefined, {
      laid: true,
    })
    expect(faults).toEqual([])
  })

  it("still refuses that gate on a floor carved as side chains", () => {
    const faults = topologyFaults(loop, bothSides, [lever("s1", { left: ["g1"], right: ["g2"] })])
    expect(faults).toEqual([{ type: "obstacleOffRoute", id: "g1" }])
  })

  it("seats a gate on the second branch of a pendant", () => {
    const faults = topologyFaults(
      pendant,
      [gate("g1", ["cellar", "crypt"])],
      [lever("s1", { left: ["g1"], right: [] })],
      [],
      [],
      undefined,
      { laid: true }
    )
    expect(faults).toEqual([])
    expect(topologyFaults(pendant, [gate("g1", ["cellar", "crypt"])], [lever("s1", { left: ["g1"], right: [] })])).toEqual(
      [{ type: "obstacleOffRoute", id: "g1" }]
    )
  })
})
```

Create `src/game/gateLoops.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import { parseLock } from "./lockNotation"
import { deadFloorRegions, describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"
import { BINDING, carveLockFloor } from "./testSupport/lockFixtures"
import { stoneFloor } from "./testSupport/stoneFixtures"
import type { FloorGrid } from "./siteTypes"

// MADE-UP LOCKS WHOSE GATED JOINS CLOSE A LOOP, never catalogue ones: a test pins the rule, `yarn run lock` checks
// the catalogue. Every region takes `free`, so the floor holds the lock and nothing else.

/** A lever with two ways to the hall: straight through one door, or round by the side room through the other. */
const ROUND_THE_SIDE =
  "in -[L]- hall\nhall -- out\nin -- side\nside -[L:a]- hall\nL toggle @in\nin ?\nhall ?\nout ?\nside ?"

/** A stone on the room's plate holds the way in open; lifted, it opens the way back round by `back`. */
const ROUND_THE_ROOM =
  "in -- hall\nhall -[p]- room\nroom -- back\nback -[p:empty]- hall\nhall -- out\np plate @room stone\nin ?\nhall ?\nroom ?\nback ?\nout ?"

const doorCells = (grid: FloorGrid) =>
  grid.cells.flat().filter(cell => cell.type === "room" && cell.requiredKeyId !== undefined)

/** A stone lock carved at the first of twelve seeds that carves it. */
const carveStones = (text: string): FloorGrid => {
  const refused: unknown[] = []
  for (let n = 1; n <= 12; n++) {
    const result = assembleFloor("test", stoneFloor(text), n * 7919)
    if (result.success) return result.grid
    refused.push(result.reasons)
  }
  throw new Error(`carved at none of 12 seeds: ${JSON.stringify(refused[0])}`)
}

const expectSound = (grid: FloorGrid) => {
  const walk = walkFloorLock(grid)!
  if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))
  expect(deadFloorRegions(grid)).toEqual([])
}

describe("a lock whose gates close a loop", () => {
  it("carves with a door on each way to the hall, and walks sound", () => {
    const grid = carveLockFloor(parseLock(ROUND_THE_SIDE, "roundTheSide").lock, BINDING)
    expect(doorCells(grid)).toHaveLength(2)
    expectSound(grid)
  })

  it("carves a stone's two doors on one loop, and walks the stone round and back", () => {
    const grid = carveStones(ROUND_THE_ROOM)
    expect(doorCells(grid)).toHaveLength(2)
    expectSound(grid)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/obstacles.spec.ts src/game/gateLoops.spec.ts`
Expected: FAIL. In `obstacles.spec.ts` "seats a gate on the join that closes a loop" and "seats a gate on the second
branch of a pendant" get `[{ type: "obstacleOffRoute", id: "g1" }]` (and a type error on the seventh argument, which
vitest does not stop on). In `gateLoops.spec.ts` both throw "carved at none of 12 seeds" with a `lockRefused` reason
whose fault is `obstacleOffRoute` (`side-hall`, `back-hall`).

- [ ] **Step 3: Implement**

In `src/game/obstacles.ts`, above `topologyFaults`, add:

```ts
/** `laid`: the floor is laid from a lock plan (layLocks.ts), which stands a corridor on every connection. */
export type TopologyOptions = { laid?: boolean }
```

Replace the doc comment's second paragraph of `topologyFaults` (from "`obstacleOffRoute` is the honest limit" to
"picks one mouth, not two).") with:

```ts
 * A SEAM IS A CONNECTION TWO ADJACENT CELLS MEET ALONG, and which connections have one depends on the carve. A
 * floor laid from a lock plan (`laid`) stands a corridor on every connection, loops included, so every connection
 * is a seam. A floor carved as side chains meets only along the main path and along each chain's own links (the
 * mouth where it leaves its parent region, and every join within it: offRouteChains, regions.ts, the order
 * `regionOfStep` distributes a chain's own cells in); a connection off both, such as a branch's SECOND meeting with
 * the route, is refused `obstacleOffRoute`, because the side-chain carve never turns it into a physical join.
```

Change the signature to take the options last:

```ts
export const topologyFaults = (
  layout: RegionGraph | undefined,
  obstacles: readonly Obstacle[],
  controls: readonly Control[],
  forks: readonly ForkDemand[] = [],
  barrierOrder: readonly BarrierOrder[] = [],
  kinds: ResolveMechanicKind = resolveMechanicKind,
  { laid = false }: TopologyOptions = {}
): TopologyFault[] => {
```

Replace the block that builds `seatable` (lines 357-363 at `2afa135a`, from `const route = regionRoute(layout)` to
the end of the `for (const { mouth, regions } of offRouteChains(layout, drops))` loop) with:

```ts
  const seatable = new Set<string>(laid ? joined : [])
  if (!laid) {
    const route = regionRoute(layout)
    for (let i = 0; i < route.length - 1; i++) seatable.add(connectionKey(route[i], route[i + 1]))
    for (const { mouth, regions } of offRouteChains(layout, drops)) {
      const ordered = [mouth, ...regions]
      for (let i = 0; i < ordered.length - 1; i++) seatable.add(connectionKey(ordered[i], ordered[i + 1]))
    }
  }
```

If `regionRoute` has no other use in the file afterwards, TypeScript still needs it here; keep the import.

In `src/game/lockCompile.ts`, `topologyOf`:

```ts
const topologyOf = (lock: Lock, kinds: ResolveMechanicKind): LockFault[] => {
  const { regionLayout, obstacles, controls, forks, barrierOrder } = translate(lock, {}, undefined, kinds)
  // A lock is always laid from its plan when it is baked (siteAssembler.ts, layLockPlan).
  return topologyFaults(regionLayout, obstacles, controls, forks, barrierOrder, kinds, { laid: true })
    .filter(fault => fault.type !== "forkSwitchNoEncounter")
    .map(fault => ({ type: "topology", fault }))
}
```

In `src/game/siteAssembler.ts`, add `import { resolveMechanicKind } from "./mechanics"` beside the other `./`
imports (it is not imported there yet), and change the call at line 821 (`const topologyProblems = topologyFaults(`):

```ts
  const topologyProblems = topologyFaults(
    regionLayout,
    authoredConfig.obstacles ?? [],
    authoredConfig.controls ?? [],
    authoredConfig.forks ?? [],
    authoredConfig.barrierOrder ?? [],
    resolveMechanicKind,
    { laid: plan !== undefined }
  )
```

- [ ] **Step 4: Run them to see them pass, and the neighbours stay green**

Run: `yarn vitest run src/game/obstacles.spec.ts src/game/gateLoops.spec.ts src/game/lockCompile.spec.ts src/game/siteAssembler.spec.ts src/game/regionBarrier.spec.ts src/game/barrierOrder.spec.ts src/game/sequenceAuthoring.spec.ts`
Expected: PASS. `siteAssembler.spec.ts` "still refuses an obstacle on a connection the carve produces no seam for"
is a longhand floor and still gets `obstacleOffRoute`. If `ROUND_THE_SIDE` or `ROUND_THE_ROOM` still refuses, read
the reason: `gateDoorMisplaced` or `regionsNotJoined` means the lay or the carve does not hold a loop after all;
stop and report the reason and seed, do not loosen `gateDoorFaults`.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/obstacles.ts src/game/obstacles.spec.ts src/game/lockCompile.ts src/game/siteAssembler.ts src/game/gateLoops.spec.ts
git commit -m "feat(topology): a laid floor seats a gate on the join that closes a loop" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 2: A gate an open loop goes round is refused by name

**Files:**
- Modify: `src/game/obstacles.ts` (`TopologyFault` gains `gateBypassed`; the check in `topologyFaults`)
- Modify: `src/game/siteTypes.ts` (the mirrored `AssemblerReason` member, beside `obstacleOffRoute` at line 771)
- Test: `src/game/obstacles.spec.ts`, `src/game/gateLoops.spec.ts`

**Interfaces:**
- Consumes: `topologyFaults(..., { laid })` (task 1).
- Produces: `TopologyFault` member `{ type: "gateBypassed"; id: string; between: [string, string] }`, the same
  member in `AssemblerReason`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe("a floor laid from a lock plan", …)` in `src/game/obstacles.spec.ts` (it reuses `loop`):

```ts
  it("names a gate an open way goes round, since no doorway could hold it", () => {
    const faults = topologyFaults(
      loop,
      [gate("g1", ["vault", "cellar"])],
      [lever("s1", { left: ["g1"], right: [] })],
      [],
      [],
      undefined,
      { laid: true }
    )
    expect(faults).toEqual([{ type: "gateBypassed", id: "g1", between: ["vault", "cellar"] }])
  })

  it("is no way round through a barred region", () => {
    const ring: RegionGraph = {
      regions: [
        { name: "mouth", appetite: "free" },
        { name: "hall", appetite: "free" },
        { name: "vault", appetite: "free" },
        { name: "cellar", appetite: "free" },
        { name: "attic", appetite: "free" },
      ],
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
        ["vault", "cellar"],
        ["cellar", "attic"],
        ["attic", "hall"],
      ],
      in: "mouth",
      out: "vault",
    }
    const flooded: Obstacle = { id: "flood", kind: "gate", at: { on: "region", region: "attic" } }
    const faults = topologyFaults(
      ring,
      [gate("g1", ["vault", "cellar"]), flooded],
      [lever("s1", { left: ["g1"], right: ["flood"] })],
      [],
      [],
      undefined,
      { laid: true }
    )
    expect(faults).toEqual([])
  })
```

Append to `src/game/gateLoops.spec.ts` (add `import { compileLock } from "./lockCompile"` to the imports):

```ts
/** One door with an open way round it. */
const OPEN_WAY_ROUND = "in -[L]- hall\nhall -- out\nin -- side\nside -- hall\nL toggle @in\nin ?\nhall ?\nout ?\nside ?"

describe("a gate an open loop goes round", () => {
  it("is refused by name before a wall is carved", () => {
    const result = compileLock(parseLock(OPEN_WAY_ROUND, "openWayRound").lock, BINDING)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.faults).toContainEqual({
      type: "topology",
      fault: { type: "gateBypassed", id: "in-hall", between: ["in", "hall"] },
    })
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/obstacles.spec.ts src/game/gateLoops.spec.ts`
Expected: FAIL: the first gets `[]`, `compileLock` returns `ok: true`. The barred-region test passes already (it is
the guard against an over-eager check).

- [ ] **Step 3: Implement**

In `src/game/obstacles.ts`, add to `TopologyFault` after `obstacleOffRoute`:

```ts
  /** On a laid floor, a gate whose two regions an open way joins: no edge gate on it and no barred region along
   * it, so its two sides are one ground and no carve can stand its door between two (gateDoorFaults,
   * carveAgreement.ts). `id` is the gate. */
  | { type: "gateBypassed"; id: string; between: [string, string] }
```

In `src/game/siteTypes.ts`, add after `| { type: "obstacleOffRoute"; id: string }` (line 771):

```ts
  | { type: "gateBypassed"; id: string; between: [string, string] }
```

In `topologyFaults`, directly after the `for (const obstacle of obstacles) { … }` loop that ends with the
`obstacleOffRoute` push (and before `const owned = new Set<string>()`), add:

```ts
  // AN OPEN WAY ROUND A GATE, on a laid floor, where every connection is a corridor: the walk from one side of the
  // gate to the other over joins that carry no edge gate and through no barred region. Its two sides are then one
  // ground, so the carve would refuse its door at every seed; it is refused here by name instead.
  if (laid) {
    const gatedJoins = new Set(
      obstacles.flatMap(o => (isEdgeGate(o) ? [connectionKey(o.at.between[0], o.at.between[1])] : []))
    )
    const barred = new Set(obstacles.flatMap(o => (isRegionGate(o) ? [o.at.region] : [])))
    const openNeighbours = new Map<string, string[]>()
    for (const [a, b] of layout.connections) {
      if (gatedJoins.has(connectionKey(a, b)) || barred.has(a) || barred.has(b)) continue
      openNeighbours.set(a, [...(openNeighbours.get(a) ?? []), b])
      openNeighbours.set(b, [...(openNeighbours.get(b) ?? []), a])
    }
    const openlyJoined = (from: string, to: string): boolean => {
      const seen = new Set([from])
      const queue = [from]
      for (let at = 0; at < queue.length; at++)
        for (const next of openNeighbours.get(queue[at]) ?? []) {
          if (next === to) return true
          if (!seen.has(next)) {
            seen.add(next)
            queue.push(next)
          }
        }
      return false
    }
    for (const obstacle of obstacles) {
      if (!isEdgeGate(obstacle)) continue
      const [a, b] = obstacle.at.between
      if (!joined.has(connectionKey(a, b)) || barred.has(a) || barred.has(b)) continue
      if (openlyJoined(a, b)) faults.push({ type: "gateBypassed", id: obstacle.id, between: [a, b] })
    }
  }
```

- [ ] **Step 4: Run them to see them pass**

Run: `yarn vitest run src/game/obstacles.spec.ts src/game/gateLoops.spec.ts src/game/lockCompile.spec.ts src/game/siteAssembler.spec.ts src/game/regionBarrier.spec.ts src/game/barrierOrder.spec.ts`
Expected: PASS. A pre-existing test that now also gets `gateBypassed` is a fixture with an open loop round a door on
a lock floor: read it, and if it really is one, add the fault to its expectation and say so in the report.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/obstacles.ts src/game/siteTypes.ts src/game/obstacles.spec.ts src/game/gateLoops.spec.ts
git commit -m "feat(topology): a gate an open loop goes round is refused by name" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 3: A fork's ways may meet again

**Files:**
- Modify: `src/game/regions.ts` (`forkSeams`)
- Modify: `src/game/obstacles.ts` (`seamsFor` in `topologyFaults` reads `forkSeams`)
- Modify: `src/game/siteAssembler.ts:1170-1184` (a laid floor's `{ in }` fork takes `forkSeams(…, { laid: true })`)
- Test: `src/game/regions.spec.ts`, `src/game/gateLoops.spec.ts`

**Interfaces:**
- Consumes: `topologyFaults(..., { laid })` (task 1).
- Produces: `forkSeams(graph: RegionGraph, region: string, oneWays?: ReadonlyArray<readonly [string, string]>,
  options?: { laid?: boolean }): [string, string][]` in `@/game/regions`, each pair `[region, other]`.

- [ ] **Step 1: Write the failing tests**

In `src/game/regions.spec.ts`, add `forkSeams` to the import from `./regions` and append:

```ts
describe("the seams a fork in a region has", () => {
  it("are the first joins of the chains hanging off it, on a floor carved as side chains", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "a"],
        ["in", "b"],
        ["a", "b"],
      ],
      ["in", "out", "a", "b"],
      { in: "in", out: "out" }
    )
    expect(forkSeams(g, "in")).toEqual([["in", "a"]])
  })

  it("are every join of it the route does not take, on a laid floor, a loop's own included", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "a"],
        ["in", "b"],
        ["a", "b"],
      ],
      ["in", "out", "a", "b"],
      { in: "in", out: "out" }
    )
    expect(forkSeams(g, "in", [], { laid: true })).toEqual([
      ["in", "a"],
      ["in", "b"],
    ])
  })

  it("are the same either way where nothing closes a loop", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "a"],
        ["in", "b"],
      ],
      ["in", "out", "a", "b"],
      { in: "in", out: "out" }
    )
    expect(forkSeams(g, "in", [], { laid: true })).toEqual(forkSeams(g, "in"))
  })
})
```

Append to `src/game/gateLoops.spec.ts`:

```ts
/** A fork whose two ways meet again beyond it. */
const ARMS_REJOIN = "in -[Y]- a\nin -[Y]- b\na -- b\nin -- out\nY fork @in\nin ?\na ?\nb ?\nout ?"

describe("a fork whose two ways meet again", () => {
  it("carves its junction with a gated exit on each way, and walks sound", () => {
    const grid = carveLockFloor(parseLock(ARMS_REJOIN, "armsRejoin").lock, BINDING)
    const junction = grid.cells.flat().find(cell => cell.type === "room" && cell.mechanismId === "armsRejoin.Y")
    expect(junction?.type === "room" && junction.exits?.filter(exit => exit.gateKeyId !== undefined)).toHaveLength(2)
    expectSound(grid)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/regions.spec.ts src/game/gateLoops.spec.ts`
Expected: FAIL: `forkSeams` is not exported; `ARMS_REJOIN` throws "carved at none of 12 seeds" with
`gateOwnedOffSeam` on `in-b`.

- [ ] **Step 3: Implement**

In `src/game/regions.ts`, after `offRouteChains`, add:

```ts
/**
 * THE WAYS OUT OF `region` A JUNCTION THERE OFFERS BESIDE THE ROUTE, each as `[region, other]`.
 *
 * On a floor carved as side chains, a way out is the first join of a chain whose mouth is `region` (a chain joined
 * to its mouth by a drop alone has no corridor to leave by). On a floor laid from a lock plan (`laid`) every
 * connection is a corridor, so every other join of `region` the route does not take is a way out too: the second
 * meeting of a loop. The chains' seams come first, so a layout with no loop gets the same seams in the same order
 * either way.
 */
export const forkSeams = (
  graph: RegionGraph,
  region: string,
  oneWays: ReadonlyArray<readonly [string, string]> = [],
  { laid = false }: { laid?: boolean } = {}
): [string, string][] => {
  const keyOf = (a: string, b: string) => JSON.stringify([a, b].sort())
  const joined = new Set(graph.connections.map(([a, b]) => keyOf(a, b)))
  const chained = offRouteChains(graph, oneWays)
    .filter(chain => chain.mouth === region && chain.regions.length > 0 && joined.has(keyOf(region, chain.regions[0])))
    .map((chain): [string, string] => [region, chain.regions[0]])
  if (!laid) return chained
  const route = regionRoute(graph)
  const taken = new Set([
    ...route.slice(1).map((next, i) => keyOf(route[i], next)),
    ...chained.map(([a, b]) => keyOf(a, b)),
  ])
  const looped: [string, string][] = []
  for (const [a, b] of graph.connections) {
    if ((a !== region && b !== region) || a === b || taken.has(keyOf(a, b))) continue
    taken.add(keyOf(a, b))
    looped.push([region, a === region ? b : a])
  }
  return [...chained, ...looped]
}
```

In `src/game/obstacles.ts`, import `forkSeams` beside `offRouteChains, regionRoute` from `./regions`, and replace the
body of `seamsFor` (lines 455-467 at `2afa135a`) with:

```ts
  const seamsFor = (region: string): Set<string> => {
    const known = seamsOf.get(region)
    if (known) return known
    const seams = new Set(forkSeams(layout, region, drops, { laid }).map(([a, b]) => connectionKey(a, b)))
    seamsOf.set(region, seams)
    return seams
  }
```

In `src/game/siteAssembler.ts`, add `forkSeams` to the `./regions` import, and in the `{ in }` fork loop
(line 1175 onward, from `const seams: [string, string][] = []` to the end of `layoutChains.forEach`) replace the seam
collection. At `2afa135a` the loop already skips `sectionIdxs` on a laid floor (`if (!plan && i < …)`); the laid
branch below never reaches it, so the side-chain branch drops the `!plan`:

```ts
      const seams: [string, string][] = []
      const sectionIdxs: number[] = []
      // A laid floor's junction is laid for its plan's arms, which may meet again beyond it; a floor carved as side
      // chains matches each seam to the side section hosting its chain.
      if (plan) seams.push(...forkSeams(regionLayout, region, drops, { laid: true }))
      else
        layoutChains.forEach((chain, i) => {
          if (chain.mouth !== region || chain.regions.length === 0 || !joined(region, chain.regions[0])) return
          seams.push([region, chain.regions[0]])
          if (i < config.sideSections.length) sectionIdxs.push(i)
        })
```

(`regionLayout` is narrowed by the `notInLayout` guard above it. If TypeScript does not narrow it, hoist
`const layout = regionLayout` above the loop with an `if (!layout) …` matching that guard's refusal; do not add a
non-null assertion.)

- [ ] **Step 4: Run them to see them pass**

Run: `yarn vitest run src/game/regions.spec.ts src/game/gateLoops.spec.ts src/game/obstacles.spec.ts src/game/lockCompile.spec.ts src/game/siteAssembler.spec.ts src/game/regionBarrier.spec.ts src/game/laidFloor.spec.ts src/game/layLocks.spec.ts`
Expected: PASS, the fork-switch refusals in `siteAssembler.spec.ts` (`gateOwnedOffSeam`, `forkSwitchSeamUngated`,
`fewerThanTwoSeams`) unchanged.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/regions.ts src/game/regions.spec.ts src/game/obstacles.ts src/game/siteAssembler.ts src/game/gateLoops.spec.ts
git commit -m "feat(topology): a laid fork's ways may meet again beyond it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 4: The tool no longer calls a gate loop unbuildable

**Files:**
- Modify: `src/game/lockWalkSpec.ts` (`notBuildable` loses "gate loop"; `hasGateLoop` goes)
- Test: `src/game/lockWalkSpec.spec.ts` ("names what the engine cannot build yet")

**Interfaces:** none new. `notBuildable(lock: Lock): string[]` keeps its signature; the lock playground
(`src/app/SiteMap/lockPlayground.testing.tsx`) then carves a lock with a loop instead of showing "not buildable yet".

- [ ] **Step 1: Change the test**

In `src/game/lockWalkSpec.spec.ts`, in "names what the engine cannot build yet", the loop line becomes:

```ts
    expect(notBuildable(parseLock("in -[H]- hall\nhall -- out\nout -- in\nH toggle @in").lock)).toEqual([])
```

Run: `yarn vitest run src/game/lockWalkSpec.spec.ts`
Expected: FAIL, `["gate loop"]`.

- [ ] **Step 2: Implement**

In `src/game/lockWalkSpec.ts` delete `hasGateLoop` (its doc comment and the function, ending at line 198 at `2afa135a`) and
the `...(hasGateLoop(lock) ? ["gate loop"] : []),` line in `notBuildable`, leaving `sequence` and `region gate`. Then `grep -n "joinOf\|barriersOf" src/game/lockWalkSpec.ts`: drop from
the imports any name with no other use.

Run: `yarn vitest run src/game/lockWalkSpec.spec.ts && yarn check-types && yarn lint`
Expected: PASS, clean.

Run: `yarn run lock stoneGate 2>&1 | head -8`
Expected: no `⚠ not buildable yet` line (at `2afa135a` it prints `⚠ not buildable yet: gate loop`).

- [ ] **Step 3: Commit**

```bash
git add src/game/lockWalkSpec.ts src/game/lockWalkSpec.spec.ts
git commit -m "feat(lock): a gate loop is buildable" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 5: stoneGate on the dev floor

**Files:**
- Modify: `src/worldGen/spec/dev.ts` (pyramid 12: stoneGate)
- Modify: `src/worldGen/data.ts:72` (`DEV_JOURNEYS` `levelCount: 12`)
- Modify (the dev journey's counts, which these sweeps pin): `src/worldGen/devJourney.verify.ts`,
  `src/worldGen/floorLockWalkUnchanged.verify.ts`, `src/worldGen/singlePlaceMechanisms.verify.ts`,
  `src/worldGen/lockFloorInspector.verify.ts`, `src/mods/topology/carveNeverDependsOnAMod.verify.ts`
- Modify: `src/data/carveLedger.json` (hash refresh from the plain bake)
- Test: none of its own. The proof is the dev bake, its lock sweep and `yarn verify-content`, never a content
  assertion.

**Interfaces:**
- Consumes: `catalogueLock(name)` from `./locks/catalogue` and `freeRegions(lock)` from `@/game/lockAuthoring`
  (both imported in `dev.ts` already); phase 3's binding key `unladen` (`PASSAGE_KIND`) and realisation
  `narrowPassage` (`src/mods/topology/game/narrowPassage/meta.ts`).

- [ ] **Step 1: Check what this task stands on**

Run: `git status --short src/data/`
Expected: nothing (no uncommitted playtest bake).

Run: `yarn run lock stoneGate 2>&1 | head -4`
Expected: `✓ every region is reachable` and `✓ solvable`. If not, the designer's lock changed: stop and report.

- [ ] **Step 2: Author the floor**

`src/worldGen/spec/dev.ts`: append to `devRules`, after pyramid 11 (twoStones):

```ts
  // 12 — stoneGate, read from its .lock file. Lifting the stone off the altar opens the back way and shuts the door
  // in; a stone parked on the backroom shelf lets the explorer squeeze through the narrow passage; both stones are
  // spent twice. Its gated joins close loops. Every region takes `free`, as on the other lock benches.
  //
  // Bound at the pyramid: the stones are stone plates, the activator a torch, empty hands a narrow passage.
  journey(DEV_JOURNEY_ID)
    .pyramid(12, {
      difficulty: "expert",
      pathPuzzles: 0,
      realisations: { weights: "stonePlate", activator: "torch", unladen: "narrowPassage" },
    })
    .floor(0, {
      locks: [{ lock: freeRegions(catalogueLock("stoneGate")) }],
    }),
```

`src/worldGen/data.ts` line 72: `levelCount: 11` becomes `levelCount: 12`.

- [ ] **Step 3: Bake with the dev journey and read the seed the bake chose**

Run: `INCLUDE_DEV=1 yarn generate-world 2>&1 | tail -20`
Expected: exits 0, no `✗` line, `Lock sweep: walked 14 of 14 floor(s)`. If it prints `unsatisfiable: dev_topology
level 12 …`, stop and report the refusal it names (a `lockNotLaid` names the part the lay could not place); do not
work around it.

Run: `grep -n -B3 '"name":"stoneGate"' src/data/generatedWorld.ts`
Expected: the floor's `seed: <n>,` (and `packing: <p>,`) just above its `locks:` line.

Add the seed to the stoneGate floor in `dev.ts`, after `locks`, with the comment that matches what the bake did:

```ts
      // Recorded from the bake's own carve search (searchCarvePair): at the default packing the floor's own
      // address seed carves on attempt 0, walks sound and leaves no dead region. A dev floor has no baked output
      // to carry the pin.
      seed: <n>,
```

If the seed is not the floor's own address seed, say "the first seed that carves … is <k> past the floor's address
seed" (as pyramid 10's comment does); if the packing printed is not `0.1`, also author `packing: <p>` and say so (as
pyramid 3 does).

Then restore the committed world, which holds no dev journey, and prove it unchanged:

Run: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts; echo $?`
Expected: `0`.

Run: `git diff -U0 src/data/carveLedger.json | grep -E '^[-+] ' | grep -vc '"hash"'`
Expected: `0` (every changed ledger line is a `"hash"` line). If a `"refusal"` line changed, a world floor's carve
search now ends differently: stop and find which task moved it.

- [ ] **Step 4: Update the dev journey's counts in the sweeps**

One more floor, holding a lock with no drop and no switch. The numbers below are those at `2afa135a` (checked); if
a later commit moved one, add one to what is there.

`src/worldGen/devJourney.verify.ts`:
- every `toHaveLength(11)` becomes `toHaveLength(12)`, including the one in `"walks eleven of them on the dev journey
  itself"`, whose title becomes `"walks twelve of them on the dev journey itself"`;
- `"walks thirteen once the dev journey stands its eleven, and finds no strand"` becomes `"walks fourteen once the dev
  journey stands its twelve, and finds no strand"` with `toHaveLength(14)`;
- the difficulties list gains a final `"expert"`;
- the switch test's title and comment add stoneGate beside twoStones (`…, the procession's, twoStones' and
  stoneGate's, none of which needs one`), and `const noJunction = new Set([1, 3, 6, 7, 9, 10])` becomes
  `new Set([1, 3, 6, 7, 9, 10, 11])`;
- the side-section comment adds stoneGate to its lock floors, and `toEqual([2, 0, 2, 0, 2, 2, 3, 1, 2, 0, 0])` becomes
  `toEqual([2, 0, 2, 0, 2, 2, 3, 1, 2, 0, 0, 0])`;
- the lock sweep's header comment: "the eleven the dev journey adds" becomes "the twelve the dev journey adds".

`src/worldGen/floorLockWalkUnchanged.verify.ts`: `expect(dev).toHaveLength(11)` becomes `toHaveLength(12)`.

`src/worldGen/singlePlaceMechanisms.verify.ts`: `expect(dev).toHaveLength(11)` becomes `toHaveLength(12)`;
`expect(several).toEqual([10, 11])` becomes `toEqual([10, 11, 12])` (the stones move at every plate).

`src/worldGen/lockFloorInspector.verify.ts`: `toEqual([2, 4, 10, 11])` becomes `toEqual([2, 4, 10, 11, 12])`.

`src/mods/topology/carveNeverDependsOnAMod.verify.ts`: `Array.from({ length: 11 }, …)` in `FLOORS_WITH_MECHANICS`
becomes `{ length: 12 }`, and its three `toHaveLength(11)` become `toHaveLength(12)`. `FLOORS_WITH_DROPS` is
unchanged.

Run: `yarn verify-content 2>&1 | grep -E "×|Test Files|Tests "`
Expected: only the three known `src/mods/puzzleSeeds.verify.ts` failures. Every dev-journey sweep passes,
`toggleOff` and `carveNeverDependsOnAMod` included: with the topology mod off, stoneGate's plates are bare, its torch
bare and its passage open ground, on the same walls.

- [ ] **Step 5: Commit**

```bash
git add src/worldGen/spec/dev.ts src/worldGen/data.ts src/worldGen/devJourney.verify.ts src/worldGen/floorLockWalkUnchanged.verify.ts src/worldGen/singlePlaceMechanisms.verify.ts src/worldGen/lockFloorInspector.verify.ts src/mods/topology/carveNeverDependsOnAMod.verify.ts src/data/carveLedger.json
git diff --cached --exit-code -- src/data/generatedWorld.ts
git commit -m "feat(topology): stoneGate on the dev floor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 6: The squeeze starts from the nearer side

Where a gate loop makes both sides of a passage walkable, the explorer walks to the side nearer him and squeezes
from there, never round the loop to the far one. The side he starts on becomes the traversal's `from`, and the
squeeze's choreography already reads its heading off the traversal (`squeezeWay`, `src/app/SiteMap/useSqueeze.ts`;
`poseOf`, `src/app/SiteMap/SqueezeRider.tsx`): head-on going north he starts on the wall's face and fades behind it,
going south he comes out from behind it; sideways he slides along behind the wall, slower
(`SQUEEZE_SIDEWAYS_MS_PER_LEG`) and lifted (`SQUEEZE_SIDEWAYS_LIFT`). So this task changes which side he starts on
and nothing in the squeeze itself.

**Files:**
- Modify: `src/game/passages.ts` (`passageCrossing` takes an optional cost)
- Modify: `src/app/SiteMap/useSiteNavigation.ts` (the passage tap passes the path length)
- Test: `src/game/passages.spec.ts`

**Interfaces:**
- Consumes: `passageCrossing(grid, row, col, canStand): PassageCrossing | undefined`,
  `passageSides(grid, row, col)`, `headingOf(from, to)` (all `src/game/passages.ts`); `findPath(grid, from, to)`
  (`src/game/gridNavigation.ts:207`).
- Produces: `passageCrossing(grid, row, col, canStand, costOf?: (row: number, col: number) => number)`.

- [ ] **Step 1: Check what this task stands on**

Run: `grep -n "export const passageCrossing" -A12 src/game/passages.ts`
Expected: phase 3's function, picking `near` with `sides.find(([r, c]) => canStand(r, c))` (checked at `2afa135a`).

Run: `grep -n "const crossing = passageCrossing" -A14 src/app/SiteMap/useSiteNavigation.ts`
Expected: the passage branch of `onCellClick` builds its `Traversal` as `from: crossing.near`, `to: crossing.far`,
`dir: headingOf(crossing.via, crossing.far)`, `via: crossing.via` (checked at `2afa135a`). That is what makes the
squeeze follow the side chosen here; if it builds the traversal another way, stop and report.

- [ ] **Step 2: Write the failing tests**

In `src/game/passages.spec.ts`, inside `describe("passageCrossing", …)`, beside phase 3's "starts on the first side
where he can stand on both" (which uses the `straight` fixture, sides `[0, 0]` and `[0, 2]`, and stays: it is the tie):

```ts
  it("starts on the nearer side where he can stand on both", () => {
    expect(passageCrossing(straight, 0, 1, () => true, (_r, c) => (c === 2 ? 1 : 5))?.near).toEqual([0, 2])
    expect(passageCrossing(straight, 0, 1, () => true, () => 3)?.near).toEqual([0, 0])
  })

  it("squeezes away from the side he starts on, toward the other", () => {
    const crossing = passageCrossing(straight, 0, 1, () => true, (_r, c) => (c === 2 ? 1 : 5))!
    expect(crossing.far).toEqual([0, 0])
    expect(headingOf(crossing.via, crossing.far)).toBe("w")
  })
```

Run: `yarn vitest run src/game/passages.spec.ts`
Expected: FAIL, the first gets `[0, 0]`, the second `far` `[0, 2]` (the cost is ignored).

- [ ] **Step 3: Implement**

In `src/game/passages.ts`, `passageCrossing` gains the cost and picks the cheapest standable side, the first in
`dirs` order on a tie. Its doc comment's last sentence becomes "Both are standable only where a gate closes a loop;
he starts from the one `costOf` rates nearer, the first on a tie, and squeezes toward the other." The function:

```ts
export const passageCrossing = (
  grid: FloorGrid,
  row: number,
  col: number,
  canStand: (row: number, col: number) => boolean,
  costOf: (row: number, col: number) => number = () => 0
): PassageCrossing | undefined => {
  const cell = grid.cells[row]?.[col]
  const sides = passageSides(grid, row, col)
  if (!sides || cell?.type !== "room" || !cell.passage) return undefined
  const near = sides
    .filter(([r, c]) => canStand(r, c))
    .reduce<Place | undefined>((best, side) => (best && costOf(...best) <= costOf(...side) ? best : side), undefined)
  if (!near) return undefined
  return { near, via: [row, col], far: near === sides[0] ? sides[1] : sides[0], realisation: cell.passage.realisation }
}
```

In `src/app/SiteMap/useSiteNavigation.ts`, in the passage branch of `onCellClick`
(`const crossing = passageCrossing(grid, row, col, (r, c) => walkable.has(`${r},${c}`))`):

```ts
        const crossing = passageCrossing(
          grid,
          row,
          col,
          (r, c) => walkable.has(`${r},${c}`),
          (r, c) => findPath(grid, explorerPos, [r, c]).length
        )
```

(`findPath` is imported there already. Both sides passed to `costOf` are standable, so both have a path.)

Run: `yarn vitest run src/game/passages.spec.ts src/app/SiteMap && yarn check-types && yarn lint`
Expected: PASS, clean: phase 3's crossing tests (the way back from the far side included) and the squeeze specs
(`useSqueeze.spec.ts`, `SqueezeRider.spec.tsx`) unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/game/passages.ts src/game/passages.spec.ts src/app/SiteMap/useSiteNavigation.ts
git commit -m "feat(map): the squeeze starts from the nearer side" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 7: A lock marks one nest spot

The designer's decision (2026-10-08): each lock has a single spot for nesting. The notation marks it on the takes
line (`cell &`, question 5); a second spot, or a spot no lock could stand in, is refused by name when the lock is read
(question 7). The seat rules move out of `floorLocks.ts` unchanged, so task 8 can ask the same function at placement.

**Files:**
- Modify: `src/game/lockAuthoring.ts` (`LockAppetite`; `LockRegion.takes`; `regionsHeldBy` and `sidesOf` moved here
  from `floorLocks.ts` and exported; `SeatFault`, `seatOf`, `nestSpotOf`, `NestSpotFault`, `nestSpotFaults`;
  `freeRegions` keeps the spot)
- Modify: `src/game/floorLocks.ts` (imports `regionsHeldBy`, `sidesOf` instead of defining them; no behaviour change)
- Modify: `src/game/lockNotation.ts` (`APPETITE` gains `&`; `LOCK_SYNTAX`; the refused lines)
- Modify: `src/game/lockCompile.ts` (`LockFault` gains `NestSpotFault`; `lockFaults` asks `nestSpotFaults`;
  `translate` compiles the spot as `free`)
- Modify: `src/game/lockDraw.ts` (the spot's box shows `⊞nest`)
- Modify: `scripts/lock.ts` (prints `nest spot: <region>`)
- Create: `src/game/nestSpot.spec.ts`

**Interfaces:**
- Produces, in `@/game/lockAuthoring`:
  - `export type LockAppetite = RegionAppetite | "nest"`; `LockRegion = { takes: LockAppetite }`
  - `export type SeatFault = { type: "atPort"; region: string } | { type: "regionBarred"; region: string; barriers:
    string[] } | { type: "regionHoldsMechanic"; region: string; mechanics: string[] } | { type: "notPassThrough";
    region: string; joins: number } | { type: "directionAmbiguous"; region: string }`
  - `export const seatOf = (lock: Lock, region: string): { faults: SeatFault[]; sides?: [string, string] }` (`sides`
    only when `faults` is empty; nearer the lock's `in` first)
  - `export const nestSpotOf = (lock: Lock): string | undefined`
  - `export type NestSpotFault = { type: "nestSpotsRepeated"; regions: string[] } | { type: "nestSpotUnseatable";
    region: string; fault: SeatFault }`; `export const nestSpotFaults = (lock: Lock): NestSpotFault[]`
  - `regionsHeldBy(mechanic: LockMechanic): string[]`, `sidesOf(lock, region, neighbours): [string, string] |
    undefined` (moved, exported)
- Task 8 reads `nestSpotOf` and `seatOf`; task 14 reads `nestSpotOf`.

- [ ] **Step 1: Write the failing tests**

Create `src/game/nestSpot.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { freeRegions, nestSpotFaults, nestSpotOf, seatOf } from "./lockAuthoring"
import { compileLock } from "./lockCompile"
import { drawLock } from "./lockDraw"
import { parseLock } from "./lockNotation"
import { BINDING } from "./testSupport/lockFixtures"

// MADE-UP LOCKS WITH A NEST SPOT, never catalogue ones: a test pins the rule, `yarn run lock` checks the catalogue.

/** A lever lock whose middle stretch, `hall`, is where another lock may stand. */
const NESTING = "in -- hall\nhall -[L]- out\nL toggle @in\nin ?\nhall &\nout ?"
const TWICE = "in -- a\na -- b\nb -- out\na &\nb &\nin ?\nout ?"

describe("a lock's nest spot", () => {
  it("is the one region written &", () => {
    const { lock, refused } = parseLock(NESTING, "nesting")
    expect(refused).toEqual([])
    expect(lock.regions.hall).toEqual({ takes: "nest" })
    expect(nestSpotOf(lock)).toBe("hall")
  })

  it("is absent from a lock that writes none", () => {
    expect(nestSpotOf(parseLock("in -- hall\nhall -- out\nin ?\nhall ?\nout ?").lock)).toBeUndefined()
  })

  it("seats a lock between its two neighbours, the one nearer the way in first", () => {
    expect(seatOf(parseLock(NESTING, "nesting").lock, "hall")).toEqual({ faults: [], sides: ["in", "out"] })
  })

  it("is one per lock: a second is refused, naming both, on the second's line", () => {
    const { lock, refused } = parseLock(TWICE, "twice")
    expect(nestSpotFaults(lock)).toEqual([{ type: "nestSpotsRepeated", regions: ["a", "b"] }])
    expect(refused).toEqual(["line 5: a lock has one nest spot, and a and b are written &"])
  })

  it.each([
    ["the way in", "in -- hall\nhall -- out\nin &\nhall ?\nout ?", { type: "atPort", region: "in" }],
    [
      "a region barred as a whole",
      "in -- hall\nhall -- out\nhall -[L]\nL toggle @in\nin ?\nhall &\nout ?",
      { type: "regionBarred", region: "hall", barriers: ["hall:barred"] },
    ],
    [
      "a region a mechanic stands in",
      "in -- hall\nhall -[L]- out\nL toggle @hall\nin ?\nhall &\nout ?",
      { type: "regionHoldsMechanic", region: "hall", mechanics: ["L"] },
    ],
    ["a region off the route", "in -- out\nin -- side\nin ?\nside &\nout ?", { type: "notPassThrough", region: "side", joins: 1 }],
    [
      "a region whose two neighbours are as far from the way in",
      "in -- p\nin -- q\np -- r\nq -- r\np -- out\nin ?\np ?\nq ?\nr &\nout ?",
      { type: "directionAmbiguous", region: "r" },
    ],
  ])("refuses a spot no lock could stand in: %s", (_, text, fault) => {
    expect(nestSpotFaults(parseLock(text, "spot").lock)).toContainEqual({
      type: "nestSpotUnseatable",
      region: fault.region,
      fault,
    })
  })

  it("names the rule in yarn lock's words, on the spot's line", () => {
    expect(parseLock("in -- hall\nhall -[L]- out\nL toggle @hall\nin ?\nhall &\nout ?", "spot").refused).toEqual([
      "line 5: hall cannot hold a nested lock: L stands in it",
    ])
  })

  it("is refused by the compile too, so a placed lock is checked as yarn lock checks it", () => {
    const result = compileLock(parseLock(TWICE, "twice").lock, BINDING)
    expect(result.ok === false && result.faults).toContainEqual({ type: "nestSpotsRepeated", regions: ["a", "b"] })
  })

  it("compiles as free where nothing nests, so the lock carves as if it were written ?", () => {
    const spot = compileLock(parseLock(NESTING, "n").lock, BINDING, { namespace: "n" })
    const free = compileLock(parseLock(NESTING.replace("hall &", "hall ?"), "n").lock, BINDING, { namespace: "n" })
    expect(spot).toEqual(free)
  })

  it("survives a bench floor, which frees every other region", () => {
    expect(freeRegions(parseLock(NESTING.replace("in ?", "in *"), "n").lock).regions).toEqual({
      in: { takes: "free" },
      hall: { takes: "nest" },
      out: { takes: "free" },
    })
  })

  it("is marked in the drawing", () => {
    expect(drawLock(parseLock(NESTING, "n").lock)).toContain("[hall · ⊞nest]")
  })
})
```

(If `parseLock` names the region gate other than `hall:barred`, use the id it gives and say so in the report.
`toContainEqual` on the seat rules: a port with one join is also `notPassThrough`, and both are true.)

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/nestSpot.spec.ts`
Expected: FAIL: `nestSpotFaults`, `nestSpotOf`, `seatOf` are not exported, and `parseLock` throws `cannot read
"hall &"`.

- [ ] **Step 3: Implement the authoring side**

In `src/game/lockAuthoring.ts`, replace `export type LockRegion = { takes: RegionAppetite }` with:

```ts
/** What a region of a lock takes: a layout appetite, or `nest`, the one region another lock may stand in. A spot
 * nothing nests in compiles as `free`. */
export type LockAppetite = RegionAppetite | "nest"
export type LockRegion = { takes: LockAppetite }
```

Move `regionsHeldBy` and `sidesOf` from `src/game/floorLocks.ts` into `lockAuthoring.ts` verbatim, each with
`export`, below `isUnladenGate` (they use `joinOf`, which `lockAuthoring.ts` defines). In `floorLocks.ts`, delete both
and import them: `import { isRegionGate, joinOf, regionsHeldBy, sidesOf } from "./lockAuthoring"`.

After them, add:

```ts
/** Why a lock nested in a region could not stand there. Authored names. */
export type SeatFault =
  /** The lock's `in` or `out`: a port cannot hold another lock. */
  | { type: "atPort"; region: string }
  /** The region is barred as a whole, so the inner lock would stand behind a wall of the host's. */
  | { type: "regionBarred"; region: string; barriers: string[] }
  | { type: "regionHoldsMechanic"; region: string; mechanics: string[] }
  /** The region is not a stretch of the lock's route with exactly one way in and one way out. */
  | { type: "notPassThrough"; region: string; joins: number }
  /** Both neighbours are equally far from the lock's `in`, so which side the inner's `in` faces is not said. */
  | { type: "directionAmbiguous"; region: string }

/**
 * WHERE A LOCK NESTED IN `region` STANDS, or every reason it cannot: the region's two neighbours, the one nearer the
 * lock's `in` first. The inner's `in` takes the join on that side and its `out` the other, so the route walks host,
 * inner, host. The one place the seat rules live: the nest spot is checked by them when the lock is read
 * (`nestSpotFaults`), and placement seats by them (`seatNested`, floorLocks.ts).
 */
export const seatOf = (lock: Lock, region: string): { faults: SeatFault[]; sides?: [string, string] } => {
  const faults: SeatFault[] = []
  if (region === lock.in || region === lock.out) faults.push({ type: "atPort", region })
  const barriers = Object.entries(lock.gates)
    .filter(([, gate]) => isRegionGate(gate) && gate.region === region)
    .map(([id]) => id)
  if (barriers.length > 0) faults.push({ type: "regionBarred", region, barriers })
  const mechanics = Object.entries(lock.mechanics)
    .filter(([, mechanic]) => regionsHeldBy(mechanic).includes(region))
    .map(([id]) => id)
  if (mechanics.length > 0) faults.push({ type: "regionHoldsMechanic", region, mechanics })
  const neighbours = lock.connections
    .map(joinOf)
    .filter(([a, b]) => a === region || b === region)
    .map(([a, b]) => (a === region ? b : a))
  if (neighbours.length !== 2) faults.push({ type: "notPassThrough", region, joins: neighbours.length })
  const sides = neighbours.length === 2 ? sidesOf(lock, region, [neighbours[0], neighbours[1]]) : undefined
  if (neighbours.length === 2 && !sides) faults.push({ type: "directionAmbiguous", region })
  return faults.length === 0 && sides ? { faults, sides } : { faults }
}

/** The one region another lock may stand in, written `&`; undefined when the lock has none. */
export const nestSpotOf = (lock: Lock): string | undefined =>
  Object.keys(lock.regions).find(region => lock.regions[region].takes === "nest")

/** Where a lock's nest spot contradicts it: a second spot, or a spot no lock could stand in. */
export type NestSpotFault =
  | { type: "nestSpotsRepeated"; regions: string[] }
  | { type: "nestSpotUnseatable"; region: string; fault: SeatFault }

/** A LOCK HAS ONE NEST SPOT AT MOST (designer, 2026-10-08), and it is one a lock can stand in. */
export const nestSpotFaults = (lock: Lock): NestSpotFault[] => {
  const spots = Object.keys(lock.regions).filter(region => lock.regions[region].takes === "nest")
  if (spots.length > 1) return [{ type: "nestSpotsRepeated", regions: spots }]
  return spots.flatMap(region =>
    seatOf(lock, region).faults.map((fault): NestSpotFault => ({ type: "nestSpotUnseatable", region, fault }))
  )
}
```

`freeRegions` keeps the spot (its doc comment gains "; the nest spot stays, or nothing could nest on the bench"):

```ts
export const freeRegions = (lock: Lock): Lock => ({
  ...lock,
  regions: Object.fromEntries(
    Object.entries(lock.regions).map(([region, { takes }]): [string, LockRegion] => [
      region,
      { takes: takes === "nest" ? "nest" : "free" },
    ])
  ),
})
```

In `src/game/lockNotation.ts`:
- import `nestSpotFaults`, `type LockAppetite`, `type SeatFault` from `./lockAuthoring`;
- `APPETITE` becomes `Record<string, LockAppetite>` with `"&": "nest"`; `regions` and `takes` are typed with
  `LockAppetite`; the takes pattern becomes `/^(\w+)\s+([$*?&-])$/`;
- `LOCK_SYNTAX` gains, after the takes line:
  ```
    cell &                        the nest spot: another lock may stand here; one per lock
  ```
- after the `unladenFaults` loop, before `return`:
  ```ts
  const takenOn = new Map(takes.map(({ region: r, n }) => [r, n]))
  const listed = (names: string[]) => `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
  for (const fault of nestSpotFaults(lock))
    refused.push(
      fault.type === "nestSpotsRepeated"
        ? `line ${takenOn.get(fault.regions[fault.regions.length - 1])}: a lock has one nest spot, and ${listed(fault.regions)} are written &`
        : `line ${takenOn.get(fault.region)}: ${fault.region} cannot hold a nested lock: ${seatWords(fault.fault)}`
    )
  ```
  with, above `parseLock`:
  ```ts
  /** A seat rule in the words `yarn lock` prints. */
  const seatWords = (fault: SeatFault): string => {
    switch (fault.type) {
      case "atPort":
        return "it is the way in or the way out"
      case "regionBarred":
        return `${fault.barriers.join(", ")} bars it as a whole`
      case "regionHoldsMechanic":
        return `${fault.mechanics.join(", ")} stands in it`
      case "notPassThrough":
        return `it has ${fault.joins} joins, not one way in and one way out`
      case "directionAmbiguous":
        return "its two neighbours are as far from the way in, so neither side is the nested lock's way in"
    }
  }
  ```

In `src/game/lockCompile.ts`:
- import `nestSpotFaults` and `type NestSpotFault` from `./lockAuthoring`;
- `LockFault` gains `| NestSpotFault` beside `| UnladenFault`;
- in `lockFaults`, after `faults.push(...unladen)`: `faults.push(...nestSpotFaults(lock))`;
- in `translate`'s `regionLayout.regions` (`appetite: takes`), the spot compiles as `free`:
  ```ts
      regions: Object.entries(lock.regions).map(([region, { takes }]) => ({
        name: name(region),
        // A spot nothing nests in is free ground; a lock nested there takes its place (expandFloorLocks).
        appetite: takes === "nest" ? ("free" as const) : takes,
      })),
  ```

In `src/game/lockDraw.ts`, `sketchOf`'s `boxes`: beside `standing`, add
`const nest = lock.regions[region].takes === "nest" ? ["⊞nest"] : []`, and the box becomes
`` `[${[region, ...nest, ...standing, ...steps, ...plates].join(" · ")}${barred}]` ``.

In `scripts/lock.ts`, import `nestSpotOf` from `../src/game/lockAuthoring`, and in `checks`, after the
`at the start …` line: `` ...(nestSpotOf(lock) ? [`nest spot: ${nestSpotOf(lock)}`] : []), ``.

- [ ] **Step 4: Run them to see them pass, and every lock spec stays green**

Run: `yarn vitest run src/game/nestSpot.spec.ts src/game/lockNotation.spec.ts src/game/lockDraw.spec.ts src/game/lockCompile.spec.ts src/game/nestedLocks.spec.ts src/game/floorLocks.spec.ts src/game/lockWalkSpec.spec.ts`
Expected: PASS. `nestedLocks.spec.ts` is unchanged by this task and stays green (placement still asks its own rules
until task 8).

Run: `printf 'in -- hall\nhall -[L]- out\nL toggle @in\nin ?\nhall &\nout ?\n' | yarn run lock -`
Expected: a `nest spot: hall` line, and the drawing's box `[hall · ⊞nest]`.

Run: `yarn run lock 2>&1 | grep -c "nest spot"`
Expected: `0` (no catalogue lock writes `&`).

Run: `yarn check-types && yarn lint`
Expected: clean. A type error where a `Lock`'s `takes` is read as a `RegionAppetite` is a reader this task missed:
compile it as `free` there the way `translate` does, and say where in the report.

- [ ] **Step 5: Commit**

```bash
git add src/game/lockAuthoring.ts src/game/floorLocks.ts src/game/lockNotation.ts src/game/lockCompile.ts src/game/lockDraw.ts scripts/lock.ts src/game/nestSpot.spec.ts
git commit -m "feat(lock): a lock marks one nest spot, written &" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 8: A lock nests only in its host's nest spot

**Files:**
- Modify: `src/game/floorLocks.ts` (`LockNestingFault`: `notNestSpot`; the seat members go; `seatNested` asks
  `nestSpotOf` and `seatOf`)
- Modify: `src/game/testSupport/floorLockFixtures.ts` (`leverLock` and `strandingLock`: `hall: { takes: "nest" }`)
- Modify: `src/game/nestedLocks.spec.ts` (the seat refusals)
- Test: `src/game/nestedLocks.spec.ts`; `src/game/layLocks.spec.ts`, `src/game/lockPlan.spec.ts` stay green unchanged

**Interfaces:**
- Consumes: `nestSpotOf`, `seatOf` (task 7).
- Produces: `LockNestingFault` =
  `{ type: "hostUnknown"; host } | { type: "regionUnknown"; host; region } | { type: "notNestSpot"; host; region;
  spot: string | null } | { type: "cycle"; through } | { type: "regionShared"; host; region; with }` (task 9 adds
  `oneWayInPassThrough`). A spot no lock could stand in is the host's own refusal: `lockRefused` with
  `nestSpotUnseatable` (task 7).

- [ ] **Step 1: Change the fixtures and the tests**

`src/game/testSupport/floorLockFixtures.ts`: in `leverLock` and `strandingLock`, `hall: { takes: "free" }` becomes
`hall: { takes: "nest" }` (their doc comments gain "; another lock may nest in `hall`").

In `src/game/nestedLocks.spec.ts`, in `describe("a nesting that cannot be seated is refused by name", …)`:
- `it.each(["foyer", "landing"])("refuses the host's own port, %s", …)` becomes:
  ```ts
  it.each(["foyer", "landing"])("refuses a region that is not the host's nest spot, %s, naming the spot", region => {
    expect(refusedWith([{ lock: leverLock() }, inner({ instance: "lever", region })])).toEqual([
      {
        type: "lockNestingRefused",
        instance: "inner",
        fault: { type: "notNestSpot", host: "lever", region, spot: "hall" },
      },
    ])
  })

  it("refuses a host with no nest spot", () => {
    const plain: Lock = { ...leverLock(), name: "plain", regions: { ...leverLock().regions, hall: { takes: "free" } } }
    expect(refusedWith([{ lock: plain }, inner({ instance: "plain", region: "hall" })])).toEqual([
      {
        type: "lockNestingRefused",
        instance: "inner",
        fault: { type: "notNestSpot", host: "plain", region: "hall", spot: null },
      },
    ])
  })
  ```
- "refuses a region the host bars as a whole, naming the barrier" and "refuses a region that is not a stretch of the
  route, counting its joins" (both nest in `sluiceLock`, world content) and "refuses a region whose two neighbours are
  equally far from the host's in" are deleted: task 7's `nestSpot.spec.ts` asks those rules of made-up locks. Delete
  `ringLock`, and drop `sluiceLock` from the `./testSupport/lockFixtures` import if nothing else in the file uses it.
- "refuses a region a host mechanic stands in, naming the mechanic" becomes the host's own refusal:
  ```ts
  it("leaves a spot no lock could stand in to the host's own refusal", () => {
    const middle: Lock = { ...middleLeverLock(), regions: { ...middleLeverLock().regions, b: { takes: "nest" } } }
    expect(refusedWith([{ lock: middle }, inner({ instance: "middle", region: "b" })])).toEqual([
      {
        type: "lockRefused",
        instance: "middle",
        fault: {
          type: "nestSpotUnseatable",
          region: "b",
          fault: { type: "regionHoldsMechanic", region: "b", mechanics: ["lever"] },
        },
      },
    ])
  })
  ```
- "refuses a second lock in a region that already holds one, naming the first" and the two cycle tests stay as they
  are (they nest in `hall`, the spot).
- In `describe("stones on a floor with nested locks", …)` the stone lock's text ends `…\nin ?\nyard ?\nhall ?\nout ?`:
  `yard ?` becomes `yard &`, so the lever is still seated in it and the floor still meets `STONES_NESTED` (task 12
  deletes the block).

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/nestedLocks.spec.ts`
Expected: FAIL: the port tests get `atPort` and `notPassThrough` (a port has one join), the plain host is seated, and the
middle lock's refusal is `lockNestingRefused` `regionHoldsMechanic` beside the new `lockRefused`.

- [ ] **Step 3: Implement**

In `src/game/floorLocks.ts`, import `nestSpotOf` and `seatOf` from `./lockAuthoring` (beside `regionsHeldBy`,
`sidesOf` from task 7, which this file no longer reads once `seatOf` seats: drop them from the import if unused), and
replace `LockNestingFault` with:

```ts
/** EVERY WAY A NESTING IS REFUSED, naming the host, region or instance to fix. Authored names. A host's spot that no
 * lock could stand in is the host's own refusal (`nestSpotUnseatable`, compileLock), never a nesting's. */
export type LockNestingFault =
  | { type: "hostUnknown"; host: string }
  | { type: "regionUnknown"; host: string; region: string }
  /** A lock nests only in its host's nest spot (`&`); `spot` is the host's, null when it has none. */
  | { type: "notNestSpot"; host: string; region: string; spot: string | null }
  | { type: "cycle"; through: string[] }
  /** The spot holds one lock; `with` is the placement that got there first. */
  | { type: "regionShared"; host: string; region: string; with: string }
```

In `seatNested`, the loop body from `if (region === hostLock.in || region === hostLock.out)` to the end of the
`seats.push` becomes:

```ts
    // A LOCK NESTS ONLY IN ITS HOST'S NEST SPOT, the one region its author wrote `&`. Whether a lock can stand there
    // at all is asked when the host is read (`nestSpotFaults`), so a spot that seats none is refused there, by name.
    const spot = nestSpotOf(hostLock)
    if (region !== spot) {
      refuse(instance, { type: "notNestSpot", host, region, spot: spot ?? null })
      continue
    }
    const first = taken.get(host)
    if (first === undefined) taken.set(host, instance)
    else refuse(instance, { type: "regionShared", host, region, with: first })
    const { sides } = seatOf(hostLock, region)
    if (sides) seats.push({ instance, host, region, near: sides[0], far: sides[1] })
```

The cycle loop below it is unchanged. `expandFloorLocks`' doc comment ("A NESTED LOCK TAKES THE PLACE OF ONE REGION
OF ITS HOST") becomes "A NESTED LOCK TAKES THE PLACE OF ITS HOST'S NEST SPOT", the rest as it is.

- [ ] **Step 4: Run them to see them pass**

Run: `yarn vitest run src/game/nestedLocks.spec.ts src/game/layLocks.spec.ts src/game/lockPlan.spec.ts src/game/floorLocks.spec.ts src/game/nestSpot.spec.ts`
Expected: PASS; every nested floor carved in `nestedLocks.spec.ts` carves and walks as before (the spot is `hall`,
compiled `free`). Run `yarn vitest run src/game` too: a test elsewhere that compares `leverLock()` or
`strandingLock()` regions to a literal now reads `hall: { takes: "nest" }`; update that literal and name it in the
report. A compiled layout still reads `appetite: "free"` for the spot.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/floorLocks.ts src/game/testSupport/floorLockFixtures.ts src/game/nestedLocks.spec.ts
git commit -m "feat(locks): a lock nests only in its host's nest spot" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 9: Each nesting knows its stone case; a pass-through lock holds no one-way

Tasks 9-14 implement the spec's "Nested locks (designer, 2026-10-08)". They do not depend on tasks 1-6 (they read
the gate-loop work nowhere) but do on tasks 7-8: every host below marks its nest spot `&`, and `leverLock`'s spot is
`hall`.

**Files:**
- Modify: `src/game/floorLocks.ts` (`StoneNesting`, `stoneNestings`; `LockNesting.stones`; `LockNestingFault` gains
  `oneWayInPassThrough`; `expandFloorLocks` refuses it and writes the case)
- Create: `src/game/nestedStones.spec.ts`

**Interfaces:**
- Consumes: `notNestSpot` and the spot in `leverLock`'s `hall` (task 8).
- Produces, in `@/game/floorLocks`:
  - `export type StoneNesting = { case: "passThrough"; pool: string } | { case: "contained" } | { case: "shared"; pool: string }`
  - `export const stoneNestings = (placements: readonly PlacedLock[]): Map<string, StoneNesting>` (nested
    placements only; a nesting with no stones on either side is absent)
  - `LockNesting` gains `stones?: StoneNesting` (absent when neither side holds stones, so every nesting today reads
    exactly as before). `FloorGrid.lockNesting` is `readonly LockNesting[]` (`siteTypes.ts:357`), so the grid carries
    it with no further change.
  - `LockNestingFault` member `{ type: "oneWayInPassThrough"; pool: string; oneWays: string[] }` (the one-way ids of
    the pass-through lock, as its `Lock.oneWays` keys them).
  - In `expandFloorLocks`, `const stoneCases = stoneNestings(placements)` declared once, right after `seatNested`;
    task 10 reads it.
- Produces (test file, extended by tasks 10-12): `src/game/nestedStones.spec.ts` with `HOST_STONES`, `CELL`, `GATED`,
  `STRANDING_HOST`, `NESTED_BINDING`, the placements `PASS_THROUGH`, `CONTAINED`, `SHARED`, and the helpers `stones`,
  `carve`, `carved`, `expanded`.

- [ ] **Step 1: Write the failing test**

Create `src/game/nestedStones.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { expandFloorLocks, stoneNestings } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import { parseLock } from "./lockNotation"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid } from "./siteTypes"
import { leverLock } from "./testSupport/floorLockFixtures"
import { BINDING } from "./testSupport/lockFixtures"

// MADE-UP LOCKS NESTED IN EACH OTHER, never catalogue ones: a test pins the rule, `yarn run lock` checks the catalogue.
// Every region takes `free` but a host's nest spot, so the floor holds the locks and nothing else.

/** Stones around `yard`, the nest spot: a stone on the shelf by the way in, a door on that waits for a stone on `p`. */
const HOST_STONES =
  "in -- yard\nyard -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nyard &\nhall ?\nout ?"
/** A stone lock to nest: its stone on a shelf by its way in, its door on waiting for it on `p`. */
const CELL = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"
/** A stone lock that opens only for a stone carried in: `s` by its way in opens the way on, its own stone lies
 * beyond. Alone it cannot be solved; nested in a stone lock, the pool solves it. */
const GATED = "in -[s]- hall\nhall -- out\ns plate @in\nt plate @hall stone\nin ?\nhall ?\nout ?"
/** HOST_STONES with a torch by the way in that shuts the way on for good: a player who lights it first strands. */
const STRANDING_HOST =
  "in -[T:off]- yard\nyard -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nT activator @in\nin ?\nyard &\nhall ?\nout ?"

const NESTED_BINDING = { ...BINDING, weights: "stonePlate" }

const stones = (text: string, name: string) => parseLock(text, name).lock

/** The outer lock holds stones, the inner none: the stone is carried through it. */
const PASS_THROUGH: PlacedLock[] = [
  { lock: stones(HOST_STONES, "host") },
  { lock: leverLock(), as: "inner", inside: { instance: "host", region: "yard" } },
]
/** The inner lock holds stones, the outer none: they never leave it. */
const CONTAINED: PlacedLock[] = [
  { lock: leverLock() },
  { lock: stones(CELL, "cell"), as: "inner", inside: { instance: "lever", region: "hall" } },
]
/** Both hold stones: one pool. */
const SHARED: PlacedLock[] = [
  { lock: stones(HOST_STONES, "host") },
  { lock: stones(GATED, "gated"), as: "inner", inside: { instance: "host", region: "yard" } },
]

const floorOf = (locks: PlacedLock[]): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: NESTED_BINDING,
  locks,
})

const carve = (locks: PlacedLock[], seed: number) =>
  assembleFloor("nested-stones", floorOf(locks), seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: "nested-stones", floorIndex: 0 },
  })

const SEEDS = 12
const carved = (locks: PlacedLock[]): FloorGrid[] =>
  Array.from({ length: SEEDS }, (_, n) => carve(locks, n + 1)).flatMap(result => (result.success ? [result.grid] : []))

const expanded = (locks: PlacedLock[]) => {
  const result = expandFloorLocks(floorOf(locks))
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.reasons)}`)
  return result
}

describe("a nested lock's stones are read against the locks it stands in", () => {
  it("passes a stone through a lock without stones that stands in a lock with them", () => {
    expect(stoneNestings(PASS_THROUGH)).toEqual(new Map([["inner", { case: "passThrough", pool: "host" }]]))
  })

  it("contains the stones of a lock no lock around it shares", () => {
    expect(stoneNestings(CONTAINED)).toEqual(new Map([["inner", { case: "contained" }]]))
  })

  it("pools the stones of a lock standing in a lock with stones", () => {
    expect(stoneNestings(SHARED)).toEqual(new Map([["inner", { case: "shared", pool: "host" }]]))
  })

  it("reads past a lock without stones to the nearest that has them, and pools with the outermost", () => {
    const chain: PlacedLock[] = [
      { lock: stones(HOST_STONES, "host") },
      { lock: leverLock(), as: "middle", inside: { instance: "host", region: "yard" } },
      { lock: stones(CELL, "cell"), as: "deep", inside: { instance: "middle", region: "hall" } },
    ]
    expect(stoneNestings(chain)).toEqual(
      new Map([
        ["middle", { case: "passThrough", pool: "host" }],
        ["deep", { case: "shared", pool: "host" }],
      ])
    )
  })

  it("leaves a nesting without stones unmarked, so the floor's nesting reads as it did", () => {
    const plain: PlacedLock[] = [{ lock: leverLock() }, { lock: leverLock(), as: "inner", inside: { instance: "lever", region: "hall" } }]
    expect(stoneNestings(plain)).toEqual(new Map())
    expect(expanded(plain).nesting?.[0]).not.toHaveProperty("stones")
  })

  it("writes the case on the floor's nesting", () => {
    expect(expanded(SHARED).nesting?.[0].stones).toEqual({ case: "shared", pool: "host" })
  })
})

// A PASS-THROUGH LOCK NEVER TURNS A STONE AWAY: nothing that takes only empty hands stands in it.
describe("a pass-through lock never turns a stone away", () => {
  it("refuses a lock without stones that asks for empty hands, naming the lock", () => {
    const result = carve(
      [
        { lock: stones(HOST_STONES, "host") },
        { lock: stones("in -[unladen]- out\nin ?\nout ?", "crack"), as: "inner", inside: { instance: "host", region: "yard" } },
      ],
      1
    )
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.reasons).toContainEqual({
        type: "lockRefused",
        instance: "inner",
        fault: { type: "carryWithoutStones", barrier: "in-out" },
      })
  })

  it("refuses a one-way in it, since every one-way takes empty hands, naming the pool", () => {
    const result = carve(
      [
        { lock: stones(HOST_STONES, "host") },
        { lock: stones("in >> out\nin ?\nout ?", "chute"), as: "inner", inside: { instance: "host", region: "yard" } },
      ],
      1
    )
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.reasons).toContainEqual({
        type: "lockNestingRefused",
        instance: "inner",
        fault: expect.objectContaining({ type: "oneWayInPassThrough", pool: "host" }),
      })
  })

  it("leaves a one-way in a contained lock to the walk, which takes it with empty hands", () => {
    const dropping = "in -- hall\nhall >> out\nshelf plate @in stone\nin ?\nhall ?\nout ?"
    expect(() =>
      expanded([{ lock: leverLock() }, { lock: stones(dropping, "drop"), as: "inner", inside: { instance: "lever", region: "hall" } }])
    ).not.toThrow()
  })
})
```

The first pins a refusal that exists (`carryWithoutStones`, `lockCompile.ts`); if `parseLock` throws on
`in -[unladen]- out` with no plate, write that lock as a `Lock` literal (one gate owned by `unladen`, no `weights`)
instead; the fault is `compileLock`'s.

- [ ] **Step 2: Run it to see it fail**

Run: `yarn vitest run src/game/nestedStones.spec.ts`
Expected: FAIL, `stoneNestings` is not exported. Once it is, "refuses a one-way in it" still fails until step 3's
refusal; "refuses a lock without stones that asks for empty hands" passes from the start (it pins a refusal that
exists; if it fails, report the reason it got instead).

- [ ] **Step 3: Implement**

In `src/game/floorLocks.ts`, after `LockNesting`:

```ts
/**
 * HOW A NESTED LOCK'S STONES MEET THOSE OF THE LOCKS IT STANDS IN (stones spec, "Nested locks"), read against the
 * nearest of them that holds stones, at any depth: a stone carried through a lock without stones reaches whatever
 * stands inside that one too. `pool` is the outermost lock of that chain holding stones, whose level a shared
 * nesting is walked in and whose control the pooled stones take.
 */
export type StoneNesting =
  /** It holds none, and a lock it stands in does: a stone from outside is carried through it. */
  | { case: "passThrough"; pool: string }
  /** It holds stones, and no lock it stands in does: they never leave it. */
  | { case: "contained" }
  /** It holds stones, and so does a lock it stands in: one pool across them. */
  | { case: "shared"; pool: string }
```

Change `LockNesting` to:

```ts
export type LockNesting = {
  instance: string
  host: string
  regions: string[]
  in: string
  out: string
  /** Absent when neither it nor any lock it stands in holds stones. */
  stones?: StoneNesting
}
```

`LockNestingFault` gains, after `regionShared`:

```ts
  /** A lock without stones that stands in one with them lets a stone through, so it holds no one-way: every one-way
   * takes empty hands. `oneWays` names them. */
  | { type: "oneWayInPassThrough"; pool: string; oneWays: string[] }
```

After `seatNested`, add:

```ts
/** The stone case of every nested placement that has one. Cycles are refused before this is asked
 * (`seatNested`); the walk up stops at one anyway. */
export const stoneNestings = (placements: readonly PlacedLock[]): Map<string, StoneNesting> => {
  const byName = new Map(placements.map(placed => [instanceName(placed), placed]))
  const found = new Map<string, StoneNesting>()
  for (const placed of placements) {
    if (!placed.inside) continue
    const instance = instanceName(placed)
    const seen = new Set([instance])
    let pool: string | undefined
    for (let at = byName.get(placed.inside.instance); at && !seen.has(instanceName(at)); ) {
      seen.add(instanceName(at))
      if (at.lock.weights) pool = instanceName(at)
      at = at.inside ? byName.get(at.inside.instance) : undefined
    }
    const holds = placed.lock.weights !== undefined
    if (pool !== undefined) found.set(instance, holds ? { case: "shared", pool } : { case: "passThrough", pool })
    else if (holds) found.set(instance, { case: "contained" })
  }
  return found
}
```

In `expandFloorLocks`, right after `reasons.push(...nested.reasons)`:

```ts
  // A PASS-THROUGH LOCK LETS A STONE THROUGH (stones spec, "Nested locks"): every one-way takes empty hands, so a
  // one-way in it would turn the host's stone away, and the floor walk takes it apart from the stones it lets pass.
  const stoneCases = stoneNestings(placements)
  for (const placed of placements) {
    const stones = stoneCases.get(instanceName(placed))
    const oneWays = Object.keys(placed.lock.oneWays ?? {})
    if (stones?.case === "passThrough" && oneWays.length > 0)
      reasons.push({
        type: "lockNestingRefused",
        instance: instanceName(placed),
        fault: { type: "oneWayInPassThrough", pool: stones.pool, oneWays },
      })
  }
```

and in the `nesting` map:

```ts
  const nesting: LockNesting[] = nested.seats.map(({ instance, host }) => {
    const layout = fragments.get(instance)!.regionLayout
    const stones = stoneCases.get(instance)
    return {
      instance,
      host,
      regions: layout.regions.map(region => region.name),
      in: layout.in,
      out: layout.out,
      ...(stones ? { stones } : {}),
    }
  })
```

- [ ] **Step 4: Run it to see it pass, and the nesting specs stay green**

Run: `yarn vitest run src/game/nestedStones.spec.ts src/game/nestedLocks.spec.ts && yarn check-types && yarn lint`
Expected: PASS (the existing `nesting` `toEqual` in `nestedLocks.spec.ts` has no stones and gets no `stones` key), clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/floorLocks.ts src/game/nestedStones.spec.ts
git commit -m "feat(locks): a nested lock knows whether its stones pass through, stay or share" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 10: A shared nesting's stones are one pool

**Files:**
- Modify: `src/game/mechanics/weights.ts` (the arrangement search moves into `arrange`; `poolStones`)
- Modify: `src/game/floorLocks.ts` (`expandFloorLocks` pools each shared nesting's weights controls)
- Test: `src/game/mechanics/weights.spec.ts`, `src/game/nestedStones.spec.ts`

**Interfaces:**
- Consumes: `stoneNestings` and the `stoneCases` declared after `seatNested` in `expandFloorLocks` (task 9);
  `compileLock(lock, binding, { namespace })` from `../lockCompile`.
- Produces, in `@/game/mechanics/weights`: `export const poolStones = (id: string, controls: readonly WeightsControl[],
  any: ReadonlySet<string>): WeightsControl` — every plate of each control, one hand, each gate's terms read off the
  one arrangement; `any` names the gates whose mode is `"any"`. `stoneArrangements(lock)` keeps its signature and
  output.
- Produces: on a floor with a shared nesting, `config.controls` holds ONE weights control per pool, id `<pool>.stones`.

- [ ] **Step 1: Write the failing tests**

In `src/game/mechanics/weights.spec.ts`, add `poolStones` to the import from `./weights`, add
`import { compileLock } from "../lockCompile"`, `import { parseLock } from "../lockNotation"` (if not imported
already) and `import { isWeights } from "../obstacles"`, then append:

```ts
describe("poolStones", () => {
  const controlOf = (text: string, namespace: string) => {
    const result = compileLock(parseLock(text, namespace).lock, { weights: "stonePlate" }, { namespace })
    if (!result.ok) throw new Error(JSON.stringify(result.faults))
    return result.fragment.controls.filter(isWeights)[0]
  }
  const a = controlOf("in -[p]- out\np plate @in\nshelf plate @in stone\nin ?\nout ?", "a")
  const b = controlOf("in -[q]- out\nq plate @in\nrest plate @in stone\nin ?\nout ?", "b")
  const pooled = poolStones("a.stones", [a, b], new Set())

  it("is each lock's own control where the pool holds one lock", () => {
    expect(poolStones("a.stones", [a], new Set())).toEqual(a)
  })

  it("holds every plate of both locks, and both stones where they start", () => {
    expect(pooled.plates.map(plate => plate.id)).toEqual(["a.p", "a.shelf", "b.q", "b.rest"])
    expect(pooled.initial).toBe("a.shelf b.rest")
  })

  it("sets a stone lifted in one lock on a plate of the other", () => {
    expect(pooled.moves).toContainEqual({ from: "a.shelf b.rest", to: "b.rest + hand", plate: "a.shelf" })
    expect(pooled.moves).toContainEqual({ from: "b.rest + hand", to: "b.q b.rest", plate: "b.q" })
  })

  it("never lifts a second stone while one is in hand", () => {
    const fromCarrying = pooled.moves.filter(move => pooled.carrying.includes(move.from))
    expect(fromCarrying.length).toBeGreaterThan(0)
    for (const move of fromCarrying) expect(pooled.carrying).not.toContain(move.to)
  })

  it("opens a lock's gate on a stone on its plate, wherever the stone came from", () => {
    expect(pooled.opens["b.q b.rest"]).toEqual(["b.in-out"])
  })
})
```

In `src/game/nestedStones.spec.ts`, add `import { isWeights } from "./obstacles"` and append:

```ts
describe("a shared nesting's stones are one pool", () => {
  it("compiles one weights control for both locks, under the pool's id", () => {
    const weights = (expanded(SHARED).config.controls ?? []).filter(isWeights)
    expect(weights.map(control => control.id)).toEqual(["host.stones"])
    expect(weights[0].plates.map(plate => plate.id)).toEqual(["host.p", "host.shelf", "inner.s", "inner.t"])
  })

  it("leaves a pass-through's and a contained lock's stones in their own control", () => {
    expect((expanded(PASS_THROUGH).config.controls ?? []).filter(isWeights).map(c => c.id)).toEqual(["host.stones"])
    expect((expanded(CONTAINED).config.controls ?? []).filter(isWeights).map(c => c.id)).toEqual(["inner.stones"])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts src/game/nestedStones.spec.ts`
Expected: FAIL: `poolStones` is not exported; the shared floor has two weights controls (`host.stones`,
`inner.stones`). If a gate id prints differently from `b.in-out` (the notation names a gate `<from>-<to>`), use the
id `compileLock` gives and say so in the report.

- [ ] **Step 3: Implement**

In `src/game/mechanics/weights.ts`, add `import type { WeightTerm } from "../siteTypes"` if it is not imported (it is,
beside `MechanismRecord`), and replace `stoneArrangements` with the search taken out into `arrange`:

```ts
/** A gate's terms on the stones, and whether one term is enough. */
type StoneGate = { id: string; terms: WeightTerm[]; any: boolean }

/**
 * EVERY ARRANGEMENT OF THE STONES THE PLAYER CAN REACH, and every move between them: one stone in hand at
 * most, lifted from its plate and set down only on an empty one. The one place the stone rules live; the
 * tool's walk, the engine's record and a pool of several locks' stones are all built from it.
 */
const arrange = (plates: readonly { id: string; stone: boolean }[], gates: readonly StoneGate[]): Arrangements => {
  const ids = plates.map(plate => plate.id).sort()
  const start: Stones = { weighted: new Set(plates.filter(plate => plate.stone).map(plate => plate.id)), hand: false }
  const found = new Map<string, Stones>([[keyOf(start), start]])
  const moves: StoneMove[] = []
  for (const queue = [start]; queue.length > 0;) {
    const here = queue.shift()!
    for (const plate of ids) {
      if (here.weighted.has(plate) === here.hand) continue
      const weighted = new Set(here.weighted)
      if (here.hand) weighted.add(plate)
      else weighted.delete(plate)
      const next = { weighted, hand: !here.hand }
      const key = keyOf(next)
      if (!found.has(key)) {
        found.set(key, next)
        queue.push(next)
      }
      moves.push({ from: keyOf(here), to: key, plate })
    }
  }
  const opening = (stones: Stones) =>
    gates
      .filter(({ terms, any }) =>
        any ? terms.some(t => termHolds(t, stones)) : terms.every(t => termHolds(t, stones))
      )
      .map(({ id }) => id)
  return {
    states: [...found.keys()],
    initial: keyOf(start),
    moves,
    opens: Object.fromEntries([...found].map(([key, stones]) => [key, opening(stones)])),
    carrying: [...found].filter(([, stones]) => stones.hand).map(([key]) => key),
    underfoot: [...found].flatMap(([key, stones]) =>
      ids
        .filter(plate => !stones.weighted.has(plate))
        .map(plate => ({
          from: key,
          plate,
          opens: opening({ weighted: new Set([...stones.weighted, plate]), hand: stones.hand }),
        }))
    ),
    terms: Object.fromEntries(gates.map(({ id, terms }) => [id, terms])),
  }
}

/** The arrangements of one lock's stones. */
export const stoneArrangements = (lock: Lock): Arrangements => {
  const weights = lock.weights!
  const gates = Object.entries(lock.gates).flatMap(([id, gate]): StoneGate[] => {
    const terms = gate.owners
      .filter(owner => isWeightOwner(lock, owner))
      .map((owner): WeightTerm =>
        Object.hasOwn(weights.plates, owner)
          ? { kind: "plate", plate: owner, wants: weights.plates[owner].opens.empty.includes(id) ? "empty" : "stone" }
          : { kind: "unladen" }
      )
    return terms.length > 0 ? [{ id, terms, any: gate.mode === "any" }] : []
  })
  return arrange(
    Object.entries(weights.plates).map(([id, plate]) => ({ id, stone: plate.stone })),
    gates
  )
}

/**
 * THE STONES OF SEVERAL LOCKS AS ONE POOL (stones spec, "Nested locks": shared): every plate of each, one hand, and
 * each gate's terms read off the one arrangement. A stone lifted in one lock may be set down in the other. `any`
 * names the gates whose mode is "any", which a compiled control does not carry.
 */
export const poolStones = (
  id: string,
  controls: readonly WeightsControl[],
  any: ReadonlySet<string>
): WeightsControl => {
  const plates = controls.flatMap(control => control.plates).sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
  const gates = controls.flatMap(control =>
    Object.entries(control.terms).map(([gate, terms]) => ({ id: gate, terms, any: any.has(gate) }))
  )
  const encounter = controls.find(control => control.encounter !== undefined)?.encounter
  return {
    id,
    control: "weights",
    plates,
    ...arrange(plates, gates),
    ...(encounter === undefined ? {} : { encounter }),
  }
}
```

If `poolStones("a.stones", [a])` is not `toEqual(a)` only in key order of the returned object, that is no failure
(`toEqual` ignores key order); a difference in `states`, `moves` or `opens` order is one: `arrange` must walk plates in
sorted id order, as `stoneArrangements` did.

In `src/game/floorLocks.ts`, import `isWeights` from `./obstacles` and `poolStones` from `./mechanics/weights`. After
the `for (const { instance, host, region, near, far } of nested.seats) { … }` loop that re-points the joins, add:

```ts
  // A SHARED NESTING'S STONES ARE ONE POOL: the weights controls of the pool and of every lock sharing it become one,
  // under the pool's id, so play holds one stone at most across them and a stone moves from one lock's plates to the
  // other's.
  const members = new Map<string, string[]>()
  for (const [instance, stones] of stoneCases)
    if (stones.case === "shared") members.set(stones.pool, [...(members.get(stones.pool) ?? []), instance])
  const anyGates = new Set(
    [...fragments.values()].flatMap(fragment =>
      fragment.obstacles.flatMap(obstacle => (obstacle.kind === "gate" && obstacle.mode === "any" ? [obstacle.id] : []))
    )
  )
  for (const [pool, sharing] of members) {
    const locks = [pool, ...sharing]
    const pooled = poolStones(
      `${pool}.stones`,
      locks.flatMap(name => fragments.get(name)!.controls.filter(isWeights)),
      anyGates
    )
    for (const name of locks) {
      const fragment = fragments.get(name)!
      fragments.set(name, {
        ...fragment,
        controls: [...fragment.controls.filter(control => !isWeights(control)), ...(name === pool ? [pooled] : [])],
      })
    }
  }
```

It reads task 9's `stoneCases`; do not declare it a second time.

- [ ] **Step 4: Run them to see them pass, and every stone spec stays green**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts src/game/nestedStones.spec.ts src/game/weightsPlates.spec.ts src/game/stonePlay.spec.ts src/game/lockWalkSpec.spec.ts src/game/nestedLocks.spec.ts`
Expected: PASS. A changed arrangement key or move order in an existing weights test means `arrange` is not the same
search: fix `arrange`, never the test.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/mechanics/weights.ts src/game/mechanics/weights.spec.ts src/game/floorLocks.ts src/game/nestedStones.spec.ts
git commit -m "feat(stones): a shared nesting's stones are one pool" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 11: The walk's empty hands, and a contained lock's edge

The walk spec's `leaveWith` carries two rules: the floor's way out AND every one-way (`movesFrom` asks `mayLeave` for
both, S2). Task 12 builds a spec per nested level and must keep the one-way rule on a level whose way out is only a
port, so the field is renamed first for what it says: when the hands are empty. Then the contained lock's edge is
tagged `keepsStones`, a third reader of the same rule. No one-way is tagged: every one-way already takes empty hands.

**Files:**
- Create: `src/game/stoneBounds.ts`
- Modify: `src/game/lockWalk.ts` (`leaveWith` → `emptyHands`, `mayLeave` → exported `handsEmpty`;
  `LockGate.keepsStones`, `passages[].keepsStones`; `movesFrom` honours both)
- Modify: `src/game/floorLock.ts` (the rename; `regionsOf` tags passages, `floorLock` tags door gates)
- Modify (the rename only): `src/game/floorLockWalk.ts`, `src/game/lockWalkSpec.ts`, `src/game/lockWalk.spec.ts`,
  `src/game/lockWalkSpec.spec.ts`, `src/game/weightsPlates.spec.ts`, `src/game/stoneDrop.spec.ts`
- Test: `src/game/lockWalk.spec.ts`, `src/game/nestedStones.spec.ts`

**Interfaces:**
- Consumes: `LockNesting.stones` (task 9) on `grid.lockNesting`.
- Produces, in `@/game/lockWalk`: `LockSpec.emptyHands?: { mechanism: MechanismId; notIn: StateId[] }[]` (was
  `leaveWith`), `export const handsEmpty = (spec: LockSpec, config: LockConfig): boolean` (was the private
  `mayLeave`), `LockGate.keepsStones?: true`, `LockSpec.passages?: { a: RegionId; b: RegionId; keepsStones?: true }[]`.
  Task 12 reads all four.
- Produces, in `@/game/stoneBounds`:
  - `containedGrounds(grid: FloorGrid): ReadonlySet<string>[]` — per contained lock, every region label it and the
    locks inside it hold
  - `crossesContainedEdge(grid: FloorGrid, a: GridCell | undefined, b: GridCell | undefined): boolean`
  - `stopShort(grid: FloorGrid, path: ReadonlyArray<readonly [number, number]>): readonly [number, number] | undefined`
    (task 13 reads it)

- [ ] **Step 1: Rename the hands rule**

Run: `grep -rln "leaveWith\|mayLeave" src scripts`
Expected (at `2afa135a`): `src/game/floorLockWalk.ts`, `src/game/lockWalkSpec.spec.ts`, `src/game/weightsPlates.spec.ts`,
`src/game/lockWalk.spec.ts`, `src/game/stoneDrop.spec.ts`, `src/game/lockWalkSpec.ts`, `src/game/floorLock.ts`,
`src/game/lockWalk.ts`. If the list differs, rename in what it prints.

Run: `sed -i '' -e 's/leaveWith/emptyHands/g' -e 's/mayLeave/handsEmpty/g' <each file the grep printed>`

Then in `src/game/lockWalk.ts`:
- `LockSpec`'s field comment becomes:
  ```ts
    /** The hands are empty only in a config outside every `notIn`. Every one-way, every `keepsStones` way and the
     * way out take empty hands, so a stone never rides a drop, never leaves a lock that keeps it, and never leaves
     * its floor. A level that is no floor still has its one-ways: it keeps this whenever it holds stones. */
    emptyHands?: { mechanism: MechanismId; notIn: StateId[] }[]
  ```
- `const handsEmpty` becomes `export const handsEmpty`, its comment "Whether the hands are empty in this config: no
  mechanism `emptyHands` names is in a state it refuses.";
- `checkLockSpec`'s two messages become `` `empty hands wait on no mechanism: ${mechanism}` `` and
  `` `empty hands refuse a state ${mechanism} does not have: ${state}` ``, and the two expectations in
  `src/game/lockWalk.spec.ts` that quote them (`"the way out waits on no mechanism: ghost"`, `"the way out refuses a
  state hand does not have: ghost"`) follow.

Run: `yarn vitest run src/game/lockWalk.spec.ts src/game/lockWalkSpec.spec.ts src/game/weightsPlates.spec.ts src/game/stoneDrop.spec.ts src/game/stonePlay.spec.ts src/game/nestedLocks.spec.ts && yarn check-types`
Expected: PASS, clean: a rename moves no walk.

- [ ] **Step 2: Write the failing tests**

In `src/game/lockWalk.spec.ts` append (import `reachableStates` and `type LockSpec` from `./lockWalk` if missing):

```ts
describe("a way that keeps stones", () => {
  // One stone, lifted in `a`; `a` and `b` touch, either along a passage or through an open door.
  const spec = (tag: "passage" | "gate"): LockSpec => ({
    regions: ["a", "b"],
    gates: tag === "gate" ? { g: { from: "a", to: "b", owners: ["open"], keepsStones: true } } : {},
    mechanisms: {
      stones: {
        states: ["down", "held"],
        initial: "down",
        opens: {},
        transitions: [
          { from: "down", to: "held", at: "a" },
          { from: "held", to: "down", at: "a" },
        ],
      },
      open: { states: ["on"], initial: "on", opens: { on: tag === "gate" ? ["g"] : [] }, transitions: [] },
    },
    passages: tag === "passage" ? [{ a: "a", b: "b", keepsStones: true }] : [],
    emptyHands: [{ mechanism: "stones", notIn: ["held"] }],
    in: "a",
    out: "b",
  })

  it.each(["passage", "gate"] as const)("is crossed by a %s with empty hands only", tag => {
    const found = reachableStates(spec(tag))
    if (found === "tooLarge") throw new Error("too large")
    const at = found.order.map(state => `${state.region}:${state.config.stones}`)
    expect(at).toContain("b:down")
    expect(at).not.toContain("b:held")
  })
})
```

Append to `src/game/nestedStones.spec.ts` (import `floorLock`, `regionsOf` from `./floorLock` and
`containedGrounds` from `./stoneBounds`):

```ts
/** The authored label of every compiled region, read off its cells. */
const labelsOf = (grid: FloorGrid): Map<string, string | undefined> => {
  const { of } = regionsOf(grid)
  const labels = new Map<string, string | undefined>()
  for (const [pos, region] of of) {
    const [r, c] = pos.split(",").map(Number)
    const cell = grid.cells[r][c]
    labels.set(region, cell.type === "room" || cell.type === "corridor" ? cell.region : undefined)
  }
  return labels
}

describe("a contained lock's edge, as the walk reads it", () => {
  it("marks every compiled way across the inner's edge as keeping stones, and nothing else", { timeout: 60_000 }, () => {
    const grids = carved(CONTAINED)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      const [ground] = containedGrounds(grid)
      const labels = labelsOf(grid)
      const onGround = (region: string) => ground.has(labels.get(region) ?? "")
      const lock = floorLock(grid)!
      const ways = [
        ...(lock.passages ?? []).map(({ a, b, keepsStones }) => ({ a, b, keepsStones })),
        ...Object.values(lock.gates).map(({ from, to, keepsStones }) => ({ a: from, b: to, keepsStones })),
      ]
      expect(ways.some(way => way.keepsStones)).toBe(true)
      for (const way of ways) expect(way.keepsStones === true).toBe(onGround(way.a) !== onGround(way.b))
    }
  })

  it("marks nothing where no lock is contained", { timeout: 60_000 }, () => {
    for (const grid of [...carved(PASS_THROUGH), ...carved(SHARED)]) {
      const lock = floorLock(grid)!
      expect([...(lock.passages ?? []), ...Object.values(lock.gates)].some(way => way.keepsStones)).toBe(false)
    }
  })
})
```

- [ ] **Step 3: Run them to see them fail**

Run: `yarn vitest run src/game/lockWalk.spec.ts src/game/nestedStones.spec.ts`
Expected: FAIL: `b:held` is reached (the tag is ignored, and a type error on `keepsStones`); `./stoneBounds` does not
exist. If `CONTAINED` carves at none of the twelve seeds, print the first refusal and stop: the carve, not this task,
refuses it.

- [ ] **Step 4: Implement**

Create `src/game/stoneBounds.ts`:

```ts
import type { FloorGrid, GridCell } from "./siteTypes"

// A CONTAINED LOCK KEEPS ITS STONES (stones spec, "Nested locks"): a stone lock nested where no lock around it holds
// stones never lets one out, so a step across the edge of its ground is one a carrying walk does not take, as the way
// out is. Its ground is its own regions and those of every lock nested in it. The line is read off the cells'
// authored region labels, which is also where the walk's compiled regions split (`regionsOf`, floorLock.ts), so play
// and the walk stop at the same step. A drop across the line needs nothing from here: every one-way takes empty hands.

const known = new WeakMap<FloorGrid, ReadonlySet<string>[]>()

/** The ground of each contained lock on the floor: every region label it and the locks nested in it hold. */
export const containedGrounds = (grid: FloorGrid): ReadonlySet<string>[] => {
  const cached = known.get(grid)
  if (cached) return cached
  const nesting = grid.lockNesting ?? []
  const hostOf = new Map(nesting.map(n => [n.instance, n.host]))
  const within = (instance: string, ancestor: string): boolean => {
    for (let at: string | undefined = instance; at !== undefined; at = hostOf.get(at)) if (at === ancestor) return true
    return false
  }
  const grounds = nesting
    .filter(n => n.stones?.case === "contained")
    .map(contained => new Set(nesting.filter(n => within(n.instance, contained.instance)).flatMap(n => n.regions)))
  known.set(grid, grounds)
  return grounds
}

const labelOf = (cell: GridCell | undefined): string =>
  (cell?.type === "room" || cell?.type === "corridor" ? cell.region : undefined) ?? ""

/** Whether a step between two cells crosses the edge of a contained lock's ground: one stands on it, the other not. */
export const crossesContainedEdge = (grid: FloorGrid, a: GridCell | undefined, b: GridCell | undefined): boolean =>
  containedGrounds(grid).some(ground => ground.has(labelOf(a)) !== ground.has(labelOf(b)))

/** Where a carrying walk along `path` stops: the last cell before its first step across a contained lock's edge, or
 * undefined where it crosses none. */
export const stopShort = (
  grid: FloorGrid,
  path: ReadonlyArray<readonly [number, number]>
): readonly [number, number] | undefined => {
  for (let i = 0; i + 1 < path.length; i++) {
    const [[ar, ac], [br, bc]] = [path[i], path[i + 1]]
    if (crossesContainedEdge(grid, grid.cells[ar]?.[ac], grid.cells[br]?.[bc])) return path[i]
  }
  return undefined
}
```

In `src/game/lockWalk.ts`:
- `LockGate` gains, after `mode`:
  ```ts
    /** Crossed only with empty hands (`emptyHands`): the edge of a lock that keeps its stones (stoneBounds.ts). */
    keepsStones?: true
  ```
- `LockSpec.passages` becomes `passages?: { a: RegionId; b: RegionId; keepsStones?: true }[]`, its doc comment adding
  "`keepsStones`: only with empty hands, as a gate's".
- In `movesFrom`, read the hands once and honour the tag on gates and passages; the one-way line keeps its rule
  unchanged (every one-way takes empty hands, tagged or not):
  ```ts
    const empty = handsEmpty(spec, config)
    for (const gateId of openGates(spec, config)) {
      const gate = spec.gates[gateId]
      if (gate.keepsStones && !empty) continue
      if (gate.from === region) moves.push({ region: gate.to, config })
      if (gate.to === region) moves.push({ region: gate.from, config })
    }
    for (const oneWay of spec.oneWays ?? []) if (oneWay.from === region && empty) moves.push({ region: oneWay.to, config })
    for (const { a, b, keepsStones } of spec.passages ?? []) {
      if (keepsStones && !empty) continue
      if (a === region) moves.push({ region: b, config })
      if (b === region) moves.push({ region: a, config })
    }
  ```
  and the way-out line's `handsEmpty(spec, config)` becomes `empty`.

In `src/game/floorLock.ts`, import `crossesContainedEdge` from `./stoneBounds`, then:
- `regionsOf`'s return type: `passages: { a: RegionId; b: RegionId; keepsStones?: true }[]` (and the local
  `const passages` with it), and the push:
  ```ts
          passages.push({ a, b, ...(crossesContainedEdge(grid, cell, next) ? { keepsStones: true as const } : {}) })
  ```
  (a compiled region holds one label, so the first pair of cells seen for `a|b` answers for all of them).
- In the door loop of `floorLock` (`gates[gateId] = { from: beside, to: doorRegion, owners: [] }`):
  ```ts
          const besideCell = grid.cells[r + dr]?.[c + dc]
          gates[gateId] = {
            from: beside,
            to: doorRegion,
            owners: [],
            ...(crossesContainedEdge(grid, cell, besideCell) ? { keepsStones: true as const } : {}),
          }
  ```
- `oneWaysOf` is unchanged.

A floor whose `lockNesting` names no contained lock gets an empty `containedGrounds`, so `crossesContainedEdge` is
always false there and its `LockSpec` is byte-for-byte what it was.

- [ ] **Step 5: Run them to see them pass**

Run: `yarn vitest run src/game/lockWalk.spec.ts src/game/nestedStones.spec.ts src/game/nestedLocks.spec.ts src/game/stonePlay.spec.ts src/game/stoneDrop.spec.ts`
Expected: PASS. (Run `ls src/game/floorLock*.spec.ts` and add what is there.)

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/game/stoneBounds.ts src/game/lockWalk.ts src/game/lockWalk.spec.ts src/game/floorLock.ts src/game/floorLockWalk.ts src/game/lockWalkSpec.ts src/game/lockWalkSpec.spec.ts src/game/weightsPlates.spec.ts src/game/stoneDrop.spec.ts src/game/nestedStones.spec.ts
git commit -m "feat(stones): the walk keeps a contained lock's stones at its edge" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

(If step 1's grep printed other files, stage those by path too.)

---

### Task 12: The composed walk holds one stone pool; `STONES_NESTED` goes

**Files:**
- Modify: `src/game/floorLockWalk.ts` (`cutOf` fuses a shared nesting into its pool's level; `levelOf` keeps each
  level's `emptyHands` and the `keepsStones` tag on opened gates; `nestedFree` reaches a terminal empty-handed where
  the way out of it keeps stones or is a one-way; `pooled` failure; `holdsStones`/`STONES_NESTED` deleted; a
  `maxStates` option)
- Modify: `src/game/lockWalk.ts` (`reachableStates` and `walkLock` take an optional `maxStates`)
- Modify: `src/game/nestedLocks.spec.ts` (the "stones on a floor with nested locks" describe goes: this task's
  pass-through walk and task 9's pass-through refusals replace it)
- Test: `src/game/nestedStones.spec.ts`

**Interfaces:**
- Consumes: `LockNesting.stones` (task 9), the pooled control (task 10), `handsEmpty`, `emptyHands` and the
  `keepsStones` tags (task 11).
- Produces: `FloorWalkFailure` member `{ type: "pooled"; instances: string[]; failure: FloorWalkFailure }`;
  `walkFloorLock(grid: FloorGrid, options?: { maxStates?: number }): FloorWalkResult | undefined`;
  `reachableStates(spec, maxStates = MAX_LOCK_STATES)`, `walkLock(spec, maxStates = MAX_LOCK_STATES)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/nestedStones.spec.ts` (import `deadFloorRegions`, `describeFloorWalkFailure`, `walkFloorLock` from
`./floorLockWalk`, `deadRegions`, `reachableStates`, `walkLock` from `./lockWalk`; `floorLock` is imported already):

```ts
const productStates = (grid: FloorGrid): number => {
  const found = reachableStates(floorLock(grid)!)
  if (found === "tooLarge") throw new Error("product too large")
  return found.order.length
}

const expectSound = (grid: FloorGrid) => {
  const walk = walkFloorLock(grid)!
  if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))
  return walk
}

describe("a nested floor with stones is walked with them as one pool", () => {
  it.each([
    ["a pass-through", PASS_THROUGH],
    ["a contained lock", CONTAINED],
    ["a shared pool", SHARED],
  ])("walks %s sound on every carve, as the product walk does", { timeout: 60_000 }, (_, locks) => {
    const grids = carved(locks)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expectSound(grid)
      expect(walkLock(floorLock(grid)!).sound).toBe(true)
      expect(deadFloorRegions(grid)).toEqual(deadRegions(floorLock(grid)!))
    }
  })

  it.each([
    ["a pass-through", PASS_THROUGH],
    ["a contained lock", CONTAINED],
  ])("walks %s in fewer states than the product: the host walks the inner as ground", { timeout: 60_000 }, (_, locks) => {
    for (const grid of carved(locks)) expect(expectSound(grid).states).toBeLessThan(productStates(grid))
  })

  it("walks a shared pool in its pool's level, which is the product", { timeout: 60_000 }, () => {
    for (const grid of carved(SHARED)) expect(expectSound(grid).states).toBe(productStates(grid))
  })

  it("keeps the floor's way out for empty hands on a nested floor", { timeout: 60_000 }, () => {
    // The door on waits for the shelf to be EMPTY: the only way past carries the stone, and the way out refuses it.
    const carriedOut: PlacedLock[] = [
      { lock: stones("in -[shelf:empty]- yard\nyard -- out\nshelf plate @in stone\nin ?\nyard &\nout ?", "host") },
      { lock: leverLock(), as: "inner", inside: { instance: "host", region: "yard" } },
    ]
    const grids = carved(carriedOut)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(walkLock(floorLock(grid)!).sound).toBe(false)
      expect(walkFloorLock(grid)!.sound).toBe(false)
    }
  })

  // EMPTY HANDS ARE ONE RULE FOR THE WAY OUT AND EVERY ONE-WAY: a nested level's way out is only its port, so it must
  // keep `emptyHands` for its drops. The only way to this lock's plate is a drop, so only a stone riding it could
  // open the door: sound if a level dropped the rule, stranded while it holds.
  const RIDE = "in -- top\ntop >> low\nlow -[p]- out\np plate @low\nshelf plate @top stone\nin ?\ntop ?\nlow ?\nout ?"
  it.each<[string, PlacedLock[]]>([
    ["a contained lock", [{ lock: leverLock() }, { lock: stones(RIDE, "ride"), as: "inner", inside: { instance: "lever", region: "hall" } }]],
    ["a shared pool", [{ lock: stones(HOST_STONES, "host") }, { lock: stones(RIDE, "ride"), as: "inner", inside: { instance: "host", region: "yard" } }]],
  ])("never lets a stone ride a drop inside %s", { timeout: 60_000 }, (_, locks) => {
    const grids = carved(locks)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(walkLock(floorLock(grid)!).sound).toBe(false)
      expect(walkFloorLock(grid)!.sound).toBe(false)
    }
  })

  it("names both locks of a pool when the pooled floor strands", { timeout: 60_000 }, () => {
    const stranding: PlacedLock[] = [
      { lock: stones(STRANDING_HOST, "host") },
      { lock: stones(GATED, "gated"), as: "inner", inside: { instance: "host", region: "yard" } },
    ]
    const grids = carved(stranding)
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      const walk = walkFloorLock(grid)!
      expect(walk).toMatchObject({ sound: false, failure: { type: "pooled", instances: ["host", "inner"] } })
      if (!walk.sound) expect(describeFloorWalkFailure(walk.failure)).toMatch(/^the stones host, inner share: /)
    }
  })

  it("refuses a pooled level too large to walk by name, not by hanging", { timeout: 60_000 }, () => {
    const [grid] = carved(SHARED)
    expect(walkFloorLock(grid, { maxStates: 10 })).toEqual({
      sound: false,
      failure: { type: "pooled", instances: ["host", "inner"], failure: { type: "tooLarge" } },
    })
  })
})
```

In `src/game/nestedLocks.spec.ts`, delete the whole `describe("stones on a floor with nested locks", …)` block (it
pins the refusal this task lifts; the pass-through tests above are its replacement) and any import only it used.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/nestedStones.spec.ts`
Expected: FAIL: every nested stone floor gets `{ type: "entangled", problem: "stones on a floor with nested locks" }`;
`maxStates` is not an option. "never lets a stone ride a drop" passes already (the blanket refusal is unsound too);
it is the guard that keeps passing once the refusal goes. If the `RIDE` floors carve at none of the seeds, print the
first refusal and stop.

- [ ] **Step 3: Implement**

In `src/game/lockWalk.ts`: `reachableStates = (spec: LockSpec, maxStates = MAX_LOCK_STATES)` with
`if (ceiling > maxStates) return "tooLarge"`; `walkLock = (spec: LockSpec, maxStates = MAX_LOCK_STATES)` passing it on.

In `src/game/floorLockWalk.ts`:

1. Import `handsEmpty` beside `reachableStates` from `./lockWalk`. Add to `FloorWalkFailure`:
   ```ts
     /** The level of a stone pool several nested locks share fails; `instances` are the pool, then the locks sharing it. */
     | { type: "pooled"; instances: string[]; failure: FloorWalkFailure }
   ```
   and to `describeFloorWalkFailure`:
   ```ts
       case "pooled":
         return `the stones ${failure.instances.join(", ")} share: ${describeFloorWalkFailure(failure.failure)}`
   ```
2. The header comment gains a paragraph:
   ```ts
   // STONES FOLLOW THE CUT where they cannot cross it. A pass-through lock reads no hand (it holds no one-way and no
   // narrow passage: floorLocks.ts refuses both), and a contained lock's edge keeps its stones (stoneBounds.ts), so
   // both are still walked apart from their host. A shared nesting moves stones between its locks, so it is walked
   // fused with its pool's level: that level is the product of both. Every level that holds stones keeps
   // `emptyHands`, so its drops take empty hands whatever its way out is.
   ```
3. `Cut` gains `fusedInto: Map<string, Owner>` (an instance walked in another's level) and `pools: Map<Owner,
   string[]>` (a level's node → `[pool, ...instances fused into it]`), and `cutOf`
   starts:
   ```ts
     const nesting = grid.lockNesting ?? []
     const nested = new Set(nesting.map(n => n.instance))
     const hostIn = new Map(nesting.map(n => [n.instance, n.host]))
     // A SHARED NESTING IS WALKED IN ITS POOL'S LEVEL, with every lock between it and the pool: its stones move to and
     // from the pool's plates, so the cut cannot take it apart. A pool no lock hosts is the floor's own level.
     const fusedInto = new Map<string, Owner>()
     const pools = new Map<Owner, string[]>()
     for (const n of nesting) {
       if (n.stones?.case !== "shared") continue
       const { pool } = n.stones
       const into: Owner = nested.has(pool) ? pool : FLOOR
       for (let at: string | undefined = n.instance; at !== undefined && at !== pool; at = hostIn.get(at)) {
         if (fusedInto.has(at)) continue
         fusedInto.set(at, into)
         pools.set(into, [...(pools.get(into) ?? [pool]), at])
       }
     }
     const walkedAs = (instance: string): Owner => (fusedInto.has(instance) ? fusedInto.get(instance)! : instance)
     const { of } = regionsOf(grid)
     const instanceOfLabel = new Map(
       nesting.flatMap(n => n.regions.map(region => [region, walkedAs(n.instance)] as const))
     )
     const hostOf = new Map<string, Owner>(
       nesting.map(n => [n.instance, nested.has(n.host) ? walkedAs(n.host) : FLOOR])
     )
   ```
   (`instanceOfLabel.get(label) ?? FLOOR` below still reads a FLOOR-fused label as the floor's: `null ?? null`.) Return
   `fusedInto` and `pools` in the `Cut`.
4. `levelOf`: an opened gate keeps its tag, and every level keeps the `emptyHands` of the stones it holds. A nested
   level's way out is its port (`in` and `out` are both the port), so the way-out rule is a no-op there; its one-ways
   still read `emptyHands`, which is why it is never dropped:
   ```ts
     const opened: { a: RegionId; b: RegionId; keepsStones?: true }[] = []
     …
       else opened.push({ a: gate.from, b: gate.to, ...(gate.keepsStones ? { keepsStones: true as const } : {}) })
     …
     // Every one-way and every kept edge reads these, not only the way out.
     const emptyHands = (lock.emptyHands ?? []).filter(({ mechanism }) => Object.hasOwn(mechanisms, mechanism))
     return {
       …,
       ...(emptyHands.length > 0 ? { emptyHands } : {}),
       in: port ?? lock.in,
       out: port ?? lock.out,
     }
   ```
5. `nestedFree(cut, instance, spec, maxStates)`: a terminal left only across a kept edge or down a one-way is reached
   with empty hands:
   ```ts
     const terminals = new Set<RegionId>([spec.in])
     const freeExit = new Set<RegionId>()
     const emptyExit = new Set<RegionId>()
     const edge = (a: RegionId, b: RegionId, empty: boolean) => {
       if (inside.has(a) === inside.has(b)) return
       const terminal = inside.has(a) ? a : b
       terminals.add(terminal)
       ;(empty ? emptyExit : freeExit).add(terminal)
     }
     for (const [id, gate] of Object.entries(cut.lock.gates)) {
       if (cut.within(cut.gateOwner.get(id)!, instance)) {
         for (const end of [gate.from, gate.to]) if (!inside.has(end)) {
           terminals.add(end)
           freeExit.add(end)
         }
       } else edge(gate.from, gate.to, gate.keepsStones === true)
     }
     for (const { a, b, keepsStones } of cut.lock.passages ?? []) edge(a, b, keepsStones === true)
     // Every one-way takes empty hands, so a drop out of the lock is left empty-handed; one into it lands where the
     // host arrives, and arriving asks nothing of the hands.
     for (const { from, to } of cut.lock.oneWays ?? []) edge(from, to, inside.has(from))
     // The port is where the host arrives; a contained lock's port is left across its kept edge like any terminal.
     if (!emptyExit.has(spec.in)) freeExit.add(spec.in)
     const needsEmpty = (terminal: RegionId) => emptyExit.has(terminal) && !freeExit.has(terminal)
   ```
   Then `reachableStates(spec, maxStates)`, and in the backwards seed:
   ```ts
       order.forEach((state, n) => {
         if (state.region !== terminal || (needsEmpty(terminal) && !handsEmpty(spec, state.config))) return
         seen.add(n)
         queue.push(n)
       })
   ```
   The `edge(gate.from, gate.to)`-style calls in the current body are replaced by the ones above; the `ground` check
   below stays as it is.
6. `levelsOf(grid, lock, maxStates)`: skip fused instances, wrap a pooled level's failure, and hand the wrapper back
   so `walkFloorLock` wraps the floor level's failure too (its return type gains `pooled` on the `ok: true` side;
   `compose` passes `maxStates` through):
   ```ts
     const pooled = (node: Owner, failure: FloorWalkFailure): FloorWalkFailure => {
       const instances = cut.pools.get(node)
       return instances ? { type: "pooled", instances, failure } : failure
     }
     for (const { instance } of grid.lockNesting ?? []) {
       if (cut.fusedInto.has(instance)) continue
       const spec = levelOf(cut, instance, grid.lockNesting)
       const free = nestedFree(cut, instance, spec, maxStates)
       if ("failure" in free)
         return { ok: false, failure: { type: "nested", instance, failure: pooled(instance, free.failure) } }
       counts[instance] = free.states
       levels.push({ instance, spec })
     }
     levels.push({ instance: undefined, spec: levelOf(cut, FLOOR, grid.lockNesting) })
     return { ok: true, levels, counts, pooled }
   ```
7. Delete `holdsStones` and `STONES_NESTED` and their comment. `walkFloorLock`:
   ```ts
   export const walkFloorLock = (
     grid: FloorGrid,
     { maxStates = MAX_LOCK_STATES }: { maxStates?: number } = {}
   ): FloorWalkResult | undefined => {
     const lock = floorLock(grid)
     if (!lock) return undefined
     if (!grid.lockNesting || grid.lockNesting.length === 0) return walkLock(lock, maxStates)
     const composed = compose(grid, lock, maxStates)
     if (!composed.ok) return { sound: false, failure: composed.failure }
     const walk = walkLock(composed.levels[composed.levels.length - 1].spec, maxStates)
     return walk.sound
       ? { sound: true, states: walk.states, nested: composed.counts }
       : { sound: false, failure: composed.pooled(FLOOR, walk.failure) }
   }
   ```
   (import `MAX_LOCK_STATES` from `./lockWalk`). `deadFloorRegions` loses its `holdsStones` line.

A `nested` count for a fused instance is absent from `FloorWalkResult.nested`; the existing nesting tests have no
shared nesting, so their `toEqual`s are unchanged.

- [ ] **Step 4: Run them to see them pass, and the nesting tests stay green**

Run: `yarn vitest run src/game/nestedStones.spec.ts src/game/nestedLocks.spec.ts src/game/lockWalk.spec.ts src/game/gateLoops.spec.ts`
Expected: PASS. If a pass-through or contained floor's walk and the product walk disagree, the cut is not exact for
it: stop, report the floor's seed and both failures, and do not fuse the case to make them agree.
(`gateLoops.spec.ts` exists only if tasks 1-3 have run; leave it out otherwise.)

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/game/floorLockWalk.ts src/game/lockWalk.ts src/game/nestedLocks.spec.ts src/game/nestedStones.spec.ts
git commit -m "feat(stones): a nested floor is walked with its stones as one pool" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 13: Play stops a carrying walk at a contained lock's edge

A drop across the edge needs nothing here: play turns a carrying walk away at every launch already
(`if (carrying) return turnAway(row, col)` in the launch branch of `onCellClick`, S2). Only walking and the passage tap
can cross the edge on foot.

**Files:**
- Modify: `src/app/SiteMap/useSiteNavigation.ts` (a carrying walk stops short of a contained edge)
- Create: `src/app/SiteMap/containedStones.spec.tsx`

**Interfaces:**
- Consumes: `stopShort` (task 11); `isCarrying` (`@/game/stonePlay`); `findPath` (`@/game/gridNavigation`);
  `carvePlayground`, `sequenceHarness` (test support).

- [ ] **Step 1: Write the failing tests**

Create `src/app/SiteMap/containedStones.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { parseLock } from "@/game/lockNotation"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { leverLock } from "@/game/testSupport/floorLockFixtures"
import { BINDING } from "@/game/testSupport/lockFixtures"
import { carvePlayground } from "./playgroundCarve.testing"
import { sequenceHarness } from "./sequenceHarness.testing"
import "@/mods/registerModApps"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// A MADE-UP STONE LOCK nested in the hall of a lever lock, whose stones nothing around it shares.
const config: FloorConfig = {
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: { ...BINDING, weights: "stonePlate" },
  locks: [
    { lock: leverLock() },
    {
      lock: parseLock("in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?", "cell").lock,
      as: "inner",
      inside: { instance: "lever", region: "hall" },
    },
  ],
}

const cellWhere = (grid: FloorGrid, test: (region: string | undefined, plate: string | undefined) => boolean) => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if ((cell.type === "room" || cell.type === "corridor") && test(cell.region, cell.type === "room" ? cell.plate?.id : undefined))
        return [r, c] as const
    }
  throw new Error("no such cell")
}

const play = () => {
  const carved = carvePlayground(config)
  if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
  return { ...sequenceHarness(carved.seed, config), grid: carved.grid }
}

describe("a contained lock keeps its stones", () => {
  it("stops a carrying walk on its own side of the edge, with the one blocked line", () => {
    const h = play()
    h.walkTo(cellWhere(h.grid, (_, plate) => plate === "inner.shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.walkTo(cellWhere(h.grid, region => region === "lever.foyer"))
    const notice = h.current().notice
    expect(notice).not.toBeNull()
    const [r, c] = notice!.at
    const stopped = h.grid.cells[r][c]
    expect(stopped.type === "room" || stopped.type === "corridor" ? stopped.region : undefined).toMatch(/^inner\./)
  })

  it("lets empty hands walk out", () => {
    const h = play()
    h.walkTo(cellWhere(h.grid, (_, plate) => plate === "inner.shelf"))
    h.walkTo(cellWhere(h.grid, region => region === "lever.foyer"))
    expect(h.current().notice).toBeNull()
  })
})
```

(Read `sequenceHarness.testing.tsx` before running: if `walkTo` or `current().notice` are shaped differently from
`carryingDrop.spec.tsx`'s use of them, follow that file; it is the pattern.)

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/app/SiteMap/containedStones.spec.tsx`
Expected: FAIL: the carrying walk reaches the foyer with no notice.

- [ ] **Step 3: Implement**

In `src/app/SiteMap/useSiteNavigation.ts`, import `stopShort` from `@/game/stoneBounds`. Right
after `walkTo` is defined in `onCellClick`, add:

```ts
      // A CONTAINED LOCK KEEPS ITS STONES (stoneBounds.ts): a carrying walk that would cross its edge stops on the near
      // side and says why, the one blocked line the way out uses. Asked of every walk, so no target is a way round it.
      const stoppedShort = (r: number, c: number): boolean => {
        if (!isCarrying(grid, currentFloor, journeys.getMechanismStates(journeyId))) return false
        const stop = stopShort(grid, findPath(grid, explorerPos, [r, c]))
        if (!stop) return false
        const [sr, sc] = stop
        const side = walkTo(sr, sc)
        journeys.markCellExplored(getCell(grid, sr, sc)?.sectionHash ?? "", side.edgeId, side.address)
        side.goHere()
        turnAway(sr, sc)
        return true
      }
```

Then:
- in the passage branch, after `const [nr, nc] = crossing.near`, add `if (stoppedShort(nr, nc)) return`;
- directly after the passage branch, before `const sectionHash = …`, add `if (stoppedShort(row, col)) return`;
- the launch branch is unchanged: it turns every carrying walk away at the launch.

If the played grid does not carry `lockNesting` (the test's walk is then never stopped), find where play builds its
grid from the assembled one (`assemblePlayedFloor`, `useAssembledFloor.ts`) and keep the field: it is the floor's own
data, never the save's.

- [ ] **Step 4: Run them to see them pass**

Run: `yarn vitest run src/app/SiteMap/containedStones.spec.tsx src/app/SiteMap`
Expected: PASS, every existing SiteMap spec unchanged (no floor there has a contained lock, so `stopShort` finds
nothing).

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/SiteMap/useSiteNavigation.ts src/app/SiteMap/containedStones.spec.tsx
git commit -m "feat(map): a stone stays in the lock that contains it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 14: Nested stones in the Lock playground

The playground nests the second lock in the picked lock's nest spot: the spot says where, so the story names only
which lock goes in it. A picked lock with no spot shows the floor's refusal (`notNestSpot`, `spot: null`), as any
refusal shows.

**Files:**
- Modify: `src/app/SiteMap/playgroundCarve.testing.ts` (`playgroundFloor` takes an optional nested lock)
- Modify: `src/app/SiteMap/lockPlayground.testing.tsx` (`LockPlayground` takes `nest`)
- Modify: `src/app/SiteMap/LockPlayground.stories.tsx` (three stories, one per case)
- Test: `src/app/SiteMap/lockPlayground.spec.tsx`

**Interfaces:**
- Consumes: `nestSpotOf` (task 7); `freeRegions` keeps the spot (task 7).
- Produces: `playgroundFloor(lock: Lock, binding: RealisationBinding, nest?: Lock): FloorConfig` (the nested lock
  stands in `lock`'s spot, as instance `inner`); `LockPlayground` prop `nest?: string` (a key of `locks`; the picked
  lock is the host).

- [ ] **Step 1: Write the failing test**

In `src/app/SiteMap/lockPlayground.spec.tsx`, append (import `playgroundFloor`, `defaultBinding` from
`./playgroundCarve.testing` and `parseLock` from `@/game/lockNotation` if missing):

```ts
describe("a lock nested in the playground's lock", () => {
  it("stands in the picked lock's nest spot, every other region free", () => {
    const host = parseLock("in -- hall\nhall -[L]- out\nL toggle @in\nin *\nhall &\nout ?", "host").lock
    const inner = parseLock("in -- out\nshelf plate @in stone\nin *\nout ?", "cell").lock
    const config = playgroundFloor(host, defaultBinding(), inner)
    expect(config.locks?.map(placed => [placed.as, placed.inside])).toEqual([
      [undefined, undefined],
      ["inner", { instance: "host", region: "hall" }],
    ])
    expect(Object.values(config.locks![1].lock.regions).every(region => region.takes === "free")).toBe(true)
    expect(config.locks![0].lock.regions.hall).toEqual({ takes: "nest" })
  })
})
```

Run: `yarn vitest run src/app/SiteMap/lockPlayground.spec.tsx`
Expected: FAIL, one placement.

- [ ] **Step 2: Implement**

`src/app/SiteMap/playgroundCarve.testing.ts` (import `nestSpotOf` beside `freeRegions` from `@/game/lockAuthoring`):

```ts
/** The lock alone on an expert floor with no puzzles, every region free but its nest spot, as the dev floors bench a
 * lock; `nest` stands a second lock in that spot. A lock with no spot is placed with `nest` anyway, so the floor
 * refuses it by name (`notNestSpot`). */
export const playgroundFloor = (lock: Lock, binding: RealisationBinding, nest?: Lock): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [
    { lock: freeRegions(lock) },
    ...(nest
      ? [{ lock: freeRegions(nest), as: "inner", inside: { instance: lock.name, region: nestSpotOf(lock) ?? lock.in } }]
      : []),
  ],
  realisations: binding,
})
```

(`lock.in` stands in for a missing spot only so the placement is written; the floor refuses it `notNestSpot` with
`spot: null`.)

`src/app/SiteMap/lockPlayground.testing.tsx`, `LockPlayground`: the props type gains `nest?: string`; beside
`parsed`:

```ts
  const inner = useMemo(() => {
    if (!nest) return undefined
    try {
      return { ok: true as const, ...parseLock(locks[nest], nest) }
    } catch (error) {
      return { ok: false as const, message: (error as Error).message }
    }
  }, [locks, nest])
  const config = useMemo(
    () =>
      parsed.ok && (inner === undefined || inner.ok)
        ? playgroundFloor(parsed.lock, binding, inner?.lock)
        : null,
    [parsed, inner, binding]
  )
```

and the refusal reads the inner's parse first: `inner && !inner.ok ? inner.message : !parsed.ok ? …` (the rest as it
is; an inner's own `refused` lines join the picked lock's). `unbuilt` adds the inner's `drafts` and
`notBuildable(inner.lock)` when `inner?.ok`.

`src/app/SiteMap/LockPlayground.stories.tsx`, append:

```tsx
// MADE-UP LOCKS NESTED IN EACH OTHER, one story per stone case (stones spec, "Nested locks"). The picked lock is the
// host; `nest` stands the other in its nest spot (`&`).
const HOST_STONES =
  "in -- yard\nyard -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nyard &\nhall ?\nout ?"
const LEVER = "in -- hall\nhall -[L]- out\nL toggle @in\nin ?\nhall &\nout ?"
const CELL = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"
const GATED = "in -[s]- hall\nhall -- out\ns plate @in\nt plate @hall stone\nin ?\nhall ?\nout ?"

// Park the stone, solve the lever inside, fetch the stone and carry it through to the door beyond.
export const StonePassesThrough: Story = {
  args: { locks: { host: HOST_STONES, lever: LEVER }, initial: "host", nest: "lever" },
}

// The stone lock inside keeps its stone: carry it toward the way in and the explorer stops at its edge.
export const StoneStaysInside: Story = {
  args: { locks: { lever: LEVER, cell: CELL }, initial: "lever", nest: "cell" },
}

// One pool: carry the host's stone in, set it on `s`, take the inner's own stone out to the door beyond.
export const StonesShared: Story = {
  args: { locks: { host: HOST_STONES, gated: GATED }, initial: "host", nest: "gated" },
}
```

- [ ] **Step 3: Run and look**

Run: `yarn vitest run src/app/SiteMap/lockPlayground.spec.tsx && yarn check-types && yarn lint`
Expected: PASS, clean.

Run `yarn storybook`, open `Topology/Lock playground` → `Stone Stays Inside`, and screenshot with `npx playwright
screenshot` (the Playwright MCP is down). Read the screenshot back: the floor carves (no red refusal). Lift the stone
and tap the lever lock's first room: the explorer stops inside the stone lock with "Cannot pass with a stone". Describe
what you see in the report; if a story does not carve within `CARVE_BUDGET`, record its refusal under "Open after
phase 4" (task 15) and leave the story in.

- [ ] **Step 4: Commit**

```bash
git add src/app/SiteMap/playgroundCarve.testing.ts src/app/SiteMap/lockPlayground.testing.tsx src/app/SiteMap/LockPlayground.stories.tsx src/app/SiteMap/lockPlayground.spec.tsx
git commit -m "feat(playground): a lock nested in another's spot, one story per stone case" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 15: Look at it, say so, and the whole gate

**Files:**
- Modify: `docs/mods/floor-topology-design.md` (lines 701-704, "Gates may form loops"; the table row at line 899)
- Modify: `docs/mods/mechanic-contract.md` (§3.2 "Stones on plates": the narrow passage's prompt, `emptyHands`, a
  bullet for nested locks; §7 "The lock format": the nest spot)
- Modify: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 4 row; "Open after phase 1"; "Open after
  phase 3"; "Open after phase 4")
- Modify: `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (§1 "Nested locks": the nest spot, the
  pass-through's one-ways, the box; §3, a note under the bake bullet)
- Modify: `docs/playtest-backlog.md`
- Modify: `src/data/carveLedger.json` (if tasks 6-14 moved the fingerprint)

- [ ] **Step 1: Look at it**

Run: `INCLUDE_DEV=1 yarn generate-world` (never commit that bake), then `yarn storybook` and take two screenshots with
`npx playwright screenshot` (the Playwright MCP is down):
- `App/SiteMap/JourneyInspector` → `Inspector`, the dev journey, pyramid 12, floor 0: the floor's loops, five plates
  (two in `passage`), the torch, the narrow passage.
- `Topology/Lock playground`, lock `stoneGate`: it carves, or "carving, N seeds tried" ends in a refusal. If it
  carves, tap the narrow passage's wall from `hall2`'s side and from `hall3`'s: each time the explorer walks to the
  side nearer him and squeezes from there (task 6).
- (Task 14 already looked at the three nested stone stories; no second look here.)

Read each screenshot back and describe it in the report. If the playground does not carve stoneGate within its
budget (`CARVE_BUDGET = 200`, `playgroundCarve.testing.ts`), record that under "Open after phase 4" with the refusal
it shows; do not fix it here. Then restore the world: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts`.

- [ ] **Step 2: The design doc and the contract**

`docs/mods/floor-topology-design.md`, "**Gates may form loops.**" paragraph (lines 701-704) becomes:

```markdown
**Gates may form loops.** A loop of gated joins is a puzzle in its own right: with plates and
`:empty` conditions, the way round one side opens as the other shuts. The walk proves a loop like any
other lock. A lock floor is laid before it is carved, and the lay stands a corridor on every join, so a
gated join that closes a loop is laid like any other, and a fork's ways may meet again beyond it. A gate
an open way goes round is refused by name (`gateBypassed`): its two sides are one ground, so no doorway
holds it. A layout written longhand, without a lock, is carved as side chains and still refuses a gate
on a loop's second meeting (`obstacleOffRoute`).
```

The table row "A gated join closing a loop is carved" (line 899): its second cell becomes `` `topologyFaults` on a
laid floor seats every join and refuses `gateBypassed`; `gateDoorFaults` holds each door between two grounds; the walk
proves the loop sound ``. Prettier reflows the table: edit the row by line and read the file back.

`docs/mods/mechanic-contract.md` §3.2:
- the "**A narrow passage.**" bullet: `offers "Go through the crack"` becomes `offers "Squeeze through" (nl "Wurm je er
  door"), and he squeezes from the side nearer him: head-on behind the wall's face, or sideways along it`;
- the "**The way out is left with empty hands.**" bullet: `` `leaveWith` on the walk spec names the states that forbid
  leaving `` becomes `` `emptyHands` on the walk spec names the states that are not empty hands; every one-way, a
  contained lock's edge and the way out read it ``;
- after that bullet:

```markdown
- **Nested locks.** A lock nests only in its host's nest spot (§7). Each nesting is read against the nearest
  lock it stands in that holds stones (`stoneNestings`, `LockNesting.stones`). A **pass-through** lock (no
  stones of its own) lets a stone through, so nothing in it takes only empty hands: it cannot write
  `-[unladen]-` (`carryWithoutStones`) and holds no one-way (`oneWayInPassThrough`). A **contained** lock
  (stones, no lock around it holds any) keeps them: a carrying walk stops at the edge of its ground with the
  one blocked line, decided by `crossesContainedEdge` (`stoneBounds.ts`) for play and for the walk, which takes
  the ways tagged `keepsStones` with empty hands only. A **shared** lock (stones, and so does a lock around it)
  pools them: one weights control, `<pool>.stones` (`poolStones`), one hand, and a stone set on either lock's
  plates; the walk takes it fused with its pool's level, so its way out lets a stone through, and names a
  failure there `pooled`. Every level keeps `emptyHands`: a drop inside any nested lock takes empty hands, and
  the floor's own ways out do in every case.
```

§7 "The lock format": the intro's last sentence `placed (§5), and so is nesting one lock inside another.` becomes
`placed (§5), and so is which lock nests in it, though only in its nest spot (below).`; and before "### Connections"
add:

```markdown
### The nest spot

A lock marks at most one region as its **nest spot**, `"takes": "nest"` (written `&` in the notation): the
one place another lock may be nested in it, where it is placed. Nesting is rare, and a spot is where it can
raise a lock's difficulty without the author guessing where a floor might put it. The spot is a stretch of
the lock's route: not its `in` or `out`, not barred as a whole, no mechanic in it, exactly two joins, one
nearer `in`. A second spot is refused `nestSpotsRepeated`, a spot that breaks a rule `nestSpotUnseatable`,
both when the lock is read (`yarn lock`, `compileLock`). A nested lock takes the spot's place: the join
nearer the host's `in` meets the inner's `in`, the other its `out`. Where nothing nests, the spot is `free`
ground.
```

- [ ] **Step 3: The roadmap and the spec**

`docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (edit the table row by line and read it back): phase 4's row
says "(done <date>, [plan](2026-10-08-stonegate-phase-4-gate-loops.md))" after **Gate loops in the carve**. Under
"## Decisions taken", add: "- **One nest spot per lock** (designer, 2026-10-08): written `&`; a lock nests only
there. Phase 4 builds it." Add an "## Open after phase 4" section above "## Open per phase":
- a layout written longhand (no `locks`) still refuses a gate on a loop's second meeting; `offRouteChains` is the
  side-chain carve's grouping and is unchanged;
- masonsRamp, counterweight and stoneOnAPlate are still not on the dev floor;
- whether the lock playground carves stoneGate on its bench floor (from step 1);
- no catalogue lock marks a nest spot yet; `yarn run lock` shows and checks a spot, but cannot say which stone case
  a nesting is; that surfaces in the bake's lock sweep, the floor's refusals and the Lock playground (question 13);
- a pass-through lock refuses any one-way, on its route or not (question 8);
- two stone locks placed one after the other (not nested) are two weights records, so play could hold a stone of
  each; no floor places two;
- any playground nested-stone story that did not carve within `CARVE_BUDGET` (task 14 step 3).

In the same file, delete the "Open after phase 1" bullet "Any floor with `lockNesting` that holds stones is refused
…", and the "Open after phase 3" bullet "Where a gate loop makes both sides of a passage walkable (phase 4), the
crossing starts from the first side in the cell's `dirs`." (task 6). Edit by line and read the file back.

`docs/superpowers/specs/2026-10-04-stones-acceptance.md` §1, "Nested locks":
- after "A lock nested inside another sits on the outer lock's route.", add: "Each lock has a single spot for
  nesting (designer, 2026-10-08), written `&` on its takes line; a lock nests only in its host's spot, and a lock
  with two spots, or a spot no lock could stand in, is refused by name. Nesting is rare; a spot is where it can raise
  a lock's difficulty."
- the pass-through bullet's last sentence gains: "A one-way anywhere in a pass-through lock is refused by name
  (`oneWayInPassThrough`): every one-way takes empty hands."
- tick the box "The solver walks a nested floor with its stones as one pool and proves each case above; a nesting
  that breaks its rule is refused by name." (tasks 9-13).

§3: leave the box "The four stone locks and the stoneOnAPlate lesson bake on the dev floor" unticked and add under
it an indented line: "stoneGate bakes on the dev floor (pyramid 12), its gate loops laid like any join."

- [ ] **Step 4: The playtest backlog.** Add at the top of `docs/playtest-backlog.md` (below the intro paragraph):

```markdown
## stoneGate phase 4 — gate loops, nest spots

- **Dev journey, pyramid 12 (stoneGate).** Play it to the end: lift the stone off the altar (the back way opens, the
  door in shuts), park a stone on the backroom shelf, squeeze through the narrow passage, spend both stones twice,
  leave by the way out. Leave mid-way and come back: every stone where you set it.
- **The narrow passage on the loop.** Tap its wall from either side: the explorer walks to the nearer side and
  squeezes through from there (head-on behind the wall's face, or sideways along it), never round the loop first.
- **Nested stones (Storybook, `Topology/Lock playground`).** `Stone Passes Through`: park the stone, solve the lever
  inside, carry the stone through. `Stone Stays Inside`: lift the inner stone and walk toward the way in; the explorer
  stops at the inner lock's edge with "Cannot pass with a stone" — does an edge nobody can see read as fair?
  `Stones Shared`: carry the host's stone in, set it on the inner plate, take the inner's stone out to the door.
```

- [ ] **Step 5: Commit the docs**

```bash
git add docs/mods/floor-topology-design.md docs/mods/mechanic-contract.md docs/superpowers/plans/2026-10-06-stonegate-roadmap.md docs/superpowers/specs/2026-10-04-stones-acceptance.md docs/playtest-backlog.md
git commit -m "docs: gate loops are laid like any join, one nest spot per lock, nested stones by rule" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 6: The world stays put**

`git status --short src/data/` must print nothing. Then:

```bash
yarn generate-world
git diff --exit-code --stat src/data/generatedWorld.ts
git diff -U0 src/data/carveLedger.json | grep -E '^[-+] ' | grep -vc '"hash"'
```

Expected: the second prints nothing and exits 0; the third prints `0`. If the ledger moved (tasks 6-14 changed a
file the carve imports), commit it:

```bash
git add src/data/carveLedger.json
git commit -m "chore: refresh the carve ledger hashes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 7: The whole gate in a clean worktree**

```bash
git worktree add /tmp/stonegate-phase4 HEAD && cd /tmp/stonegate-phase4 && yarn install --immutable && yarn verify && yarn verify-content && yarn build
```

Expected: all pass but the three known `puzzleSeeds.verify.ts` failures. If `yarn verify`'s `lint --fix` rewrote a
file, copy the change back, commit it ("style: lint") in the real worktree, and run the gate again. If betterer
reports moved line positions, run `yarn betterer --update` in the real worktree and commit `.betterer.results`
("chore: refresh the betterer line positions"). Then `cd -`, `git worktree remove /tmp/stonegate-phase4`, `git push`,
and check `gh pr checks` if a PR exists for the branch.

---

## Self-review notes

- **Roadmap phase 4 row:** `topologyFaults` accepts a gated join closing a loop (task 1), the fork seams (task 3),
  `offRouteChains` (question 1: unchanged, the lay does not read it; recorded in task 15); stoneGate bakes on the dev
  floor (task 5).
- **Spec §3:** "stoneGate bakes on the dev floor, and the world bake stays byte-identical for every floor that has
  no stones" (task 5 steps 3-4, task 15 step 6). "With the realisation mod off, the carve is identical" for stoneGate
  (task 5 step 4, the toggle-off sweeps). "Done when" playing stoneGate on the dev floor: baked here, played by the
  designer from the playtest backlog (task 15 step 4).
- **Spec "The rules" (empty hands):** no task tags a one-way or reads `unladen` beside another owner; every one-way
  keeps its one rule through the rename (task 11) and on every nested level (task 12, "never lets a stone ride a
  drop"); play turns a carrier away at every launch unchanged (task 13).
- **Designer decision, one nest spot:** marked `&` and checked when read (task 7), only nest spot accepted at
  placement (task 8), shown by `lockDraw` and `yarn run lock` (task 7), used by the playground (task 14), recorded in
  the spec and the contract (task 15). The three cases ride on it unchanged (tasks 9-13).
- **Spec §1 "Nested locks":** classified (task 9); pass through: a stone crosses the solved inner lock both ways,
  walked (task 12), and the two things that would turn a stone away in it refused by name (`carryWithoutStones`,
  `oneWayInPassThrough`, task 9); contained: the inner's edge keeps its stones in the walk (task 11) and in play
  (task 13); shared: one pool (task 10), the inner's way out lets a stone through (fused, no edge, task 12), the
  inner's drops and the floor's ways out take empty hands (`emptyHands` per level, task 12), a stone set on an inner
  plate (`poolStones` unit, task 10; `StonesShared` story, task 14); "the solver walks a nested floor with its stones
  as one pool and proves each case" (task 12, every case agreeing with the product walk on every carve); "refused by
  name" (`notNestSpot`, `nestSpotUnseatable`, `carryWithoutStones`, `oneWayInPassThrough`, `nested`, `pooled`);
  `STONES_NESTED` lifted (task 12). "Leaves the inner lock with a stone only by solving it for one" is read per
  question 10.
- **Reviewer note (two rules on one field):** `leaveWith` is renamed `emptyHands` (task 11) and no level drops it
  (task 12 step 3 item 4); the relaxed way out of a shared inner lock is the absence of an edge, never the absence of
  `emptyHands`; pinned by "never lets a stone ride a drop inside a contained lock / a shared pool" (task 12).
- **Stable world for tasks 7-14:** no world floor nests, marks a spot or holds stones; an unused spot compiles `free`
  (task 7 test); the ledger's hash lines move (task 15 step 6).
- **Count work:** state-space claims are state counts (task 12: fewer than the product for pass-through and
  contained, equal for shared); the size bound is tested with a lowered `maxStates`, never a clock.
- **Soundness:** every carved loop in the tests is walked (`expectSound` in tasks 1 and 3); stoneGate is walked by
  the bake's lock sweep (task 5 step 3) and `devJourney.verify.ts` (task 5 step 4).
- **Review Focus → tests:** 1 task 2; 2 task 3; 3 task 1 and the existing longhand spec; 4 task 2; 5 task 1; 6, 7, 8
  task 7; 9 task 10; 10 tasks 9 and 12; 11 task 12; 12 tasks 11 and 13; 13 task 12; 14 the existing
  `nestedLocks.spec.ts` and task 11.
- **Type consistency:** `TopologyOptions = { laid?: boolean }` (task 1) is read by tasks 2 and 3; `forkSeams(graph,
  region, oneWays, { laid })` returns `[region, other][]` (task 3), read by `seamsFor` as keys and by the assembler as
  `ForkIn.seams`; `gateBypassed` has the same shape in `TopologyFault` and `AssemblerReason` (task 2);
  `passageCrossing`'s fifth argument (task 6) defaults so phase 3's callers compile unchanged. `LockAppetite`,
  `seatOf(lock, region)`, `nestSpotOf(lock)`, `nestSpotFaults(lock)` (task 7) are read by tasks 8 and 14;
  `LockNestingFault` (task 8) gains `oneWayInPassThrough` (task 9). `StoneNesting` and `stoneCases` (task 9) are read
  by tasks 10 (`case`, `pool`), 11 (`containedGrounds`) and 12 (`cutOf`); `poolStones(id, controls, any)` (task 10);
  `crossesContainedEdge(grid, a, b)` and `stopShort(grid, path)` (task 11) are read by `floorLock` and by the
  navigation (task 13); `LockSpec.emptyHands`, `handsEmpty`, `LockGate.keepsStones` and `passages[].keepsStones`
  (task 11) by `floorLockWalk` (task 12); the `pooled` failure has one shape in task 12's type and tests.
- **Not covered:** a gate loop inside a nested lock (no lock nests one); a loop closed by a drop (a drop is no
  ground, so it never makes a gate bypassed, and the lay lays it as before); two stone locks one after the other on a
  floor (two hands; recorded in task 15); `yarn run lock` for a nesting's stone case (question 13); a catalogue lock
  with a nest spot (none writes one; the designer adds them).
