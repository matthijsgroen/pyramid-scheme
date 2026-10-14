import { describe, expect, it } from "vitest"
import type { FloorConfig } from "../siteTypes"
import { ASSEMBLY_ATTEMPTS, PACKING_CEILING, climb, firstRung } from "./ladder"
import { prepareFloor } from "./prepareFloor"
import type { Rung } from "./state"

const prepAt = (packing: number) => {
  const config: FloorConfig = {
    pathPuzzles: 2,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    packing,
    sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
  }
  const result = prepareFloor("site", config, 1)
  if (!result.ok) throw new Error(JSON.stringify(result.reasons))
  return result.prep
}

const rungs = (packing: number): Rung[] => {
  const prep = prepAt(packing)
  const climbed: Rung[] = []
  let rung = firstRung(prep)
  for (let attempt = 0; attempt < ASSEMBLY_ATTEMPTS; attempt++) {
    rung = climb(prep, attempt, rung)
    climbed.push(rung)
  }
  return climbed
}

const changedAt = (climbed: Rung[], field: keyof Rung) =>
  climbed.flatMap((rung, attempt) => (attempt > 0 && rung[field] !== climbed[attempt - 1][field] ? [attempt] : []))

describe("the ladder", () => {
  it("starts at the authored packing on a grid sized to the floor's content", () => {
    const [first] = rungs(0.1)
    expect(first).toMatchObject({ packing: 0.1, chainPacking: 0.1, recovery: false })
    expect(first.n).toBe(first.startingN)
    expect(first.n % 2).toBe(1)
  })

  it("widens the packing at attempts 8, 16 and 24, doubling it up to the ceiling", () => {
    const climbed = rungs(0.1)
    expect(changedAt(climbed.slice(0, 30), "packing")).toEqual([8, 16, 24])
    expect([8, 16, 24].map(attempt => climbed[attempt].packing)).toEqual([0.2, 0.4, 0.8])
    for (const attempt of [8, 16, 24]) expect(climbed[attempt].chainPacking).toBe(climbed[attempt].packing)
  })

  it("grows the grid by two at attempts 4, 12, 20 and 28", () => {
    const climbed = rungs(0.1)
    for (const attempt of [4, 12, 20, 28]) expect(climbed[attempt].n).toBe(climbed[attempt - 1].n + 2)
    for (const attempt of [1, 2, 3, 5, 9, 13]) expect(climbed[attempt].n).toBe(climbed[attempt - 1].n)
  })

  it("grows rather than widens once the packing is at the ceiling", () => {
    const climbed = rungs(PACKING_CEILING)
    expect(changedAt(climbed.slice(0, 30), "packing")).toEqual([])
    for (const attempt of [4, 8, 12, 16, 20, 24, 28]) expect(climbed[attempt].n).toBe(climbed[attempt - 1].n + 2)
  })

  it("recovers from attempt 30: the roomiest wish, chains wound down to 0 by the last attempt", () => {
    const climbed = rungs(0.1)
    expect(climbed.findIndex(rung => rung.recovery)).toBe(30)
    expect(climbed.slice(30).every(rung => rung.packing === PACKING_CEILING)).toBe(true)
    const wound = climbed.slice(30).map(rung => rung.chainPacking)
    expect(wound[0]).toBe(PACKING_CEILING)
    expect(wound[wound.length - 1]).toBe(0)
    expect(wound.every((chainPacking, i) => i === 0 || chainPacking < wound[i - 1])).toBe(true)
  })

  it("never sizes a recovery grid below the grid the widening settled on", () => {
    const climbed = rungs(0.1)
    for (const rung of climbed.slice(30)) expect(rung.n).toBeGreaterThanOrEqual(rung.startingN)
  })
})
