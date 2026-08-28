/**
 * The vessels this family measures into, as paths.
 *
 * **Their own module, because `Vessel.tsx` exports a component and nothing else** — the same split
 * `sudoku/signs.ts` makes for the same reason: fast refresh needs a file to be one or the other.
 */

/**
 * The vessel a face is poured out of, drawn from the paths its skin carries.
 *
 * **The silhouette carries the drawing** (design doc §7): the figures under a vessel say the amount exactly,
 * and the outline is what tells one size from another across a bench without being read. Which is also why the shape belongs to the
 * FACE rather than to this file — grain measured into a korenmaat and wine decanted between amphorae are
 * not the same act, and an amphora full of grain reads as coloured water.
 */
export type VesselShape = {
  /** The closed outline the contents are clipped to. */
  body: string
  /** Open paths drawn over it: handles, a lid, a rim. */
  fittings: string[]
  /**
   * How far the contents may reach, top and bottom, in view-box units.
   *
   * Measured against the vessel rather than the view box: a level worked out as a fraction of the whole
   * canvas puts a small amount below the foot, where there is no vessel to clip it to — and a canister
   * holding one measure of fourteen draws as empty, which is the one thing the level exists to rule out.
   */
  top: number
  bottom: number
}

/** **An amphora.** Flared rim, narrow neck, shouldered belly, small foot — the vessel wine and water travel in. */
export const AMPHORA: VesselShape = {
  body: "M 33 4 L 67 4 L 61 26 C 84 46 82 98 55 134 L 45 134 C 18 98 16 46 39 26 Z",
  // The belly stops short of the full width on purpose: the handles need somewhere OUTSIDE it to swing, or
  // they run along the body's own outline and vanish into it.
  fittings: ["M 40 25 C 20 23 7 40 22 57", "M 60 25 C 80 23 93 40 78 57", "M 39 134 L 61 134"],
  top: 6,
  bottom: 134,
}

/** **A canopic jar.** Straight-sided and lidded, the vessel the rites are measured into. */
export const CANOPIC: VesselShape = {
  body: "M 31 26 L 69 26 C 74 60 75 104 68 132 L 32 132 C 25 104 26 60 31 26 Z",
  fittings: ["M 29 26 C 33 8 67 8 71 26", "M 27 26 L 73 26", "M 34 132 L 66 132"],
  top: 30,
  bottom: 132,
}

/** **A korenmaat.** A wide straight-walled measure, which is how grain is counted rather than poured. */
export const MEASURE: VesselShape = {
  body: "M 24 42 L 76 42 L 68 128 L 32 128 Z",
  fittings: ["M 19 42 L 81 42", "M 30 128 L 70 128"],
  top: 46,
  bottom: 128,
}

/** **An inkpot.** Squat and wide-mouthed, ground low so a reed can reach the bottom of it. */
export const INKPOT: VesselShape = {
  body: "M 26 54 L 74 54 C 78 84 76 112 70 128 L 30 128 C 24 112 22 84 26 54 Z",
  fittings: ["M 21 54 L 79 54", "M 34 44 L 66 44", "M 34 44 L 34 54", "M 66 44 L 66 54"],
  top: 58,
  bottom: 128,
}
