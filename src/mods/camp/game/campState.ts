import { produce } from "immer"
import type { CampStepTable } from "./campSteps"

// The camp save holds facts by authoring name: the finds picked up, the parts recorded per structure, and
// the steps that have grown. What the camp shows is derived from those facts and the step table on every
// read, so a table change never strands a save: an id the table no longer knows stays in the save, inert.
export type CampSave = {
  version: 1
  finds: string[]
  parts: Record<string, string[]>
  grown: string[]
}

export const emptyCampSave = (): CampSave => ({ version: 1, finds: [], parts: {}, grown: [] })

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === "string")

const isCampSave = (value: unknown): value is CampSave => {
  if (typeof value !== "object" || value === null) return false
  const save = value as Record<string, unknown>
  if (save.version !== 1 || !isStringArray(save.finds) || !isStringArray(save.grown)) return false
  const parts = save.parts
  return (
    typeof parts === "object" && parts !== null && !Array.isArray(parts) && Object.values(parts).every(isStringArray)
  )
}

// Version 1 is the first camp save, so a stored value of any other shape starts the camp afresh.
export const readCampSave = (stored: unknown): CampSave => (isCampSave(stored) ? stored : emptyCampSave())

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

export const inPlace = (save: CampSave, table: CampStepTable): Set<string> => {
  const placed = new Set<string>()
  for (const entry of table) {
    const there =
      entry.source === "fixed" ||
      (entry.source === "found" && save.finds.includes(entry.id)) ||
      (entry.source === "grows" && save.grown.includes(entry.id)) ||
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
