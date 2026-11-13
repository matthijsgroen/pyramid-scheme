import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block. A pad has no digits, so it walks the pad row instead. */
export const useFutoshikiControls = (size: number): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [arrows], pad: [pad("dpad")], label: t("futoshiki.controls.move") },
    { keys: [key(`1–${size}`)], label: t("futoshiki.controls.type") },
    { pad: [pad("lb"), pad("rb")], label: t("futoshiki.controls.choose") },
    { pad: [pad("a")], label: t("futoshiki.controls.place") },
    { keys: [key("N")], pad: [pad("y")], label: t("futoshiki.controls.pencil") },
    { keys: [key("Del")], label: t("futoshiki.controls.erase") },
  ]
}
