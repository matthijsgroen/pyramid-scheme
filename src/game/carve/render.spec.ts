import { describe, expect, it } from "vitest"
import { defaultResolveEncounter } from "../encounterFallback"
import type { ResolveEncounter } from "../siteAssembler"
import { firstCarved, freshState, noLabels, plainFloor, prepOf, DIR_MOVE, findRoom } from "./carveFixtures"
import { makePkey } from "./grid"
import { switchMark } from "./ids"
import { prepareFloor } from "./prepareFloor"
import { render, renderShut } from "./render"
import type { RenderState } from "./render"
import { validate } from "./validate"
import { assembleFloor } from "./assembleFloor"
import type { Cell, OneWayEdge, RoomSpec } from "./state"
import type { Direction, FloorConfig, FloorGrid, GridCell, RoomCell } from "../siteTypes"
// A walk of three nodes along row 0 (0,0 → 0,2 → 0,4), the entrance and exit rooms at its ends, and a node at
// 4,4 a vertical drop below the exit.
describe("render", () => {
  const prep = prepOf(plainFloor())
  const drawn = (drops: OneWayEdge[], pipeHoles = new Map<string, { cell: string }>()) => {
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
      forks: { reserved: [], inFork: new Set<string>(), switchesPlaced: 0 },
      switchWays: [],
      switchRooms: new Map(),
      forkSwitchRooms: new Map(),
      pipeHoles,
    })
  }

  it("writes a room where a pass specced one, a corridor elsewhere, and a connector on every open edge", () => {
    const grid = drawn([])
    expect(grid.cells[0].map(cell => cell.type)).toEqual(["room", "corridor", "corridor", "corridor", "room"])
    expect(grid.cells[0][1]).toMatchObject({ type: "corridor", ordinal: "0|1", dirs: new Set(["e", "w"]) })
    expect(grid.cells[0][0]).toMatchObject({ state: "reachable", dirs: new Set(["e"]) })
    expect(grid.cells[0][4]).toMatchObject({ state: "fogged", dirs: new Set(["w"]) })
  })

  it("turns a pipe's hole node into a room that keeps its dirs and wears no dressing", () => {
    const grid = drawn([], new Map([["a.P@a.hall", { cell: "0,2" }]]))
    expect(grid.cells[0][2]).toMatchObject({
      type: "room",
      dirs: new Set(["e", "w"]),
      pipeHole: { pipe: "a.P", region: "a.hall" },
    })
    expect(grid.cells[0][2]).not.toHaveProperty("decoration")
    expect(grid.cells[0][2]).not.toHaveProperty("wallDecoration")
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

// entrance 0,0 → junction 0,2 → exit 0,4, with a branch node 2,2 off the junction, reserved for a switch.
describe("a reserved junction", () => {
  const prep = prepOf(plainFloor())
  const pkey = makePkey(5)
  const passages = new Set([pkey(0, 0, 0, 2), pkey(0, 2, 0, 4), pkey(0, 2, 2, 2)])
  const mainPath: Cell[] = [
    [0, 0],
    [0, 2],
    [0, 4],
  ]
  const junctionState = (switchesPlaced: number) => ({
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
    labels: noLabels(),
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
      ["0,2", { roomType: "fork" }],
      ["0,4", { roomType: "portal" }],
    ]),
    chainRooms: new Map(),
    switchDoors: new Map(),
    drops: [],
    forks: { reserved: ["0,2"], inFork: new Set<string>(), switchesPlaced },
    switchWays: [[{ dir: "s" as const, cell: "2,2", gateKeyId: "switch:way" }]],
    forkSwitchRooms: new Map(),
    pipeHoles: new Map(),
    switchRooms: new Map(switchesPlaced > 0 ? [["0,2", { family: "sumplete", mechanismId: "switch:0" }]] : []),
  })

  it("stands the switch in its junction, shuts its way out and names the key on the junction's exit", () => {
    const grid = render(prep, junctionState(1))
    expect(grid.cells[2][2]).toMatchObject({ type: "room", requiredKeyId: "switch:way", keyIsAuthored: true })
    expect(grid.cells[0][2]).toMatchObject({
      exits: expect.arrayContaining([{ dir: "s", kind: "side", gateKeyId: "switch:way" }]),
      mechanism: { initial: "rest", states: ["rest", "switch:way"] },
      family: "sumplete",
      mechanismId: "switch:0",
    })
  })

  it("leaves it open where no switch stands in it, and shuts it in the view the carve is checked against", () => {
    expect(render(prep, junctionState(0)).cells[2][2]).toMatchObject({ type: "corridor" })
    expect(renderShut(prep, junctionState(0)).cells[2][2]).toMatchObject({ requiredKeyId: "switch:way" })
  })
})

describe("fork exits", () => {
  it("names each exit's compass direction and what lies down it", () => {
    const config: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
    }
    let found: { r: number; c: number; cell: RoomCell; grid: FloorGrid } | null = null
    for (let seed = 0; seed < 60 && !found; seed++) {
      const result = assembleFloor(`site-fork-exits-${seed}`, config, seed)
      if (!result.success) continue
      const fork = findRoom(result.grid, cell => cell.roomType === "fork")
      if (fork) found = { ...fork, grid: result.grid }
    }
    if (!found) throw new Error("no seed produced a fork room")
    const { r, c, cell, grid } = found

    // What lies down each of the fork's own dirs, read off the neighbour node two grid cells
    // away (NODE_STEP) — never a hand-written direction, since the carve picks them, not this test.
    const [entR, entC] = grid.entrancePos
    const mainAddress = grid.cells[entR][entC].type !== "empty" ? grid.cells[entR][entC].sectionAddress : undefined
    const expectedKind = (nr: number, nc: number): "main" | "side" | "ward" | "fork" => {
      const neighbor = grid.cells[nr][nc]
      if (neighbor.type === "room" && neighbor.roomType === "fork") return "fork"
      if (neighbor.type === "room" && neighbor.gateVariant === "tomb-key") return "ward"
      if (neighbor.type !== "empty" && neighbor.sectionAddress === mainAddress) return "main"
      return "side"
    }
    const byDir = (a: { dir: Direction }, b: { dir: Direction }) => a.dir.localeCompare(b.dir)
    const expected = [...cell.dirs]
      .map(dir => {
        const [dr, dc] = DIR_MOVE[dir]
        return { dir, kind: expectedKind(r + dr * 2, c + dc * 2) }
      })
      .sort(byDir)

    expect(cell.exits).toBeDefined()
    expect([...(cell.exits ?? [])].sort(byDir)).toEqual(expected)
    // This config attaches one ungated side section to a main path with room to spare, so
    // every fork the carve produces owns both its main-path directions and exactly one side.
    expect(expected.filter(e => e.kind === "main").length).toBe(2)
    expect(expected.filter(e => e.kind === "side").length).toBe(1)
  })
})

// A switch needs a family the player can walk back into, which these specs grant without the registry.
const reEnterable: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const switchFloor = (switches?: FloorConfig["switches"]): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
  forks: [{ exits: 2, count: 1 }],
  ...(switches ? { switches } : {}),
})

/** The first seed whose first carved attempt passes the grid's checks, with its prep and grid. */
const checked = (config: FloorConfig) => {
  for (let seed = 0; seed < 40; seed++) {
    const prepared = prepareFloor(`site-${seed}`, config, seed, {
      resolveEncounter: reEnterable,
      floorRef: { journeyId: "render-spec", levelIndex: 0, floorIndex: 0 },
    })
    if (!prepared.ok) throw new Error(JSON.stringify(prepared.reasons))
    const { prep } = prepared
    const state = firstCarved(prep) as RenderState
    const grid = render(prep, state)
    if (validate(prep, state, grid) === undefined) return { prep, state, grid }
  }
  throw new Error("no seed passed")
}

const roomsOf = (cells: readonly (readonly GridCell[])[]) =>
  cells.flat().filter((cell): cell is RoomCell => cell.type === "room")

describe("a switch on a carved floor", () => {
  it("stands the switch in its junction, and marks it and its doors with the attempt's own switch mark", () => {
    const { prep, state, grid } = checked(switchFloor({ encounter: "sumplete", min: 1, max: 1 }))
    const [r, c] = state.forks.reserved[0].split(",").map(Number)
    const mark = switchMark(prep, 0)
    expect(grid.cells[r][c]).toMatchObject({ roomType: "fork", family: "sumplete", mark })
    const doors = roomsOf(grid.cells).filter(cell => cell.requiredKeyId?.startsWith("switch:"))
    expect(doors.length).toBeGreaterThan(0)
    for (const door of doors) expect(door.mark).toEqual(mark)
    expect([...prep.marks.markByGateKey.keys()].filter(key => key.startsWith("switch:"))).toEqual([])
  })

  it("opens a reserved junction again where no switch stands in it", () => {
    const { state, grid } = checked(switchFloor())
    const [r, c] = state.forks.reserved[0].split(",").map(Number)
    expect(grid.cells[r][c]).toMatchObject({ roomType: "fork" })
    expect(grid.cells[r][c]).not.toHaveProperty("mechanism")
    expect(roomsOf(grid.cells).filter(cell => cell.requiredKeyId?.startsWith("switch:"))).toEqual([])
  })
})
