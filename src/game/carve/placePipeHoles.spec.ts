import { describe, expect, it } from "vitest"
import type { WeightsControl } from "../obstacles"
import { freshState, noLabels, plainFloor, prepOf } from "./carveFixtures"
import { makePkey } from "./grid"
import { placePipeHoles } from "./placePipeHoles"
import type { CarveState, Cell, FloorPrep, RoomSpec } from "./state"

// The route along row 0: in at 0,0, hall at 0,2 to 0,6, out at 0,8. A side path hangs from 0,2 and turns east to
// 2,4, both hall; another from 0,6 turns east to 2,8, both yard.
const ROUTE: Cell[] = [
  [0, 0],
  [0, 2],
  [0, 4],
  [0, 6],
  [0, 8],
]
const REGION: Record<string, string> = {
  "0,0": "in",
  "0,2": "hall",
  "0,4": "hall",
  "0,6": "hall",
  "0,8": "out",
  "2,2": "hall",
  "2,4": "hall",
  "2,6": "yard",
  "2,8": "yard",
}
const pkey = makePkey(9)
const EDGES: [string, string][] = [
  ["0,0", "0,2"],
  ["0,2", "0,4"],
  ["0,4", "0,6"],
  ["0,6", "0,8"],
  ["0,2", "2,2"],
  ["2,2", "2,4"],
  ["0,6", "2,6"],
  ["2,6", "2,8"],
]

const stones = (ends: [string, string]): WeightsControl => ({
  id: "a.stones",
  control: "weights",
  plates: [],
  pipes: [{ id: "P", ends }],
  states: ["none"],
  initial: "none",
  opens: { none: [] },
  moves: [],
  carrying: [],
  underfoot: [],
  terms: {},
})

const placed = (weights: WeightsControl[], without: string[] = []) => {
  const plain = prepOf(plainFloor())
  const prep: FloorPrep = { ...plain, mechanisms: { ...plain.mechanisms, weights } }
  const used = new Set(Object.keys(REGION).filter(key => !without.includes(key)))
  const edges = EDGES.filter(([a, b]) => used.has(a) && used.has(b)).map(([a, b]) => {
    const [[r1, c1], [r2, c2]] = [a, b].map(key => key.split(",").map(Number))
    return pkey(r1, c1, r2, c2)
  })
  const labels = noLabels()
  for (const key of used) labels.region.set(key, REGION[key])
  const passages = new Set(edges)
  const state: CarveState = {
    ...freshState(prep),
    lay: null,
    maze: { n: 9, entrance: ROUTE[0], exit: ROUTE[4], mainPath: ROUTE, passages },
    branches: { used, groups: [], subChains: [], seamDrops: [], carved: new Set<string>() },
    labels,
    doors: {
      intended: passages,
      gated: new Set<string>(),
      behind: new Map(),
      ground: new Map(),
      seamGated: new Set<string>(),
      seamBehind: new Map(),
    },
    mainRooms: new Map<string, RoomSpec>([
      ["0,0", { roomType: "portal" }],
      ["0,8", { roomType: "portal" }],
    ]),
    chainRooms: new Map(),
    switchDoors: new Map(),
    drops: [],
    forks: { reserved: [], inFork: new Set<string>(), switchesPlaced: 0 },
    switchWays: [],
    switchRooms: new Map(),
    forkSwitchRooms: new Map(),
  }
  const refusal = placePipeHoles.run(prep, state)
  return { refusal, holes: state.pipeHoles }
}

describe("placePipeHoles", () => {
  it("stands each hole on a back-walled node of its region, off the main path first", () => {
    const { refusal, holes } = placed([stones(["hall", "yard"])])
    expect(refusal).toBeUndefined()
    expect(holes).toEqual(
      new Map([
        ["P@hall", { cell: "2,4" }],
        ["P@yard", { cell: "2,8" }],
      ])
    )
  })

  it("takes a node of the main path where the region has no other, never its seams or junctions", () => {
    const { holes } = placed([stones(["hall", "yard"])], ["2,2", "2,4"])
    expect(holes?.get("P@hall")).toEqual({ cell: "0,4" })
  })

  it("never takes a node with a way north", () => {
    const { refusal } = placed([stones(["hall", "yard"])], ["2,8"])
    expect(refusal).toEqual({ retry: [{ type: "pipeHoleNotPlaced", hole: "P@yard" }] })
  })

  it("never takes the entrance or the exit, refusing by name", () => {
    expect(placed([stones(["in", "hall"])]).refusal).toEqual({ retry: [{ type: "pipeHoleNotPlaced", hole: "P@in" }] })
    expect(placed([stones(["hall", "out"])]).refusal).toEqual({
      retry: [{ type: "pipeHoleNotPlaced", hole: "P@out" }],
    })
  })

  it("writes an empty map on a floor without a pipe", () => {
    const { refusal, holes } = placed([])
    expect(refusal).toBeUndefined()
    expect(holes).toEqual(new Map())
  })
})
