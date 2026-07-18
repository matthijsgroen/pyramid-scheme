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

// N tableau rooms per REAL tomb floor (pyramid-interior-design.md §8). A tier's tomb may be split
// across several journeys once one tomb grew too large for a single exploration (§5); every floor of
// every tomb presents `TABLEAUS_PER_FLOOR[tier]` sequential tableau rooms.
//
// The authored story grid (objectsForStories / tableaus.json) is sized exactly
// `<global floors in tier> × <rooms per floor>` and keyed under the tier's PRIMARY tomb id. So a
// tableau's required symbols ARE the objects its authored story is about, matched by construction —
// no shuffled-pool slice that could drift (an earlier remap once made a "Fish for the Market"
// tableau require Ankh + Ra). `sourceRun` is the global 1-based floor index across every tomb of the
// tier (in tomb order); it indexes the grid, while the tomb's own id/floor are what world-gen and
// the player see. storySource records which (primaryTombId, run, room) triple each real (floor,room)
// maps to, so the lookup finds the existing story instead of falling back to placeholder text.

// Rooms per tomb floor, per tier — derived from the authored grid (max `_level<n>` under the tier's
// primary tomb) so it can never drift from what tableaus.json authors.
export const TABLEAUS_PER_FLOOR: Record<Difficulty, number> = (() => {
  const result = {} as Record<Difficulty, number>
  for (const difficulty of difficulties) {
    const primary = tombJourneys.find(j => j.difficulty === difficulty)
    if (!primary) throw new Error(`tableaus.ts: no tomb journey for difficulty "${difficulty}"`)
    let max = 0
    const prefix = `${primary.id}.run`
    for (const key of Object.keys(objectsForStories)) {
      if (!key.startsWith(prefix)) continue
      const m = key.match(/_level(\d+)$/)
      if (m) max = Math.max(max, Number(m[1]))
    }
    result[difficulty] = max
  }
  return result
})()

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

// Sequence a tier's authored grid cells so each descending floor introduces as few NEW tier-own
// hieroglyphs as possible, deferring first-appearance deep into the tomb. Without this, the N-rooms-
// per-floor grid drains the whole tier symbol pool in floors 1-2 (nothing new to collect for after),
// collapsing the collect-in-the-world / solve-in-the-tomb loop. Spreading first-appearance restores
// per-floor demand: a later floor stays unsolvable until you go collect its fresh fragments.
//
// The higher tombs (master/wizard) have many tableaus authored entirely around EARLIER-tier symbols;
// those land on the shallow floors, so the shallowest master/wizard floors gate on earlier-tier
// symbols (often deep-master glyphs for wizard) rather than their own — intentional backward pressure
// to finish the previous tier, not dead floors.
//
// No re-authoring: a cell's story still matches its own symbols by construction; only which physical
// (floor, room) presents which authored cell changes, and the stories are standalone vignettes with
// no cross-tableau continuity to disturb.

// Order cells so each pick adds the fewest new own-symbols to the running seen-set (tie-break:
// original grid order, for determinism). Yields a gentle ramp: known-symbol cells first, own-heavy
// cells last.
const orderByGradualReveal = <T extends { ids: string[] }>(cells: T[], own: Set<string>): T[] => {
  const seen = new Set<string>()
  const remaining = cells.map((c, i) => ({ c, i }))
  const result: T[] = []
  while (remaining.length) {
    let best = 0
    let bestNew = Infinity
    for (let j = 0; j < remaining.length; j++) {
      const nw = remaining[j].c.ids.filter(id => own.has(id) && !seen.has(id)).length
      if (nw < bestNew) {
        bestNew = nw
        best = j
      }
    }
    const [picked] = remaining.splice(best, 1)
    picked.c.ids.forEach(id => seen.add(id))
    result.push(picked.c)
  }
  return result
}

const tableauInventory: Record<string, string[]> = {}
const storySource: Record<string, { tombId: string; run: number; level: number }> = {}
difficulties.forEach(difficulty => {
  const tierTombs = tombJourneys.filter(j => j.difficulty === difficulty)
  const [primaryTomb] = tierTombs
  const roomsPerFloor = TABLEAUS_PER_FLOOR[difficulty]
  const totalFloors = tierTombs.reduce((sum, t) => sum + t.levelCount, 0)
  const own = new Set(TOMB_SYMBOLS[difficulty])

  // All authored grid cells for the tier (run 1..totalFloors × level 1..roomsPerFloor).
  const cells = [] as { run: number; level: number; ids: string[] }[]
  for (let run = 1; run <= totalFloors; run++) {
    for (let level = 1; level <= roomsPerFloor; level++) {
      cells.push({ run, level, ids: storyObjectIds(`${primaryTomb.id}.run${run}_level${level}`) })
    }
  }
  const ordered = orderByGradualReveal(cells, own)

  // Assign ordered cells to physical (tomb, floor, room) slots in descent order. A cell carries its
  // own authored (run, level) for the story lookup; physical placement is independent.
  let idx = 0
  for (const tomb of tierTombs) {
    for (let floor = 1; floor <= tomb.levelCount; floor++) {
      for (let room = 1; room <= roomsPerFloor; room++) {
        const cell = ordered[idx++]
        const key = `${tomb.id}.run${floor}_level${room}`
        storySource[key] = { tombId: primaryTomb.id, run: cell.run, level: cell.level }
        tableauInventory[key] = cell.ids
      }
    }
  }
})

// Every tomb symbol must be collectible — required by at least one tableau, so world-gen places its
// fragments and its count matches. Fail-fast safety net: the full N-rooms-per-floor grid now consumes
// every authored cell (all 58 symbols), so this normally patches nothing. Should the authored grid
// ever drop a symbol, patch it into a SECONDARY tomb's slot only (never a primary/curated story —
// those, including every tier's first tomb, keep matching their story exactly), walking each tier's
// secondary slots in turn before reusing one.
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
    const roomsPerFloor = TABLEAUS_PER_FLOOR[tomb.difficulty]
    for (let floor = 1; floor <= tomb.levelCount; floor++) {
      for (let room = 1; room <= roomsPerFloor; room++) {
        const key = `${tomb.id}.run${floor}_level${room}`
        const tableauSymbols = tableauInventory[key]
        const story = storySource[key]

        tableaus.push({
          id: `tab_${tomb.id}_r${floor}_l${room}`,
          levelNr: room,
          symbolCount: tomb.levelSettings.symbolCount,
          inventoryIds: tableauSymbols,
          tombJourneyId: tomb.id,
          runNumber: floor,
          name: getTableauTitle(story.tombId, story.run, story.level, t),
          description: getTableauDescription(story.tombId, story.run, story.level, tableauSymbols, t),
        })
      }
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
