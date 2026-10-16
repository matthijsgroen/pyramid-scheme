import { describe, expect, it } from "vitest"
import { noShortfalls, reasonsOf, remember, rememberAttempt } from "./shortfalls"
import type { Shortfall } from "./state"

const rememberAll = (shortfalls: Shortfall[]) => shortfalls.reduce(remember, noShortfalls)

describe("the shortfalls the attempts leave", () => {
  it("keeps the first of each kind", () => {
    const memory = rememberAll([
      { type: "controlNotSeated", ids: ["first"] },
      { type: "regionNotSeated", regions: ["hall"] },
      { type: "controlNotSeated", ids: ["second"] },
    ])
    expect(reasonsOf(memory)).toEqual([
      { type: "regionNotSeated", regions: ["hall"] },
      { type: "controlNotSeated", ids: ["first"] },
      { type: "layoutNotFound" },
    ])
  })

  it("keeps the fork shortfall that carved the most junctions", () => {
    const memory = rememberAll([
      { type: "forksUnsatisfied", exits: 3, count: 2, carved: 0 },
      { type: "forksUnsatisfied", exits: 3, count: 2, carved: 1 },
      { type: "forksUnsatisfied", exits: 2, count: 2, carved: 1 },
    ])
    expect(reasonsOf(memory)).toEqual([
      { type: "forksUnsatisfied", exits: 3, count: 2, carved: 1 },
      { type: "layoutNotFound" },
    ])
  })

  it("names every kind in the order a reader should meet them, layoutNotFound last", () => {
    const memory = rememberAll([
      { type: "regionWillNotTake", mismatch: [{ region: "hall", kind: "reward" }] },
      { type: "carveDisagreement", faults: [{ type: "regionsNotJoined", between: ["a", "b"] }] },
      { type: "controlPuzzleUndisplaceable", ids: ["c"] },
      { type: "plateNotPlaced", plate: "p" },
      { type: "sequenceTileNotPlaced", id: "s", step: 0, reason: "r" },
      { type: "controlNotSeated", ids: ["c"] },
      { type: "regionBarrierNotSeated", id: "b", region: "r" },
      { type: "barriersNotSeated", between: ["a", "b"], barriers: ["g"] },
      { type: "obstacleSeamNotCarved", ids: ["g"] },
      { type: "regionNotSeated", regions: ["r"] },
      { type: "oneWayUnsatisfied", from: "a", to: "b" },
      { type: "forksUnsatisfied", exits: 2, count: 1, carved: 0 },
      { type: "forkSeamsNotLaid", fork: { region: "hall", seams: [["hall", "side"]], sectionIdxs: [0] } },
      { type: "contentNotLaid", kinds: ["puzzle"] },
      { type: "lockNotLaid", part: { kind: "region", id: "r" }, grid: 9 },
    ])
    expect(reasonsOf(memory).map(reason => reason.type)).toEqual([
      "lockNotLaid",
      "contentNotLaid",
      "forkSeamsNotLaid",
      "forksUnsatisfied",
      "oneWayUnsatisfied",
      "regionNotSeated",
      "obstacleSeamNotCarved",
      "barriersNotSeated",
      "regionBarrierNotSeated",
      "controlNotSeated",
      "sequenceTileNotPlaced",
      "plateNotPlaced",
      "controlPuzzleUndisplaceable",
      "regionsNotJoined",
      "regionWillNotTake",
      "layoutNotFound",
    ])
  })

  it("names a fork's seams rather than the fork it keeps", () => {
    const memory = remember(noShortfalls, {
      type: "forkSeamsNotLaid",
      fork: { region: "hall", seams: [["hall", "side"]], sectionIdxs: [0] },
    })
    expect(reasonsOf(memory)[0]).toEqual({ type: "forkSeamsNotLaid", region: "hall", seams: [["hall", "side"]] })
  })

  describe("a short run of gates", () => {
    const shortRun = { between: ["hall", "side"] as [string, string], barriers: ["g1", "g2"] }

    it("silences a later off-route seam left uncarved, since the short run is its cause", () => {
      const memory = rememberAttempt(
        noShortfalls,
        { chainGates: { at: new Map(), runShort: shortRun } },
        {
          retry: [{ type: "obstacleSeamNotCarved", ids: ["g3"], onChain: true }],
        }
      )
      expect(reasonsOf(memory)).toEqual([{ type: "barriersNotSeated", ...shortRun }, { type: "layoutNotFound" }])
    })

    it("leaves a main-path seam left uncarved named", () => {
      const memory = rememberAll([
        { type: "barriersNotSeated", ...shortRun },
        { type: "obstacleSeamNotCarved", ids: ["g3"] },
      ])
      expect(reasonsOf(memory).map(reason => reason.type)).toEqual([
        "obstacleSeamNotCarved",
        "barriersNotSeated",
        "layoutNotFound",
      ])
    })

    it("does not silence an off-route seam noted before any run came up short", () => {
      const seam = rememberAll([{ type: "obstacleSeamNotCarved", ids: ["g3"], onChain: true }])
      const memory = rememberAttempt(seam, { chainGates: { at: new Map(), runShort: shortRun } }, { retry: [] })
      expect(reasonsOf(memory).map(reason => reason.type)).toEqual([
        "obstacleSeamNotCarved",
        "barriersNotSeated",
        "layoutNotFound",
      ])
    })
  })

  it("names nothing but layoutNotFound when no attempt noted a shortfall", () => {
    expect(reasonsOf(rememberAttempt(noShortfalls, {}, { retry: [] }))).toEqual([{ type: "layoutNotFound" }])
  })
})
