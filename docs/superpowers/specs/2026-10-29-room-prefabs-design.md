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
  activity) and the room as an ASCII grid, written in a dev-mode room editor (below) or by hand.
- **Per tier.** Each tier has its own prefabs, in its own dressing.
- **Door places, not doors.** The file marks where a door _may_ be; the carve chooses which it uses. An unused
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

The file mostly marks **places**, not objects; the carve fills each from the kinds the file lists for it,
deterministically from the site. Three storerooms on one floor are dressed three ways.

- **Kinds of place:**
  - a wall place (against the north wall: a jar rack, a shelf, a desk);
  - a floor place (free-standing: a basin, a pillar, a mat);
  - a sized place (2×1, 2×2 …) that takes only kinds of that footprint (a banquet table, a throne);
  - a wall-item place (a niche, a tally board, a frieze);
  - a ground place (designer, 2026-10-29): drawn on the floor under the player and walked over, such as steps up
    to a dais. The check counts it as free floor. Mirroring flips its sprite; a turned layout names its own kind
    (steps rising north are another drawing).
- **A place may be optional** and sometimes stay empty.
- **Place groups with a count:** "of these 5 places, 3 are filled", for example with gifts brought to the hall
  (jars, baskets, chests, as the file lists them). The carve picks which 3 per room.
- **A ruined room is drawn:** a stump on the pillar place, and around it the places where its fallen top may lie,
  one of them filled per stump. The top cannot be walked over.
- **Patron statues stand on pillar places:** a pillar place may hold the floor's patron statue, swapped for the
  right patron. There is no separate patron letter.

## Placing prefabs on a floor: the DSL

- **Only rooms the DSL names become prefabs.** Every other room stays as rooms are today.
- **A prefab takes over a room the floor already has; it never adds one** (designer, 2026-10-29). The floor's graph —
  its forks, chambers and branches, and so its loot slots, keys and lock walk — is decided as today; centrality
  picks which of its rooms a prefab takes. A floor with too few fitting rooms is refused (min is hard), and the
  designer gives it more side paths in the DSL.
- **Which rooms a prefab may take** (designer, 2026-10-29): forks, pass-through chambers and empty dead ends; and a
  room that holds a chest or a portal (stairhead, exit) only when the prefab marks a place for it — a chest place,
  a portal place. The room's chest or portal then stands on that place. One generic rule: a prefab takes a room
  whose contents it has a place for.
- Per prefab the DSL gives:
  - **min and max** placements;
  - **how central** it lies: from the ends of the floor (dead-end branches far out) to its middle (a junction close
    to everything). A storeroom at the ends, the counter room central.
- **min is hard**: a floor that cannot hold it is refused at bake time with a clear message, like the economy guard.
  Between min and max the carve places as many as fit. No silent shrinking to a smaller room.
- Where the DSL names a prefab is the builder's call (floor and pyramid level, like `chambers`).
- **Story rooms are pinned prefabs** (designer, 2026-10-29). A scene happens in one authored room, so its prefab is
  pinned to that node through the existing node selectors (`nodes: [{ where, room }]` beside `activity`), not
  placed by min/max/centrality. The prefab marks where the scene's figure stands (an actor place beside the stop).
  Fez's meeting on `starter_1` floor 0, Ipi's room, the Sphinx inscription and the Djoser and Sphinx walks become
  prefabs; a scene stops borrowing an activity's set.

## Starter first

Starter gets prefab rooms in this release (designer, 2026-10-29: "laten we starter goed doen"): its story rooms as
pinned prefabs, and prefab rooms for its activities (weighing, packing, storage, selling, ledger) placed by the DSL.
Starter's floors are small, so its prefabs are small; they use starter's painted props and the new starter kinds in
`themed-rooms.md` §1. Starter's carved floors change on purpose: the starter guard (`starterCarve.verify.ts`) is
re-snapshotted once, after the designer has looked at the carved starter floors, and guards them from then on. This
release resets saves.

## The room editor

A dev-mode editor beside the lock editor (designer, 2026-10-29): pick the tier, write the text, see the room drawn
live with that tier's art, with its variants, fills, a walk between doors and the check's faults. A palette shows
every prop and wall item with its sprite and footprint, greyed where the tier has not painted it yet; a click
adds its legend line. A kind's size comes only from its registered footprint, never from the file. The text is
shared by link or copied into its `.room` file.

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

- A drag-and-drop editor: the room editor edits the text and previews it.
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
- Starter's carved floors change only through prefabs its DSL names, and are re-snapshotted once after the designer
  has seen them (the starter guard, `starterCarve.verify.ts`).
- Strings nl + en; core names no mod; bake and verify under `timeout 900`.

## The builder's calls (Claude's, for the designer to check)

- **The order inside the carve is the builder's.** The designer judges the carved floor, not the steps; prefab
  rooms will likely have to claim their space before the maze is drawn.
- **Places name what they take, in the file** (designer, 2026-10-29): a place lists the kinds it may hold
  (`pillar | patron`) or a named list the file declares (`gift = jarStack | basketStack | chestProp`). No tag or
  pool in code decides what stands in a prefab; the check enumerates exactly the file's lists.
- **The floor does not widen itself for a prefab.** A hall that does not fit refuses the bake; the designer raises
  packing.
- **Lock controls stand only on mechanism places** in a prefab room, and the lesson check runs for every variant.
- **The patron room stays as today.** A pillar place takes the patron's statue only on a floor with a patron.
- **Junior loses nothing:** no shipped kind is a centre kind yet (the bake stands 0 centre pieces), so removing
  "piece plus one ring" changes no floor. The first real prefabs are starter's; junior's come with its repaint.
  The engine is built and tested with made-up prefabs; real prefabs are never pinned in unit tests.
- **A prefab whose prop has no art yet** is refused at bake time, so a floor never shows a missing sprite.
- **Centre kinds no longer grow rooms by themselves.** A room only grows as a prefab the DSL names; a banquet table
  is a sized place in a junior prefab. `growRooms`' "piece plus one ring" goes away; the walk, the stop and the fade
  from room-walk-paths stay.
- **"Central"** is measured by walking distance to the floor's far ends, not by drawn position.

## The file format (Claude's proposal, for the designer to review)

```
// designed by: designer
// master. A long hall: two rows of pillars, an aisle, the throne on its dais.
room audienceHall
tier master
activity audience
mirror

layout
# # n d # d # n # #
d . p . p . p . . #
d . . . . . s T T d
d . p . p . p T T #
# # # d # d # # # #

layout turned
# # d # n #
# . . T T #
d . . T T d
# p . s . p
d . . . . d
# p . . . p
d . . . . d
# p . . . p
# # d # d #

p  floor  pillar | patron
T  floor  throne
n  wallItem
s  stop
```

- Fixed signs: `#` wall, `d` door place, `.` free floor. Every other letter is declared in the file's legend.
- `mirror` lets the carve use the room mirrored left↔right; each further `layout` is a drawn variant.
- A letter repeated over several cells is one object of that footprint.
- `floor?` marks an optional place; `3 of 4` after a legend line makes that letter's places one group of which 3
  are filled.
- A ruined hall is drawn, not derived (designer, 2026-10-29):

  ```
  q  floor  pillarStump | patron
  r  floor? pillarTop  1 of 3 per q
  ```

  `q` is a stump; the `r` places touching it hold its fallen top, one per stump. An `r` touching two stumps counts
  for both.

- `gift = jarStack | basketStack | chestProp` declares a named list of kinds for this file's places.
- Chest, portal and mechanism places are legend lines too (`c chest`, `o portal`, `m mechanism`).

## Left to the builder

- The final text format and its letters, starting from the proposal above.
- The DSL syntax for prefab, min/max and centrality.
- How the carve finds space, and how it chooses doors, mirror, variant and fills.
- How the lesson check and the bake report treat prefab rooms.
