import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { cellKey, eachConfig, isLit, pieceCells, pieceStateCount, stepCell, traceBeam } from "./beam"
import { generateLightbeam } from "./generateLightbeam"
import { LIGHTBEAM_CONFIG } from "./lightbeamConfig"
import { solveLightbeamByTechniques } from "./techniques"

describe("generateLightbeam", () => {
  it("is deterministic", () => {
    expect(generateLightbeam(5, 42, { turns: 2 })).toEqual(generateLightbeam(5, 42, { turns: 2 }))
  })

  it("different seeds produce different boards", () => {
    expect(generateLightbeam(5, 1, { turns: 2 })).not.toEqual(generateLightbeam(5, 2, { turns: 2 }))
  })
})

describe.each(difficulties)("at %s", difficulty => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
  const boards = Array.from({ length: 10 }, (_, seed) => generateLightbeam(size, seed + 1, options))

  // The other grid families stop at 7 wide because every cell there is tappable, so cell size IS tap-target
  // size. This family's ceiling is set by legibility instead: only the pieces are tappable and they never
  // touch, so a piece reaches into its empty shoulders for a 44px target (asserted at the foot of this file)
  // and the cell only has to stay big enough to read a mirror's diagonal in.
  it("stays inside the width a phone can draw legibly", () => {
    expect(size).toBeLessThanOrEqual(9)
  })

  it("its answer lights the shrine", () => {
    for (const board of boards) expect(isLit(board, board.solution)).toBe(true)
  })

  it("opens dark, so there is something to do", () => {
    for (const board of boards) expect(isLit(board, board.initial)).toBe(false)
  })

  it("opens more than one tap from done", () => {
    for (const board of boards)
      for (let piece = 0; piece < board.movable.length; piece++)
        for (let state = 0; state < pieceStateCount(board.movable[piece]); state++) {
          const oneTap = board.initial.map((held, index) => (index === piece ? state : held))
          expect(isLit(board, oneTap)).toBe(false)
        }
  })

  it("never needs a guess — every board settles inside its own technique cap", () => {
    for (const board of boards) expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
  })

  // Gate 4, and the honest form of uniqueness for this family: a decoy has a free setting by definition,
  // so a board with decoys has many winning configurations. What may not be ambiguous is the route.
  it("has exactly one winning route", () => {
    for (const board of boards) {
      const paths = new Set<string>()
      const states = board.movable.map(piece => Array.from({ length: pieceStateCount(piece) }, (_, i) => i))
      eachConfig(states, config => {
        if (!isLit(board, config)) return
        paths.add(
          traceBeam(board, config)
            .path.map(segment => cellKey(segment.at))
            .join(" ")
        )
      })
      expect(paths.size).toBe(1)
    }
  })

  it("puts nothing on top of anything else", () => {
    for (const board of boards) {
      const claims = [
        cellKey(board.sun.at),
        cellKey(board.shrine),
        ...board.fixed.map(piece => cellKey(piece.at)),
        ...board.movable.flatMap(piece => pieceCells(piece).map(cellKey)),
      ]
      expect(new Set(claims).size).toBe(claims.length)
    }
  })

  it("keeps every piece on the board", () => {
    for (const board of boards)
      for (const piece of board.movable)
        for (const at of pieceCells(piece)) {
          expect(at.row).toBeGreaterThanOrEqual(0)
          expect(at.col).toBeGreaterThanOrEqual(0)
          expect(at.row).toBeLessThan(size)
          expect(at.col).toBeLessThan(size)
        }
  })

  it("sets the disc and the shrine in the frame, never adrift in the middle", () => {
    const onEdge = (row: number, col: number) => row === 0 || col === 0 || row === size - 1 || col === size - 1
    for (const board of boards) {
      expect(onEdge(board.sun.at.row, board.sun.at.col)).toBe(true)
      expect(onEdge(board.shrine.row, board.shrine.col)).toBe(true)
    }
  })

  it("gives the player something to tap", () => {
    for (const board of boards) expect(board.movable.length).toBeGreaterThan(0)
  })

  // Wall-thinning's own test. A wall the player cannot spend hides which obstacles the deduction turns
  // on, so every one left standing has to be load-bearing under this board's cap.
  it("shows no wall the player cannot spend", () => {
    for (const board of boards)
      for (const wall of board.fixed.filter(piece => piece.kind === "wall")) {
        const without = { ...board, fixed: board.fixed.filter(piece => piece !== wall) }
        const states = board.movable.map(piece => Array.from({ length: pieceStateCount(piece) }, (_, i) => i))
        const paths = new Set<string>()
        eachConfig(states, config => {
          if (isLit(without, config))
            paths.add(
              traceBeam(without, config)
                .path.map(segment => cellKey(segment.at))
                .join(" ")
            )
        })
        const stillAPuzzle = paths.size === 1 && solveLightbeamByTechniques(without, board.techniqueCap).settled
        expect(stillAPuzzle).toBe(false)
      }
  })
})

// The whole point of the technique cap is that it is what a board may DEMAND. Built plainly every board
// is a chain of `deadEnd` eliminations, so the tiers would differ only in size — the shadow pieces
// (generateLightbeam's `shadows`) are what make the higher rungs necessary rather than merely permitted.
describe("the tiers demand different reasoning", () => {
  const sweep = (difficulty: (typeof difficulties)[number]) => {
    const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
    return Array.from({ length: 16 }, (_, seed) => generateLightbeam(size, seed + 1, options))
  }

  const demanded = (difficulty: (typeof difficulties)[number]) => {
    const used = new Set<string>()
    for (const board of sweep(difficulty))
      for (const technique of solveLightbeamByTechniques(board, board.techniqueCap).used) used.add(technique)
    return used
  }

  // Footprint is only half of difficulty, but it may never go backwards: a junior board that is smaller
  // than a starter one is a tier table that reads right and plays wrong, which is exactly what the first
  // pass at this table did — and then what the first pass at the goal pool did again, by letting two goals
  // add four pieces on top of baselines that already carried some.
  //
  // Asserted in AGGREGATE over a tier rather than board by board: with goals drawn per board, one starter
  // grid can legitimately out-measure one junior grid. It is the tier that has to grow, not every board.
  it("never shrinks as the tiers go up", () => {
    const space = difficulties.map(difficulty =>
      sweep(difficulty).reduce(
        (total, board) => total + board.movable.reduce((product, piece) => product * pieceStateCount(piece), 1),
        0
      )
    )
    for (let tier = 1; tier < space.length; tier++) expect(space[tier]).toBeGreaterThan(space[tier - 1])
  })

  it("asks a starter board for nothing but a visible dead end", () => {
    expect([...demanded("starter")].sort()).toEqual(["deadEnd", "entryRun", "exitRun"])
  })

  it("reaches the shrine-side elimination by junior", () => {
    expect(demanded("junior")).toContain("feedsExit")
  })

  it("names an irrelevant piece from expert on, where the decoys start", () => {
    expect(demanded("expert")).toContain("neverReached")
  })

  it("spends the whole ladder at wizard", () => {
    expect([...demanded("wizard")].sort()).toEqual([
      "deadEnd",
      "entryRun",
      "exitRun",
      "feedsExit",
      "neverReached",
      "onlySurvivor",
    ])
  })
})

// The tap-accuracy rule, and what buys this family a grid wider than the other grid families allow. There,
// every cell is tappable, so cell size is tap-target size and 7 wide is a real ceiling. Here only the
// movable pieces are tappable and they are never allowed to touch, so a piece owns the empty shoulders
// around it and its hit area can be a thumb wide while its cell is smaller (LightbeamBoard spends that).
//
// Before this rule existed essentially every board broke it — up to ten touching pairs on one wizard grid.
describe("no two pieces the player can tap ever touch", () => {
  // The board is 318px inside a 360px encounter modal, measured; 5px of overflow each way is what the
  // movable cells carry.
  const BOARD_PX = 318
  const OVERFLOW_PX = 5
  const TAP_TARGET_PX = 44

  describe.each(difficulties)("at %s", difficulty => {
    const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
    const boards = Array.from({ length: 16 }, (_, seed) => generateLightbeam(size, seed + 1, options))

    it("keeps every pair of movable pieces at least a square apart", () => {
      for (const board of boards) {
        const owner = new Map<string, number>()
        board.movable.forEach((piece, index) => {
          for (const at of pieceCells(piece)) owner.set(cellKey(at), index)
        })
        for (const [key, index] of owner) {
          const [row, col] = key.split(",").map(Number)
          for (const direction of ["up", "right", "down", "left"] as const) {
            const beside = stepCell({ row, col }, direction)
            expect(owner.get(cellKey(beside)) ?? index).toBe(index)
          }
        }
      }
    })

    it("still clears the 44px tap target once a piece reaches into its shoulders", () => {
      expect(BOARD_PX / size + 2 * OVERFLOW_PX).toBeGreaterThanOrEqual(TAP_TARGET_PX)
    })

    // The overflow may reach into empty squares, never into another target's.
    it("leaves no two tap targets overlapping", () => {
      expect(BOARD_PX / size + 2 * OVERFLOW_PX).toBeLessThanOrEqual(2 * (BOARD_PX / size))
    })
  })
})
