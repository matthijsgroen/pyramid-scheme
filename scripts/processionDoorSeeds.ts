#!/usr/bin/env tsx
/**
 * How many of 2000 seeds build a procession door's board on their first attempt, for every step count a door
 * may have. A door's board is set by its steps alone, whatever the floor's tier (`docs/instructions/procession-door.md`,
 * question 5); a count at zero has no board and is refused at bake.
 *
 * Run: yarn tsx scripts/processionDoorSeeds.ts [--seeds=<n>]
 */
import { PROCESSION_META } from "../src/mods/puzzle/game/procession/meta"
import { findSeeds } from "../src/game/seeds/findSeeds"
import { doorVariant, PROCESSION_DOOR_STEPS } from "../src/mods/puzzle/game/procession/processionConfig"

const count = Number(process.argv.find(arg => arg.startsWith("--seeds="))?.split("=")[1] ?? 2000)
const seedable = PROCESSION_META.seedable!

console.log(`seeds found per ${count}, first attempt\n`)
console.log(PROCESSION_DOOR_STEPS.map(steps => `${steps} steps`).join("\t"))
console.log(
  PROCESSION_DOOR_STEPS.map(steps => {
    const options = seedable.resolveOptions({ difficulty: "starter", variant: doorVariant(steps) })
    return String(findSeeds(seedable, options, 0, count).length)
  }).join("\t")
)
