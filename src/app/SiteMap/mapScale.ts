// Every size on the site map derives from this one base unit. Bump EM to zoom the whole
// map in or out — cell size, wall thickness, and every room icon's radius scale with it,
// instead of needing a dozen hand-tuned constants kept in sync by hand.
export const EM = 28

export const CELL = EM * 4 // 112 — width/height of one grid cell, in SVG units
export const WALL_THICKNESS = CELL / 11 // ~10

// Room icon radii. Puzzle/trap rooms read slightly larger since their square shape has
// more visual weight at the same radius than the circular/diamond ones.
export const NODE_RADIUS_LARGE = CELL * 0.34 // entrance, gate, treasure, stairhead, exit — ~38
export const NODE_RADIUS_PUZZLE = CELL * 0.36 // puzzle, trap — ~40
export const NODE_RADIUS_FORK = CELL * 0.16 // junctions stay small — connective tissue, not a destination — ~18

export const EXPLORER_DOT_RADIUS = CELL * 0.2 // ~22
export const MARKER_RADIUS = CELL * 0.07 // reachable-corner dot / corridor-run arrow — ~8
