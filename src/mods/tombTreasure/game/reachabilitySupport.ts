import type { ReachabilitySupport } from "@/worldGen/reachability"
import { TIER_UNLOCK_PERK_IDS } from "@/data/treasurePerks"
import { TOMB_PIECES_REQUIRED } from "./piecesRequired"
import { TREASURE_PERKS, type TreasurePerk } from "./treasurePerks"

// The tomb-treasure mod's contribution to the world-gen reachability model — the currency-specific
// facts core reachability.ts must NOT name (docs/game-design/keys-and-locks-solver.md, §E). Injected via the
// mod descriptor → registeredMods → generateWorld → buildConfigs → placeFragments.
//   - bucketForReward: harvest both tomb-treasure rewards — a tomb-key to its own keyId bucket, a
//     map piece to its tomb's `mapPiece:<tombId>` bucket. Both live here (not on the map-piece
//     currency) so the currency exposes no `bucketForReward`, keeping map pieces out of
//     buildConfigs' spread-currency count check (they're validated by WORLD_TARGETS instead).
//   - journeyEntryLocks: one lock per treasure tomb — enterable once its `piecesRequired` map pieces
//     are held, the mod tying tomb entry to its own map-piece currency. Pyramids / non-tomb
//     journeys: none.
//   - tierUnlockGroups: the difficulty ladder — one group per tier, met when ANY ONE of the previous
//     tomb's several tier-unlock treasures is held (the first tier has none). Core owns the tier
//     concept and ANDs this group with any other mod's; the mod owns which keys unlock each.
//   - alsoHarvests + hiddenRequirement: the corridor detector. A `detection` perk of level n holds
//     `detector:corridor:<k>` for every k ≤ n, and a hidden section needs level 1, since level 1 is what
//     lets a player step onto a hidden junction (useCorridorDetection.ts).

// Per-tomb map-piece entry threshold (./piecesRequired). A tomb needs this many map pieces to
// enter; a non-treasure-tomb journey (a pyramid) has no entry lock.
const PIECES_REQUIRED = TOMB_PIECES_REQUIRED

export const detectorFact = (level: number): string => `detector:corridor:${level}`

export const detectorFactsFor = (perk: TreasurePerk | undefined): string[] =>
  perk?.type === "detection" ? Array.from({ length: perk.level }, (_, i) => detectorFact(i + 1)) : []

export const TOMB_TREASURE_REACHABILITY: ReachabilitySupport = {
  bucketForReward: reward =>
    reward.type === "tombKey"
      ? (reward.keyId as string)
      : reward.type === "mapPiece"
        ? `mapPiece:${reward.tombId as string}`
        : undefined,
  journeyEntryLocks: journeyId =>
    journeyId in PIECES_REQUIRED ? [{ bucket: `mapPiece:${journeyId}`, threshold: PIECES_REQUIRED[journeyId] }] : [],
  tierUnlockGroups: tier => {
    const perkIds = TIER_UNLOCK_PERK_IDS[tier]
    return perkIds?.length ? [perkIds] : []
  },
  alsoHarvests: reward => (reward.type === "tombKey" ? detectorFactsFor(TREASURE_PERKS[reward.keyId as string]) : []),
  hiddenRequirement: () => detectorFact(1),
}
