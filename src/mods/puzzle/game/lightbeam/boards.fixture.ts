import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamPuzzle } from "./generateLightbeam"
import boards from "./boards.fixture.json"

/**
 * Boards the generator made once, checked in beside it.
 *
 * A BOARD IS PLAIN DATA — `LightbeamPuzzleData` holds numbers, objects and arrays, and every `Set` in this
 * family belongs to a computed result rather than to a board — so JSON carries one with nothing lost. The
 * cast is the one place that claim is made, and `lightbeamConfig.verify.ts` rebuilds the fixture and
 * compares it, which is what would catch a field that stopped round-tripping.
 */
export const FIXTURE = boards as unknown as Record<Difficulty, LightbeamPuzzle[]>

/** Seeds 1..FIXTURE_SEEDS per tier, and the number of boards a tier's entry therefore holds. */
export const FIXTURE_SEEDS = 12
