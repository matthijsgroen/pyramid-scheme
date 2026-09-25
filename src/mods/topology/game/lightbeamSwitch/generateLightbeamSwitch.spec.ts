import { beforeAll, describe, expect, it } from "vitest"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import type { ForkShape } from "@/game/forkShape"
import { BACKSLASH, SLASH, type MirrorAngle } from "@/mods/core/game/beam/physics"
import { honestOpenings, routesTo, traceBeam, type MirrorPlacement } from "../shrineBeam/shrineBeam"
import {
  CANONICAL_WAYS_OUT,
  generateLightbeamSwitch,
  type LightbeamSwitchBoard,
  type LightbeamSwitchGate,
} from "./generateLightbeamSwitch"

const SHAPES: ForkShape[] = ["adjacent", "opposite", "three"]
// The tiers a switch fork is authored at. Starter floors carry no switch, so no board is built for one.
const TIERS: Difficulty[] = ["junior", "expert", "master", "wizard"]
const SEEDS = [1, 2, 3, 4, 5, 6]

// One shrine per way out, so a sweep over every shape covers seven of them per (tier, seed).
const SHRINES_PER_SWEEP = SHAPES.reduce((total, shape) => total + CANONICAL_WAYS_OUT[shape].length, 0)
const BOARDS_PER_SWEEP = SHAPES.length * TIERS.length * SEEDS.length

const rejections: LightbeamSwitchGate[] = []
const cache = new Map<string, LightbeamSwitchBoard>()
const boardFor = (shape: ForkShape, difficulty: Difficulty, seed: number): LightbeamSwitchBoard => {
  const key = `${shape}:${difficulty}:${seed}`
  const known = cache.get(key)
  if (known) return known
  const built = generateLightbeamSwitch(seed, difficulty, shape, gate => rejections.push(gate))
  cache.set(key, built)
  return built
}

const cells = (board: LightbeamSwitchBoard) => board.shrines.map(shrine => shrine.at)

const oppositeWay = (way: string): string => ({ n: "s", s: "n", e: "w", w: "e" })[way] ?? way

// Every route the real search finds, kept per board: the sweep asks for them from several angles and a
// search over every setting of a wizard board is not cheap enough to repeat.
const routeCache = new Map<LightbeamSwitchBoard, MirrorPlacement[][][]>()
const routesOf = (board: LightbeamSwitchBoard): MirrorPlacement[][][] => {
  const known = routeCache.get(board)
  if (known) return known
  const found = board.shrines.map((_, index) => routesTo(board.grid, cells(board), index))
  routeCache.set(board, found)
  return found
}

const settingOf = (angles: readonly MirrorAngle[]): number =>
  angles.reduce((n, angle, index) => n + (angle === SLASH ? 0 : 1 << index), 0)

const turned = (angle: MirrorAngle): MirrorAngle => (angle === SLASH ? BACKSLASH : SLASH)

// Building the sweep's boards and searching each one's routes is the whole cost of this file — a
// three-way master board takes about 220ms to build and a route search sweeps every setting of it.
// Both are done once here so every test below reads a cache, and the budget for them sits in one
// place instead of falling on whichever test happens to ask first.
beforeAll(() => {
  for (const shape of SHAPES)
    for (const difficulty of TIERS)
      for (const seed of SEEDS) routesOf(boardFor(shape, difficulty, seed))
}, 120_000)

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

describe("CANONICAL_WAYS_OUT", () => {
  it("names one way out per door the shape closes", () => {
    expect(CANONICAL_WAYS_OUT.adjacent).toEqual(["n", "e"])
    expect(CANONICAL_WAYS_OUT.opposite).toEqual(["n", "s"])
    expect(CANONICAL_WAYS_OUT.three).toEqual(["n", "e", "s"])
  })

  it("makes each shape's ways out distinct and of its own layout", () => {
    for (const shape of SHAPES) expect(new Set(CANONICAL_WAYS_OUT[shape]).size).toBe(CANONICAL_WAYS_OUT[shape].length)
    expect(CANONICAL_WAYS_OUT.adjacent[0]).not.toBe(oppositeWay(CANONICAL_WAYS_OUT.adjacent[1]))
    expect(CANONICAL_WAYS_OUT.opposite[0]).toBe(oppositeWay(CANONICAL_WAYS_OUT.opposite[1]))
  })
})

describe("generateLightbeamSwitch", () => {
  it("carries one shrine per way out of its shape, in the shape's own order", () => {
    const seen = eachBoard((board, shape) =>
      expect(board.shrines.map(shrine => shrine.canonicalDir)).toEqual([...CANONICAL_WAYS_OUT[shape]])
    )
    expect(seen).toBe(BOARDS_PER_SWEEP)
  })

  it("gives every way out exactly one route, at every shape and tier", () => {
    let checked = 0
    const seen = eachBoard(board => {
      board.shrines.forEach((_, index) => {
        expect(routesOf(board)[index]).toHaveLength(1)
        checked++
      })
    })
    expect(seen).toBe(BOARDS_PER_SWEEP)
    expect(checked).toBe(SHRINES_PER_SWEEP * TIERS.length * SEEDS.length)
  })

  it("routes no two ways out the same way", () => {
    const seen = eachBoard(board => {
      const routes = routesOf(board).map(route => JSON.stringify(route[0]))
      expect(new Set(routes).size).toBe(routes.length)
    })
    expect(seen).toBe(BOARDS_PER_SWEEP)
  })

  it("opens in a setting that cannot be fiddled into a shrine", () => {
    const seen = eachBoard(board =>
      expect(honestOpenings(board.grid, cells(board))).toContain(settingOf(board.grid.initial))
    )
    expect(seen).toBe(BOARDS_PER_SWEEP)
  })

  it("opens dark, and never one turn or one turn of everything away from a shrine", () => {
    const seen = eachBoard(board => {
      const { grid } = board
      expect(traceBeam(grid, cells(board), grid.initial).shrine).toBeUndefined()
      expect(traceBeam(grid, cells(board), grid.initial.map(turned)).shrine).toBeUndefined()
      grid.initial.forEach((angle, index) => {
        const one = [...grid.initial]
        one[index] = turned(angle)
        expect(traceBeam(grid, cells(board), one).shrine).toBeUndefined()
      })
    })
    expect(seen).toBe(BOARDS_PER_SWEEP)
  })

  it("lights a way out's shrine when its route is laid over the opening", () => {
    let lit = 0
    const seen = eachBoard(board => {
      board.shrines.forEach((_, index) => {
        const angles = [...board.grid.initial]
        for (const mirror of routesOf(board)[index][0])
          angles[board.grid.mirrors.findIndex(at => at.row === mirror.at.row && at.col === mirror.at.col)] =
            mirror.angle
        expect(traceBeam(board.grid, cells(board), angles).shrine).toBe(index)
        lit++
      })
    })
    expect(seen).toBe(BOARDS_PER_SWEEP)
    expect(lit).toBe(SHRINES_PER_SWEEP * TIERS.length * SEEDS.length)
  })

  it("stands each shrine on the edge its way out points at", () => {
    const seen = eachBoard(board => {
      for (const shrine of board.shrines) {
        if (shrine.canonicalDir === "n") expect(shrine.at.row).toBe(0)
        if (shrine.canonicalDir === "s") expect(shrine.at.row).toBe(board.grid.size - 1)
        if (shrine.canonicalDir === "e") expect(shrine.at.col).toBe(board.grid.size - 1)
        if (shrine.canonicalDir === "w") expect(shrine.at.col).toBe(0)
      }
    })
    expect(seen).toBe(BOARDS_PER_SWEEP)
  })

  it("places every mirror a route turns at on the board", () => {
    const seen = eachBoard(board => {
      const placed = board.grid.mirrors.map(at => `${at.row},${at.col}`)
      board.shrines.forEach((_, index) => {
        for (const mirror of routesOf(board)[index][0]) expect(placed).toContain(`${mirror.at.row},${mirror.at.col}`)
      })
    })
    expect(seen).toBe(BOARDS_PER_SWEEP)
  })

  it("is deterministic for a seed, shape and tier", () => {
    let compared = 0
    for (const shape of SHAPES)
      for (const difficulty of TIERS) {
        expect(generateLightbeamSwitch(3, difficulty, shape)).toEqual(generateLightbeamSwitch(3, difficulty, shape))
        compared++
      }
    expect(compared).toBe(SHAPES.length * TIERS.length)
  })

  it("builds a board at every tier the world defines, so no tier can throw", () => {
    let built = 0
    for (const shape of SHAPES)
      for (const difficulty of difficulties) {
        expect(generateLightbeamSwitch(11, difficulty, shape).shrines).toHaveLength(CANONICAL_WAYS_OUT[shape].length)
        built++
      }
    expect(built).toBe(SHAPES.length * difficulties.length)
  })

  it("finds every board of the sweep well inside its attempt budget", () => {
    const seen = eachBoard(() => {})
    expect(seen).toBe(BOARDS_PER_SWEEP)
    // A draft is thrown away per rejected attempt, so this counts the wasted attempts over the sweep.
    expect(rejections.length).toBeLessThan(BOARDS_PER_SWEEP * 120)
  })
})
