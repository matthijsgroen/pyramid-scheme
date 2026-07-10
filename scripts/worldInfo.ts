#!/usr/bin/env tsx
/**
 * Prints a per-journey shape summary of the generated world.
 * Run: yarn world-info [--tier=<starter|junior|expert|master|wizard>] [--per-pyramid]
 *   --tier        only journeys of that difficulty
 *   --per-pyramid one row per pyramid (site) instead of per journey
 */
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "../src/worldGen/data"
import type { FloorConfig, SubSection } from "../src/game/siteTypes"

const argv = process.argv.slice(2)
const flag = (name: string) => {
  const eq = argv.find(a => a.startsWith(`--${name}=`))
  if (eq) return eq.split("=")[1]
  const i = argv.indexOf(`--${name}`)
  return i !== -1 ? (argv[i + 1]?.startsWith("--") ? "" : (argv[i + 1] ?? "")) : undefined
}
const tierFilter = flag("tier")
const perPyramid = argv.includes("--per-pyramid") || argv.includes("-p")

type Tally = {
  floors: number
  puzzles: number
  puzzleRewards: number
  junk: number
  wardGates: number
  floorKeys: number
  traps: number
  hidden: number
  fragments: number
  mosaic: number
  map: number
}

const empty = (): Tally => ({
  floors: 0,
  puzzles: 0,
  puzzleRewards: 0,
  junk: 0,
  wardGates: 0,
  floorKeys: 0,
  traps: 0,
  hidden: 0,
  fragments: 0,
  mosaic: 0,
  map: 0,
})

const countPuzzleRewards = (t: Tally, rewards?: Array<{ type: string } | undefined>) => {
  for (const r of rewards ?? []) if (r?.type === "consumable" || r?.type === "money") t.puzzleRewards++
}

const countSection = (t: Tally, s: SubSection) => {
  t.puzzles += s.pathPuzzles
  countPuzzleRewards(t, s.puzzleRewards)
  if (s.gate?.type === "tomb-key") t.wardGates++
  if (s.gate?.type === "floor-key") t.floorKeys++
  if (s.trapped) t.traps++
  if (s.hidden) t.hidden++
  tallyReward(t, s.endReward)
}

const tallyReward = (t: Tally, r?: { type: string }) => {
  if (!r) return
  if (r.type === "hieroglyphFragment") t.fragments++
  else if (r.type === "mosaicPiece") t.mosaic++
  else if (r.type === "mapPiece") t.map++
  else if (r.type === "sellable") t.junk++
}

const tallyFloors = (floors: FloorConfig[]): Tally => {
  const t = empty()
  for (const f of floors) {
    t.floors++
    t.puzzles += f.pathPuzzles
    countPuzzleRewards(t, f.puzzleRewards)
    tallyReward(t, f.mainEndReward)
    for (const s of f.sideSections) {
      countSection(t, s)
      for (const sub of s.sideSections ?? []) countSection(t, sub)
    }
  }
  return t
}

const tally = (journeyId: string): Tally => {
  const t = empty()
  for (const floors of generatedWorldConfigs[journeyId] ?? []) {
    const st = tallyFloors(floors)
    for (const k of Object.keys(t) as Array<keyof Tally>) t[k] += st[k]
  }
  return t
}

const cols: Array<[string, keyof Tally, number]> = [
  ["floors", "floors", 6],
  ["puzzles", "puzzles", 7],
  ["puzzRw", "puzzleRewards", 6],
  ["junk", "junk", 5],
  ["wards", "wardGates", 5],
  ["fKeys", "floorKeys", 5],
  ["traps", "traps", 5],
  ["hidden", "hidden", 6],
  ["frags", "fragments", 5],
  ["mosaic", "mosaic", 6],
  ["map", "map", 4],
]

const pad = (s: string | number, w: number) => String(s).padStart(w)

const idW = 26

const header = () => {
  const levW = 6
  console.log("journey".padEnd(idW) + pad("lvls", levW) + cols.map(([h, , w]) => pad(h, w + 1)).join(""))
  console.log("─".repeat(idW + levW + cols.reduce((s, [, , w]) => s + w + 1, 0)))
}

const row = (id: string, levels: number, t: Tally) => {
  console.log(id.padEnd(idW) + pad(levels, 6) + cols.map(([, k, w]) => pad(t[k], w + 1)).join(""))
}

const section = (title: string, journeys: Array<{ id: string; levels: number }>) => {
  if (journeys.length === 0) return
  console.log(`\n${title}`)
  header()
  const totals = empty()
  for (const j of journeys) {
    const sites = generatedWorldConfigs[j.id] ?? []
    if (perPyramid) {
      sites.forEach((floors, i) => row(`${j.id}#${i + 1}`, 1, tallyFloors(floors)))
    } else {
      row(j.id, j.levels, tally(j.id))
    }
    const t = tally(j.id)
    for (const k of Object.keys(totals) as Array<keyof Tally>) totals[k] += t[k]
  }
  row(
    "TOTAL",
    journeys.reduce((s, j) => s + j.levels, 0),
    totals
  )
}

const byTier = <T extends { tier: string }>(list: T[]) => (tierFilter ? list.filter(j => j.tier === tierFilter) : list)

section(
  "PYRAMIDS",
  byTier(PYRAMID_JOURNEYS).map(j => ({ id: j.id, levels: generatedWorldConfigs[j.id]?.length ?? 0 }))
)
section(
  "TOMBS",
  byTier(TOMB_JOURNEYS).map(j => ({ id: j.id, levels: generatedWorldConfigs[j.id]?.length ?? 0 }))
)
