import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block: a cursor along the row of stones being answered. */
export const useCrocodileControls = (): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [key("←"), key("→")], pad: [pad("dpad")], label: t("crocodile.controls.move") },
    { keys: [key("Enter")], pad: [pad("a")], label: t("crocodile.controls.step") },
  ]
}
