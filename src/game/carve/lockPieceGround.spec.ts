import { describe, expect, it } from "vitest"
import type { GridCell } from "../siteTypes"
import type { LaidFloor } from "../laidFloor"
import { lockPieceFaults, notOwnGround } from "./derive"
import { noLabels } from "./carveFixtures"
import type { CarveState, FloorPrep } from "./state"

// A made-up lock region `madeUp.yard` over three nodes: its own ground at 0,0, a drop's ledge at 0,2 and a side
// section's room at 0,4, both wearing the yard's label.
const labels = noLabels()
for (const key of ["0,0", "0,2", "0,4"]) labels.region.set(key, "madeUp.yard")
const state = {
  lay: { laid: { own: new Set(["0,0"]) } as LaidFloor, mainSteps: [] },
  labels,
  keys: { chains: [], hostColors: new Map() },
} as unknown as Pick<Required<CarveState>, "keys" | "lay" | "labels">
const prep = {} as FloorPrep

const room = (extra: object): GridCell =>
  ({ type: "room", roomType: "encounter", dirs: new Set(), state: "fogged", ...extra }) as GridCell
const bare: GridCell = { type: "corridor", dirs: new Set(), state: "fogged" }

describe("a lock's pieces on their region's own ground", () => {
  it("counts a drop's ledge and a side section wearing the region's label as no ground of it", () => {
    expect(notOwnGround(prep, state).sort()).toEqual(["0,2", "0,4"])
  })

  it("names every piece standing off its region's own ground, and none on it", () => {
    const plate = room({ plate: { id: "p" } })
    const tile = room({ sequenceTile: { id: "s" } })
    expect(lockPieceFaults(prep, state, [[plate, bare, tile, bare, room({ pipeHole: "h" })]])).toEqual([
      "tile at 0,2 stands off madeUp.yard's own ground",
      "pipe hole at 0,4 stands off madeUp.yard's own ground",
    ])
  })

  it("finds nothing on a floor with no laid lock", () => {
    expect(lockPieceFaults(prep, { ...state, lay: null }, [[bare, bare, room({ plate: { id: "p" } })]])).toEqual([])
  })
})
