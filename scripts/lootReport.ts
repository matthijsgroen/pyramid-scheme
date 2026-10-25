#!/usr/bin/env tsx
/**
 * Prints the loot in the baked world against demand and writes docs/loot-report.md.
 * Run: yarn loot-report [--journey <id>]
 *   --journey also prints that journey's slots, one per line
 */
import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { resolveEncounterMeta, resolveKeyRequirements } from "../src/mods/allFamilyMeta"
import { ALL_CURRENCY_DISTRIBUTIONS } from "../src/mods/allCurrencyDistributions"
import { MOD_LOOT_TOTALS, MOD_REACHABILITY_SUPPORT } from "../src/mods/registeredMods"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "../src/worldGen/data"
import { journeyMetaFor, makeGateWalk } from "../src/worldGen/gateWalk"
import { mergeReachabilitySupport } from "../src/worldGen/placeFragments"
import { buildLootReport, renderLootReportMarkdown } from "../src/worldGen/lootReport"
import type { Difficulty } from "../src/worldGen/types"
import type { TierRow } from "../src/worldGen/lootReport"

const argv = process.argv.slice(2)
const journeyIdx = argv.indexOf("--journey")
const journeyId = journeyIdx !== -1 ? argv[journeyIdx + 1] : argv.find(a => a.startsWith("--journey="))?.split("=")[1]

const tiers = new Map<string, Difficulty>([...PYRAMID_JOURNEYS, ...TOMB_JOURNEYS].map(j => [j.id, j.tier]))

// The gate walk over the baked world, injected as the bake injects it: the registered currencies merged with every
// mod's reachability support, the real key requirements and encounter resolution. It walks only when a row asks.
const walk = makeGateWalk({
  configs: generatedWorldConfigs,
  journeyMeta: journeyMetaFor(PYRAMID_JOURNEYS, TOMB_JOURNEYS),
  support: mergeReachabilitySupport(ALL_CURRENCY_DISTRIBUTIONS, MOD_REACHABILITY_SUPPORT),
  resolveRequirements: resolveKeyRequirements,
  resolveEncounter: resolveEncounterMeta,
})

const report = buildLootReport(generatedWorldConfigs, {
  resolveEncounter: resolveEncounterMeta,
  totals: MOD_LOOT_TOTALS(generatedWorldConfigs, walk),
  journeyTier: id => tiers.get(id),
})

const pad = (cells: string[][]) => {
  const widths = cells[0].map((_, c) => Math.max(...cells.map(r => r[c].length)))
  return cells
    .map(r =>
      r
        .map((v, c) => v.padEnd(widths[c]))
        .join("  ")
        .trimEnd()
    )
    .join("\n")
}

const unitOf = (u?: string) => (u === "coins" ? " coins" : "")
console.log(
  pad([
    ["Currency", "Found", "Needed", "Against demand"],
    ...report.totals.map(t => [
      t.label,
      `${t.found}${unitOf(t.unit)}`,
      t.needed === undefined ? "-" : `${t.needed}${unitOf(t.unit)}`,
      t.short ? `short ${t.short}` : t.surplus ? `surplus ${t.surplus}` : t.needed === undefined ? "-" : "exact",
    ]),
  ])
)
console.log("")
const fill = (f: { filled: number; total: number }) => `${f.filled}/${f.total}`
console.log(
  pad([
    ["Tier", "Puzzles", "With loot", "Share", "Empty", "Chests", "Path ends", "Shop stock"],
    ...report.byTier.map((r: TierRow) => [
      r.tier,
      String(r.puzzleRooms),
      String(r.puzzlesWithLoot),
      `${Math.round(r.share * 100)}%`,
      String(r.emptyPuzzleRooms),
      fill(r.chests),
      fill(r.pathEnds),
      fill(r.shopStock),
    ]),
  ])
)

if (journeyId !== undefined) {
  const slots = report.slots.filter(s => s.journeyId === journeyId)
  console.log(`\n${journeyId}: ${slots.length} slots`)
  for (const s of slots) {
    const { type: _type, ...fields } = (s.reward ?? {}) as Record<string, unknown>
    const what = s.rewardType ? `${s.rewardType} ${JSON.stringify(fields)}` : "-"
    console.log(
      `level ${s.levelNr} floor ${s.floorIndex + 1}  ${s.place}${s.hidden ? " (hidden)" : ""}  ${s.kind}  ${s.tier}  ${what}`
    )
  }
}

const out = fileURLToPath(new URL("../docs/loot-report.md", import.meta.url))
writeFileSync(out, renderLootReportMarkdown(report))
execFileSync("yarn", ["prettier", "--write", out], { stdio: "ignore" })
