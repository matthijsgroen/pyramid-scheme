import type { ModDescriptor } from "../modDescriptor"
import { MAP_PIECE_CURRENCY, MAP_PIECE_CURRENCY_META } from "./game/mapPieceCurrency"
import { TOMB_TREASURE_REACHABILITY } from "./game/reachabilitySupport"
import { resolveTombTreasure } from "./game/tombTreasureReward"

// The tomb-treasure mod descriptor — the "last mod". Owns BOTH tomb-treasure currencies as one
// toggle unit (they're one interdependent loop: enter a tomb with map pieces, leave with keys):
//  - `mapPiece` (this descriptor's gating currency): found in pyramids, unlocks a tomb's entry.
//  - `tombKey` (the tomb treasure: ward keys + location keys): found in tombs, opens pyramid ward
//    floors, self-gates the tomb's next floor, reveals the next tomb, drives tier unlock. Positional
//    tomb content (one treasure per floor), placed via this descriptor's `resolveTombTreasure` and
//    harvested for reachability via `reachabilitySupport` (§E) — core world-gen names neither the
//    reward type nor the gating currency; this mod owns handler/schema/state + placement + the
//    reachability facts.
//
// Game-side only (no React). The reward handlers/effects/schemas + progression state (map-piece
// count, tomb keys, tomb discovery) register app-side (registerModApps → ./app), gated on this mod
// being enabled. Toggle off by removing this from src/mods/registeredMods.ts (isolation test only —
// a tomb-less world has no map pieces/keys, so tombs are unreachable; it stays on in production).
export const tombTreasureMod: ModDescriptor = {
  id: "tomb-treasure",
  currencyDistributions: [MAP_PIECE_CURRENCY],
  currencyMeta: MAP_PIECE_CURRENCY_META,
  // §E: the reachability facts core must not name — tomb-key harvest, tomb map-piece entry lock,
  // tier-unlock ladder. Drops with the mod (a tomb-less world then has no tombs to gate).
  reachabilitySupport: TOMB_TREASURE_REACHABILITY,
  // §E: tomb-content authoring — floor position → this tomb's `tombKey` perk stream, so core
  // world-gen names no reward type. Drops with the mod.
  resolveTombTreasure,
}
