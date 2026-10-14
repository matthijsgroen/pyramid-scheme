import { describe, expect, it } from "vitest"
import { freshState, hallMidVault, leverOpening, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { seatGateRuns } from "./seatGateRuns"

describe("seatGateRuns", () => {
  const prep = prepOf(
    plainFloor({
      regionLayout: hallMidVault,
      obstacles: [
        { id: "first", kind: "gate", at: { on: "connection", between: ["mid", "vault"] } },
        { id: "second", kind: "gate", at: { on: "connection", between: ["mid", "vault"] } },
      ],
      barrierOrder: [{ between: ["mid", "vault"], barriers: ["first", "second"] }],
      controls: [leverOpening(["first", "second"])],
    })
  )
  const onWalk = (stepRegion: string[], placed: number[]) => ({
    ...freshState(prep),
    lay: null,
    maze: straightWalk(stepRegion.length),
    regions: { stepRegion, seams: new Set<number>() },
    content: { placed, goal: placed[placed.length - 1], lever: -1, puzzleRole: new Map() },
    junctions: { steps: new Set<number>(), order: [] },
    seamGates: new Map([["first", 3]]),
  })

  it("stands the run's later gates past the seam, on nodes no content holds", () => {
    const state = onWalk(["hall", "mid", "mid", "vault", "vault", "vault", "vault"], [4])
    expect(seatGateRuns(prep, state)).toBeUndefined()
    expect(state.runGates).toEqual(
      new Map([
        ["first", 3],
        ["second", 5],
      ])
    )
  })

  it("retries where the far region has no free node for the run, naming the connection", () => {
    const state = onWalk(["hall", "mid", "mid", "vault", "vault"], [4])
    expect(seatGateRuns(prep, state)).toEqual({
      retry: [{ type: "barriersNotSeated", between: ["mid", "vault"], barriers: ["first", "second"] }],
    })
  })
})
