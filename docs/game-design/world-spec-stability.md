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

| Setting                                  | Why it is free                                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `encounter`, `encountersByIndex`, `role` | Which puzzle a room serves — **including making it a trap**. Nothing about an encounter reaches the layout. See below.        |
| `rewards[]` slot contents                | What a mid-chain chest holds, including leaving a slot empty. Loot identity is tracked in the inventory, not in the world.    |
| `endReward` / `mainEndReward` _contents_ | Which reward a chain's end chest holds. Swapping one reward for another is free; **removing it entirely is not** — see below. |
| `gate.wardKeyId`, `gate.color`           | Which key opens a door, and what colour it wears. Gate _presence_ is structural; which key is not.                            |
| `decorations`                            | The pool a fork or dead end draws its sarcophagus or rubble from. Purely drawn.                                               |
| `theme`                                  | The skin a room's puzzle wears.                                                                                               |
| `encounterArgs`                          | A family's own payload (a tableau's `runNr`). Read by that family alone, never by the carve.                                  |

### Why encounters are free, including traps

They were not always. Two separate paths let an authored encounter reshape a floor, and both are closed:

- **Isolation.** Trapped content is cut off from leftover maze edges, so no stray door lets a player step past it. The assembler used to decide that by reading the section's encounter. World-gen now writes it down instead — `sealed` on any section it gives a trap — so the assembler lays out a floor without ever asking what lives in it.
- **Validation.** A fork branch of only traps counts as bland, a bland floor is rejected, and a rejected floor is re-carved at a different seed. So a trap could reshape a whole floor by failing a _content_ check. A trap is now traversed like a puzzle: a branch that is only a trap is still bland, but a trap on the way to something worth reaching no longer hides it.

If a third such path ever appears, the sweep fails: it rewrites every encounter in the world to one family — a plain puzzle, and a trap — and requires identical walls and identical hashes on every floor.

---

## Structural

These re-carve, and the affected sections reset. That is correct — the place really is different — but it is a cost, so spend it deliberately.

| Setting                          | What moves                                                                                                                                                                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pathPuzzles`                    | The number of rooms on a chain, so the length of the walk. The most obviously structural knob there is.                                                                                                                                                                                  |
| `packing`                        | The main path's length multiplier. Re-carves the **whole floor**, side sections included.                                                                                                                                                                                                |
| `corridorStraightness`           | How often the maze goes straight instead of turning. Also re-carves the whole floor.                                                                                                                                                                                                     |
| `sealed`                         | Cuts a stretch off from leftover maze edges, removing the shortcut loops around it.                                                                                                                                                                                                      |
| `gate` (present or absent)       | A gate is a room, and gated content is isolated. Adding or removing one does both.                                                                                                                                                                                                       |
| `hidden`                         | A hidden section is masked out of the walkable grid until it is found.                                                                                                                                                                                                                   |
| `end`, `exitOrStaircase`         | What terminates a chain.                                                                                                                                                                                                                                                                 |
| `difficulty`                     | Resets the section. It does not actually move a wall today, but it is hashed — the conservative direction of the two.                                                                                                                                                                    |
| Adding or removing a section     | New section: fresh hash, explored from nothing. Removed section: its saved cells go stale and are ignored.                                                                                                                                                                               |
| Removing a section's `endReward` | Not because the chest is empty, but because an end with no `endReward` is how a section offers itself as a floor-key host. The assembler builds its key chains out of those, so taking a reward away changes which sections carry keys, and the chains move. 42 of 206 floors, measured. |

### Chests are authored

The generator never rearranges a floor to work around a chest that holds nothing — that is an authoring decision, not the engine's. `yarn generate-world` stops instead, and writes nothing:

```
✗ 3 chest(s) hold nothing — give them loot or take them out:
    junior_2 level 1 floor 0 at 4,12
```

Add loot, or take the chest out; the stats above the failure still print, so a stopped run is not a blind one. `yarn validate-world` fails on the same check without writing either. The check runs on the assembled floor rather than on the spec, because a spec cannot tell the two apart: a treasure end with no `endReward` is exactly how a section offers itself as a floor-key host, and the room the player opens then holds a key.

Today the count is zero, and it stays zero even with `EMPTY_FRACTION` dialled up to 0.6 — every treasure room in the world ends up holding either a reward or a key. The warning is there for when that stops being true.

---

`packing` and `corridorStraightness` are the two worth naming twice. They re-shape a floor end to end, and until both were added to the section hashes they did it **silently** — 206 of 206 floors re-carved with not one hash moving. Both hashes now carry them.

---

## Where the lists live in code

- `computeMainSectionHash` / `computeSideSectionHash` in `src/game/siteAssembler.ts` — the hash inputs are the structural list, in one place.
- `sideIsolated` / `subIsolated` / `mainIsolated`, same file — the isolation decision, named once and used by both the layout and the hash so the two cannot drift.
- `assignSection` in `src/worldGen/placeEncounters.ts` — where gen writes `sealed` for a trap.
- `worldFloorAssembly.spec.ts` — the sweep that keeps this page true.

A `legacySectionHash` rides along on every cell: the hash as it was computed before the encounter left the hash inputs, accepted by the readers so saves written under the old scheme keep matching. It is read-only and can be deleted once no live save predates it.
