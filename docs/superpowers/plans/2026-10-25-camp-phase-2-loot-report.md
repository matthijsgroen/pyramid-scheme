# Camp phase 2 — the loot report — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md).

**Goal:** `yarn loot-report` reads the baked world and shows, per tier and per journey level, every loot slot and what fills it (by reward type), the empty puzzle rooms, the share of puzzles with loot, the chests and path ends filled, and every currency's total against its demand. It prints tables and writes `docs/loot-report.md` (committed, so every later bake shows what moved). The bake refuses an empty chest or path end, and that refusal is pinned for every kind of loot end. The puzzle-loot share is reported, never enforced.

**Architecture:** Core gets one pure function, `buildLootReport`, in `src/worldGen/lootReport.ts`: it walks `Record<string, SiteConfig[]>`, classifies each slot (puzzle room, main-path chest, path end, shop stock) by its section's tier, and counts rewards by their opaque `type` string. It names no mod and no reward type; it recognises a shop the way the carve does, through an injected `ResolveEncounter` and `CARVE_FAMILY_QUERIES.fezShop` (`src/game/carve/roomSpecs.ts`). Demand comes through a new descriptor field, `lootTotals(configs) => LootTotal[]`, merged in `registeredMods.ts` as `MOD_LOOT_TOTALS`: each mod reports its own currency's placed count against its own needed count (hieroglyph fragments, mosaic, map pieces, tomb treasures, waterskins, coins, sellables, shop stock against income). A mod toggled off drops its rows. A pure renderer turns the report into deterministic markdown; `scripts/lootReport.ts` (the only file with `fs` and `console`) wires the baked configs, the real resolver and `MOD_LOOT_TOTALS` together. The empty-loot refusal already exists as `findEmptyChests` in `src/worldGen/validate.ts`, run by `scripts/generateWorld.ts` on every assembled floor; this phase pins its coverage instead of adding a second check (decision 1).

**Tech Stack:** TypeScript, Vitest, tsx scripts, Prettier (markdown), the baked world (`src/data/generatedWorld.ts`), the bake (`yarn generate-world`).

**Spec:** `docs/handover-camp-release.md` (Phase 2 brief, "How the driver session works", Decisions), `docs/superpowers/specs/2026-10-23-camp-loot-design.md` ("Slots", "No softlock: the per-gate guard", "Every chest carries loot; puzzles only partly"), `docs/mods/TARGET.md` (core names no mod; toggle-off is the gate; a mod owns its own target count).

## Global Constraints

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. Commit after every task.
- **Core is mod-agnostic.** `src/worldGen/lootReport.ts` and its spec name no mod, no family id other than through `CARVE_FAMILY_QUERIES`, and no reward type: reward types are opaque strings it counts. The `no-restricted-imports` rules stay at zero. Mod knowledge (fragments, mosaic, map pieces, tomb treasures, waterskins, coins, sellables, buyable stock) lives only in each mod's `lootTotals`.
- **No unit test pins a count of the real world** or authored lock/puzzle content. Every spec builds a made-up world (two or three tiny journeys). A mod's `needed` may be asserted against the mod's own exported constant by reference (e.g. "equals `MOSAIC_TOTAL`"), never as a literal.
- **The world does not change.** No task touches world-gen placement, the DSL, or authored numbers. `yarn generate-world` in Task 5 must leave `src/data/generatedWorld.ts` byte-identical; any diff there stops the phase (write it under Failures in the review list).
- **Domain code** (`src/worldGen/`, `src/mods/*/game/`) stays pure TypeScript: no `fs`, no `console`, no React, no i18n. Labels in the report are plain English developer text (the report is a dev doc, not UI); no locale keys.
- **Comments state the current state and why, never history.** The markdown file carries no timestamp, commit hash or run time, so two runs on the same bake write the same bytes.
- **Commits:** one subject line, `type: what changed`, ≤ 72 chars, ending with the session's attribution trailer.
- **Checks per task:** the task's own specs, `yarn check-types`, `yarn lint`. Only Task 5 runs the bake, `yarn loot-report`, `yarn verify`, `yarn verify-content` and `yarn build`, each under `timeout 900`.
- **No CHANGELOG entry**: nothing a player sees changes (AGENTS.md asks for one per user-facing change).
- The phase's last step updates the handover's "State" and ticks Phase 2 there (driver's job, not a task).

## Review Focus

1. **Core names no mod.** `lootReport.ts` counts `reward.type` strings and finds shops through the injected resolver; the lint import rules stay at zero; a mod's rows come only from its `lootTotals` (Tasks 1, 2).
2. **Slot classification matches the carve.** A section whose encounter resolves to the shop family is shop stock (its `rewards[]`), never puzzles and never a path end; a section ending in a staircase is no path end; a floor's chest is its main-path end on an `exit` or `none` floor; a puzzle room's tier is its section's tier, not its journey's (Task 1).
3. **The share is reported, never enforced.** No check, test or guard fails on a low puzzle-loot share (Tasks 1, 4).
4. **The bake refuses every kind of empty loot end** — main-path chest, side path end, sub path end, hidden path end, unstocked shop — and leaves a floor-key host and a puzzle room alone (Task 3, soundness).
5. **The extension point for phase 4 is the same field.** "Money needed before each gate" arrives as more `LootTotal` rows from the shop mod (one per gate: income before it against the price of everything buyable before it); no structure for it is built now (Task 2).
6. **The markdown is deterministic** and regenerated only by `yarn loot-report` (Task 4, decision 2).

## Decisions for the review list

Each is the option that changes the least shipped behaviour; Task 5 writes them into `docs/review-camp-release.md` under Decisions, each prefixed `Phase 2 —`.

1. **The empty-loot refusal is the existing bake check, pinned, not a second one.** `findEmptyChests` already stops `yarn generate-world` (and `yarn validate-world`) on any treasure or shop room that holds nothing, judged on the assembled floor so a floor-key host (a chest the carve hands a key) is not mistaken for an empty one. A config-level check could not tell a key host from an empty chest. Task 3 pins it for every kind of loot end. Alternative: a second, config-level `WorldValidator` in `buildConfigs`, which would refuse a `loot: false` key host.
2. **`yarn generate-world` does not write `docs/loot-report.md`.** `yarn loot-report` is its own command, run in the last task of every phase that bakes (3, 5, 9); the bake prints one line pointing at it. The bake stays a world writer only, and its run time and output stay as they are. Alternative: chain `yarn loot-report` into `generate-world`, so the doc can never go stale.
3. **"Every slot" is counted by reward type per level, not listed one per line** in the doc (about 3000 lines). `yarn loot-report --journey <id>` prints one journey's slots one per line on the console. Alternative: list every slot in the doc.
4. **Puzzle rooms are counted as in phase 1**: a floor's or non-shop section's `pathPuzzles`, with loot = its defined `rewards[]` entries, by section tier. So the phase 1 numbers and this report compare one to one. Loot-ineligible rooms (tableaus, traps, the crocodile) count as puzzle rooms without loot. Alternative: count only loot-eligible rooms (reward priority above 0).
5. **Demand reaches the report through a new descriptor field, `lootTotals`.** Each mod reports its currency's placed and needed counts; core never learns what a fragment or a coin is, and a toggled-off mod's rows drop. Alternative: let `scripts/lootReport.ts` import each mod's numbers directly, as `scripts/worldInfo.ts` names reward types.
6. **Demand rows in phase 2:** hieroglyph fragments placed against the fragments the tableaus need (`HIEROGLYPH_REQUIRED`); mosaic pieces against `MOSAIC_TOTAL`; map pieces against the tombs' summed `piecesRequired` (`WORLD_TARGETS.mapPieceRewards`); tomb treasures (ward and location keys) placed against the treasure catalogue, plus every tomb-key gate whose key is placed; waterskins (no demand, count only); coins (count and total value); sellables (count and sell value); income (coins + sell value) against the shop's buyable stock (`totalBuyable`). Camp finds and structure parts arrive with phase 3's camp mod; money before each gate with phase 4. Alternative: report counts only, demand later.
7. **Loot ends without a reward in the spec** (a floor-key host, or a `loot: false` end) are listed in the report under their own heading rather than counted as empty: the bake has already refused any that are truly empty. Alternative: count them as empty.

---

### Task 1: The report, a pure function over the configs

**Files:**

- Create: `src/worldGen/lootReport.ts`, `src/worldGen/lootReport.spec.ts`

**Interfaces:**

- Produces: `LootTotal = { label: string; found: number; needed?: number; unit?: "count" | "coins" }` — one currency's world total as its mod reports it. No `needed` means "reported, no demand".
- Produces: `LootSlot = { journeyId; levelNr; floorIndex; place: string; kind: "puzzle" | "chest" | "pathEnd" | "shopStock"; tier: Difficulty; hidden: boolean; rewardType?: string; reward?: TreasureReward }` — `place` is a readable path ("main", "side 2", "side 2.1", plus "#k" for the k-th puzzle or stock slot).
- Produces: `buildLootReport(configs: Record<string, SiteConfig[]>, options: { resolveEncounter: ResolveEncounter; totals: LootTotal[]; journeyTier: (journeyId: string) => Difficulty | undefined }): LootReport` with:
  - `slots: LootSlot[]` in walk order (journey id order, level, floor, main path then each side section then its subs; puzzles, then the end);
  - `byTier`: per tier in difficulty order — puzzle rooms, puzzles with loot, share (0 when there are no puzzles), empty puzzle rooms, chests filled/total, path ends filled/total, shop stock filled/total, and counts per reward type per slot kind;
  - `byLevel`: per journey and level (grouped by the journey's own tier through `journeyTier`) — the same columns;
  - `unrewardedEnds: LootSlot[]` — chests and path ends with no reward in the spec;
  - `totals: LootTotal[]` passed through in the given order, each with `short` (needed − found when positive) and `surplus` (found − needed when positive) filled in where `needed` is set.
- Produces: `renderLootReportMarkdown(report: LootReport): string` — the doc: a title, one line saying it is written by `yarn loot-report` from `src/data/generatedWorld.ts` and not edited by hand, then "Totals against demand", "Per tier", "Per journey" (one table per tier, a row per journey level, fills written as `money 12 · sellable 3`), and "Loot ends without a reward in the spec" ("None." when empty). No timestamp.
- Consumes: `ResolveEncounter` (`src/game/siteAssembler.ts`), `CARVE_FAMILY_QUERIES` (`src/game/encounterFallback.ts`), `SiteConfig` (`src/worldGen/types.ts`).

- [x] **Step 1: Failing tests** on a made-up world (two journeys, three or four tiny floors; a stub resolver that answers a made-up shop encounter id with the shop family's id, everything else with a puzzle family):
  - a floor with 3 puzzles and `rewards` [money, undefined, waterskin] counts 3 rooms, 2 with loot, 1 empty, share 2/3, and its fills per type;
  - a floor's main-path end on an `exit` floor and on a `none` floor is a chest; on a `staircase` floor it is no slot;
  - a side section ending in `treasure` is a path end; one ending in a staircase or `{ stairId }` is not; a sub-section's end counts too; a hidden section's slots carry `hidden`;
  - a section whose encounter resolves to the shop family is shop stock (each `rewards[]` entry a stock slot, filled or not), adds no puzzle rooms and no path end;
  - a puzzle room is tiered by its section's difficulty: a junior side section inside a starter floor lands in the junior row of `byTier`, while `byLevel` keeps it under its journey;
  - a chest or path end with no reward is in `unrewardedEnds`, not in the filled counts;
  - a tier with no puzzle rooms reports a share of 0, not `NaN`;
  - `totals` pass through in order; `short` and `surplus` are set only where `needed` is, and never both;
  - `renderLootReportMarkdown` gives the same string for the same report twice, holds every heading above, writes "None." with no unrewarded ends, and holds no digit-run that looks like a date or time it was not given.
- [ ] **Step 2: Run** `yarn test src/worldGen/lootReport` — FAIL.
- [x] **Step 3: Implement.** One walk, the shapes above. The file's top comment says what the report is for (the designer reads the loot in the world without opening the bake) and that core counts reward types without knowing them.
- [x] **Step 4: Run** the spec — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: a pure loot report over the world configs`

---

### Task 2: Each mod reports its own totals against its own demand

**Files:**

- Modify: `src/mods/modDescriptor.ts` (adds `lootTotals?: (configs: Record<string, SiteConfig[]>) => LootTotal[]`, with a comment: a mod's own placed-against-needed counts for `yarn loot-report`; drops with the mod)
- Modify: `src/mods/registeredMods.ts` (adds `MOD_LOOT_TOTALS(configs): LootTotal[]`, every registered mod's rows in registry order)
- Create + register: `src/mods/hieroglyph/game/lootTotals.ts` + spec — fragments placed against `HIEROGLYPH_REQUIRED`, through `hieroglyphCoverage`
- Create + register: `src/mods/mosaic/game/lootTotals.ts` + spec — mosaic pieces placed against `MOSAIC_TOTAL`
- Create + register: `src/mods/tombTreasure/game/lootTotals.ts` + spec — map pieces placed against `WORLD_TARGETS.mapPieceRewards`; tomb treasures placed against the treasure catalogue; tomb-key gates whose key a placed treasure grants against all tomb-key gates
- Create + register: `src/mods/trap/game/lootTotals.ts` + spec — waterskins placed (no `needed`)
- Create + register: `src/mods/shop/game/lootTotals.ts` + spec — coin drops (count) and coins (total, unit coins); sellables (count) and sell value (unit coins, `sellValueForItemId`); income (coins + sell value) with `needed` = `totalBuyable`
- Modify: each of those five mods' `index.ts` (the `lootTotals` field)

**Interfaces:**

- Consumes: `LootTotal` from Task 1.
- Produces: `MOD_LOOT_TOTALS(configs): LootTotal[]`.
- Extension point (not built): phase 3's camp mod adds its found-item and structure-part rows here; phase 4's shop mod adds one row per animal gate (income reachable before it against everything buyable before it). Same field, same row shape.

- [x] **Step 1: Failing tests** per mod, each on a made-up `Record<string, SiteConfig[]>` holding a few of that mod's rewards on puzzle slots, path ends, chests and shop stock, plus some other types it must ignore: the row counts only its own type, wherever it lies (puzzle, chest, path end, sub-section, shop stock); `needed` equals the mod's own constant by reference; the shop's income row adds coins and sell value. One `registeredMods` spec: `MOD_LOOT_TOTALS` returns rows in registry order and is empty for an empty world without throwing.
- [ ] **Step 2: Run** `yarn test src/mods` — the new specs FAIL.
- [x] **Step 3: Implement.** Each mod reads only its own reward type; labels are plain English ("Hieroglyph fragments", "Mosaic pieces", "Map pieces", "Tomb treasures", "Ward gates with their key", "Waterskins", "Coin drops", "Coins", "Sellables", "Sell value", "Income against buyable stock"). No mod imports a sibling.
- [x] **Step 4: Run** `yarn test src/mods src/worldGen` — PASS. `yarn check-types`, `yarn lint` (import rules at zero).
- [x] **Step 5: Commit** — `feat: mods report their loot against their demand`

---

### Task 3: The bake refuses every empty chest and path end (**soundness**: the bake)

**Files:**

- Modify: `src/worldGen/validate.spec.ts` (the `findEmptyChests` block) or create `src/worldGen/emptyLootEnds.spec.ts` beside it
- Modify, only if a spec below fails: `src/worldGen/validate.ts` (`findEmptyChests`) and/or `scripts/generateWorld.ts` (its message)
- Read: `src/game/carve/carveFixtures.ts`, `src/game/carve/roomSpecs.ts` (`endRoomSpec`), `src/game/carve/sections.ts` (key hosts)

**Interfaces:**

- Consumes: `findEmptyChests(configs, assembleFloorAt)`; `assembleFloor` with the fixtures' resolver.
- Produces: no new API. The refusal message names, per empty end, its journey, level, floor and cell (as now) and the place ("main", "side n", "side n.m") where the assembled cell can tell it.

- [x] **Step 1: Tests on assembled made-up floors** (the carve fixtures, not the real world): a floor whose main-path chest, side path end, sub path end and hidden path end all hold no reward — each assembled end is named by `findEmptyChests`; the same floor with a reward on each end — nothing named; a free treasure end the carve turns into a floor-key host — not named; a shop end whose stock is all empty — named, one with stock — not named; a puzzle room with no loot — not named. The existing grid-only cases stay.
- [x] **Step 2: Run** `yarn test src/worldGen/validate src/worldGen/emptyLootEnds`. A failing case is a real gap: fix `findEmptyChests` (or what it reads) so the case passes, never the test. If every case passes on the first run, the guard is proven as it stands and only the specs are committed.
- [x] **Step 3: The bake points at the report:** `scripts/generateWorld.ts` prints one line after writing the world: run `yarn loot-report` to refresh `docs/loot-report.md`.
- [x] **Step 4: Per-task review** (soundness): every loot-end kind the carve builds (`endRoomSpec`, the main-path end, relayed key hosts) is covered by a case; nothing the guard skips can hold loot a player is owed.
- [x] **Step 5:** `yarn check-types`, `yarn lint`. **Commit** — `test: the bake refuses every kind of empty loot end`

---

### Task 4: `yarn loot-report`

**Files:**

- Create: `scripts/lootReport.ts`
- Modify: `package.json` (`"loot-report": "tsx scripts/lootReport.ts && yarn prettier --write docs/loot-report.md"`)
- Modify: `AGENTS.md` (one line under the command list: `yarn loot-report` — the loot in the baked world against demand, writes `docs/loot-report.md`)

**Interfaces:**

- Consumes: `generatedWorldConfigs`, `resolveEncounterMeta` (`src/mods/allFamilyMeta.ts`), `MOD_LOOT_TOTALS`, `PYRAMID_JOURNEYS` / `TOMB_JOURNEYS` (for `journeyTier`), `buildLootReport`, `renderLootReportMarkdown`.
- Produces: the command. With no flags it prints the totals table and the per-tier table to the console (padded columns, as `scripts/worldInfo.ts` does) and writes `docs/loot-report.md`. `--journey <id>` also prints that journey's slots one per line (level, floor, place, kind, tier, reward type and its fields). It never fails on a low share and exits non-zero only when the configs cannot be read.

- [ ] **Step 1: Implement** the script (no logic beyond wiring and printing; everything it counts comes from Task 1 and Task 2).
- [ ] **Step 2: Run** `yarn loot-report` and `yarn loot-report --journey <any pyramid id>`; read the output: totals carry a found and needed column, every tier has a row, the share column reads like the phase 1 numbers in `docs/review-camp-release.md` (it uses the same definition; a large difference is a classification bug — fix it in Task 1's function with a made-up case that shows it). Do not commit `docs/loot-report.md` yet: `git checkout -- docs/loot-report.md` if it exists, or delete it.
- [ ] **Step 3:** `yarn check-types`, `yarn lint`. **Commit** — `feat: yarn loot-report prints and writes the loot in the world`

---

### Task 5: Bake, report, gate (**soundness**: the bake)

**Files:**

- Create (by the script): `docs/loot-report.md`
- Modify: `docs/review-camp-release.md` (decisions, numbers)
- Modify: `docs/superpowers/plans/2026-10-25-camp-phase-2-loot-report.md` (tick boxes)

**Interfaces:** none.

- [ ] **Step 1: Bake** — `timeout 900 yarn generate-world`. Then `git diff --exit-code src/data/generatedWorld.ts` must be clean (carve-ledger hashes may move from comment edits; nothing else). A failure or a diff is a stop: write it under Failures in the review list.
- [ ] **Step 2: Report** — `timeout 900 yarn loot-report`. Run it a second time: `git diff` on `docs/loot-report.md` between the two runs is empty (determinism).
- [ ] **Step 3: Toggle-off** — remove `trapMod` from `REGISTERED_MODS` (and its import), run `yarn loot-report` (no waterskin row, no crash), `yarn check-types`; then `git checkout src/mods/registeredMods.ts docs/loot-report.md` and confirm `git status --short` holds only the files this task makes.
- [ ] **Step 4: Gate** — each under `timeout 900`: `yarn verify`, `yarn verify-content`, `yarn build`. All pass.
- [ ] **Step 5: Record** in `docs/review-camp-release.md`: this plan's seven decisions under Decisions (`Phase 2 —`, with their alternatives); a "Phase 2 loot" block with the headline numbers from the report — per tier the puzzle-loot share and empty puzzle rooms, chests and path ends filled, and every total against its demand (short or surplus) — plus one line that `docs/loot-report.md` is the full table and is refreshed by `yarn loot-report`; the toggle-off result; the gate result. Tick this plan's boxes.
- [ ] **Step 6: Commit** — `docs: the loot report and its numbers`

The driver then runs the phase review (Sonnet), pushes the branch, ticks Phase 2 in `docs/handover-camp-release.md` and adds one line to its State.
