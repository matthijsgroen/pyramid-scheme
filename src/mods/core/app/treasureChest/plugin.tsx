/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { TREASURE_CHEST_META } from "@/mods/core/game/treasureChest/meta"
import { Chest } from "@/ui/atoms/Chest"

// A treasure chest is an encounter with zero challenge and zero fail cost — clicking it IS
// solving it. Core's own RewardFlow takes over from there (reveal + grant); this family only
// owns the chest visual and the click gesture.
const TreasureComponent: FamilyPlugin["Component"] = ({ onSolved }) => {
  const { t } = useTranslation("common")
  const [opened, setOpened] = useState(false)

  const handleOpen = () => {
    if (opened) return
    setOpened(true)
    onSolved()
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/85">
      <Chest variant="wooden" state={opened ? "open" : "empty"} allowInteraction={!opened} onClick={handleOpen} />
      {!opened && <p className="mt-6 animate-pulse text-sm text-amber-300">{t("chest.tapToOpen")}</p>}
    </div>
  )
}

registerFamily({
  meta: TREASURE_CHEST_META,
  generate: () => undefined,
  Component: TreasureComponent,
})
