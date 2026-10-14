# Stone pipe — build plan

> **For agentic workers:** superpowers:subagent-driven-development, one task at a time. Bake and gate once, in
> task 9. Earlier tasks run their own specs, `yarn check-types` and `yarn lint`. Every bake, verify or carve probe
> runs under `timeout`.

**Goal:** a stone crosses between two regions through a pipe in the walls, so a lock can move a stone where the
player cannot carry it. masonsRamp (`src/game/locks/master/masonsRamp.lock`, the designer's; never edited) waits
for it.

## Designer decisions (2026-10-14)

- **Two-way.** A stone can be sent either way. One-way would let a player trap themselves: two stones through,
  none back.
- **Both ends are a hole in the wall**, one sprite for both ends, shared with no other piece.
- **A hole holds the stone that arrived.** Posting a stone: it leaves the hands and lies in the far hole. The hole
  posted into stays empty. The player takes it out of the far hole.

## Questions answered (2026-10-14)

The designer took every proposed default, and Claude adds question 7's line to masonsRamp.

1. **Post while a stone lies in either hole?** Proposed: no. The pipe carries one stone at a time; take it out
   first. This also refuses a post into a full far hole (the stone stays in hand).
2. **Notation.** Proposed: `P pipe @chute @workshop`, and `P pipe @chute @workshop stone` for a stone starting in
   the `workshop` hole (the word follows the hole it lies in, as `p plate @r stone` does).
3. **Where a hole stands.** Proposed: in the back wall of a bare node of its region, off the main path where it
   can, never on a seam (a region's way in).
4. **Actions for tiers.** Proposed: a post and a take each count as one action, as a lift and a set-down do.
5. **Holes and doors.** Proposed: a hole is not a plate. A stone in a hole presses nothing, a gate cannot name a
   pipe, and the explorer's weight does nothing at a hole.
6. **Two pipes on one floor.** Proposed: refused for now (one per lock, one per floor). Marks for paired holes
   come when a lock wants two.
7. **masonsRamp's line.** Proposed: `P pipe @chute @workshop`. Then the shortest walk is six stone moves (lift,
   set on r, lift, post, take, set on p), light for a master lock.
8. **Prompt words.** Proposed: "Post the stone" / "Take the stone" (nl "Schuif de steen erin" / "Pak de steen").
9. **Animation.** Proposed: none at first; the stone appears in the far hole.
10. **Placeholder art.** Proposed: a flat dark mouth in the wall, a grey stone in it, until the painting lands.

## Semantics

**State.** The pipe is part of the lock's stones. An arrangement says which plates hold a stone, which hole holds
one, and whether the hand holds one. Each hole holds at most one stone; by question 1 a pipe holds at most one.

**Actions**, made standing at a hole, in that hole's region:

- **Post at hole A:** the hand holds a stone, both holes are empty. After: the hand is empty, hole B holds it.
- **Take at hole B:** the hand is empty, B holds a stone. After: the hand holds it, B is empty.

Nothing else moves a stone in or out of a hole. Stones are never created or lost: plates holding, holes holding
and the hand always add up to the lock's stones.

**What it does not do.**

- It needs no walk between its regions. Joining two regions the player cannot walk between is its point.
- The empty-hands rule (`>>`, `-[unladen]-`, stairs, the way out) is untouched. The pipe is how a stone crosses
  where hands must be empty; posting leaves the hands empty.
- A hole opens nothing. `-[P]-` is refused; a stone in a hole meets no plate term.
- A flood over a hole's region only bars the player from it. The stone stays.

**Edge cases, with the default built:**

| Case                                       | Default                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Far hole holds a stone                     | No post (question 1). The stone stays in hand.                                                       |
| Own hole holds a stone, hand holds another | No post (question 1). No take either: one stone in hand.                                             |
| Both holes in one region                   | Refused: `pipeInOneRegion`.                                                                          |
| A lock with a pipe and no stone            | Refused: `pipeWithoutStones`.                                                                        |
| A stone starting in a hole                 | Allowed in one hole (`stone` after it). Counts as a stone.                                           |
| A gate naming the pipe                     | Refused: `pipeOwnsGate`.                                                                             |
| Two pipes in one lock                      | Refused: `pipesRepeated` (question 6).                                                               |
| Hole in `in`, `out`, or a barred region    | Allowed. The way out still needs empty hands.                                                        |
| Nested locks                               | Holes count as stone places, like plates: pass-through, contained and shared read them the same way. |

## Notation

One line declares the pipe, between two regions:

```
P pipe @chute @workshop          a pipe, both holes empty
P pipe @chute @workshop stone    a stone starts in the workshop hole
```

`stone` may follow either hole (`P pipe @chute stone @workshop`). An id is needed: it names the holes
(`P@chute`, `P@workshop`) in the arrangement, the walk's steps and the carve.

LOCK_SYNTAX gains one row, after the plate rows:

```
  P pipe @hall @vault [stone]   a stone pipe: post a stone at one hole, it lies in the other; one stone in it at a time
```

## Core and mod

Per the mechanics-core rule, the pipe is part of the **weights control kind, which is core**
(`src/game/mechanics/weights.ts`): its moves are arrangement moves the solver sees. Its **realisation is a mod**:
`stonePipe` in the topology mod, bound under a new key `pipe` (`realisations: { pipe: "stonePipe" }`). An unbound
pipe is refused like any unbound role. With the topology mod off the carve is identical, hole nodes stay bare
nodes, nothing is drawn, and the doors the plates govern stand open as they do today.

## Tasks

### 1. Notation, Lock type, compile — Sonnet

**Build:** `Weights.pipes` (`{ ends: [RegionId, RegionId]; stone?: RegionId }` by id) in `src/game/lockAuthoring.ts`;
the `pipe` line, its LOCK_SYNTAX row and `CONTROL_WORDS.pipe` in `src/game/lockNotation.ts`; the stones count for
`needs stones on N plates` includes a pipe's stone. `WeightsControl.pipes` in `src/game/obstacles.ts`;
`WEIGHTS.compileLock` renames pipes under the namespace; `kindsUsed` adds a `pipe` role and `lockFaults` adds
`pipeNamesNoRegion` in `src/game/lockCompile.ts`.

**Tests prove:** `lockNotation.spec.ts`: the line reads with and without `stone`, before or after either hole; a
pipe alone makes `weights` exist; LOCK_SYNTAX mentions `pipe`. `lockCompile.spec.ts`: a pipe naming no region is
refused by name; a compiled control carries the namespaced pipe.

### 2. Stone rules and the walk — Opus

**Build:** `arrange` in `src/game/mechanics/weights.ts` takes plates and holes. Arrangement keys list holes as
`P@region` tokens after the plates; a lock without a pipe keeps its keys byte for byte. `StoneMove` gains
`hole?` and `kind: "lift" | "set" | "post" | "take"`; `arrangementOf` returns the holes. `poolStones` merges pipes.
`compileWeights` places a hole's moves at its hole cell (`cellOf` covers holes). `weightsMechanism` in
`src/game/lockWalkSpec.ts` places a hole move in the hole's region. `src/game/lockReview.ts` names the steps
("post at chute", "take at workshop"); `src/game/lockDraw.ts` draws the pipe and its legend entry.

**Tests prove** (made-up locks only): `weights.spec.ts`: post and take as in Semantics; no post while either hole
holds a stone; in every reached arrangement the stones add up to the lock's count; pipe-free arrangements are
unchanged. `lockWalk.spec.ts`: two regions joined only by a narrow passage, a plate beyond it: unsolvable without
a pipe, solvable with one, and the shortest walk posts and takes. `nestedStones.spec.ts`: a shared pool carries a
pipe's stone across locks. `lockReview.spec.ts`: the step names.

**`yarn lock masonsRamp`** stays `✗ never reached: out`: the lock declares no pipe, and Claude never edits it.
With the designer's line (question 7) it would read `✓ solvable` in six stone moves; task 9 checks this on a
scratch copy, never on the file.

### 3. Lock checks — Sonnet (may go with task 1)

**Build:** `pipeInOneRegion`, `pipeWithoutStones`, `pipeOwnsGate` and `pipesRepeated` as `refused` lines in
`src/game/lockNotation.ts`, beside the `unladen` faults; `lockChecks` (`src/game/lockChecks.ts`) prints
`pipe P: chute ⇄ workshop`.

**Tests prove:** `lockNotation.spec.ts`: each refusal, by name; `lockChecks.spec.ts`: the pipe line is printed.

### 4. Binding and the mod — Sonnet

**Build:** `src/mods/topology/game/stonePipe/meta.ts` and `src/mods/topology/app/stonePipe/plugin.tsx` (registered
like `stonePlate`, no board); the `pipe` binding key wherever `weights` is resolved; the realisation names its
hole art.

**Tests prove:** a pipe lock bound `pipe: "stonePipe"` compiles; unbound it is refused `realisationMissing`; with
the topology mod off the carve of a pipe lock is identical and its holes are bare nodes.

### 5. Carve — Opus

**Build:** `src/game/carve/placePipeHoles.ts`, appended to `PASSES` after `standForkSwitches`. It draws no
`rand()` and returns at once for a floor without a pipe, so no shipped floor moves.

- **Reads:** `maze`, `branches`, `labels`, `drops`, `forks`, `switchRooms`, `forkSwitchRooms`, `mainRooms`,
  `chainRooms`; prep `mechanisms.weights`.
- **Writes:** `pipeHoles: Map<holeId, { cell: string }>` (new `CarveState` key in `src/game/carve/state.ts`).
- **Rule:** per hole, a bare corridor node of its region whose north side is a wall (no passage, no drop run),
  not the entrance, exit, a junction or a seam node (every passage leads to the same region). Off the main path
  first, then ranked by `hashString(siteId|hole|id|cell)`, as plates are. None: `retry` with a new shortfall
  `pipeHoleNotPlaced` (`src/game/carve/shortfalls.ts`, its reason after `plateNotPlaced`).

`render` writes each hole: the node becomes a room with `pipeHole: { pipe, region }` (new `RoomCell` field in
`src/game/siteTypes.ts`), `dirs` untouched, and no wall dressing on it. `TAIL_READS` gains `pipeHoles`;
`standPieces` hands the hole cells to `placeWeights` (`src/game/weightsPlates.ts`), which compiles one record over
plates and holes. The record stays on the first plate; on a lock with no plate it sits on the first hole.
`src/game/cellSlot.ts` names a hole `xpipe:<pipe>@<region>`. The lay seats a hole as a `tile` (`WEIGHTS.seats`), so
its region gets a node. A sequence tile that needs a hole's node fails the attempt (`sequenceTileNotPlaced`); no lock
has both.

**Tests prove:** `placePipeHoles.spec.ts` with a hand-built state: a hole takes a back-walled node of its region,
never a seam, junction or entrance node, off the main path first; no node refuses with `pipeHoleNotPlaced`; a floor
without a pipe writes an empty map. `render.spec.ts`: the hole room keeps its `dirs` and wears no dressing.
`weightsPlates.spec.ts`: a hole's transitions sit at its cell. `carveFloor.spec.ts`: a made-up pipe lock carves on
a playground floor.

### 6. Play and save — Opus

**Build:** in `src/game/stonePlay.ts`, `stoneMoveAt` returns `post` or `take` at a hole, and `holeLookAt` gives
`empty` or `stone`. `src/app/SiteMap/useSiteNavigation.ts` offers the prompt standing on a hole's node, as at a
plate; a tap on the hole walks there. `src/app/SiteMap/SiteMapView.tsx` draws the hole on its node's back wall in
its look. Strings in `public/locales/{en,nl}/`. A Lock playground story, "Stone pipe".

**Save:** no new store. Hole contents are part of the stones' arrangement key, saved under the record's home slot
as plates are. A lock without a pipe keeps its keys, so every existing save reads as before. A stored key the lock
no longer has reads as the start (`arrangementIn`). No migration.

**Tests prove:** `stonePlay.spec.ts`: post and take offered and refused per Semantics; `holeLookAt` follows the
key. A `stoneSave.spec.tsx`-style spec: a post writes one entry under the first plate's slot and survives a
reload; the far hole shows the stone, the near one stays empty; a take puts it in hand (`isCarrying`).

### 7. Art — Sonnet

**Build:** a placeholder first (question 10), drawn by the hole's wall layer so play works without paint. Then a
`prim_pipeHole` scaffold in `scripts/renderProp.py` (a wall item, landscape two by one, like the niche) and two
entries in `docs/instructions/repaint-queue.md` under "Stone gate mechanics": `default/pipeHole` (a round mouth
in a stone wall, dark inside, rank-neutral) and `default/pipeHoleStone` (a Gemini EDIT of it, a stone lying in
the mouth). `yarn repaint default/pipeHole` then serves the prompt; the import uses `--slot=wall`, recorded in
`art/rebuild.sh`. The painting is a manual loop for the designer's hour at the generator.

**Tests prove:** the hole draws its placeholder in both looks; `ArtBacklog` lists both keys until they land.

### 8. Marks and the contract — Sonnet

**Build:** a floor with two pipes is refused when its locks are planned (`pipesOnOneFloor`, `src/game/lockPlan.ts`)
until question 6 is answered; one pipe wears no mark, as painted controls wear none. The pipe in
`docs/mods/mechanic-contract.md` §3.2 (holes, post and take, one stone at a time, not a plate, binding `pipe` to
`stonePipe`) and §8 Settled; the handover and `docs/designer-todo.md` updated.

**Tests prove:** `lockPlan.spec.ts`: two made-up pipe locks on one floor are refused by name.

### 9. Bake, proof and gate — Sonnet

- Check for an uncommitted playtest bake first, then `timeout 3600 yarn generate-world`.
- Floor-by-floor proof: no placed lock uses a pipe, so `src/data/generatedWorld.ts`, `src/data/carveLedger.json`
  and `src/data/tierFingerprints.json` keep every floor. Ledger hashes move with the carve sources; keys and
  refusal strings must not. Any other change is a fault to explain before going on.
- `yarn lock`: every placed lock as before. Report masonsRamp (still `never reached: out`), and its result on a
  scratch copy with question 7's line, in the handover.
- Gate in a clean worktree: `yarn verify`, `yarn verify-content`, `yarn build`; then `gh pr checks` after push.

## Review

One whole-branch review at the end, on Opus. Tasks 2, 5 and 6 (walk, carve, save) also get a task review.
