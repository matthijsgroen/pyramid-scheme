import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { mulberry32 } from "@/game/random"
import { CONSTELLATION_CONFIG } from "./constellationConfig"
import { generateConstellation, techniquesUpTo } from "./generateConstellation"
import {
  applyConstellationTechniques,
  boundsFromLines,
  CONSTELLATION_HINT_ORDER,
  CONSTELLATION_TECHNIQUES,
  solveConstellationByTechniques,
  type ConstellationTechniqueId,
} from "./techniques"

const TIERS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]
const SEEDS = [1, 2, 3, 4, 5, 6]

const boards = TIERS.flatMap(tier =>
  SEEDS.map(seed => ({ tier, seed, board: generateConstellation(seed, CONSTELLATION_CONFIG[tier]) }))
)

describe("the ladder", () => {
  it("says the same rungs in both orders — one is strength, the other is what a player spots first", () => {
    expect([...CONSTELLATION_HINT_ORDER].sort()).toEqual([...CONSTELLATION_TECHNIQUES].sort())
    expect(CONSTELLATION_HINT_ORDER.length).toBe(CONSTELLATION_TECHNIQUES.length)
  })

  /** Rule 5 of the screen bar: a rung the generator can never trigger is a sentence nobody will ever read. */
  it("has no rung a real board cannot trigger", () => {
    const fired = new Set<ConstellationTechniqueId>()
    for (const { tier, board } of boards)
      for (const step of solveConstellationByTechniques(board, techniquesUpTo(CONSTELLATION_CONFIG[tier].techniqueCap))
        .steps)
        fired.add(step.technique)
    expect([...fired].sort()).toEqual([...CONSTELLATION_TECHNIQUES].sort())
  })
})

/**
 * The invariant a rung is held to: **it must never say something the answer disagrees with, from any state a
 * player can be in.**
 *
 * Generation solves each board once, along one path, so it only ever exercises the states that path visits. A
 * player reaches states it never sees — the same lines drawn in a different order, or fewer of them. A rung
 * that is wrong only there ships a board that cannot be finished and a hint that lies.
 *
 * So: start from a random subset of the answer's lines (every state below is one a player could be in, since
 * no line drawn exceeds the answer's), walk the ladder to the end, and check every bound it settles against
 * the answer. A `min` may never rise above the answer, and a `max` may never fall below it.
 */
describe("soundness from a player's board", () => {
  it.each(TIERS)("never contradicts the answer on a %s board", tier => {
    const options = CONSTELLATION_CONFIG[tier]
    const allowed = techniquesUpTo(options.techniqueCap)
    for (const seed of SEEDS) {
      const board = generateConstellation(seed, options)
      const random = mulberry32(seed * 7919)
      for (let round = 0; round < 20; round++) {
        const drawn = board.solution.map(count => Math.floor(random() * (count + 1)))
        const bounds = boundsFromLines(board, drawn)
        applyConstellationTechniques(board, bounds, allowed)
        bounds.forEach((bound, pair) => {
          expect(bound.min, `${tier} seed ${seed} pair ${pair} min`).toBeLessThanOrEqual(board.solution[pair])
          expect(bound.max, `${tier} seed ${seed} pair ${pair} max`).toBeGreaterThanOrEqual(board.solution[pair])
        })
      }
    }
  })
})
