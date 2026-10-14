import { describe, expect, it } from "vitest"
import { freshState, noLabels, plainFloor, prepOf } from "./carveFixtures"
import { makePkey } from "./grid"
import { render } from "./render"
import type { Cell, OneWayEdge, RoomSpec } from "./state"

// A walk of three nodes along row 0 (0,0 → 0,2 → 0,4), the entrance and exit rooms at its ends, and a node at
// 4,4 a vertical drop below the exit.
describe("render", () => {
  const prep = prepOf(plainFloor())
  const drawn = (drops: OneWayEdge[]) => {
    const mainPath: Cell[] = [
      [0, 0],
      [0, 2],
      [0, 4],
    ]
    const pkey = makePkey(5)
    const labels = noLabels()
    mainPath.forEach(([r, c], step) => labels.ordinal.set(`${r},${c}`, String(step)))
    labels.ordinal.set("4,4", "0")
    labels.address.set("4,4", "s0")
    const mainRooms = new Map<string, RoomSpec>([
      ["0,0", { roomType: "portal" }],
      ["0,4", { roomType: "portal" }],
    ])
    return render(prep, {
      ...freshState(prep),
      lay: null,
      maze: {
        n: 5,
        entrance: mainPath[0],
        exit: mainPath[2],
        mainPath,
        passages: new Set([pkey(0, 0, 0, 2), pkey(0, 2, 0, 4)]),
      },
      branches: {
        used: new Set(["0,0", "0,2", "0,4", "4,4"]),
        groups: [],
        subChains: [],
        seamDrops: [],
        carved: new Set<string>(),
      },
      labels,
      doors: {
        intended: new Set<string>(),
        gated: new Set<string>(),
        behind: new Map(),
        ground: new Map(),
        seamGated: new Set<string>(),
        seamBehind: new Map(),
      },
      mainRooms,
      chainRooms: new Map(),
      switchDoors: new Map(),
      drops,
    })
  }

  it("writes a room where a pass specced one, a corridor elsewhere, and a connector on every open edge", () => {
    const grid = drawn([])
    expect(grid.cells[0].map(cell => cell.type)).toEqual(["room", "corridor", "corridor", "corridor", "room"])
    expect(grid.cells[0][1]).toMatchObject({ type: "corridor", ordinal: "0|1", dirs: new Set(["e", "w"]) })
    expect(grid.cells[0][0]).toMatchObject({ state: "reachable", dirs: new Set(["e"]) })
    expect(grid.cells[0][4]).toMatchObject({ state: "fogged", dirs: new Set(["w"]) })
  })

  it("writes a drop's run with no way across, joining each end to its own stub", () => {
    const grid = drawn([
      { from: "0,4", to: "4,4", dir: "s", launch: "1,4", run: ["2,4"], landing: "3,4", realisation: "slide" },
    ])
    expect(grid.cells[2][4]).toMatchObject({ dirs: new Set(), obstacle: { dir: "s", kind: "slide" } })
    expect(grid.cells[1][4]).toMatchObject({ dirs: new Set(["n"]), ordinal: "2|s0:0#0" })
    expect(grid.cells[3][4]).toMatchObject({ dirs: new Set(["s"]) })
    expect(grid.cells[0][4]).toMatchObject({ dirs: new Set(["w", "s"]) })
    expect(grid.cells[4][4]).toMatchObject({ dirs: new Set(["n"]) })
  })
})
