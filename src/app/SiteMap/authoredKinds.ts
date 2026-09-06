import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { Difficulty } from "@/data/difficultyLevels"
import type { DecorationKind, WallDecorationKind } from "@/game/siteTypes"
import type { SideSection, SubSection } from "@/worldGen/types"
import { FLOOR_KINDS } from "./floorScatter"

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
export type AuthoredKinds = { props: DecorationKind[]; wallItems: WallDecorationKind[]; scatter: string[] }

/**
 * SCATTER IS NOT AUTHORED, and that is why it went missing from every list that plans this art.
 *
 * `floorScatter` places off the floor's own shape and its site id — nothing names a scatter kind in a
 * spec — so a scan of the pools cannot see it and neither can a count of dressed rooms. Both the census
 * and the ArtBacklog story were built on those two, and both therefore reported a rank as one file from
 * finished while the drifts and spills the player walks over were still placeholders. It is the most
 * VISIBLE layer there is: two pieces to a chamber and about twenty-two to a floor, on the cells you
 * actually cross, where a prop stands on a cell nobody can reach.
 *
 * Every rank draws all three, so the list is the same everywhere and the art state is the only variable.
 */
const SCATTER = [...FLOOR_KINDS].sort()

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
      { props: [...props].sort(), wallItems: [...wallItems].sort(), scatter: SCATTER },
    ])
  )
}

const cached = collect()

/** The props and wall items this rank can draw. Empty arrays for a rank the world never sends anyone to. */
export const authoredKindsFor = (tier: Difficulty): AuthoredKinds =>
  cached.get(tier) ?? { props: [], wallItems: [], scatter: SCATTER }
