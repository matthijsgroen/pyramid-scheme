# Treasure Effects

Treasures found in Treasure Tombs carry passive effects that alter gameplay. Effects are defined on the `TreasureEffects` type in `src/data/treasures.ts`, exported from `TreasureEffects`.

## Material Tiers

Inventory items (hieroglyphs) are grouped into material tiers that map to difficulty levels:

| Tier | Difficulty | Code value |
|------|------------|------------|
| Stone | Starter | `"stone"` |
| Bronze | Junior | `"bronze"` |
| Silver | Expert | `"silver"` |
| Gold | Master | `"gold"` |
| Divine | Wizard | `"divine"` |

Lookup helpers in `src/data/treasures.ts`:
- `materialTierByDifficulty` — `Difficulty → MaterialTier`
- `difficultyByMaterialTier` — `MaterialTier → Difficulty`

## Effects Reference

### `higherLootChance: number`
Additive bonus to the base probability that any inventory loot drops when a pyramid level is completed. Multiple treasures stack additively.

**Example:** `0.1` adds 10% on top of the base drop rate.  
**Status:** Not yet implemented.

---

### `mapFragmentChance: number`
Additive bonus to the base probability that a map fragment drops when a pyramid level is completed. Multiple treasures stack additively.

**Example:** `0.1` adds 10% on top of the base map fragment drop rate.  
**Status:** Not yet implemented.

---

### `moreLootChance: { chance: number; tier?: MaterialTier }`
Per pyramid level completed, a seeded roll determines whether one extra inventory item drops. If `tier` is specified the bonus item is from that tier; if omitted the bonus item matches the current pyramid's difficulty tier. Multiple treasures stack additively on the total chance.

**Example:** `{ chance: 0.2, tier: "stone" }` = 20% chance of an extra Stone item per level.  
**Example:** `{ chance: 0.2 }` = 20% chance of an extra item matching the current pyramid's tier.  
**Stacking:** Additive — two treasures at 20% for the same tier = 40% total.  
**RNG:** Seeded (`mulberry32`), deterministic per run/level.  
**Status:** Not yet implemented.

---

### `expeditionBonus: { amount: number; tier: MaterialTier }`
At the end of a completed pyramid expedition, awards a guaranteed number of inventory items of the specified tier. Multiple treasures with the same tier stack additively.

**Example:** `{ amount: 1, tier: "gold" }` = 1 extra Gold item on every expedition completion.  
**Stacking:** Additive — two treasures with `{ amount: 1, tier: "gold" }` award 2 Gold items.  
**Status:** Not yet implemented.

---

### `errorHighlight: boolean`
Count the number of owned treasures with this effect to determine how many miscalculated blocks are highlighted in real-time while solving a pyramid puzzle, rather than waiting until all blocks are filled.

**Stacking:** Count-based — owning 2 treasures highlights the first 2 wrong blocks.  
**Status:** Not yet implemented.

---

### `earlyFeedback: boolean`
Count the number of owned treasures with this effect to determine how many checkpoint blocks in the pyramid (after calculation chains) display a magical border with live correct/incorrect feedback.

**Stacking:** Count-based — owning 2 treasures activates more checkpoint blocks.  
**Status:** Not yet implemented.

---

### `hieroglyphUnlock: boolean`
Count the number of owned treasures with this effect to determine how many hidden hieroglyph blocks the player may unlock per pyramid level. Unlocking a block lets the player write in their calculated value, removing the need to hold it in memory. The player chooses which block to unlock.

**Stacking:** Count-based — owning 2 treasures allows writing down 2 hidden values per level.  
**Status:** Not yet implemented.

---

## Implementation Notes

- All effects are passive and always active once the treasure is in the player's inventory.
- Numeric chances use a `0.0–1.0` scale (matching the rest of the reward system).
- Boolean effects stack by counting: `allTreasures.filter(t => inventory[t.id] && t.effects?.errorHighlight).length`
- `moreLootChance` totals per tier: sum `chance` across all owned treasures where `tier` matches or is undefined (adapts to current pyramid tier).
- `expeditionBonus` totals per tier: sum `amount` across all owned treasures for that tier.
- Player treasure inventory uses the same `Record<string, number>` store as hieroglyph items; treasure IDs are `t1`–`t40`.

## Full Effect Assignment

### Starter Tomb — Forgotten Merchant's Cache

| ID | Name | Effect |
|----|------|--------|
| t1 | Silver Deben | `mapFragmentChance: 0.1` |
| t2 | Papyrus Scroll | `higherLootChance: 0.1` |
| t3 | Ivory Comb | `moreLootChance` stone 20% |
| t4 | Ceramic Oil Lamp | `expeditionBonus` stone ×1 |

### Junior Tomb — Noble's Hidden Vault

| ID | Name | Effect |
|----|------|--------|
| t5 | Golden Bracelet | `moreLootChance` stone 20% |
| t6 | Ceremonial Dagger | `mapFragmentChance: 0.1` |
| t7 | Jade Scarab | `higherLootChance: 0.1` |
| t8 | Alabaster Canopic Jar | `expeditionBonus` stone ×1 |
| t9 | Ebony Walking Stick | `moreLootChance` bronze 20% |
| t10 | Lapis Lazuli Necklace | `expeditionBonus` bronze ×1 |

### Expert Tomb — High Priest's Treasury

| ID | Name | Effect |
|----|------|--------|
| t11 | Sacred Ankh | `errorHighlight` |
| t12 | Copper Mirror | `earlyFeedback` |
| t13 | Incense Burner | `mapFragmentChance: 0.1` |
| t14 | Ritual Chalice | `moreLootChance` bronze 20% |
| t15 | Ceremonial Fan | `expeditionBonus` bronze ×1 |
| t16 | Prayer Beads | `moreLootChance` silver 20% |
| t17 | Holy Water Vessel | `expeditionBonus` silver ×1 |
| t18 | Temple Bell | `mapFragmentChance: 0.1` |

### Master Tomb — Pharaoh's Secret Hoard

| ID | Name | Effect |
|----|------|--------|
| t19 | Pharaoh's Seal | `moreLootChance` silver 20% |
| t20 | Crystal Orb | `expeditionBonus` silver ×1 |
| t21 | Hieroglyphic Tablet | `moreLootChance` gold 20% |
| t22 | Golden Scepter | `expeditionBonus` gold ×1 |
| t23 | Obsidian Knife | `errorHighlight` |
| t24 | Meteorite Fragment | `hieroglyphUnlock` |
| t25 | Ancient Compass | `moreLootChance` gold 20% |
| t26 | Time Crystal | `hieroglyphUnlock` |
| t27 | Ritual Mask | `expeditionBonus` gold ×1 |
| t28 | Eternal Flame Torch | `earlyFeedback` |

### Wizard Tomb — Vault of the Gods

| ID | Name | Effect |
|----|------|--------|
| t29 | Crown of Ra | `moreLootChance` divine 20% |
| t30 | Staff of Thoth | `expeditionBonus` divine ×1 |
| t31 | Feather of Ma'at | `moreLootChance` current tier 20% |
| t32 | Tears of Isis | `moreLootChance` current tier 20% |
| t33 | Heart of Osiris | `moreLootChance` current tier 20% |
| t34 | Eye of Horus Amulet | `moreLootChance` current tier 20% |
| t35 | Serpent of Apep | `moreLootChance` current tier 20% |
| t36 | Breath of Shu | `moreLootChance` current tier 20% |
| t37 | Scale of Sobek | `moreLootChance` divine 20% |
| t38 | Anubis Guardian Statue | `expeditionBonus` divine ×1 |
| t39 | Book of the Dead | `moreLootChance` current tier 20% |
| t40 | Pyramid Capstone | `moreLootChance` current tier 20% |
