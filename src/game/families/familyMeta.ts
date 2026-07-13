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
  // Priority for the reward-weight fill-order allocator (docs/mods/ARCHITECTURE.md's placement
  // pipeline, folded into the keys-and-locks solver's placement model) — 0-100 scale, higher fills
  // first, 0 = never eligible for this pool. Treasure (100) always has loot and fills
  // first; a plain puzzle room (60) only gets what's left once treasure's guaranteed slots
  // are spoken for; a gate/trap/shop/tableau (0) either isn't a reward candidate at all or
  // is filled by its own dedicated mechanism (a shop's stock, a tableau's hieroglyph
  // fragment) — explicit DSL authoring or a system that targets it directly, never this
  // generic pool, even though a shop has real capacity (several stock slots).
  rewardWeight: number
  // This family's own completion precondition (e.g. a tableau's hieroglyph requirement) —
  // most families provide none. The one place a family declares "I gate on holding
  // something," right alongside its other facts, not a separate registry to remember.
  resolveKeyRequirements?: FamilyKeyRequirementResolver
}
