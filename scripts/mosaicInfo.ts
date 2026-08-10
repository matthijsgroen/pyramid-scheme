#!/usr/bin/env tsx
/**
 * Prints what the stained-glass window is made of and where its glass comes from.
 * Run: yarn mosaic-info [--panel=<starter|junior|expert|master|wizard>] [--list]
 *   --panel   restrict every section to one register/panel
 *   --list    print every individual drop site instead of just the summaries
 *
 * Two different "counts" live here and are easy to confuse:
 *   polygons — the traced shapes in mosaicPieces.generated.ts (what you SEE in the window)
 *   drops    — the mosaicPiece rewards scattered through the world (what you COLLECT)
 * One drop reveals one reveal-order step, and a step can carry several polygons, so the two
 * numbers differ by design. See mosaicRevealOrder.ts.
 */
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "../src/worldGen/data"
import { MOSAIC_TIERS, MOSAIC_STEPS_BY_TIER, type MosaicTier } from "../src/mods/mosaic/game/mosaicCurrency"
import { LEVEL_STEPS, PIECES_BY_STEP } from "../src/mods/mosaic/game/mosaicRevealOrder"
import { MOSAIC_PIECES } from "../src/ui/atoms/mosaicPieces.generated"
import type { FloorConfig, TreasureReward } from "../src/game/siteTypes"

const argv = process.argv.slice(2)
const flag = (name: string) => {
  const eq = argv.find(a => a.startsWith(`--${name}=`))
  if (eq) return eq.split("=")[1]
  const i = argv.indexOf(`--${name}`)
  return i !== -1 ? (argv[i + 1]?.startsWith("--") ? "" : (argv[i + 1] ?? "")) : undefined
}
const panelFilter = flag("panel") as MosaicTier | undefined
const listAll = argv.includes("--list") || argv.includes("-l")

const tiers = panelFilter ? MOSAIC_TIERS.filter(t => t === panelFilter) : [...MOSAIC_TIERS]

// register_0 is the top register (starter) and they run down the window in tier order — the same
// order mosaicRevealOrder.ts reads them in.
const registerOf = (tier: MosaicTier) => `register_${MOSAIC_TIERS.indexOf(tier)}`

const journeyTier = new Map<string, string>()
for (const j of [...PYRAMID_JOURNEYS, ...TOMB_JOURNEYS]) journeyTier.set(j.id, j.tier)

/** One mosaicPiece reward found in the generated world, with everything about where it sits. */
type Drop = {
  tier: MosaicTier
  journeyId: string
  /** Journey difficulty — differs from `tier` whenever a wing of another difficulty hosts the glass. */
  hostTier: string
  /** 1-based site (level) within the journey. */
  site: number
  /** 0-based floor within the site; 0 is the surface. */
  floor: number
  /** Which path on the floor: the main one, a side section, or a nested sub-section. */
  place: "main" | "side" | "sub"
  /** Which slot on that path: its treasure end, or an intermediate puzzle room. */
  slot: "end" | "room"
  /** The node's own difficulty — what mosaicCurrency's `eligible` matched on. */
  nodeDifficulty: string
  hidden: boolean
  gate?: string
  path: string
}

const drops: Drop[] = []

const collect = (
  reward: TreasureReward | undefined,
  where: Omit<Drop, "tier" | "hostTier"> & { tier?: MosaicTier }
): void => {
  if (reward?.type !== "mosaicPiece") return
  const tier = reward.tier as MosaicTier
  drops.push({ ...where, tier, hostTier: journeyTier.get(where.journeyId) ?? "?" })
}

// A path can carry glass in two places: its treasure end (`endReward`) and any of its intermediate
// puzzle rooms (`rewards[i]`). Capped filler reaches both — unlike the gating currencies, which are
// restricted to path ends — so both must be walked or the tally comes up short.
const walkFloor = (journeyId: string, site: number, floor: number, f: FloorConfig): void => {
  const base = { journeyId, site, floor, hidden: false, gate: undefined as string | undefined }

  const walkPath = (
    node: { endReward?: TreasureReward; rewards?: (TreasureReward | undefined)[]; difficulty: string },
    place: Drop["place"],
    label: string,
    extra: { hidden?: boolean; gate?: string } = {}
  ) => {
    const at = { ...base, ...extra, place, nodeDifficulty: node.difficulty }
    collect(node.endReward, { ...at, slot: "end", path: `${label}-end` })
    node.rewards?.forEach((r, i) => collect(r, { ...at, slot: "room", path: `${label}-room${i}` }))
  }

  walkPath({ endReward: f.mainEndReward, rewards: f.rewards, difficulty: f.difficulty }, "main", "main")
  f.sideSections.forEach((s, si) => {
    const at = { hidden: s.hidden === true, gate: s.gate?.type }
    walkPath(s, "side", `side${si}`, at)
    ;(s.sideSections ?? []).forEach((sub, bi) =>
      walkPath(sub, "sub", `side${si}.${bi}`, { hidden: sub.hidden === true, gate: sub.gate?.type })
    )
  })
}

for (const [journeyId, sites] of Object.entries(generatedWorldConfigs)) {
  sites.forEach((floors, siteIdx) => floors.forEach((f, floorIdx) => walkFloor(journeyId, siteIdx + 1, floorIdx, f)))
}

const shown = drops.filter(d => tiers.includes(d.tier))

const pad = (s: string | number, w: number) => String(s).padStart(w)
const padEnd = (s: string | number, w: number) => String(s).padEnd(w)
const rule = (w: number) => console.log("─".repeat(w))

// ── Panels ───────────────────────────────────────────────────────────────────────────────────
// What the window is made of: polygons drawn vs drops needed to draw them.
console.log("\nPANELS — the window's five registers, one per difficulty")
console.log(
  padEnd("panel", 12) +
    padEnd("tier", 9) +
    pad("polys", 7) +
    pad("drops", 7) +
    pad("poly/drop", 11) +
    pad("placed", 8) +
    pad("short", 7)
)
rule(61)

let totalPolys = 0
let totalDrops = 0
let totalPlaced = 0
for (const tier of tiers) {
  const register = registerOf(tier)
  const polys = MOSAIC_PIECES.filter(p => p.zoneId === register).length
  const dropCount = MOSAIC_STEPS_BY_TIER[tier]
  const placed = drops.filter(d => d.tier === tier).length
  totalPolys += polys
  totalDrops += dropCount
  totalPlaced += placed
  console.log(
    padEnd(register, 12) +
      padEnd(tier, 9) +
      pad(polys, 7) +
      pad(dropCount, 7) +
      pad(dropCount === 0 ? "—" : (polys / dropCount).toFixed(1), 11) +
      pad(placed, 8) +
      pad(dropCount - placed, 7)
  )
}
rule(61)
console.log(
  padEnd("TOTAL", 21) +
    pad(totalPolys, 7) +
    pad(totalDrops, 7) +
    pad(totalDrops === 0 ? "—" : (totalPolys / totalDrops).toFixed(1), 11) +
    pad(totalPlaced, 8) +
    pad(totalDrops - totalPlaced, 7)
)
if (!panelFilter && LEVEL_STEPS.length !== totalDrops) {
  console.log(`\n  ⚠ reveal steps (${LEVEL_STEPS.length}) ≠ drops (${totalDrops})`)
}
const emptySteps = LEVEL_STEPS.filter(s => !PIECES_BY_STEP.has(`${s.journeyId}:${s.levelIndex}`)).length
if (emptySteps > 0) console.log(`\n  ⚠ ${emptySteps} reveal step(s) carry no polygon — a drop that shows nothing`)

// ── Host journeys ────────────────────────────────────────────────────────────────────────────
// A panel's glass comes from nodes of its own difficulty, but those nodes can sit inside a journey
// of another tier (a starter wing in a wizard tomb), so panel tier ≠ host journey tier in general.
console.log("\nHOST JOURNEY TIER — which journeys a panel's glass actually drops in")
const hostTiers = [...new Set(drops.map(d => d.hostTier))].sort(
  (a, b) => MOSAIC_TIERS.indexOf(a as MosaicTier) - MOSAIC_TIERS.indexOf(b as MosaicTier)
)
console.log(padEnd("panel tier", 12) + hostTiers.map(t => pad(t, 9)).join("") + pad("journeys", 10))
rule(12 + hostTiers.length * 9 + 10)
for (const tier of tiers) {
  const mine = drops.filter(d => d.tier === tier)
  const journeys = new Set(mine.map(d => d.journeyId)).size
  console.log(
    padEnd(tier, 12) +
      hostTiers.map(h => pad(mine.filter(d => d.hostTier === h).length || "·", 9)).join("") +
      pad(journeys, 10)
  )
}

const offTier = drops.filter(d => d.nodeDifficulty !== d.tier)
console.log(
  offTier.length === 0
    ? "\n  ✓ every drop sits on a node of its own panel's difficulty (mosaicCurrency's `eligible`)"
    : `\n  ⚠ ${offTier.length} drop(s) on a node whose difficulty ≠ their panel's tier`
)

// ── Placement shape ──────────────────────────────────────────────────────────────────────────
// How hard the glass is to reach. Mosaic is capped filler placed after every gating currency, so
// it inherits the leftovers — including hidden corridors, which gating currencies may never use.
console.log("\nPLACEMENT — how the drops sit on a floor")
console.log(
  padEnd("panel", 12) +
    pad("drops", 7) +
    pad("main", 6) +
    pad("side", 6) +
    pad("sub", 5) +
    pad("pathEnd", 9) +
    pad("room", 6) +
    pad("hidden", 8) +
    pad("gated", 7) +
    pad("surface", 9) +
    pad("deeper", 8)
)
rule(83)
const shapeRow = (label: string, list: Drop[]) =>
  console.log(
    padEnd(label, 12) +
      pad(list.length, 7) +
      pad(list.filter(d => d.place === "main").length, 6) +
      pad(list.filter(d => d.place === "side").length, 6) +
      pad(list.filter(d => d.place === "sub").length, 5) +
      pad(list.filter(d => d.slot === "end").length, 9) +
      pad(list.filter(d => d.slot === "room").length, 6) +
      pad(list.filter(d => d.hidden).length, 8) +
      pad(list.filter(d => d.gate).length, 7) +
      pad(list.filter(d => d.floor === 0).length, 9) +
      pad(list.filter(d => d.floor > 0).length, 8)
  )
for (const tier of tiers)
  shapeRow(
    tier,
    drops.filter(d => d.tier === tier)
  )
rule(83)
shapeRow("TOTAL", shown)

// ── Busiest journeys ─────────────────────────────────────────────────────────────────────────
console.log("\nTOP JOURNEYS BY DROPS")
const perJourney = new Map<string, Drop[]>()
for (const d of shown) perJourney.set(d.journeyId, [...(perJourney.get(d.journeyId) ?? []), d])
const ranked = [...perJourney.entries()].sort((a, b) => b[1].length - a[1].length)
console.log(padEnd("journey", 20) + pad("drops", 7) + "  panels")
rule(60)
for (const [journeyId, list] of ranked.slice(0, listAll ? ranked.length : 12)) {
  const panels = MOSAIC_TIERS.filter(t => list.some(d => d.tier === t)).join(", ")
  console.log(padEnd(journeyId, 20) + pad(list.length, 7) + "  " + panels)
}
if (!listAll && ranked.length > 12) console.log(`  … ${ranked.length - 12} more (use --list)`)

// ── Every drop ───────────────────────────────────────────────────────────────────────────────
if (listAll) {
  console.log("\nEVERY DROP")
  console.log(padEnd("panel", 9) + padEnd("journey", 20) + pad("site", 5) + pad("floor", 6) + "  where")
  rule(70)
  for (const d of shown) {
    const notes = [d.hidden ? "hidden" : "", d.gate ? `gate:${d.gate}` : ""].filter(Boolean).join(" ")
    console.log(
      padEnd(d.tier, 9) +
        padEnd(d.journeyId, 20) +
        pad(d.site, 5) +
        pad(d.floor, 6) +
        "  " +
        `${d.path}${notes ? ` (${notes})` : ""}`
    )
  }
}

console.log("")
