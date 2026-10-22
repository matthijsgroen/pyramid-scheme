import { defaultResolveEncounter } from "./encounterFallback"
import type { ResolveOneWayRealisation } from "./oneWayRealisation"
import type { ResolvePassageRealisation } from "./passageRealisation"
import type { ResolveRegionBarrierRealisation } from "./regionBarrierRealisation"
import type { LaidFloor } from "./laidFloor"
import type { ResolveBoardIndex } from "./seeds/boardIndex"
import type { FamilyMeta } from "./families/familyMeta"

export { defaultResolveEncounter }
export { DEFAULT_PACKING, ONE_WAY_RUN_CELLS, oneWayRunCells } from "./carveConstants"
export { PACKING_CEILING } from "./carve/ladder"
export { assembleFloor } from "./carve/assembleFloor"

// Resolves an authored `encounter` (exact family id, or tag(s)) to a concrete family id
// plus that family's own tags. Injected by the caller so this domain module never needs
// to know which families/mods actually exist — see resolveEncounter in
// src/app/families/familyRegistry.ts for the real (registry-backed) implementation.
// `reEnterable` mirrors the resolved family's own FamilyMeta.reEnterable — whether a finished room of
// it is walked back INTO. Carried here because a switch needs it and core may not read a mod's meta:
// the resolver that knows the registry answers, and this module only asks.
// `ownerMod` names the mod that contributed the resolved family, and is absent exactly when no family
// answered the query — which is how a caller holding only this resolution tells a room whose mod left
// the build from one a mod that is here still stands in.
export type EncounterResolution = {
  familyId: string
  tags: string[]
  reEnterable?: boolean
  ownerMod?: string
  /** What a sequence realisation says about its tiles and door (FamilyMeta.sequence). */
  sequence?: FamilyMeta["sequence"]
}
export type ResolveEncounter = (encounter: string | string[] | undefined, defaultTag: string) => EncounterResolution

// The one place a resolved FamilyMeta becomes an EncounterResolution — shared by
// familyRegistry.ts's app-layer resolveEncounter and allFamilyMeta.ts's world-gen-reachable
// resolveEncounterMeta, so a field neither can read without the other (rewardPriority's
// siblings, reEnterable before it) is added once instead of copied into two lookup functions.
// `fallback` is the pre-resolution id/tag query, echoed back (id-joined if an array) when no
// family matched — an unauthored or mod-disabled encounter falls through to the runtime's own
// family-absence handling rather than resolving to nothing.
export const encounterFromMeta = (meta: FamilyMeta | undefined, fallback: string | string[]): EncounterResolution => {
  if (!meta) return { familyId: Array.isArray(fallback) ? fallback.join("+") : fallback, tags: [] }
  return {
    familyId: meta.id,
    tags: meta.tags,
    ownerMod: meta.ownerMod,
    ...(meta.reEnterable ? { reEnterable: true } : {}),
    ...(meta.sequence ? { sequence: meta.sequence } : {}),
  }
}

// Resolves a main-path puzzle room's own completion precondition (e.g. a tableau's
// hieroglyph requirement) to opaque key ids — same idea as ResolveEncounter, injected so
// this module never needs to know which family owns which requirement, only that one might
// exist. Real implementation dispatches by familyId to whichever family's own FamilyMeta
// declares one (see src/mods/allFamilyMeta.ts); most families provide none.
export type ResolveKeyRequirements = (
  familyId: string,
  ctx: { journeyId: string; floorIndex: number; pathIndex: number; familyOrdinal: number; encounterArgs?: unknown }
) => string[] | undefined

export type AssembleFloorKeyRequirements = {
  resolveKeyRequirements?: ResolveKeyRequirements
  /** Where this floor was AUTHORED — which journey, which of its levels, which floor of that level.
   * `levelIndex` is what separates two levels of one journey, so the ids derived from it (a switch's
   * gate stems) stay distinct across the world; unset (stories, the builder) it reads as 0. */
  floorRef?: { journeyId: string; levelIndex?: number; floorIndex: number }
  /** Which seed-list entry each room draws, by its authored address — injected for the same reason
   * resolveEncounter is: this module knows a floor's chains, never which world they belong to.
   * Absent (stories, specs, the builder) leaves rooms unstamped and they index by their own hash. */
  resolveBoardIndex?: ResolveBoardIndex
  /** Binds each one-way to the realisation it names, and says what that realisation declares. Production
   * passes the registry's, which binds a one-way that names none to nothing; absent (stories, specs, the
   * builder) the fallback catalogue answers. */
  resolveOneWay?: ResolveOneWayRealisation
  /** Binds each region barrier to the realisation it names. Production passes the registry's, which binds a
   * barrier that names none to nothing; absent (stories, specs, the builder) the fallback accepts any named one. */
  resolveRegionBarrier?: ResolveRegionBarrierRealisation
  /** Says which passage a gate empty hands alone open is dressed as. Production passes the registry's; absent
   * (stories, specs, the builder) the fallback accepts any named one. One no registered mod declares leaves a door. */
  resolvePassage?: ResolvePassageRealisation
  /** How many attempts the floor may take, at most ASSEMBLY_ATTEMPTS. The bake's seed search asks for 1:
   * it wants a seed that carves at the authored `packing`, and a seed that only carves after the ladder
   * widened the grid is one it has to reject, so it must not pay for the climb to learn that. */
  maxAttempts?: number
  /** Called with the laid locks of every attempt that lays any, so a spec can read a carve against the
   * structure it was carved from. */
  onLaid?: (laid: LaidFloor) => void
}
