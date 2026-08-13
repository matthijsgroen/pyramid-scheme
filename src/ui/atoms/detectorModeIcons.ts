import type { DetectorMode } from "@/game/siteTypes"

// One icon per detector, in its own module rather than exported from a component file: both the HUD's
// single DetectorButton and the DetectorToggles row inside the readout draw from it, and a component
// file that also exports constants breaks fast refresh.
export const MODE_ICON: Record<Exclude<DetectorMode, null>, string> = {
  compass: "🧭",
  consumable: "🎒",
  hiddenPassageway: "👁",
}
