/**
 * A tableau is a formula to decrypt by adding symbols to the tableau.
 * Each tableau is assigned to a specific treasure tomb journey and tells a thematic story.
 * Symbols are assigned progressively - each tomb gets new symbols plus access to previous tomb symbols.
 */

import { difficulties, type Difficulty } from "./difficultyLevels"
import { journeys, type TreasureTombJourney } from "./journeys"
import { allItems } from "./inventory"
import { objectsForStories } from "./objectsForStories"

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

const tombJourneys = journeys.filter((j): j is TreasureTombJourney => j.type === "treasure_tomb")

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
// so this is genuinely unused content, not a duplicate of the primary's. Every row DOES have a
// real hand-authored story in tableaus.json —
// the full run×level grid was always fully authored, just never read past level 1 — it's
// only ever filed under the PRIMARY tomb's id (e.g. "expert_treasure_tomb.run1_level2"), so
// `storySource` records which (tombId, run, level) triple each real tomb's floor actually
// came from, letting the lookup below find that existing story instead of falling back to
// generic placeholder text.
// A tableau's required symbols ARE the objects its authored story is about. objectsForStories is
// the authored symbol set per (tomb, run, level) — the same list every storyTemplate/description in
// tableaus.json was written against — so driving the inventory from it keeps the story and the
// puzzle in lockstep by construction. (An earlier remap sliced symbols from a shuffled pool
// independently, which drifted out of sync with the stories: a "Fish for the Market" tableau ended
// up requiring Ankh + Ra.)
const nameToId: Record<string, string> = {}
for (const item of allItems) nameToId[item.name] = item.id
const storyObjectIds = (storyKey: string): string[] => {
  const names = objectsForStories[storyKey as keyof typeof objectsForStories]
  if (!names) throw new Error(`tableaus.ts: no objectsForStories entry for "${storyKey}"`)
  return names.map(name => {
    const id = nameToId[name]
    if (!id) throw new Error(`tableaus.ts: no hieroglyph id for story object "${name}" (${storyKey})`)
    return id
  })
}

const tableauInventory: Record<string, string[]> = {}
const storySource: Record<string, { tombId: string; run: number; level: number }> = {}
difficulties.forEach(difficulty => {
  const tierTombs = tombJourneys.filter(j => j.difficulty === difficulty)
  const [primaryTomb, ...secondaryTombs] = tierTombs

  for (let floor = 1; floor <= primaryTomb.levelCount; floor++) {
    const key = `${primaryTomb.id}.run${floor}_level1`
    storySource[key] = { tombId: primaryTomb.id, run: floor, level: 1 }
    tableauInventory[key] = storyObjectIds(`${primaryTomb.id}.run${floor}_level1`)
  }

  secondaryTombs.forEach((tomb, i) => {
    const level = i + 2 // row 1 is the primary's
    for (let floor = 1; floor <= tomb.levelCount; floor++) {
      const key = `${tomb.id}.run${floor}_level1`
      // The real story for this content lives under the PRIMARY tomb's id at this row's
      // own level (it was always authored there, for the full grid) — never the secondary
      // tomb's own id, which has no story keys at all.
      storySource[key] = { tombId: primaryTomb.id, run: floor, level }
      tableauInventory[key] = storyObjectIds(`${primaryTomb.id}.run${floor}_level${level}`)
    }
  })
})

// Every tomb symbol must be collectible — required by at least one tableau, so world-gen places its
// fragments and its count matches. The 40 story entries the tomb floors actually consume cover 51 of
// the 58 symbols; the story set as authored simply never uses the remaining few in a consumed slot.
// Patch each such symbol into a SECONDARY tomb's slot only (never a primary/curated story — those,
// including every tier's first tomb, keep matching their story exactly). Walk each tier's secondary
// slots in turn before reusing one. A patched slot's first symbol no longer matches its story text,
// but that only affects a handful of higher-tier secondary ("bonus") tombs.
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

// The single tableau-resolution point: which authored TableauLevel a tomb floor presents, keyed
// by (journeyId, runNr, levelNr). Shared by world-gen fragment placement (keyRequirements.ts) and
// the play-time tableau puzzle (hieroglyph plugin) so the tableau the solver guarantees fragments
// for is byte-for-byte the tableau the player solves — the two used to derive symbols separately
// and could diverge (the played puzzle drew random symbols from the whole tier pool).
export const getTableauLevel = (journeyId: string, runNr: number, levelNr: number): TableauLevel | undefined =>
  tableauLevels.find(t => t.tombJourneyId === journeyId && t.runNumber === runNr && t.levelNr === levelNr)

// Export tomb configuration for other modules
export { TOMB_SYMBOLS, tableauLevels }
