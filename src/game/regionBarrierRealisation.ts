/** The realisation kind a region barrier is bound under in a `RealisationBinding`, one realisation for every barrier of a floor. */
export const REGION_BARRIER_KIND = "region-barrier"

/**
 * How a mod dresses a barred region: flooded, buried. The barrier is core's and the same whichever is bound;
 * the realisation is only what the player is shown.
 */
export type RegionBarrierRealisationMeta = {
  id: string
  ownerMod: string
  /** Key of the seamless texture drawn over the barred region (`tiles/default/<key>.png`). Until that file is
   * painted, or while this is unset, the region is drawn as a flat fill of `fallback`. */
  texture?: string
  /** CSS colour of the flat fill the region is drawn with while its texture is not painted. */
  fallback: string
}

/** Resolves the realisation a barrier names. Given `undefined` an answer means the caller binds a barrier
 * that names none; production answers nothing, so an unbound barrier is refused. */
export type ResolveRegionBarrierRealisation = (id: string | undefined) => RegionBarrierRealisationMeta | undefined

/** Why a region barrier cannot be bound: it names no realisation, or one no registered mod declares. */
export type RegionBarrierRefusal = "unbound" | "unknown"
