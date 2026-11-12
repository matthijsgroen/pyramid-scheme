import { RELAID_FLOORS_VERSION } from "../SiteMap/relaidPyramids"
import { SAVE_EPOCH } from "../saveEpoch"
import { INITIAL_STORAGE_VERSIONS, MECHANISM_SLOT_VERSION } from "../state/useJourneys"

type Json = Record<string, unknown>
type Cells = Record<string, string[]>

// A corridor cell is filed as `<floor>/~<ordinal>`; a corridor's cells mostly carry consecutive ordinals.
const CORRIDOR = /^(.*~)(\d+)$/
const CORRIDOR_RANGE = /^(.*~)(\d+)-(\d+)$/

/** Runs of consecutive corridor ordinals under one floor become one `<floor>/~<first>-<last>` key. */
const rangeCorridors = (keys: string[]): string[] => {
  const runs = new Map<string, number[]>()
  const out: string[] = []
  for (const key of keys) {
    const match = CORRIDOR.exec(key)
    if (!match) out.push(key)
    else runs.set(match[1], [...(runs.get(match[1]) ?? []), Number(match[2])])
  }
  for (const [prefix, ordinals] of runs) {
    const sorted = [...new Set(ordinals)].sort((a, b) => a - b)
    let start = 0
    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === sorted[i - 1] + 1) continue
      const [first, last] = [sorted[start], sorted[i - 1]]
      out.push(first === last ? `${prefix}${first}` : `${prefix}${first}-${last}`)
      start = i
    }
  }
  return out
}

const expandCorridors = (keys: string[]): string[] =>
  keys.flatMap(key => {
    const match = CORRIDOR_RANGE.exec(key)
    if (!match) return [key]
    const [first, last] = [Number(match[2]), Number(match[3])]
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => `${match[1]}${first + i}`)
  })

const mapCells = (journey: Json, map: (keys: string[]) => string[]): Json => {
  const cells = journey.exploredCells
  if (!cells || typeof cells !== "object") return journey
  return {
    ...journey,
    exploredCells: Object.fromEntries(Object.entries(cells as Cells).map(([section, keys]) => [section, map(keys)])),
  }
}

const mapJourneys = (data: Json, map: (journey: Json) => Json): Json =>
  Array.isArray(data.journeys) ? { ...data, journeys: (data.journeys as Json[]).map(map) } : data

// Floor summaries are recomputed by the backfill for each floor the record names, so the names stay
// and the summaries go.
const trimJourney = (journey: Json): Json => {
  const { floorExploration, knownHiddenCorridors, ...rest } = journey
  void knownHiddenCorridors
  const out: Json = { ...rest, floorExplorationVersion: 0 }
  if (floorExploration && typeof floorExploration === "object")
    out.floorExploration = Object.fromEntries(
      Object.keys(floorExploration).map(key => [key, { open: false, keySets: [] }])
    )
  return mapCells(out, rangeCorridors)
}

/** The save without what play derives again (floor summaries) and the board in progress, with corridors
 * filed as ranges. */
export const trimSave = (data: Json): Json => {
  const { puzzleState, levelAnswers, ...rest } = data
  void puzzleState
  void levelAnswers
  return mapJourneys(rest, trimJourney)
}

/** A trimmed save with its corridor ranges filed cell by cell again, as play reads them. */
export const expandSave = (data: Json): Json => mapJourneys(data, journey => mapCells(journey, expandCorridors))

export type ImportCheck = { ok: true } | { ok: false; reason: "otherEpoch" | "newerGame" }

// Steps a journey has been through that this build cannot undo; a journey past them came from a newer game.
const JOURNEY_VERSIONS: Record<string, number> = {
  mechanismSlotVersion: MECHANISM_SLOT_VERSION,
  relaidFloorsVersion: RELAID_FLOORS_VERSION,
}

const isNewer = (versions: Record<string, unknown>, known: Record<string, number>) =>
  Object.entries(known).some(([key, version]) => {
    const value = versions[key]
    return typeof value === "number" && value > version
  })

export const checkImport = (data: Json): ImportCheck => {
  if (data.saveEpoch !== SAVE_EPOCH) return { ok: false, reason: "otherEpoch" }
  const versions = (data.storageVersions ?? {}) as Record<string, unknown>
  const known = INITIAL_STORAGE_VERSIONS as Record<string, number>
  for (const [key, value] of Object.entries(versions))
    if (typeof value === "number" && value > (known[key] ?? 0)) return { ok: false, reason: "newerGame" }
  const journeys = Array.isArray(data.journeys) ? (data.journeys as Json[]) : []
  if (journeys.some(journey => isNewer(journey ?? {}, JOURNEY_VERSIONS))) return { ok: false, reason: "newerGame" }
  return { ok: true }
}
