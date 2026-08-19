import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { LIGHTBEAM_CONFIG } from "./lightbeamConfig"
import { generateLightbeam, reachableDeviations, LIGHTBEAM_MODES, type LightbeamGate } from "./generateLightbeam"
import { routeIsUnique } from "./lightbeamGeometry"
import { allPieceOptions, cellKey, isLit, pieceCells, restingState, traceBeam } from "./beam"
import { solveLightbeamByTechniques } from "./techniques"

const SEEDS = 6

// Memoised: a wizard board costs the better part of a second to build, and every describe below wants the same
// ones. Without this the file spends minutes regenerating identical boards.
const cache = new Map<string, ReturnType<typeof generateLightbeam>[]>()
const boardsFor = (tier: (typeof difficulties)[number]) => {
  const hit = cache.get(tier)
  if (hit) return hit
  const { size, ...options } = LIGHTBEAM_CONFIG[tier]
  const built = Array.from({ length: SEEDS }, (_, seed) => generateLightbeam(size, seed + 1, options))
  cache.set(tier, built)
  return built
}
const space = (board: ReturnType<typeof generateLightbeam>) =>
  allPieceOptions(board).reduce((product, states) => product * states.length, 1)
const tappable = (board: ReturnType<typeof generateLightbeam>) =>
  board.movable.filter((_, index) => restingState(board, index) === undefined).length

describe.each(difficulties)("at %s", tier => {
  const boards = boardsFor(tier)
  const { techniqueCap } = LIGHTBEAM_CONFIG[tier]

  it("builds every seed", () => {
    expect(boards).toHaveLength(SEEDS)
  })

  it("its answer lights the shrine and it opens dark", () => {
    for (const board of boards) {
      expect(isLit(board, board.solution)).toBe(true)
      expect(isLit(board, board.initial)).toBe(false)
    }
  })

  it("has exactly one winning route", () => {
    for (const board of boards) expect(reachableDeviations(board, board.solution)?.winning.size).toBe(1)
  })

  /**
   * And the walk over the whole product agrees. Only the first board a tier, because that walk is what the
   * deviation tree exists to replace — 1 741 configurations on a wizard grid — and the two agreeing in general
   * is asserted over many more boards in `generateLightbeam.spec.ts`.
   */
  it("agrees with the walk over the whole product", () => {
    expect(routeIsUnique(boards[0], allPieceOptions(boards[0]))).toBe(true)
  })

  // A top-tier solve enumerates tens of thousands of configurations, so this needs a real timeout rather than
  // vitest's 5s default — the family's own Method notes warn about exactly this.
  it("is reachable by deduction alone inside its own cap", { timeout: 300_000 }, () => {
    for (const board of boards) expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
  })

  it("carries at least the family's floor of three tappable pieces", () => {
    for (const board of boards) expect(tappable(board)).toBeGreaterThanOrEqual(3)
  })

  it("records its modes in canonical order", () => {
    for (const board of boards) {
      const canonical = LIGHTBEAM_MODES.filter(mode => board.modes.includes(mode))
      expect(board.modes).toEqual(canonical)
    }
  })

  /**
   * The reason a board is expensive should be the board, not the search. Route-then-obstruct pays 70 to 356
   * discarded drafts a board at the top three tiers (§11.14); this construction pays a handful.
   */
  it("costs a handful of attempts a board, not hundreds", () => {
    const { size, ...options } = LIGHTBEAM_CONFIG[tier]
    let rejects = 0
    const gates = new Map<LightbeamGate, number>()
    for (let seed = 1; seed <= 3; seed++)
      generateLightbeam(size, seed, {
        ...options,
        reject: gate => {
          rejects++
          gates.set(gate, (gates.get(gate) ?? 0) + 1)
        },
      })
    expect(rejects / 3).toBeLessThan(10)
    // The route builder never fails: it backtracks instead of guessing (§11.16).
    expect(gates.get("noRoute") ?? 0).toBe(0)
    // And uniqueness is a property of the construction, not something the gate has to hunt for.
    expect(gates.get("notUnique") ?? 0).toBeLessThanOrEqual(3)
  })

  void techniqueCap
})

/**
 * §6.4's vocabulary ladder, asserted **in aggregate over a tier** rather
 * than board by board. With modes drawn per board one wizard grid can legitimately out-measure another, and it
 * is the tier that has to grow.
 */
describe("the tier ramp", () => {
  const measured = difficulties.map(tier => {
    const boards = boardsFor(tier)
    return {
      tier,
      pieces: boards.reduce((total, board) => total + tappable(board), 0) / boards.length,
      space: boards.reduce((total, board) => total + space(board), 0) / boards.length,
      onRoute:
        boards.reduce((total, board) => {
          const path = new Set(traceBeam(board, board.solution).path.map(segment => cellKey(segment.at)))
          return total + board.movable.filter(piece => pieceCells(piece).some(at => path.has(cellKey(at)))).length
        }, 0) / boards.length,
    }
  })

  it("grows the piece count every tier", () => {
    for (let step = 1; step < measured.length; step++)
      expect(measured[step].pieces).toBeGreaterThan(measured[step - 1].pieces)
  })

  it("grows the configuration space every tier", () => {
    for (let step = 1; step < measured.length; step++)
      expect(measured[step].space).toBeGreaterThan(measured[step - 1].space)
  })

  /** Pieces that can stand in the winning beam's way — the count §6 says actually matters. */
  it("never shrinks the count of pieces on the route", () => {
    for (let step = 1; step < measured.length; step++)
      expect(measured[step].onRoute).toBeGreaterThanOrEqual(measured[step - 1].onRoute)
  })
})

/**
 * The three constraints measurement imposed on this table (§11.17, §11.18), asserted so a later tuning pass
 * cannot quietly break them.
 */
describe("the constraints the table has to respect", () => {
  /**
   * A branch mirror is a shadow, and a shadow defeats `deadEnd` by design. So the two tiers capped there carry
   * no branch that turns — and the board is honest about it: every one settles on "the light visibly dies".
   */
  it("keeps branches straight wherever the cap is deadEnd", () => {
    for (const tier of ["starter"] as const) {
      expect(LIGHTBEAM_CONFIG[tier].techniqueCap).toBe("deadEnd")
      expect(LIGHTBEAM_CONFIG[tier].branchDepth).toBe(0)
      for (const board of boardsFor(tier)) expect(solveLightbeamByTechniques(board, "deadEnd").settled).toBe(true)
    }
  })

  /**
   * And from junior up, `deadEnd` alone is not enough. That is the whole of what playtesting asked for: the
   * ladder used to reach this point at expert, so the bottom two tiers were not puzzles yet.
   */
  it("demands more than deadEnd from junior up", () => {
    for (const tier of ["junior", "expert", "master", "wizard"] as const) {
      const harder = boardsFor(tier).filter(board => !solveLightbeamByTechniques(board, "deadEnd").settled)
      expect(harder.length).toBeGreaterThan(SEEDS / 2)
    }
  })

  /**
   * Wall-heavy and traps fight: wall-heavy's stone kills the trap corridor before the trap does, so a board
   * that drew both gets no trap. Asserted rather than left to chance, because a trap that silently vanished
   * would leave the tier recording a mode it is not the shape of.
   */
  it.each(["master", "wizard"] as const)(
    "only traps on a %s board that did not draw wall-heavy",
    { timeout: 300_000 },
    tier => {
      const doorSockets = LIGHTBEAM_CONFIG[tier].doorNodes ?? 1
      let trapped = 0
      for (const board of boardsFor(tier)) {
        const sockets = board.nodes?.length ?? 0
        if (board.modes.includes("switchHeavy") && !board.modes.includes("wallHeavy")) {
          // The door's sockets, plus the trap's own one — and the winning beam fires only the door's wiring.
          expect(sockets).toBe(doorSockets + 1)
          expect(solveLightbeamByTechniques(board, board.techniqueCap).used.has("wiringDead")).toBe(true)
          trapped++
        } else if (board.modes.includes("switchHeavy")) {
          expect(sockets).toBe(doorSockets)
        } else {
          expect(sockets).toBe(0)
        }
      }
      expect(trapped).toBeGreaterThan(0)
    }
  )

  /** Wall-heavy is where the stone is, and starter is authored to it: the first thing to learn is where the
   * light died, and the frame is the one terminator that gives the player nothing to look at. */
  it("gives starter the stone §6.4 asks for", () => {
    const stone = boardsFor("starter").map(board => board.fixed.filter(piece => piece.kind === "wall").length)
    expect(stone.reduce((total, count) => total + count, 0) / stone.length).toBeGreaterThan(1)
  })

  /** Wizard's own addition: a mirror may offer three stops, drawn per piece so the forks are not uniform. */
  it("gives wizard forks the tiers below do not have", () => {
    const shapes = (tier: "expert" | "wizard") => {
      const seen = new Set<string>()
      for (const board of boardsFor(tier))
        for (const piece of board.movable) if (piece.kind === "turnMirror") seen.add(piece.angles.join("/"))
      return seen
    }
    const wizard = shapes("wizard")
    expect(Math.max(...[...wizard].map(shape => shape.split("/").length))).toBe(3)
    expect(wizard.size).toBeGreaterThan(shapes("expert").size)
  })
})
