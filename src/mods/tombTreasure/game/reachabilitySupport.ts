import type { ReachabilitySupport } from "@/worldGen/reachability"
import { TIER_UNLOCK_PERK_IDS } from "@/data/treasurePerks"
import { TOMB_PIECES_REQUIRED } from "./piecesRequired"

// The tomb-treasure mod's contribution to the world-gen reachability model — the currency-specific
// facts core reachability.ts must NOT name (docs/game-design/keys-and-locks-solver.md, §E). Injected via the
// mod descriptor → registeredMods → generateWorld → buildConfigs → placeFragments.
//   - bucketForReward: harvest both tomb-treasure rewards — a tomb-key to its own keyId bucket, a
//     map piece to its tomb's `mapPiece:<tombId>` bucket. Both live here (not on the map-piece
//     currency) so the currency exposes no `bucketForReward`, keeping map pieces out of
//     buildConfigs' spread-currency count check (they're validated by WORLD_TARGETS instead).
//   - journeyEntryLock: a treasure tomb is enterable once its `piecesRequired` map pieces are held
//     — the mod tying tomb entry to its own map-piece currency. Pyramids / non-tomb journeys: none.
//   - tierUnlockBucket: the difficulty ladder — a tier unlocks when ANY ONE of the previous tomb's
//     several tier-unlock treasures is held (the first tier has none). Core owns the tier concept;
//     the mod owns which keys unlock each.

// Per-tomb map-piece entry threshold (./piecesRequired). A tomb needs this many map pieces to
// enter; a non-treasure-tomb journey (a pyramid) has no entry lock.
const PIECES_REQUIRED = TOMB_PIECES_REQUIRED

export const TOMB_TREASURE_REACHABILITY: ReachabilitySupport = {
  bucketForReward: reward =>
    reward.type === "tombKey"
      ? (reward.keyId as string)
      : reward.type === "mapPiece"
        ? `mapPiece:${reward.tombId as string}`
        : undefined,
  journeyEntryLock: journeyId =>
    journeyId in PIECES_REQUIRED
      ? { bucket: `mapPiece:${journeyId}`, threshold: PIECES_REQUIRED[journeyId] }
      : undefined,
  tierUnlockBucket: tier => TIER_UNLOCK_PERK_IDS[tier],
}
