# Room prefabs

A room prefab is a designed room: a drawing of the room with named places the carve fills. It is a `.room` text
file under `src/game/rooms/<tier>/`, one folder per tier (starter, junior, expert, master, wizard), read from disk
like a `.lock` file. A room goes by its bare file name, so two files with one name are refused; the file's `tier`
header must equal its folder; a `<name>-blocked.room` is kept for its designer to fix and never read.

The notation is read by `src/game/prefabNotation.ts` into the `Prefab` type (`prefabTypes.ts`). It is:

```
THE HEADER
  room hall                     the room's name
  tier master                   the tier it is dressed in
  activity storage              what the room is for (optional)
  mirror                        the carve may use it mirrored left to right (optional)

THE DRAWING
  layout [name]                 a drawn variant; the rows follow, one character per cell, a space between
  #  wall   d  door place   .  free floor
  every other character is a letter of the legend; the outermost row and column are the ring
  d and wall-item letters stand on the ring, every other letter inside; a letter drawn over several
  cells is one object of that footprint, and a footprint is a full rectangle

THE LEGEND
  p floor pillar | patron       a place for one of these kinds; floor, wall (first inside row only), ground, wallItem
  g floor? gift 3 of 4          ? makes it optional; "3 of 4": of the places of g, three are filled
  r floor? rubblePile 1 of 3 per q   one of three per place of q
  s stop                        where the player stands: exactly one per layout, inside
  a actor   c chest   o portal   m mechanism    special places, inside
  gift = jarRack | basin        a named list of kinds, declared before the legend line that uses it

COMMENTS
  // comment                    ignored to the end of the line; a file opens with // designed by: name
```

## The check

`src/game/prefabChecks.ts` takes every variant of a room (each layout, plus its mirror when the header says
`mirror`) in every legal fill of its places, and requires that the doors stay joined and the stop and every
blocking special (actor, chest, portal, mechanism) stay reachable. A room whose places cannot be filled, or whose
fills pass `MAX_FILLS`, is faulty too. `prefabFaults` lists every fault; empty means the room always walks.

`catalogueRoom(name)` (`src/game/roomCatalogue.ts`) hands out a room by its bare name and throws when it is missing
or has a fault. `src/game/rooms.verify.ts` runs the check on every room in the catalogue.

## `yarn room`

```
yarn room                      the catalogue as one table: tier, layouts, variants, fills, faults
yarn room hall                 one room: its faults, and each variant drawn with one sample fill
yarn room --new junior/hall    starts src/game/rooms/junior/hall.room with the notation as comments
yarn room --help               the notation
```

A drawn variant shows the filled places by their letters and an unfilled optional place as `.`.
