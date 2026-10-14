import { describe, expect, it } from "vitest"
import { freshState, hallMidVault, leverOpening, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { contentNow } from "./derive"
import { seatMainControls } from "./seatMainControls"

describe("seatMainControls", () => {
  const prep = prepOf(
    plainFloor({
      pathPuzzles: 2,
      regionLayout: hallMidVault,
      obstacles: [{ id: "bars", kind: "gate", at: { on: "connection", between: ["mid", "vault"] } }],
      controls: [leverOpening(["bars"], "lever", "mid")],
    })
  )
  const onWalk = (placed: number[], stepRegion = ["hall", "mid", "mid", "vault", "vault", "vault", "vault"]) => ({
    ...freshState(prep),
    lay: null,
    maze: straightWalk(stepRegion.length),
    regions: { stepRegion, seams: new Set<number>() },
    content: {
      placed,
      goal: placed[placed.length - 1],
      lever: -1,
      puzzleRole: new Map(placed.slice(0, -1).map((step, k) => [step, k])),
    },
    junctions: { steps: new Set<number>(), order: [] },
    seamGates: new Map([["bars", 3]]),
    runGates: new Map<string, number>(),
    mainBarrierDoors: new Map(),
  })

  it("stands a control on a free node of its region", () => {
    const state = onWalk([2, 5, 6])
    expect(seatMainControls.run(prep, state)).toBeUndefined()
    expect(state.mainControls).toEqual({ at: new Map([["lever", 1]]), moves: [] })
  })

  it("takes a content node only when none is free, moving its puzzle past the gate with its ordinal", () => {
    const state = onWalk([1, 2, 6])
    expect(seatMainControls.run(prep, state)).toBeUndefined()
    expect(state.mainControls).toEqual({ at: new Map([["lever", 1]]), moves: [[1, 4]] })
    expect(contentNow({ content: state.content, mainControls: state.mainControls! })).toEqual({
      placed: [4, 2, 6],
      puzzleRole: new Map([
        [2, 1],
        [4, 0],
      ]),
    })
  })

  it("names a control whose only candidates hold puzzles with nowhere to go before the goal", () => {
    expect(seatMainControls.run(prep, onWalk([1, 2, 4]))).toEqual({
      retry: [{ type: "controlPuzzleUndisplaceable", ids: ["lever"] }],
    })
  })

  it("names a control its region gives no node at all", () => {
    const state = onWalk([4, 6], ["hall", "hall", "hall", "vault", "vault", "vault", "vault"])
    expect(seatMainControls.run(prep, state)).toEqual({ retry: [{ type: "controlNotSeated", ids: ["lever"] }] })
  })
})
