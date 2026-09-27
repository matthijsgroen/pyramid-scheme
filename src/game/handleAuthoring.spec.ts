import { describe, expect, it } from "vitest"
import { floorWithHandle, nestedFloorWithHandle } from "./testSupport/handleFixtures"
import type { FloorGrid, RoomCell } from "./siteTypes"

const rooms = (grid: FloorGrid): RoomCell[] =>
  grid.cells.flatMap(row => row.filter((cell): cell is RoomCell => cell.type === "room"))

const tagged = (grid: FloorGrid, tag: string) => rooms(grid).filter(room => room.tags?.includes(tag))

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

  it("mints no key and draws no puzzle on a gate the lever owns", () => {
    const { grid } = floorWithHandle({ in: "lever", drives: ["vault"] })
    const gate = tagged(grid, "gate")[0]
    expect(gate.keyIsAuthored).toBe(true)
    expect(gate.gateVariant).toBe("floor-key")
    expect(gate.keyColor).toBeUndefined()
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

  it("fails the floor by name when a driven section has no address to resolve", () => {
    expect(() => floorWithHandle({ in: "lever", drives: ["nowhere"] })).toThrow(/nowhere/)
  })

  it("fails the floor when the lever's own section has no address", () => {
    expect(() => floorWithHandle({ in: "nowhere", drives: ["vault"] })).toThrow(/nowhere/)
  })

  it("fails the floor when a lever would be shut in behind the gate it drives", () => {
    expect(() => floorWithHandle({ in: "lever", drives: ["lever"] })).toThrow(/lever/)
  })
})
