#!/usr/bin/env tsx
/**
 * How many of 2000 seeds build a procession door's board on their first attempt, for every tier and every
 * step count a door may have (`docs/instructions/procession-door.md`, question 5). A pair at zero has no board
 * and is refused at bake; the table is what the designer sets a band per pair from.
 *
 * Run: yarn tsx scripts/processionDoorSeeds.ts [--seeds=<n>]
 */
import { difficulties } from "../src/data/difficultyLevels"
import { PROCESSION_META } from "../src/mods/puzzle/game/procession/meta"
import { findSeeds } from "../src/game/seeds/findSeeds"
import { doorVariant, PROCESSION_DOOR_STEPS } from "../src/mods/puzzle/game/procession/processionConfig"

const count = Number(process.argv.find(arg => arg.startsWith("--seeds="))?.split("=")[1] ?? 2000)
const seedable = PROCESSION_META.seedable!

console.log(`seeds found per ${count}, first attempt\n`)
console.log(["tier", ...PROCESSION_DOOR_STEPS.map(steps => `${steps} steps`)].join("\t"))
for (const difficulty of difficulties) {
  const row = PROCESSION_DOOR_STEPS.map(steps => {
    const options = seedable.resolveOptions({ difficulty, variant: doorVariant(steps) })
    return String(findSeeds(seedable, options, 0, count).length)
  })
  console.log([difficulty, ...row].join("\t"))
}
