# Room choice arrows

The explorer's tap arrows let a phone player walk without scrolling. A designed room breaks the four-arrow model: two
doors on one side get one arrow. Approved spike (2026-11-01, packingRoom on starter_2): choices are made where routes
split, at automatic waypoints, so every choice keeps its own compass direction.

## The rule

- From where the explorer stands in a room (its stop or a waypoint), every shortest 4-connected path over the room's
  free cells (`roomWalk.ts` `freeCells`) to each door's `inside`, then the door's `at`. On a waypoint the stop is one
  more destination.
- Nearest destination first; each takes the candidate path sharing the longest prefix with a path already taken; ties
  in n-e-s-w order.
- Group by first step. One destination: the arrow leads to it. Several: it leads to their last shared cell, a
  waypoint (the stop, when that is the shared cell).
- Entering by a door (a run arrow into the room, or the step onto its node from a door) leads to the room's hub, a
  waypoint: the free cell nearest the rect's centre; of several, the one fewest steps from the door he came in by, then
  the first in reading order (`roomHub`). From the hub the choices are every door, the way back out among them, and
  the stop.
- Where the hub is the stop, or only one choice leads on from the hub besides the way back out, entering walks
  straight to that choice (an unsolved encounter: the ground past its other doors is dark, so only the stop is open).
- A tap on the room's node from further off walks to the stop.
- The walk between stop, waypoint and door stays the any-angle `roomPath`.
- Waypoints, the hub among them, draw nothing; only arrows lead there. Saves keep doors and stop only: a reload on a
  waypoint stands on the stop.

## The arrow ring

- Arrows sit at least half a cell from the explorer's standing spot, in their direction, with room between the glyph
  and his figure. Their tap areas may reach over him (he is never a tap target). Corridors and rooms alike.
- While the action prompt (`MapActionPrompt`) shows, the north arrow sits above the prompt.
- Tap areas stay `MARKER_HIT`.

## Tasks

1. **Choices.** `roomChoices(grid, node, standing)` in `src/app/SiteMap/roomChoices.ts`, folded into
   `clickTargets` (`markerAt`/`offeredTargets`) for a room; run arrows past a door still come from the corridor side.
   Tests on made-up rooms: two doors one side share an arrow to their split cell; from the split each has its own
   direction plus one back; a door at the stop's own side leads straight out; arrows appear only once the explorer
   stands still. `movementInvariant` covers waypoints.
2. **Waypoint position.** One position type `useSiteNavigation` and `ExplorerDot` share (the waypoint can be the node
   cell, so `explorerPos` alone cannot hold it); arrival and settle as for any stop.
3. **Ring.** Arrows at half a cell, north lifted above the prompt. Picture on a phone viewport, with and without a
   prompt.

Each task: `yarn verify`, a screenshot in the real app.
