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
  // Alternative generators this family can be built by, offered in the playtesting bench and nowhere else
  // (docs/instructions/puzzle-screens.md §6). Unset = one generator, and no picker. A family lists a name
  // here while a second construction is being measured against the shipped one — lightbeam's authored
  // generator is the case it exists for — and the name reaches `generate` as FamilyContext.variant. It is
  // deliberately not part of world-gen: a variant is something a developer plays, not something a room is
  // authored to.
  variants?: string[]
  // Skins this family can wear (docs/instructions/puzzle-screens.md §2) — the `theme` values it
  // recognises on FamilyContext. Unset = only its default skin. Playtesting reads this to offer
  // the themes a family actually has; an unlisted theme still falls back to the default skin.
  themes?: string[]
  // This family's own completion precondition (e.g. a tableau's hieroglyph requirement) —
  // most families provide none. The one place a family declares "I gate on holding
  // something," right alongside its other facts, not a separate registry to remember.
  resolveKeyRequirements?: FamilyKeyRequirementResolver
  // How this family builds a board, and how it judges one (`docs/instructions/puzzle-screens.md` §6.1). Unset means
  // the family generates live on every open, which is what every family did before there were lists.
  seedable?: SeedableFamily
}

// --- Offline seed lists (`docs/instructions/puzzle-screens.md` §6.1) -----------------------------------------

// The slice of an encounter's context that reaches a generator. Deliberately narrower than the app's
// FamilyContext, and the narrowness is the point: `theme` picks a skin and never reaches generation, so
// leaving it out makes "the bucket key ignores whatever generation ignores" a fact of the type rather
// than a convention someone has to remember. Kept local and self-contained for the same reason
// FamilyKeyRequirementResolverCtx is.
export type FamilyGenerationCtx = {
  difficulty?: Difficulty
  variant?: string
  /** Which entry of the resolved bucket's seed list to build (src/game/seeds/boardIndex.ts). Reaches
   * generatePuzzle, never `resolveOptions`'s result — the bucket key is the options, so which board a
   * room draws cannot change which list it draws from. */
  boardIndex?: number
}

// What solving an admitted board taught the offline pass. Reported by the CLI so a designer tuning a
// tier can see what its boards actually demand; deliberately not shipped in the artifact, since nothing
// at play time reads it.
export type Grade = {
  /** How many forced steps the ladder needed to settle the board. */
  steps: number
  /** The strongest technique the board actually demanded. */
  deepest?: string
}

declare const OPTIONS: unique symbol
/**
 * A family's own options type, seen from outside. FamilyMeta is not generic and lives in a
 * heterogeneous list, so the concrete type cannot survive to here — but keeping it opaque still stops
 * one family's options reaching another family's generator, which is the mistake a loop over all
 * families is positioned to make.
 */
export type FamilyOptions = { readonly [OPTIONS]: true }

/**
 * How a family opts into pre-generated seeds. Core enumerates, verifies and emits; a family only
 * declares these three, and learns nothing about lists, build steps or artifacts.
 */
export type SeedableFamily = {
  /** ctx -> the options object generate() is handed. Pure, no RNG: its hash is the bucket key. */
  resolveOptions: (ctx: FamilyGenerationCtx) => FamilyOptions
  /** `attempts` is a property of the call, not of the board — see the note in `seedable` below. */
  generate: (seed: number, options: FamilyOptions, attempts?: number) => unknown
  /** The generator's own acceptance gate. null means this board would have been rejected. */
  grade: (puzzle: unknown, options: FamilyOptions) => Grade | null
}

/**
 * Declares a family seedable, checked against its real options and puzzle types. The one cast that
 * erases them lives here rather than at each declaration site.
 *
 * `grade` must be the predicate the generator itself accepts a board on, not a second implementation
 * of it. Several families keep a nearest-miss board when no attempt hits the tier's required rungs, so
 * "did it throw" does not test acceptance — and a grade that drifted from the real gate would admit
 * seeds the generator would have rejected.
 *
 * `attempts` is a separate parameter rather than a field on the options, because the options are what
 * the bucket key hashes: the offline pass and play time ask for one attempt, the puzzle lab asks for
 * the full loop, and none of that may change which bucket a board belongs to.
 */
export const seedable = <O extends object, P>(family: {
  resolveOptions: (ctx: FamilyGenerationCtx) => O
  generate: (seed: number, options: O, attempts?: number) => P
  grade: (puzzle: P, options: O) => Grade | null
}): SeedableFamily => family as unknown as SeedableFamily
