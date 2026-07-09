# Plan — Fez shop mechanic + money economy

Branch `rimrock-mogote` follow-up. Status: **design locked, 2026-07-09. Not built.**
Phase 4 (UI) partially started — see PR #104 (`ShopBalance`/`ShopItemCard`/`ShopPanel`, presentational only).

## Concept
8 shops total (junior→wizard, ~9 tombs; **starter stays shop-free** for onboarding — 9
tombs minus starter = 8 shops). Each sits on an **ungated sidepath** off its tomb (puzzles/
traps en route, no key), ending in a **Fez shop**. Shop sells consumables (fixed stock per
visit) + 1-2 rare collectibles, relocated from the capped 647 pool (fragment/mosaic/
mapPiece — never tombKey, see Gotchas).

**Big structural change (locked 2026-07-09):** removes the mid-path chest mechanic
entirely and moves the whole "everyday loot" layer onto puzzle-solve rewards. See
[World reshape](#world-reshape-locked) below — this is bigger than the original DSL-only
scope, touches `siteAssembler.ts` reward placement directly.

## Shop stock list (locked)

8 shops, 13 rare slots. `2x` = mixed fragment+mosaic; `1x` = solo slot.

| Tomb | Tier | Slot(s) |
|---|---|---|
| junior_treasure_tomb | junior | fragment + mosaic |
| expert_treasure_tomb | expert | fragment + mosaic |
| expert_treasure_tomb_b | expert | fragment |
| master_treasure_tomb (Hall of Ma'at) | master | fragment + mosaic |
| master_treasure_tomb_b (Hall of Osiris) | master | **mapPiece** — always the piece that unlocks the *last* tomb (forward-only dependency, no backtrack softlock; never place mapPiece in the actual last shop) |
| wizard_treasure_tomb (Vault of Gods A) | wizard | fragment + mosaic |
| wizard_treasure_tomb_b (Realm of Cosmic Forces) | wizard | fragment + mosaic |
| wizard_treasure_tomb_c (Throne of Eternity) | wizard | mosaic |

6 fragment + 6 mosaic + 1 mapPiece = 13 slots.

## Prices (locked)

- **Fragment**: `250 + 50 × difficultyLevel` (difficulty index: starter=0, junior=1,
  expert=2, master=3, wizard=4). junior 300, expert 350, master 400, wizard 450.
  Fragment subtotal (6 slots): **2,300**.
- **Mosaic**: flat **500** regardless of tier (completionist item, not tied to difficulty
  of finding it). Subtotal (6 slots): **3,000**.
- **MapPiece**: flat **1,000** (rarest item, gates the final tomb). Subtotal: **1,000**.
- **Rares total: 6,300**.
- **Consumables** (bought optionally, same stock everywhere): bandage 20, oil 50,
  trapTool 40; stock 2 each per shop visit (refreshes on re-entry). 8 shops ×
  (2×20+2×50+2×40) = **1,760**.
- **Grand total buyable: 8,060** — the target for `Σ guaranteed income` (see guard below).
  Guard is now exact-total, not a 50%-slack estimate: income must cover *everything*
  purchasable (mandatory rares + one full stock of consumables per shop), not just the
  mandatory subset with a buffer.

## World reshape (locked, numbers corrected 2026-07-09)

Old mid-path chest mechanic (`chestEvery` cadence, 261 rooms total — confirmed via
`scripts/worldInfo.ts` `chestNodes`, 100% consumable, all separate maze rooms) is
**removed entirely**. Real shrink: fewer reward rooms exist after this than before, no
rooms added anywhere. Replaced by:

- **End-of-path rooms (857 total across the game — one per floor/side-section,
  room count unchanged):**
  - **647 untouched**: fragment(273) + mosaic(298) + mapPiece(36) + tombKey(40) — the
    hard collectible ceiling, still validator-enforced, no change to placement logic.
  - **180 flexible slots** (156 section/sub-section end-rewards + 24 floor-level
    `mainEndReward`, both currently type `consumable` — counted exactly against
    `generatedWorld.ts`) become **higher-end junk loot**, sell-value tiered by
    `MaterialTier`: stone 10 / bronze 20 / silver 30 / gold 40 / divine 50. Weighted by
    pyramid-count-per-tier, avg ≈32.7 → 180 × 32.7 ≈ **5,886** income.
  - 6 side-section onboarding empties (starter.ts, render `{type:"hieroglyphs"}` via
    `section.endReward ?? {type:"hieroglyphs"}` in `siteAssembler.ts:944,1016`) stay
    empty — untouched, existing intentional design. There is no separate "24 empty
    floor-ends" set rendering this placeholder — the only true "grant nothing" case in
    the entire game is these 6 starter slots.
  - **Pre-existing bug found + fixed in this pass**: a floor with no `mainEndReward` set
    (any non-last floor when `mainFloors > 1`) falls back to `{type:"mosaicPiece"}`
    (`siteAssembler.ts:842`) — a free, **uncounted** mosaic piece `validate.ts`'s
    298-budget guard can't see (it only reads stored config, never this runtime
    fallback). Empirically verified against `generatedWorldConfigs` (not assumed):
    exactly **24 floors** hit this — **3 starter** (stone tier) + **21 wizard**
    (divine tier, `spec/wizard.ts:10` `mainFloors:2` × 21 wizard pyramids); no other
    tier sets `mainFloors > 1`. Fix (implemented): give these 24 floors an explicit
    `{type:"fragmentSlot"}` mainEndReward instead of leaving it unset — routes them
    through the *same* budget-aware `assignFragments` pipeline every other unset reward
    slot already uses, rather than a bespoke direct-assign. Trade-off: these 24 slots now
    compete in the shared fragment-priority pool (`fragments.ts`), so a slot occasionally
    resolves to a real `hieroglyphFragment` instead of junk — harmless (total fragment
    count stays exactly 273, validator-enforced) but means the "3×10 + 21×50 = 1,080"
    junk value for this bucket is an **estimate, not a guarantee** (confirmed: an actual
    `yarn generate-world` run landed junk at 201 total vs. the 204-slot estimate — a few
    of these 24 became real fragments). Phase 3's exact-income guard must validate
    against the *realized* totals from a generated world, not this pre-computed estimate.
  - **Total junk-loot slots: ~204** (180 + up to 24, some of the 24 may resolve to a
    real fragment instead). **Total junk income: ≈6,966**, realized ≈6,000-7,000
    depending on how many of the 24 land as fragments vs junk.
- **Puzzle-solve rewards (1,714 total puzzles — 1,664 pyramid + 50 tomb — currently
  reward nothing on solve):** new delivery mechanism for "everyday loot":
  - **Consumables**: the ~441 instances that used to live in mid-path chests + the 180
    consumable end-rewards move 1:1 onto puzzle solves. Same total volume, new delivery
    point — no net change to how often a bandage/oil/trapTool is found. Type distribution
    keeps reading the existing per-tier `consumableRates` DSL knob (bandage/oil/trapTool
    weights authored in `spec/*.ts`) — do not hardcode a flat global rate.
  - **Loose money** (seeded random 1-10, avg 5.5): covers the remainder of the 8,060
    target not covered by junk end-rewards → 8,060 − 6,966 ≈ 1,094 → ≈**199 puzzles** get
    a money drop.
  - Total puzzles carrying any reward: 441 + 199 = 640 of 1,714 (~37%); 1,074 stay plain.
  - **Selection algorithm (locked)**: deterministic shuffle + slice, not a per-puzzle
    `chance` roll — seed a shuffle per journey (reuse `hashStr` + `mulberry32` + `shuffle`
    from `worldGen/rewards.ts`/`game/random.ts`), take the first N indices. Guarantees the
    exact split, no drift from probabilistic rolling.

Net effect: **zero new rooms**, 261 rooms deleted outright, 8,060 income target hit
exactly (6,966 junk + 1,094 money), all 647 mandatory collectibles and their placement
logic untouched, consumable find-rate unchanged (just relocated), plus a pre-existing
uncounted-mosaic bug fixed along the way.

## Economy model (soft-lock-critical)

- **Money = single global wallet.** Spendable at ANY shop regardless of tier. Shops are
  revisitable (re-enter tomb; stock refreshes; rare item persists until bought). Player
  can earn late and **backtrack** to buy at an earlier tomb, or save early for a pricey
  wizard item.
- Sources (deterministic): puzzle-solve money drops + end-of-path junk (sellable items,
  sold manually at any shop — see below) + tombKey/treasure pickups feeding the existing
  generic inventory.
- Sinks: consumables (optional, also still free-findable via puzzles) + all 13 rare
  collectibles (mandatory for 100%).
- **Guard (new, throws at build)**: `Σ(ALL shop prices, rares+consumable stock) ≤
  Σ(ALL guaranteed income)` — GLOBAL cumulative, not per-tier (backtracking makes it
  any-order affordable). Target is now the exact total (8,060), not a padded estimate.
  Junk counts toward guaranteed income at its full sell value even though realizing it
  requires a manual sell action — selling is never optional/skippable en route to 100%
  (money is mandatory for the 13 rares), so treating find-value as guaranteed is safe.

## Sellables are real inventory items, not instant money (locked 2026-07-09)

**Not** auto-converted to money on pickup. A `{type:"sellable", itemId}` reward adds the
item to the game's existing generic inventory system — `src/app/Inventory/useInventory.ts`
(`addItem(id, count)`, storage key `inventory-v2`, already used for hieroglyph
deities/professions/animals/artifacts and tomb treasures, count-based `Record<string,
number>`). No new persistence layer needed.

- `src/data/sellables.ts` items need the same shape as `src/data/inventory.ts`'s existing
  items: `{ id, name, symbol, description, sellValue, tier }` — the `description` carries
  historical-Egyptian flavor text (matches `treasures.ts`'s existing style), shown on the
  **Collection screen** (`src/app/pages/Collection.tsx`) as a new category, same pattern
  as `CategorySection`/`TreasureCategorySection`.
- **Selling** happens at any shop (money is global, backtracking-friendly, per the model
  above) — `removeItem(itemId, 1)` + `progression.addMoney(item.sellValue)`. This is a
  **Phase 3/4 UI addition** (`ShopItemCard` is currently buy-only, PR #104 — needs a sell
  variant/mode), not blocking on Phase 2.
- **Phase 2 scope**: world-gen produces `{type:"sellable", itemId}` rewards; the claim
  switch (`SiteMapScreen.tsx`) calls `addItem(reward.itemId, 1)` on pickup (needs
  `useInventory` imported there — not currently used in that file). That's the full
  extent of Phase 2's sellables work; the sell-UI and Collection-screen category land
  later.

## Key file anchors (from code map)

- Consumables: `src/game/siteTypes.ts:3` (`ConsumableType`); rates in `src/worldGen/dsl.ts:83-86,147-150`
  (`consumableDensity`, `consumableRates`); defaults `src/worldGen/spec/global.ts:24`.
- **Mid-path chest mechanic (being deleted)**: `chestEveryFor`/`chestCountFor`
  `src/worldGen/data.ts:92-101`; `buildChestRewards` `src/worldGen/buildSite.ts:12`;
  room insertion `buildIntermediateTypes` `src/game/siteAssembler.ts:228`.
- **Puzzle-reward hook (new)**: `RoomCell.reward` already supports any room type
  structurally (`src/worldGen/worldSpec.ts:34`) — needs a new branch in the claim switch
  for `roomType === "puzzle"` (currently `src/app/SiteMap/SiteMapScreen.tsx:179` does
  nothing on solve).
- Progression state: `src/app/state/useProgression.ts` (state `:29-43`, storage key `:107` = `v3`).
- Collectible cap/guards: `src/worldGen/worldSpec.ts:17-20` (targets), `src/worldGen/validate.ts:48-53` (throws),
  `src/worldGen/configBuilder.ts:90-112` (chest capacity — needs rework, chests are going away),
  `src/worldGen/mosaics.ts:38,86` (mosaic spread).
- Reward union: `src/game/siteTypes.ts:4-11` (`TreasureReward`). DSL hints: `src/worldGen/dsl.ts:10,24,26,158`.
  Hint→reward: `src/worldGen/rewards.ts:23-40`.
- Claim switch (single integration point): `src/app/SiteMap/SiteMapScreen.tsx:212-253`.
- Reward UI: `src/app/SiteMap/ChestRewardFlow.tsx`, `src/ui/atoms/LootPopup.tsx`.
- Tombs: `src/data/journeyStructure.ts:38` (`TOMB_STRUCTURES`), builder `src/worldGen/configBuilder.ts:198-272`,
  capabilities `src/worldGen/capabilities.ts:19-35`, tomb DSL `src/worldGen/dsl.ts:161-163,311`.
  Tomb sidepaths authored in `src/worldGen/spec/{junior,expert,master,wizard}.ts`.
- Fez (existing NPC — reuse): `src/app/fez/Fez.tsx` (poses incl. cocktail, conversations `:26+`),
  `src/app/fez/FezCompanion.tsx` (`showConversation`).
- HUD: `src/ui/atoms/SiteHudBar.tsx`.
- Treasures (the 40 tomb treasures — NOT junk, do not repurpose): `src/data/treasures.ts`;
  `MaterialTier` + `materialTierByDifficulty` reusable for junk theming (stone/bronze/silver/gold/divine).
- Shop UI (built, PR #104): `src/ui/atoms/ShopBalance.tsx`, `src/ui/atoms/ShopItemCard.tsx`,
  `src/ui/molecules/ShopPanel.tsx` — dumb/presentational, no state wiring yet.

## Phases

### 1 — Currency + type plumbing
- `ProgressionState.money: number` + `addMoney(n)` / `spendMoney(n): boolean`.
- Bump storage `v3`→`v4`; migration defaults `money:0`.
- New `TreasureReward` variants: `{type:"money",amount}`, `{type:"sellable",itemId}`, `{type:"shop",...}`.
- Money counter in `SiteHudBar`.

### 2 — Delete mid-path chests, move loot onto puzzles + end-rewards (world-gen)
- Remove `chestEvery`/`chestNodes`/`buildChestRewards`/`chestOffset` mid-path insertion
  entirely, incl. dead surface: `FloorConstraint.chestReward` (singular, never read),
  `assertChestCapacity`/`TOMB_CHEST_CAPACITY` (already unwired), `SubSection.chestEvery`
  (never written by any builder), defensive fragment/mosaic scans over `chestRewards` in
  `validate.ts`/`serializer.ts`/`useDetector.ts` (dead — chests never held those types).
- Fix the free-mosaic fallback bug (`siteAssembler.ts:842`,
  `config.mainEndReward ?? {type:"mosaicPiece"}` → seeded junk/`sellable` roll, same
  channel as the other 180 end-of-path slots, NOT a consumable roll) + add the missing
  regression test. Exactly 24 floors affected (3 starter/stone + 21 wizard/divine,
  verified against `generatedWorldConfigs`).
- New `RoomCell.reward` support on `roomType === "puzzle"`: three `RoomSpec`
  construction sites in `siteAssembler.ts` (main path ~857, section ~926, sub-section
  ~997) need reward-array threading mirroring the existing `chestRewards`/`mainChestIdx`
  pattern; claim-switch branch in `SiteMapScreen.tsx` (`handlePuzzleSolved`, ~line 105) —
  grant `cell.reward` at solve time, same `{reward, consumableFull?, onCollect}` shape
  `ChestRewardFlow` already consumes. Generalize the consumable-full deferral logic
  (`markConsumableSkipped`, currently hardcoded to `roomType==="treasure"`) to any
  `reward.type==="consumable"` room — otherwise a puzzle-solve consumable reward with a
  full pack silently vanishes instead of deferring.
- Seeded/deterministic shuffle+slice selection of ~640 of 1,714 puzzles to carry a
  reward (441 consumable, 199 money) — reuse `hashStr`+`mulberry32`+`shuffle`.
- Upgrade the 204 flexible end-of-path slots (156 section + 24 floor-level consumable +
  24 floor-level bug-fallback, see above) to tiered junk-loot rewards.
- `src/data/sellables.ts`: one themed junk item per `MaterialTier` + sell value
  (10/20/30/40/50), shape matches `src/data/inventory.ts` (`id`/`name`/`symbol`/
  `description` with Egyptian flavor text, plus `sellValue`/`tier`).
- Claim switch: `sellable` reward → `useInventory().addItem(reward.itemId, 1)` (import
  `useInventory` into `SiteMapScreen.tsx` — not currently used there). NOT an instant
  `addMoney` — see "Sellables are real inventory items" above. Selling happens later,
  Phase 4.
- Dev-tooling cleanup in the same pass: delete `configBuilder.spec.ts` (100%
  `assertChestCapacity` tests, already dead-code-only), update/remove chest controls in
  `SiteMapBuilder.stories.tsx`/`JourneyInspector.stories.tsx`, update chest-dependent
  tests in `buildSite.spec.ts`/`siteAssembler.spec.ts`/`capabilities.spec.ts`.
- `scripts/worldInfo.ts`: drop the `chests` column, add a `puzzleRewards`/`junk` column.

### 3 — Shop room + relocation + guard
- New `endReward.type:"shop"` on one ungated sidepath per tomb (8 of 9; starter excluded).
- Relocate the 13 rare slots per the locked stock list above. Still counted in 647
  (validators unchanged). Reserve so `fragments.ts` fallback doesn't fill it.
  **No `chance` on shop slots** — must stay deterministic.
- Add money-budget guard (exact-total, not slack-based) in `configBuilder`/`validate` (throws).

### 4 — Shop UI (started, PR #104)
- ~~Shop modal reusing `LootPopup`/`ChestRewardFlow` styling~~ → done as dumb components:
  `ShopBalance`, `ShopItemCard`, `ShopPanel`. Still needed: wire to real `ProgressionState`
  once Phase 1 lands; Fez hosts (cocktail pose + new shop conversation); extend claim
  switch for purchase = `spendMoney` then grant/claim item.
- **New**: sell-mode for junk. `ShopItemCard` is currently buy-only — needs a sell
  variant (shows player-held sellables from `useInventory`, action = `removeItem` +
  `addMoney(item.sellValue)`). Collection screen (`src/app/pages/Collection.tsx`) also
  needs a new category section for sellables, same pattern as `TreasureCategorySection`.

### 5 — Balance, tests, docs
- Tests: economy guard (income == exact total), spend/earn state, 647 total still holds,
  puzzle-reward distribution determinism.
- `yarn world-info` / `generate-world` extended with money + junk counts; drop the
  now-dead `chests` column, add a `puzzleRewards` column.
- Update stale loot numbers in `docs/game-design/pyramid-interior-design.md`.

## Gotchas

- Storage v3→v4 migration for existing saves.
- Inventory-as-truth: purchased collectible recorded exactly like a found one; skipping a shop = incomplete.
- Junk items are a NEW set, distinct from the 40 tomb treasures (`tombKey` — never repurpose).
- Shop slot must be reserved against the fragment fallback back-fill.
- The mapPiece relocated into Hall of Osiris must always be the piece that unlocks the
  *last* tomb specifically — forward-only dependency. Never relocate a mapPiece into the
  actual last shop (nothing left to unlock with it, and it'd need to be bought from
  inside the tomb it might otherwise gate).
- Deleting mid-path chests removes `assertChestCapacity` reasoning entirely — that check
  (stale even pre-this-change) can just go.
- 6 side-section onboarding empties (starter.ts) and the 24 empty floor-ends are NOT the
  same set — only the 24 floor-level ones become junk loot; the 6 side-section ones stay
  intentionally empty.
