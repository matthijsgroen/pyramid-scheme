import type { JourneyDef, TombJourneyDef, Tier, PathPuzzlesRange } from "./types"
import { PYRAMID_STRUCTURES, TOMB_STRUCTURES } from "../data/journeyStructure"

export const WORLD_SEED = 42_195_837

// Main-path puzzle rooms on a tomb floor, per tier — authored structure, counted before the floor's
// own capstone, so a tomb floor's authored `pathPuzzles` is this + 1. Whichever mod dresses those
// rooms has to have content for every one of them, and fails the build if it doesn't.
export const TOMB_ROOMS_PER_FLOOR: Record<Tier, number> = {
  starter: 2,
  junior: 3,
  expert: 4,
  master: 5,
  wizard: 6,
}

// pathPuzzles is worldGen-only; merged with PYRAMID_STRUCTURES (single source of truth for id/tier/levelCount).
// Each entry is the puzzle-count progression across the journey's pyramids, first to last —
// explicit and authored, no implicit scaling applied anywhere else.
const PYRAMID_PATH_PUZZLES: Record<string, PathPuzzlesRange> = {
  starter_1: { start: 1, end: 1 },
  starter_2: { start: 1, end: 1 },
  starter_3: { start: 2, end: 4 },
  starter_4: { start: 2, end: 4 },
  junior_1: { start: 2, end: 4 },
  junior_2: { start: 3, end: 5 },
  junior_3: { start: 4, end: 6 },
  junior_4: { start: 3, end: 5 },
  expert_1: { start: 3, end: 5 },
  expert_2: { start: 4, end: 6 },
  expert_3: { start: 5, end: 7 },
  expert_4: { start: 4, end: 6 },
  master_1: { start: 4, end: 6 },
  master_2: { start: 6, end: 8 },
  master_3: { start: 6, end: 8 },
  master_4: { start: 5, end: 7 },
  wizard_1: { start: 7, end: 9 },
  wizard_2: { start: 7, end: 9 },
  wizard_3: { start: 7, end: 9 },
  wizard_4: { start: 7, end: 9 },
}

export const PYRAMID_JOURNEYS: JourneyDef[] = PYRAMID_STRUCTURES.map(s => ({
  ...s,
  tier: s.tier as Tier,
  pathPuzzles: PYRAMID_PATH_PUZZLES[s.id] ?? 3,
}))

export const TOMB_JOURNEYS: TombJourneyDef[] = TOMB_STRUCTURES.map(s => ({ ...s, tier: s.tier as Tier }))

// Hieroglyph data (TOMB_SYMBOLS, per-hieroglyph fragment requirements, the fragment matrix)
// lived here but is the hieroglyph mod's own — it now lives in
// src/mods/hieroglyph/game/hieroglyphData.ts (docs/mods/TARGET.md rule 2). Core reachability
// receives the gate threshold via injection; the serializer receives the required map via a
// parameter. Neither imports it. FRAGMENT_HOST_TIERS was unused and was dropped.

// ── Dev journey ───────────────────────────────────────────────────────────────

// The playtesting journey: one site per floor-topology feature, so a mechanic can be walked from the
// travel screen instead of ground up to. Declared here unconditionally; whether it is BUILT is
// configBuilder's INCLUDE_DEV gate, so `src/data/generatedWorld.ts` holds it only in a dev build.
//
// Kept OUT of PYRAMID_JOURNEYS on purpose: several passes read that array's per-tier declaration
// ORDER (the hieroglyph currency's tier-third ranking among them), so a journey appended to a real
// tier's list would move real fragments about. Its own list is read by id lookups only.
export const DEV_JOURNEY_ID = "dev_topology"

// One site per feature, walked from the journey's own map — pick the feature, enter it, no descent.
// `tier` is wizard so nothing auto-gates a way on to the next tier (there is none); the tier each
// floor is actually BUILT at is its own authored difficulty (spec/dev.ts). `pathPuzzles` is 0 for
// the reason spec/dev.ts gives: a bench stands its mechanic at the entrance, not behind solved rooms.
export const DEV_JOURNEYS: JourneyDef[] = [{ id: DEV_JOURNEY_ID, tier: "wizard", levelCount: 10, pathPuzzles: 0 }]
