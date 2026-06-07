# Handover: Treasure Effects Implementation

This document briefs the next agent on implementing the treasure effects system. The design is fully resolved — types and effect assignments are in place. What remains is the gameplay mechanics and UI text.

## What's Already Done

- `TreasureEffects` type fully defined in `src/data/treasures.ts` with JSDoc on every field
- `MaterialTier` type and `materialTierByDifficulty` / `difficultyByMaterialTier` lookup maps in `src/data/treasures.ts`
- All 40 treasures have effects assigned in `src/data/treasures.ts`
- Design documented in `docs/treasure-effects.md`

## What Needs to Be Done

### 1. Effect descriptions in translations

Each treasure needs an `effectDescription` translation key added alongside its existing `name` and `description`. This text is shown to the player when they find the treasure (in the loot popup) and in the collection screen.

Add `effectDescription` to every treasure entry in:
- `public/locales/en/treasures.json`
- `public/locales/nl/treasures.json`

The structure per treasure becomes:
```json
{
  "merchantCache": {
    "t1": {
      "name": "Silver Deben",
      "description": "An ancient Egyptian silver coin...",
      "effectDescription": "+10% map fragment chance"
    }
  }
}
```

Write short, concrete effect descriptions (one line). Examples by effect type:
- `mapFragmentChance: 0.1` → "+10% map fragment chance"
- `higherLootChance: 0.1` → "+10% loot drop chance"
- `moreLootChance { chance: 0.2, tier: "stone" }` → "20% chance of a bonus Stone item per pyramid"
- `moreLootChance { chance: 0.2 }` → "20% chance of a bonus item per pyramid (adapts to current difficulty)"
- `expeditionBonus { amount: 1, tier: "bronze" }` → "+1 Bronze item on expedition completion"
- `errorHighlight: true` → "Highlights one wrong block while solving"
- `earlyFeedback: true` → "Shows live feedback on checkpoint blocks"
- `hieroglyphUnlock: true` → "Unlock one hidden block per pyramid to write your value"

### 2. Show effectDescription in the loot popup

The loot popup is triggered from `src/app/PyramidLevel/LevelCompletionHandler.tsx` and `src/app/TombLevel/useComparePuzzleControls.ts`. The `Loot` type has an `itemDescription` field — use `effectDescription` from the translation for treasure items.

In `src/data/useTreasureTranslations.ts`, the `useTreasureItem()` hook returns `name`, `description`, and `symbol` for a treasure. Add `effectDescription` to what it returns, sourced from the new translation key.

### 3. Implement `moreLootChance` (implement this first — it is the priority)

**Where:** `src/app/PyramidLevel/useLootDetermination.tsx` (or the `inventoryLootLogic` it calls).

**How to access owned treasures and compute the total chance:**
```ts
import { allTreasures, difficultyByMaterialTier } from "@/data/treasures"
import { materialTierByDifficulty } from "@/data/treasures"

// In the hook, read inventory to find owned treasures
const ownedTreasures = allTreasures.filter(t => (inventory[t.id] ?? 0) > 0)

// Sum moreLootChance for a given difficulty
const totalChance = ownedTreasures.reduce((sum, t) => {
  const effect = t.effects?.moreLootChance
  if (!effect) return sum
  const effectTier = effect.tier ?? materialTierByDifficulty[currentDifficulty]
  if (effectTier !== materialTierByDifficulty[currentDifficulty]) return sum
  return sum + effect.chance
}, 0)
```

**Seeded roll:** Use `mulberry32` seeded from the level seed (same approach as the compare puzzle in `src/app/TombLevel/useComparePuzzleControls.ts`). The seed should be derived from `randomSeed + levelNr` or similar — stay consistent with existing patterns.

**What to award:** Pick a random item from `difficultyTreasures` wait — from inventory items (not treasure items) of the matching difficulty. Use `itemLevelLookup` or equivalent to find items at that difficulty tier. Award via `addItems()` from `useInventory`.

**Unit tests:** Add tests in a new file `src/app/PyramidLevel/lootEffects.spec.ts` (or alongside the existing loot logic). Test:
- No owned treasures → no bonus loot
- One treasure with 20% chance → rolls correctly with known seed
- Two treasures with 20% each → 40% total chance
- Tier-specific treasure only fires on matching difficulty
- Tier-less treasure fires on any difficulty

### 4. Implement `expeditionBonus`

**Where:** `src/app/PyramidLevel/LevelCompletionHandler.tsx` — trigger on expedition completion (when `journey.levelNr >= journey.levelCount`).

**How:** Sum `expeditionBonus.amount` across all owned treasures matching the current expedition's tier. Award that many items via `addItems()`. Items should come from the matching difficulty pool.

No seeded randomness needed (the amount is guaranteed, but the specific items chosen should use seeded RNG).

### 5. Implement `higherLootChance` and `mapFragmentChance`

**Where:** `src/app/PyramidLevel/useLootDetermination.tsx`.

These are additive bonuses applied to the existing base probability checks:
- `higherLootChance`: sum across owned treasures and add to the base loot drop probability
- `mapFragmentChance`: sum across owned treasures and add to the base map fragment probability

Both use seeded rolls — same approach as `moreLootChance`.

### 6. Implement `errorHighlight`

**Where:** The pyramid puzzle block rendering — likely in `src/app/PyramidLevel/` block components.

**How:** Count owned treasures with `errorHighlight: true`. That count = the number of wrong blocks to highlight in real-time. A block is "wrong" if the player has entered a value and it does not match the expected result.

This requires:
- Access to the player's current block values during solving
- Comparison against the correct values
- A way to mark the first N wrong blocks visually (border color or glow)

### 7. Implement `earlyFeedback`

**Where:** Same pyramid puzzle block rendering as `errorHighlight`.

**How:** Count owned treasures with `earlyFeedback: true`. That count = how many checkpoint blocks get live borders. Checkpoint blocks are blocks that appear after a calculation chain — the pyramid level generator already marks which blocks are "key" intermediate results.

### 8. Implement `hieroglyphUnlock`

**Where:** The pyramid puzzle — hieroglyph blocks are currently uneditable. 

**How:** Count owned treasures with `hieroglyphUnlock: true`. Once per level, the player can tap a hieroglyph block and enter a value. The chosen value is accepted as-is (not validated until full submission). The number of available unlocks equals the count of owned `hieroglyphUnlock` treasures.

This likely requires:
- New state in the pyramid level hook tracking how many unlocks remain this level
- A tap-to-unlock gesture on hieroglyph blocks (distinct from normal block interaction)
- Visual indicator showing the block is now writable

## Key Files

| File | Relevance |
|------|-----------|
| `src/data/treasures.ts` | Effect types and all 40 treasure definitions |
| `src/data/useTreasureTranslations.ts` | Hook returning treasure name/description/symbol — add `effectDescription` |
| `src/app/PyramidLevel/useLootDetermination.tsx` | Where `moreLootChance`, `higherLootChance`, `mapFragmentChance` hook in |
| `src/app/PyramidLevel/LevelCompletionHandler.tsx` | Where `expeditionBonus` hooks in (expedition completion path) |
| `src/app/Inventory/useInventory.ts` | `addItems()` for awarding items |
| `src/game/random.ts` | `mulberry32`, `generateNewSeed` — use for all seeded rolls |
| `public/locales/en/treasures.json` | Add `effectDescription` to every treasure |
| `public/locales/nl/treasures.json` | Dutch translations — keep in sync |
| `docs/treasure-effects.md` | Full design reference including effect assignment table |

## Implementation Order

1. **Translations first** — add `effectDescription` to all 40 treasures in both locales, show in loot popup
2. **`moreLootChance`** — highest gameplay impact, has unit test requirement
3. **`expeditionBonus`** — complements `moreLootChance`, same reward system
4. **`higherLootChance` + `mapFragmentChance`** — simpler additive bonuses on existing probability checks
5. **`hieroglyphUnlock`** — UI work on the pyramid puzzle blocks
6. **`errorHighlight` + `earlyFeedback`** — UI work on the pyramid puzzle blocks, can be done together

## Accessing Owned Treasures (Pattern)

```ts
import { allTreasures } from "@/data/treasures"
import { useInventory } from "@/app/Inventory/useInventory"

const { inventory } = useInventory()
const ownedTreasures = allTreasures.filter(t => (inventory[t.id] ?? 0) > 0)

// Boolean effect count (e.g. errorHighlight):
const errorHighlightCount = ownedTreasures.filter(t => t.effects?.errorHighlight).length

// Numeric stacking (e.g. mapFragmentChance):
const bonusMapChance = ownedTreasures.reduce((sum, t) => sum + (t.effects?.mapFragmentChance ?? 0), 0)
```
