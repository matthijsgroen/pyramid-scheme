# Maze with rooms — design

Designer, 2026-10-30. Replaces the layout stage of [2026-10-29-carve-engine-design.md](2026-10-29-carve-engine-design.md)
after three layouts (row/column stretch, greedy placement, sketch + push + press + search) were judged by eye: "slingers
met kamers", too much void, not "made". The old maze carve feels compact and made; it failed only at big rooms,
because it dug the maze first and then tried to fit a prefab into it. A spike (starter_1#1#0, a 7×4 pillared hall
reserved before digging) stayed compact: 15×15 at density 0.48. Designer: "Ja dit ziet er goed uit!"

## Intent

The maze of the lattice engine stays the floor: corridors packed side by side with one wall between, a filled,
roughly square rectangle, little scrolling on a phone. A room bigger than one node claims its space in that maze
before the maze is dug, as a destination the maze runs to, so big rooms fit without the floor sprawling.

## Decisions

- **Engine:** the lattice carve (`LATTICE_ENGINE`) is the engine. The graph/layout engine is parked on its own branch.
- **A big room is a block of lattice nodes**, reserved before the maze grows: its prefab rect (ring included) laid on
  the lattice at pitch 2. Its door places sit on the block's edge where a lattice way can meet them.
- **A reserved room is a node of the floor's graph, not a hole in the maze.** The main path and side paths route to
  it and through its door places as they do to any room; pruning never empties it.
- **Which room gets which prefab is decided before digging**, from the DSL (`rooms`: min, max, central; pinned
  `room:` on a node selector). "Central" is measured on the path the DSL describes (position along the main path,
  distance from its ends), since no maze exists yet.
- **Pinned story rooms** (Fez, Ipi) use the same reservation.
- **3×3 rooms stay as they are** (one node, painted ring), so a floor without big rooms carves as today.
- **No silent shrinking:** a floor that cannot hold its `min` rooms refuses at bake time, as today. The ladder may
  grow the grid; the designer judges size by eye.
- **Kept from the carve-engine work:** the DSL room vocabulary, prefabs and their check, the room editor, unique save
  addresses per laid cell. Wide corridors, floor plans and `spread` wait for a floor that asks for them.

## Proof

- Density ((room + corridor cells) / box) and aspect per floor, measured next to the lattice carve without big rooms.
- Screenshots of every starter floor; the designer judges.
- Spike before plan: starter_1#1#0 with the hall as a real graph room off the entrance AND Fez's pinned stall, then
  one junior floor with two big rooms; pictures first.

## Left to the builder

How reservation enters the pass list, how a block's doors meet lattice ways, and how blocks avoid each other.
