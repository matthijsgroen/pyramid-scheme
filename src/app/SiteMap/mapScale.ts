// Every size on the site map derives from this one base unit. Bump EM to zoom the whole
// map in or out — cell size, wall thickness, and every room icon's radius scale with it,
// instead of needing a dozen hand-tuned constants kept in sync by hand.
export const EM = 14

export const CELL = EM * 4 // 56 — width/height of one grid cell, in SVG units
export const WALL_THICKNESS = CELL / 11 // ~5

// Room icon radii. Puzzle/trap rooms read slightly larger since their square shape has
// more visual weight at the same radius than the circular/diamond ones.
export const NODE_RADIUS_LARGE = CELL * 0.34 // entrance, gate, treasure, stairhead, exit — ~19
export const NODE_RADIUS_PUZZLE = CELL * 0.36 // puzzle, trap — ~20
export const NODE_RADIUS_FORK = CELL * 0.16 // junctions stay small — connective tissue, not a destination — ~9

export const EXPLORER_DOT_RADIUS = CELL * 0.2 // ~11
export const MARKER_RADIUS = CELL * 0.07 // reachable-corner dot / corridor-run arrow — ~4

// ─── Map geometry ─────────────────────────────────────────────────────────────
// A wall needs somewhere to BE. Cells are laid out on a stretched pitch: every cell carries an
// interstice on its north and west side, and that gap is a place in its own right — floor where the
// player can walk through, wall where they cannot. Squeezing a wall onto a zero-width edge instead
// is what made walls read at two different sizes, one a full face and one a bar.
//
// The north gap is tall, because it is the wall you look AT; the west gap is thin, because a wall
// seen edge-on is only its own thickness.
// WALL_H must DIVIDE CELL. The wall-face texture repeats on the face height, so every face lands on
// the pattern origin only if the row pitch is a whole number of faces — otherwise each row samples a
// different slice of the art and the dark ones read as black holes in the wall.
export const WALL_H = CELL / 2 // 28 — the visible height of a back wall
export const SIDE_W = CELL / 4 // 14 — the thickness of a side wall, seen edge-on
export const ROW_PITCH = CELL + WALL_H // 84 = 3 faces
export const COL_PITCH = CELL + SIDE_W // 70

/** An archway grows out of the band in BOTH directions, because a doorway has to look walked-through:
 * the crown stands `ARCH_RISE` proud of the wall it pierces, the way a pylon gate rises above it, and the
 * jambs come `ARCH_DROP` down onto the floor of the way through, where a real jamb stands. Growing it
 * upward alone would have bought the same opening at the cost of covering half the cell beyond — an arch
 * is painted over everything (see Archways in SiteMapView), so height above the wall eats the ground
 * behind it while height below eats only the doorway's own floor edges, which nothing else uses.
 *
 * The clear opening under the lintel comes out at 46 against a 48-tall explorer. Confined to the band it
 * was 22, and a doorway half the height of the person in it reads as a hatch however correct the
 * projection is: nothing ever overlapped, the two just could not both be believed. */
export const ARCH_RISE = WALL_H / 2 // 14 — above the wall line
export const ARCH_DROP = WALL_H / 2 // 14 — into the cell being entered
export const ARCH_H = ARCH_RISE + WALL_H + ARCH_DROP // 56

/** Padding around the map: room for the one-cell ring of wall outside the grid. */
export const PAD = CELL

/** Top-left of a cell's own floor square, in SVG units. */
export const cellLeft = (col: number): number => PAD + col * COL_PITCH + SIDE_W
export const cellTop = (row: number): number => PAD + row * ROW_PITCH + WALL_H

/** Where a node icon, prop or the explorer dot sits: the middle of the floor square. */
export const cellCenter = (row: number, col: number): { cx: number; cy: number } => ({
  cx: cellLeft(col) + CELL / 2,
  cy: cellTop(row) + CELL / 2,
})

export const mapWidth = (cols: number): number => cols * COL_PITCH + SIDE_W + PAD * 2
export const mapHeight = (rows: number): number => rows * ROW_PITCH + WALL_H + PAD * 2
