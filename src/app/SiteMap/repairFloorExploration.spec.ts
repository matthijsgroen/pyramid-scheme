import { describe, expect, it } from "vitest"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import type { AssembleFor } from "./cellIdentity"
import { repairFloorExploration } from "./repairFloorExploration"

// A three-cell floor: the doorway, one corridor, and the way out. The corridor is content while it is
// fogged (a branch never entered) and nothing once it is walked, so it tells a summary that still
// claims something from one that has let go. The exit is the last slot along the chain, which is what
// makes it carry the section's high-water mark.
const corridor: GridCell = {
  type: "corridor",
  dirs: new Set(["e", "w"]),
  state: "fogged",
  sectionAddress: "main",
  ordinal: "1",
}
const entrance: GridCell = {
  type: "room",
  roomType: "portal",
  dirs: new Set(["e"]),
  state: "completed",
  sectionAddress: "main",
  ordinal: "0",
}
const exitRoom: GridCell = {
  type: "room",
  roomType: "portal",
  dirs: new Set(["w"]),
  state: "fogged",
  sectionAddress: "main",
  ordinal: "2",
}

const floor: FloorGrid = {
  cells: [[entrance, corridor, exitRoom]],
  rows: 1,
  cols: 3,
  entrancePos: [0, 0],
  exitPos: [0, 2],
  siteId: "test-site",
  staircases: {},
}

const assembles: AssembleFor = () => floor
const assemblesNothing: AssembleFor = () => null

/** A journey standing on level 2, so level 1 has been finished and walked out of. */
const onLevel2 = { levelNr: 2, completionCount: 0 }
/** A journey standing on level 1 and not finished, so nothing has been walked out of yet. */
const onLevel1 = { levelNr: 1, completionCount: 0 }

describe("repairFloorExploration", () => {
  it("drops a claim the floor no longer supports, without the player going there", () => {
    const repaired = repairFloorExploration(
      {
        ...onLevel2,
        floorExploration: { "1:0": { open: true, keySets: [["ward_a_1"]] } },
        exploredCells: { "1:main": ["0/entrance", "0/~1"] },
      },
      assembles
    )

    expect(repaired.floorExploration).toEqual({ "1:0": { open: false, keySets: [] } })
  })

  it("writes down the way out of a level the player has finished, so the mark reaches the door", () => {
    const repaired = repairFloorExploration(
      { ...onLevel2, floorExploration: { "1:0": { open: false, keySets: [] } }, exploredCells: {} },
      assembles
    )

    expect(repaired.exploredCells["1:main"]).toContain("0/exit")
    // The corridor sits between the doorway and the door, so the mark now brings it back: nothing to
    // report on a floor that was walked to its end.
    expect(repaired.floorExploration).toEqual({ "1:0": { open: false, keySets: [] } })
  })

  it("leaves the way out unwritten on a level the player has not finished", () => {
    const repaired = repairFloorExploration(
      { ...onLevel1, floorExploration: { "1:0": { open: false, keySets: [] } }, exploredCells: {} },
      assembles
    )

    expect(repaired.exploredCells["1:main"]).toBeUndefined()
    // Nothing says the player ever reached the door, so the corridor beyond is still a branch to walk.
    expect(repaired.floorExploration).toEqual({ "1:0": { open: true, keySets: [] } })
  })

  it("counts every level as finished once the whole journey has been", () => {
    const repaired = repairFloorExploration(
      {
        levelNr: 1,
        completionCount: 1,
        floorExploration: { "1:0": { open: false, keySets: [] } },
        exploredCells: {},
      },
      assembles
    )

    expect(repaired.exploredCells["1:main"]).toContain("0/exit")
  })

  it("reads each entry against its own level, not whichever one the save is on", () => {
    // The same floor, walked on level 2. Level 1's floor has never been touched and was never
    // finished, so its own entry must still say there is something there.
    const repaired = repairFloorExploration(
      {
        ...onLevel1,
        floorExploration: { "1:0": { open: true, keySets: [] } },
        exploredCells: { "2:main": ["0/entrance", "0/~1", "0/exit"] },
      },
      assembles
    )

    expect(repaired.floorExploration).toEqual({ "1:0": { open: true, keySets: [] } })
  })

  it("forgets a floor that no longer assembles, rather than keeping an unanswerable claim", () => {
    const repaired = repairFloorExploration(
      {
        ...onLevel2,
        floorExploration: { "1:0": { open: true, keySets: [["ward_a_1"]] } },
        exploredCells: { "1:main": ["0/entrance"] },
      },
      assemblesNothing
    )

    expect(repaired.floorExploration).toEqual({})
  })
})
