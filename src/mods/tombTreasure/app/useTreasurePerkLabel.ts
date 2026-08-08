import { useTranslation } from "react-i18next"
import { useMergedPerkContributions } from "@/app/SiteMap/perkContributions"
import { TREASURE_PERKS } from "../game/treasurePerks"

// What a tomb treasure does for you, in one line: an owned stat/detector perk speaks for itself
// through the merged `describe` (the owning mod's own i18n), while tier-unlock and location-key
// have no perk owner and are described here. A `none` perk (a pure ward/location key) has no line.
// Shared by the Collection slot and the loot popup, so a treasure reads the same in both places.
export const useTreasurePerkLabel = () => {
  const { t } = useTranslation(["common", "treasures"])
  const { describe } = useMergedPerkContributions()

  return (keyId: string): string | undefined => {
    const perk = TREASURE_PERKS[keyId]
    if (!perk) return undefined
    const owned = describe(perk)
    if (owned) return owned.label
    if (perk.type === "tier-unlock")
      return t("perks.tier-unlock", { ns: "treasures", tier: t(`difficulty.${perk.tier}`, { ns: "common" }) })
    if (perk.type === "location-key") return t("perks.location-key", { ns: "treasures" })
    return undefined
  }
}
