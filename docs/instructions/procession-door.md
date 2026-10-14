# Procession door — build plan

> **For agentic workers:** superpowers:subagent-driven-development, one task at a time. Bake and gate once, in
> task 8. Earlier tasks run their own specs, `yarn check-types` and `yarn lint`. Every bake, verify or carve probe
> runs under `timeout`.

**Goal:** a realisation of the `sequence` control whose door carries a procession board instead of showing the
order. Solving the board teaches the order; the door opens when the board is solved and the rooms are then walked
in that order. Meant for master and wizard locks; bathHouse's six-step `Gate` (the designer's, untracked, never
edited) is the likely first customer.

## The design (designer, 2026-10-11)

1. Stepping on a tile once unlocks its bar on the board; a bar stays unlocked, a spoiled run included.
2. Each bar carries its tile's glyph, so a bar names its room.
3. The board's one solution orders the bars along the track in the sequence's order.
4. The door opens only when the board is solved and the rooms are walked in that order.

The lock walk does not change.

## Designer decisions (2026-10-14)

- **A solved board stays solved.** Leaving, a spoiled run and the reset leave it solved.
- **Locked bars:** the player slides the unlocked bars; the board cannot be solved until every bar is unlocked.
- **Order of the conditions:** first the board is solved, then the rooms are walked in order. **The first solve
  resets the walk**: progress walked before it does not count.
- **No ties:** every bar starts on a different tick in the solution. The generator enforces it.
- **One bar per step.** The board's size is the designed sequence's, not the tier's.
- **Glyphs:** the door's tiles wear the procession family's glyphs, the bars' own. Tile and bar show the same
  procession glyph; the mark glyphs are not used for these tiles.

## Questions answered (2026-10-14)

The designer took every proposed default, with one change: **the lock names it.** `P procession hall vault [reset hall-vault]`
is a sequence whose door is a procession board; `sequence` stays the pressure-plate door. The word compiles to
the `sequence` control with `procession: true`, and the carve binds that role to `procession-door` itself, so no
floor binding is needed (a floor binding that names another realisation for it is refused, `processionRebound`).
Contract §1 gains this one exception: the word changes the puzzle, not the look.

1. **Do the floor tiles still turn blue and red?** Today a tile shows in order / out of order. Under a procession
   door that lets a player find the order by trial (step, look, reset). Proposed: keep it. Walking between rooms
   is the cost of a trial, and the tiles stay one look on every floor.
2. **What a locked bar shows.** Proposed: greyed, its glyph dimmed but readable (it says which room is still
   unvisited), its length shown, standing at its scrambled start, not draggable. Marks about it are drawn as usual.
3. **Where the board is.** Proposed: at the door, in the door's face (`GateFacePanel`), beside any other owners'
   markers. The door is where the reset is, and where the player comes back to.
4. **The reset button before the first solve.** Proposed: hidden. The solve is the reset; a reset before it
   changes nothing that counts.
5. **Difficulty for a given step count.** The size is the sequence's; the rest is the floor's tier: ticks, mark
   kinds, rung and split band from `PROCESSION_CONFIG[tier]`, with `bars` set to the step count. Task 1 measures
   every (tier, steps) pair. Proposed: a pair whose seed search finds nothing is refused at bake
   (`processionBoardUnseeded`, naming tier and steps); the table goes to the designer for a band per pair.
6. **Step counts.** Proposed: 3 to 6. Six is the most glyphs one cast has and the 16-tick phone ceiling; a two-bar
   board is read, not solved. Outside that: refused `processionStepsOutOfRange`. bathHouse's `Gate` has 6.
7. **Which cast.** Proposed: the `default` cast (fire, water carrying, baking, boat, oxen, night watch) on every
   floor for now. A role cast would follow the floor's role as a procession room does, but four of the five casts
   share a glyph with the mark set (funerary 𓉐, cosmos 𓇳, water 𓌳, trade 𓂻); the default cast shares none.
8. **Marks beside a procession door.** The tiles leave the mark pool, but a lever whose mark matched a tile glyph
   would read as a step (contract §9.4). Proposed: on a floor with a procession door, the mark pool drops every
   glyph the door's cast uses, plus 𓈖 (mark "water"), which reads as the default cast's 𓈗. That leaves 11 mark
   glyphs on such a floor. Floors without one are untouched.
9. **Two procession doors on one floor.** Proposed: refused (`processionDoorsRepeated`). One cast has six glyphs;
   two doors would need two casts and twelve distinct signs.
10. **Lower tiers.** Proposed: allowed at any tier, refused nowhere. "Meant for master and wizard" is placement
    guidance, not a check.
11. **Hints and reward.** Proposed: the board has the room's hint (procession §7) and no reward. It reads a door;
    it is not a puzzle room.
12. **Save compatibility.** No shipped floor binds the realisation, so no save meets one. If a placed pressure-plate
    sequence is rebound later, proposed: a saved run already `done` with no walked-step record (it predates the
    door) reads as solved, so a door the player opened stays open. A new player cannot reach `done` without walked
    steps being recorded.
13. **The dev floor.** Proposed: dev pyramid 10's `processional` lock (three steps, expert) binds `procession-door`, so it can
    be played. Only an `INCLUDE_DEV=1` bake moves.

## Semantics

**State.** The sequence keeps its states (`sequence.ts`): progress `0..n`, spoiled `x<k>.<w>`. Beside it, play
keeps two facts the solver never sees:

- **walked steps:** every step whose tile was ever crossed, from any state;
- **read:** the board was solved once.

**Moves.**

- Crossing a tile: the sequence moves as today, and the step joins the walked steps.
- Solving the board at the door, the first time: read becomes true and the sequence goes to `0`, from any state,
  `done` included. A second solve does nothing (a solved board stays solved).
- The reset at the door: as today.

**The door** is open when the sequence is `done` and read. Since the first read resets the run, `done` after it is
a walk made after the solve. Other owners fold in as today (`and`/`any`).

**Why the walk does not change.** The solver sees the sequence as it is. The two new facts only withhold the door:

- Read is always reachable when the run can finish: finishing walks every tile, so every bar is unlocked, and the
  board is at the door, where the reset already requires the player to stand (`strands`).
- The solve lands in `0` at the door, which is exactly where the reset lands. The walks already prove the order is
  walkable from there (contract §3.1, "walkable from its reset").

Task 5 property-tests this from player-reachable states rather than trusting the argument.

**The board.** Bars are the steps. The solution's start order is the step order; starts never tie. Step `k` wears
cast glyph `π(k)`, where `π` is a permutation seeded from the sequence id, so the glyphs do not hint at the order.
Board row `r` is the bar whose solution rank is `k(r)`; it wears cast entry `π(k(r))`: glyph, name and sentence.
Row order is the generator's, which is independent of the start order.

## Generator verdict: reuse, with one option

`generateProcession` (roll a day, read every true mark, thin while unique, scramble, grade) already proves
uniqueness of the whole arrangement with `countArrangements` (exhaustive search with propagation, abort at two).
A unique arrangement with distinct starts has a unique start order, so **no new generator and no new solver**:

- **`distinctStarts?: boolean`** on `ProcessionOptions`. When set, `rollDay` re-rolls a day whose starts tie, and
  `gradeProcession` refuses a board whose solution starts tie. When absent, the random stream, the boards and
  `configHash` are what they are today, so no shipped seed list moves.
- **The order is read off, not constrained.** Any day is a relabelling away from "these bars, this order": the
  `k`-th earliest bar is step `k`. So the pass rate is the tier's own, less the tie filter (ties are re-rolled
  before thinning, so they cost microseconds).
- **Cost.** An attempt costs 1–2 ms (procession §5). Pass rates at today's sizes: master 1.4%, wizard 2.4% (5 and
  6 bars), so ~70 attempts and ~0.1 s per seed offline. Play time builds one listed seed with one attempt: ~2 ms.
  Other step counts at a tier are unmeasured; task 1 measures them (question 5).
- **Seeds are listed like every seedable family.** The door asks the procession family with
  `{ difficulty: tier, variant: "door<n>" }`; `resolveOptions` answers the tier config with `bars: n` and
  `distinctStarts: true`. The board is dealt by `boardIndex` as a fork board is.

## Mod and core

- **Core** (`src/game`): the `sequence` kind, the walked steps and read facts, the door rule, the tile glyphs
  written by the carve. Core names no mod: a realisation tells it two things through its `FamilyMeta`.
- **The puzzle mod** owns the realisation `procession-door`: its meta (`sequence: { glyphs, hidesOrder: true }`),
  the casts' glyphs (moved to its game side), and the door's board component. It owns the procession family, so
  no mod imports another.
- **Mod off:** the realisation is unregistered, so the sequence is unrealised (`degradeUnrealised`): tiles are
  ground, a door only it owned stands open, walls unchanged. Marks on that floor may differ from mod-on
  (question 8's exclusion needs the cast); walls may not.
- **Binding:** the lock word `procession` binds the role to `procession-door`; no per-floor binding (see Questions
  answered).

## Tasks

### 1. Generator: distinct starts, door options, order — Opus

**Build:** `distinctStarts` in `src/mods/puzzle/game/procession/generateProcession.ts` (`rollDay`, `gradeProcession`);
`processionOrder(puzzle)` in `procession.ts` (the bar of each step, from the unique solution);
`resolveOptions` in `meta.ts` answers `variant: "door<n>"`. A measurement script prints seeds found per 2000 for
every tier × steps 3–6.

**Tests prove:** `procession.spec.ts`: `processionOrder` ranks by start. `solveProcession.spec.ts` unchanged.
`generateProcession.door.verify.ts`, for every tier × steps 3–6 with a seed: the board's marks are checked
against **every** arrangement by brute force, with no propagation (the solver is not trusted to judge itself):
exactly one satisfies them, its starts are distinct, and its rank order is `processionOrder`. Shipped buckets:
`configHash` of every `PROCESSION_CONFIG` entry unchanged, and `yarn generate-seeds` writes no diff.

### 2. Casts and the realisation meta — Sonnet

**Build:** the cast glyph literals move from `src/mods/puzzle/app/procession/skins.ts` to
`src/mods/puzzle/game/procession/casts.ts`; `skins.ts` reads them. `FamilyMeta.sequence?: { glyphs: readonly number[]; hidesOrder: true }` in `src/game/families/familyMeta.ts`. `src/mods/puzzle/game/processionDoor/meta.ts`
(`PROCESSION_DOOR_META`, family `procession-door`, no pool, no reward, rewardPriority 0, like the pressure plate),
listed in `src/mods/puzzle/index.ts`.

**Tests prove:** every skin's glyphs equal before and after; `yarn generate-font` writes no diff (the literals are
still scanned); `allFamilyMeta.spec.ts` lists the new family; `mark.spec.tsx` still guards the mark glyphs.

### 3. Carve: tile glyphs, marks, refusals — Opus

**Build:** in `src/game/carve/prepareFloor.ts`, a sequence whose bound realisation declares `sequence.glyphs` makes
no tile mark requests; its steps take `glyphs[π(k)]`, `π` seeded from `hashString("procession|" + id)`. The mark
pool (`allocateMarks`, `src/game/mark.ts`) takes an `excluded` set: the cast's glyphs plus 𓈖 on such a floor
(question 8), empty otherwise. Refusals, before a wall is carved: `processionStepsOutOfRange`,
`processionDoorsRepeated`. `placeSequences` (`src/game/sequenceTiles.ts`) writes `hidesOrder: true` and
`orderReader: "procession-door"` on the record (`MechanismRecord`, `src/game/siteTypes.ts`); `floorLock` and the
walk ignore both. `standPieces` is unchanged apart from passing them.

**Tests prove:** `prepareFloor.spec.ts`: each refusal by name, watched failing; a made-up procession-door lock's
tiles wear distinct cast glyphs, none in the floor's marks. `mark.spec.tsx`: an excluded glyph is never allocated;
with no exclusion every allocation is as before. `sequenceTiles.spec.ts`: the record carries both fields only
when bound. Carve baseline over all shipped floors (cells, marks, glyphs): empty diff. `carveNeverDependsOnAMod`:
the made-up lock with the puzzle mod off carves the same walls, tiles as ground.

### 4. Seed demand and dealing — Sonnet

**Build:** `src/game/seeds/enumerateConfigs.ts` owes one procession bucket per procession door, ctx
`{ difficulty, variant: "door<n>" }`, as `switchFamilies` owes fork boards; the door cell gets its `boardIndex`
(`src/game/seeds/boardIndex.ts`). `processionBoardUnseeded` is raised where an owed bucket has no list.

**Tests prove:** `enumerateConfigs.spec.ts`: a floor bound to `procession-door` owes `procession/<tier> door<n>`;
the shipped world's demand is unchanged. `demandLabel` names the variant.

### 5. Save and the door rule — Opus

**Build:** on the journey (`src/app/state/useJourneys.ts`): `sequenceReads?: Record<string, { walked: number[]; read?: true }>`, keyed `${levelNr}:${address}` (the record's cell address). `recordWalkedSteps(address, steps)` and
`readSequence(address)`, the latter writing read and the sequence's `0` in one write. Optional field: absent reads
as nothing walked, nothing read; no migration, no backfill. `src/game/sequencePlay.ts`: `walkedSteps(grid, floor, path)`, every hiding sequence's step crossed, including crossings that move nothing; `useSiteNavigation.ts` saves it
with the presses. `openDoorsFor` (`src/game/mechanismDoors.ts`) takes the read set: a `hidesOrder` record says no
until read. The grandfather rule of question 12 lives in one read function beside it.

**Tests prove:** `sequencePlay.spec.ts`: a spoiled run still adds its steps; fog tiles count. `mechanismDoors.spec.ts`:
`done` unread is shut, `done` read is open, under `and` and `any`; a plate-realised sequence is untouched.
`useJourneys.spec.ts`: both writes survive a reload; `readSequence` from `done` lands in `0`; a second read writes
nothing. `sequenceDoor.verify.ts`, **from player-reachable states**: for made-up locks (processional's shape, a
step in the door's room, a door with a second owner), a breadth-first walk over (region, sequence state, walked
steps, read) where reading is offered only at the door with every step walked: every reachable state can still
reach `out`, and no state with the door open has read false. `yarn lock` output for every placed lock unchanged.

### 6. The board at the door — Sonnet

**Build:** `withGateFaces` (`src/game/gateFace.ts`): a door with a hiding sequence takes the record's `orderReader`
as its family, and its `SequenceFace` carries `hidden: true`, the cast entry per row and each step's walked flag,
never the order. `src/mods/puzzle/app/processionDoor/` registers the Component: the procession board
(`ProcessionBoard.tsx` gains `locked` per row: greyed, dimmed glyph, not draggable), the other owners' markers
through `GateFacePanel`, and the reset once read (question 4). Solved means every bar unlocked and every mark held;
the first solve calls `readSequence`. Bar positions persist in `useModState("puzzle")` under the same key; losing
them costs a drag, never progress. Strings in `public/locales/{en,nl}/`. Stories: locked, partly unlocked, solved,
beside a torch.

**Tests prove:** `ProcessionDoor.spec.tsx`: a locked bar does not move; a board whose marks hold with a bar locked is
not solved; the first solve calls `readSequence` once; a solved board opens solved after a remount; the door shows
no order tiles. `gateFace.spec.ts`: a hiding sequence's face carries no order; a plate sequence's face is as today.
`sequenceWalk.spec.tsx`-style: walk the tiles out of order, solve, walk in order, the door opens; walk in order
before solving, solve, the door stays shut until walked again.

### 7. Playground, contract, handover — Sonnet

**Build:** `procession-door` in `REALISATION_CHOICES.sequence` (`src/app/SiteMap/playgroundCarve.ts`). No new art:
the tile is the sandstone sequence tile with its glyph, the board is the procession board. In
`docs/mods/mechanic-contract.md`: §3 "A sequence door shows the order" gains its exception; §3.1 gains "The
procession door" (the two facts, the first read resets, the door rule, the cast glyphs, the mark exclusion);
§1 states that a realisation may withhold a door behind a reading that is always possible where the reset is
made; §8 Settled. `docs/game-design/puzzles/procession.md` gains a short "At a door" section.
`docs/handover-stonegate.md` and the roadmap's "Designed, not built" move to built.

**Tests prove:** the Lock playground offers the binding and carves processional with it (playground spec).

### 8. Bake, proof and gate — Sonnet

- Check for an uncommitted playtest bake first, then `timeout 3600 yarn generate-world`.
- **Floor-by-floor proof:** no shipped floor binds `procession-door`, so `src/data/generatedWorld.ts`,
  `src/data/carveLedger.json`, `src/data/tierFingerprints.json` and the puzzle seed lists keep every floor and
  bucket. Ledger hashes move with the carve sources; keys and refusal strings must not. Any other change is a fault
  to explain before going on.
- `INCLUDE_DEV=1` bake: only the dev floor carrying `processional` moves (question 13); `yarn generate-seeds`
  lists its door bucket.
- `yarn lock`: every placed lock as before.
- Gate in a clean worktree: `yarn verify`, `yarn verify-content`, `yarn build`; then `gh pr checks` after push.

## Review

One whole-branch review at the end, on Opus. Tasks 1, 3 and 5 (uniqueness, carve, save and the door rule) also get
a task review.
