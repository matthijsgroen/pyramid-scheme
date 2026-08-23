# World Stability

How the game keeps player progress intact while the world is being actively authored.

## The problem

The game world is large and generated from a DSL. During alpha, the world will keep changing — puzzle counts shift, side paths appear, loot moves around, ward keys get reassigned. Players may already have explored, solved puzzles, and collected loot when a new world ships. A naive "reset everything on world change" would be punishing and break loot economy.

The goal: **as stable as possible, not perfect.** A restructured section requiring fresh puzzle-solving is acceptable. Silently duplicating or erasing loot is not.

---

## Section hashes

Every cell in the assembled grid carries a `sectionHash` that fingerprints the structural shape of the section it belongs to: what it covers and what it deliberately ignores is the field list in [world-spec-stability.md](./world-spec-stability.md), which is the authoring-side view of this same mechanism. The short version is that the hash fingerprints the shape of the place — how many rooms, how long the walk, what isolates it, whether it is hidden — and ignores everything about what lives inside it.

The rule the two pages share: **structure changes only when the corridors change**, their number or their length. A setting that re-carves a floor must move the hash; a setting that does not must move nothing. `worldFloorAssembly.spec.ts` sweeps every authored floor on every test run to hold both halves.

Exploration state is stored as `exploredSections: Record<sectionHash, cellId[]>`. When the world is rebuilt, any cell whose `sectionHash` differs from the stored key is silently skipped — that section resets. Structurally unchanged sections are restored exactly.

---

## Fragment loot: inventory-as-truth

Hieroglyph fragments are numbered. The serializer assigns a stable `pieceIndex` to each fragment reward as it writes `generatedWorld.ts`, counting per `hieroglyphId` in encounter order. The game stores collected fragments as `"hieroglyphId:pieceIndex"` strings.

When a player enters a treasure room that holds a fragment:

1. Check `progression.hasFragment(hieroglyphId, pieceIndex)`.
2. If already collected → show no overlay; the chest is silently inert.
3. If not → show overlay; on collect, store `"id:index"` in the inventory.

This means a world rebuild can freely change _which_ chest holds a given fragment, move fragments between sections, or add new ones. A player who already has piece `a4:2` simply won't be shown the overlay again if that piece appears somewhere new. They cannot collect it twice.

---

## Consumables

Consumables (health pickups, etc.) are always re-lootable. The gate is inventory space, not a "looted" flag. No tracking needed. If the world adds or removes a consumable chest, nothing in player state needs to change.

---

## Ward keys and gate hashes

The DSL lets authors change _which_ ward key is assigned to a gated section (e.g. swapping between two tier-2 keys). The section hash ignores `wardKeyId` — it only hashes `gate.type` ("tomb-key"). Swapping key assignment never resets exploration of the gated section. Gate presence/absence does change the hash (adding or removing a gate restructures the section).

---

## Storage version

Progression and journey state are stored under versioned keys. If a breaking migration is ever needed, the policy is to bump the storage version and hard-reset — accept a fresh start rather than attempt an in-place migration.

---

## What resets and what doesn't

| Change                              | Resets exploration?                   | Dupes/erases loot?                         |
| ----------------------------------- | ------------------------------------- | ------------------------------------------ |
| Puzzle count changes in a section   | Yes — hash changes                    | No                                         |
| Path length or straightness changes | Yes — hash changes                    | No                                         |
| Which puzzle a room serves changes  | No — traps included                   | No                                         |
| Loot in a chest changes             | No                                    | No — inventory-as-truth                    |
| A chest's reward is swapped         | No                                    | No — inventory-as-truth                    |
| A section's `endReward` is removed  | Yes — it becomes a key-host candidate | No                                         |
| Ward key reassigned                 | No                                    | No                                         |
| Gate added or removed               | Yes — hash changes                    | No                                         |
| A section is sealed or hidden       | Yes — hash changes                    | No                                         |
| Section added (new side path)       | N/A — new hash, fresh                 | No                                         |
| Section removed                     | N/A — stale hash ignored              | No                                         |
| Difficulty changes                  | Yes — hash changes                    | No                                         |
| Fragment re-ordered across chests   | No                                    | No — piece index is stable per world build |

Per-field detail, and what makes each one safe or not: [world-spec-stability.md](./world-spec-stability.md).
