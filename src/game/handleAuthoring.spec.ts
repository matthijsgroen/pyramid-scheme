import { describe, expect, it } from "vitest"
import {
  attemptFloor,
  floorWithHandle,
  handleFloorConfig,
  nestedFloorWithHandle,
  type Handle,
} from "./testSupport/handleFixtures"
import { openDoorsFor } from "./mechanismDoors"
import { openWaysOut } from "@/app/SiteMap/useAssembledFloor"
import { cellAddress } from "@/app/SiteMap/cellIdentity"
import type { FloorConfig, FloorGrid, GridCell, RoomCell } from "./siteTypes"

const rooms = (grid: FloorGrid): RoomCell[] =>
  grid.cells.flatMap(row => row.filter((cell): cell is RoomCell => cell.type === "room"))

const tagged = (grid: FloorGrid, tag: string) => rooms(grid).filter(room => room.tags?.includes(tag))

const at = (grid: FloorGrid, match: (cell: GridCell) => boolean): [number, number] => {
  for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) if (match(grid.cells[r][c])) return [r, c]
  throw new Error("no cell matched")
}

const cellOfSection = (grid: FloorGrid, section: string, tag: string) =>
  at(grid, cell => cell.type === "room" && cell.sectionAddress === section && !!cell.tags?.includes(tag))

const reasonsOf = (config: FloorConfig) => {
  const result = attemptFloor(config)
  expect(result.success).toBe(false)
  return result.success ? [] : result.reasons
}

describe("a floor authoring a handle", () => {
  it("stands the lever in the named section and gates each driven section", () => {
    const { grid } = floorWithHandle({ in: "lever", drives: ["vault", "pocket"] })
    const levers = tagged(grid, "handle")
    expect(levers).toHaveLength(1)
    expect(levers[0].sectionAddress).toBe("lever")
    expect(levers[0].mechanism).toEqual({
      positions: [
        { state: "vault", gateKeyId: "handle:dev_topology#0#0#0:vault" },
        { state: "pocket", gateKeyId: "handle:dev_topology#0#0#0:pocket" },
      ],
      restReachable: true,
    })
  })

  it("puts each gate on the section it names, asking for that handle's own key", () => {
    const { grid } = floorWithHandle({ in: "lever", drives: ["vault", "pocket"] })
    const gates = tagged(grid, "gate")
    expect(gates.map(gate => gate.requiredKeyId).sort()).toEqual([
      "handle:dev_topology#0#0#0:pocket",
      "handle:dev_topology#0#0#0:vault",
    ])
    expect(gates.map(gate => gate.sectionAddress).sort()).toEqual(["pocket", "vault"])
  })

  it("mints no key, wears no colour and stands nothing in a gate the lever owns", () => {
    const { grid } = floorWithHandle({ in: "lever", drives: ["vault"] })
    const gate = tagged(grid, "gate")[0]
    expect(gate.keyIsAuthored).toBe(true)
    expect(gate.gateVariant).toBe("floor-key")
    expect(gate.keyColor).toBeUndefined()
    // A family on the door would make it a room the player enters and taps, and `openWaysOut` skips
    // every cell that has one — so the lever could never open it.
    expect(gate.family).toBeUndefined()
  })

  it("opens the driven section's door, and only that one, when the lever stands at its position", () => {
    const { grid } = floorWithHandle({ in: "lever", drives: ["vault", "pocket"] })
    const [lr, lc] = at(grid, cell => cell.type === "room" && !!cell.tags?.includes("handle"))
    const lever = cellAddress(grid, 0, lr, lc)!

    const open = openWaysOut(grid, openDoorsFor(grid, 0, new Map([[lever, "vault"]])))
    const [vr, vc] = cellOfSection(grid, "vault", "gate")
    const [pr, pc] = cellOfSection(grid, "pocket", "gate")
    expect(open.cells[vr][vc].type).toBe("corridor")
    expect(open.cells[pr][pc].type).toBe("room")

    // And the other way round, because a lever is thrown back: the same floor, the other position.
    const other = openWaysOut(grid, openDoorsFor(grid, 0, new Map([[lever, "pocket"]])))
    expect(other.cells[vr][vc].type).toBe("room")
    expect(other.cells[pr][pc].type).toBe("corridor")
  })

  it("stands a lever on the main path without taking a puzzle room for it", () => {
    const { grid } = floorWithHandle({ in: "main", drives: ["vault"] })
    const levers = tagged(grid, "handle")
    expect(levers).toHaveLength(1)
    expect(levers[0].sectionAddress).toBe("main")
    expect(levers[0].pathIndex).toBeUndefined()
    // The two puzzles the floor authored are all still there, each still the k-th room of the chain.
    const mainPuzzles = rooms(grid).filter(room => room.sectionAddress === "main" && room.pathIndex !== undefined)
    expect(mainPuzzles.map(room => room.pathIndex).sort()).toEqual([0, 1])
  })

  it("names a sub-path by the positional address it has, having no label", () => {
    const { grid } = nestedFloorWithHandle({ in: "s0.0", drives: ["s0.1"] })
    expect(tagged(grid, "handle")[0].sectionAddress).toBe("s0.0")
    const gate = tagged(grid, "gate")[0]
    expect(gate.sectionAddress).toBe("s0.1")
    expect(gate.requiredKeyId).toBe("handle:dev_topology#0#0#0:s0.1")
  })

  it("carves two handles on one floor, whose four familyless doors a save still tells apart", () => {
    // A door with no family is named `x?` in its section (cellSlot.ts), so four of them on one floor
    // rest on each standing in a section of its own — which is what refusing a twice-driven section
    // buys. A collision would fail the floor outright with `duplicateCellSlot`.
    const { grid } = floorWithHandle(
      { in: "lever", drives: ["vault", "pocket"] },
      { in: "lever2", drives: ["vault2", "pocket2"] }
    )
    expect(tagged(grid, "handle")).toHaveLength(2)
    expect(
      tagged(grid, "gate")
        .map(gate => gate.sectionAddress)
        .sort()
    ).toEqual(["pocket", "pocket2", "vault", "vault2"])
  })

  it("puts one mark on the lever and the same one on every door it drives", () => {
    const { grid } = floorWithHandle({ in: "lever", drives: ["vault", "pocket"] })
    const mark = tagged(grid, "handle")[0].mark
    expect(mark).toBeDefined()
    expect(tagged(grid, "gate").map(gate => gate.mark)).toEqual([mark, mark])
  })

  it("gives the floor's second lever a mark that is not the first one's", () => {
    const { grid } = floorWithHandle(
      { in: "lever", drives: ["vault", "pocket"] },
      { in: "lever2", drives: ["vault2", "pocket2"] }
    )
    const markOf = (section: string) => rooms(grid).find(room => room.mark && room.sectionAddress === section)?.mark
    expect(markOf("lever")).not.toEqual(markOf("lever2"))
    // And each lever's own doors wear its pair, not the other's.
    expect([markOf("vault"), markOf("pocket")]).toEqual([markOf("lever"), markOf("lever")])
    expect([markOf("vault2"), markOf("pocket2")]).toEqual([markOf("lever2"), markOf("lever2")])
  })

  /**
   * A LEVER'S ROOM IS AN ENCOUNTER AND NEVER A FORK, and `shapeKindFor` (nodeKinds.ts) is built on it:
   * its fork branch runs BEFORE the handle branch and claims any fork carrying a registered family, so
   * a lever standing in one would be drawn as a switch and its tag never reached. Asked of real
   * assembled floors — a lever in a labelled side path, on the main path, and in a sub-path — because
   * that is where `leverSpec` would change.
   */
  it("stands every lever in an encounter room, never in a junction", () => {
    const grids = [
      floorWithHandle({ in: "lever", drives: ["vault"] }).grid,
      floorWithHandle({ in: "main", drives: ["vault"] }).grid,
      nestedFloorWithHandle({ in: "s0.0", drives: ["s0.1"] }).grid,
    ]
    expect(grids.flatMap(grid => tagged(grid, "handle")).map(lever => lever.roomType)).toEqual([
      "encounter",
      "encounter",
      "encounter",
    ])
  })

  it("leaves a mark off every room that is neither a lever nor a door it drives", () => {
    const { grid } = floorWithHandle({ in: "lever", drives: ["vault"] })
    const marked = rooms(grid).filter(room => room.mark !== undefined)
    expect(marked.map(room => room.sectionAddress).sort()).toEqual(["lever", "vault"])
  })
})

describe("a handle the floor cannot have, refused once before any carve", () => {
  const withAuthoredGateOn = (config: FloorConfig, label: string): FloorConfig => ({
    ...config,
    sideSections: config.sideSections.map(section =>
      section.label === label ? { ...section, gate: { type: "floor-key" as const, keyId: "authored:key" } } : section
    ),
  })

  const cases: [string, Handle[], string][] = [
    ["a driven section the floor does not have", [{ in: "lever", drives: ["nowhere"] }], "nowhere"],
    ["a lever standing in a section the floor does not have", [{ in: "nowhere", drives: ["vault"] }], "nowhere"],
    ["a lever shut in behind the door it opens", [{ in: "lever", drives: ["lever"] }], "lever"],
    ["the main path, which has no entrance to gate", [{ in: "lever", drives: ["main"] }], "main"],
    [
      "a second lever in a section that already stands one",
      [
        { in: "lever", drives: ["vault"] },
        { in: "lever", drives: ["pocket"] },
      ],
      "lever",
    ],
    [
      "a section a second handle already drives",
      [
        { in: "lever", drives: ["vault"] },
        { in: "lever2", drives: ["vault"] },
      ],
      "vault",
    ],
  ]

  it.each(cases)("names %s", (_what, handles, address) => {
    expect(reasonsOf(handleFloorConfig(...handles))).toContainEqual(
      expect.objectContaining({ type: "handleUnsatisfied", address })
    )
  })

  it("names a section whose gate an author already wrote", () => {
    const config = withAuthoredGateOn(handleFloorConfig({ in: "lever", drives: ["vault"] }), "vault")
    expect(reasonsOf(config)).toContainEqual(expect.objectContaining({ type: "handleUnsatisfied", address: "vault" }))
  })
})
