/**
 * A tableau is a formula to decrypt by adding symbols to the tableau.
 * Each tableau is assigned to a specific treasure tomb journey and tells a thematic story.
 * Symbols are assigned progressively - each tomb gets new symbols plus access to previous tomb symbols.
 */

import { mulberry32, shuffle } from "@/game/random"
import { difficulties, type Difficulty } from "./difficultyLevels"
import { journeys, type TreasureTombJourney } from "./journeys"
import { allItems } from "./inventory"

export type TableauLevel = {
  id: string
  levelNr: number
  symbolCount: number
  inventoryIds: string[]
  tombJourneyId: string
  runNumber: number
  name: string
  description: string
}

// Translation function type
type TranslationFunction = (key: string) => string

// Symbol inventory for each tomb level
const TOMB_SYMBOLS: Record<Difficulty, string[]> = {
  starter: ["p10", "p8", "art1", "a6", "a8", "art5", "d1"],
  junior: ["p1", "p11", "p9", "a2", "a13", "art2", "art7", "art12", "d2", "d15"],
  expert: ["p2", "p3", "p7", "p12", "a5", "a7", "a11", "art3", "art4", "art6", "art14", "d3", "d4", "d9"],
  master: ["p4", "p5", "p14", "p15", "a1", "a3", "a14", "a15", "art9", "art10", "art11", "art15", "d5", "d6", "d10"],
  wizard: ["p6", "p13", "a4", "a9", "a10", "a12", "d7", "d8", "d11", "d12", "d13", "d14"],
}

// Get translated tomb name
export function getTombName(tombId: string, t?: TranslationFunction): string {
  if (t) {
    return t(`tombNames.${tombId}`)
  }

  // Fallback for when translation function is not available
  switch (tombId) {
    case "starter_treasure_tomb":
      return "Forgotten Merchant's Cache"
    case "junior_treasure_tomb":
      return "Noble's Hidden Vault"
    case "expert_treasure_tomb":
      return "High Priest's Treasury"
    case "master_treasure_tomb":
      return "Pharaoh's Secret Hoard"
    case "wizard_treasure_tomb":
      return "Vault of the Gods"
    default:
      return "Unknown Tomb"
  }
}

// Get translated story template name
function getTableauTitle(tombId: string, runNr: number, levelNr: number, t?: TranslationFunction): string {
  if (t) {
    return t(`storyTemplates.${tombId}.run${runNr}_level${levelNr}`)
  }

  // Fallback - capitalize and replace underscores
  return `Sacred tableau from ${getTombName(tombId)}`
}

// Get translated description
function getTableauDescription(
  tombId: string,
  runNr: number,
  levelNr: number,
  tableauSymbols: string[],
  t?: TranslationFunction
): string {
  if (t) {
    return t(`descriptions.${tombId}.run${runNr}_level${levelNr}`)
  }

  // Fallback description
  return tableauSymbols.map(symbol => allItems.find(item => item.id === symbol)?.name).join(", ") || "Unknown symbols."
}

const random = mulberry32(9248529837592)

const tombJourneys = journeys.filter((j): j is TreasureTombJourney => j.type === "treasure_tomb")

const collectAllAvailableSymbols = (difficulties: Difficulty[]) =>
  difficulties.flatMap(difficulty => TOMB_SYMBOLS[difficulty] || [])

// Grind-era generation, untouched: one shuffle per difficulty, cumulative symbol pool,
// same shared `random` sequence/order this always used. Every hand-authored story in
// tableaus.json was written against these exact draws — the shuffle itself must never change.
const shuffledSymbolsByDifficulty = {} as Record<Difficulty, string[]>
difficulties.forEach((difficulty, i, list) => {
  const symbols = collectAllAvailableSymbols(list.slice(0, i + 1))
  shuffledSymbolsByDifficulty[difficulty] = shuffle(symbols, random)
})

// Remap: one tableau per REAL tomb floor — matches the exploration-based world (one
// walk-through, not repeated grind-runs), not the original per-treasure grind loop.
// `runNumber` is the tomb's own 1-based floor index; `levelNr` is always 1 (a floor has
// exactly one tableau puzzle now, no "levels within a run").
//
// The original grid was `treasureIndex × level` — for wizard (levelCount 4, 4 treasures)
// that's 16 cells, but only the `level 1` row (4 cells, one per run) was ever read, since
// a floor only ever queried (run, level=1). This remap treats the grid as `levelCount`
// ROWS (one per level) and slices a whole row per REAL tomb of the tier: row 1 (level 1)
// goes to the tier's PRIMARY tomb — the EXACT original cells, so every hand-authored story
// in tableaus.json keeps matching its tableau's symbols byte-for-byte. Row 2, 3, ... go to
// each SECONDARY tomb in turn (split off once a single tomb got too large for exploration —
// pyramid-interior-design.md §5) — rows the original grid always generated but never read,
// so this is genuinely unused content, not a duplicate of the primary's (the old code's
// bug: it keyed inventory by *difficulty*, so secondaries silently reused the primary's
// exact `level 1` cells). Every row DOES have a real hand-authored story in tableaus.json —
// the full run×level grid was always fully authored, just never read past level 1 — it's
// only ever filed under the PRIMARY tomb's id (e.g. "expert_treasure_tomb.run1_level2"), so
// `storySource` records which (tombId, run, level) triple each real tomb's floor actually
// came from, letting the lookup below find that existing story instead of falling back to
// generic placeholder text.
const tableauInventory: Record<string, string[]> = {}
const storySource: Record<string, { tombId: string; run: number; level: number }> = {}
difficulties.forEach(difficulty => {
  const tierTombs = tombJourneys.filter(j => j.difficulty === difficulty)
  const [primaryTomb, ...secondaryTombs] = tierTombs
  const pool = shuffledSymbolsByDifficulty[difficulty]
  const poolSlice = (start: number, count: number) =>
    Array.from({ length: count }, (_, s) => pool[(start + s) % pool.length])

  // Row start position uses the SAME formula/scaling constants (primary's own levelCount
  // and symbolCount) the original grid was built with — only the slice LENGTH taken from
  // that position is each real tomb's own symbolCount, which can differ from the primary's
  // (e.g. master_treasure_tomb vs. master_treasure_tomb_b).
  const rowCellStart = (level: number, run: number): number =>
    (run - 1) * primaryTomb.levelCount * primaryTomb.levelSettings.symbolCount +
    level * primaryTomb.levelSettings.symbolCount -
    1

  for (let floor = 1; floor <= primaryTomb.levelCount; floor++) {
    const key = `${primaryTomb.id}.run${floor}_level1`
    tableauInventory[key] = poolSlice(rowCellStart(1, floor), primaryTomb.levelSettings.symbolCount)
    storySource[key] = { tombId: primaryTomb.id, run: floor, level: 1 }
  }

  secondaryTombs.forEach((tomb, i) => {
    const level = i + 2 // row 1 is the primary's
    for (let floor = 1; floor <= tomb.levelCount; floor++) {
      const key = `${tomb.id}.run${floor}_level1`
      tableauInventory[key] = poolSlice(rowCellStart(level, floor), tomb.levelSettings.symbolCount)
      // The real story for this content lives under the PRIMARY tomb's id at this row's
      // own level (it was always authored there, for the full grid) — never the secondary
      // tomb's own id, which has no story keys at all.
      storySource[key] = { tombId: primaryTomb.id, run: floor, level }
    }
  })
})

// Coverage completion: row-slicing above still doesn't guarantee every hieroglyph symbol
// gets hit (confirmed empirically: 3 of 58 fall through). Every symbol must be collectible,
// so patch any gap into a SECONDARY tomb's slot only (never primary, which would disturb a
// curated story) — the first secondary-tomb (tomb, floor) slot in a tier at or after the
// symbol's origin tier (pools are cumulative, so a later tier's tomb already carries
// earlier symbols), walking through every available slot before reusing one.
;(() => {
  const usedSymbols = new Set(Object.values(tableauInventory).flat())
  const tierOf: Record<string, Difficulty> = {}
  for (const [tier, ids] of Object.entries(TOMB_SYMBOLS) as [Difficulty, string[]][]) {
    for (const id of ids) tierOf[id] = tier
  }
  const patchSlotsByTier = new Map<Difficulty, string[]>()
  for (const tomb of tombJourneys) {
    const tierTombs = tombJourneys.filter(j => j.difficulty === tomb.difficulty)
    if (tierTombs[0] === tomb) continue // primary — never patched
    const slots = patchSlotsByTier.get(tomb.difficulty) ?? []
    for (let floor = 1; floor <= tomb.levelCount; floor++) slots.push(`${tomb.id}.run${floor}_level1`)
    patchSlotsByTier.set(tomb.difficulty, slots)
  }
  const patchCursor = new Map<Difficulty, number>()

  for (const id of Object.values(TOMB_SYMBOLS).flat()) {
    if (usedSymbols.has(id)) continue
    const originTierIdx = difficulties.indexOf(tierOf[id])
    const targetTierIdx = difficulties.findIndex(
      (d, i) => i >= originTierIdx && (patchSlotsByTier.get(d)?.length ?? 0) > 0
    )
    if (targetTierIdx === -1)
      throw new Error(`tableaus.ts: no secondary tomb slot available to patch missing symbol "${id}"`)
    const targetTier = difficulties[targetTierIdx]
    const slots = patchSlotsByTier.get(targetTier)!
    const cursor = patchCursor.get(targetTier) ?? 0
    const key = slots[cursor % slots.length]
    patchCursor.set(targetTier, cursor + 1)
    tableauInventory[key] = [id, ...tableauInventory[key].slice(1)]
    usedSymbols.add(id)
  }
})()

// Generate all tableau levels with i18n support
export function generateTableaus(t?: TranslationFunction): TableauLevel[] {
  const tableaus: TableauLevel[] = []

  tombJourneys.forEach(tomb => {
    for (let floor = 1; floor <= tomb.levelCount; floor++) {
      const key = `${tomb.id}.run${floor}_level1`
      const tableauSymbols = tableauInventory[key]
      const story = storySource[key]

      tableaus.push({
        id: `tab_${tomb.id}_r${floor}_l1`,
        levelNr: 1,
        symbolCount: tomb.levelSettings.symbolCount,
        inventoryIds: tableauSymbols,
        tombJourneyId: tomb.id,
        runNumber: floor,
        name: getTableauTitle(story.tombId, story.run, story.level, t),
        description: getTableauDescription(story.tombId, story.run, story.level, tableauSymbols, t),
      })
    }
  })

  return tableaus
}

const tableauLevels = generateTableaus()

// Export tomb configuration for other modules
export { TOMB_SYMBOLS, tableauLevels }
