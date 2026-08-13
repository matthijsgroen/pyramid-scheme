import type { FC } from "react"
import { HealthDisplay } from "@/ui/atoms/HealthDisplay"
import { ConsumableBar } from "@/mods/trap/app/ConsumableBar"
import { useTrapProgress } from "./useTrapProgress"

// The trap mod's HUD widget: health + the consumable pack, both trap-owned. Reads its own state
// via useTrapProgress, so core renders it through the HUD registry without importing trap.
export const TrapHud: FC = () => {
  const trap = useTrapProgress()
  return (
    <>
      {/* Smaller than the trap screen's hearts: six of them share this row with the key ring, the
          supplies and the balance, and the row has to fit a phone. */}
      <HealthDisplay currentHealth={trap.currentHealth} maxHealth={trap.maxHealth} size={16} />
      <ConsumableBar consumables={trap.consumables} />
    </>
  )
}
