import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { LIGHTBEAM_CONFIG } from "./lightbeamConfig"
import { generateLightbeam, type LightbeamGate } from "./generateLightbeam"
import { solveLightbeamByTechniques } from "./techniques"
import { FIXTURE, FIXTURE_SEEDS } from "./boards.fixture"
import { lightbeamFixture } from "../../../../../scripts/puzzleBoards"

// WHAT NEEDS THE GENERATOR, OR A SOLVE. `yarn verify-world` runs these; `vitest run` never sees a
// `.verify.ts`, which is the point of the extension.
//
// The line is what a test has to GET HOLD OF, not what it claims. A claim about a board — its answer
// lights the shrine, its route is unique, it is not solved by following the light — needs only a board,
// and a stored one serves as well as a fresh one: those stay in `lightbeamConfig.spec.ts` and run in
// milliseconds. A claim about the GENERATOR, or one that has to run the solver over every board, has no
// runtime worth asserting on a shared runner, and putting it on a test run's critical path makes the
// build red or green according to what else the machine was doing. Measured before the split, this file's
// four sweeps were 15.6s of the spec's 26.4s, and the wizard solve alone was 7.1s against a 5s default.

describe("the boards the suite tests are the boards the generator makes", () => {
  /**
   * The fixture, rebuilt and compared against the generator itself.
   *
   * WITHOUT THIS THE SPLIT IS A LIE: a stored board that has drifted from what the generator returns lets
   * the whole spec pass while every board the game actually deals is broken.
   *
   * **`toStrictEqual`, and never a comparison through JSON.** `JSON.stringify` writes `undefined` and
   * `null` as the same text, so a stored board whose blanks had all turned into `null` compared EQUAL to
   * the fresh one that still had them — the corruption and the check cancelled out. Strict equality is
   * what tells `undefined` from `null`, which is the whole failure this guard exists to catch.
   */
  it("still matches, board for board", { timeout: 300_000 }, () => {
    expect(FIXTURE).toStrictEqual(lightbeamFixture())
  })
})

describe.each(difficulties)("at %s", tier => {
  const boards = FIXTURE[tier]

  it("builds every seed", () => {
    expect(boards).toHaveLength(FIXTURE_SEEDS)
  })

  /** A top-tier solve enumerates tens of thousands of configurations — 7.1s at wizard, measured. */
  it("is reachable by deduction alone inside its own cap", { timeout: 300_000 }, () => {
    for (const board of boards) expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
  })

  /**
   * The reason a board is expensive should be the board, not the search. Route-then-obstruct pays 70 to 356
   * discarded drafts a board at the top three tiers; this construction pays a handful.
   */
  it("costs a handful of attempts a board, not hundreds", { timeout: 300_000 }, () => {
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
    // The route builder never fails: it backtracks instead of guessing.
    expect(gates.get("noRoute") ?? 0).toBe(0)
    // And uniqueness is a property of the construction, not something the gate has to hunt for.
    expect(gates.get("notUnique") ?? 0).toBeLessThanOrEqual(3)
  })
})

/**
 * A trap fires its own wiring, which only a solve can show. The SOCKET COUNTS this used to assert
 * alongside it are a claim about the board and stayed in `lightbeamConfig.spec.ts`; what is here is the
 * half that needs the ladder run over every board — 6.1s at wizard.
 */
describe("a trap on a board that did not draw wall-heavy", () => {
  it.each(["master", "wizard"] as const)("fires its wiring at %s", { timeout: 300_000 }, tier => {
    let trapped = 0
    for (const board of FIXTURE[tier]) {
      if (!board.modes.includes("switchHeavy") || board.modes.includes("wallHeavy")) continue
      expect(solveLightbeamByTechniques(board, board.techniqueCap).used.has("wiringDead")).toBe(true)
      trapped++
    }
    expect(trapped).toBeGreaterThan(0)
  })
})
