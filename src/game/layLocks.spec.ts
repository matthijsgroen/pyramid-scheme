import { describe, expect, it } from "vitest"
import { expandFloorLocks } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import { layLockPlan, startingGridSize } from "./layLocks"
import { planLockFloor } from "./lockPlan"
import type { LockPlan } from "./lockPlan"
import type { FloorConfig } from "./siteTypes"
import { expectLaidPlan } from "./testSupport/laidLocksInvariants"
import { leverLock, strandingLock } from "./testSupport/floorLockFixtures"
import { BINDING, doubleBackLock, sluiceLock } from "./testSupport/lockFixtures"

const planOf = (locks: PlacedLock[]): LockPlan => {
  const floor: FloorConfig = {
    pathPuzzles: 2,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
    realisations: BINDING,
    locks,
  }
  const result = expandFloorLocks(floor)
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.reasons)}`)
  return planLockFloor(result)!
}

const FIXTURES: Record<string, () => LockPlan> = {
  sluice: () => planOf([{ lock: sluiceLock() }]),
  lever: () => planOf([{ lock: leverLock() }]),
  "two locks in sequence": () => planOf([{ lock: leverLock() }, { lock: strandingLock() }]),
  "a lock nested in a lock": () =>
    planOf([{ lock: leverLock() }, { lock: leverLock(), as: "inner", inside: { instance: "lever", region: "hall" } }]),
  doubleBack: () => planOf([{ lock: doubleBackLock() }]),
}
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)

describe("laying a lock plan on the lattice", { timeout: 120_000 }, () => {
  for (const [name, build] of Object.entries(FIXTURES))
    it(`${name}: lays on seeds 1..40 with its stretches, corridors, junction, drops, walls and route intact`, () => {
      const plan = build()
      const laidSeeds = SEEDS.flatMap(seed => {
        const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
        if (!result.ok) return []
        expectLaidPlan(plan, result.laid)
        return [seed]
      })
      const minimum = name === "doubleBack" ? 30 : 40
      expect(laidSeeds.length).toBeGreaterThanOrEqual(minimum)
    })

  it("lays the same floor for the same seed", () => {
    const plan = FIXTURES.doubleBack()
    const lay = () => layLockPlan(plan, { seed: 7, n: startingGridSize(plan) })
    expect(lay()).toEqual(lay())
  })

  it("lays different floors for different seeds", () => {
    const plan = FIXTURES.sluice()
    const routes = new Set(
      SEEDS.map(seed => {
        const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
        return result.ok ? JSON.stringify(result.laid.route) : "refused"
      })
    )
    expect(routes.size).toBeGreaterThan(5)
  })

  it("grows the grid past the size it was asked for when the plan does not fit there", () => {
    const plan = FIXTURES.doubleBack()
    const asked = startingGridSize(plan)
    const sizes = SEEDS.map(seed => {
      const result = layLockPlan(plan, { seed, n: asked })
      return result.ok ? result.laid.n : asked
    })
    expect(Math.max(...sizes)).toBeGreaterThan(asked)
  })

  it("lays a corridor held to more nodes than its ends are apart as a path that never crosses itself", () => {
    const plan = FIXTURES["two locks in sequence"]()
    const roomy = {
      ...plan,
      corridors: plan.corridors.map(corridor => ({ ...corridor, minNodes: corridor.minNodes + 3 })),
    }
    const laidSeeds = SEEDS.flatMap(seed => {
      const result = layLockPlan(roomy, { seed, n: startingGridSize(roomy) })
      if (!result.ok) return []
      for (const corridor of result.laid.corridors) {
        const chain = [corridor.start, ...corridor.nodes, corridor.end]
        expect(new Set(chain).size, `${corridor.id} on seed ${seed}`).toBe(chain.length)
      }
      expect(new Set(result.laid.route).size).toBe(result.laid.route.length)
      return [seed]
    })
    expect(laidSeeds.length).toBeGreaterThanOrEqual(30)
  })

  it("refuses by name the part that did not fit when the grid may not grow past the ceiling", () => {
    const plan = FIXTURES.sluice()
    const result = layLockPlan(plan, { seed: 1, n: 3, ceiling: 3 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const ids = [...plan.regions.map(r => r.id), ...plan.corridors.map(c => c.id)]
    expect(ids).toContain(result.refusal.part.id)
    expect(result.refusal.part.id).not.toBe(plan.route[0])
    expect(result.refusal.grid).toBe(3)
  })
})
