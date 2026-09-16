# World Stability

How the game keeps player progress intact while the world is being actively authored.

## The problem

The game world is large and generated from a DSL. During alpha, the world will keep changing — puzzle counts shift, side paths appear, loot moves around, ward keys get reassigned. Players may already have explored, solved puzzles, and collected loot when a new world ships. A naive "reset everything on world change" would be punishing and break loot economy.

The goal: **as stable as possible, not perfect.** A restructured section requiring fresh puzzle-solving is acceptable. Silently duplicating or erasing loot is not.

---

## Section hashes

Every cell in the assembled grid carries a `sectionHash` that fingerprints the structural shape of the section it belongs to: what it covers and what it deliberately ignores is the field list in [world-spec-stability.md](./world-spec-stability.md), which is the authoring-side view of this same mechanism. The short version is that the hash fingerprints the shape of the place — how many rooms, how long the walk, what isolates it, whether it is hidden — and ignores everything about what lives inside it.

The rule the two pages share: **structure changes only when the corridors change**, their number or their length. A setting that re-carves a floor must move the hash; a setting that does not must move nothing. `worldFloorAssembly.spec.ts` sweeps every authored floor on every test run to hold both halves.

The hash is **no longer what a save is filed under** — see "Which section is this?" below. It stayed too sensitive to be an identity: it covers the floor's own carve knobs, so retuning them moved every hash in the world. It survives only as the key the coordinate archive is matched by while re-keying, and goes with the archive.

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

The DSL lets authors change _which_ ward key is assigned to a gated section (e.g. swapping between two tier-2 keys). The section hash ignores `wardKeyId` — it only hashes `gate.type` ("tomb-key"). Neither swapping a key nor adding a gate resets exploration any more — a gate is a room with its own slot, so it simply appears unexplored and the rest of the section restores around it.

---

## Why not the coordinate, and why not the ordinal

`exploredSections` stored cell ids — `floor:row,col`. **A coordinate is an accident of the carve.** The
section hash is computed from the authored spec, so the same section carved a second time keeps its
hash while landing somewhere else entirely; a save restored against it then marks rooms done that were
never opened. Measured on one floor of Valley of the Kings: all 11 sections kept their hash and 548 of
676 cells moved.

**The ordinal is an accident of the carve too**, which is the part that took measuring. A cell's
`ordinal` is its step along the CARVED walk, and how many steps that walk takes is the carve's own
choice (`targetDistance`). Re-carving one expert floor at a neighbouring seed took it from 685 cells to
668 and moved the main chain's forks from steps 26/49/58 to 5/6/13/22/29/50: everything past the first
divergence renumbers. An ordinal survives a floor being re-SHUFFLED. It does not survive one being
re-LENGTHENED, which is what compacting the corridors will do.

So neither is an identity. Both of the two questions below are answered from the AUTHORING instead.

---

## Which section is this?

By the **authoring address**, which is what the author actually steers: `main`, `s0` for the first sidepath off it, `s0.1` for that sidepath's second sub-path. The same addresses `boardIndex.ts` deals boards by.

The first sidepath of the main path is `s0` whether the builder hangs it after the first encounter or the third, and whether it holds four puzzles or six. The structural hash was none of those things — it covered `pathPuzzles`, `difficulty`, `end`, `hidden`, `gate`, and the floor's `packing` and `corridorStraightness` — so every one of those edits threw a player's progress in that section away.

Two reasons that had to change:

- **`packing` and `corridorStraightness` are exactly the knobs corridor compaction turns.** Keyed by hash, the compaction pass resets every run in the world at the moment the slots were meant to carry it.
- **The slots degrade far better than a reset.** Keyed by address, re-authoring a section's contents costs only what actually changed:

| Authoring change    | Keyed by hash (before) | Keyed by address (now)                                |
| ------------------- | ---------------------- | ----------------------------------------------------- |
| `pathPuzzles` 4 → 6 | whole section resets   | `p0`–`p3` restore, `p4`–`p5` are new                  |
| chest → shop        | whole section resets   | `xtreasure-chest` stops resolving, `xfez-shop` is new |
| gate added          | whole section resets   | `xkey-gate` is new, the rest restores                 |
| difficulty retuned  | whole section resets   | all restores, new boards behind it                    |
| carve knobs retuned | **everything resets**  | nothing resets                                        |

**A positional address follows the index, not the place.** Insert a new sidepath ahead of `s0` and every later one shifts down, handing the newcomer the old one's name and a player's progress with it — the same hazard `boardIndex.ts` documents for board dealing.

**A path that matters is given a `label`,** and then it is that path wherever it ends up in the list:

```ts
sideSections: [{ label: "burial-antechamber", pathPuzzles: 3, end: "treasure" }]
```

Labelling is per path, on purpose. Naming every sidepath in the world would be a tax on authoring for the sake of the few that are ever re-ordered, so an unlabelled one keeps its positional address and the hazard that comes with it. Name the paths you expect to move; leave the rest.

A label is unique within a floor, may not be shaped like a positional address (`main`, `s3`, `s3.1`), and is made of letters, digits, `-` and `_` — `#` and `/` separate the parts of a cell address, so a label carrying either would read back as somewhere else. The assembler refuses to build a floor that breaks any of those — two sections a save cannot tell apart would share one player's progress between two places, which is data loss rather than a layout problem, so `yarn generate-world` and the floor sweep both stop on it.

A label IS the identity, so adding, changing or removing one resets that section — an unlabelled path answers to `s0`, a labelled one to its label, and nothing can tell a rename from a replacement. Label a path when you author it, not after players have walked it.

---

## Remembering a cell

A save names a cell by what the floor was AUTHORED from — its **slot** (`cellIdentity.ts`):

| Cell                         | Slot                                              |
| ---------------------------- | ------------------------------------------------- |
| puzzle, trap or tableau room | `p${pathIndex}` — the k-th room of its chain      |
| chest, shop or gate          | `x${family}` — a section gets exactly one of each |
| staircase                    | `stair:${stairId}`                                |
| the two plain portals        | `entrance` / `exit`                               |
| corridor, fork               | none — see below                                  |

Measured over the baked world: 5250 slots, no two alike inside a (section, floor), and all 1303 sections
hold at least one. Re-carved at two different seeds, four floors across four tiers and a tomb kept every
slot, with the same family, board and reward behind it.

The full address is `${sectionAddress}#${floor}/${slot}`. **The floor is in it** because a section
carries none, and floors authored to the same shape used to hash identically — 62 (level, hash) pairs in
the baked world span more than one floor, and every floor of every tomb shares one with all the others.
Without it, walking a tomb's ground floor would loot the floors above.

### Corridors, and the high-water mark

A corridor and a fork have no slot, because they have no authored identity: how many corridor cells
there are and where the chain turns IS the carve. They are addressed `~${ordinal}`, which resolves
inside one carve — so walking a floor lifts its fog cell by cell exactly as it always has — and
deliberately resolves to nothing once the floor moves.

What comes back after a re-carve is the **high-water mark**: the furthest ROOM of each section the save
names, measured along the new walk, with every corridor up to it restored with it. A section is a linear
chain, so how far along it the player got is a fact that outlives the carve.

A room is never restored by the mark, only by its own entry. A looted room is remembered by nothing else,
so a chest must never come back opened because something past it was reached.

### The order of the releases

**Switching over is a two-release migration, and the order matters.** A coordinate only means something
against the floor it was written against:

1. **The release before any reshape** keeps writing coordinates as an archive and re-keys every per-cell
   collection from them, while the old carve is still what the code produces
   (`migrateJourneyToCarveIndependent`, run once on launch by `useCarveIndependentBackfill`).
2. **The release that reshapes** moves the floors and drops the coordinates.

Landing both at once translates against the new carve, which is the original bug wearing a migration
costume. A player who skips release 1 entirely has only coordinates, cannot be translated, and takes a
one-time exploration reset.

`cellKeyVersion` on each save says which key format it was re-keyed under, so a change to the format
re-derives from the archive rather than throwing a run away — it has already earned itself twice, at 2
(slots instead of ordinals) and 3 (addresses instead of hashes). That is what the coordinates are still
there for, and they go with the reshape.

---

## Storage version

Progression and journey state are stored under versioned keys. If a breaking migration is ever needed, the policy is to bump the storage version and hard-reset — accept a fresh start rather than attempt an in-place migration.

---

## What resets and what doesn't

| Change                                         | Resets exploration?                                      | Dupes/erases loot?                         |
| ---------------------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| Path length, straightness or packing changes   | No — the carve moves, the authoring does not             | No                                         |
| Puzzle count changes in a section              | Only the rooms added or removed                          | No                                         |
| Which puzzle a room serves changes             | No — traps included                                      | No                                         |
| Difficulty changes                             | No — same rooms, different boards behind them            | No                                         |
| Loot in a chest changes                        | No                                                       | No — inventory-as-truth                    |
| A chest's reward is swapped                    | No                                                       | No — inventory-as-truth                    |
| A section's `endReward` is removed             | No — but which sections host floor keys moves            | No                                         |
| Ward key reassigned                            | No                                                       | No                                         |
| Ward gate added or removed                     | Only the gate room                                       | No                                         |
| Floor-key gate added                           | The gate room, and the key host it conjures              | No                                         |
| A section is sealed                            | No — it only re-carves                                   | No                                         |
| A section is hidden                            | No, but it must be found again before it can be walked   | No                                         |
| Section added (new side path)                  | Itself only — unless inserted ahead of an unlabelled one | No                                         |
| Section removed                                | N/A — its stale entries are ignored                      | No                                         |
| A sidepath is labelled, relabelled, unlabelled | Yes, that section — the name is its identity             | No                                         |
| Fragment re-ordered across chests              | No                                                       | No — piece index is stable per world build |

Every row is a case in `src/app/SiteMap/authoringChangeCost.spec.ts`, which walks a floor, re-authors it and asserts what comes back.

Per-field detail, and what makes each one safe or not: [world-spec-stability.md](./world-spec-stability.md).
