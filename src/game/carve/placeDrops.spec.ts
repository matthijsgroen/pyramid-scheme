import { describe, expect, it } from "vitest"
import { freshState, noLabels, plainFloor, prepOf } from "./carveFixtures"
import { placeDrops } from "./placeDrops"
import type { Cell, FloorPrep } from "./state"

// A main-path node at 0,0 and a node of s0 one vertical drop below it, at 4,0.
describe("placeDrops", () => {
  const plain = prepOf(plainFloor({ sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }] }))
  const prep: FloorPrep = {
    ...plain,
    obstacles: {
      ...plain.obstacles,
      oneWayDemands: [{ id: undefined, from: "main", to: "s0", realisation: "slide", sectioned: true }],
    },
  }
  const dropped = (behindTarget: string[]) => {
    const labels = noLabels()
    labels.address.set("0,0", "main")
    labels.address.set("4,0", "s0")
    const mainPath: Cell[] = [
      [0, 0],
      [0, 2],
      [0, 4],
    ]
    const state = {
      ...freshState(prep),
      lay: null,
      maze: { n: 5, entrance: mainPath[0], exit: mainPath[2], mainPath, passages: new Set<string>() },
      branches: {
        used: new Set(["0,0", "0,2", "0,4", "4,0"]),
        groups: [],
        subChains: [],
        seamDrops: [],
        carved: new Set<string>(),
      },
      labels,
      doors: {
        intended: new Set<string>(),
        gated: new Set<string>(),
        behind: new Map([["4,0", new Set(behindTarget)]]),
        ground: new Map(),
        seamGated: new Set<string>(),
        seamBehind: new Map(),
      },
      switchDoors: new Map(),
    }
    return { refusal: placeDrops(prep, state), drops: state.drops }
  }

  it("drops between the two named sections across the uncarved cells between them", () => {
    expect(dropped([]).drops).toEqual([
      { from: "0,0", to: "4,0", dir: "s", launch: "1,0", run: ["2,0"], landing: "3,0", realisation: "slide" },
    ])
  })

  it("retries where the only landing stands behind a door the launch does not", () => {
    expect(dropped(["s0"]).refusal).toEqual({ retry: [{ type: "oneWayUnsatisfied", from: "main", to: "s0" }] })
  })
})
