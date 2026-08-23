# World-Spec Stability

Which settings in a floor's spec change the shape of a place, and which do not.

The world is authored continuously — new puzzle families arrive, journeys get pointed at different pools, traps land on floors, loot moves around. A player is somewhere in the middle of that world while it happens. This page says what an author can change freely and what will cost a run its progress, so the choice is made knowingly rather than discovered afterwards.

For how progress survives a change at all — section hashes, inventory-as-truth, storage versions — see [world-stability.md](./world-stability.md). This page is the authoring-side companion: the field list.

---

## The rule

**Structure changes only when the corridors change** — their number or their length.

Everything else about a room is content: which puzzle it serves, what its chest holds, which key opens the door beside it, what it looks like. None of that may move a wall, and none of it costs a player the floor.

Two invariants follow, and `src/app/SiteMap/worldFloorAssembly.spec.ts` sweeps every authored floor in the world on every test run to hold them:

1. A setting that is not about the shape of the place moves nothing.
2. A setting that _does_ re-carve must also change the section hash. A floor re-shaped while its hashes held still is the worst outcome available: a run restores its explored cells onto a maze that no longer exists, and rooms the player never entered read as already looted.

---

## Free to change

Change these as often as you like. The walls stay put, the hashes stay put, and every run keeps its explored corridors, its found passages and its opened chests.

| Setting                                   | Why it is free                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `encounter`, `encountersByIndex`, `role`  | Which puzzle a room serves — **including making it a trap**. Nothing about an encounter reaches the layout. See below.  |
| `endReward`, `mainEndReward`, `rewards[]` | What a chest holds, as long as it still holds _something_. Loot identity is tracked in the inventory, not in the world. |
| `gate.wardKeyId`, `gate.color`            | Which key opens a door, and what colour it wears. Gate _presence_ is structural; which key is not.                      |
| `decorations`                             | The pool a fork or dead end draws its sarcophagus or rubble from. Purely drawn.                                         |
| `theme`                                   | The skin a room's puzzle wears.                                                                                         |
| `encounterArgs`                           | A family's own payload (a tableau's `runNr`). Read by that family alone, never by the carve.                            |

### Why encounters are free, including traps

They were not always. Two separate paths let an authored encounter reshape a floor, and both are closed:

- **Isolation.** Trapped content is cut off from leftover maze edges, so no stray door lets a player step past it. The assembler used to decide that by reading the section's encounter. World-gen now writes it down instead — `sealed` on any section it gives a trap — so the assembler lays out a floor without ever asking what lives in it.
- **Validation.** A fork branch of only traps counts as bland, a bland floor is rejected, and a rejected floor is re-carved at a different seed. So a trap could reshape a whole floor by failing a _content_ check. A trap is now traversed like a puzzle: a branch that is only a trap is still bland, but a trap on the way to something worth reaching no longer hides it.

If a third such path ever appears, the sweep fails: it rewrites every encounter in the world to one family — a plain puzzle, and a trap — and requires identical walls and identical hashes on every floor.

---

## Structural

These re-carve, and the affected sections reset. That is correct — the place really is different — but it is a cost, so spend it deliberately.

| Setting                      | What moves                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pathPuzzles`                | The number of rooms on a chain, so the length of the walk. The most obviously structural knob there is.                                              |
| `packing`                    | The main path's length multiplier. Re-carves the **whole floor**, side sections included.                                                            |
| `corridorStraightness`       | How often the maze goes straight instead of turning. Also re-carves the whole floor.                                                                 |
| `sealed`                     | Cuts a stretch off from leftover maze edges, removing the shortcut loops around it.                                                                  |
| `gate` (present or absent)   | A gate is a room, and gated content is isolated. Adding or removing one does both.                                                                   |
| `hidden`                     | A hidden section is masked out of the walkable grid until it is found.                                                                               |
| `end`, `exitOrStaircase`     | What terminates a chain.                                                                                                                             |
| `difficulty`                 | Resets the section. It does not actually move a wall today, but it is hashed — the conservative direction of the two.                                |
| Adding or removing a section | New section: fresh hash, explored from nothing. Removed section: its saved cells go stale and are ignored.                                           |
| Emptying a node completely   | A chest with nothing in it makes its branch bland, and a bland floor is re-carved. Changing _what_ it holds is free; leaving it with nothing is not. |

`packing` and `corridorStraightness` are the two worth naming twice. They re-shape a floor end to end, and until both were added to the section hashes they did it **silently** — 206 of 206 floors re-carved with not one hash moving. Both hashes now carry them.

---

## Where the lists live in code

- `computeMainSectionHash` / `computeSideSectionHash` in `src/game/siteAssembler.ts` — the hash inputs are the structural list, in one place.
- `sideIsolated` / `subIsolated` / `mainIsolated`, same file — the isolation decision, named once and used by both the layout and the hash so the two cannot drift.
- `assignSection` in `src/worldGen/placeEncounters.ts` — where gen writes `sealed` for a trap.
- `worldFloorAssembly.spec.ts` — the sweep that keeps this page true.

A `legacySectionHash` rides along on every cell: the hash as it was computed before the encounter left the hash inputs, accepted by the readers so saves written under the old scheme keep matching. It is read-only and can be deleted once no live save predates it.
