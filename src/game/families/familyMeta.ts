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
}
