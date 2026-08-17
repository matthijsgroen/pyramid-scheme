import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { applyGoals, drawGoals, GOAL_DIALS } from "./goals"
import { generateLightbeam, LIGHTBEAM_GOALS, type LightbeamDials, type LightbeamGoal } from "./generateLightbeam"
import { LIGHTBEAM_CONFIG } from "./lightbeamConfig"
import { solveLightbeamByTechniques } from "./techniques"

const LEAN: LightbeamDials = {
  turns: 2,
  setMirrors: 0,
  slidingMirrors: 0,
  slidingWalls: 0,
  slidingStops: 2,
  fiddleProof: false,
  crossings: 0,
  doors: 0,
  doorNodes: 1,
  decoys: 0,
  shadows: 0,
}

const DIALS = [
  "turns",
  "setMirrors",
  "slidingMirrors",
  "slidingWalls",
  "slidingStops",
  "crossings",
  "decoys",
  "shadows",
] as const

describe("the goal pool", () => {
  it("has a dial change for every goal in the list", () => {
    for (const goal of LIGHTBEAM_GOALS) expect(GOAL_DIALS[goal]).toBeTypeOf("function")
  })

  // The property that lets two goals apply together and both still mean something. An earlier draft had
  // each goal flatten the dials it did not care about, so drawing two silently cancelled the first.
  it("only ever turns a dial up, never down", () => {
    for (const goal of LIGHTBEAM_GOALS) {
      const after = GOAL_DIALS[goal](LEAN)
      for (const dial of DIALS) expect(after[dial]).toBeGreaterThanOrEqual(LEAN[dial])
    }
  })

  it("gives the same board whichever order two goals are applied in", () => {
    for (const first of LIGHTBEAM_GOALS)
      for (const second of LIGHTBEAM_GOALS)
        expect(applyGoals(LEAN, [first, second])).toEqual(applyGoals(LEAN, [second, first]))
  })

  it("each goal actually changes something", () => {
    for (const goal of LIGHTBEAM_GOALS) expect(GOAL_DIALS[goal](LEAN)).not.toEqual(LEAN)
  })

  // Character, not size: a goal adds one or two pieces so the tier still decides how big a board is. The
  // first cut added four per pair, which put five pieces on a starter board and collapsed the top three
  // tiers into one ten-piece blur.
  it("adds at most two pieces' worth of work", () => {
    for (const goal of LIGHTBEAM_GOALS) {
      const after = GOAL_DIALS[goal](LEAN)
      const added =
        after.turns -
        after.setMirrors -
        (LEAN.turns - LEAN.setMirrors) +
        (after.slidingWalls - LEAN.slidingWalls) +
        (after.decoys - LEAN.decoys) +
        (after.shadows - LEAN.shadows)
      expect(added).toBeLessThanOrEqual(2)
    }
  })
})

describe("drawGoals", () => {
  it("is deterministic for a seed", () => {
    expect(drawGoals(7, LIGHTBEAM_GOALS, 2)).toEqual(drawGoals(7, LIGHTBEAM_GOALS, 2))
  })

  it("draws different sets for different seeds", () => {
    const drawn = new Set(Array.from({ length: 20 }, (_, seed) => drawGoals(seed + 1, LIGHTBEAM_GOALS, 2).join("+")))
    expect(drawn.size).toBeGreaterThan(1)
  })

  it("never asks for more goals than the pool holds", () => {
    expect(drawGoals(1, ["longChain"], 3)).toEqual(["longChain"])
    expect(drawGoals(1, [], 2)).toEqual([])
  })
})

describe("goals on generated boards", () => {
  describe.each(difficulties)("at %s", difficulty => {
    const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
    const boards = Array.from({ length: 24 }, (_, seed) => generateLightbeam(size, seed + 1, options))
    const wanted = options.goalCount ?? 0

    it("records what it was built to, so a fallback cannot happen quietly", () => {
      for (const board of boards) expect(board.goals.length).toBeLessThanOrEqual(wanted)
    })

    it("draws its full set of goals — the fallback ladder is the guard, not the plan", () => {
      // A fallback that fires often would make the whole pool decorative while every other measurement
      // still looked fine, so this is asserted rather than trusted.
      const fellBack = boards.filter(board => board.goals.length < wanted)
      expect(fellBack).toHaveLength(0)
    })

    it("only draws goals its cap can actually resolve", () => {
      for (const board of boards) for (const goal of board.goals) expect(options.goals).toContain(goal)
    })

    it("spreads its boards over more than one kind of problem", () => {
      if (!wanted) return
      const kinds = new Set(boards.map(board => [...board.goals].sort().join("+")))
      expect(kinds.size).toBeGreaterThan(1)
    })

    it("still settles inside its cap whatever it drew", () => {
      for (const board of boards) expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
    })
  })
})

describe("a goal changes the board it names", () => {
  const build = (goals: LightbeamGoal[]) => {
    const puzzle = generateLightbeam(8, 5, {
      turns: 3,
      slidingMirrors: 1,
      techniqueCap: "onlySurvivor",
      goals,
      goalCount: goals.length,
    })
    // Guards the tests below against a silent fallback: comparing a board that dropped its goal with one
    // that never had it would pass for the wrong reason.
    expect(puzzle.goals).toEqual(goals)
    return puzzle
  }

  it("sortTheWheat leaves pieces the light can never reach", () => {
    const bare = solveLightbeamByTechniques(build([]), "onlySurvivor").board.free.size
    const sorted = solveLightbeamByTechniques(build(["sortTheWheat"]), "onlySurvivor").board.free.size
    expect(sorted).toBeGreaterThan(bare)
  })

  it("clearTheWay puts stone across the route", () => {
    expect(build(["clearTheWay"]).movable.filter(piece => piece.kind === "slidingWall").length).toBeGreaterThan(
      build([]).movable.filter(piece => piece.kind === "slidingWall").length
    )
  })

  it("longChain lengthens the beam", () => {
    const bends = (goals: LightbeamGoal[]) => {
      const board = build(goals)
      return board.fixed.filter(piece => piece.kind === "mirror").length + board.movable.length
    }
    expect(bends(["longChain"])).toBeGreaterThan(bends([]))
  })
})
