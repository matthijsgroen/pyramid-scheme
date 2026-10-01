import type { Direction, ObstacleKind } from "@/game/siteTypes"

/**
 * A SPAN THE PLAYER USES FROM ITS LAUNCH rather than walks into: the three things an animation of it
 * cannot be drawn without. `from` is the launch, `to` the landing, `dir` the way it runs, and `kind` what
 * it is, since a zipline and whatever comes next move a body differently.
 */
export type Traversal = {
  kind: ObstacleKind
  from: readonly [number, number]
  to: readonly [number, number]
  dir: Direction
}

/**
 * The seam a later animation and sound effect play through. The traversal lasts until the returned
 * promise settles, so the duration lives in whatever fulfils this and not in a number passed here. The
 * player is out of sight for that whole time and appears at the landing straight after.
 */
export type PlayTraversal = (traversal: Traversal) => Promise<void>

/** Nothing plays yet, so the span is crossed the instant it is taken. */
export const crossAtOnce: PlayTraversal = () => Promise.resolve()
