import { useMemo } from "react"
import type { HomeTagsReading } from "@/app/home/homeTags"
import { useModState } from "@/app/state/useModState"
import { useMergedEarnedPerks } from "@/app/SiteMap/perkContributions"
import { perkStacks } from "@/game/perkTotals"
import { trapDamage, isTrapAttemptSafe } from "@/mods/trap/game/trapHealth"
import { waterskinHeal } from "@/mods/trap/game/waterskin"

// Trap-owned runtime state: health + the trap-owned perks. Health is trap-only (traps are the sole
// source of damage; a waterskin and coming home heal), so it lives in the trap mod's own persisted
// slice (useModState). The four trap perks (max-health, armor, trap-insight, pack-mule) are read
// here too — derived from the tomb treasures held via the earned-perks seam, never stored — so
// toggling trap off drops all of it and core names none of it.
// See collection-and-detector-design.md §7.4 and game/perkTotals.ts.

const BASE_MAX_HEALTH = 6
const MAX_HEALTH_CAP = 12
const ARMOR_CAP = 2
const INSIGHT_CAP = 2

// Stored: current health, and whether the last homecoming refilled a missing heart. The trap perks are
// derived from the treasures held (see game/perkTotals.ts), so `maxHealth` is a computed ceiling rather
// than a saved number that could drift from the treasures that justify it. `mended` is optional so a save
// without it still reads, as nothing refilled.
type TrapState = {
  health: number
  mended?: boolean
}

const INITIAL: TrapState = {
  health: BASE_MAX_HEALTH,
}

export type TrapProgressAPI = {
  // True once the trap's own save has been read.
  loaded: boolean
  currentHealth: number
  maxHealth: number
  mended: boolean
  armorStacks: number
  trapInsightStacks: number
  isTrapAttemptSafe: () => boolean
  takeTrapDamage: () => void
  restoreHealth: () => void
  drinkWaterskin: () => void
}

export const useTrapProgress = (): TrapProgressAPI => {
  const [state, setState, loaded] = useModState<TrapState>("trap", INITIAL)
  // max-health/armor/trap-insight/pack-mule are stacking — one stack per treasure carrying them.
  const earned = useMergedEarnedPerks()
  const maxHealth = BASE_MAX_HEALTH + perkStacks(earned, "max-health", MAX_HEALTH_CAP - BASE_MAX_HEALTH)
  const armorStacks = perkStacks(earned, "armor", ARMOR_CAP)
  const trapInsightStacks = perkStacks(earned, "trap-insight", INSIGHT_CAP)
  const packMuleLevel = perkStacks(earned, "pack-mule", 1)

  return useMemo(() => {
    // A derived ceiling can move down (a perk retuned away), so the stored health is clamped on read
    // rather than trusted — otherwise a save could sit above a max it no longer earns.
    const currentHealth = Math.min(state.health, maxHealth)
    return {
      loaded,
      currentHealth,
      maxHealth,
      mended: state.mended === true,
      armorStacks,
      trapInsightStacks,
      isTrapAttemptSafe: () => isTrapAttemptSafe(currentHealth),
      takeTrapDamage: () => setState(prev => ({ ...prev, health: Math.max(0, prev.health - trapDamage(armorStacks)) })),
      restoreHealth: () => setState(prev => ({ ...prev, health: maxHealth, mended: prev.health < maxHealth })),
      // Drunk on pickup: pack-mule makes it heal two hearts; at full health it heals nothing.
      drinkWaterskin: () =>
        setState(prev => ({
          ...prev,
          health: waterskinHeal(Math.min(prev.health, maxHealth), maxHealth, packMuleLevel),
        })),
    }
  }, [state, setState, loaded, maxHealth, armorStacks, trapInsightStacks, packMuleLevel])
}

// The trap's word on the home: a heart was refilled on the way in.
export const useTrapHomeTags = (): HomeTagsReading => {
  const { mended, loaded } = useTrapProgress()
  return { tags: mended ? ["trap.mended"] : [], loaded }
}
