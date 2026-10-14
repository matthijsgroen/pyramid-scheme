import { describe, expect, it } from "vitest"
import { freshState, hallMidVault, leverOpening, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { seatMainBarrierDoors } from "./seatMainBarrierDoors"

describe("seatMainBarrierDoors", () => {
  const prep = prepOf(
    plainFloor({
      regionLayout: hallMidVault,
      obstacles: [{ id: "flood", kind: "gate", at: { on: "region", region: "mid" } }],
      controls: [leverOpening(["flood"])],
      regionBarrierRealisation: "water",
    })
  )
  const onWalk = (stepRegion: string[], placed: number[]) => ({
    ...freshState(prep),
    lay: null,
    maze: straightWalk(stepRegion.length),
    regions: { stepRegion, seams: new Set<number>() },
    content: { placed, goal: placed[placed.length - 1], lever: -1, puzzleRole: new Map() },
    junctions: { steps: new Set<number>(), order: [] },
    seamGates: new Map<string, number>(),
    runGates: new Map<string, number>(),
  })

  it("stands a door inside the region at each of its entrances, past the nodes content holds", () => {
    const state = onWalk(["hall", "mid", "mid", "mid", "mid", "mid", "vault"], [2])
    expect(seatMainBarrierDoors(prep, state)).toBeUndefined()
    expect(state.mainBarrierDoors).toEqual(
      new Map([
        [3, { id: "flood", region: "mid", entrance: "hall" }],
        [4, { id: "flood", region: "mid", entrance: "vault" }],
      ])
    )
  })

  it("retries where the region has no free node for a door, naming the barrier", () => {
    const state = onWalk(["hall", "mid", "mid", "mid", "vault"], [2])
    expect(seatMainBarrierDoors(prep, state)).toEqual({
      retry: [{ type: "regionBarrierNotSeated", id: "flood", region: "mid" }],
    })
  })
})
