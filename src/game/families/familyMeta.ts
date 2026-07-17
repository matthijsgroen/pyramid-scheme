import type { Difficulty } from "@/data/difficultyLevels"

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
  rewardPriority: number
  // How many reward slots a node of this family exposes. Default 1 (an ordinary node bears one
  // reward, like a chest or a puzzle-chain position). A shop is the one family that overrides it
  // (6): its node carries a `rewards[]` stock array of this length, filled by the mods that place
  // into it (positional currency assignment + trap's finite consumable fill), each priced by the
  // shop. Distinct from rewardPriority: priority is fill order, capacity is slot count.
  rewardCapacity?: number
  // First difficulty tier this family may be allocated at (its catalogue debut, per
  // docs/game-design/PUZZLE_FAMILIES.md / TRAP_FAMILIES.md). The gen-time encounter allocator
  // only draws a family into a role's pool for slots at or above this tier. Unset = "starter"
  // (eligible everywhere). Only meaningful for families the allocator picks by tag (puzzles,
  // traps); structural families (treasure/gate) leave it unset.
  minTier?: Difficulty
  // This family's own completion precondition (e.g. a tableau's hieroglyph requirement) —
  // most families provide none. The one place a family declares "I gate on holding
  // something," right alongside its other facts, not a separate registry to remember.
  resolveKeyRequirements?: FamilyKeyRequirementResolver
}
