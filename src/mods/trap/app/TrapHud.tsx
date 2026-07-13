import type { FC } from "react"
import { HealthDisplay } from "@/ui/atoms/HealthDisplay"
import { ConsumableBar } from "@/ui/atoms/ConsumableBar"
import { useTrapProgress } from "./useTrapProgress"

// The trap mod's HUD widget: health + the consumable pack, both trap-owned. Reads its own state
// via useTrapProgress, so core renders it through the HUD registry without importing trap.
export const TrapHud: FC = () => {
  const trap = useTrapProgress()
  return (
    <>
      <HealthDisplay currentHealth={trap.currentHealth} maxHealth={trap.maxHealth} />
      <ConsumableBar consumables={trap.consumables} />
    </>
  )
}
