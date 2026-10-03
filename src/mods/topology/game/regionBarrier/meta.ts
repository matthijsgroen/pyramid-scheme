import type { RegionBarrierRealisationMeta } from "@/game/regionBarrierRealisation"

// A REGION BARRIER REALISED AS STANDING WATER OR AS DRIFTED SAND: the same barred region, only what covers it differs.
export const WATER_META: RegionBarrierRealisationMeta = { id: "water", ownerMod: "topology" }
export const SAND_META: RegionBarrierRealisationMeta = { id: "sand", ownerMod: "topology" }
