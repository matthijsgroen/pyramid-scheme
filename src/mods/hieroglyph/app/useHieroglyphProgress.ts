import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
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

type HieroglyphState = { collectedFragments: string[] } // "hieroglyphId:pieceIndex"

const INITIAL: HieroglyphState = { collectedFragments: [] }

export type HieroglyphProgressAPI = {
  addFragment: (hieroglyphId: string, pieceIndex: number) => void
  hasFragment: (hieroglyphId: string, pieceIndex: number) => boolean
  hieroglyphProgress: (hieroglyphId: string) => { found: number; required: number }
  // hieroglyphId → count of distinct pieces found (for the collection/detector views).
  hieroglyphFragments: Record<string, number>
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
    }
  }, [state, setState])
}
