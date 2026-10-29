import { mulberry32 } from "../random"
import { FLOOR_PLANS } from "./floorPlans"
import type { PlanKind } from "./floorPlans"
import { pass } from "./state"

const PLAN_KINDS = Object.keys(FLOOR_PLANS) as PlanKind[]

/**
 * THE SHAPE THE MAIN PATH IS LAID IN: the floor's authored plan, else one drawn from the seed's own stream, so the
 * same seed holds the same plan on every attempt and the attempt's stream is left untouched.
 */
export const pickPlan = pass("pickPlan", [], ["plan"], (prep, state) => {
  const authored = prep.config.config.plan
  state.plan = authored ?? PLAN_KINDS[Math.floor(mulberry32(prep.input.seed ^ 0x9e3779b9)() * PLAN_KINDS.length)]
})
