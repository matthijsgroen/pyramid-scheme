import { journeys as REAL_JOURNEYS } from "@/data/journeys"

// Per-tomb map-piece threshold, from the world data (journeys.ts): how many pieces of a tomb's map
// must be held before it can be entered. One home for the lookup — world-gen reachability reads it
// as an entry lock, the app reads it as the map-piece reward's progress denominator.
export const TOMB_PIECES_REQUIRED: Record<string, number> = Object.fromEntries(
  REAL_JOURNEYS.filter(j => j.type === "treasure_tomb").map(j => [j.id, j.piecesRequired])
)

// Falls back to the most common authored threshold for an unknown tomb, so a caller never divides
// by zero (matches the fallback the Travel screen already used).
export const piecesRequiredFor = (tombId: string): number => TOMB_PIECES_REQUIRED[tombId] ?? 4
