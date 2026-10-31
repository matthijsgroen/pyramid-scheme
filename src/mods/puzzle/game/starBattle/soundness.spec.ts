import { describe, expect, it } from "vitest"
import { mulberry32, shuffle } from "@/game/random"
import type { Difficulty } from "@/data/difficultyLevels"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { configHash } from "@/game/seeds/configHash"
import { blankMarks } from "./starBattle"
import { STAR_BATTLE_CONFIG } from "./starBattleConfig"
import { TWIN_STARS_CONFIG } from "./twinStars"
import { completions, holdsIn, walledState } from "./soundnessOracle"
import { generateStarBattle, type StarBattleOptions, type StarBattlePuzzleWithAnswer } from "./generateStarBattle"
import {
  applyStarBattleTechniques,
  nextStarBattleStep,
  REGIONLESS_TECHNIQUES,
  STAR_BATTLE_TECHNIQUES,
  type Marks,
} from "./techniques"

/**
 * The guard on §3.3 of the design doc: **a rung must never say something the answer disagrees with, from any
 * state a player can be in.**
 *
 * Generation solves each board once, along one path, so it only exercises the states that path visits. A
 * player reaches states it never sees — the same marks in a different order, or more of them. A rung that is
 * wrong only there ships a board that cannot be finished and a hint that lies.
 *
 * This family needs the guard more than eclipse does, because two of its rungs reason about SETS of groups
 * rather than one line. The bug it is written against is real and was found in the throwaway probe: a cover
 * built from rows AND columns at once counts each star twice, so the quota arithmetic agrees on boards it has
 * no business deciding, and boards settled to answers that broke the adjacency rule.
 */
const TIERS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]

/**
 * The boards to hold to it, one per rule the mechanic ships.
 *
 * **The second quota is where this suite earns its keep.** Every rung is the same code at one star and at
 * two, so the two-star board is not new code being tested — it is the same code asked a question it was
 * never run against, and a counting rung that quietly assumed "one" would pass every other spec in this
 * folder.
 */
const AGREEMENT: { name: string; options: StarBattleOptions }[] = [
  ...TIERS.map(tier => ({ name: `star battle ${tier}`, options: STAR_BATTLE_CONFIG[tier] })),
  ...(["junior", "expert", "master", "wizard"] as Difficulty[]).map(tier => ({
    name: `twin stars ${tier}`,
    options: TWIN_STARS_CONFIG[tier],
  })),
]

/**
 * The boards a tier ships, drawn the way play draws them.
 *
 * A listed seed graded on its FIRST attempt, so `attempts: 1` pays for one draw instead of the search
 * loop — seconds to half a minute a board at the top tiers. What that loop costs is the generator's claim
 * to answer; a rung reads the board it is handed and never asks what finding it took. A tier the family
 * does not ship at lists no seeds, so its boards are searched from its settings.
 */
const boards = (options: StarBattleOptions, count: number) => {
  const listed = puzzleSeeds[configHash(options)] ?? []
  if (listed.length === 0) return Array.from({ length: count }, (_unused, at) => generateStarBattle(at + 1, options))
  return listed.slice(0, count).map(seed => generateStarBattle(seed, options, 1))
}

/** A state a player could actually be in: some of the answer's stars, and some correct dark marks. */
const playerState = (board: StarBattlePuzzleWithAnswer, random: () => number): Marks => {
  const stars = random()
  const darks = random()
  return board.solution.map(star => {
    if (star) return random() < stars ? "star" : undefined
    return random() < darks ? "dark" : undefined
  })
}

describe("star battle soundness", () => {
  it.each(AGREEMENT)(
    "every rung agrees with the answer from any state a player reaches at $name",
    { timeout: 60_000 },
    ({ options }) => {
      const random = mulberry32(7717)
      const drawn = boards(options, 3)
      // A tier whose seed list went stale would check nothing at all, silently.
      expect(drawn).not.toHaveLength(0)
      for (const [seed, board] of drawn.entries()) {
        for (let round = 0; round < 40; round++) {
          const marks = playerState(board, random)
          const steps = applyStarBattleTechniques(board, marks)
          for (const step of steps)
            for (const decision of step.decisions)
              expect(
                decision.mark === "star" ? board.solution[decision.cell] : !board.solution[decision.cell],
                `seed ${seed} ${step.technique}${step.variant ? `.${step.variant}` : ""} on cell ${decision.cell}`
              ).toBe(true)
        }
      }
    }
  )

  /**
   * The stronger reading of the same rule, on the boards small enough to enumerate: a rung's decision has to
   * hold in EVERY legal completion of the state it fired from, not merely in the answer the board shipped
   * with. That is what makes a step forced rather than lucky.
   *
   * Twin stars is enumerated at its own grid rather than a smaller one, because it has no smaller one — 8×8
   * is where its rule starts having boards. Its state space is what caps the rounds here, not its risk.
   */
  it.each([
    { name: "star battle starter", options: STAR_BATTLE_CONFIG.starter, count: 4, rounds: 25 },
    { name: "star battle junior", options: STAR_BATTLE_CONFIG.junior, count: 4, rounds: 25 },
    // Junior first: it is the tier `onlyWay` carries, and a rung that places two stars at once on an
    // argument about arrangements is the one this oracle is most worth pointing at.
    { name: "twin stars junior", options: TWIN_STARS_CONFIG.junior, count: 2, rounds: 12 },
    { name: "twin stars expert", options: TWIN_STARS_CONFIG.expert, count: 2, rounds: 12 },
  ])("every rung is forced by the board it fired from at $name", { timeout: 120_000 }, ({ options, count, rounds }) => {
    const random = mulberry32(4241)
    let checked = 0
    for (const [seed, board] of boards(options, count).entries()) {
      for (let round = 0; round < rounds; round++) {
        const marks = playerState(board, random)
        const ways = completions(board, marks, 60)
        // A state the player has already broken has nothing to be forced about.
        if (!ways.length) continue
        for (const technique of STAR_BATTLE_TECHNIQUES) {
          const step = nextStarBattleStep(board, [...marks], [technique])
          if (!step) continue
          for (const decision of step.decisions) {
            const holds = ways.every(way =>
              decision.mark === "star" ? way.includes(decision.cell) : !way.includes(decision.cell)
            )
            expect(holds, `seed ${seed} ${technique} on cell ${decision.cell}, ${ways.length} ways`).toBe(true)
            checked++
          }
        }
      }
    }
    // A test that silently exercised nothing is not a guard.
    expect(checked).toBeGreaterThan(100)
  })
})

/**
 * Hand-made walled boards with a known answer, one per reading `lineBlock` makes. Answer columns by row
 * are 1,3,5,0,2,4 (no two touch). Rows 0 and 3 are walled but for columns 0-1, and columns 4 and 5 are
 * walled but for rows 2 and 5, so both blocks exist and each has to agree with the answer.
 */
const walledBoard = (): StarBattlePuzzleWithAnswer => {
  const size = 6
  const answer = [1, 3, 5, 0, 2, 4]
  const walls = Array.from({ length: size * size }, (_unused, cell) => {
    const row = Math.floor(cell / size)
    const col = cell % size
    if (answer[row] === col) return false
    return ([0, 3].includes(row) && col > 1) || ([4, 5].includes(col) && [1, 4].includes(row))
  })
  const solution = Array.from(
    { length: size * size },
    (_unused, cell) => answer[Math.floor(cell / size)] === cell % size
  )
  return { size, quota: 1, walls, solution, techniqueCap: "wouldStrand" } as unknown as StarBattlePuzzleWithAnswer
}

/** A random legal star set behind random walls: no settling, no uniqueness filter. */
const randomWalledBoard = (seed: number, size: number): StarBattlePuzzleWithAnswer => {
  const random = mulberry32(seed)
  const columns = Array.from({ length: size }, (_unused, col) => col)
  let answer = shuffle(columns, random)
  while (answer.some((col, row) => row > 0 && Math.abs(col - answer[row - 1]) <= 1)) answer = shuffle(columns, random)
  const share = 0.2 + random() * 0.4
  const walls = Array.from({ length: size * size }, (_unused, cell) => {
    if (answer[Math.floor(cell / size)] === cell % size) return false
    return random() < share
  })
  const solution = Array.from(
    { length: size * size },
    (_unused, cell) => answer[Math.floor(cell / size)] === cell % size
  )
  return { size, quota: 1, walls, solution, techniqueCap: "wouldStrand" }
}

const RANDOM_WALLED = [5, 6].flatMap(size =>
  Array.from({ length: 25 }, (_unused, at) => {
    const board = randomWalledBoard(size * 1000 + at, size)
    return { board, fillings: completions(board, blankMarks(board), 1000) }
  })
)

describe("regionless soundness", () => {
  it("every regionless rung agrees with the answer from any state a player reaches", () => {
    const random = mulberry32(9931)
    const board = walledBoard()
    let lineBlocks = 0
    for (let round = 0; round < 300; round++) {
      const steps = applyStarBattleTechniques(board, walledState(board, random), REGIONLESS_TECHNIQUES)
      for (const step of steps) {
        if (step.technique === "lineBlock") lineBlocks++
        for (const decision of step.decisions)
          expect(
            decision.mark === "star" ? board.solution[decision.cell] : !board.solution[decision.cell],
            `${step.technique}.${step.variant} on cell ${decision.cell}`
          ).toBe(true)
      }
    }
    // A guard that never saw the new rung fire is not guarding it.
    expect(lineBlocks).toBeGreaterThan(0)
  })

  it("every regionless rung is forced by the board it fired from", () => {
    const random = mulberry32(5521)
    const board = walledBoard()
    let checked = 0
    let lineBlocks = 0
    for (let round = 0; round < 200; round++) {
      const marks = walledState(board, random)
      const ways = completions(board, marks, 500)
      if (!ways.length) continue
      for (const technique of REGIONLESS_TECHNIQUES) {
        const step = nextStarBattleStep(board, [...marks], [technique])
        if (!step) continue
        if (technique === "lineBlock") lineBlocks++
        for (const decision of step.decisions) {
          const holds = ways.every(way =>
            decision.mark === "star" ? way.includes(decision.cell) : !way.includes(decision.cell)
          )
          expect(holds, `${technique} on cell ${decision.cell}, ${ways.length} ways`).toBe(true)
          checked++
        }
      }
    }
    expect(lineBlocks).toBeGreaterThan(0)
    expect(checked).toBeGreaterThan(100)
  })

  /**
   * Random walled boards, unsettled and not unique: a board with several completions is where a rung that
   * quietly assumed the one answer gets caught, which a unique board cannot show.
   */
  it("every regionless rung is forced on random walled boards", () => {
    const random = mulberry32(2719)
    const fired = new Map<string, number>()
    let threeLineBlocks = 0
    let several = 0
    for (const { board, fillings } of RANDOM_WALLED) {
      if (fillings.length > 1) several++
      for (let round = 0; round < 20; round++) {
        const answer = fillings[Math.floor(random() * fillings.length)]
        const solution = board.solution.map((_star, cell) => answer.includes(cell))
        const marks = walledState({ ...board, solution }, random)
        const ways = fillings.filter(way => marks.every((mark, cell) => !mark || holdsIn(way, { cell, mark })))
        for (const ladder of [...REGIONLESS_TECHNIQUES.map(id => [id]), [...REGIONLESS_TECHNIQUES]]) {
          for (const step of applyStarBattleTechniques(board, [...marks], ladder)) {
            if (ladder.length === 1) fired.set(step.technique, (fired.get(step.technique) ?? 0) + 1)
            if (step.technique === "lineBlock" && step.cells.length === 3 * board.size) threeLineBlocks++
            for (const decision of step.decisions)
              expect(
                ways.every(way => holdsIn(way, decision)),
                `${step.technique}.${step.variant} on cell ${decision.cell}, ${ways.length} ways`
              ).toBe(true)
          }
        }
      }
    }
    expect(several).toBeGreaterThan(10)
    // A guard that never saw a rung fire is not guarding it. `onlyWay` and `everyWay` are inert at one star.
    for (const technique of REGIONLESS_TECHNIQUES.filter(id => id !== "onlyWay" && id !== "everyWay"))
      expect(fired.get(technique) ?? 0, technique).toBeGreaterThan(0)
    expect(threeLineBlocks).toBeGreaterThan(0)
  })
})
