import { describe, expect, it } from "vitest"
import { floorLock } from "./floorLock"
import type { RealisationBinding } from "./lockCompile"
import { reachableStates } from "./lockWalk"
import { parseLock } from "./lockNotation"
import { carveLockFloor } from "./testSupport/lockFixtures"

// A yard with a stone, and a drop from it into a pit with a second drop out: only the first drop enters the pit.
const STONE_DROP =
  "in -- yard\nyard -- out\nyard >> pit\npit >> out\nshelf plate @yard stone\nin ?\nyard ?\npit ?\nout ?"
const ZIPLINE: RealisationBinding = { weights: "stonePlate", "one-way": "zipline" }
const SEEDS = Array.from({ length: 60 }, (_, n) => n)

describe("a drop on a stone floor", () => {
  const grid = () => carveLockFloor(parseLock(STONE_DROP, "stones").lock, ZIPLINE, SEEDS)

  it("is bound to the zipline", () => {
    expect(() => grid()).not.toThrow()
  })

  it("is taken in the floor's walk only with empty hands", () => {
    const spec = floorLock(grid())!
    const [drop] = spec.oneWays ?? []
    const found = reachableStates(spec)
    if (found === "tooLarge") throw new Error("expected a walkable floor")
    const carrying = (config: Record<string, string>) =>
      (spec.leaveWith ?? []).some(({ mechanism, notIn }) => notIn.includes(config[mechanism]))
    const landed = found.order.filter(state => state.region === drop.to)
    expect(landed.length).toBeGreaterThan(0)
    expect(landed.filter(state => carrying(state.config))).toEqual([])
  })
})
