import type { Direction } from "@/game/siteTypes"

/** Map units from the cell's centre: where the sprite's handle hangs at the start and end of a ride, and
 * how big the sprite is drawn (1 = the walking figure's 40×70). West is east mirrored. */
export type RidePose = { from: { x: number; y: number }; to: { x: number; y: number }; scale: number }
export type RidePoses = Record<"e" | "n" | "s", RidePose>

/** Read off the drop art, then tuned by eye in the Zipline ride story. The handle is the sprite's top edge.
 * North and south are not read off their art yet. */
export const RIDE_POSES: RidePoses = {
  e: { from: { x: 112, y: -46 }, to: { x: -65, y: -25 }, scale: 0.75 },
  n: { from: { x: 0, y: -40 }, to: { x: 0, y: -40 }, scale: 1 },
  s: { from: { x: 0, y: -40 }, to: { x: 0, y: -40 }, scale: 1 },
}

/** The pose for a heading: west is east with x negated. */
export const poseFor = (dir: Direction, poses: RidePoses = RIDE_POSES): RidePose => {
  if (dir !== "w") return poses[dir]
  const { from, to, scale } = poses.e
  return { from: { ...from, x: -from.x }, to: { ...to, x: -to.x }, scale }
}
