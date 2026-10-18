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

// THE WEB'S OWN SAND AND SEAL: never the floor's. A site holds one kind of sand, so a lock of a site with web sand
// binds its barriers to water (webDoors.ts, `webSandKindRefusals`). Both stand in for paintings that are owed.
export const WEB_SAND_META: RegionBarrierRealisationMeta = {
  id: "webSand",
  ownerMod: "topology",
  texture: "regionSand",
  owed: "webSand",
  fallback: "#d9b36a",
}
export const WEB_SEAL_META: RegionBarrierRealisationMeta = {
  id: "webSeal",
  ownerMod: "topology",
  owed: "webSeal",
  fallback: "#8a7a5c",
}
