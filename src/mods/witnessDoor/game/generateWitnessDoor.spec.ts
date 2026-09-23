import { describe, it, expect } from "vitest"
import {
  generateWitnessDoor,
  solutionsFor,
  traceWitnessBeam,
  type WitnessBoard,
  type WitnessGate,
} from "./generateWitnessDoor"
import { BACKSLASH, DIR, SLASH } from "@/mods/core/game/beam/physics"
import { witnessKeyId, witnessSite, WITNESS_SHRINES } from "./witnessKeys"
import { difficulties } from "@/data/difficultyLevels"

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const turned = (angle: number): number => (angle === SLASH ? BACKSLASH : SLASH)

describe("witnessKeyId", () => {
  it("names a key per site and shrine", () => {
    expect(witnessKeyId("junior_2#3#2", "east")).toBe("witness:junior_2#3#2:east")
    expect(witnessKeyId("junior_2#3#2", "north")).toBe("witness:junior_2#3#2:north")
  })

  // A journey authors one site per level, so the journey alone does not name a pyramid: two of them can
  // hold a door at the same floor index, and a shared id would open the second one's fork before its board
  // was touched.
  it("names a door by journey, level and floor, so two pyramids of one journey never share one", () => {
    expect(witnessSite("junior_2", 3, 2)).toBe("junior_2#3#2")
    expect(witnessSite("junior_2", 4, 2)).not.toBe(witnessSite("junior_2", 3, 2))
  })
})

describe("generateWitnessDoor", () => {
  it("is deterministic for a seed", () => {
    expect(generateWitnessDoor(99, "junior")).toEqual(generateWitnessDoor(99, "junior"))
  })

  it("gives each shrine exactly one solution", () => {
    for (const seed of SEEDS) {
      const board = generateWitnessDoor(seed, "junior")
      expect(solutionsFor(board, "east")).toHaveLength(1)
      expect(solutionsFor(board, "north")).toHaveLength(1)
    }
  })

  it("makes the two solutions different from each other", () => {
    for (const seed of SEEDS) {
      const board = generateWitnessDoor(seed, "junior")
      expect(solutionsFor(board, "east")[0]).not.toEqual(solutionsFor(board, "north")[0])
    }
  })

  it("gives each shrine exactly one solution at every tier", () => {
    for (const difficulty of difficulties)
      for (const seed of SEEDS) {
        const board = generateWitnessDoor(seed, difficulty)
        for (const shrine of WITNESS_SHRINES) expect(solutionsFor(board, shrine)).toHaveLength(1)
      }
  })

  it("stands each shrine on the edge its name points at", () => {
    for (const seed of SEEDS) {
      const board = generateWitnessDoor(seed, "junior")
      expect(board.shrines.east.col).toBe(board.grid.size - 1)
      expect(board.shrines.north.row).toBe(0)
    }
  })

  it("turns both solutions at the same first mirror", () => {
    for (const seed of SEEDS) {
      const board = generateWitnessDoor(seed, "junior")
      const [east] = solutionsFor(board, "east")
      const [north] = solutionsFor(board, "north")
      expect(east[0].at).toEqual(north[0].at)
      expect(east[0].angle).not.toBe(north[0].angle)
    }
  })

  it("places every mirror a solution turns at on the board", () => {
    for (const seed of SEEDS) {
      const board = generateWitnessDoor(seed, "junior")
      const cells = board.grid.mirrors.map(at => `${at.row},${at.col}`)
      for (const shrine of WITNESS_SHRINES)
        for (const mirror of solutionsFor(board, shrine)[0])
          expect(cells).toContain(`${mirror.at.row},${mirror.at.col}`)
    }
  })

  it("opens dark, and never one turn away from a shrine", () => {
    for (const seed of SEEDS) {
      const board = generateWitnessDoor(seed, "junior")
      expect(traceWitnessBeam(board, board.grid.initial).shrine).toBeUndefined()
      board.grid.initial.forEach((angle, index) => {
        const one = [...board.grid.initial]
        one[index] = turned(angle)
        expect(traceWitnessBeam(board, one).shrine).toBeUndefined()
      })
    }
  })

  it("never opens one turn of every mirror away from a shrine", () => {
    for (const seed of SEEDS) {
      const board = generateWitnessDoor(seed, "junior")
      expect(traceWitnessBeam(board, board.grid.initial.map(turned)).shrine).toBeUndefined()
    }
  })

  it("lights the shrine when its solution is laid over the opening", () => {
    for (const seed of SEEDS) {
      const board = generateWitnessDoor(seed, "junior")
      for (const shrine of WITNESS_SHRINES) {
        const angles = [...board.grid.initial]
        for (const mirror of solutionsFor(board, shrine)[0])
          angles[board.grid.mirrors.findIndex(at => at.row === mirror.at.row && at.col === mirror.at.col)] =
            mirror.angle
        expect(traceWitnessBeam(board, angles).shrine).toBe(shrine)
      }
    }
  })

  it("finds a board without exhausting its attempts", () => {
    const rejected: WitnessGate[] = []
    for (const seed of SEEDS) generateWitnessDoor(seed, "junior", gate => rejected.push(gate))
    // A draft is thrown away per attempt, so this counts the wasted attempts over ten boards.
    expect(rejected.length).toBeLessThan(SEEDS.length * 20)
  })
})

describe("traceWitnessBeam", () => {
  // A 5x5 board: the disc sits on the west edge, one mirror stands in the beam's line, and both shrines
  // are on the corners its two angles send the light to.
  const board: WitnessBoard = {
    grid: {
      size: 5,
      sun: { at: { row: 2, col: 0 }, facing: DIR.right },
      mirrors: [{ row: 2, col: 2 }],
      initial: [SLASH],
    },
    shrines: { east: { row: 4, col: 2 }, north: { row: 0, col: 2 } },
  }

  it("turns the beam at a mirror and lights what it points at", () => {
    expect(traceWitnessBeam(board, [SLASH]).shrine).toBe("north")
    expect(traceWitnessBeam(board, [BACKSLASH]).shrine).toBe("east")
  })

  it("reports the mirrors the winning beam met", () => {
    expect(traceWitnessBeam(board, [SLASH]).met).toEqual([{ at: { row: 2, col: 2 }, angle: SLASH }])
  })

  it("lights nothing when the beam runs off the board", () => {
    const straight: WitnessBoard = { ...board, grid: { ...board.grid, mirrors: [], initial: [] } }
    expect(traceWitnessBeam(straight, []).shrine).toBeUndefined()
  })
})

describe("solutionsFor", () => {
  // The beam reaches the mirror at (2,2) and nothing else: the mirror at (4,4) is out of its way whatever
  // it is turned to.
  const withFreeMirror: WitnessBoard = {
    grid: {
      size: 5,
      sun: { at: { row: 2, col: 0 }, facing: DIR.right },
      mirrors: [
        { row: 2, col: 2 },
        { row: 4, col: 4 },
      ],
      initial: [SLASH, SLASH],
    },
    shrines: { east: { row: 4, col: 2 }, north: { row: 0, col: 2 } },
  }

  it("counts a mirror the beam never reaches as no part of the answer", () => {
    expect(solutionsFor(withFreeMirror, "north")).toEqual([[{ at: { row: 2, col: 2 }, angle: SLASH }]])
  })

  it("returns nothing for a shrine no setting reaches", () => {
    const unreachable: WitnessBoard = {
      ...withFreeMirror,
      shrines: { ...withFreeMirror.shrines, north: { row: 0, col: 4 } },
    }
    expect(solutionsFor(unreachable, "north")).toEqual([])
  })

  it("reports both routes when two settings light one shrine", () => {
    // (2,2) sends the beam up column 2 or down it; both ways can be steered to the same corner.
    const twoWays: WitnessBoard = {
      grid: {
        size: 5,
        sun: { at: { row: 2, col: 0 }, facing: DIR.right },
        mirrors: [
          { row: 0, col: 2 },
          { row: 0, col: 4 },
          { row: 2, col: 2 },
          { row: 4, col: 2 },
        ],
        initial: [SLASH, SLASH, SLASH, SLASH],
      },
      shrines: { east: { row: 4, col: 4 }, north: { row: 0, col: 0 } },
    }
    expect(solutionsFor(twoWays, "east")).toHaveLength(2)
    expect(solutionsFor(twoWays, "north")).toHaveLength(1)
  })
})
