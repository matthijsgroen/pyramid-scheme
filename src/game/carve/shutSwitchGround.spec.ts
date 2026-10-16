import { describe, expect, it } from "vitest"
import { freshState, noLabels, plainFloor, prepOf } from "./carveFixtures"
import { makePkey } from "./grid"
import { shutSwitchGround } from "./shutSwitchGround"
import type { Cell, FloorPrep } from "./state"

// entrance 0,0 → junction 0,2 → exit 0,4, with a branch 2,2 off the junction.
describe("shutSwitchGround", () => {
  const plain = prepOf(plainFloor({ sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }] }))
  const withDrop = (drops: boolean): FloorPrep => ({
    ...plain,
    config: { ...plain.config, config: { ...plain.config.config, oneWays: drops ? [{ from: "main", to: "s0" }] : [] } },
  })
  const pkey = makePkey(5)
  const passages = new Set([pkey(0, 0, 0, 2), pkey(0, 2, 0, 4), pkey(0, 2, 2, 2)])
  const shut = (prep: FloorPrep) => {
    const mainPath: Cell[] = [
      [0, 0],
      [0, 2],
      [0, 4],
    ]
    const state = {
      ...freshState(prep),
      lay: null,
      maze: { n: 5, entrance: mainPath[0], exit: mainPath[2], mainPath, passages },
      branches: {
        used: new Set(["0,0", "0,2", "0,4", "2,2"]),
        groups: [],
        subChains: [],
        seamDrops: [],
        carved: new Set<string>(),
      },
      doors: {
        intended: passages,
        gated: new Set<string>(),
        behind: new Map(),
        ground: new Map(),
        seamGated: new Set<string>(),
        seamBehind: new Map(),
      },
      labels: noLabels(),
      mainRooms: new Map([
        ["0,0", { roomType: "portal" as const }],
        ["0,2", { roomType: "fork" as const }],
        ["0,4", { roomType: "portal" as const }],
      ]),
      chainRooms: new Map(),
      forks: { reserved: ["0,2"], inFork: new Set<string>(), switchesPlaced: 1 },
    }
    shutSwitchGround.run(prep, state)
    return state.switchDoors!
  }

  it("stands the ground past a switch junction's free way out behind that way's door", () => {
    expect(shut(withDrop(true))).toEqual(new Map([["2,2", new Set(["door 2,2"])]]))
  })

  it("spares the walk where the floor authors no drop", () => {
    expect(shut(withDrop(false))).toEqual(new Map())
  })
})
