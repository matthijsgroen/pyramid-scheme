import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block: a row, its bar, and the lines under the day. */
export const useProcessionControls = (): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [key("↑"), key("↓")], pad: [pad("dpad")], label: t("procession.controls.row") },
    { keys: [key("←"), key("→")], pad: [pad("dpad")], label: t("procession.controls.slide") },
    { keys: [key("["), key("]")], pad: [pad("lb"), pad("rb")], label: t("procession.controls.mark") },
  ]
}
