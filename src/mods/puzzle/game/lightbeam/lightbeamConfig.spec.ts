import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { LIGHTBEAM_CONFIG } from "./lightbeamConfig"
import { generateLightbeam, reachableDeviations, LIGHTBEAM_MODES, type LightbeamGate } from "./generateLightbeam"
import { routeIsUnique } from "./lightbeamGeometry"
import { allPieceOptions, cellKey, isLit, pieceCells, restingState, traceBeam } from "./beam"
import { solveLightbeamByTechniques } from "./techniques"

const SEEDS = 12

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

  /**
   * Non-decreasing rather than strictly growing, and expert is why: its addition is the **diagonal cut**, which
   * is vocabulary rather than quantity — it swaps a mirror's answer for a half-step rather than adding a piece
   * (§11.8 rule 8). It shares junior's route length, so the two sit close on this column by design. What must
   * never happen is a tier getting *smaller*, which is the mistake this has caught twice.
   */
  it("never shrinks the piece count", () => {
    for (let step = 1; step < measured.length; step++)
      expect(measured[step].pieces).toBeGreaterThanOrEqual(measured[step - 1].pieces)
  })

  /** The space, though, does have to grow every tier — it is the honest measure of how much board there is. */
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
   * **No tier is solved by following the light and turning whatever it hits.**
   *
   * That is the property playtesting asked for, and the one this table exists to hold. `deadEnd` says "the light
   * visibly dies there" — a board settled by it alone has no decision in it, only a trail to follow. Every tier
   * now stands a piece off the winning beam's line, so ruling that piece out is unavoidable.
   *
   * Asserted per tier rather than in aggregate, because a tier quietly slipping back to a trail is exactly the
   * regression this guards. Not every board on the harder tiers needs the whole ladder — a wall-heavy draw
   * settles more cheaply, since stone that closes a branch also settles it — so the bar is a clear majority
   * rather than all.
   */
  it.each(difficulties)("does not let %s be solved by following the light", tier => {
    const trail = boardsFor(tier).filter(board => solveLightbeamByTechniques(board, "deadEnd").settled)
    expect(trail.length).toBeLessThanOrEqual(Math.floor(SEEDS / 4))
  })

  /** And every tier carries the piece that makes that true: one the winning beam never touches. */
  it.each(difficulties)("stands a piece off the winning beam's line at %s", tier => {
    for (const board of boardsFor(tier)) {
      const onRoute = new Set(traceBeam(board, board.solution).path.map(segment => cellKey(segment.at)))
      const offRoute = board.movable.filter(piece => !pieceCells(piece).some(at => onRoute.has(cellKey(at))))
      expect(offRoute.length).toBeGreaterThan(0)
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
