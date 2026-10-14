import { describe, expect, it } from "vitest"
import { freshState, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { placeJunctions } from "./placeJunctions"
import type { ForkIn } from "./state"

describe("placeJunctions", () => {
  const fork: ForkIn = { region: "mid", seams: [["mid", "east"]], sectionIdxs: [0] }
  const plain = prepOf(plainFloor())
  const prep = { ...plain, forks: { ...plain.forks, forkIns: [fork] } }
  const stepRegion = ["hall", "hall", "mid", "mid", "mid", "vault", "vault"]
  const onWalk = (placed: number[]) => ({
    ...freshState(prep),
    lay: null,
    maze: straightWalk(stepRegion.length),
    regions: { stepRegion, seams: new Set([2, 5]) },
    content: { placed, goal: placed[placed.length - 1], lever: -1, puzzleRole: new Map() },
  })

  it("stands a fork's junction on a node of its region that is no seam and holds no content", () => {
    const state = onWalk([3, 6])
    expect(placeJunctions.run(prep, state)).toBeUndefined()
    expect(state.junctions!.order).toEqual([4])
  })

  it("retries where the region has no free node, naming the fork", () => {
    expect(placeJunctions.run(prep, onWalk([3, 4]))).toEqual({ retry: [{ type: "forkSeamsNotLaid", fork }] })
  })
})
