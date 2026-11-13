import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block: a square, its mark, then the held-alt sweep. */
export const usePairPuzzleControls = (): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [arrows], pad: [pad("dpad")], label: t("pairPuzzle.controls.move") },
    { keys: [key("Enter")], pad: [pad("a")], label: t("pairPuzzle.controls.mark") },
    { keys: [key("Shift"), "+", arrows], pad: [pad("y"), "+", pad("dpad")], label: t("pairPuzzle.controls.sweep") },
  ]
}
