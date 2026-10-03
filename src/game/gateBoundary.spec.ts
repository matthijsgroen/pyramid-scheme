import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import type { RegionGraph } from "./regions"

const JOURNEY = "boundary"
const SEEDS = Array.from({ length: 30 }, (_, seed) => seed)

const chain: RegionGraph = {
  regions: [
    { name: "mouth", appetite: "free" },
    { name: "hall", appetite: "free" },
    { name: "vault", appetite: "free" },
  ],
  connections: [
    ["mouth", "hall"],
    ["hall", "vault"],
  ],
  in: "mouth",
  out: "vault",
}

// Branching: a side chain hangs off the entrance and a second route runs on to the way out.
const doubleBack: RegionGraph = {
  regions: [
    { name: "entrance", appetite: "free" },
    { name: "rightLower", appetite: "free" },
    { name: "s1Chamber", appetite: "free" },
    { name: "leftLower", appetite: "free" },
    { name: "s2Chamber", appetite: "free" },
    { name: "wayOut", appetite: "free" },
  ],
  connections: [
    ["entrance", "leftLower"],
    ["entrance", "rightLower"],
    ["rightLower", "s1Chamber"],
    ["leftLower", "s2Chamber"],
    ["s2Chamber", "wayOut"],
  ],
  in: "entrance",
  out: "wayOut",
}

type Fixture = {
  name: string
  layout: RegionGraph
  config: FloorConfig
  gates: { id: string; between: [string, string] }[]
}

const base = {
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
} as const

const fixtures: Fixture[] = [
  {
    name: "a chain of three regions, two gates in sequence",
    layout: chain,
    gates: [
      { id: "gA", between: ["mouth", "hall"] },
      { id: "gB", between: ["hall", "vault"] },
    ],
    config: {
      ...base,
      pathPuzzles: 4,
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
      regionLayout: chain,
      obstacles: [
        { id: "gA", kind: "gate", at: { on: "connection", between: ["mouth", "hall"] } },
        { id: "gB", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } },
      ],
      controls: [
        {
          id: "w1",
          in: "mouth",
          states: ["n", "e"],
          initial: "n",
          returnsToInitial: true,
          opens: { n: ["gA"], e: ["gB"] },
        },
      ],
    },
  },
  {
    name: "a branching layout, gates on the main route, at a side chain's mouth and within it",
    layout: doubleBack,
    gates: [
      { id: "forkRight", between: ["entrance", "rightLower"] },
      { id: "greenRight", between: ["rightLower", "s1Chamber"] },
      { id: "greenLeft", between: ["leftLower", "s2Chamber"] },
    ],
    config: {
      ...base,
      pathPuzzles: 3,
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
      regionLayout: doubleBack,
      obstacles: [
        { id: "forkRight", kind: "gate", at: { on: "connection", between: ["entrance", "rightLower"] } },
        { id: "greenRight", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } },
        { id: "greenLeft", kind: "gate", at: { on: "connection", between: ["leftLower", "s2Chamber"] } },
      ],
      controls: [
        {
          id: "Y",
          in: "entrance",
          states: ["unset", "open"],
          initial: "unset",
          returnsToInitial: false,
          opens: { unset: [], open: ["forkRight", "greenRight", "greenLeft"] },
        },
      ],
    },
  },
  {
    name: "a larger chain floor, one gate into the last region",
    layout: chain,
    gates: [{ id: "vaultDoor", between: ["hall", "vault"] }],
    config: {
      ...base,
      pathPuzzles: 10,
      sideSections: [
        { pathPuzzles: 3, difficulty: "starter", end: "treasure" },
        { pathPuzzles: 3, difficulty: "starter", end: "treasure" },
        { pathPuzzles: 3, difficulty: "starter", end: "treasure" },
        { pathPuzzles: 2, difficulty: "starter", end: "treasure" },
      ],
      regionLayout: chain,
      obstacles: [{ id: "vaultDoor", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } }],
      controls: [
        {
          id: "s1",
          in: "mouth",
          states: ["left", "right"],
          initial: "right",
          returnsToInitial: true,
          opens: { right: ["vaultDoor"] },
        },
      ],
    },
  },
]

const STEP: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const BACK: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

/** The rooms a room opens onto: out of each of its directions, along the corridor cells (round their
 * corners) to the next room, with the cell it stands at. */
const neighbourRooms = (grid: FloorGrid, r: number, c: number): { room: RoomCell; at: [number, number] }[] => {
  const cell = grid.cells[r][c]
  if (cell.type === "empty") return []
  const found: { room: RoomCell; at: [number, number] }[] = []
  for (const first of cell.dirs) {
    let [pr, pc, dir] = [r, c, first]
    for (let hops = 0; hops < grid.rows * grid.cols; hops++) {
      pr += STEP[dir][0]
      pc += STEP[dir][1]
      const here = grid.cells[pr]?.[pc]
      if (!here || here.type === "empty") break
      if (here.type === "room") {
        found.push({ room: here, at: [pr, pc] })
        break
      }
      const onward = [...here.dirs].filter(d => d !== BACK[dir])
      if (onward.length !== 1) break
      dir = onward[0]
    }
  }
  return found
}

const gateRoomsFor = (grid: FloorGrid, id: string): { cell: RoomCell; at: [number, number] }[] => {
  const found: { cell: RoomCell; at: [number, number] }[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "room" && cell.requiredKeyId?.endsWith(`:${id}`)) found.push({ cell, at: [r, c] })
    })
  )
  return found
}

describe("a gate stands on the boundary its obstacle names", () => {
  for (const { name, layout, config, gates } of fixtures) {
    describe(name, () => {
      const carves = SEEDS.flatMap(seed => {
        const result = assembleFloor(JOURNEY, config, seed)
        return result.success ? [{ seed, grid: result.grid }] : []
      })

      it("carves on some seeds, so the checks below are not over an empty set", () => {
        expect(carves.length).toBeGreaterThan(0)
      })

      for (const { id, between } of gates) {
        const [a, b] = between

        it(`${id}: exactly one gate room, standing in one of ${a} or ${b}`, () => {
          for (const { seed, grid } of carves) {
            const rooms = gateRoomsFor(grid, id)
            expect(rooms, `seed ${seed}`).toHaveLength(1)
            expect([a, b], `seed ${seed}`).toContain(rooms[0].cell.region)
          }
        })

        // A gate on a side chain's mouth connection stands at the chain's first cell, and the chain hangs off
        // whichever main-route room the maze chose as its host. The builder refuses a carve whose regions
        // touch other than the layout connects them (carveAgreement.ts), so every carve that comes back
        // has the mouth's host in the near region, on every seed.
        it(`${id}: opens onto the other region of ${a}/${b}, and onto no region the layout does not join it to`, () => {
          for (const { seed, grid } of carves) {
            const [{ cell, at }] = gateRoomsFor(grid, id)
            const own = cell.region
            const other = own === a ? b : a
            const regions = neighbourRooms(grid, at[0], at[1]).map(({ room }) => room.region)
            expect(regions, `seed ${seed}`).toContain(other)
            // A region one room deep puts the next region's first room beside the gate, so a neighbour
            // may be the far region's own neighbour — never one the layout has no connection to.
            const joined = layout.connections.flatMap(([x, y]) => (x === own ? [y] : y === own ? [x] : []))
            for (const region of regions) expect([a, b, ...joined], `seed ${seed}`).toContain(region)
          }
        })

        it(`${id}: is the only passage joining a room of ${a} to a room of ${b}`, () => {
          for (const { seed, grid } of carves) {
            const [{ at }] = gateRoomsFor(grid, id)
            const joins: string[] = []
            grid.cells.forEach((row, r) =>
              row.forEach((cell, c) => {
                if (cell.type !== "room" || (cell.region !== a && cell.region !== b)) return
                for (const { room: other, at: otherAt } of neighbourRooms(grid, r, c)) {
                  if (other.region === cell.region || (other.region !== a && other.region !== b)) continue
                  const ends = [`${r},${c}`, `${otherAt[0]},${otherAt[1]}`]
                  if (!ends.includes(`${at[0]},${at[1]}`)) joins.push(ends.join(" - "))
                }
              })
            )
            expect(joins, `seed ${seed}`).toEqual([])
          }
        })
      }
    })
  }
})
