import { SAVE_EPOCH } from "../saveEpoch"
import { INITIAL_STORAGE_VERSIONS } from "../state/useJourneys"

type Json = Record<string, unknown>

// Corridor cells are keyed `~<n>`; the floor restores them from the furthest room reached.
const isCorridor = (key: unknown) => typeof key === "string" && key.startsWith("~")

const trimJourney = (journey: Json): Json => {
  const { floorExploration, knownHiddenCorridors, exploredCells, ...rest } = journey
  void floorExploration
  void knownHiddenCorridors
  const out: Json = { ...rest, floorExplorationVersion: 0 }
  if (exploredCells && typeof exploredCells === "object") {
    const places: Record<string, unknown[]> = {}
    for (const [section, keys] of Object.entries(exploredCells as Record<string, unknown[]>)) {
      const kept = keys.filter(key => !isCorridor(key))
      if (kept.length > 0) places[section] = kept
    }
    if (Object.keys(places).length > 0) out.exploredCells = places
  }
  return out
}

/** The save without what play derives again (corridors, floor summaries) and the board in progress. */
export const trimSave = (data: Json): Json => {
  const { puzzleState, levelAnswers, ...rest } = data
  void puzzleState
  void levelAnswers
  if (!Array.isArray(rest.journeys)) return rest
  return { ...rest, journeys: (rest.journeys as Json[]).map(trimJourney) }
}

export type ImportCheck = { ok: true } | { ok: false; reason: "otherEpoch" | "newerGame" }

export const checkImport = (data: Json): ImportCheck => {
  if (data.saveEpoch !== SAVE_EPOCH) return { ok: false, reason: "otherEpoch" }
  const known = INITIAL_STORAGE_VERSIONS as Record<string, number>
  const versions = (data.storageVersions ?? {}) as Record<string, unknown>
  for (const [key, value] of Object.entries(versions))
    if (typeof value === "number" && value > (known[key] ?? 0)) return { ok: false, reason: "newerGame" }
  return { ok: true }
}
