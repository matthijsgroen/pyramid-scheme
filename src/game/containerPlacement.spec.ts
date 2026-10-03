import { describe, expect, it } from "vitest"
import { adjacencyFaults } from "./carveAgreement"
import { regionRoute, regionsAlongPath } from "./regions"
import type { PlacedContainer } from "./regions"
import { assembleFloor, ONE_WAY_RUN_CELLS } from "./siteAssembler"
import type { CorridorCell, FloorConfig, RoomCell } from "./siteTypes"

const SEED = 99

// `free` throughout: where the ordinary content before and after the container lands is the carve's
// to decide, and what this file claims is about WHERE REGIONS STAND, not what fills them.
const container: PlacedContainer = {
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

const floor = (regionLayout: PlacedContainer): FloorConfig => ({
  pathPuzzles: 14,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  regionLayout,
})

type Node = RoomCell | CorridorCell

const carve = (config: FloorConfig) => {
  const result = assembleFloor("test-journey", config, SEED)
  if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
  return result.grid
}

// The main path's own nodes, in walking order: a node is a cell that carries a main-section ordinal.
const mainNodes = (config: FloorConfig): Node[] =>
  carve(config)
    .cells.flat()
    .filter(
      (cell): cell is Node => (cell.type === "room" || cell.type === "corridor") && /^\d+$/.test(cell.ordinal ?? "")
    )
    .filter(cell => cell.sectionAddress === "main")
    .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))

describe("a container the floor places on part of its main path", () => {
  const placed: PlacedContainer = { ...container, placement: { enters: 0.3 } }

  it("stands the container's regions on a stretch and leaves every other main-path node unlabelled", () => {
    const nodes = mainNodes(floor(placed))
    const expected = regionsAlongPath(placed, regionRoute(placed), nodes.length)

    expect(nodes.map(node => node.region)).toEqual(expected)
  })

  it("keeps the floor's own entrance and exit outside the container, ports and all", () => {
    const nodes = mainNodes(floor(placed))

    expect(nodes[0].region).toBeUndefined()
    expect(nodes[nodes.length - 1].region).toBeUndefined()
  })

  it("enters the stretch at the container's `in` and leaves it at its `out`", () => {
    const labelled = mainNodes(floor(placed)).filter(node => node.region !== undefined)

    expect(labelled[0].region).toBe("mouth")
    expect(labelled[labelled.length - 1].region).toBe("vault")
  })

  it("threads the regions in route order with ordinary ground before and after", () => {
    const regions = mainNodes(floor(placed)).map(node => node.region)
    const first = regions.findIndex(r => r !== undefined)
    const last = regions.length - 1 - [...regions].reverse().findIndex(r => r !== undefined)

    expect(first).toBeGreaterThan(0)
    expect(last).toBeLessThan(regions.length - 1)
    // One unbroken stretch: no unlabelled node inside it, no labelled node outside it.
    regions.forEach((region, i) => expect(region !== undefined).toBe(i >= first && i <= last))
    expect(regions.slice(first, last + 1).filter((r, i, all) => r !== all[i - 1])).toEqual(["mouth", "hall", "vault"])
  })

  it("carries ordinary content before and after the container, every such room outside its regions", () => {
    const nodes = mainNodes(floor(placed))
    const firstIn = nodes.findIndex(n => n.region !== undefined)
    const lastIn = nodes.length - 1 - [...nodes].reverse().findIndex(n => n.region !== undefined)
    const puzzleAt = (n: Node) => n.type === "room" && n.pathIndex !== undefined

    expect(nodes.slice(0, firstIn).some(puzzleAt)).toBe(true)
    expect(nodes.slice(lastIn + 1).some(puzzleAt)).toBe(true)
    nodes.forEach((node, i) => {
      if (i < firstIn || i > lastIn) expect(node.region).toBeUndefined()
    })
  })

  it("agrees with the carve: the container's own connections are the only region adjacency", () => {
    expect(adjacencyFaults(carve(floor(placed)).cells, placed)).toEqual([])
  })

  it("is the container's graph the carve is asked about, not the floor's whole main path", () => {
    // A layout asking for a connection the carve can never make would be refused; the same container
    // placed carries no fault, because ordinary cells name no region to disagree with.
    const regions = carve(floor(placed))
      .cells.flat()
      .flatMap(cell => (cell.type === "room" || cell.type === "corridor" ? [cell.region] : []))

    expect(regions.some(r => r === undefined)).toBe(true)
    expect(new Set(regions.filter(r => r !== undefined))).toEqual(new Set(["mouth", "hall", "vault"]))
  })
})

describe("a container that is the whole floor", () => {
  it("labels every main-path node and ends the stretch on the floor's own exit", () => {
    const nodes = mainNodes(floor(container))

    expect(nodes.map(node => node.region)).toEqual(regionsAlongPath(container, regionRoute(container), nodes.length))
    expect(nodes.every(node => node.region !== undefined)).toBe(true)
    expect(nodes[0].region).toBe("mouth")
    expect(nodes[nodes.length - 1].region).toBe("vault")
  })
})

describe("a placement that is not a share of the path", () => {
  it.each([-0.1, 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("refuses enters %s by name", enters => {
    const result = assembleFloor("test-journey", floor({ ...container, placement: { enters } }), SEED)

    expect(result.success).toBe(false)
    expect(result.success ? [] : result.reasons).toEqual([{ type: "placementOutOfRange", enters }])
  })
})

describe("a container holding a drop", () => {
  const dropping: PlacedContainer = { ...container, placement: { enters: 0.3 } }
  const config: FloorConfig = {
    ...floor(dropping),
    obstacles: [{ id: "fall", kind: "oneWay", at: { on: "connection", between: ["vault", "mouth"] } }],
  }

  // A drop is a launch, ONE_WAY_RUN_CELLS obstacle cells and a landing, and the cells between are an
  // island in the walk graph — the same whether the container is the floor or stands on part of it.
  it("reserves the whole run: ONE_WAY_RUN_CELLS obstacle cells that open onto nothing", () => {
    const run = carve(config)
      .cells.flat()
      .filter((cell): cell is CorridorCell => cell.type === "corridor" && cell.obstacle !== undefined)

    expect(run).toHaveLength(ONE_WAY_RUN_CELLS)
    for (const cell of run) expect([...cell.dirs]).toEqual([])
  })

  it("still stands the container's regions on a stretch with the floor's ground either side", () => {
    const nodes = mainNodes(config)

    expect(nodes.map(node => node.region)).toEqual(regionsAlongPath(dropping, regionRoute(dropping), nodes.length))
    expect(nodes[0].region).toBeUndefined()
    expect(nodes[nodes.length - 1].region).toBeUndefined()
  })
})
