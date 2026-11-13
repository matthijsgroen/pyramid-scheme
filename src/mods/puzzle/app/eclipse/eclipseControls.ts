import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block: a square, then its mark turned to the next. */
export const useEclipseControls = (): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [arrows], pad: [pad("dpad")], label: t("eclipse.controls.move") },
    { keys: [key("Enter")], pad: [pad("a")], label: t("eclipse.controls.mark") },
  ]
}
