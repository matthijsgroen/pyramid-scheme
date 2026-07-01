# World Stability

How the game keeps player progress intact while the world is being actively authored.

## The problem

The game world is large and generated from a DSL. During alpha, the world will keep changing — puzzle counts shift, side paths appear, loot moves around, ward keys get reassigned. Players may already have explored, solved puzzles, and collected loot when a new world ships. A naive "reset everything on world change" would be punishing and break loot economy.

The goal: **as stable as possible, not perfect.** A restructured section requiring fresh puzzle-solving is acceptable. Silently duplicating or erasing loot is not.

---

## Section hashes

Every cell in the assembled grid carries a `sectionHash` that fingerprints the structural shape of the section it belongs to. The hash covers:

- puzzle count (`pathPuzzles`)
- chest cadence (`chestEvery`)
- difficulty
- exit type (`exitOrStaircase` / `end`)
- gate presence and type (`gate.type`)
- section index and parent index (for stable identity across sibling sections)

The hash deliberately **excludes**:

- specific ward key ID (`wardKeyId`) — reassigning which key opens a gate is invisible to the hash
- gate color — cosmetic
- reward contents (`endReward`, `chestRewards`) — loot can change freely
- render styles

Exploration state is stored as `exploredSections: Record<sectionHash, cellId[]>`. When the world is rebuilt, any cell whose `sectionHash` differs from the stored key is silently skipped — that section resets. Structurally unchanged sections are restored exactly.

---

## Fragment loot: inventory-as-truth

Hieroglyph fragments are numbered. The serializer assigns a stable `pieceIndex` to each fragment reward as it writes `generatedWorld.ts`, counting per `hieroglyphId` in encounter order. The game stores collected fragments as `"hieroglyphId:pieceIndex"` strings.

When a player enters a treasure room that holds a fragment:

1. Check `progression.hasFragment(hieroglyphId, pieceIndex)`.
2. If already collected → show no overlay; the chest is silently inert.
3. If not → show overlay; on collect, store `"id:index"` in the inventory.

This means a world rebuild can freely change *which* chest holds a given fragment, move fragments between sections, or add new ones. A player who already has piece `a4:2` simply won't be shown the overlay again if that piece appears somewhere new. They cannot collect it twice.

---

## Consumables

Consumables (health pickups, etc.) are always re-lootable. The gate is inventory space, not a "looted" flag. No tracking needed. If the world adds or removes a consumable chest, nothing in player state needs to change.

---

## Ward keys and gate hashes

The DSL lets authors change *which* ward key is assigned to a gated section (e.g. swapping between two tier-2 keys). The section hash ignores `wardKeyId` — it only hashes `gate.type` ("tomb-key"). Swapping key assignment never resets exploration of the gated section. Gate presence/absence does change the hash (adding or removing a gate restructures the section).

---

## Storage version

`useProgression` uses key `"pyramid-scheme-progression-v3"`. `useJourneys` uses `StoredJourneyStateV3`. If a breaking migration is needed in future, bump the version and provide a migration or accept a fresh start.

---

## What resets and what doesn't

| Change | Resets exploration? | Dupes/erases loot? |
|---|---|---|
| Puzzle count changes in a section | Yes — hash changes | No |
| Chest cadence changes | Yes — hash changes | No |
| Loot in a chest changes | No | No — inventory-as-truth |
| Ward key reassigned | No | No |
| Gate added or removed | Yes — hash changes | No |
| Section added (new side path) | N/A — new hash, fresh | No |
| Section removed | N/A — stale hash ignored | No |
| Difficulty changes | Yes — hash changes | No |
| Fragment re-ordered across chests | No | No — piece index is stable per world build |

---

## Implementation files

| Concern | File |
|---|---|
| Cell types with `sectionHash` | `src/game/siteTypes.ts` |
| Hash assignment at grid-build time | `src/game/siteAssembler.ts` |
| `pieceIndex` assignment in worldgen | `src/worldGen/serializer.ts` |
| Generated world with piece indices | `src/data/generatedWorld.ts` |
| Exploration storage (section-keyed) | `src/app/state/useJourneys.ts` |
| Section-aware grid restore | `src/app/SiteMap/useAssembledFloor.ts` |
| Inventory-as-truth fragment checks | `src/app/SiteMap/SiteMapScreen.tsx` |
| Fragment inventory storage | `src/app/state/useProgression.ts` |
