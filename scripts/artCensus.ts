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
import { authoredKindsFor } from "@/app/SiteMap/authoredKinds"
import type { Difficulty } from "@/data/difficultyLevels"

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
/** Counted per rank, but a rank falls back to `default/` exactly as `tileUrl` does — sand is one shared
 * drift for all five tombs, and read only per rank it would report as MISSING everywhere. */
const artFor = async (tier: string): Promise<Map<string, number>> => {
  const colours = new Map<string, number>()
  for (const dir of [join(TILES, "default"), join(TILES, tier)]) {
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir, { withFileTypes: true }))
      if (f.isFile() && f.name.endsWith(".png"))
        colours.set(f.name.replace(/\.png$/, ""), await coloursIn(join(dir, f.name)))
  }
  return colours
}

const wall = new Map<string, number>()
const prop = new Map<string, number>()
/** Floors whose site authors a condition, per kind — see the CONDITIONS section. */
const condition = new Map<string, number>()
/** Rooms drawing a patron-able kind in a site that names a patron — see the PATRONS section. */
const patron = new Map<string, number>()
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)

/**
 * The five kinds a god can be DEPICTED on, copied from `tileAssets.ts` rather than imported for the
 * reason the header gives: that module pulls in the app's PNG imports, which tsx cannot resolve.
 *
 * Copied lists drift, and this one is checked: `artCensus.spec.ts` reads the set out of `tileAssets.ts`
 * and fails if the two stop matching. A census counting against its own stale list is the failure this
 * whole file exists to prevent.
 */
const PATRON_KINDS = new Set(["statue", "shrine", "wallShrine", "stela", "mask"])

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
      if (result.grid.condition) bump(condition, result.grid.condition.kind)
      const god = result.grid.patron
      for (const row of result.grid.cells)
        for (const cell of row) {
          if (cell.type !== "room") continue
          if (cell.wallDecoration) bump(wall, `${config.difficulty}/${cell.wallDecoration}`)
          const d = (cell as { decoration?: string }).decoration
          if (d) bump(prop, `${config.difficulty}/${d}`)
          // A patron only reaches the map through one of five kinds, so a god authored on a pyramid
          // with none of them in it draws nothing at all. Counting the pairing rather than the god is
          // the whole point: it is what says which of the forty-five files are worth painting.
          for (const kind of [cell.wallDecoration, d])
            if (kind && god && PATRON_KINDS.has(kind)) bump(patron, `${config.difficulty}/${kind}-${god}`)
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

/**
 * FLOOR SCATTER has no room count, because no room places it.
 *
 * `floorScatter` works off the floor's own shape and its site id — nothing names a scatter kind in a
 * spec — so the two sections above, which count DRESSED ROOMS, are blind to it by construction. That
 * blindness reported the merchant as one file from finished while the drifts and spills he walks over
 * were still placeholders, and it is the most visible layer there is: about two pieces to a chamber and
 * twenty-two to a floor, on the cells the player actually crosses.
 *
 * Every rank draws all three kinds, so there is nothing to count and the art state is the whole report.
 */
console.log("\nFLOOR SCATTER   (placed by rule on cells the player walks — every rank draws all three)")
for (const tier of TIERS) {
  if (only && tier !== only) continue
  const art = await artFor(tier)
  console.log(`  ${tier}`)
  for (const kind of authoredKindsFor(tier as Difficulty).scatter) {
    const colours = art.get(kind)
    const state = colours === undefined ? "MISSING" : colours < PAINTED_MIN_COLOURS ? "placeholder" : "art"
    console.log(`    ${kind.padEnd(16)} ${"".padStart(4)}         ${state}`)
  }
}
/**
 * CONDITIONS — the third axis, and the one this census was blind to.
 *
 * A condition is what has got INTO a site and runs through the whole of it: water standing in the floors,
 * green forcing its way through the brick (siteTypes.ts, ConditionKind). It is drawn as an overlay — a
 * tint over the rank's own ambience, plus a scatter of ONE shared sprite per kind from `tiles/default/`,
 * placed by `MapGrowth` and biased up each cell toward the wall band it is meant to be coming through.
 *
 * It was missing from this report for the same reason FLOOR SCATTER was, one step further out: the two
 * sections above count DRESSED ROOMS, and nothing about a condition is written on a room. Which made two
 * facts invisible at once — that both sprites are still placeholders, and that no site in the world
 * authors a condition at all, so neither is drawn anywhere yet however painted it gets.
 *
 * The plumbing is complete: `dsl.ts` takes `condition` at the pyramid level, `buildSite` carries it onto
 * every floor, `moodSettings` turns it into a tint and a growth count, and `MapGrowth` draws it. What is
 * missing is an authored site and two painted sprites, in that order — a painted vine helps nothing until
 * some pyramid is overgrown.
 */
console.log("\nCONDITIONS   (one shared sprite per kind, in tiles/default — a tint plus that sprite scattered)")
{
  const art = await artFor("starter") // `default` is in every tier's lookup; the tier here is irrelevant.
  for (const kind of ["overgrown", "flooded"]) {
    const colours = art.get(kind)
    const state = colours === undefined ? "MISSING" : colours < PAINTED_MIN_COLOURS ? "placeholder" : "art"
    const floors = condition.get(kind) ?? 0
    const where = floors === 0 ? "NO SITE AUTHORS IT" : `${floors} floors`
    console.log(`    ${kind.padEnd(16)} ${String(where).padEnd(20)} ${state}`)
  }
}

/**
 * PATRONS — the fourth axis, and this census was blind to it exactly as it was blind to the other two.
 *
 * A patron is whose tomb a pyramid is. It reaches the map through ONE mechanism and no other: for five
 * kinds, `patronTileUrl` prefers `<kind>-<patron>.png` over the generic drawing and falls back silently
 * where that file is absent. Silently is why nothing noticed — the two sections above count a room's
 * KIND, the resolver is live, fifty-eight pyramids name a god, and every one of them draws the generic
 * art with no report anywhere saying so.
 *
 * COUNTED AS PAIRINGS, not as gods. Nine patrons across five kinds is forty-five files, and painting
 * forty-five is not the job: a god authored on a pyramid with no statue, shrine, stela, mask or wall
 * shrine in it draws nothing whatever, and the same god at another rank is a different painting. What
 * the map can actually show is the list below, in room order, and it is a good deal shorter than
 * forty-five.
 */
console.log("\nPATRONS   (<kind>-<patron>.png, preferred over the generic drawing for five kinds)")
{
  const rows = [...patron.entries()].sort((a, b) => b[1] - a[1])
  if (!rows.length) console.log("    no site pairs a patron with a kind that can carry one")
  for (const tier of TIERS) {
    if (only && tier !== only) continue
    const mine = rows.filter(([k]) => k.startsWith(`${tier}/`))
    if (!mine.length) continue
    const art = await artFor(tier)
    console.log(`  ${tier}`)
    for (const [key, n] of mine) {
      const name = key.split("/")[1]
      const colours = art.get(name)
      const state = colours === undefined ? "not drawn" : colours < PAINTED_MIN_COLOURS ? "placeholder" : "art"
      console.log(`    ${name.padEnd(22)} ${String(n).padStart(4)} rooms   ${state}`)
    }
  }
}

console.log("\nkinds with no rooms at a tier are not listed: that rank never draws them.")
