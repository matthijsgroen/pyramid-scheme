import type { RegionBarrierRealisationMeta } from "@/game/regionBarrierRealisation"

// A REGION BARRIER REALISED AS STANDING WATER OR AS DRIFTED SAND: the same barred region, only what covers it differs.
// The fallback is the flat colour drawn while the seamless texture is not painted yet.
export const WATER_META: RegionBarrierRealisationMeta = {
  id: "water",
  ownerMod: "topology",
  texture: "regionWater",
  fallback: "#2f6f86",
}
export const SAND_META: RegionBarrierRealisationMeta = {
  id: "sand",
  ownerMod: "topology",
  texture: "regionSand",
  fallback: "#c9a45c",
}
