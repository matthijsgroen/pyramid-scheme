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
import { dirsOf } from "../testSupport/modOff"
import { assembleFloor } from "./assembleFloor"
import type { Cell, DressingPools, OneWayEdge, RoomSpec } from "./state"
import { ACTIVITIES, activitiesFor, type ActivityId } from "../activities"
import {
  DECORATION_KINDS,
  decorationFootprint,
  isSingleCell,
  type DecorationKind,
  type Direction,
  type PropFootprint,
  type FloorConfig,
  type FloorGrid,
  type GridCell,
  type RoomCell,
} from "../siteTypes"
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
      drops,
      forks: { reserved: [], inFork: new Set<string>(), switchesPlaced: 0 },
      switchWays: [],
      switchRooms: new Map(),
      forkSwitchRooms: new Map(),
      pipeHoles,
      chambers: new Map(),
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
    chambers: new Map(),
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

  // The junction's two ways out, 2,2 and the exit 0,4, meet again at 2,4 by a leftover edge 2,2–2,4 beside
  // gated ground; the switch's doors stand each way's ground behind its own door.
  it("keeps every wall where it stands with no switch when a switch's ways out meet again", () => {
    const looped = (switchesPlaced: number) => {
      const base = junctionState(switchesPlaced)
      return {
        ...base,
        maze: { ...base.maze, passages: new Set([...passages, pkey(0, 4, 2, 4), pkey(2, 2, 2, 4)]) },
        branches: { ...base.branches, used: new Set([...base.branches.used, "2,4"]) },
        doors: {
          ...base.doors,
          intended: new Set([...passages, pkey(0, 4, 2, 4)]),
          gated: new Set(["2,2"]),
        },
        switchDoors:
          switchesPlaced > 0
            ? new Map([
                ["2,2", new Set(["door 2,2"])],
                ["2,4", new Set(["door 0,4"])],
              ])
            : new Map(),
      }
    }
    expect(dirsOf(render(prep, looped(1)))).toBe(dirsOf(render(prep, looped(0))))
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

// entrance 0,0 → puzzle 0,2 → junction 0,4 → stairhead 0,6 along row 0; a treasure dead end 2,4 below the
// junction; a gate 2,2 below the puzzle, and a ward room 4,2 behind it.
describe("dressing by purpose", () => {
  const TRADE: DressingPools = { props: ["shelf", "jarRack", "rubblePile"], wall: ["niche", "tallyBoard", "sconce"] }
  const pkey = makePkey(7)
  const mainPath: Cell[] = [
    [0, 0],
    [0, 2],
    [0, 4],
    [0, 6],
  ]
  const passages = new Set([
    pkey(0, 0, 0, 2),
    pkey(0, 2, 0, 4),
    pkey(0, 4, 0, 6),
    pkey(0, 4, 2, 4),
    pkey(0, 2, 2, 2),
    pkey(2, 2, 4, 2),
  ])
  const nodes = ["0,0", "0,2", "0,4", "0,6", "2,4", "2,2", "4,2"]
  type Setup = {
    pools?: DressingPools
    stairPools?: DressingPools
    junctionPools?: DressingPools
    patron?: FloorConfig["patron"]
    switchAtJunction?: boolean
    authored?: Record<string, ActivityId>
    pinned?: Record<string, string>
    propFootprint?: (kind: DecorationKind) => PropFootprint
    passThrough?: boolean
  }
  const dressed = ({
    pools = TRADE,
    stairPools,
    junctionPools,
    patron,
    switchAtJunction = false,
    authored = {},
    pinned = {},
    propFootprint,
    passThrough = false,
  }: Setup = {}) => {
    const withAuthored = (entries: [string, RoomSpec][]) =>
      new Map<string, RoomSpec>(
        entries.map(([pk, spec]) => [
          pk,
          {
            ...spec,
            ...(authored[pk] ? { authoredActivity: authored[pk] } : {}),
            ...(pinned[pk] ? { pinnedPrefab: pinned[pk] } : {}),
          },
        ])
      )
    const prep = prepOf(plainFloor(patron ? { patron } : {}), 1, propFootprint ? { propFootprint } : {})
    const labels = noLabels()
    for (const node of nodes) labels.dressing.set(node, pools)
    if (stairPools) labels.dressing.set("0,6", stairPools)
    if (junctionPools) labels.dressing.set("0,4", junctionPools)
    const grid = render(prep, {
      ...freshState(prep),
      lay: null,
      maze: { n: 7, entrance: mainPath[0], exit: mainPath[3], mainPath, passages },
      branches: {
        used: new Set(nodes),
        groups: [{ sectionIdx: 0, cells: [[2, 4]], attachedAt: [0, 4] }],
        subChains: [],
        seamDrops: [],
        carved: new Set<string>(),
      },
      labels,
      doors: {
        intended: passages,
        gated: new Set<string>(),
        behind: new Map(),
        ground: new Map(),
        seamGated: new Set<string>(),
        seamBehind: new Map(),
      },
      mainRooms: withAuthored([
        ["0,0", { roomType: "portal" }],
        ["0,2", passThrough ? { roomType: "chamber" } : { roomType: "encounter", family: "sumplete" }],
        ["0,4", { roomType: "fork" }],
        ["0,6", { roomType: "portal", stairId: "down" }],
      ]),
      chainRooms: withAuthored([
        ["2,4", { roomType: "encounter", family: "chest", tags: ["treasure"] }],
        ["2,2", { roomType: "encounter", family: "keyGate", requiredKeyId: "ward", gateVariant: "tomb-key" }],
        ["4,2", { roomType: "encounter", family: "sumplete" }],
      ]),
      drops: [],
      forks: { reserved: [], inFork: new Set<string>(), switchesPlaced: 0 },
      switchWays: [],
      switchRooms: new Map(switchAtJunction ? [["0,4", { family: "sumplete", mechanismId: "switch:0" }]] : []),
      forkSwitchRooms: new Map(),
      pipeHoles: new Map(),
      chambers: new Map(),
    })
    return (pk: string) => {
      const [r, c] = pk.split(",").map(Number)
      return grid.cells[r][c] as RoomCell
    }
  }
  const activityOf = (id: string) => ACTIVITIES.find(activity => activity.id === id)

  describe("a centre kind", () => {
    // A stand-in: no shipped kind is flagged centre, so the rule is exercised on a kind the test names.
    const basinInTheMiddle = (kind: DecorationKind): PropFootprint =>
      kind === "basin" ? { cols: 2, rows: 1, tall: 0, centre: true } : decorationFootprint(kind)
    const pools = (props: DecorationKind[]): DressingPools => ({ props, wall: [], role: "agriculture" })
    const orders: DecorationKind[][] = [
      ["basin", "jarRack", "shelf"],
      ["jarRack", "basin", "shelf"],
      ["shelf", "jarRack", "basin"],
      ["jarRack", "shelf", "basin"],
    ]

    it("gives a fork whose activity has a centre kind that kind, every time", () => {
      for (const props of orders)
        expect(dressed({ junctionPools: pools(props), propFootprint: basinInTheMiddle })("0,4").decoration).toBe(
          "basin"
        )
    })

    it("gives a pass-through chamber a centre kind too", () => {
      for (const props of orders)
        expect(
          dressed({ passThrough: true, pools: pools(props), propFootprint: basinInTheMiddle })("0,2").decoration
        ).toBe("basin")
    })

    it("keeps a centre kind off a stairhead, which has no middle to stand in", () => {
      for (const props of orders) {
        const room = dressed({ stairPools: pools(props), propFootprint: basinInTheMiddle })("0,6")
        expect(room.decoration).toBeDefined()
        expect(room.decoration).not.toBe("basin")
      }
    })

    it("names the single-cell kind a centre object falls back to", () => {
      const room = dressed({ junctionPools: pools(["basin", "jarRack", "shelf"]), propFootprint: basinInTheMiddle })(
        "0,4"
      )
      expect(room.decorationFallback).toBeDefined()
      expect(isSingleCell(basinInTheMiddle(room.decorationFallback!))).toBe(true)
    })

    it("dresses as before when no kind is flagged centre", () => {
      const setups: Setup[] = [{}, { junctionPools: pools(orders[0]) }, { passThrough: true }]
      for (const setup of setups) {
        const before = dressed(setup)
        const after = dressed({ ...setup, propFootprint: decorationFootprint })
        for (const node of nodes) expect(after(node)).toEqual(before(node))
      }
    })
  })

  it("dresses a junction from one activity its pool furnishes", () => {
    const room = dressed()("0,4")
    expect(room.activity).toBeDefined()
    expect(activitiesFor(TRADE.props ?? []).map(activity => activity.id)).toContain(room.activity)
    expect(activityOf(room.activity!)?.props).toContain(room.decoration)
  })

  it("leaves a puzzle room standing in the corridor bare, a dead-end one too", () => {
    const at = dressed()
    for (const pk of ["0,2", "4,2"]) {
      expect(at(pk)).not.toHaveProperty("decoration")
      expect(at(pk)).not.toHaveProperty("wallDecoration")
      expect(at(pk)).not.toHaveProperty("activity")
    }
  })

  it("hangs only the activity's own wall item, or nothing", () => {
    const at = dressed()
    for (const pk of ["0,4", "0,6"]) {
      const room = at(pk)
      if (room.wallDecoration === undefined) continue
      expect(activityOf(room.activity!)?.wall).toContain(room.wallDecoration)
    }
  })

  it("gives a treasure room, a switch junction and a gate no prop and no activity", () => {
    const at = dressed({ switchAtJunction: true })
    for (const pk of ["2,4", "0,4", "2,2"]) {
      expect(at(pk)).not.toHaveProperty("decoration")
      expect(at(pk)).not.toHaveProperty("wallDecoration")
      expect(at(pk)).not.toHaveProperty("activity")
    }
  })

  it("dresses the stairhead, never the entrance", () => {
    const at = dressed()
    expect(at("0,0")).not.toHaveProperty("decoration")
    expect(at("0,0")).not.toHaveProperty("activity")
    expect(at("0,6").activity).toBeDefined()
  })

  it("never stands a pit in a stairhead", () => {
    expect(dressed({ stairPools: { props: ["pit"] } })("0,6")).not.toHaveProperty("decoration")
  })

  it("dresses a room from its own section's pool's activities", () => {
    const room = dressed({ stairPools: { props: ["basketStack", "bales"], wall: [] } })("0,6")
    expect(room.activity).toBe("packing")
    expect(["basketStack", "bales"]).toContain(room.decoration)
    expect(room).not.toHaveProperty("wallDecoration")
  })

  it("dresses a room whose pool furnishes no activity from the whole pool, with no activity", () => {
    const room = dressed({ pools: { props: ["statue", "rubblePile"], wall: ["stela", "sconce"] } })("0,4")
    expect(["statue", "rubblePile"]).toContain(room.decoration)
    expect(room).not.toHaveProperty("activity")
  })

  it("gives a funerary wing whose pool holds selling's props no activity", () => {
    const room = dressed({
      junctionPools: { props: ["offeringTable", "hanging"], wall: ["stela"], role: "funerary" },
    })("0,4")
    expect(room).not.toHaveProperty("activity")
    expect(["offeringTable", "hanging"]).toContain(room.decoration)
  })

  it("gives a trade wing an activity of trade's", () => {
    const room = dressed({
      junctionPools: { props: ["offeringTable", "hanging", "jarRack"], wall: ["niche"], role: ["trade"] },
    })("0,4")
    expect(["selling", "storage"]).toContain(room.activity)
  })

  it("narrows by role only to an activity that serves it", () => {
    const room = dressed({
      junctionPools: { props: ["counter", "jarRack"], wall: ["niche"], role: "agriculture" },
    })("0,4")
    expect(room.activity).toBe("storage")
  })

  it("lets a role no place furnishes leave the pool's activities whole", () => {
    const room = dressed({ junctionPools: { props: ["basketStack"], wall: [], role: "puzzle" } })("0,4")
    expect(room.activity).toBe("packing")
  })

  it("gives the god the junction on a dedicated floor, ahead of any activity", () => {
    const pools: DressingPools = { props: ["statue", "shelf", "rubblePile"], wall: ["stela", "niche"] }
    const junction = dressed({ pools, patron: "anubis" })("0,4")
    expect(junction).toMatchObject({ decoration: "statue", wallDecoration: "stela", patronRoom: true })
    expect(junction).not.toHaveProperty("activity")
  })

  it("lets a switch keep its junction from the god, who takes the next room that can hold him", () => {
    const pools: DressingPools = { props: ["statue", "shelf", "rubblePile"], wall: ["stela", "niche"] }
    const at = dressed({ pools, patron: "anubis", switchAtJunction: true })
    expect(at("0,4")).not.toHaveProperty("decoration")
    expect(at("0,4")).not.toHaveProperty("patronRoom")
    expect(at("2,4")).toMatchObject({ decoration: "statue", patronRoom: true })
  })

  it("dresses a room from its authored activity, whatever the hash would pick", () => {
    const hashed = dressed()("0,4").activity
    const other = hashed === "ledger" ? "storage" : "ledger"
    const room = dressed({ authored: { "0,4": other } })("0,4")
    expect(room.activity).toBe(other)
    expect(activityOf(other)?.props).toContain(room.decoration)
    expect(TRADE.props).toContain(room.decoration)
  })

  it("dresses a story room standing in the corridor, which the authored activity makes a chamber", () => {
    const room = dressed({ authored: { "0,2": "ledger" } })("0,2")
    expect(room).toMatchObject({ activity: "ledger", decoration: "shelf" })
  })

  it("dresses from the authored activity's own props where the pool holds none of them", () => {
    const room = dressed({ pools: { props: ["basketStack"], wall: [] }, authored: { "0,2": "ledger" } })("0,2")
    expect(room.activity).toBe("ledger")
    expect(["scribeDesk", "shelf"]).toContain(room.decoration)
  })

  it("lets an authored activity take a mechanism's room", () => {
    const room = dressed({ switchAtJunction: true, authored: { "0,4": "ledger" } })("0,4")
    expect(room).toMatchObject({ activity: "ledger", decoration: "shelf" })
  })

  it("keeps the god off a room with an authored activity", () => {
    const pools: DressingPools = { props: ["statue", "shelf", "rubblePile"], wall: ["stela", "niche"] }
    const junction = dressed({ pools, patron: "anubis", authored: { "0,4": "ledger" } })("0,4")
    expect(junction).toMatchObject({ activity: "ledger", decoration: "shelf" })
    expect(junction).not.toHaveProperty("patronRoom")
  })

  it("keeps the god off a room a designed room is pinned to", () => {
    const pools: DressingPools = { props: ["statue", "shelf", "rubblePile"], wall: ["stela", "niche"] }
    const at = dressed({ pools, patron: "anubis", pinned: { "0,4": "hall" } })
    expect(at("0,4")).not.toHaveProperty("patronRoom")
    expect(at("2,4")).toMatchObject({ decoration: "statue", patronRoom: true })
  })

  it("dresses the same site the same way every time", () => {
    const first = dressed()
    const second = dressed()
    for (const pk of nodes) expect(first(pk)).toEqual(second(pk))
  })

  describe("a prop wider than one cell", () => {
    const wide = DECORATION_KINDS.filter(kind => !isSingleCell(decorationFootprint(kind)))
    const dressedRooms = (props: DressingPools["props"]) => {
      const at = dressed({ pools: { props, wall: [] } })
      return ["0,4", "0,6"].map(at).filter(room => room.decoration !== undefined)
    }

    it.skipIf(wide.length === 0)("carries a single-cell fallback from the same pool", () => {
      const rooms = dressedRooms([...wide, ...wide, ...wide, ...wide, "rubblePile"])
      expect(rooms.some(room => wide.includes(room.decoration!))).toBe(true)
      for (const room of rooms)
        if (wide.includes(room.decoration!)) expect(room.decorationFallback).toBe("rubblePile")
        else expect(room).not.toHaveProperty("decorationFallback")
    })

    it.skipIf(wide.length === 0)("carries no fallback when the pool has no single-cell kind", () => {
      const rooms = dressedRooms([...wide])
      expect(rooms.length).toBeGreaterThan(0)
      for (const room of rooms) expect(room).not.toHaveProperty("decorationFallback")
    })

    it("carries no fallback for a single-cell prop", () => {
      for (const room of dressedRooms(["rubblePile", "pillar"])) expect(room).not.toHaveProperty("decorationFallback")
    })
  })
})
