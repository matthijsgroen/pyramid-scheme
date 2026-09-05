#!/usr/bin/env node
/**
 * Counts what the generated world actually asks each rank to draw, and says which of those have art.
 *
 * The brief's first rule is that a census beats an opinion: a kind belongs to a rank through its ROLE
 * tags (dressingRoles.ts), not through its tier, so which props and wall items a rank needs cannot be
 * read off a table — it falls out of which journeys carry which roles. Guessing has cost real rolls:
 * the starter prompts list four wall items where the world only ever authors two, and name sarcophagus
 * and crystal as merchant props when neither appears below junior and wizard respectively.
 *
 * Run: yarn art-census [--tier=starter]
 */

import sharp from "sharp"
import { readdirSync, existsSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { assembleFloor } from "../src/game/siteAssembler"
import { journeys } from "../src/data/journeys"
import { floorAssemblySeed, persistentInteriorSeed } from "../src/game/siteSeed"
import type { Difficulty } from "../src/data/difficultyLevels"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TILES = join(__dirname, "..", "src", "assets", "tiles")
const TIERS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1]
const only = arg("tier")

// The family registry is deliberately NOT loaded: it drags in the app's React tree and with it PNG
// imports, which tsx cannot resolve. Dressing is what writes `decoration` and `wallDecoration`, and it
// runs off the config and the seed — the encounter resolver only decides what a room CONTAINS.
/**
 * Told apart by how many COLOURS the file has, not by how big it is.
 *
 * A `generate-dummy-tiles` placeholder is flat SVG shapes and comes out with 2 to 4 distinct colours;
 * painted art has 300 to 1600. File size cannot separate them — the junior brazier's placeholder is
 * 2125 bytes and the starter statue's real art is 1964 — and a size threshold reported finished art
 * that was plainly a dummy.
 */
const PAINTED_MIN_COLOURS = 32
const coloursIn = async (path: string): Promise<number> => {
  const { data } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const seen = new Set<number>()
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] >= 128) seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])
  return seen.size
}
const artFor = async (tier: string): Promise<Map<string, number>> => {
  const dir = join(TILES, tier)
  const colours = new Map<string, number>()
  if (!existsSync(dir)) return colours
  for (const f of readdirSync(dir, { withFileTypes: true }))
    if (f.isFile() && f.name.endsWith(".png"))
      colours.set(f.name.replace(/\.png$/, ""), await coloursIn(join(dir, f.name)))
  return colours
}

const wall = new Map<string, number>()
const prop = new Map<string, number>()
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)

for (const journey of journeys) {
  const siteConfigs = journey.siteConfigs
  if (!siteConfigs?.length) continue
  const siteSeed = persistentInteriorSeed(journey.id)
  for (let levelNr = 1; levelNr <= journey.levelCount; levelNr++) {
    const site = siteConfigs[levelNr - 1] ?? siteConfigs[0]
    site.forEach((config, floorIndex) => {
      const result = assembleFloor(journey.id, config, floorAssemblySeed(siteSeed, levelNr, floorIndex), undefined, {
        floorRef: { journeyId: journey.id, floorIndex },
      })
      if (!result.success) return
      for (const row of result.grid.cells)
        for (const cell of row) {
          if (cell.type !== "room") continue
          if (cell.wallDecoration) bump(wall, `${config.difficulty}/${cell.wallDecoration}`)
          const d = (cell as { decoration?: string }).decoration
          if (d) bump(prop, `${config.difficulty}/${d}`)
        }
    })
  }
}

const report = async (title: string, counts: Map<string, number>) => {
  console.log(`\n${title}`)
  for (const tier of TIERS) {
    if (only && tier !== only) continue
    const art = await artFor(tier)
    const rows = [...counts.entries()].filter(([k]) => k.startsWith(`${tier}/`)).sort((a, b) => b[1] - a[1])
    if (!rows.length) continue
    console.log(`  ${tier}`)
    for (const [key, n] of rows) {
      const kind = key.split("/")[1]
      const colours = art.get(kind)
      const state = colours === undefined ? "MISSING" : colours < PAINTED_MIN_COLOURS ? "placeholder" : "art"
      console.log(`    ${kind.padEnd(16)} ${String(n).padStart(4)} rooms   ${state}`)
    }
  }
}

await report("WALL ITEMS", wall)
await report("CHAMBER PROPS", prop)
console.log("\nkinds with no rooms at a tier are not listed: that rank never draws them.")
