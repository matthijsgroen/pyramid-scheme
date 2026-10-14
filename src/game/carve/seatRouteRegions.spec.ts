import { describe, expect, it } from "vitest"
import type { PlacedContainer } from "../regions"
import { freshState, plainFloor, prepOf } from "./carveFixtures"
import { seatRouteRegions } from "./seatRouteRegions"
import type { Cell } from "./state"

const layout: PlacedContainer = {
  regions: [
    { name: "hall", appetite: "free" },
    { name: "mid", appetite: "free" },
    { name: "vault", appetite: "free" },
  ],
  connections: [
    ["hall", "mid"],
    ["mid", "vault"],
  ],
  in: "hall",
  out: "vault",
}

const walk = (steps: number) => {
  const mainPath = Array.from({ length: steps }, (_, i): Cell => [0, i * 2])
  return { n: steps * 2, entrance: mainPath[0], exit: mainPath[steps - 1], mainPath, passages: new Set<string>() }
}

describe("seatRouteRegions", () => {
  const prep = prepOf(plainFloor({ regionLayout: layout }))

  it("names the seams where one region gives way to the next", () => {
    const state = { ...freshState(prep), lay: null, maze: walk(9) }
    expect(seatRouteRegions(prep, state)).toBeUndefined()
    const { stepRegion, seams } = state.regions!
    expect([...seams]).toEqual([stepRegion.indexOf("mid"), stepRegion.indexOf("vault")])
  })

  it("retries a path too short to reach every region on the route", () => {
    const state = { ...freshState(prep), lay: null, maze: walk(2) }
    expect(seatRouteRegions(prep, state)).toEqual({ retry: [{ type: "regionNotSeated", regions: ["vault"] }] })
  })
})
