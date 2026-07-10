/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { useEffect } from "react"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"

// A treasure chest is an encounter with zero challenge and zero fail cost — reaching it IS
// solving it. It renders nothing of its own: the "click to open, then reveal loot" spectacle
// already exists generically for ANY solved room with a reward (ChestRewardFlow, fed by core's
// pendingReward state) — this family only needs to fire the generic onSolved signal.
const TreasureComponent: FamilyPlugin["Component"] = ({ onSolved }) => {
  useEffect(() => {
    onSolved()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per room instance
  }, [])
  return null
}

registerFamily({
  meta: { id: "treasure-chest", ownerMod: "core", tags: ["treasure"], icon: "🪙", color: "amber" },
  generate: () => undefined,
  Component: TreasureComponent,
})
