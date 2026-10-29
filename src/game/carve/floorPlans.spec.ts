import { describe, expect, it } from "vitest"
import { freshState, plainFloor, prepOf } from "./carveFixtures"
import { FLOOR_PLANS, type PlanKind } from "./floorPlans"
import { growMaze } from "./growMaze"
import { pickPlan } from "./pickPlan"
import type { CarveState } from "./state"

const picked = (plan: PlanKind | undefined, seed: number, state?: CarveState) => {
  const prep = prepOf(plainFloor({ plan }), seed)
  const fresh = state ?? freshState(prep)
  pickPlan.run(prep, fresh)
  return fresh.plan
}

/** Of the turns along each main path, the share that go the way the turn before did. */
const sameWayShare = (plan: PlanKind) => {
  const prep = prepOf(plainFloor({ pathPuzzles: 3 }))
  let same = 0
  let turns = 0
  for (let seed = 0; seed < 50; seed++) {
    const state: CarveState = {
      ...freshState(prep, seed),
      rung: { ...freshState(prep).rung, n: 21 },
      lay: null,
      plan,
    }
    growMaze.run(prep, state)
    const { mainPath } = state.maze!
    let last = 0
    for (let i = 2; i < mainPath.length; i++) {
      const a = [mainPath[i - 1][0] - mainPath[i - 2][0], mainPath[i - 1][1] - mainPath[i - 2][1]]
      const b = [mainPath[i][0] - mainPath[i - 1][0], mainPath[i][1] - mainPath[i - 1][1]]
      const turn = Math.sign(a[0] * b[1] - a[1] * b[0])
      if (turn === 0) continue
      if (last !== 0) {
        turns++
        if (turn === last) same++
      }
      last = turn
    }
  }
  return same / turns
}

describe("floor plans", () => {
  it("an authored plan is the one picked", () => {
    for (const plan of Object.keys(FLOOR_PLANS) as PlanKind[]) expect(picked(plan, 3)).toBe(plan)
  })

  it("an unauthored plan is picked from the seed, the same twice", () => {
    for (let seed = 0; seed < 20; seed++) {
      const plan = picked(undefined, seed)
      expect(Object.keys(FLOOR_PLANS)).toContain(plan)
      expect(picked(undefined, seed)).toBe(plan)
    }
    expect(new Set(Array.from({ length: 20 }, (_, seed) => picked(undefined, seed))).size).toBeGreaterThan(1)
  })

  it("pickPlan draws nothing from state.rand", () => {
    const prep = prepOf(plainFloor())
    let draws = 0
    const state = freshState(prep)
    const inner = state.rand
    state.rand = () => {
      draws++
      return inner()
    }
    picked(undefined, 1, state)
    expect(draws).toBe(0)
  })

  it("spiral turns one way more often than meander", () => {
    expect(sameWayShare("spiral")).toBeGreaterThan(sameWayShare("meander"))
  })

  it("a plan changes the maze growMaze carves", () => {
    const prep = prepOf(plainFloor({ pathPuzzles: 3 }))
    const grown = (plan?: PlanKind) => {
      const state: CarveState = { ...freshState(prep, 4), lay: null, plan }
      growMaze.run(prep, state)
      return [...state.maze!.passages].sort()
    }
    expect(grown(undefined)).not.toEqual(grown("spiral"))
  })
})
