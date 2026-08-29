import type { FamilyMeta } from "@/game/families/familyMeta"
import type { ResolveKeyRequirements } from "@/game/siteAssembler"
import { mulberry32 } from "@/game/random"
import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import { TREASURE_CHEST_META } from "./core/game/treasureChest/meta"
import { KEY_GATE_META } from "./core/game/keyGate/meta"
import { MOD_FAMILY_META } from "./registeredMods"

// Every registered family's metadata, domain-layer only (no Component/generate) — the one
// place world-gen (which can't import the app-layer family registry) can read tags/
// rewardPriority. Kept in sync with app/registerModApps.ts's plugin registrations by each
// plugin importing its meta from here rather than declaring its own copy. Only CORE's own
// families (treasure-chest, key-gate — not a toggleable mod) are listed directly; every
// descriptor-registered mod (puzzle's sumplete/crocodile, trap's arithmetic-reflex, hieroglyph's
// tableau, shop's fez-shop) contributes via MOD_FAMILY_META and drops out when the mod leaves
// REGISTERED_MODS — so those must NOT be listed here too.
export const ALL_FAMILY_META: FamilyMeta[] = [TREASURE_CHEST_META, KEY_GATE_META, ...MOD_FAMILY_META]

// Dispatches to whichever family declares its own resolveKeyRequirements (most provide
// none) — lives on FamilyMeta itself, not a separate registry, so there's exactly one place
// to touch when registering a new family, key-requirement-bearing or not.
export const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  ALL_FAMILY_META.find(m => m.id === familyId)?.resolveKeyRequirements?.(ctx)

// The reward priority of the family an authored `encounter` resolves to — the one
// place world-gen reads FamilyMeta.rewardPriority to rank loot slots (chest 100 > puzzle 60 >
// trap/tableau/crocodile/gate/shop 0). `encounter` may be a family id ("sumplete") or a tag
// ("puzzle"); `defaultTag` fills in when unset (e.g. "treasure" for a chest end, "puzzle" for a
// plain puzzle chain). Resolves id-first then tag, mirroring familyRegistry's resolveEncounter,
// but domain-only so it rides the same injection seam as resolveKeyRequirements. Returns 0 for an
// unknown encounter (loot-ineligible) — a mod's family drops from ALL_FAMILY_META with the mod.
export const familyPriorityFor = (encounter: string | string[] | undefined, defaultTag: string): number => {
  const value = (Array.isArray(encounter) ? encounter[0] : encounter) ?? defaultTag
  const meta = ALL_FAMILY_META.find(m => m.id === value) ?? ALL_FAMILY_META.find(m => m.tags.includes(value))
  return meta?.rewardPriority ?? 0
}

// How many reward slots a node whose encounter resolves to this family exposes — the one place
// world-gen reads FamilyMeta.rewardCapacity. Default 1 (ordinary node = one reward); fez-shop = 6.
// Same id-then-tag resolution as familyPriorityFor. Unknown encounter → 1 (a fallen-back shop node,
// e.g. shop mod off, is a plain 1-reward chest).
export const familyCapacityFor = (encounter: string | string[] | undefined, defaultTag: string): number => {
  const value = (Array.isArray(encounter) ? encounter[0] : encounter) ?? defaultTag
  const meta = ALL_FAMILY_META.find(m => m.id === value) ?? ALL_FAMILY_META.find(m => m.tags.includes(value))
  return meta?.rewardCapacity ?? 1
}

// Resolve an authored `encounter` to its family id and tags, domain-layer only — the same answer
// familyRegistry.ts gives the app, on the seam world-gen can actually import (the app registry pulls
// in components, which the gen script cannot load). Lets gen assemble a floor exactly as a player
// gets it, which is how it can warn about what a room ends up holding.
export const resolveEncounterMeta = (
  encounter: string | string[] | undefined,
  defaultTag: string
): { familyId: string; tags: string[] } => {
  const value = (Array.isArray(encounter) ? encounter[0] : encounter) ?? defaultTag
  const meta = ALL_FAMILY_META.find(m => m.id === value) ?? ALL_FAMILY_META.find(m => m.tags.includes(value))
  return { familyId: meta?.id ?? value, tags: meta?.tags ?? [] }
}

// Whether the family an authored `encounter` resolves to is a trap — the one thing about an
// encounter that the LAYOUT depends on, since trapped content is cut off from leftover maze edges so
// no stray tree edge lets a player step past it. World-gen reads this to write `sealed` on the
// section it gives a trap to, which is what keeps the assembler from having to look at encounters at
// all. Same id-then-tag resolution as familyCapacityFor.
export const familyIsTrap = (encounter: string | string[] | undefined, defaultTag: string): boolean => {
  const value = (Array.isArray(encounter) ? encounter[0] : encounter) ?? defaultTag
  const meta = ALL_FAMILY_META.find(m => m.id === value) ?? ALL_FAMILY_META.find(m => m.tags.includes(value))
  return meta?.tags.includes("trap") ?? false
}

// Gen-time encounter allocation: given an authored ROLE (a family tag, or an AND-array of tags)
// and the slot's tier, pick one concrete family id from the pool of enabled families that carry
// the tag(s) and debut at or below this tier. Deterministic in `seed` so regen is stable and the
// choice is tunable. Pool sorted for a stable order, so adding a family inserts predictably.
// Empty pool (only matching mod toggled off, or an id authored that no family tags) → return the
// role unchanged, so the runtime family-absence pass-through owns the dead room. Adding a new
// puzzle family = its meta joins ALL_FAMILY_META via the mod aggregator and enters the pool
// automatically — no core edit, no spec edit. This is the seam that makes puzzle types pluggable.
// Roles every board can serve. A role list mixing one of these with a themed role is the PREFER mode
// (`docs/game-design/journeys.md` §10): the structural tag re-admits every family, and the themed one says
// what the journey would like the room to look like. Kept in step with `rolePools.spec.ts`'s copy, which
// skips the same tags when it checks pool sizes — a themed pool is a variety risk and a structural one is not.
const STRUCTURAL_ROLES = new Set(["puzzle", "trap", "treasure", "gate", "shop", "capstone", "tomb-puzzle"])

/**
 * Whether this family has a face DRAWN for one of these roles, rather than merely being allowed in the pool.
 *
 * **`["default"]` is not dressing.** Declaring it says "I already read as that place" (`FamilyMeta.faces`),
 * which is the weaker claim and the reason preferring `sky` changes nothing: every family in that pool
 * serves it with the face it was going to draw anyway. What the thumb below is for is the room that comes
 * out LOOKING like the place, so only a face with a name of its own counts.
 */
const dressesAnyOf = (meta: FamilyMeta, roles: readonly string[]): boolean =>
  roles.some(role => (meta.faces?.[role] ?? []).some(face => face !== "default"))

// Gen-time encounter allocation: given an authored ROLE (a family tag, or an AND-array of tags)
// and the slot's tier, pick one concrete family id from the pool of enabled families that carry
// the tag(s) and debut at or below this tier. Deterministic in `seed` so regen is stable and the
// choice is tunable. Pool sorted for a stable order, so adding a family inserts predictably.
// Empty pool (only matching mod toggled off, or an id authored that no family tags) → return the
// role unchanged, so the runtime family-absence pass-through owns the dead room. Adding a new
// puzzle family = its meta joins ALL_FAMILY_META via the mod aggregator and enters the pool
// automatically — no core edit, no spec edit. This is the seam that makes puzzle types pluggable.
//
// **In prefer mode the bag is weighted, and that is the whole difference between the two modes' looks.**
// Unweighted, a six-family pool inside thirteen dressed roughly a third of the rooms it was asked for
// (measured over the baked world), which reads as scattered rather than as a place — the journey was
// authored and nothing much looked authored. A family that has a face drawn for the role goes into the bag
// twice, so it comes up about twice as often, and the rest of the catalogue still turns up. Restricting is
// untouched: there the pool IS the dress, so every entry already dresses and doubling them all would change
// nothing but the arithmetic.
export const allocateEncounterFamily = (role: string | string[], tier: Difficulty, seed: number): string | string[] => {
  const roles = Array.isArray(role) ? role : [role]
  const themed = roles.filter(r => !STRUCTURAL_ROLES.has(r))
  const prefers = themed.length > 0 && themed.length < roles.length
  const bag = ALL_FAMILY_META.filter(
    // **A list of roles is "any of these".** Narrowing is what a narrower tag is for: `sky` is the wide
    // cluster, `light` the narrow one inside it, and a journey asks for whichever pool it means. Reading a
    // list as "all of these" made every list a smaller pool than either of its entries, which is the
    // opposite of what authoring one is for.
    m => roles.some(r => m.tags.includes(r)) && difficultyCompare(tier, m.minTier ?? "starter") >= 0
  )
    // Sorted BEFORE the weighting and duplicated in place, so a family's entries stay adjacent and adding
    // one still inserts predictably — the same stability the single-entry pool had.
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap(m => (prefers && dressesAnyOf(m, themed) ? [m.id, m.id] : [m.id]))
  if (bag.length === 0) return role
  return bag[Math.floor(mulberry32(seed)() * bag.length)]
}
