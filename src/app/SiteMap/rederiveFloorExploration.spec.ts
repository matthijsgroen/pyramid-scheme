import { describe, expect, it } from "vitest"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import type { AssembleFor } from "./cellIdentity"
import { rederiveFloorExploration } from "./rederiveFloorExploration"

// A two-cell floor: the doorway, and one corridor west of it. The corridor is content while it is
// fogged (a branch never entered) and nothing once it is walked — enough to tell a summary that still
// claims something from one that has let go.
const corridor: GridCell = {
  type: "corridor",
  dirs: new Set(["e"]),
  state: "fogged",
  sectionAddress: "main",
  ordinal: "1",
}
const entrance: GridCell = {
  type: "room",
  roomType: "portal",
  dirs: new Set(["w"]),
  state: "completed",
  sectionAddress: "main",
  ordinal: "0",
}

const floor: FloorGrid = {
  cells: [[corridor, entrance]],
  rows: 1,
  cols: 2,
  entrancePos: [0, 1],
  exitPos: [0, 1],
  siteId: "test-site",
  staircases: {},
}

const assembles: AssembleFor = () => floor
const assemblesNothing: AssembleFor = () => null

// What the save holds once the player has walked that corridor: the doorway and the corridor, both
// named, filed under the level they belong to.
const walked = { "1:main": ["0/entrance", "0/~1"] }

describe("rederiveFloorExploration", () => {
  it("drops a claim the floor no longer supports, without the player going there", () => {
    const stored = {
      floorExploration: { "1:0": { open: true, keySets: [["ward_a_1"]] } },
      exploredCells: walked,
    }

    expect(rederiveFloorExploration(stored, assembles)).toEqual({ "1:0": { open: false, keySets: [] } })
  })

  it("keeps a claim the floor does support", () => {
    const stored = { floorExploration: { "1:0": { open: false, keySets: [] } }, exploredCells: {} }

    expect(rederiveFloorExploration(stored, assembles)).toEqual({ "1:0": { open: true, keySets: [] } })
  })

  it("reads each entry against its own level, not whichever one the save is on", () => {
    // The same corridor, walked on level 2. Level 1's floor has never been touched, so its own entry
    // must still say there is something there.
    const stored = {
      floorExploration: { "1:0": { open: false, keySets: [] } },
      exploredCells: { "2:main": ["0/entrance", "0/~1"] },
    }

    expect(rederiveFloorExploration(stored, assembles)).toEqual({ "1:0": { open: true, keySets: [] } })
  })

  it("forgets a floor that no longer assembles, rather than keeping an unanswerable claim", () => {
    const stored = {
      floorExploration: { "1:0": { open: true, keySets: [["ward_a_1"]] } },
      exploredCells: walked,
    }

    expect(rederiveFloorExploration(stored, assemblesNothing)).toEqual({})
  })
})
