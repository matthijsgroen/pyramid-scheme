import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
import type { ConsumableType } from "@/mods/trap/game/consumableTypes"
import { trapDamage, canAttemptTrap } from "@/game/traps/trapHealth"

// Trap-owned runtime state: health + the consumable pack. Health is trap-only (traps are the
// sole source of damage and consumables the sole heal), so it lives in the trap mod's own
// persisted slice (useModState) rather than the shared ledger — toggling trap off drops all of
// it. maxHealth is a fixed 6 and the carry cap a fixed 2 while the perk system is disregarded
// (see TODO — the max-health / pack-mule perks return with the perk redesign).

const MAX_HEALTH = 6
const CARRY_CAP = 2

type ConsumableInventory = { bandage: number; oil: number; trapTool: number }
type TrapState = { health: number; consumables: ConsumableInventory }

const INITIAL: TrapState = { health: MAX_HEALTH, consumables: { bandage: 0, oil: 0, trapTool: 0 } }

export type TrapProgressAPI = {
  currentHealth: number
  maxHealth: number
  canAttemptTrap: () => boolean
  takeTrapDamage: () => void
  consumables: ConsumableInventory
  consumableCarryCap: number
  isConsumablePackFull: () => boolean
  addConsumable: (type: ConsumableType) => boolean // false if at cap
  useConsumable: (type: ConsumableType) => void
}

export const useTrapProgress = (): TrapProgressAPI => {
  const [state, setState] = useModState<TrapState>("trap", INITIAL)

  return useMemo(() => {
    const total = (c: ConsumableInventory) => c.bandage + c.oil + c.trapTool
    return {
      currentHealth: state.health,
      maxHealth: MAX_HEALTH,
      canAttemptTrap: () => canAttemptTrap(state.health),
      // Armor is disregarded with the perk system, so damage is the base trapDamage(0) = 2.
      takeTrapDamage: () => setState(prev => ({ ...prev, health: Math.max(0, prev.health - trapDamage(0)) })),
      consumables: state.consumables,
      consumableCarryCap: CARRY_CAP,
      isConsumablePackFull: () => total(state.consumables) >= CARRY_CAP,
      addConsumable: type => {
        if (total(state.consumables) >= CARRY_CAP) return false
        setState(prev => ({ ...prev, consumables: { ...prev.consumables, [type]: prev.consumables[type] + 1 } }))
        return true
      },
      useConsumable: type =>
        setState(prev => {
          if (prev.consumables[type] <= 0) return prev
          const consumables = { ...prev.consumables, [type]: prev.consumables[type] - 1 }
          // bandage → +1 heart (2 half-hearts), oil → full heal, trapTool → no heal (disarms a trap).
          const health =
            type === "bandage" ? Math.min(MAX_HEALTH, prev.health + 2) : type === "oil" ? MAX_HEALTH : prev.health
          return { ...prev, consumables, health }
        }),
    }
  }, [state, setState])
}
