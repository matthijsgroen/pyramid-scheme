import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block: a square, its mark, then the held-alt sweep. */
export const useStarBattleControls = (): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [arrows], pad: [pad("dpad")], label: t("starBattle.controls.move") },
    { keys: [key("Enter")], pad: [pad("a")], label: t("starBattle.controls.mark") },
    { keys: [key("Shift"), "+", arrows], pad: [pad("y"), "+", pad("dpad")], label: t("starBattle.controls.sweep") },
  ]
}
