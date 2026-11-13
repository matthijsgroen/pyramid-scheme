import { useTranslation } from "react-i18next"
import type { ControlLine } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block: a star picked up, and the held-alt shortcut. */
export const useConstellationControls = (): ControlLine[] => {
  const { t } = useTranslation("common")
  return [
    [
      { keys: [arrows], pad: [pad("dpad")], label: t("constellation.controls.pick") },
      { keys: [key("Enter")], pad: [pad("a")], label: t("constellation.controls.grab") },
      { keys: [arrows], pad: [pad("dpad")], label: t("constellation.controls.draw") },
      { keys: [key("Enter"), key("Esc")], pad: [pad("a"), pad("b")], label: t("constellation.controls.release") },
    ],
    [{ keys: [key("Shift"), "+", arrows], pad: [pad("y"), "+", pad("dpad")], label: t("constellation.controls.alt") }],
  ]
}
