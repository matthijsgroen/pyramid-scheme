# Rooms join their own doors (designer rulings, 2026-10-31)

Spike: branch `worktree-agent-afa585224bc3015e0` (3 commits on 5d2c15e4), report
`many-ways-spike-report.md` in the session scratchpad. Pictures approved: caveBasin on the starter cave's hall.

## Why
A designed room should be able to hold a prop in its middle (the cave's basin) with the explorer walking around it,
and take any spot of a floor, a lock's many-way hall included, without growing. Pre-release engine work: the carve
must be stable before the starter release.

## Rulings
1. A room is ONE stop. The map shows a dot at each door in use and the room's stop; nothing on the room's floor.
   The walk inside a room is found at runtime by the room's own small pathfinder (`roomPath`, roomWalk.ts) around
   standing objects. Room floor cells take no tap.
2. The carve digs NO lattice passages inside a room. A room's doors are joined through the room alone (prefabChecks
   already proves every variant's doors join). The floor graph (pathfinding, lock walk, labels, digests) knows a
   room as one node joining its doors.
3. A door only needs to sit where a corridor arrives on a lattice line; the room's placement parity aligns its doors.
   A 3x3-inside room carries one mid-wall door per side.
4. A room may take a region (or hub) with more ways than it has doors: the extra ways branch off the region's
   corridor outside the room ("porch"), as on the old cave floor.
5. Save stability check `routeStubs`: a room's own cells and door places count as that room (approved).
6. A region's control (lever) stands on the room's mechanism place / stop, never on a corridor node beside it.
7. caveBasin (src/game/rooms/starter/caveBasin.room, 5x5, basin centre, 4 mid-wall doors) stands on the starter
   cave's hall: `rooms: [{ room: "caveBasin", min: 1, max: 1, central: 1 }]`.

## Constraints
Never weaken a check; tests that pin the retired straight-ray rule are retired with a test of the new rule. Hub carve
success must be back at its bar (36 seeds). Tests use made-up rooms. Every bake under `timeout 900`.
