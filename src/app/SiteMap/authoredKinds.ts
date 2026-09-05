import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { Difficulty } from "@/data/difficultyLevels"
import type { DecorationKind, WallDecorationKind } from "@/game/siteTypes"
import type { SideSection, SubSection } from "@/worldGen/types"

/**
 * What a rank is actually furnished with, read off the generated world.
 *
 * A kind does NOT belong to a rank through its tier: the pools are authored per floor and per section,
 * and `dressingRoles` then narrows each room by its role. So "which props does the merchant need drawn"
 * is a question about the world artifact, not about a table someone can read. Guessing has cost rolls —
 * the starter prompt list names four wall items where the world authors two, and calls sarcophagus and
 * crystal merchant props when neither is authored below junior and wizard respectively.
 *
 * Scanning the pools agrees exactly with assembling every floor and counting the rooms (`yarn
 * art-census`), and costs nothing, so this is the cheap half of that check: the SET, without the counts.
 */
export type AuthoredKinds = { props: DecorationKind[]; wallItems: WallDecorationKind[] }

const collect = (): Map<Difficulty, AuthoredKinds> => {
  const byTier = new Map<Difficulty, { props: Set<DecorationKind>; wallItems: Set<WallDecorationKind> }>()
  const bucket = (tier: Difficulty) => {
    const found = byTier.get(tier)
    if (found) return found
    const fresh = { props: new Set<DecorationKind>(), wallItems: new Set<WallDecorationKind>() }
    byTier.set(tier, fresh)
    return fresh
  }
  const walk = (section: SubSection | SideSection, tier: Difficulty) => {
    const into = bucket(tier)
    section.decorations?.forEach(k => into.props.add(k))
    section.wallDecorations?.forEach(k => into.wallItems.add(k))
    ;(section as SideSection).sideSections?.forEach(sub => walk(sub, tier))
  }
  for (const sites of Object.values(generatedWorldConfigs))
    for (const site of sites)
      for (const floor of site) {
        const tier = floor.difficulty
        const into = bucket(tier)
        floor.decorations?.forEach(k => into.props.add(k))
        floor.wallDecorations?.forEach(k => into.wallItems.add(k))
        floor.sideSections?.forEach(section => walk(section, tier))
      }
  return new Map(
    [...byTier].map(([tier, { props, wallItems }]) => [
      tier,
      { props: [...props].sort(), wallItems: [...wallItems].sort() },
    ])
  )
}

const cached = collect()

/** The props and wall items this rank can draw. Empty arrays for a rank the world never sends anyone to. */
export const authoredKindsFor = (tier: Difficulty): AuthoredKinds => cached.get(tier) ?? { props: [], wallItems: [] }
