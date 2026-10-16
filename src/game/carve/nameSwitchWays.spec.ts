import { describe, expect, it } from "vitest"
import { freshState, noLabels, plainFloor, prepOf } from "./carveFixtures"
import { makePkey } from "./grid"
import { switchStem } from "./ids"
import { nameSwitchWays } from "./nameSwitchWays"
import type { Cell } from "./state"

// entrance 0,0 → junction 0,2 → exit 0,4, with a branch 2,2 off the junction into section s0.
describe("nameSwitchWays", () => {
  const prep = prepOf(plainFloor())
  const pkey = makePkey(5)
  const passages = new Set([pkey(0, 0, 0, 2), pkey(0, 2, 0, 4), pkey(0, 2, 2, 2)])
  const mainPath: Cell[] = [
    [0, 0],
    [0, 2],
    [0, 4],
  ]
  const named = (exitIsRoom: boolean) => {
    const labels = noLabels()
    labels.address.set("2,2", "s0")
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
      labels,
      mainRooms: new Map([
        ["0,0", { roomType: "portal" as const }],
        ["0,2", { roomType: "fork" as const }],
        ...(exitIsRoom ? [["0,4", { roomType: "portal" as const }] as const] : []),
      ]),
      chainRooms: new Map(),
      forks: { reserved: ["0,2"], inFork: new Set<string>(), switchesPlaced: 0 },
      switchDoors: new Map(),
    }
    nameSwitchWays.run(prep, state)
    return state.switchWays!
  }

  it("names every free way out of a reserved junction by the switch's stem and the address beyond it", () => {
    const stem = switchStem(prep.input.floorRef, 0)
    expect(named(false)).toEqual([
      [
        { dir: "e", cell: "0,4", gateKeyId: `${stem}:main` },
        { dir: "s", cell: "2,2", gateKeyId: `${stem}:s0` },
      ],
    ])
  })

  it("leaves out a way out something already stands beyond", () => {
    expect(named(true)[0].map(way => way.cell)).toEqual(["2,2"])
  })
})
