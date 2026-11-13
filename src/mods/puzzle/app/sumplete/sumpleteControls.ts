import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block: a number, then crossed out, kept or left open. */
export const useSumpleteControls = (): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [arrows], pad: [pad("dpad")], label: t("sumplete.controls.move") },
    { keys: [key("Enter")], pad: [pad("a")], label: t("sumplete.controls.mark") },
  ]
}
