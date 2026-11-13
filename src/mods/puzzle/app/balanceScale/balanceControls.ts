import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block. Only the digits keys have; a pad walks to the weight row. */
export const useBalanceControls = (maxValue: number): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [arrows], pad: [pad("dpad")], label: t("balance.controls.move") },
    { keys: [key("Enter")], pad: [pad("a")], label: t("balance.controls.press") },
    { keys: [key(`1–${Math.min(maxValue, 9)}`)], label: t("balance.controls.weigh") },
  ]
}
