import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
import type { Perk } from "@/app/SiteMap/perkContributions"
// The generated `hieroglyphRequired` is baked generically (core annotates no mod export), so TS
// infers a literal shape — the mod owns the type: it's a per-hieroglyph piece-count lookup.
import { hieroglyphRequired as hieroglyphRequiredRaw } from "@/data/generatedWorld"

const hieroglyphRequired = hieroglyphRequiredRaw as Record<string, number>

// Hieroglyph-owned collection state: which fragment pieces of which hieroglyph the player has found.
// A fragment is one piece of a multi-piece hieroglyph (stored as an "id:pieceIndex" set); a
// hieroglyph is complete once its required pieces are all found. Lives in the mod's own persisted
// slice (useModState) rather than core progression — toggling hieroglyph off drops all of it, and
// core never names `hieroglyphFragment`. `hieroglyphRequired` (the per-hieroglyph piece target) is a
// hieroglyph concern, imported here, not in core.

// collectedFragments: which pieces are found. compassLevel: the fragment-compass detector level,
// granted by tomb treasures via the perk seam (§7.4) — lives here so toggling hieroglyph off drops it.
type HieroglyphState = { collectedFragments: string[]; compassLevel: number } // fragment = "hieroglyphId:pieceIndex"

const COMPASS_CAP = 3

const INITIAL: HieroglyphState = { collectedFragments: [], compassLevel: 0 }

export type HieroglyphProgressAPI = {
  addFragment: (hieroglyphId: string, pieceIndex: number) => void
  hasFragment: (hieroglyphId: string, pieceIndex: number) => boolean
  hieroglyphProgress: (hieroglyphId: string) => { found: number; required: number }
  // hieroglyphId → count of distinct pieces found (for the collection/detector views).
  hieroglyphFragments: Record<string, number>
  compassLevel: number
  grantPerk: (perk: Perk) => void
}

export const useHieroglyphProgress = (): HieroglyphProgressAPI => {
  const [state, setState] = useModState<HieroglyphState>("hieroglyph", INITIAL)

  return useMemo(() => {
    const found = (id: string) => state.collectedFragments.filter(f => f.startsWith(`${id}:`)).length
    return {
      addFragment: (hieroglyphId, pieceIndex) => {
        const key = `${hieroglyphId}:${pieceIndex}`
        setState(prev =>
          prev.collectedFragments.includes(key)
            ? prev
            : { ...prev, collectedFragments: [...prev.collectedFragments, key] }
        )
      },
      hasFragment: (hieroglyphId, pieceIndex) => state.collectedFragments.includes(`${hieroglyphId}:${pieceIndex}`),
      hieroglyphProgress: hieroglyphId => ({
        found: found(hieroglyphId),
        required: hieroglyphRequired[hieroglyphId] ?? 2,
      }),
      hieroglyphFragments: Object.fromEntries(
        state.collectedFragments
          .map(f => f.split(":")[0])
          .reduce((m, id) => m.set(id, (m.get(id) ?? 0) + 1), new Map<string, number>())
      ),
      compassLevel: state.compassLevel ?? 0,
      // The compass perk is the only hieroglyph-owned perk (§8.0.1): toLevel bump, cap 3.
      grantPerk: perk =>
        perk.type === "compass"
          ? setState(prev => ({
              ...prev,
              compassLevel: Math.min(COMPASS_CAP, Math.max(prev.compassLevel ?? 0, perk.level ?? 1)),
            }))
          : undefined,
    }
  }, [state, setState])
}
