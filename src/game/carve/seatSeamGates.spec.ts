import { describe, expect, it } from "vitest"
import { freshState, hallMidVault, leverOpening, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { seatSeamGates } from "./seatSeamGates"

describe("seatSeamGates", () => {
  const prep = prepOf(
    plainFloor({
      regionLayout: hallMidVault,
      obstacles: [{ id: "bars", kind: "gate", at: { on: "connection", between: ["mid", "vault"] } }],
      controls: [leverOpening(["bars"])],
    })
  )
  const withRegions = (stepRegion: string[]) => ({
    ...freshState(prep),
    lay: null,
    maze: straightWalk(stepRegion.length),
    regions: { stepRegion, seams: new Set<number>() },
  })

  it("stands a connection's gate on the first step of the far region", () => {
    const state = withRegions(["hall", "mid", "mid", "vault", "vault"])
    expect(seatSeamGates(prep, state)).toBeUndefined()
    expect(state.seamGates).toEqual(new Map([["bars", 3]]))
  })

  it("retries where the path never crosses the gate's connection", () => {
    const state = withRegions(["hall", "mid", "mid"])
    expect(seatSeamGates(prep, state)).toEqual({ retry: [{ type: "obstacleSeamNotCarved", ids: ["bars"] }] })
  })
})
