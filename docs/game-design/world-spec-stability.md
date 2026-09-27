# World-Spec Stability

Which settings in a floor's spec change the shape of a place, and which do not.

The world is authored continuously — new puzzle families arrive, journeys get pointed at different pools, traps land on floors, loot moves around. A player is somewhere in the middle of that world while it happens. This page says what an author can change freely and what will cost a run its progress, so the choice is made knowingly rather than discovered afterwards.

For how progress survives a change at all — how a save names a cell, inventory-as-truth, storage versions — see [world-stability.md](./world-stability.md). This page is the authoring-side companion: the field list.

---

## The rule

**Structure changes only when the corridors change** — their number or their length.

Everything else about a room is content: which puzzle it serves, what its chest holds, which key opens the door beside it, what it looks like. None of that may move a wall, and none of it costs a player the floor.

Two invariants follow, and `src/app/SiteMap/worldFloorAssembly.verify.ts` sweeps every authored floor in the world to hold them. It runs under `yarn verify-content`, the pass you make AFTER AUTHORING — these invariants answer a change to the world spec, so they are checked when somebody makes one rather than on every test run (docs/instructions/testing.md):

1. A setting that is not about the shape of the place moves nothing.
2. A room's authored slot names the same room after the carve as before it. That is what a save holds — the section's address and the room's place in its chain — so a floor may be re-carved end to end at no cost, as long as the authoring behind it did not move.

**Re-carving is no longer what costs a run its progress.** It used to be: exploration was stored by grid coordinate under a hash that covered the floor's own carve knobs, so moving a wall moved everything. Progress is now keyed to the authoring, and the cost of a change is only the rooms that genuinely changed. See [world-stability.md](./world-stability.md).

---

## Free to change

Change these as often as you like. The walls stay put, and every run keeps its explored corridors, its found passages and its opened chests.

| Setting                                  | Why it is free                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `encounter`, `encountersByIndex`, `role` | Which puzzle a room serves — **including making it a trap**. Nothing about an encounter reaches the layout. See below.                                                                                                                                                                                                                                                                                             |
| `rewards[]` slot contents                | What a mid-chain chest holds, including leaving a slot empty. Loot identity is tracked in the inventory, not in the world.                                                                                                                                                                                                                                                                                         |
| `endReward` / `mainEndReward` _contents_ | Which reward a chain's end chest holds. Swapping one reward for another is free; **removing it entirely is not** — see below.                                                                                                                                                                                                                                                                                      |
| `gate.wardKeyId`, `gate.color`           | Which key opens a door, and what colour it wears. Gate _presence_ is structural; which key is not.                                                                                                                                                                                                                                                                                                                 |
| `decorations`                            | The pool a fork or dead end draws its sarcophagus or rubble from. Purely drawn.                                                                                                                                                                                                                                                                                                                                    |
| `wallDecorations`                        | The same, for what it hangs on a wall — a stela, a niche, a star shaft. Purely drawn.                                                                                                                                                                                                                                                                                                                              |
| `condition`                              | What has got into a site and shows on every floor of it — water standing in it, green through the brick. Purely drawn: it composes into the map's mood overlay and nothing else reads it.                                                                                                                                                                                                                          |
| `patron`                                 | Whose tomb this is. Purely drawn, and one step weaker than `condition`: it only chooses `<kind>-<patron>.png` over the generic drawing for five kinds, and falls back silently where that file is absent. Verified rather than assumed — authoring nine gods across ten journeys left every line of `generatedWorld.ts` identical but the patron lines and `worldContentHash`, which is derived and has no reader. |
| `theme`                                  | The skin a room's puzzle wears.                                                                                                                                                                                                                                                                                                                                                                                    |
| `encounterArgs`                          | A family's own payload (a tableau's `runNr`). Read by that family alone, never by the carve.                                                                                                                                                                                                                                                                                                                       |

### Why encounters are free, including traps

They were not always. Two separate paths let an authored encounter reshape a floor, and both are closed:

- **Isolation.** Trapped content is cut off from leftover maze edges, so no stray door lets a player step past it. The assembler used to decide that by reading the section's encounter. World-gen now writes it down instead — `sealed` on any section it gives a trap — so the assembler lays out a floor without ever asking what lives in it.
- **Validation.** A fork branch of only traps counts as bland, a bland floor is rejected, and a rejected floor is re-carved at a different seed. So a trap could reshape a whole floor by failing a _content_ check. A trap is now traversed like a puzzle: a branch that is only a trap is still bland, but a trap on the way to something worth reaching no longer hides it.

If a third such path ever appears, the sweep fails: it rewrites every encounter in the world to one family — a plain puzzle, and a trap — and requires identical walls and identical hashes on every floor.

---

## Moves the walls

Every row here is a case in `src/app/SiteMap/authoringChangeCost.spec.ts`: it authors a floor, walks all of it, re-authors it and asserts exactly which rooms come back explored. This table is that spec in prose, not a claim beside it.

These re-carve. **The walls moving is free** — every room keeps its slot, and the corridors between them come back lit as far as the furthest room the player had reached. What costs something is a room that the authoring itself added, removed or replaced: that one room reads as unexplored, and if it held a chest, the chest is there again.

The cost column says what a player actually loses, which for several of these is now nothing.

| Setting                          | What moves                                                                                                                                                                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pathPuzzles`                    | The number of rooms on a chain, so the length of the walk. Rooms that still exist keep their progress — going 4 → 6 restores `p0`–`p3` and leaves `p4`–`p5` unexplored; going 6 → 4 simply drops the last two.                                                                           |
| `packing`                        | The main path's length multiplier. Re-carves the **whole floor**, side sections included — and costs nothing: no room changes, so only the corridor fog is redrawn to each section's high-water mark.                                                                                    |
| `corridorStraightness`           | How often the maze goes straight instead of turning. Re-carves the whole floor, and costs nothing, for the same reason as `packing`.                                                                                                                                                     |
| `sealed`                         | Cuts a stretch off from leftover maze edges, removing the shortcut loops around it. Re-carves; no room changes, so nothing is lost.                                                                                                                                                      |
| `gate` (present or absent)       | A gate is a room, and gated content is isolated. A ward gate costs its own room and no more. A **floor-key** gate costs more than it looks: its key has to live on this same floor, so the assembler grows a section to host one, and that section and its chest are new ground.         |
| `hidden`                         | A hidden section is masked out of the walkable grid until it is found. Hiding one that was open asks the player to find it again; what they explored inside it is still theirs once they do.                                                                                             |
| `end`, `exitOrStaircase`         | What terminates a chain.                                                                                                                                                                                                                                                                 |
| `difficulty`                     | Costs nothing now. It does not move a wall and it is no longer part of a section's identity — the same rooms come back with different boards behind the ones still unsolved.                                                                                                             |
| Adding or removing a section     | New section: explored from nothing. Removed: its saved cells go stale and are ignored. **Inserting one ahead of another** shifts every later unlabelled sidepath's address, handing the newcomer a neighbour's progress — give a path a `label` to pin it (see world-stability.md).      |
| A section's `label`              | Its name **is** its identity, so adding, changing or removing one resets that section — an unlabelled path answers to `s0`, a labelled one to its label, and nothing can tell a rename from a replacement. Label a path when you author it, not after players have walked it.            |
| Removing a section's `endReward` | Not because the chest is empty, but because an end with no `endReward` is how a section offers itself as a floor-key host. The assembler builds its key chains out of those, so taking a reward away changes which sections carry keys, and the chains move. 42 of 206 floors, measured. |

### Chests are authored

The generator never rearranges a floor to work around a chest that holds nothing — that is an authoring decision, not the engine's. `yarn generate-world` stops instead, and writes nothing:

```
✗ 3 chest(s) hold nothing — give them loot or take them out:
    junior_2 level 1 floor 0 at 4,12
```

Add loot, or take the chest out; the stats above the failure still print, so a stopped run is not a blind one. `yarn validate-world` fails on the same check without writing either. The check runs on the assembled floor rather than on the spec, because a spec cannot tell the two apart: a treasure end with no `endReward` is exactly how a section offers itself as a floor-key host, and the room the player opens then holds a key.

Today the count is zero, and it stays zero even with `EMPTY_FRACTION` dialled up to 0.6 — every treasure room in the world ends up holding either a reward or a key. The warning is there for when that stops being true.

### A floor that will not carve stops the build

The same sweep assembles every floor at the exact seed the runtime hands it, so it is also where a floor that cannot be carved at all is caught:

```
✗ 2 floor(s) cannot be carved at the seed the runtime hands them:
    wizard_3 level 1 floor 2
```

Such a floor renders "Site layout unavailable." for every player and never recovers, so nothing is written. Re-author it, or change a setting from the list above — a different `packing` or `corridorStraightness` re-carves it. `worldFloorAssembly.verify.ts` holds the same line against the artifact already in the repo.

---

`packing` and `corridorStraightness` are the two worth naming twice, for the opposite reason they used to be. They re-shape a floor end to end — 206 of 206 floors re-carved, measured — and they are in the section hash, which is exactly why the hash is no longer what a save is filed under: keying progress to it meant retuning either knob reset every run in the world at once. A save is keyed to the authoring instead, so these two now cost nothing at all.

---

## Where the lists live in code

- `computeMainSectionHash` / `computeSideSectionHash` in `src/game/siteAssembler.ts` — the hash inputs are the structural list, in one place. The hash fingerprints the shape; it is **not** the identity a save uses.
- `sectionAddresses`, same file — what each section is called (`label` where authored, else `main`/`s0`/`s0.1`), and the refusal when two would answer to the same name.
- `cellSlot` / `cellAddress` in `src/app/SiteMap/cellIdentity.ts` — what a save actually holds.
- `sideIsolated` / `subIsolated` / `mainIsolated`, same file — the isolation decision, named once and used by both the layout and the hash so the two cannot drift.
- `assignSection` in `src/worldGen/placeEncounters.ts` — where gen writes `sealed` for a trap.
- `worldFloorAssembly.verify.ts` — the sweep that keeps this page true.

A `legacySectionHash` rides along on every cell: the hash as it was computed before the encounter left the hash inputs. Both hashes now serve one purpose only — matching the coordinate archive while a save is re-keyed — and go with that archive when the reshape ships.
