import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block: the cursor lands on mirrors only. */
export const useLightbeamSwitchControls = (): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [arrows], pad: [pad("dpad")], label: t("lightbeamSwitch.controls.move") },
    { keys: [key("Enter")], pad: [pad("a")], label: t("lightbeamSwitch.controls.turn") },
  ]
}
