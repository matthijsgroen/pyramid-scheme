import { describe, expect, it } from "vitest"
import { freshState, hallMidVault, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { seatRouteRegions } from "./seatRouteRegions"

describe("seatRouteRegions", () => {
  const prep = prepOf(plainFloor({ regionLayout: hallMidVault }))

  it("names the seams where one region gives way to the next", () => {
    const state = { ...freshState(prep), lay: null, maze: straightWalk(9) }
    expect(seatRouteRegions.run(prep, state)).toBeUndefined()
    const { stepRegion, seams } = state.regions!
    expect([...seams]).toEqual([stepRegion.indexOf("mid"), stepRegion.indexOf("vault")])
  })

  it("retries a path too short to reach every region on the route", () => {
    const state = { ...freshState(prep), lay: null, maze: straightWalk(2) }
    expect(seatRouteRegions.run(prep, state)).toEqual({ retry: [{ type: "regionNotSeated", regions: ["vault"] }] })
  })
})
