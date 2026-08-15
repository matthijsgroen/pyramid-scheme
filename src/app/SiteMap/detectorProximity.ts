// How close the running detector's nearest reading is. Drives the pulsing dot beside the HUD's
// detector button, so the reading is legible with the readout closed.
//
//   "none"     nothing to report — no dot at all
//   "pyramid"  somewhere else in this pyramid: slow pulse
//   "floor"    on the floor the player is standing on: quicker
//   "near"     within a few steps: fast
export type ProximityBand = "none" | "pyramid" | "floor" | "near"

export const PULSE_SECONDS: Record<Exclude<ProximityBand, "none">, number> = {
  pyramid: 2.6,
  floor: 1.2,
  near: 0.5,
}

/**
 * A detector's reading, narrowed to what its own level is allowed to know.
 *
 * Precision is the point of the detector ladder (§7.2), so the dot must not leak past it: at L1 the
 * compass knows only which pyramid holds a hit, so its best band is "pyramid" however close the hit
 * physically is. L2 adds the floor, L3 adds the exact cell and with it "near". Feeding the dot raw
 * distances would hand the player L3 precision at L1.
 */
export const bandFromHits = (
  level: number,
  hits: readonly { onThisFloor: boolean; nearby: boolean }[],
  // Whether this detector reports floors at all at this level, and cells at this level.
  { floorsAt = 2, cellsAt = 3 }: { floorsAt?: number; cellsAt?: number } = {}
): ProximityBand => {
  if (level <= 0 || hits.length === 0) return "none"
  if (level >= cellsAt && hits.some(h => h.nearby)) return "near"
  if (level >= floorsAt && hits.some(h => h.onThisFloor)) return "floor"
  return "pyramid"
}

/**
 * The corridor detector's reading. Its own scopes already match the bands one-for-one, and each is
 * gated on the level that unlocks it — L1 proximity, L2 this floor, L3 elsewhere in the pyramid — so
 * this is a straight fold rather than a distance calculation.
 */
export const corridorBand = (
  level: number,
  { nearby, onThisFloor, onOtherFloor }: { nearby: boolean; onThisFloor: boolean; onOtherFloor: boolean }
): ProximityBand => {
  if (level <= 0) return "none"
  if (nearby) return "near"
  if (level >= 2 && onThisFloor) return "floor"
  if (level >= 3 && onOtherFloor) return "pyramid"
  return "none"
}
