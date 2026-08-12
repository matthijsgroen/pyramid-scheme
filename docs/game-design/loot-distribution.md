# Loot Distribution

Status: design doc · updated 2026-07-03  
Companion to: `pyramid-interior-design.md` §3 (fragment matrix), §10 (loot economy)

---

## Overview

Every reward slot in every pyramid site is filled exactly once. There is no random loot — every fragment, mosaic piece, consumable, and map piece is placed deliberately by the world builder and shipped as static data.

Key constraint: **no hieroglyph fragment appears more than once per journey** (relaxed only when there are not enough journeys to distribute the required count).

---

## Reward slot types

| Slot                         | Location                                      | Default reward                                                         |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| `mainEndReward`              | End of the main spine per floor               | Hieroglyph fragment (fragmentSlot) or explicit (mapPiece, mosaicPiece) |
| `endReward` on side sections | Branch endpoints with `end: "fragment"`       | Hieroglyph fragment (fragmentSlot) or explicit (tombKey, mapPiece)     |
| `chestRewards[]`             | Main spine chests, 1 per `chestEvery` puzzles | Consumables only                                                       |

Tomb reward slots (ward keys, location keys) are authored directly and never go through fragment assignment.

---

## The `fragmentSlot` sentinel

During world generation the builder marks any slot that _could_ hold a hieroglyph fragment with `{ type: "fragmentSlot" }`. This is a build-time sentinel — it is never serialized to `generatedWorld.ts`.

Lifecycle:

```
buildSiteConfigs()        → SiteConfig with fragmentSlot sentinels
buildTombConfigs()        ↘
                           allConfigs
assignFragments(allConfigs) → replaces every fragmentSlot with either:
                               • { type: "hieroglyphFragment", hieroglyphId: "..." }
                               • { type: "consumable", consumable: "..." }   (fallback)
generateFile(allConfigs)   → throws if any fragmentSlot survived (invariant check)
```

Where sentinels appear:

- `mainEndReward` of any floor that has no explicit authored reward
- `endReward` of any side section declared with `end: "fragment"` in the DSL

---

## Fragment assignment algorithm

### Step 1 — collect slots

Scans all pyramid configs (tombs are skipped) and builds a list of `SlotRef` objects. Each `SlotRef` carries:

- `journeyId` / `tier` / `journeyOrderIndex` — where the slot lives
- `wardKeys` — tomb-key IDs the player must hold to reach this slot (empty = always accessible)
- `isPlaceholder` — true if it was a `fragmentSlot` sentinel; false if it is an empty ward-gated section with no explicit reward (optional slot)
- `assign(r)` — closure that writes the reward back into the config in place

Non-placeholder ward slots are included so they can receive fragments during assignment, but are never filled with consumables if they remain unassigned.

### Step 2 — build placement infos

For each hieroglyph, derives:

- `tier` — which tier's tomb this hieroglyph belongs to
- `required` — how many copies to place (`HIEROGLYPH_REQUIRED[id]`)
- `preferredWardKeys` — ward keys the player needs before this hieroglyph becomes relevant

`preferredWardKeys` comes from `TOMB_PERK_IDS[tombId].slice(0, runNumber - 1)` where `runNumber` is the first tomb run in `tableauLevels` that needs this hieroglyph:

| runNumber | preferredWardKeys                  | Meaning                                                      |
| --------- | ---------------------------------- | ------------------------------------------------------------ |
| 1         | `[]`                               | Needed on first visit → place in open slots                  |
| 2         | `[tombPerkIds[0]]`                 | Needed after run 1 → prefer slots behind ward key #1         |
| 3         | `[tombPerkIds[0], tombPerkIds[1]]` | Needed after run 2 → prefer slots behind ward keys #1 and #2 |

### Step 3 — assign

For each hieroglyph (in tier order, starter first):

**Three priority pools, tried in order:**

| Pool | Condition                                                        |
| ---- | ---------------------------------------------------------------- |
| 0    | Same tier + slot is behind at least one of the preferredWardKeys |
| 1    | Same tier + open slot (no ward keys)                             |
| 2    | Any remaining slot (cross-tier fallback)                         |

**Two passes per pool:**

1. First pass — respects 1-per-journey: skips any slot in a journey that already received this hieroglyph.
2. Second pass — relaxes 1-per-journey: fills remaining slots in the same journey if the first pass did not reach `required`.

Once `required` copies are placed, move to the next hieroglyph.

### Step 4 — consumable fill

Any `isPlaceholder` slot that was not assigned a fragment receives a consumable (bandage, oil, or trapTool) chosen by a deterministic hash of `journeyId + fallbackIdx`.

---

## Ward-aware placement intent

Run-N fragments are designed to be placed _behind_ the ward key earned after completing run N−1. This means the player will have already unlocked the deep floor before they need to hunt for that hieroglyph.

This section (and the pool table above) describes the `fragments.ts`/`assignFragments` design, since replaced by the generic reachability-driven worklist (`src/worldGen/placeFragments.ts`) with the hieroglyph currency's own `rank` (`src/mods/hieroglyph/game/hieroglyphCurrency.ts`) — see `keys-and-locks-solver.md`'s "Distribution rules" section for the current mechanism. The pool ladder there is two rungs, not three: tier is a hard filter (a fragment can never land off-tier, full stop — there is no cross-tier fallback), and within the tier a slot behind one of the hieroglyph's preferred ward keys is preferred over a plain open slot, capped to one ward-matched slot per distinct key so one symbol can't monopolize every gate. Ward-gated pyramid sections exist in every tier's own tomb, authored via `wardChest` in each `src/worldGen/spec/*.ts` file.

---

## Output

The world ships with exactly the required fragment count per hieroglyph. The serializer throws if any `fragmentSlot` sentinel survives assignment, acting as a hard invariant check at generation time.
