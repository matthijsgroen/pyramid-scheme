// Ctx shape matches src/game/siteAssembler.ts's ResolveKeyRequirements (minus the familyId
// dispatch param, already implied by which FamilyMeta this sits on) — kept as a local,
// self-contained type rather than importing it, so this file stays dependency-free.
export type FamilyKeyRequirementResolverCtx = {
  journeyId: string
  floorIndex: number
  pathIndex: number
  encounterArgs?: unknown
}
export type FamilyKeyRequirementResolver = (ctx: FamilyKeyRequirementResolverCtx) => string[] | undefined

// Plain data describing a registered encounter family — no React/app dependency, so
// world-gen (src/worldGen/) can read it directly via allFamilyMeta.ts alongside the app's
// own family registry (src/app/families/familyRegistry.ts), which re-exports this type.
export type FamilyMeta = {
  id: string
  ownerMod: string
  tags: string[]
  icon: string
  color: string
  // Priority for the reward-weight fill-order allocator (docs/mods-architecture.md step 4)
  // — higher fills first, 0 = never eligible (e.g. a trap: survived, not solved).
  rewardWeight: number
  // This family's own completion precondition (e.g. a tableau's hieroglyph requirement) —
  // most families provide none. The one place a family declares "I gate on holding
  // something," right alongside its other facts, not a separate registry to remember.
  resolveKeyRequirements?: FamilyKeyRequirementResolver
}
