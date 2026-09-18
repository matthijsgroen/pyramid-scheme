import { useMergedDevGrants } from "./devActionContributions"
import type { DevAction } from "@/ui/molecules/DevPanel"

// The playtesting cheat menu's actions — state half of the dev panel (ui/molecules/DevPanel.tsx
// renders them). Exists so a whole tier's maps/keys/loot can be reached without replaying the game
// up to it, which is otherwise the only way to see expert+ content.
//
// Every grant comes from the mod that owns what it hands out (`devActionContributions.ts`), and goes
// through the same public mod APIs real gameplay uses (addTombKey, collectMapPiece, addFragment)
// rather than writing save state directly, so a granted world is indistinguishable from an earned
// one — a cheat that reached a state normal play can't would make playtesting worthless. That
// equivalence is only real because perks are DERIVED from the treasures held (game/perkTotals.ts):
// while they were granted as a side effect of claiming, this menu handed out every key and no perk
// at all, and the corridor detector could never be tested from it.
//
// "Unlock everything" is core's own and is defined as every registered grant, so a mod toggled off
// takes its grant out of that button too, and core never names a treasure, a map piece or a
// hieroglyph. With no mods registered the menu is the empty list, which is correct rather than broken.
//
// Reachable only in develop mode (BaseHeader's title tap, itself gated on NODE_ENV === development).
export const useDevActions = (): DevAction[] => {
  const grants = useMergedDevGrants()

  return grants.length === 0
    ? []
    : [
        { label: "Unlock everything", onClick: () => grants.forEach(g => g.grant()) },
        ...grants.map(({ label, grant }) => ({ label, onClick: grant })),
      ]
}
