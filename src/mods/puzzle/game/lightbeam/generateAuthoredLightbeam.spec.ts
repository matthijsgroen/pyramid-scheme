import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import {
  allPieceOptions,
  cellKey,
  eachConfig,
  isHalfStep,
  isLit,
  opposite,
  pieceCells,
  reflect,
  sameCell,
  segmentKey,
  traceBeam,
  type Direction,
} from "./beam"
import { generateAuthoredLightbeam } from "./generateAuthoredLightbeam"
import { type LightbeamGate } from "./generateLightbeam"
import { LIGHTBEAM_CONFIG } from "./lightbeamConfig"
import { solveLightbeamByTechniques } from "./techniques"

type Board = ReturnType<typeof generateAuthoredLightbeam>

/** Which direction the winning beam enters each cell travelling, so a branch can be walked from a bend. */
const arrivals = (board: Board): Map<string, Direction> =>
  new Map(traceBeam(board, board.solution).path.map(segment => [cellKey(segment.at), segment.enter]))

describe("generateAuthoredLightbeam", () => {
  it("is deterministic", () => {
    expect(generateAuthoredLightbeam(7, 42, { turns: 3 })).toEqual(generateAuthoredLightbeam(7, 42, { turns: 3 }))
  })

  it("different seeds produce different boards", () => {
    expect(generateAuthoredLightbeam(7, 1, { turns: 3 })).not.toEqual(generateAuthoredLightbeam(7, 2, { turns: 3 }))
  })

  // The same floor the other generator has, and for the same reason: two binary pieces make four
  // configurations, and every dark one of them is either a tap from done or solved by tapping both, which
  // `openingIsHonest` refuses.
  it("refuses a two-piece board, which cannot open honestly", () => {
    expect(() => generateAuthoredLightbeam(7, 1, { turns: 2 })).toThrow(/no logically solvable board/)
  })

  it("records no goals, because the modes that replace them are not built yet", () => {
    expect(generateAuthoredLightbeam(8, 3, { turns: 5 }).goals).toEqual([])
  })
})

describe.each(difficulties)("at %s", difficulty => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
  const boards = Array.from({ length: 10 }, (_, seed) => generateAuthoredLightbeam(size, seed + 1, options))

  it("its answer lights the shrine", () => {
    for (const board of boards) expect(isLit(board, board.solution)).toBe(true)
  })

  /**
   * **Exactly one configuration lights the shrine** — a stronger claim than the shipped `routeIsUnique`,
   * which asks for one winning *path* and allows the many winning configurations a decoy's free setting
   * produces. An authored phase 1 board has no free piece, so the two coincide, and asserting the stronger
   * one is what would catch a branch that stopped dying.
   */
  it("has exactly one winning configuration", () => {
    for (const board of boards) {
      let lit = 0
      eachConfig(allPieceOptions(board), config => {
        if (isLit(board, config)) lit++
      })
      expect(lit).toBe(1)
    }
  })

  it("is reachable by deduction alone, inside its own cap", () => {
    for (const board of boards) expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
  })

  it("opens dark", () => {
    for (const board of boards) expect(isLit(board, board.initial)).toBe(false)
  })

  /**
   * Every branch dies. Walked from each piece's own stop list rather than read off anything generation
   * recorded, so this checks the board rather than the bookkeeping.
   */
  it("every wrong stop runs the light out", () => {
    for (const board of boards) {
      board.movable.forEach((piece, index) => {
        if (piece.kind !== "turnMirror") return
        const answer = piece.angles[board.solution[index]]
        for (const stop of piece.angles) {
          if (stop === answer) continue
          const config = [...board.solution]
          config[index] = piece.angles.indexOf(stop)
          const walk = traceBeam(board, config)
          expect(["escapes", "absorbed"]).toContain(walk.end)
        }
      })
    }
  })

  /**
   * Phase 1's correctness rule, asserted directly: no branch shares a `(cell, direction)` pair with the
   * golden path, and none enters a cell a tappable piece occupies.
   *
   * The pair rather than "does it reach the shrine", because a branch rejoining *upstream* of where it left
   * also delivers the light (design doc §11.15). And the tappable half is what phase 1 buys its proof with:
   * a branch entering a tappable cell is one corridor **per stop of that piece**, so authoring covers only
   * the stop it was traced against — which is exactly the two-branches-combine counterexample §11.15 found.
   *
   * The one exception is a stop that sends the beam back down its own line. It retraces through the mirrors
   * that carried it — each still at its golden angle, or the light would not have reached the bend at all —
   * and the disc swallows it, so its future is determined despite the cells being tappable.
   */
  it("no branch joins the golden path or reuses a tappable cell", () => {
    for (const board of boards) {
      const golden = traceBeam(board, board.solution)
      const goldenSegments = new Set(golden.path.map(segment => segmentKey(segment.at, segment.enter)))
      const tappable = new Set(board.movable.flatMap(piece => pieceCells(piece).map(cellKey)))
      const arrival = arrivals(board)
      board.movable.forEach((piece, index) => {
        if (piece.kind !== "turnMirror") return
        const enter = arrival.get(cellKey(piece.at))
        expect(enter).toBeDefined()
        const answer = piece.angles[board.solution[index]]
        for (const stop of piece.angles) {
          if (stop === answer) continue
          const retraces = reflect(stop, enter as Direction) === opposite(enter as Direction)
          const config = [...board.solution]
          config[index] = piece.angles.indexOf(stop)
          const walk = traceBeam(board, config)
          const from = walk.path.findIndex(segment => cellKey(segment.at) === cellKey(piece.at))
          for (const segment of walk.path.slice(from + 1)) {
            expect(goldenSegments.has(segmentKey(segment.at, segment.enter))).toBe(false)
            if (!retraces) expect(tappable.has(cellKey(segment.at))).toBe(false)
          }
        }
      })
    }
  })

  /**
   * **Every wall stops a branch** — there is no scenery, because stone is only ever placed where a corridor
   * had nowhere else to end.
   *
   * Note what this does *not* claim, because measuring it corrected the plan: taking a wall away mostly does
   * **not** break uniqueness. Measured over 1 000 boards, 692 of 722 walls are holding a branch out of a
   * cell a tappable piece occupies, and the beam dies anyway once it gets there. They are load-bearing for
   * phase 1's no-reuse invariant rather than for the answer, which is the real reason `thinWalls` must not
   * run here: it re-checks uniqueness and the ladder, so it would strip exactly the stone that keeps
   * branches away from tappable cells and hand phase 2's recursion §11.15's hazard.
   */
  it("carries no wall that stops nothing", () => {
    for (const board of boards) {
      for (const wall of board.fixed) {
        const stopped = board.movable.some((piece, index) => {
          if (piece.kind !== "turnMirror") return false
          const answer = piece.angles[board.solution[index]]
          return piece.angles.some(stop => {
            if (stop === answer) return false
            const config = [...board.solution]
            config[index] = piece.angles.indexOf(stop)
            const walk = traceBeam(board, config)
            return walk.stopAt !== undefined && sameCell(walk.stopAt, wall.at)
          })
        })
        expect(stopped).toBe(true)
      }
    }
  })

  /** Rule 2: every stop list keeps a quarter turn, so a half-step answer brings a diagonal partner with it. */
  it("keeps a quarter turn in every stop list", () => {
    for (const board of boards)
      for (const piece of board.movable) {
        if (piece.kind !== "turnMirror") continue
        expect(piece.angles.some(angle => angle === 2 || angle === 6)).toBe(true)
      }
  })

  it("puts a mirror at every bend and nothing on a shoulder", () => {
    for (const board of boards) {
      const owner = new Map<string, number>()
      board.movable.forEach((piece, index) => {
        for (const at of pieceCells(piece)) owner.set(cellKey(at), index)
      })
      for (const [key, index] of owner) {
        const [row, col] = key.split(",").map(Number)
        for (const direction of [0, 2, 4, 6] as Direction[]) {
          const beside = owner.get(
            cellKey({ row: row + [0, -1, 0, 1][direction / 2], col: col + [1, 0, -1, 0][direction / 2] })
          )
          if (beside !== undefined) expect(beside).toBe(index)
        }
      }
    }
  })
})

/**
 * The dials the shipped tiers do not reach, kept in a spec because the code paths they exercise are real.
 *
 * A single cut mirror always arrives on a square leg, so its wrong stop never retroreflects; the second of
 * a consecutive cut pair arrives diagonally and does. Measured over 200 seeds the pair produces about 110
 * retracing branches and the shipped tiers produce none, so without this the branch that closes them for
 * free would never run.
 */
describe("dials past the shipped tiers", () => {
  it("closes a retroreflecting stop, which only a cut pair produces", () => {
    let retracing = 0
    for (let seed = 1; seed <= 40; seed++) {
      const board = generateAuthoredLightbeam(9, seed, { turns: 6, cutMirrors: 2, techniqueCap: "onlySurvivor" })
      const arrival = arrivals(board)
      let lit = 0
      eachConfig(allPieceOptions(board), config => {
        if (isLit(board, config)) lit++
      })
      expect(lit).toBe(1)
      board.movable.forEach((piece, index) => {
        if (piece.kind !== "turnMirror") return
        const enter = arrival.get(cellKey(piece.at))
        if (enter === undefined) return
        const answer = piece.angles[board.solution[index]]
        for (const stop of piece.angles) if (stop !== answer && reflect(stop, enter) === opposite(enter)) retracing++
      })
    }
    expect(retracing).toBeGreaterThan(0)
  })

  it("bends diagonally where a tier asks it to", () => {
    const board = generateAuthoredLightbeam(8, 1, { turns: 5, cutMirrors: 1, techniqueCap: "onlySurvivor" })
    expect(board.movable.some(piece => piece.kind === "turnMirror" && piece.angles.some(isHalfStep))).toBe(true)
    expect(traceBeam(board, board.solution).path.some(segment => segment.enter % 2 === 1)).toBe(true)
  })

  /** A folded route is what `crossings` buys, and a crossed square is provably empty. */
  it("folds through its own line when asked", () => {
    const board = generateAuthoredLightbeam(9, 4, { turns: 8, crossings: 2, techniqueCap: "onlySurvivor" })
    const seen = new Set<string>()
    const crossed = new Set<string>()
    for (const segment of traceBeam(board, board.solution).path) {
      const key = cellKey(segment.at)
      if (seen.has(key)) crossed.add(key)
      seen.add(key)
    }
    expect(crossed.size).toBeGreaterThanOrEqual(2)
    const occupied = new Set(board.movable.flatMap(piece => pieceCells(piece).map(cellKey)))
    for (const key of crossed) expect(occupied.has(key)).toBe(false)
  })

  /** Generation is measured in attempts, not seconds — the plan's Method section, made a standing check. */
  it("costs about one attempt a board", () => {
    let attempts = 0
    const gates = new Map<LightbeamGate, number>()
    for (let seed = 1; seed <= 40; seed++) {
      generateAuthoredLightbeam(9, seed, {
        turns: 6,
        cutMirrors: 1,
        fiddleProof: true,
        techniqueCap: "onlySurvivor",
        reject: gate => {
          attempts++
          gates.set(gate, (gates.get(gate) ?? 0) + 1)
        },
      })
      attempts++
    }
    expect(gates.get("noRoute") ?? 0).toBe(0)
    expect(gates.get("notUnique") ?? 0).toBe(0)
    expect(gates.get("notSettled") ?? 0).toBe(0)
    expect(attempts / 40).toBeLessThan(1.5)
  })
})
