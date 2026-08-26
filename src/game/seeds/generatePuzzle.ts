import { puzzleSeeds } from "@/data/puzzleSeeds"
import type { FamilyGenerationCtx, FamilyMeta } from "@/game/families/familyMeta"
import { configHash } from "./configHash"

/** A listed seed was proven to build its board on the first attempt, so play time runs exactly one. */
const VERIFIED_ATTEMPTS = 1

/**
 * Builds a family's board for one encounter, from its list where there is one
 * (`docs/instructions/puzzle-screens.md` §6.1).
 *
 * Which entry a room takes is dealt to it by `ctx.boardIndex` (src/game/seeds/boardIndex.ts), so no two
 * rooms in the world take the same one. `seed` — a hash of the room's identity — is the fallback for a
 * site outside the baked world (a story, a spec, the builder), and it draws WITH replacement: fine for
 * one-off boards, which is why the real world does not use it.
 *
 * Either way the seed indexes the list rather than seeding the generator. That is what keeps the offline
 * pass tractable: it has to enumerate the configurations that exist, never the rooms a player can reach,
 * so reassembling a floor or regenerating the world cannot invalidate a list.
 */
export const generatePuzzle = <T>(meta: FamilyMeta, seed: number, ctx: FamilyGenerationCtx): T => {
  const { seedable } = meta
  if (!seedable) throw new Error(`family ${meta.id} declares no generator`)
  const options = seedable.resolveOptions(ctx)
  const listed = puzzleSeeds[configHash(options)]
  // A miss — no list yet, or a dial moved and took the key with it — searches on the player's device,
  // which is what every family did before there were lists. Slower, never wrong, and it is what keeps
  // the puzzle lab usable while a tier is being tuned.
  if (!listed?.length) return seedable.generate(seed, options) as T
  return seedable.generate(listed[(ctx.boardIndex ?? seed) % listed.length], options, VERIFIED_ATTEMPTS) as T
}
