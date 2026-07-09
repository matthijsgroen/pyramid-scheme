# Plan — Fez shop mechanic + money economy

Branch `rimrock-mogote` follow-up. Status: **planning, not started.**

## Concept
Each tomb (junior→wizard, ~9 tombs; starter stays shop-free for onboarding) gets an
**ungated sidepath** (puzzles/traps en route, no key) ending in a **Fez shop**. The shop
sells consumables (fixed stock per visit) + **one rare collectible** — a fragment / map /
mosaic slot **relocated** from a pyramid into the shop (still one of the 647, just
purchase-gated instead of entry-granted).

Two money sources, both deterministic world-gen loot:
- **Found money** (some consumable drop slots become money).
- **Sellable junk loot** — theme-tied items sold to Fez.

Consumable drop rates get lowered to make room.

## Locked decisions
- **Shop stock**: fixed per visit, session-local cap (e.g. 2 each consumable), refreshes on
  re-entry. No persistent per-shop counter. Rare item = one-time (claimed-flag via
  existing inventory-as-truth).
- **Shop gate**: free/ungated sidepath. Fez reachable once tomb found.
- **Collectible source**: RELOCATE from the capped 647 → money is **mandatory** for 100%.
- **Price point**: default so `Σ(all rare prices)` ≈ 50% of total global income (generous
  slack for optional consumable buys, low soft-lock). Prices still scale by tier
  (wizard priciest). Tunable, flag for playtest.

## Economy model (soft-lock-critical)
- **Money = single global wallet.** Spendable at ANY shop regardless of tier. Shops are
  revisitable (re-enter tomb; stock refreshes; rare item persists until bought). So the
  player can earn late and **backtrack** to buy at an earlier tomb, or save early for a
  pricey wizard item.
- Sources (deterministic): money drops + junk sell-value.
- Sinks: consumables (optional — also still findable) + rare collectible (mandatory).
- **Guard (new, throws at build)**: `Σ(ALL shop collectible prices) ≤ Σ(ALL guaranteed money
  income)` — GLOBAL cumulative, not per-tier (backtracking makes it any-order affordable).
  Keep comfortable slack (see price point) so optional consumable buys don't soft-lock 100%.
- Prices scale by `MaterialTier` (stone→divine); **wizard highest** = the "best treasures".

## Key file anchors (from code map)
- Consumables: `src/game/siteTypes.ts:3` (`ConsumableType`); rates in `src/worldGen/dsl.ts:83-86,147-150`
  (`consumableDensity`, `consumableRates`); defaults `src/worldGen/spec/global.ts:24`; chest cadence `src/worldGen/data.ts:92-101`.
- Progression state: `src/app/state/useProgression.ts` (state `:29-43`, storage key `:107` = `v3`).
- Collectible cap/guards: `src/worldGen/worldSpec.ts:17-20` (targets), `src/worldGen/validate.ts:48-53` (throws),
  `src/worldGen/configBuilder.ts:90-112` (chest capacity), `src/worldGen/mosaics.ts:38,86` (mosaic spread).
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
  `MaterialTier` + `materialTierByDifficulty` reusable for junk theming.

## Phases

### 1 — Currency + type plumbing
- `ProgressionState.money: number` + `addMoney(n)` / `spendMoney(n): boolean`.
- Bump storage `v3`→`v4`; migration defaults `money:0`.
- New `TreasureReward` variants: `{type:"money",amount}`, `{type:"sellable",itemId}`, `{type:"shop",...}`.
- Money counter in `SiteHudBar`.

### 2 — Money & junk loot (world-gen only)
- New `PathEndHint` `"money"` / `"sellable"`; `hintToReward` maps them (uncapped like consumables).
- Lower `consumableDensity`; convert a fraction of consumable slots → money/sellable (seeded, deterministic).
- `src/data/sellables.ts`: one themed junk item per `MaterialTier` + sell value.

### 3 — Shop room + relocation + guard
- New `endReward.type:"shop"` on one ungated sidepath per tomb (authored in `spec/*.ts`).
- Relocate one collectible slot per tomb into its shop's rare stock. Still counted in 647
  (validators unchanged). Reserve it so `fragments.ts` fallback doesn't fill it.
  **No `chance` on shop slots** — must stay deterministic (same reason mosaic+chance is unsafe).
- Add money-budget guard in `configBuilder`/`validate` (throws).

### 4 — Shop UI
- Shop modal reusing `LootPopup`/`ChestRewardFlow` styling: stock list, prices, balance,
  buy + "can't afford" states, per-visit stock cap.
- Fez hosts (cocktail pose + new shop conversation).
- Extend claim switch `SiteMapScreen.tsx:212-253`: purchase = `spendMoney` then grant/claim item.

### 5 — Balance, tests, docs
- Tests: economy guard (income ≥ prices), spend/earn state, 647 total still holds.
- `yarn world-info` / `generate-world` extended with money + junk counts.
- Update stale loot numbers in `docs/game-design/pyramid-interior-design.md`.

## Gotchas
- Storage v3→v4 migration for existing saves.
- Inventory-as-truth: purchased collectible recorded exactly like a found one; skipping a shop = incomplete.
- Junk items are a NEW set, distinct from the 40 tomb treasures.
- Shop slot must be reserved against the fragment fallback back-fill.
