import type { Difficulty } from "@/data/difficultyLevels"
import type { RushHourPuzzle } from "./rushHour"
import boards from "./boards.fixture.json"
import { reviveBoards } from "../boardFixture"

/**
 * Boards the generator made once, checked in beside it.
 *
 * Blanks come back as blanks: JSON writes `undefined` as `null`, so the stored boards are revived on the
 * way in (`reviveBoards`). The `.verify.ts` file rebuilds the fixture and compares it against the
 * generator with `toStrictEqual`, which is the check that catches a board that stopped round-tripping.
 *
 * `yarn generate-boards rushHour` rewrites it. Generation is a job, not a unit test: a generator that
 * searches has no runtime worth asserting, and running one on a test run's critical path makes the build
 * red or green according to what else the machine was doing.
 */
export const FIXTURE = reviveBoards<Record<Difficulty, RushHourPuzzle[]>>(boards)

/** Seeds 1..FIXTURE_SEEDS per tier, and the number of boards a tier's entry therefore holds. */
export const FIXTURE_SEEDS = 12
