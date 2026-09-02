// Frames per cell walked. The cycle is driven by DISTANCE, not by a clock: tie a walk to a timer and the
// feet slide, because the legs then keep their own time while the body moves at the map's. Two steps to a
// cell is one frame every half cell — 60ms at the default 120ms per cell, about 16fps.
const STEPS_PER_CELL = 2

/**
 * How many steps have been taken after `cells` cells of walking.
 *
 * Monotonic on purpose. The figure takes it modulo however many frames its own facing happens to have, so
 * a facing drawn with three frames and one drawn with four both cycle correctly off the same counter —
 * which matters because a generated sheet gives whatever it gives (the side row of the first real one had
 * three distinct frames and three mirrors of them).
 */
export const stepsWalked = (cells: number): number => Math.floor(cells * STEPS_PER_CELL)
