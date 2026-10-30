# Regionless Battle and Pair Puzzle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three new lab-only puzzle families — `regionless-battle`, `regionless-twin-battle` (scarab skin) and
`pair-puzzle` (sarcophagus/mummy skin) — playable in the puzzle lab, not yet in the world bake.

**Architecture:** The regionless families are star battle boards with `walls` instead of `regions`: the star battle
core gains optional walls, one new rung (`lineBlock`) on a second ladder, its own generator, and a second skin table.
Star battle's own boards stay byte-identical. Pair puzzle (Tents) is a new module beside it, following the same
family shape: game core, techniques, generator, meta, app plugin.

**Tech Stack:** TypeScript, React, Tailwind, Vitest, i18next (`public/locales/{en,nl}/common.json`).

**Spec:** `docs/superpowers/specs/2026-10-30-regionless-battle-and-pair-puzzle-design.md`

## Global Constraints

- Lab-only: the three metas are NOT added to `puzzleMod.families` (`src/mods/puzzle/index.ts`). `src/data/generatedWorld.ts`, `src/data/carveLedger.json`, `src/data/tierFingerprints.json` and `src/data/puzzleSeeds.ts` stay byte-identical.
- Star battle and twin stars boards stay byte-identical: `yarn verify-seeds` passes before and after every task that touches `src/mods/puzzle/game/starBattle/`.
- Family ids name the puzzle type, never a skin element: `regionless-battle`, `regionless-twin-battle`, `pair-puzzle`.
- Entry tiers: `regionless-battle` expert, `pair-puzzle` master, `regionless-twin-battle` wizard. No family enters starter.
- Boards: regionless battle ~7×7 expert → 9×9 wizard; regionless twin battle 10×10; pair puzzle ~8×8 master → 10×10 wizard.
- The eight squares around a placed piece are drawn as spent in all three families; `touch` is propagation, free in grading.
- Pair puzzle uniqueness is over piece positions only; a finished board does not show the pairing.
- One skin each: scarabs on sandstone with raised stone wall blocks; sarcophagi as anchors and mummies as pieces. Pieces drawn as SVG in code.
- Generation and solvability checks live in `*.verify.ts`; soundness is property-tested from player-reachable states.
- Solve-time budget: 10 s floor, under 6 min at wizard (soft).
- No wall-clock assertions in tests; count work.
- Rules screen names every element and says what each clue means; en + nl copy for every key.
- Comments state current state and why, never history. Commits one line.
- Run checks with `yarn vitest run <path>`, `yarn verify-content <path>`, `yarn check-types`, `yarn lint`.

## Review Focus

1. A tap or a drag across a wall cell changes nothing and adds no undo entry — the player should not be able to mark stone.
2. A hint on a walled board never points at, or decides, a wall cell.
3. Pair puzzle: pieces that satisfy every count but cannot be paired one-to-one with the anchors (two pieces sharing one sarcophagus) are not solved.
4. The 10×10 twin board at 360px wide: cells land under the 44px tap guideline (twin stars §11 rejected 10×10 for this). The user asked for 10×10; check in the lab that tap and drag still hit the intended cell and record what you see in the family doc.
5. Star battle boards unchanged after the shared-core edits (`yarn verify-seeds`, `generateStarBattle.verify.ts`).

---

## File map

Regionless (shared star battle core):
- Modify `src/mods/puzzle/game/starBattle/starBattle.ts` — optional `regions`, optional `walls`, `isWall`, `blankMarks`; input ignores walls.
- Modify `src/mods/puzzle/game/starBattle/techniques.ts` — `lineBlock` rung, `REGIONLESS_TECHNIQUES`, ladder-aware rank/solve.
- Modify `src/mods/puzzle/game/starBattle/generateStarBattle.ts` — export `starSet`, ladder-aware `techniquesUpTo`.
- Create `src/mods/puzzle/game/starBattle/generateRegionlessBattle.ts`, `regionlessConfig.ts`, `regionlessMeta.ts`, `generateRegionlessBattle.verify.ts`, `regionless.spec.ts`.
- Modify `src/mods/puzzle/game/starBattle/soundness.spec.ts` — add walled boards.
- Modify `src/mods/puzzle/app/starBattle/{skins.ts,glyphs.tsx,StarBattleBoard.tsx,StarBattlePuzzle.tsx,StarBattleRules.tsx,starBattleHint.ts,plugin.tsx}`.
- Create `docs/game-design/puzzles/regionless-battle.md`.

Pair puzzle (new module):
- Create `src/mods/puzzle/game/pairPuzzle/{pairPuzzle.ts,techniques.ts,generatePairPuzzle.ts,pairPuzzleConfig.ts,meta.ts}` with `pairPuzzle.spec.ts`, `techniques.spec.ts`, `soundness.spec.ts`, `generatePairPuzzle.verify.ts`.
- Create `src/mods/puzzle/app/pairPuzzle/{plugin.tsx,PairPuzzle.tsx,PairPuzzleBoard.tsx,PairPuzzleRules.tsx,pairPuzzleHint.ts,skins.ts,glyphs.tsx}` with `PairPuzzleBoard.spec.tsx`, `pairPuzzleHint.spec.ts`.
- Modify `src/mods/puzzle/app/index.ts` (import the plugin), `public/locales/{en,nl}/common.json`.
- Create `docs/game-design/puzzles/pair-puzzle.md`; add both families to `docs/game-design/PUZZLE_FAMILIES.md`.

---

### Task 1: Walls in the star battle core

**Files:**
- Modify: `src/mods/puzzle/game/starBattle/starBattle.ts`
- Modify: `src/mods/puzzle/game/starBattle/techniques.ts` (solver start marks only)
- Modify: `src/mods/puzzle/app/starBattle/starBattleHint.ts` (hint start marks only)
- Test: `src/mods/puzzle/game/starBattle/regionless.spec.ts`

**Interfaces:**
- Produces:
  - `StarBattlePuzzle = { size: number; quota: number; regions?: readonly number[]; walls?: readonly boolean[] }`
  - `isWall(puzzle: StarBattlePuzzle, cell: number): boolean`
  - `blankMarks(puzzle: StarBattlePuzzle): Marks` — `"dark"` on walls, `undefined` elsewhere. Every solver/hint entry point starts from this instead of an all-undefined array.
  - `regionCells(puzzle)` returns `[]` when `regions` is unset.
  - `cycleStarBattleCell(state, cell, puzzle)` / `sweepStarBattleCells(state, cells, puzzle)` — take the puzzle, ignore wall cells; a call that changes nothing returns the same state object (no undo entry).
  - `ruledOutByStars` never includes a wall.

- [ ] **Step 1: Capture the baseline** — run `yarn verify-seeds`; expected: passes. Note the output.
- [ ] **Step 2: Write the failing tests** in `regionless.spec.ts`, on a hand-made 5×5 board with quota 1, no regions, walls at cells 2, 7, 12:

```ts
it("a tap on a wall changes nothing and adds no undo entry", () => {
  const state = createStarBattleState(board)
  expect(cycleStarBattleCell(state, 2, board)).toBe(state)
})
it("a sweep skips walls", () => {
  const next = sweepStarBattleCells(createStarBattleState(board), [1, 2, 3], board)
  expect(next.marks[2]).toBeUndefined()
  expect(next.marks[1]).toBe("dark")
})
it("the solver starts with walls ruled out", () => {
  expect(blankMarks(board).filter(m => m === "dark")).toHaveLength(3)
})
it("a regionless board's groups are its rows and columns", () => {
  expect(groupsOf(board)).toHaveLength(10)
})
```

- [ ] **Step 3: Run** `yarn vitest run src/mods/puzzle/game/starBattle/regionless.spec.ts` — expected: FAIL (signatures missing).
- [ ] **Step 4: Implement** the interfaces above. Update every caller of `cycleStarBattleCell`/`sweepStarBattleCells` (`StarBattlePuzzle.tsx`) and replace the all-undefined start arrays in `solveStarBattleByTechniques` and `buildStarBattleHint` with `blankMarks(puzzle)` (hint: overlay the player's marks onto it).
- [ ] **Step 5: Run** the new spec plus `yarn vitest run src/mods/puzzle` — expected: PASS.
- [ ] **Step 6: Run** `yarn verify-seeds` and `yarn verify-content src/mods/puzzle/game/starBattle/generateStarBattle.verify.ts` — expected: same result as Step 1.
- [ ] **Step 7: Commit** — `git commit -m "feat: star battle boards can carry walls"`

### Task 2: The `lineBlock` rung on a regionless ladder

**Files:**
- Modify: `src/mods/puzzle/game/starBattle/techniques.ts`, `generateStarBattle.ts`, `src/mods/puzzle/app/starBattle/starBattleHint.ts`
- Test: `src/mods/puzzle/game/starBattle/techniques.spec.ts`, `soundness.spec.ts`

**Interfaces:**
- Consumes: Task 1's `blankMarks`, `isWall`.
- Produces:
  - `StarBattleTechniqueId = (typeof STAR_BATTLE_TECHNIQUES)[number] | "lineBlock"`; `STAR_BATTLE_TECHNIQUES` is unchanged.
  - `REGIONLESS_TECHNIQUES = ["touch", "groupFull", "groupTight", "onlyWay", "everyWay", "lineBlock", "wouldStrand"] as const`
  - `ladderOf(puzzle: StarBattlePuzzle): readonly StarBattleTechniqueId[]` — `REGIONLESS_TECHNIQUES` when `puzzle.walls` is set, else `STAR_BATTLE_TECHNIQUES`.
  - `techniqueRank(id, ladder = STAR_BATTLE_TECHNIQUES)`, `techniquesUpTo(cap, ladder = STAR_BATTLE_TECHNIQUES)`; `nextStarBattleStep`/`solveStarBattleByTechniques` default `allowed` to `ladderOf(puzzle)`; `deepest` ranks on that ladder.
  - `lineBlock` step: `variant: "rowsToCols" | "colsToRows"`, `count` = pieces owed, `cells` = the block's lines, `decisions` = dark on the claimed columns' (rows') cells outside the block.
  - Hint: `buildStarBattleHint` uses `techniquesUpTo(puzzle.techniqueCap, ladderOf(puzzle))`.

`lineBlock`: for every set of k rows (k = 2 and 3) whose free cells all lie in exactly k columns, and whose owed total equals those columns' owed total, rule out those columns' free cells outside the k rows; the same with rows and columns swapped. Star battle's own ladder never runs it.

- [ ] **Step 1: Write the failing tests** in `techniques.spec.ts`: a hand-made walled 6×6 board (quota 1) where rows 0–1 have free cells only in columns 2–3; assert `nextStarBattleStep(board, blankMarks(board), ["lineBlock"])` returns `technique: "lineBlock"`, `variant: "rowsToCols"`, and decisions darkening exactly the free cells of columns 2–3 in rows 2–5. Add `it("star battle's ladder never contains lineBlock", () => expect(STAR_BATTLE_TECHNIQUES).not.toContain("lineBlock"))`.
- [ ] **Step 2: Extend `soundness.spec.ts`** with walled boards: from `generateRegionlessBattle` boards (Task 3 — until then, the hand-made boards) and random player-reachable mark subsets consistent with the answer, every `REGIONLESS_TECHNIQUES` step's decisions agree with the solution; and on single lines, every decision is consistent with every legal filling of that line.
- [ ] **Step 3: Run** both specs — expected: FAIL.
- [ ] **Step 4: Implement** the interfaces.
- [ ] **Step 5: Run** `yarn vitest run src/mods/puzzle/game/starBattle` — PASS; `yarn verify-seeds` — same as Task 1 Step 1.
- [ ] **Step 6: Commit** — `git commit -m "feat: lineBlock rung for regionless boards"`

### Task 3: Regionless generator, tiers and metas

**Files:**
- Modify: `src/mods/puzzle/game/starBattle/generateStarBattle.ts` (export `starSet`)
- Create: `src/mods/puzzle/game/starBattle/generateRegionlessBattle.ts`, `regionlessConfig.ts`, `regionlessMeta.ts`, `generateRegionlessBattle.verify.ts`
- Create: `docs/game-design/puzzles/regionless-battle.md`

**Interfaces:**
- Consumes: `starSet(size, quota, random): number[] | undefined`; Task 2's ladder functions.
- Produces:
  - `RegionlessOptions = { size: number; quota: number; maxWallShare: number; techniqueCap: StarBattleTechniqueId; requires?: StarBattleTechniqueId[]; requiresCount?: number; firstStarAfter?: number }`
  - `generateRegionlessBattle(seed: number, options: RegionlessOptions, attempts?: number): StarBattlePuzzleWithAnswer` — result has `walls`, no `regions`.
  - `gradeRegionlessBattle(board: StarBattlePuzzleWithAnswer, options: RegionlessOptions): Grade | null`
  - `REGIONLESS_BATTLE_CONFIG`, `REGIONLESS_TWIN_CONFIG: Record<Difficulty, RegionlessOptions>`
  - `REGIONLESS_BATTLE_META`, `REGIONLESS_TWIN_META: FamilyMeta`

Generation: solution first (`starSet`), then add walls one at a time on random non-solution cells until the board settles under the tier's ladder and meets its shape (same `requires`/`requiresCount`/`firstStarAfter` meaning as star battle); give up the attempt once walls exceed `maxWallShare × size²`; keep the nearest miss as fallback like `generateStarBattle`. Walls are the gifts: fewer walls, harder board.

Starting tier values (tune with the verify file; record the measured ranges in the family doc):

| table | tier | size | quota | maxWallShare | techniqueCap | requires (count) | firstStarAfter |
| --- | --- | --- | --- | --- | --- | --- | --- |
| battle | expert | 7 | 1 | 0.3 | lineBlock | lineBlock (1) | – |
| battle | master | 8 | 1 | 0.22 | wouldStrand | wouldStrand (2) | 3 |
| battle | wizard | 9 | 1 | 0.16 | wouldStrand | wouldStrand (4) | 5 |
| twin | wizard | 10 | 2 | 0.2 | wouldStrand | wouldStrand (4) | 5 |

Tiers below a family's `minTier` point at its entry-tier settings (unreachable, but the table is total, as in `TWIN_STARS_CONFIG`).

Metas (both `ownerMod: "puzzle"`, `tags: ["puzzle", "funerary", "cosmos"]`, `faces: { funerary: ["default"], cosmos: ["default"] }`, `themes: ["default"]`, `rewardPriority: 60`, `seedable` over the generator/grader/config):
- `REGIONLESS_BATTLE_META`: `id: "regionless-battle"`, `minTier: "expert"`, `icon: "🪲"`, `color: "amber"`.
- `REGIONLESS_TWIN_META`: `id: "regionless-twin-battle"`, `minTier: "wizard"`, `icon: "🪲"`, `color: "yellow"`.

- [ ] **Step 1: Write `generateRegionlessBattle.verify.ts`**: for each reachable tier of both tables, 8 seeds: the board settles under `techniquesUpTo(cap, REGIONLESS_TECHNIQUES)` from `blankMarks`; `walls` count ≤ `maxWallShare × size²`; no wall on a solution cell; `gradeRegionlessBattle` is non-null; assert `meta.minTier` matches the Global Constraints.
- [ ] **Step 2: Run** `yarn verify-content src/mods/puzzle/game/starBattle/generateRegionlessBattle.verify.ts` — FAIL.
- [ ] **Step 3: Implement** generator, config, metas. Do not touch `src/mods/puzzle/index.ts`.
- [ ] **Step 4: Run** the verify file — PASS. Record steps-per-board and first-star step per tier.
- [ ] **Step 5: Write `docs/game-design/puzzles/regionless-battle.md`** following `star-battle.md`'s outline (rules, ladder with `lineBlock`, generation, knobs with the measured numbers, controls, hints, theming); the twin as its own section, like star-battle §11. Literature: UKPA "Battle Star", Logic Masters "Star Battle (Regionless)".
- [ ] **Step 6: Commit** — `git commit -m "feat: regionless battle generator and tiers"`

### Task 4: Regionless screen — scarab skin, walls drawn, copy, lab registration

**Files:**
- Modify: `src/mods/puzzle/app/starBattle/skins.ts`, `glyphs.tsx`, `StarBattleBoard.tsx`, `StarBattlePuzzle.tsx`, `StarBattleRules.tsx`, `plugin.tsx`
- Modify: `public/locales/en/common.json`, `public/locales/nl/common.json`
- Test: `src/mods/puzzle/app/starBattle/StarBattleBoard.spec.tsx`, `starBattleHint.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `skinFor(puzzle: StarBattlePuzzle, role, theme, board?, room?)` — picks `REGIONLESS_SKINS` (one entry, `default`, whose `name` is `"scarabs"`) when `puzzle.walls` is set, else today's `SKINS`.
  - `StarBattleSkin` gains `stone: string` (wall-cell class) — set on every skin; only walled boards draw it.
  - `Scarab: FC` in `glyphs.tsx`.
  - Title key: quota 1 → `starBattle.name.<skin.name>`, quota 2 → `starBattle.name.twin<SkinName>` (generalise `twinName`; `twinDefault`/`twinFields` keep their keys).

Board: wall cells render as raised stone (`skin.stone`), are not buttons (no tap, no drag target), and region boundaries are drawn only when `regions` is set. Rules: `StarBattleRules` takes `walls: boolean` and adds the `starBattle.rules.<skin>.walls` bullet when true.

Copy (en; nl alongside): `starBattle.name.scarabs` "Scarab Field" / "Scarabeeënveld"; `starBattle.name.twinScarabs` "Scarab Pairs" / "Scarabeeënparen"; `goal.scarabs`, `quota.scarabs`, `rules.scarabs.{touch,walls,enter}`, and every `hint.scarabs.*` key the regionless ladder can produce: `mistake`, `touch`, `groupFull|groupTight|onlyWay|everyWay.{row,col}_{one,other}`, `lineBlock.{rowsToCols,colsToRows}`, `wouldStrand.{row,col}`, `action.*` (same shape as `hint.default.action`). Name each element and what it means: scarabs, sandstone squares, stone blocks where nothing can stand.

- [ ] **Step 1: Write the failing tests**:
  - `StarBattleBoard.spec.tsx`: on a walled board, a wall cell renders no button and has the stone class; clicking the cell next to it still works.
  - `starBattleHint.spec.ts`: for 20 player-reachable states of a generated regionless board, the hint's `decided` and `focus` never include a wall cell.
- [ ] **Step 2: Run** them — FAIL.
- [ ] **Step 3: Implement** skin, glyph, board, rules, title, copy.
- [ ] **Step 4: Register** both families in `plugin.tsx` the way twin stars is (same `StarBattleComponent`, `generatePuzzle(META, seed, ctx)`), still gated on `isModEnabled("puzzle")`.
- [ ] **Step 5: Run** `yarn vitest run src/mods/puzzle src/i18n` — PASS (`keys.spec` and `goalWording.spec` cover the new keys and titles).
- [ ] **Step 6: Look at it.** Open the puzzle lab (settings, develop mode), pick each regionless family at each reachable tier, play to solved; screenshot at 360×640 and at desktop width. Check Review Focus 1, 2 and 4 by hand.
- [ ] **Step 7: Commit** — `git commit -m "feat: scarab field and scarab pairs in the puzzle lab"`

### Task 5: Pair puzzle game core

**Files:**
- Create: `src/mods/puzzle/game/pairPuzzle/pairPuzzle.ts`
- Test: `src/mods/puzzle/game/pairPuzzle/pairPuzzle.spec.ts`

**Interfaces:**
- Produces:
  - `PairPuzzle = { size: number; anchors: readonly boolean[]; rowCounts: readonly number[]; colCounts: readonly number[] }`
  - `PairMark = "piece" | "empty"`; `PairMarks = { marks: readonly (PairMark | undefined)[] }`; `PairState = PairMarks & { past: readonly (readonly (PairMark | undefined)[])[] }`
  - `createPairState(puzzle): PairState`; `cyclePairCell(state, cell, puzzle)` (empty → `"empty"` → `"piece"` → empty, as star battle); `sweepPairCells(state, cells, puzzle)` (marks `"empty"`); `undoPair`, `canUndoPair`. Anchor cells are never marked; a no-op returns the same state.
  - `hasPerfectPairing(puzzle, pieces: readonly boolean[]): boolean` — bipartite matching, each piece orthogonally adjacent to its own anchor, every anchor used once.
  - `lineStatus(puzzle, marks): { rows: LineStatus[]; cols: LineStatus[] }`, `LineStatus = "open" | "met" | "broken"` (broken = more pieces than the count, or too few cells left to reach it).
  - `pairConflicts(puzzle, state): Set<number>` — touching pieces (diagonals included), pieces with no orthogonal anchor, pieces in an over-full line.
  - `pairSolved(puzzle, state): boolean` — counts exact, no conflicts, `hasPerfectPairing`.
  - `ruledOutByPieces(puzzle, marks): Set<number>` — eight neighbours of each piece, never anchors.
  - `firstPairMistake(marks, solution: readonly boolean[]): number | undefined`

- [ ] **Step 1: Write the failing tests** on a hand-made 4×4 board with two anchors at cells 1 and 11, counts rows `[1,0,0,1]` cols `[1,0,0,1]`:

```ts
it("two pieces sharing one anchor are not solved", () => {
  // both pieces next to anchor 1, counts satisfied, no touch, no pairing
  expect(pairSolved(sharedAnchorBoard, sharedAnchorState)).toBe(false)
})
it("a tap on an anchor changes nothing", () => {
  const s = createPairState(board)
  expect(cyclePairCell(s, 1, board)).toBe(s)
})
it("touching pieces conflict, corners included", () => { /* pieces at 5 and 10 → both in pairConflicts */ })
it("a line past its count is broken", () => { /* lineStatus rows[0] === "broken" */ })
```

- [ ] **Step 2: Run** `yarn vitest run src/mods/puzzle/game/pairPuzzle/pairPuzzle.spec.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: pair puzzle board rules"`

### Task 6: Pair puzzle techniques

**Files:**
- Create: `src/mods/puzzle/game/pairPuzzle/techniques.ts`
- Test: `src/mods/puzzle/game/pairPuzzle/techniques.spec.ts`, `soundness.spec.ts`

**Interfaces:**
- Consumes: Task 5.
- Produces:
  - `PAIR_TECHNIQUES = ["touch", "zeroLine", "noAnchor", "lineFull", "lineTight", "onlyWay", "claimed", "lineBlock", "wouldStrand"] as const`; `PairTechniqueId`.
  - `PairStep = { technique: PairTechniqueId; variant?: string; count?: number; cells: number[]; decisions: { cell: number; mark: PairMark }[] }`
  - `pairTechniquesUpTo(cap: PairTechniqueId): PairTechniqueId[]`
  - `nextPairStep(puzzle, marks, allowed?)`, `applyPairTechniques(puzzle, marks, allowed?)`, `solvePairByTechniques(puzzle, allowed?): { marks; settled: boolean; steps: PairStep[]; deepest?: PairTechniqueId }`, `pairStepFocus(step)`.

Rung meanings are in the spec ("Deduction ladders — Pair puzzle"). `variant` is `row`/`col` for line rungs, `rowsToCols`/`colsToRows` for `lineBlock`. `claimed` and `lineBlock` reason that a pairing exists, never which one. `between` is left out; add it only with a soundness test that passes.

- [ ] **Step 1: Write the failing tests**: one hand-made board per rung where that rung (and no cheaper one) fires, asserting `technique`, `variant` and the exact decisions.
- [ ] **Step 2: Write `soundness.spec.ts`**: (a) on every 4×4 and 5×5 board from a fixed list of random anchor layouts with a unique position solution (found by brute force over all fillings in the spec), every rung's decisions from random player-reachable states agree with that solution; (b) every rung fires on at least one generated board (Task 7 boards once available).
- [ ] **Step 3: Run** — FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run** `yarn vitest run src/mods/puzzle/game/pairPuzzle` — PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: pair puzzle deduction ladder"`

### Task 7: Pair puzzle generator, tiers and meta

**Files:**
- Create: `src/mods/puzzle/game/pairPuzzle/generatePairPuzzle.ts`, `pairPuzzleConfig.ts`, `meta.ts`, `generatePairPuzzle.verify.ts`
- Create: `docs/game-design/puzzles/pair-puzzle.md`

**Interfaces:**
- Consumes: Tasks 5–6.
- Produces:
  - `PairOptions = { size: number; density: number; techniqueCap: PairTechniqueId; requires?: PairTechniqueId[]; requiresCount?: number }` — `density` = pieces / size².
  - `PairPuzzleWithAnswer = PairPuzzle & { solution: readonly boolean[]; techniqueCap: PairTechniqueId }`
  - `generatePairPuzzle(seed, options, attempts?): PairPuzzleWithAnswer`, `gradePairPuzzle(board, options): Grade | null`
  - `PAIR_PUZZLE_CONFIG: Record<Difficulty, PairOptions>`, `PAIR_PUZZLE_META: FamilyMeta`

Generation: place a random non-touching piece set at `density`, give each piece a distinct orthogonal anchor (not a piece cell), derive the counts, accept when the board settles under the tier's ladder and meets `requires`/`requiresCount`; nearest miss as fallback.

Starting values: master `{ size: 8, density: 0.17, techniqueCap: "lineBlock", requires: ["claimed", "lineBlock"], requiresCount: 2 }`; wizard `{ size: 10, density: 0.17, techniqueCap: "wouldStrand", requires: ["wouldStrand"], requiresCount: 3 }`; lower tiers point at master's.

Meta: `id: "pair-puzzle"`, `ownerMod: "puzzle"`, `tags: ["puzzle", "funerary"]`, `faces: { funerary: ["default"] }`, `themes: ["default"]`, `minTier: "master"`, `icon: "⚰️"`, `color: "stone"`, `rewardPriority: 60`, `seedable` over generator/grader/config.

- [ ] **Step 1: Write `generatePairPuzzle.verify.ts`**: per reachable tier, 8 seeds: settles from blank marks; brute-force-free check that `solution` satisfies `pairSolved`; anchors = pieces in count; grade non-null; meta `minTier === "master"`.
- [ ] **Step 2: Run** `yarn verify-content src/mods/puzzle/game/pairPuzzle/generatePairPuzzle.verify.ts` — FAIL.
- [ ] **Step 3: Implement.** Do not touch `src/mods/puzzle/index.ts`.
- [ ] **Step 4: Run** — PASS; record steps per board per tier.
- [ ] **Step 5: Write `docs/game-design/puzzles/pair-puzzle.md`** (rules, ladder, generation, knobs with measured numbers, controls, hints, theming; position-only uniqueness and why). Literature: Tents (pzzl.com, UKPA guide).
- [ ] **Step 6: Commit** — `git commit -m "feat: pair puzzle generator and tiers"`

### Task 8: Pair puzzle screen and lab registration

**Files:**
- Create: `src/mods/puzzle/app/pairPuzzle/{plugin.tsx,PairPuzzle.tsx,PairPuzzleBoard.tsx,PairPuzzleRules.tsx,pairPuzzleHint.ts,skins.ts,glyphs.tsx}`
- Modify: `src/mods/puzzle/app/index.ts`, `public/locales/{en,nl}/common.json`, `docs/game-design/PUZZLE_FAMILIES.md`
- Test: `src/mods/puzzle/app/pairPuzzle/PairPuzzleBoard.spec.tsx`, `pairPuzzleHint.spec.ts`

**Interfaces:**
- Consumes: Tasks 5–7.
- Produces:
  - `PairSkin` — like `StarBattleSkin` minus region strokes, plus `anchor: string`, `countOpen`, `countMet`, `countBroken: string`, `Anchor: FC`, `Glyph: FC`. One skin, `default`, `name: "mummies"`.
  - `buildPairHint(puzzle, state): PairHint | undefined` — same shape and order as `buildStarBattleHint` (mistake first, then cheapest rung on the board's own ladder).
  - `PairPuzzle` screen props match `StarBattlePuzzle`'s (`puzzle, difficulty, role, theme, room, onSolved, onCancel`), using `PuzzleFamilyShell`, `usePuzzleState`, `useCelebration`, tap-cycle and drag-sweep as star battle.

Board: counts above the columns and right of the rows, coloured by `lineStatus`; anchors drawn with `Anchor` (sarcophagus) and not tappable; spent squares around a placed mummy; conflicts ringed.

Copy under `pairPuzzle.*` (en + nl): `name.mummies` "Mummy Rest" / "Mummierust"; `goal.mummies`; `rules.mummies.{pair,count,touch,enter}`; `hint.mummies.{mistake, <every PAIR_TECHNIQUES rung>[.variant], action.*}`.

- [ ] **Step 1: Write the failing tests**: board spec — anchors render no button; a count turns to the met class when its line holds its count and to the broken class when over; hint spec — on 20 reachable states the hint never decides an anchor cell.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** skin, glyphs, board, rules, hint, screen, copy.
- [ ] **Step 4: Register** in `plugin.tsx` (gated on `isModEnabled("puzzle")`) and import it last in `src/mods/puzzle/app/index.ts`.
- [ ] **Step 5: Add** both new mechanics to `docs/game-design/PUZZLE_FAMILIES.md` (catalogue: debut tier, theme fit, lab-only until bake integration).
- [ ] **Step 6: Run** `yarn vitest run src/mods/puzzle src/i18n` — PASS.
- [ ] **Step 7: Look at it** in the puzzle lab at master and wizard, play to solved, screenshot at 360×640; check Review Focus 3 by hand.
- [ ] **Step 8: Commit** — `git commit -m "feat: mummy rest in the puzzle lab"`

### Task 9: Whole-branch gate

- [ ] **Step 1:** `yarn verify` — expected: lint, types, all specs and betterer pass.
- [ ] **Step 2:** `yarn verify-content` and `yarn verify-seeds` — pass.
- [ ] **Step 3:** `git diff origin/camp/home-and-loot -- src/data/` — expected: empty (world, ledger, fingerprints, seeds untouched).
- [ ] **Step 4:** `grep -n "REGIONLESS\|PAIR_PUZZLE" src/mods/puzzle/index.ts` — expected: no match (lab-only).
