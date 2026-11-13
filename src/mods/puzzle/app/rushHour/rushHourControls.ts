import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block, in the order of one shove. */
export const useRushHourControls = (): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [arrows], pad: [pad("dpad")], label: t("rushHour.controls.pick") },
    { keys: [key("Enter")], pad: [pad("a")], label: t("rushHour.controls.grab") },
    { keys: [arrows], pad: [pad("dpad")], label: t("rushHour.controls.slide") },
    { keys: [key("Enter"), key("Esc")], pad: [pad("a"), pad("b")], label: t("rushHour.controls.release") },
  ]
}
