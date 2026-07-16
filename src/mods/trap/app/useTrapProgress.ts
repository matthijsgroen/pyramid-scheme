import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
import type { Perk } from "@/app/SiteMap/perkContributions"
import type { ConsumableType } from "@/mods/trap/game/consumableTypes"
import { trapDamage, isTrapAttemptSafe } from "@/mods/trap/game/trapHealth"

// Trap-owned runtime state: health + the consumable pack + the trap-owned perks. Health is
// trap-only (traps are the sole source of damage and consumables the sole heal), so it lives in the
// trap mod's own persisted slice (useModState). The five trap perks (max-health, armor, trap-insight,
// pack-mule, consumable-detector) live here too — granted by tomb treasures via the perk seam — so
// toggling trap off drops all of it and core names none of it. See collection-and-detector-design.md §7.4.

const BASE_MAX_HEALTH = 6
const MAX_HEALTH_CAP = 12
const ARMOR_CAP = 2
const INSIGHT_CAP = 2
const BASE_CARRY_CAP = 2
const PACK_MULE_CARRY_CAP = 4

type ConsumableInventory = { bandage: number; oil: number; trapTool: number }
type TrapState = {
  health: number
  maxHealth: number
  armorStacks: number
  trapInsightStacks: number
  packMuleLevel: number
  consumableDetectorLevel: number
  consumables: ConsumableInventory
}

const INITIAL: TrapState = {
  health: BASE_MAX_HEALTH,
  maxHealth: BASE_MAX_HEALTH,
  armorStacks: 0,
  trapInsightStacks: 0,
  packMuleLevel: 0,
  consumableDetectorLevel: 0,
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
  // Applies a trap-owned perk to this slice; no-ops for perks trap doesn't own. See §8.0.1 catalog
  // for caps/bumps (the old registerPerks helpers, reimplemented inline here).
  grantPerk: (perk: Perk) => void
}

export const useTrapProgress = (): TrapProgressAPI => {
  const [state, setState] = useModState<TrapState>("trap", INITIAL)

  return useMemo(() => {
    const maxHealth = state.maxHealth ?? BASE_MAX_HEALTH
    const armorStacks = state.armorStacks ?? 0
    const packMuleLevel = state.packMuleLevel ?? 0
    const carryCap = packMuleLevel >= 1 ? PACK_MULE_CARRY_CAP : BASE_CARRY_CAP
    const total = (c: ConsumableInventory) => c.bandage + c.oil + c.trapTool
    return {
      currentHealth: state.health,
      maxHealth,
      armorStacks,
      trapInsightStacks: state.trapInsightStacks ?? 0,
      consumableDetectorLevel: state.consumableDetectorLevel ?? 0,
      isTrapAttemptSafe: () => isTrapAttemptSafe(state.health),
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
          const cap = prev.maxHealth ?? BASE_MAX_HEALTH
          const health = type === "bandage" ? Math.min(cap, prev.health + 2) : type === "oil" ? cap : prev.health
          return { ...prev, consumables, health }
        }),
      grantPerk: perk =>
        setState(prev => {
          switch (perk.type) {
            case "max-health":
              return { ...prev, maxHealth: Math.min(MAX_HEALTH_CAP, (prev.maxHealth ?? BASE_MAX_HEALTH) + 1) }
            case "armor":
              return { ...prev, armorStacks: Math.min(ARMOR_CAP, (prev.armorStacks ?? 0) + 1) }
            case "trap-insight":
              return { ...prev, trapInsightStacks: Math.min(INSIGHT_CAP, (prev.trapInsightStacks ?? 0) + 1) }
            case "pack-mule":
              return { ...prev, packMuleLevel: 1 }
            case "consumable-detector":
              return { ...prev, consumableDetectorLevel: Math.max(prev.consumableDetectorLevel ?? 0, perk.level ?? 1) }
            default:
              return prev
          }
        }),
    }
  }, [state, setState])
}
