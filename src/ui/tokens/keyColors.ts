import type { KeyColor } from "@/game/siteTypes"

// The five floor-key hues, in one place: the site map's gate/chest accents, a locked door's sign,
// the loot popup's key, and the HUD key ring all read from here, so a blue key looks like the same
// blue everywhere. Two shades per hue — `visible` is the muted, not-yet-reachable map state,
// `reachable` the lit one. Anything outside the map (door sign, popup, HUD) uses `reachable`.
export const keyColorHex: Record<KeyColor, { visible: string; reachable: string }> = {
  blue: { visible: "#2060c0", reachable: "#4090e0" },
  red: { visible: "#c04020", reachable: "#e06040" },
  green: { visible: "#208040", reachable: "#30b060" },
  yellow: { visible: "#b09010", reachable: "#d0c030" },
  purple: { visible: "#7030b0", reachable: "#9050d0" },
}
