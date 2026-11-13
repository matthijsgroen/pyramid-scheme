import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block: one press does what a tap on that control does. */
export const useCanistersControls = (): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [arrows], pad: [pad("dpad")], label: t("canisters.controls.move") },
    { keys: [key("Enter")], pad: [pad("a")], label: t("canisters.controls.press") },
    { keys: [key("Enter"), key("Esc")], pad: [pad("a"), pad("b")], label: t("canisters.controls.putDown") },
  ]
}
