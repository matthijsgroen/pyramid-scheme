import type { Difficulty, FloorConfig, SideSection, SiteConfig, SubSection, TreasureReward } from "./types"
import { difficulties } from "@/data/difficultyLevels"
import { CARVE_FAMILY_QUERIES } from "@/game/encounterFallback"
import type { ResolveEncounter } from "@/game/siteAssembler"

// The designer reads the loot in the world here without opening the bake: every place a reward can
// stand (a puzzle room, a chest, a path end, a shop's stock slot), whether something stands in it,
// and how the tiers and levels fill. One walk over the configs, so the same
// function serves a baked world and a made-up one.
//
// Core counts reward types without knowing them: `reward.type` is an opaque string. The one question
// asked of a family is "is this section the shop?", put to the injected resolver through
// CARVE_FAMILY_QUERIES, so a world without the shop mod simply has no stock slots. What each currency
// is worth against its demand is not computed here: each mod reports its own `LootTotal`s and they
// are passed through.

export type LootSlotKind = "puzzle" | "chest" | "pathEnd" | "shopStock"

export type LootSlot = {
  journeyId: string
  levelNr: number
  floorIndex: number
  /** A readable path: "main", "side 2", "side 2.1", plus "#k" for the k-th puzzle or stock slot. */
  place: string
  kind: LootSlotKind
  tier: Difficulty
  hidden: boolean
  rewardType?: string
  reward?: TreasureReward
}

/** One currency's world total as its mod reports it. No `needed` means "reported, no demand". */
export type LootTotal = { label: string; found: number; needed?: number; unit?: "count" | "coins" }
export type LootTotalRow = LootTotal & { short?: number; surplus?: number }

export type Fill = { filled: number; total: number }
export type RewardCounts = Record<LootSlotKind, Record<string, number>>

export type LootRow = {
  puzzleRooms: number
  puzzlesWithLoot: number
  /** puzzlesWithLoot / puzzleRooms, 0 when there are no puzzle rooms. */
  share: number
  emptyPuzzleRooms: number
  chests: Fill
  pathEnds: Fill
  shopStock: Fill
  rewardTypes: RewardCounts
}
export type TierRow = LootRow & { tier: Difficulty }
export type LevelRow = LootRow & { journeyId: string; levelNr: number; tier: Difficulty }

export type LootReport = {
  slots: LootSlot[]
  byTier: TierRow[]
  byLevel: LevelRow[]
  unrewardedEnds: LootSlot[]
  totals: LootTotalRow[]
}

export type LootReportOptions = {
  resolveEncounter: ResolveEncounter
  totals: LootTotal[]
  journeyTier: (journeyId: string) => Difficulty | undefined
}

const KINDS: LootSlotKind[] = ["puzzle", "chest", "pathEnd", "shopStock"]

const emptyRow = (): LootRow => ({
  puzzleRooms: 0,
  puzzlesWithLoot: 0,
  share: 0,
  emptyPuzzleRooms: 0,
  chests: { filled: 0, total: 0 },
  pathEnds: { filled: 0, total: 0 },
  shopStock: { filled: 0, total: 0 },
  rewardTypes: { puzzle: {}, chest: {}, pathEnd: {}, shopStock: {} },
})

const addSlot = (row: LootRow, slot: LootSlot) => {
  const filled = slot.reward !== undefined
  if (slot.kind === "puzzle") {
    row.puzzleRooms++
    if (filled) row.puzzlesWithLoot++
    else row.emptyPuzzleRooms++
  } else {
    const fill = slot.kind === "chest" ? row.chests : slot.kind === "pathEnd" ? row.pathEnds : row.shopStock
    fill.total++
    if (filled) fill.filled++
  }
  if (slot.rewardType !== undefined) {
    const counts = row.rewardTypes[slot.kind]
    counts[slot.rewardType] = (counts[slot.rewardType] ?? 0) + 1
  }
  row.share = row.puzzleRooms === 0 ? 0 : row.puzzlesWithLoot / row.puzzleRooms
}

const slotOf = (
  where: Pick<LootSlot, "journeyId" | "levelNr" | "floorIndex" | "tier" | "hidden">,
  place: string,
  kind: LootSlotKind,
  reward: TreasureReward | undefined
): LootSlot => ({
  ...where,
  place,
  kind,
  ...(reward ? { rewardType: reward.type, reward } : {}),
})

export const buildLootReport = (
  configs: Record<string, SiteConfig[]>,
  { resolveEncounter, totals, journeyTier }: LootReportOptions
): LootReport => {
  const shopFamily = resolveEncounter(CARVE_FAMILY_QUERIES.fezShop, "shop").familyId
  const isShop = (encounter: SubSection["encounter"]) =>
    encounter !== undefined && resolveEncounter(encounter, "puzzle").familyId === shopFamily

  const slots: LootSlot[] = []
  const levels = new Map<string, { journeyId: string; levelNr: number; slots: LootSlot[] }>()

  Object.entries(configs).forEach(([journeyId, sites]) => {
    sites.forEach((floors, siteIdx) => {
      const levelNr = siteIdx + 1
      const level = { journeyId, levelNr, slots: [] as LootSlot[] }
      levels.set(`${journeyId}\u0000${levelNr}`, level)
      const push = (slot: LootSlot) => {
        slots.push(slot)
        level.slots.push(slot)
      }
      floors.forEach((floor: FloorConfig, floorIndex) => {
        const base = { journeyId, levelNr, floorIndex }
        const main = { ...base, tier: floor.difficulty, hidden: false }
        for (let k = 0; k < floor.pathPuzzles; k++) push(slotOf(main, `main #${k + 1}`, "puzzle", floor.rewards?.[k]))
        if (floor.exitOrStaircase === "exit" || floor.exitOrStaircase === "none")
          push(slotOf(main, "main", "chest", floor.mainEndReward))

        const walkSection = (s: SubSection, place: string, hiddenAbove: boolean) => {
          const where = { ...base, tier: s.difficulty, hidden: hiddenAbove || s.hidden === true }
          if (isShop(s.encounter)) {
            ;(s.rewards ?? []).forEach((reward, k) => push(slotOf(where, `${place} #${k + 1}`, "shopStock", reward)))
            return
          }
          for (let k = 0; k < s.pathPuzzles; k++) push(slotOf(where, `${place} #${k + 1}`, "puzzle", s.rewards?.[k]))
          if (s.end === "treasure") push(slotOf(where, place, "pathEnd", s.endReward))
        }
        floor.sideSections.forEach((side: SideSection, i) => {
          const place = `side ${i + 1}`
          walkSection(side, place, false)
          ;(side.sideSections ?? []).forEach((sub, j) => walkSection(sub, `${place}.${j + 1}`, side.hidden === true))
        })
      })
    })
  })

  const byTier: TierRow[] = difficulties.map(tier => ({ ...emptyRow(), tier }))
  for (const slot of slots) addSlot(byTier[difficulties.indexOf(slot.tier)], slot)

  const byLevel: LevelRow[] = [...levels.values()].map(({ journeyId, levelNr, slots: own }) => {
    const row: LevelRow = {
      ...emptyRow(),
      journeyId,
      levelNr,
      tier: journeyTier(journeyId) ?? own[0]?.tier ?? "starter",
    }
    for (const slot of own) addSlot(row, slot)
    return row
  })

  const unrewardedEnds = slots.filter(s => (s.kind === "chest" || s.kind === "pathEnd") && s.reward === undefined)

  const totalRows: LootTotalRow[] = totals.map(total => {
    if (total.needed === undefined) return { ...total }
    const diff = total.needed - total.found
    return { ...total, ...(diff > 0 ? { short: diff } : diff < 0 ? { surplus: -diff } : {}) }
  })

  return { slots, byTier, byLevel, unrewardedEnds, totals: totalRows }
}

const percent = (share: number) => `${Math.round(share * 100)}%`
const fill = (f: Fill) => `${f.filled}/${f.total}`

const typeCounts = (counts: Record<string, number>) => {
  const parts = Object.entries(counts)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([type, n]) => `${type} ${n}`)
  return parts.length === 0 ? "-" : parts.join(" · ")
}

const KIND_HEADERS: Record<LootSlotKind, string> = {
  puzzle: "Puzzle loot",
  chest: "Chest loot",
  pathEnd: "Path end loot",
  shopStock: "Shop stock",
}

const table = (firstColumn: string, rows: { first: string; row: LootRow }[]): string[] => {
  const header = [
    firstColumn,
    "Puzzle rooms",
    "With loot",
    "Share",
    "Empty",
    "Chests",
    "Path ends",
    "Shop stock",
    ...KINDS.map(k => KIND_HEADERS[k]),
  ]
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map(
      ({ first, row }) =>
        `| ${[
          first,
          row.puzzleRooms,
          row.puzzlesWithLoot,
          percent(row.share),
          row.emptyPuzzleRooms,
          fill(row.chests),
          fill(row.pathEnds),
          fill(row.shopStock),
          ...KINDS.map(k => typeCounts(row.rewardTypes[k])),
        ].join(" | ")} |`
    ),
    "",
  ]
}

const totalLine = (t: LootTotalRow): string => {
  const unit = t.unit === "coins" ? " coins" : ""
  const demand =
    t.needed === undefined
      ? "-"
      : t.short !== undefined
        ? `short ${t.short}`
        : t.surplus !== undefined
          ? `surplus ${t.surplus}`
          : "exact"
  return `| ${t.label} | ${t.found}${unit} | ${t.needed === undefined ? "-" : `${t.needed}${unit}`} | ${demand} |`
}

export const renderLootReportMarkdown = (report: LootReport): string => {
  const lines: string[] = [
    "# Loot report",
    "",
    "Written by `yarn loot-report` from `src/data/generatedWorld.ts`; not edited by hand.",
    "",
    "## Totals against demand",
    "",
    "| Currency | Found | Needed | Against demand |",
    "| --- | --- | --- | --- |",
    ...report.totals.map(totalLine),
    "",
    "## Per tier",
    "",
    ...table(
      "Tier",
      report.byTier.map(row => ({ first: row.tier, row }))
    ),
    "## Per journey",
    "",
  ]
  for (const tier of difficulties) {
    const levels = report.byLevel.filter(l => l.tier === tier)
    if (levels.length === 0) continue
    lines.push(
      `### ${tier}`,
      "",
      ...table(
        "Journey level",
        levels.map(l => ({ first: `${l.journeyId} ${l.levelNr}`, row: l }))
      )
    )
  }
  lines.push("## Loot ends without a reward in the spec", "")
  if (report.unrewardedEnds.length === 0) lines.push("None.")
  else
    for (const s of report.unrewardedEnds)
      lines.push(`- ${s.journeyId} level ${s.levelNr} floor ${s.floorIndex + 1}, ${s.place} (${s.kind}, ${s.tier})`)
  lines.push("")
  return lines.join("\n")
}
