import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
import { useMergedEarnedPerks } from "@/app/SiteMap/perkContributions"
import { perkLevel, perkStacks } from "@/game/perkTotals"
import type { ConsumableType } from "@/mods/trap/game/consumableTypes"
import { trapDamage, isTrapAttemptSafe } from "@/mods/trap/game/trapHealth"

// Trap-owned runtime state: health + the consumable pack + the trap-owned perks. Health is
// trap-only (traps are the sole source of damage and consumables the sole heal), so it lives in the
// trap mod's own persisted slice (useModState). The five trap perks (max-health, armor, trap-insight,
// pack-mule, consumable-detector) are read here too — derived from the tomb treasures held via the
// earned-perks seam, never stored — so toggling trap off drops all of it and core names none of it.
// See collection-and-detector-design.md §7.4 and game/perkTotals.ts.

const BASE_MAX_HEALTH = 6
const MAX_HEALTH_CAP = 12
const ARMOR_CAP = 2
const INSIGHT_CAP = 2
const CONSUMABLE_DETECTOR_CAP = 3
const BASE_CARRY_CAP = 2
const PACK_MULE_CARRY_CAP = 4

type ConsumableInventory = { bandage: number; oil: number; trapTool: number }
// Only what the player SPENDS is stored: current health and the pack. The five trap perks are
// derived from the treasures held (see game/perkTotals.ts), so `maxHealth` is a computed ceiling
// rather than a saved number that could drift from the treasures that justify it.
type TrapState = {
  health: number
  consumables: ConsumableInventory
}

const INITIAL: TrapState = {
  health: BASE_MAX_HEALTH,
  consumables: { bandage: 0, oil: 0, trapTool: 0 },
}

export type TrapProgressAPI = {
  currentHealth: number
  maxHealth: number
  armorStacks: number
  trapInsightStacks: number
  consumableDetectorLevel: number
  isTrapAttemptSafe: () => boolean
  takeTrapDamage: () => void
  consumables: ConsumableInventory
  consumableCarryCap: number
  isConsumablePackFull: () => boolean
  addConsumable: (type: ConsumableType) => boolean // false if at cap
  useConsumable: (type: ConsumableType) => void
}

export const useTrapProgress = (): TrapProgressAPI => {
  const [state, setState] = useModState<TrapState>("trap", INITIAL)
  // The five trap perks (§8.0.1), all derived from the treasures held. max-health/armor/trap-insight/
  // pack-mule are stacking — one stack per treasure carrying them; consumable-detector is tiered.
  const earned = useMergedEarnedPerks()
  const maxHealth = BASE_MAX_HEALTH + perkStacks(earned, "max-health", MAX_HEALTH_CAP - BASE_MAX_HEALTH)
  const armorStacks = perkStacks(earned, "armor", ARMOR_CAP)
  const trapInsightStacks = perkStacks(earned, "trap-insight", INSIGHT_CAP)
  const packMuleLevel = perkStacks(earned, "pack-mule", 1)
  const consumableDetectorLevel = perkLevel(earned, "consumable-detector", CONSUMABLE_DETECTOR_CAP)

  return useMemo(() => {
    const carryCap = packMuleLevel >= 1 ? PACK_MULE_CARRY_CAP : BASE_CARRY_CAP
    const total = (c: ConsumableInventory) => c.bandage + c.oil + c.trapTool
    // A derived ceiling can move down (a perk retuned away), so the stored health is clamped on read
    // rather than trusted — otherwise a save could sit above a max it no longer earns.
    const currentHealth = Math.min(state.health, maxHealth)
    return {
      currentHealth,
      maxHealth,
      armorStacks,
      trapInsightStacks,
      consumableDetectorLevel,
      isTrapAttemptSafe: () => isTrapAttemptSafe(currentHealth),
      takeTrapDamage: () => setState(prev => ({ ...prev, health: Math.max(0, prev.health - trapDamage(armorStacks)) })),
      consumables: state.consumables,
      consumableCarryCap: carryCap,
      isConsumablePackFull: () => total(state.consumables) >= carryCap,
      addConsumable: type => {
        if (total(state.consumables) >= carryCap) return false
        setState(prev => ({ ...prev, consumables: { ...prev.consumables, [type]: prev.consumables[type] + 1 } }))
        return true
      },
      useConsumable: type =>
        setState(prev => {
          if (prev.consumables[type] <= 0) return prev
          const consumables = { ...prev.consumables, [type]: prev.consumables[type] - 1 }
          // bandage → +1 heart (2 half-hearts), oil → full heal, trapTool → no heal (disarms a trap).
          const health =
            type === "bandage" ? Math.min(maxHealth, prev.health + 2) : type === "oil" ? maxHealth : prev.health
          return { ...prev, consumables, health }
        }),
    }
  }, [state, setState, maxHealth, armorStacks, trapInsightStacks, packMuleLevel, consumableDetectorLevel])
}
