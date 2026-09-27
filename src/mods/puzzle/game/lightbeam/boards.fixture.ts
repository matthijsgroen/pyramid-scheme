import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamPuzzle } from "./generateLightbeam"
import boards from "./boards.fixture.json"
import { reviveBoards } from "../boardFixture"

/**
 * Boards the generator made once, checked in beside it.
 *
 * Blanks come back as blanks: JSON writes `undefined` as `null`, so the stored boards are revived on the
 * way in (`reviveBoards`). This family happens to hold none — every `Set` here belongs to a computed
 * result rather than to a board — but the revival is what the loader promises, not a per-family fact.
 * `lightbeamConfig.verify.ts` rebuilds the fixture and compares it against the generator with
 * `toStrictEqual`, which is the check that catches a board that stopped round-tripping.
 */
export const FIXTURE = reviveBoards<Record<Difficulty, LightbeamPuzzle[]>>(boards)

/** Seeds 1..FIXTURE_SEEDS per tier, and the number of boards a tier's entry therefore holds. */
export const FIXTURE_SEEDS = 12
