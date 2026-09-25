import { beforeAll, describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { classifyForkShape, type ForkShape } from "@/game/forkShape"
import { assembleFloor, defaultResolveEncounter, type ResolveEncounter } from "@/game/siteAssembler"
import type { Direction as WayOut, FloorConfig, RoomCell } from "@/game/siteTypes"
import { BACKSLASH, SLASH, type CellRef, type MirrorAngle } from "@/mods/core/game/beam/physics"
import { routesTo, traceBeam, type MirrorPlacement } from "../shrineBeam/shrineBeam"
import { CANONICAL_WAYS_OUT, generateLightbeamSwitch, type LightbeamSwitchBoard } from "./generateLightbeamSwitch"
import { quarterTurnsToFace, QUARTER_TURNS, rotateBoard, type QuarterTurns } from "./rotateBoard"

const SHAPES: ForkShape[] = ["adjacent", "opposite", "three"]
const TIERS: Difficulty[] = ["junior", "expert", "master", "wizard"]
const SEEDS = [1, 2]
const BOARDS_PER_SWEEP = SHAPES.length * TIERS.length * SEEDS.length
// One shrine per way out, and every board is looked at from all four turns.
const SHRINES_PER_SWEEP =
  SHAPES.reduce((total, shape) => total + CANONICAL_WAYS_OUT[shape].length, 0) * TIERS.length * SEEDS.length
const TURNED_SHRINES_PER_SWEEP = SHRINES_PER_SWEEP * QUARTER_TURNS.length
// The layouts a real carve makes, which the sweep below is asserted against rather than trusted to find.
const CARVED_LAYOUTS = ["en", "ens", "enw", "es", "ew", "ns", "nsw", "nw", "sw"]

const boards = new Map<string, LightbeamSwitchBoard>()
const key = (shape: ForkShape, difficulty: Difficulty, seed: number, quarterTurns: QuarterTurns | "none") =>
  `${shape}:${difficulty}:${seed}:${quarterTurns}`
const boardFor = (
  shape: ForkShape,
  difficulty: Difficulty,
  seed: number,
  quarterTurns: QuarterTurns | "none" = "none"
): LightbeamSwitchBoard => {
  const built = boards.get(key(shape, difficulty, seed, quarterTurns))
  if (!built) throw new Error(`no board was built for ${key(shape, difficulty, seed, quarterTurns)}`)
  return built
}

// A switch needs a family that offers the walk back, and this spec assembles without the registry.
const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const switchFloor: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
    { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
  ],
  forks: [{ exits: 2, count: 1 }],
  switches: { encounter: "sumplete", min: 1, max: 1 },
}

// The layouts REAL CARVES produce, keyed by their ways out in compass order. A hand-written set could name
// a fork the assembler cannot build, and a layout it does build could go untested.
const carved = new Map<string, WayOut[]>()

const layoutKey = (ways: readonly WayOut[]): string => [...new Set(ways)].sort().join("")

const carvedWays = (layout: string): WayOut[] => {
  const ways = carved.get(layout)
  if (!ways) throw new Error(`no carved switch fork closed exactly the ways out "${layout}"`)
  return ways
}

const shapeOf = (ways: readonly WayOut[]): ForkShape => {
  const shape = classifyForkShape(ways)
  if (!shape) throw new Error(`the carved layout "${layoutKey(ways)}" has no shape to build a board for`)
  return shape
}

const TURNED_WAY: Record<WayOut, WayOut> = { n: "w", w: "s", s: "e", e: "n" }
const turnedWay = (way: WayOut, quarterTurns: QuarterTurns): WayOut => {
  let turned = way
  for (let turn = 0; turn < quarterTurns; turn++) turned = TURNED_WAY[turned]
  return turned
}

/** The edge of a board a way out points at, read off the compass and nothing else. */
const standsOnEdge = (size: number, at: CellRef, way: WayOut): boolean =>
  way === "n" ? at.row === 0 : way === "s" ? at.row === size - 1 : way === "e" ? at.col === size - 1 : at.col === 0

// A quarter turn anticlockwise over rows that run downward carries the top edge onto the left edge, so a
// cell's row becomes its column. Written here from the geometry, so the spec does not read its expectation
// back out of the code it checks.
const expectedCell = (size: number, at: CellRef, quarterTurns: QuarterTurns): CellRef => {
  let cell = at
  for (let turn = 0; turn < quarterTurns; turn++) cell = { row: size - 1 - cell.col, col: cell.row }
  return cell
}

/** `/` and `\` lie a quarter turn apart, so an odd turn swaps them and an even one leaves them standing. */
const expectedAngle = (angle: MirrorAngle, quarterTurns: QuarterTurns): MirrorAngle =>
  quarterTurns % 2 === 0 ? angle : angle === SLASH ? BACKSLASH : SLASH

const cells = (board: LightbeamSwitchBoard) => board.shrines.map(shrine => shrine.at)

// Searching every setting of a wizard board for the routes to a shrine is the expensive question this file
// asks, so it is asked once per board and read back here.
const routes = new Map<LightbeamSwitchBoard, MirrorPlacement[][][]>()
const routesOf = (board: LightbeamSwitchBoard): MirrorPlacement[][][] => {
  const found = routes.get(board)
  if (!found) throw new Error("the routes over this board were never searched for")
  return found
}

const onlyRoute = (board: LightbeamSwitchBoard, shrine: number): MirrorPlacement[] => {
  const found = routesOf(board)[shrine]
  expect(found).toHaveLength(1)
  return found[0]
}

/** The canonical route carried onto the turned board, as the angles its mirrors stand at there. */
const carryRoute = (
  board: LightbeamSwitchBoard,
  turnedBoard: LightbeamSwitchBoard,
  route: readonly MirrorPlacement[],
  quarterTurns: QuarterTurns
): MirrorAngle[] => {
  const angles = [...turnedBoard.grid.initial]
  for (const mirror of route) {
    const at = expectedCell(board.grid.size, mirror.at, quarterTurns)
    const index = turnedBoard.grid.mirrors.findIndex(cell => cell.row === at.row && cell.col === at.col)
    if (index === -1) throw new Error(`the turned board holds no mirror where ${at.row},${at.col} was turned to`)
    angles[index] = expectedAngle(mirror.angle, quarterTurns)
  }
  return angles
}

// Building the sweep's boards, turning each of them four ways, searching every one for its routes, and
// carving the forks is the whole cost of this file. It all happens once here under one budget, rather than
// falling on whichever test runs first.
beforeAll(() => {
  for (const shape of SHAPES)
    for (const difficulty of TIERS)
      for (const seed of SEEDS) {
        const board = generateLightbeamSwitch(seed, difficulty, shape)
        boards.set(key(shape, difficulty, seed, "none"), board)
        for (const quarterTurns of QUARTER_TURNS)
          boards.set(key(shape, difficulty, seed, quarterTurns), rotateBoard(board, quarterTurns))
      }
  for (const board of boards.values())
    routes.set(
      board,
      board.shrines.map((_, shrine) => routesTo(board.grid, cells(board), shrine))
    )
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(`rotate-board-${seed}`, switchFloor, seed, reEnterableFamilies)
    if (!result.success) continue
    const forks = result.grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && c.roomType === "fork")
    for (const fork of forks) {
      const gated = (fork.exits ?? []).filter(exit => exit.gateKeyId !== undefined).map(exit => exit.dir)
      if (gated.length < 2) continue
      carved.set(layoutKey(gated), gated)
    }
  }
}, 180_000)

const eachBoard = (visit: (board: LightbeamSwitchBoard, shape: ForkShape) => void): number => {
  let seen = 0
  for (const shape of SHAPES)
    for (const difficulty of TIERS)
      for (const seed of SEEDS) {
        visit(boardFor(shape, difficulty, seed), shape)
        seen++
      }
  return seen
}

const eachTurn = (
  visit: (board: LightbeamSwitchBoard, turnedBoard: LightbeamSwitchBoard, quarterTurns: QuarterTurns) => void
): number => {
  let seen = 0
  for (const shape of SHAPES)
    for (const difficulty of TIERS)
      for (const seed of SEEDS)
        for (const quarterTurns of QUARTER_TURNS) {
          visit(boardFor(shape, difficulty, seed), boardFor(shape, difficulty, seed, quarterTurns), quarterTurns)
          seen++
        }
  return seen
}

describe("the carved fork layouts this file turns boards onto", () => {
  it("holds every layout the assembler makes and no layout it cannot", () => {
    expect([...carved.keys()].sort()).toEqual(CARVED_LAYOUTS)
  })
})

describe("rotateBoard", () => {
  it("leaves a board exactly as it stands when asked for no turn", () => {
    const seen = eachBoard(board => expect(rotateBoard(board, 0)).toEqual(board))
    expect(seen).toBe(BOARDS_PER_SWEEP)
  })

  it("comes back to the board it started from after four quarter turns", () => {
    const seen = eachBoard(board => {
      let turnedBoard = board
      for (let turn = 0; turn < 4; turn++) turnedBoard = rotateBoard(turnedBoard, 1)
      expect(turnedBoard).toEqual(board)
    })
    expect(seen).toBe(BOARDS_PER_SWEEP)
  })

  it("undoes one quarter turn with the other three", () => {
    const seen = eachBoard(board => expect(rotateBoard(rotateBoard(board, 1), 3)).toEqual(board))
    expect(seen).toBe(BOARDS_PER_SWEEP)
  })

  it("turns every board one quarter further than the turn before it", () => {
    const seen = eachTurn((board, turnedBoard, quarterTurns) =>
      expect(turnedBoard).toEqual(
        quarterTurns === 0 ? board : rotateBoard(rotateBoard(board, 1), (quarterTurns - 1) as QuarterTurns)
      )
    )
    expect(seen).toBe(BOARDS_PER_SWEEP * QUARTER_TURNS.length)
  })

  it("lights the same shrine with the canonical route carried onto the turned board", () => {
    let traced = 0
    const seen = eachTurn((board, turnedBoard, quarterTurns) => {
      board.shrines.forEach((_, shrine) => {
        const angles = carryRoute(board, turnedBoard, onlyRoute(board, shrine), quarterTurns)
        expect(traceBeam(turnedBoard.grid, cells(turnedBoard), angles).shrine).toBe(shrine)
        traced++
      })
    })
    expect(seen).toBe(BOARDS_PER_SWEEP * QUARTER_TURNS.length)
    expect(traced).toBe(TURNED_SHRINES_PER_SWEEP)
  })

  it("owes each shrine one route still, of the same length as before the turn", () => {
    let checked = 0
    const seen = eachTurn((board, turnedBoard) => {
      board.shrines.forEach((_, shrine) => {
        expect(onlyRoute(turnedBoard, shrine)).toHaveLength(onlyRoute(board, shrine).length)
        checked++
      })
    })
    expect(seen).toBe(BOARDS_PER_SWEEP * QUARTER_TURNS.length)
    expect(checked).toBe(TURNED_SHRINES_PER_SWEEP)
  })

  it("opens dark after the turn, as it opened dark before it", () => {
    const seen = eachTurn((_board, turnedBoard) =>
      expect(traceBeam(turnedBoard.grid, cells(turnedBoard), turnedBoard.grid.initial).shrine).toBeUndefined()
    )
    expect(seen).toBe(BOARDS_PER_SWEEP * QUARTER_TURNS.length)
  })

  it("keeps every mirror at one of the two angles a player can turn it to", () => {
    let seenMirrors = 0
    const seen = eachTurn((board, turnedBoard) => {
      expect(turnedBoard.grid.initial).toHaveLength(board.grid.initial.length)
      for (const angle of turnedBoard.grid.initial) {
        expect([SLASH, BACKSLASH]).toContain(angle)
        seenMirrors++
      }
    })
    expect(seen).toBe(BOARDS_PER_SWEEP * QUARTER_TURNS.length)
    expect(seenMirrors).toBeGreaterThan(BOARDS_PER_SWEEP * QUARTER_TURNS.length)
  })

  it("turns each mirror's opening angle with the cell it stands on", () => {
    let paired = 0
    const seen = eachTurn((board, turnedBoard, quarterTurns) => {
      board.grid.mirrors.forEach((at, index) => {
        const turnedAt = expectedCell(board.grid.size, at, quarterTurns)
        const found = turnedBoard.grid.mirrors.findIndex(cell => cell.row === turnedAt.row && cell.col === turnedAt.col)
        if (found === -1) throw new Error(`the turned board holds no mirror where ${at.row},${at.col} was turned to`)
        expect(turnedBoard.grid.initial[found]).toBe(expectedAngle(board.grid.initial[index], quarterTurns))
        paired++
      })
    })
    expect(seen).toBe(BOARDS_PER_SWEEP * QUARTER_TURNS.length)
    expect(paired).toBeGreaterThan(BOARDS_PER_SWEEP * QUARTER_TURNS.length)
  })

  it("holds its mirrors in reading order after the turn", () => {
    const seen = eachTurn((_board, turnedBoard) => {
      const { mirrors } = turnedBoard.grid
      expect(mirrors).toEqual([...mirrors].sort((a, b) => a.row - b.row || a.col - b.col))
    })
    expect(seen).toBe(BOARDS_PER_SWEEP * QUARTER_TURNS.length)
  })

  it("stands every shrine on the edge its turned bearing points at", () => {
    let stood = 0
    const seen = eachTurn((_board, turnedBoard) => {
      for (const shrine of turnedBoard.shrines) {
        expect(standsOnEdge(turnedBoard.grid.size, shrine.at, shrine.canonicalDir)).toBe(true)
        stood++
      }
    })
    expect(seen).toBe(BOARDS_PER_SWEEP * QUARTER_TURNS.length)
    expect(stood).toBe(TURNED_SHRINES_PER_SWEEP)
  })

  it("turns the bearings a quarter of the compass, keeping the shrines in their own order", () => {
    const board = boardFor("adjacent", "junior", 1)
    expect(board.shrines.map(shrine => shrine.canonicalDir)).toEqual(["n", "e"])
    expect(rotateBoard(board, 1).shrines.map(shrine => shrine.canonicalDir)).toEqual(["w", "n"])
    expect(rotateBoard(board, 2).shrines.map(shrine => shrine.canonicalDir)).toEqual(["s", "w"])
    expect(rotateBoard(board, 3).shrines.map(shrine => shrine.canonicalDir)).toEqual(["e", "s"])
  })
})

describe("quarterTurnsToFace", () => {
  it("finds the turn for every fork layout the assembler carves", () => {
    let solved = 0
    for (const [layout, ways] of carved) {
      const shape = shapeOf(ways)
      const quarterTurns = quarterTurnsToFace(shape, ways)
      if (quarterTurns === undefined) throw new Error(`no turn faces the carved layout "${layout}"`)
      expect(layoutKey(CANONICAL_WAYS_OUT[shape].map(way => turnedWay(way, quarterTurns)))).toBe(layout)
      solved++
    }
    expect(solved).toBe(CARVED_LAYOUTS.length)
  })

  it("lands a real board's shrines on the ways out the carve gated, at every tier", () => {
    let faced = 0
    for (const [layout, ways] of carved) {
      const shape = shapeOf(ways)
      const quarterTurns = quarterTurnsToFace(shape, ways)
      if (quarterTurns === undefined) throw new Error(`no turn faces the carved layout "${layout}"`)
      for (const difficulty of TIERS) {
        const turnedBoard = boardFor(shape, difficulty, 1, quarterTurns)
        expect(layoutKey(turnedBoard.shrines.map(shrine => shrine.canonicalDir))).toBe(layout)
        for (const shrine of turnedBoard.shrines)
          expect(standsOnEdge(turnedBoard.grid.size, shrine.at, shrine.canonicalDir)).toBe(true)
        faced++
      }
    }
    expect(faced).toBe(CARVED_LAYOUTS.length * TIERS.length)
  })

  it("takes the lowest turn where two of them face the same layout", () => {
    // A facing pair comes back onto itself after two turns, so both halves of the compass fit it, and the
    // fork would otherwise draw its board turned differently between two visits.
    expect(layoutKey(CANONICAL_WAYS_OUT.opposite.map(way => turnedWay(way, 2)))).toBe("ns")
    expect(quarterTurnsToFace("opposite", carvedWays("ns"))).toBe(0)
    expect(layoutKey(CANONICAL_WAYS_OUT.opposite.map(way => turnedWay(way, 3)))).toBe("ew")
    expect(quarterTurnsToFace("opposite", carvedWays("ew"))).toBe(1)
  })

  it("answers the same turn whichever order a layout's ways out arrive in", () => {
    let compared = 0
    for (const [, ways] of carved) {
      expect(quarterTurnsToFace(shapeOf(ways), [...ways].reverse())).toBe(quarterTurnsToFace(shapeOf(ways), ways))
      compared++
    }
    expect(compared).toBe(CARVED_LAYOUTS.length)
  })

  it("names no turn where the board was built for another shape", () => {
    expect(quarterTurnsToFace("adjacent", carvedWays("ns"))).toBeUndefined()
    expect(quarterTurnsToFace("opposite", carvedWays("en"))).toBeUndefined()
    expect(quarterTurnsToFace("three", carvedWays("en"))).toBeUndefined()
    expect(quarterTurnsToFace("adjacent", carvedWays("ens"))).toBeUndefined()
  })
})
