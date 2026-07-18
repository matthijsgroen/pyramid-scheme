import { useState } from "react"
import { useTranslation } from "react-i18next"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { TREASURE_CHEST_META } from "@/mods/core/game/treasureChest/meta"
import { Chest } from "@/ui/atoms/Chest"

// A treasure chest is an encounter with zero challenge and zero fail cost — clicking it IS
// solving it. Core's own RewardFlow takes over from there (reveal + grant); this family only
// owns the chest visual and the click gesture.
export const TreasureComponent: FamilyPlugin["Component"] = ({ ctx, onSolved }) => {
  const { t } = useTranslation("common")
  const [opened, setOpened] = useState(false)

  const handleOpen = () => {
    if (opened) return
    setOpened(true)
    // Let the chest open animation (shackle transition, 500ms) play out before
    // the node closes and RewardFlow takes over.
    setTimeout(onSolved, 600)
  }

  // A ward key (tomb treasure) is the most valuable thing a chest holds, so it gets the ornate
  // "vibrant" chest; everything else stays the plain wooden one.
  const variant = ctx.reward?.type === "tombKey" ? "vibrant" : "wooden"

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/85">
      <Chest variant={variant} state={opened ? "open" : "empty"} allowInteraction={!opened} onClick={handleOpen} />
      {!opened && <p className="mt-6 animate-pulse text-sm text-amber-300">{t("chest.tapToOpen")}</p>}
    </div>
  )
}

registerFamily({
  meta: TREASURE_CHEST_META,
  generate: () => undefined,
  Component: TreasureComponent,
})
