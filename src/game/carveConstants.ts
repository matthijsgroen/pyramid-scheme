import type { Direction } from "./siteTypes"

/** HOW MANY OBSTACLE CELLS A ONE-WAY DROP SPANS, between its launch cell and its landing cell. The drop
 * reserves `2 + ONE_WAY_RUN_CELLS` cells in all, between two nodes. A constant, stated once, because every
 * drop the art draws is the same painting.
 *
 * The painting's scale is measured on `dropEast.webp` (1696 px wide): its corridor floor, the band from the
 * top of the floor to the bottom of the floor, is 530 px, and that is one cell, 56 units, so 9.464 px to a
 * unit. The art is then 1696 / 9.464 = 179 units wide, 2.76 cells, and 3 cells of run (56 + 2 x 70 = 196
 * units) hold it at its natural scale. Five cells, 336 units, stretched it to nearly twice its size.
 *
 * It must be ODD: the launch hangs off one node and the landing off another, nodes sit only on even/even
 * coordinates (NODE_STEP), so the two nodes are an even number of steps apart, which is the obstacle plus
 * the launch, the landing and one more step. 3 is the odd count nearest the measured 2.76.
 *
 * This is the run ALONG A ROW; a drop down the page runs `oneWayRunCells`' shorter vertical length. */
export const ONE_WAY_RUN_CELLS = 3

/** A vertical drop's run. A row down the page is ROW_PITCH (84) against a column's 70, and `dropNorth`'s
 * 143-unit tile spans launch, run and landing (2 x 84 + 56 = 224) with room left over, so one obstacle cell
 * holds it. Still odd, for the same node-parity reason. */
const VERTICAL_ONE_WAY_RUN_CELLS = 1

export const oneWayRunCells = (dir: Direction): number =>
  dir === "n" || dir === "s" ? VERTICAL_ONE_WAY_RUN_CELLS : ONE_WAY_RUN_CELLS

/** Steps from the node a drop hangs off to the node it lands beside: launch, obstacle, landing, and the
 * step onto the far node. */
export const oneWayReach = (dir: Direction): number => oneWayRunCells(dir) + 3

// Multiplier on the grid's roaming room beyond its bare content minimum (see the N-growth
// loop in assembleFloor). 1 = today's default footprint; <1 packs the floor (and its
// winding corridors) tighter, >1 gives it more breathing room. Overridable per floor via
// FloorConfig.packing.
export const DEFAULT_PACKING = 0.1
