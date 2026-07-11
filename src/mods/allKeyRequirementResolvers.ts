import type { ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveTableauKeyRequirements } from "./puzzle/game/tableau/keyRequirements"

// Domain-safe (no React/app imports), same reasoning as allFamilyMeta.ts — the one place
// world-gen and the app layer alike can resolve a room's key requirement without importing
// each other's registries. Most families provide none; only tableau does today.
export const ALL_KEY_REQUIREMENT_RESOLVERS: Record<
  string,
  (journeyId: string, floorIndex: number, pathIndex: number, encounterArgs?: unknown) => string[] | undefined
> = {
  tableau: resolveTableauKeyRequirements,
}

export const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  ALL_KEY_REQUIREMENT_RESOLVERS[familyId]?.(ctx.journeyId, ctx.floorIndex, ctx.pathIndex, ctx.encounterArgs)
