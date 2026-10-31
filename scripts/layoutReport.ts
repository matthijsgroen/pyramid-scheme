#!/usr/bin/env tsx
/**
 * What the bake's layout stage would decide for the current authoring, with nothing written: every floor that is
 * infeasible, every floor the bounded search finds no layout for, and every floor accepted only on the ladder.
 * Run: yarn layout-report
 *
 * The world is built up to its layout stage exactly as `yarn generate-world` builds it, then stopped before any loot
 * is placed. Pins of the committed world are verified first and the ledger is read, as in the bake; neither
 * generatedWorld.ts nor the ledger is written. Exits 1 when the bake would refuse a floor.
 */
import { buildWorldConfigs } from "../src/mods/buildWorldConfigs"
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { readLedger } from "./carveLedger"
import { makeLayoutPicker, printFailures, printPicks, unboundOutsideInputs } from "./layoutPicker"

class LayoutPicked extends Error {}

const picker = makeLayoutPicker({ ledger: readLedger(), baked: generatedWorldConfigs })
let outside: string[] = []
try {
  buildWorldConfigs(0, {
    pickLayout: configs => {
      outside = unboundOutsideInputs(configs)
      if (outside.length === 0) picker.pickAll(configs)
      throw new LayoutPicked()
    },
  })
} catch (stopped) {
  if (!(stopped instanceof LayoutPicked)) throw stopped
}

if (outside.length > 0) {
  console.error(`✗ ${outside.length} lock(s) cannot carve before the web is laid:`)
  for (const line of outside) console.error(`    ${line}`)
  process.exit(1)
}
printPicks(picker.picks, picker.stats)
if (picker.failures.length === 0) {
  console.log("✓ Every floor has a layout meeting every hard criterion")
  process.exit(0)
}
printFailures(picker.failures)
process.exit(1)
