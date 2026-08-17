import { mulberry32, shuffle } from "@/game/random"
import type { LightbeamDials, LightbeamGoal } from "./generateLightbeam"

// The goal pool, per docs/game-design/puzzles/lightbeam.md §7.
//
// Without this, every tier turns every dial a little and every board is the AVERAGE board for its tier:
// a wizard grid was five turns AND a set mirror AND two sliding mirrors AND a sliding wall AND a decoy
// AND three shadows, every single time. A goal draws one or two dials and turns those hard, leaving the
// rest at the tier's lean baseline — so boards have character rather than mean settings, and "how hard is
// this" (the cap) stops being welded to "what kind of problem is this".
//
// Goals only ever ADD to their own dials, never zero another's. That is what lets two of them apply in
// either order and still mean what they say; an earlier draft had each goal flatten the dials it did not
// care about, and drawing two then silently cancelled the first.
// The division of labour that keeps the tier ramp intact: **the tier sets the route** — how long, how
// wide, how much of it is given — and **a goal sets what is in the way**. So a goal adds one or two pieces,
// never four, and the tier still decides how big a board is.
//
// The first cut had each goal add two of its own thing on top of baselines that already carried some. Two
// goals then added four pieces, which put five pieces on a starter board that wanted three and collapsed
// expert, master and wizard into the same ten-piece blur.
export const GOAL_DIALS: Record<LightbeamGoal, (dials: LightbeamDials) => LightbeamDials> = {
  /**
   * A long bending route and nothing to distract from it. This board is about following the light.
   *
   * Two more bends but one more given mirror, so the route grows visibly while the player's workload grows
   * by one piece — the length is the character, not the piece count.
   */
  longChain: dials => ({ ...dials, turns: dials.turns + 2, setMirrors: dials.setMirrors + 1 }),

  /** A route buried in pieces that do not matter. The skill is telling which is which (technique T4). */
  sortTheWheat: dials => ({ ...dials, decoys: dials.decoys + 2 }),

  /**
   * Stone in the way rather than a corner to find: the question is whether the light gets through.
   *
   * Deliberately does NOT lengthen the route. It used to add a turn as well, to be sure of a straight
   * stretch to park the wall on, and paired with `longChain` that asked for seven bends on a seven-wide
   * grid — which is where a fifth of wizard boards were falling back to no goals at all.
   */
  clearTheWay: dials => ({ ...dials, slidingWalls: dials.slidingWalls + 1 }),

  /** Every wrong turn vanishes into something unsettled, so nothing is ruled out by watching it die. */
  blindAlleys: dials => ({ ...dials, shadows: dials.shadows + 1 }),
}

export const applyGoals = (dials: LightbeamDials, goals: readonly LightbeamGoal[]): LightbeamDials =>
  goals.reduce((carried, goal) => GOAL_DIALS[goal](carried), dials)

/**
 * Which goals this board gets. Drawn from its own stream rather than the attempt stream, so the goals stay
 * put while generation retries — a board that re-rolled its goals on every attempt would just drift to
 * whichever pair happens to be easiest to build.
 */
export const drawGoals = (seed: number, pool: readonly LightbeamGoal[], count: number): LightbeamGoal[] =>
  shuffle([...pool], mulberry32(seed * 104729)).slice(0, Math.min(count, pool.length))
