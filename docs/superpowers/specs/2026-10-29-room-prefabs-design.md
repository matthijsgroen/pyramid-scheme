# Room prefabs — design

Designer conversation, 2026-10-29. Builds on [2026-10-28-room-walk-paths-design.md](2026-10-28-room-walk-paths-design.md)
(walks through a room, the stop, the fade) and replaces its room growth: "a centre piece plus one ring".

## Intent

A room of a centre piece plus one walking ring holds that piece and nothing else: anything more blocks the way
round. An audience hall — a throne on a dais, two rows of pillars, an aisle between them — cannot be made that way.
Rooms should be **designed**: a drawn shape with its objects, its possible doors and its standing place, which the
carve then places in a floor. A merchant's floor reads as one place when its storerooms sit at the ends and its
counter room in the middle; the same storeroom met three times should not look like a copy.

## The designer's picture: the audience hall

```
 + + + d + d + + +
 d . P . P . P . .
 . . . . . . . T T .
 d . P . P . P T T d
 + + + d + d + + +
```

A long hall (about 7×4). Two rows of three pillars with an aisle between them, running straight at the throne, a
2×2 dais at one end, standing clear of the far wall so one can walk behind it. Door places on every side. The
player walks between and past the pillars and round the throne; he stands in the aisle before the throne.

## What a prefab is

- **A text file**, drawn by hand (Claude or the designer), in the manner of the `.lock` files: a header (name, tier,
  activity) and the room as an ASCII grid. An editor may follow later; not now.
- **Per tier.** Each tier has its own prefabs, in its own dressing.
- **Door places, not doors.** The file marks where a door *may* be; the carve chooses which it uses. An unused
  door place is wall. One hall thereby fits a fork, a pass-through and a side branch.
- **A stop**, marked in the file: where the player stands when he taps the room, and where the room's marker sits.
- **Walks are not drawn.** The walk is the shortest way over the room's free cells (the room-walk-paths work,
  with more obstacles).
- **Mechanism places.** The file marks where a lever, plate or torch may stand, so a mechanism room can be a prefab
  too.
- **Layout variants.** A hall may run west→east, east→west, south→north.
  - **Mirroring left↔right the carve does itself**: the north wall stays the north wall.
  - **A turned layout is drawn as its own variant** in the same file, because props have one face and stand against
    the north wall only (`themed-rooms.md` §3, no rotation); turning would put wall places on east or west walls.
- **A broken variant is its own prefab** (a ruined audience hall beside a kept one), not a chance swap inside the
  kept one. The DSL chooses which.

## Places, filled per room

The file mostly marks **places**, not objects; the carve fills each from the room's activity pool in the room's
tier, deterministically from the site. Three storerooms on one floor are dressed three ways.

- **Kinds of place:**
  - a wall place (against the north wall: a jar rack, a shelf, a desk);
  - a floor place (free-standing: a basin, a pillar, a mat);
  - a sized place (2×1, 2×2 …) that takes only kinds of that footprint (a banquet table, a throne);
  - a wall-item place (a niche, a tally board, a frieze).
- **A place may be optional** and sometimes stay empty.
- **Place groups with a count:** "of these 5 places, 3 are filled", for example with gifts brought to the hall
  (jars, baskets, chests from the tier's pool). The carve picks which 3 per room.
- **An object may claim more than its place:** a fallen pillar is a stump on the pillar place and rubble on a
  neighbouring cell that cannot be walked. The file says which neighbour the rubble may take.
- **Patron statues stand on pillar places:** a pillar place may hold the floor's patron statue, swapped for the
  right patron. There is no separate patron letter.

## Placing prefabs on a floor: the DSL

- **Only rooms the DSL names become prefabs.** Every other room stays as rooms are today.
- Per prefab the DSL gives:
  - **min and max** placements;
  - **how central** it lies: from the ends of the floor (dead-end branches far out) to its middle (a junction close
    to everything). A storeroom at the ends, the counter room central.
- **min is hard**: a floor that cannot hold it is refused at bake time with a clear message, like the economy guard.
  Between min and max the carve places as many as fit. No silent shrinking to a smaller room.
- Where the DSL names a prefab is the builder's call (floor and pyramid level, like `chambers`).

## The check

Every prefab is checked on its own, for every variant (mirror, turned layout) and every fill the carve may choose
(each optional place filled or empty, each count-group choice, each extra cell an object claims):

- between every pair of door places there is a way over free cells;
- the stop and every mechanism place are reachable from every door place.

A prefab that fails is refused, so the carve can never place a room one cannot cross.

## Goals

- Designed rooms with many objects that the player walks through naturally.
- One prefab, many rooms: chosen doors, mirroring, places filled per room.
- The DSL says which designed rooms a floor holds, how many, and how central.

## Non-goals

- A visual prefab editor (text files first).
- Rotated props.
- Changing rooms the DSL does not name.
- Drawing walk paths.

## Anti-goals

- Rooms that read as copies of each other.
- A prefab placed so one cannot pass through it, or whose stop is cut off.
- A required prefab quietly left out or swapped for a smaller room.
- Walks that cut through objects or go the long way round (as in the room-walk-paths spec).

## Constraints

- One rule at every tier, no per-tier exceptions; protect a case with a guard.
- Rooms keep growing on lock floors; the lock walk and the lesson check (a lesson's shut door seen before its
  control, the control off the obvious path) still pass.
- Saves are keyed by authoring address and slot, never by cells: no save migration.
- Starter's carved floors stay exactly as they are until starter's DSL names a prefab (the starter guard,
  `starterCarve.verify.ts`).
- Strings nl + en; core names no mod; bake and verify under `timeout 900`.

## The builder's calls (Claude's, for the designer to check)

- **The order inside the carve is the builder's.** The designer judges the carved floor, not the steps; prefab
  rooms will likely have to claim their space before the maze is drawn.
- **Centre kinds no longer grow rooms by themselves.** A room only grows as a prefab the DSL names; a banquet table
  is a sized place in a junior prefab. `growRooms`' "piece plus one ring" goes away; the walk, the stop and the fade
  from room-walk-paths stay.
- **"Central"** is measured by walking distance to the floor's far ends, not by drawn position.

## Left to the builder

- The exact text format and its letters.
- The DSL syntax for prefab, min/max and centrality.
- How the carve finds space, and how it chooses doors, mirror, variant and fills.
- How the lesson check and the bake report treat prefab rooms.
