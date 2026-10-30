# Carve engine — design

Designer conversation, 2026-10-29. Builds on [2026-10-29-room-prefabs-design.md](2026-10-29-room-prefabs-design.md)
(prefab rooms, their check, the DSL `rooms` and pinned story rooms) and
[2026-10-28-room-walk-paths-design.md](2026-10-28-room-walk-paths-design.md) (walks, the stop, the fade). Both stay;
this replaces how a floor finds the space they need.

## Intent

The carve digs a maze with nodes two cells apart and paints rooms onto nodes. A designed room has no space in that:
placing starter's seven prefabs put only three storerooms on a floor, and Fez's floor laddered from 11×11 to 25×25
before his room fit. Packing, one number, mixes grid slack with main-path length, so it cannot say "compact" or
"sprawling".

The designer: "ik wil het in 1 keer goed doen". A floor should feel like a **real place** whose layout makes sense:
rooms and corridors working together, each floor recognisable against every other floor in the game. Rooms are
first-class space, claimed first; corridors join them.

## Goals

- **Rooms first, then corridors.** The carve places a floor's rooms (prefabs and plain rooms) as real space, then
  joins them with corridors. A prefab never has to squeeze into a maze.
- **Identity from shape and function together** (designer). Shape is the floor plan; function is which rooms it
  holds and what was done there. Both are steered by the DSL that exists today — locks, `rooms`, side paths, ward
  sections — and the engine turns that into a place that makes sense: a ward section reads as a wing, a central
  prefab draws the corridors to it.
- **Floor plans.** A floor has a kind of plan (for instance an axis, a court with rooms round it, a spiral down).
  The DSL may name it; left unnamed, the engine picks one from the seed, so a pyramid varies between floors on its
  own.
- **Shape knobs** per pyramid and per floor: compact ↔ sprawling (how long corridors run between rooms), straight ↔
  winding.
- **Wide corridors.** A corridor may be two cells wide. The player walks its centre line, between the cells;
  puzzle stops and tap targets sit on that line. A wide corridor narrows to one cell at doors, gates, the
  zipline/drop and narrow passages. **Narrow is the default** (designer): a corridor is wide only where the DSL
  asks, so a wide one reads as special. The DSL may ask at any level, a whole pyramid included, so the centre-line
  walk and stops work on any corridor, not only on marked stretches.
- **Size follows content** (designer). A floor is as big as its rooms and corridors need. No fixed grid, no maximum
  per tier, no ladder growing the grid until things fit.
- **Caves are the same engine** (designer). Same order — caverns first, then passages — with another shape
  vocabulary: ragged edges, caverns instead of rooms, winding passages that widen and narrow. The sunlit cavern is a
  pinned prefab like a story room; caves may get their own prefabs.

## The DSL: generic to specific

The designer: "standaard goed, met sturing van generiek naar specifiek mogelijk door selectors".

- **Default:** with nothing authored, the engine makes a good floor.
- **Tier / pyramid level** sets the knobs (plan kind, compact/sprawling, straight/winding, width).
- **Floor level** overrides the pyramid.
- **Selectors** steer one place exactly: a node, a section, a path or a room gets its own width, shape or prefab
  (`nodes: [{ where, … }]`, as today).
- New knobs follow the existing layering (`chambers`, `sidePaths`, `nodes`); no separate system.
- **Packing goes away.** `packing`, `packingChance`, `packingWhenHit` and per-lock `packing` are replaced by the
  shape knobs.

## What stays

- **Puzzles are corridor stops; chests stand in rooms at the end of side paths** (designer).
- **A lock describes the solve, not the shape** (designer: "locks gaan over de solve, niet over de vorm van de
  layout"). Lock areas (`hall`, `ledge`, `pit`, `gallery` in `.lock` files) are knots in a solution; the engine may
  shape them as a room, a prefab, a stretch of corridor or a wide corridor, as long as the solve is the same. The
  same lock may look different on two floors. `.lock` files do not change.
- The lock walk, the lesson rules (a lesson's shut door seen before its control, the control off the obvious path),
  the keys-and-locks reachability solver and the economy guard keep passing.
- Room prefabs, their check, the DSL `rooms` (min hard, max, central) and pinned story rooms, as specified. The
  room-prefabs rule "a prefab takes over a room the floor already has; it never adds one" still holds: the graph
  (forks, chambers, branches, so loot slots, keys and the lock walk) comes from the DSL as today.
- One exit at the end of the main path.

## Anti-goals

- Rooms very far apart, joined by long empty corridors (designer).
- Floors that read as a grid (designer).
- A designed room quietly dropped or shrunk because it did not fit.
- Two floors that look alike.

## Constraints

- **The new engine replaces the old for every tier and every cave at once** (designer). Every floor in the game
  changes; that is expected. Starter is judged first; the starter guard (`starterCarve.verify.ts`) and the tier
  fingerprints are re-snapshotted after the designer has seen the carved floors.
- One rule at every tier, no per-tier exceptions; protect a case with a guard.
- Deterministic from the site's address seed.
- Mod off = same carve, bare nodes, open corridors. Core names no mod.
- Saves are keyed by authoring address and slot, never by cells. This release resets saves; afterwards they stay
  compatible.
- Strings nl + en; bake and verify under `timeout 900`; verify by looking (screenshots).

## The builder's calls (Claude's, for the designer to check)

- **Three stages: graph, layout, carve** (designer, 2026-10-30, after seeing a first try that stretched the lattice's
  rows and columns: too big, rooms far apart, it read as a grid).
  - **Graph.** The existing passes in `src/game/carve/` (`docs/instructions/carve-passes.md`) keep deciding the
    floor's topology — which nodes, which rooms, where chains hang, where locks, gates and drops sit. Their lattice
    is only a scratchpad: the result is read as a graph (rooms, corridor stops, gates, drops and the corridors that
    join them) and the lattice positions are dropped. A lesson's order (its shut door met before its control) is
    already in the lock format, so it lives in the graph, not in geometry.
  - **Layout.** Pieces get positions; nothing is a cell yet. A room is a block with door places (a prefab's rect, a
    plain room's footprint). A lock keeps its behaviour, not its shape (designer, 2026-10-30): its rooms and stops
    are laid out like any other, and its walk is checked after the carve. A lock may also get extra side corridors
    and rooms, as long as its puzzle stays the same (designer, 2026-10-30); not built until a floor needs it. A corridor is a string: an orthogonal
    polyline between two door places, holding its stops in order, with a 1-cell margin no other piece may use, so
    corridors never cross and never run alongside each other or past a room they do not join. A drop is a fixed
    straight piece. The main path is laid first, then each side path as a subtree hung on its parent (built up as
    in Enter the Gungeon, not searched as in Edgar: floors are nearly trees). Then the layout is compacted: subtrees
    slide toward their parent until something is in the way; `spread` sets how tight, `straightness` how often a
    string bends. A failed placement retries inside its subtree, then the floor retries from a derived seed, with a
    hard cap; after that the bake refuses with the reason.
  - **Carve.** Strings become corridors (narrow, or wide where the DSL asks), blocks become rooms, then validate and
    the existing checks run on the carved floor.
  - The layout may be drawn on its own (blocks and lines) in Storybook; that is optional. The failure rate of the
    layout is measured over every shipped floor and many seeds before the swap.
- **Every tier carves and passes the gates before the swap; only starter is judged by eye for this release**
  (release tier by tier). Junior and up are looked at with their own release.
- **A lock area's shape is the engine's choice from the seed**, steerable by a selector. A lock's own region
  layout (`regionLayout`) stays the lock's; a plan kind does not override it. Lock seating comes after rooms are
  placed; the lesson check runs on whatever shape was carved. A lock area laid out as a room is a room like any
  other, so a prefab may take it under the room-prefabs rule.
- **No size limit, but a report.** The bake report names each floor's size and its longest corridor between two
  rooms, so "rooms far apart" is visible; it is not a refusal.
- **A lock the engine refuses** may become `<name>-blocked.lock` (designer, 2026-10-29) for the designer to rework,
  "maar moet wel meer uitzondering dan regel zijn": the engine is made to lay out the existing locks; blocking one
  is reported to the designer with the reason, never a way round a hard case.
- **Branch:** built on `camp/home-and-loot`, the branch the starter release ships from.
- **Rooms claim space first**, sized by their prefab or by a plain-room footprint; corridors route between doors
  afterwards. A plain room (not a prefab) stays as rooms are today, just given space.
- **Wide corridors are an authored property of a path segment**, carried on the cells; walks and stops read the
  centre line from it. The narrowing at doors, gates, zipline/drop is one rule, not per feature.
- **Plan kinds are data**, a small named set the DSL can reference and the seed can pick from. Their first set is
  the builder's proposal, for the designer to look at.
- **Compact ↔ sprawling** is measured by walking distance between rooms, not by grid area.
- **Refusal, not growth.** A floor whose authored content cannot be laid out is refused at bake time with a clear
  message, as `min` already is. No silent retry at a bigger size, since there is no fixed size to grow.
- **Starter's task-12 commit** (`724a2318`, local) waits; its prefabs and DSL `rooms` move onto the new engine.

## Left to the builder

- The pass list, the layout algorithm and how corridors route.
- The names and value ranges of the shape and width knobs, and the first set of plan kinds.
- How a cave's ragged shape is drawn from the same room/corridor model.
- How the bake report describes plans and widths.
