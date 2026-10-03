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
 * What would force an authored per-drop field: `dropNorth` and `dropSouth` are unpainted and may not
 * share the east painting's proportions. The day one of them is painted at a different aspect, the
 * length moves onto the obstacle next to its direction; until then a second value would be invented. */
export const ONE_WAY_RUN_CELLS = 3

// Multiplier on the grid's roaming room beyond its bare content minimum (see the N-growth
// loop in assembleFloor). 1 = today's default footprint; <1 packs the floor (and its
// winding corridors) tighter, >1 gives it more breathing room. Overridable per floor via
// FloorConfig.packing.
export const DEFAULT_PACKING = 0.1
