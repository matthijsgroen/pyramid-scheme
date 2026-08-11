import { useMemo } from "react"
import { TOMB_PERK_IDS } from "@/data/treasurePerks"
import { useTombTreasureProgress } from "@/mods/tombTreasure/app/useTombTreasureProgress"
import { piecesRequiredFor } from "@/mods/tombTreasure/game/piecesRequired"
import { useHieroglyphProgress } from "@/mods/hieroglyph/app/useHieroglyphProgress"
import { HIEROGLYPH_REQUIRED } from "@/mods/hieroglyph/game/hieroglyphData"
import type { DevAction } from "@/ui/molecules/DevPanel"

// The playtesting cheat menu's actions — state half of the dev panel (ui/molecules/DevPanel.tsx
// renders them). Exists so a whole tier's maps/keys/loot can be reached without replaying the game
// up to it, which is otherwise the only way to see expert+ content.
//
// Every action goes through the same public mod APIs real gameplay uses (addTombKey, collectMapPiece,
// addFragment) rather than writing save state directly, so a granted world is indistinguishable from
// an earned one — a cheat that reached a state normal play can't would make playtesting worthless.
// That equivalence is only real because perks are DERIVED from the treasures held (game/perkTotals.ts):
// while they were granted as a side effect of claiming, this menu handed out every key and no perk
// at all, and the corridor detector could never be tested from it.
//
// Reachable only in develop mode (BaseHeader's title tap, itself gated on NODE_ENV === development).
export const useDevActions = (): DevAction[] => {
  const { addTombKey, collectMapPiece, mapPieceCount, discoverTomb } = useTombTreasureProgress()
  const { addFragment } = useHieroglyphProgress()

  return useMemo(() => {
    const allTombIds = Object.keys(TOMB_PERK_IDS)

    // Every tomb treasure at once: this is simultaneously every ward key (so gated pockets open),
    // every tier unlock (TIER_UNLOCK_PERK_IDS is a subset of these), and every perk — including the
    // compass and corridor detector, which is what makes hidden loot findable while testing.
    const grantAllTreasures = () => {
      for (const perkIds of Object.values(TOMB_PERK_IDS)) for (const id of perkIds) addTombKey(id)
    }

    // Tombs are entered on a map-piece threshold, not a key, so they need their own grant. Tops each
    // tomb up to its own requirement and reveals it on the travel screen.
    const grantAllMapPieces = () => {
      for (const tombId of allTombIds) {
        const missing = piecesRequiredFor(tombId) - mapPieceCount(tombId)
        for (let i = 0; i < missing; i++) collectMapPiece(tombId)
        discoverTomb(tombId)
      }
    }

    // Complete every hieroglyph, so a tomb's tableau rooms are actually solvable on arrival —
    // without this, jumping to a late tomb hits a wall of unfillable formulas.
    const grantAllHieroglyphs = () => {
      for (const [hieroglyphId, required] of Object.entries(HIEROGLYPH_REQUIRED))
        for (let piece = 0; piece < required; piece++) addFragment(hieroglyphId, piece)
    }

    return [
      {
        label: "Unlock everything",
        onClick: () => {
          grantAllTreasures()
          grantAllMapPieces()
          grantAllHieroglyphs()
        },
      },
      { label: "All treasures + keys", onClick: grantAllTreasures },
      { label: "All map pieces", onClick: grantAllMapPieces },
      { label: "All hieroglyphs", onClick: grantAllHieroglyphs },
    ]
  }, [addTombKey, collectMapPiece, mapPieceCount, discoverTomb, addFragment])
}
