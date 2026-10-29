/** The shape a floor's main path is laid in: `axis` runs along one line, `meander` winds across the floor, `spiral`
 * coils inward. */
export type PlanKind = "axis" | "meander" | "spiral"

/** What a plan asks of the sketch: how straight its corridors run, and the chance a turn goes the way the last one
 * did (a coil). */
export const FLOOR_PLANS: Record<PlanKind, { straightness: number; turnBias: number }> = {
  axis: { straightness: 0.95, turnBias: 0 },
  meander: { straightness: 0.3, turnBias: 0 },
  spiral: { straightness: 0.6, turnBias: 0.8 },
}
