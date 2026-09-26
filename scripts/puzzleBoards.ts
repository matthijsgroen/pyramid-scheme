import { writeFileSync } from "node:fs"
import path from "node:path"
import { difficulties } from "../src/data/difficultyLevels"
import { LIGHTBEAM_CONFIG } from "../src/mods/puzzle/game/lightbeam/lightbeamConfig"
import { generateLightbeam } from "../src/mods/puzzle/game/lightbeam/generateLightbeam"
import { SUDOKU_CONFIG } from "../src/mods/puzzle/game/sudoku/sudokuConfig"
import { generateSudoku } from "../src/mods/puzzle/game/sudoku/generateSudoku"
import { ECLIPSE_CONFIG } from "../src/mods/puzzle/game/eclipse/eclipseConfig"
import { generateEclipse } from "../src/mods/puzzle/game/eclipse/generateEclipse"
import { CONSTELLATION_CONFIG } from "../src/mods/puzzle/game/constellation/constellationConfig"
import { generateConstellation } from "../src/mods/puzzle/game/constellation/generateConstellation"
import { RUSH_HOUR_CONFIG } from "../src/mods/puzzle/game/rushHour/rushHourConfig"
import { generateRushHour } from "../src/mods/puzzle/game/rushHour/generateRushHour"

// THE BOARDS A TEST READS, BUILT ONCE AND CHECKED IN. Generation is a job, not a unit test: a generator
// that searches has no runtime worth asserting, so running one inside `vitest run` makes every run a
// lottery — the same failure as a wall-clock bound, one level up. What the suite owns is the claims a
// board has to satisfy, and for those a stored board is as good as a fresh one and costs nothing.
//
// `yarn generate-boards` writes the fixture; `*.verify.ts` rebuilds it and checks it still matches, so a
// generator change cannot leave the suite asserting things about boards the game no longer makes.

/** Seeds 1..SEEDS per tier. The count the fixture was built with, and what the specs expect to find. */
export const FIXTURE_SEEDS = 12

/** Seeds 1..FIXTURE_SEEDS per tier, for whichever family. A generator's own signature is its own — some
 * take a size, some do not — so each family says how to build one rather than sharing a shape. */
const perTier = <T>(build: (tier: (typeof difficulties)[number], seed: number) => T) =>
  Object.fromEntries(
    difficulties.map(tier => [tier, Array.from({ length: FIXTURE_SEEDS }, (_, seed) => build(tier, seed + 1))])
  )

export const lightbeamFixture = () =>
  perTier((tier, seed) => {
    const { size, ...options } = LIGHTBEAM_CONFIG[tier]
    return generateLightbeam(size, seed, options)
  })

export const sudokuFixture = () => perTier((tier, seed) => generateSudoku(seed, SUDOKU_CONFIG[tier]))

export const eclipseFixture = () => perTier((tier, seed) => generateEclipse(seed, ECLIPSE_CONFIG[tier]))

export const constellationFixture = () =>
  perTier((tier, seed) => generateConstellation(seed, CONSTELLATION_CONFIG[tier]))

export const rushHourFixture = () => perTier((tier, seed) => generateRushHour(seed, RUSH_HOUR_CONFIG[tier]))

const FIXTURES = {
  lightbeam: { build: lightbeamFixture, at: "src/mods/puzzle/game/lightbeam/boards.fixture.json" },
  sudoku: { build: sudokuFixture, at: "src/mods/puzzle/game/sudoku/boards.fixture.json" },
  eclipse: { build: eclipseFixture, at: "src/mods/puzzle/game/eclipse/boards.fixture.json" },
  constellation: { build: constellationFixture, at: "src/mods/puzzle/game/constellation/boards.fixture.json" },
  rushHour: { build: rushHourFixture, at: "src/mods/puzzle/game/rushHour/boards.fixture.json" },
}

const main = () => {
  const asked = process.argv[2]
  const families = asked ? [asked] : Object.keys(FIXTURES)
  for (const family of families) {
    const fixture = FIXTURES[family as keyof typeof FIXTURES]
    if (!fixture) throw new Error(`no board fixture for "${family}" — known: ${Object.keys(FIXTURES).join(", ")}`)
    const file = path.resolve(import.meta.dirname, "..", fixture.at)
    const started = Date.now()
    writeFileSync(file, `${JSON.stringify(fixture.build(), null, 2)}\n`)
    console.log(`${family}: ${fixture.at} (${((Date.now() - started) / 1000).toFixed(1)}s)`)
  }
}

if (process.argv[1]?.endsWith("puzzleBoards.ts")) main()
