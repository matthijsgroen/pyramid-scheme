# Room walk paths and growing rooms — design

Designer conversation, 2026-10-28.

## Intent

A room should be able to hold a large object in its middle — a fountain, a banquet table, a lotus pool — and the
explorer should walk round it naturally. Today he always walks corridor → the room's centre cell → corridor, so
nothing can stand in a room's middle, and every room is at most 3×3, so every room looks alike. Rooms that grow to
fit what stands in them give a floor more varied shapes and a more organic feel.

It is needed for junior's centre pieces (the banquet table, the lotus pool: `docs/game-design/themed-rooms.md`,
"Junior"). Junior is a stretch goal for the next release; the date and scope are flexible. Starter ships first and
needs no centre piece itself.

## What the player sees

- **Walking through a room with an object in its middle:** the explorer walks round the object, from the corridor
  he enters by to the corridor he leaves by. In front or behind is not a preference; the move must look natural.
- **Rooms with several exits:** there are several ways through the room, and he takes the shortest one for the
  exits he is moving between. Walking a long way round when a short way exists is the failure the designer named.
- **Standing still:** a room with a centre object has a **stop** somewhere on its paths. That is where he stands
  when the player taps the room, and the room's **diamond marker moves to the stop**, so the tap target and the
  standing place are the same.
- **Behind an object:** when he stands behind a large object that would hide him, the object turns semi-transparent,
  as an archway already does (`OCCLUDER_FADE` in `src/app/SiteMap/htmlLayers.tsx`).
- **Rooms without a centre object** behave as today.

## Growing rooms

- **The dressing decides, the carve builds it** (designer, 2026-10-28): a room's activity and its centre object are
  chosen first, and the carve gives that room the space the object's footprint needs plus room to walk round it.
  Not the DSL. The object's footprint is its kind's `DECORATION_FOOTPRINTS` entry (`src/game/siteTypes.ts`).
- **This revises the stability tenet for junior and up:** a room's activity, its dressing pool and a story-authored
  activity become structural there — changing them can move walls, and the activity pick moves ahead of the maze.
  `docs/game-design/world-spec-stability.md` and its sweep are updated to say so; starter keeps the old tenet.
- **Decoration must not lose to convenience:** a room that wants a centre object gets one. The single-cell fallback is
  for a room the floor genuinely cannot widen, and it should be rare — the carve searches for a layout that fits
  rather than shrinking the dressing. A floor where centre objects keep falling back is a bland floor, which is a
  failure even though it works.
- Rooms grow beyond today's 3×3 (for example 4×3, 5×3, 4×4) as the object needs; the shape follows the object.
- **No space:** the existing fallback stays as the last resort — the room takes a single-cell prop instead
  (`decorationFallback`, `src/game/carve/render.ts`), stays its normal size and keeps today's walk. The bake reports
  how many centre objects fell back, per tier.
- Growing moves walls. That is allowed for every tier that has not shipped; a shipped tier's layouts stay fixed.
  Starter is about to ship, so this is built for junior and later and must leave starter's floors byte-identical
  (the starter tier fingerprint).

## Goals

- Natural walks through rooms with a centre object; the shortest way among several.
- A stop per such room, with the diamond on it.
- Objects that hide a standing explorer fade.
- The carve grows a room for an object's footprint and walk-round space.

## Non-goals

- Authoring room sizes or paths in the DSL.
- Changing rooms without a centre object, or starter's floors.
- Rotated props (props still face one way; `themed-rooms.md` §3).

## Anti-goals

- Taking a longer way through a room than needed.
- Decoration that keeps falling back to small props to make the carve easy: bland floors.
- A walk that looks mechanical — cutting through the object, zig-zagging on the grid, stopping in odd places.
- A big object that hides the explorer while he stands still.

## Constraints

- Saves are keyed by authoring address and slot, never by cell coordinates
  (`docs/instructions/world-reshape-release.md`), so growing rooms in unshipped tiers costs no save migration.
- **Rooms grow on lock floors too** (designer, 2026-10-28), inside lock regions included. The lock walk
  (`floorLockWalk.ts`) and the strict world walk must still pass; `.lock` files do not change. Because those walks
  only test reachability, a new check guards the lesson rules a grown room could break: a lesson's shut door is seen
  before its control, and the control stays off the obvious path (`feedback`: lessons show the problem first).
- Movement rules in `src/app/SiteMap/useSiteNavigation.ts` and the movement invariant spec stay true: a walk goes
  only where the player may go.
- Bake and verify runs under `timeout 900`; the starter tier fingerprint does not move.

## The builder's calls already made

- **Centre object** is a property of the object kind (banquet table, lotus pool), flagged per kind, not read from the
  footprint alone; a room whose activity has a centre kind always gets it.
- **Which rooms grow:** forks and pass-through chambers. Dead-end rooms (stairheads, the exit, treasure ends) keep
  their size and their node.
- **Starter guard:** the tier fingerprint hashes configs, not carved floors, so a new check snapshots starter's carved
  floors and proves them unchanged. "Shipped" is read from the floor's tier.
- **Order:** built and tested with stand-in kinds first; junior's real centre objects, their activities and art follow
  as their own step.

## Left to the builder

- How a room's internal paths are represented (a small graph of points per room, cell-level waypoints, or curves),
  and how they join the corridor walk.
- Where exactly the stop sits on a room's paths (a sensible default: on the near side of the object, where the
  explorer is seen).
- How the carve reserves space: which pass, and how it finds a node with room to grow.
- How large objects map to activities in junior's table, beyond the footprints already listed in
  `themed-rooms.md` ("Junior").
