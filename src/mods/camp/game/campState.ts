import { produce } from "immer"
import type { CampStepEntry, CampStepTable } from "./campSteps"

// The camp save holds facts by authoring name: the finds picked up, the parts recorded per structure, the
// steps that have grown, and the bought steps that have arrived. What the camp shows is derived from those
// facts and the step table on every read, so a table change never strands a save: an id the table no longer
// knows stays in the save, inert.
export type CampSave = {
  version: 2
  finds: string[]
  parts: Record<string, string[]>
  grown: string[]
  arrived: string[]
}

export const emptyCampSave = (): CampSave => ({ version: 2, finds: [], parts: {}, grown: [], arrived: [] })

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === "string")

const isCampSaveV1 = (save: Record<string, unknown>): boolean => {
  if (!isStringArray(save.finds) || !isStringArray(save.grown)) return false
  const parts = save.parts
  return (
    typeof parts === "object" && parts !== null && !Array.isArray(parts) && Object.values(parts).every(isStringArray)
  )
}

const isCampSaveV2 = (save: Record<string, unknown>): boolean => isCampSaveV1(save) && isStringArray(save.arrived)

// One branch per save version. A version 1 save predates purchases, so nothing has arrived in it. A version
// this build does not know (a save from a newer build) or a damaged save is unreadable, never guessed at.
const readable = (stored: unknown): CampSave | undefined => {
  if (typeof stored !== "object" || stored === null) return undefined
  const save = stored as Record<string, unknown>
  switch (save.version) {
    case 1:
      return isCampSaveV1(save)
        ? { ...(stored as Omit<CampSave, "version" | "arrived">), version: 2, arrived: [] }
        : undefined
    case 2:
      return isCampSaveV2(save) ? (stored as CampSave) : undefined
    default:
      return undefined
  }
}

// An unreadable save shows as the empty camp.
export const readCampSave = (stored: unknown): CampSave => readable(stored) ?? emptyCampSave()

// A change to the stored camp. Nothing stored starts from the empty camp; a stored value this build cannot
// read is handed back untouched, so a newer or damaged save is never overwritten by an empty one.
export const updateCampSave = (stored: unknown, action: (save: CampSave) => CampSave): unknown => {
  if (stored === null || stored === undefined) return action(emptyCampSave())
  const save = readable(stored)
  return save === undefined ? stored : action(save)
}

export const recordFind = produce((save: CampSave, step: string) => {
  if (!save.finds.includes(step)) save.finds.push(step)
})

export const recordPart = produce((save: CampSave, structure: string, part: string) => {
  const parts = (save.parts[structure] ??= [])
  if (!parts.includes(part)) parts.push(part)
})

// One stage per call: a step grows when everything it grows from is in place in the save as given, so a
// stage that becomes ready through this growth waits for the next homecoming.
export const growCamp = (save: CampSave, table: CampStepTable): CampSave => {
  const placed = inPlace(save, table)
  const ready = table.filter(
    entry =>
      entry.source === "grows" &&
      !save.grown.includes(entry.id) &&
      (entry.growsFrom ?? []).every(from => placed.has(from))
  )
  if (ready.length === 0) return save
  return produce(save, draft => {
    for (const entry of ready) draft.grown.push(entry.id)
  })
}

// An animal or a cart is ordered from Fez, not carried home: a bought step arrives on the homecoming after its
// purchase is held, every step of one purchase at once. Once arrived it stays, whatever the held keys say later.
const arrivingSteps = (save: CampSave, table: CampStepTable, held: ReadonlySet<string>): CampStepEntry[] =>
  table.filter(
    entry =>
      entry.source === "bought" &&
      entry.purchase !== undefined &&
      held.has(entry.purchase) &&
      !save.arrived.includes(entry.id)
  )

const distinct = (facts: (string | undefined)[]): string[] => [
  ...new Set(facts.filter((fact): fact is string => fact !== undefined)),
]

// The purchases whose steps would arrive on a homecoming now, each once.
export const arrivingPurchases = (save: CampSave, table: CampStepTable, held: ReadonlySet<string>): string[] =>
  distinct(arrivingSteps(save, table, held).map(entry => entry.purchase))

// The purchases that have a step standing in the camp, each once.
export const arrivedPurchases = (save: CampSave, table: CampStepTable): string[] =>
  distinct(table.filter(entry => entry.source === "bought" && save.arrived.includes(entry.id)).map(e => e.purchase))

// The tag the home carries for a purchase that has come to stand in the camp.
export const arrivedTag = (purchase: string): string => `camp.arrived:${purchase}`

export const arrive = (save: CampSave, table: CampStepTable, held: ReadonlySet<string>): CampSave => {
  const arriving = arrivingSteps(save, table, held)
  if (arriving.length === 0) return save
  return produce(save, draft => {
    for (const entry of arriving) draft.arrived.push(entry.id)
  })
}

// Coming home: what was bought arrives and the camp grows one stage, both judged on the save as it stood on
// arriving home. Arrival reads only the held keys and what has arrived, which growing never touches, and growing
// is judged before arrivals land.
export const comeHome = (save: CampSave, table: CampStepTable, held: ReadonlySet<string>): CampSave =>
  arrive(growCamp(save, table), table, held)

export const inPlace = (save: CampSave, table: CampStepTable): Set<string> => {
  const placed = new Set<string>()
  for (const entry of table) {
    const there =
      entry.source === "fixed" ||
      (entry.source === "found" && save.finds.includes(entry.id)) ||
      (entry.source === "grows" && save.grown.includes(entry.id)) ||
      (entry.source === "bought" && save.arrived.includes(entry.id)) ||
      (entry.source === "structure" && (entry.parts ?? []).every(part => save.parts[entry.id]?.includes(part)))
    if (there) placed.add(entry.id)
  }
  return placed
}

export const campFound = (save: CampSave, table: CampStepTable): Record<string, string[]> => {
  const placed = inPlace(save, table)
  const found: Record<string, string[]> = {}
  for (const entry of table) if (placed.has(entry.id)) (found[entry.spot] ??= []).push(entry.id)
  return found
}

export const structureProgress = (
  save: CampSave,
  table: CampStepTable,
  structure: string
): { found: string[]; total: string[] } => {
  const entry = table.find(e => e.id === structure && e.source === "structure")
  const total = [...(entry?.parts ?? [])]
  return { found: total.filter(part => save.parts[structure]?.includes(part)), total }
}

export const startedStructures = (save: CampSave, table: CampStepTable): string[] =>
  table
    .filter(entry => entry.source === "structure" && structureProgress(save, table, entry.id).found.length > 0)
    .map(entry => entry.id)

export const spotProgress = (save: CampSave, table: CampStepTable, spot: string): { found: number; total: number } => {
  const placed = inPlace(save, table)
  const counted = table.filter(
    entry => entry.spot === spot && (entry.source === "found" || entry.source === "structure")
  )
  return { found: counted.filter(entry => placed.has(entry.id)).length, total: counted.length }
}

export const hasStandingStructure = (save: CampSave, table: CampStepTable): boolean => {
  const placed = inPlace(save, table)
  return table.some(entry => entry.source === "structure" && placed.has(entry.id))
}
