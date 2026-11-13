import { useTranslation } from "react-i18next"
import type { ControlLine } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block. A pad has no digits, so it walks the pad row instead. */
export const useSudokuControls = (size: number): ControlLine[] => {
  const { t } = useTranslation("common")
  return [
    [{ keys: [arrows], pad: [pad("dpad")], label: t("sudoku.controls.move") }],
    [
      { keys: [key(`1–${size}`)], label: t("sudoku.controls.type") },
      { pad: [pad("lb"), pad("rb")], label: t("sudoku.controls.choose") },
      { pad: [pad("a")], label: t("sudoku.controls.place") },
    ],
    [
      { keys: [key("N")], pad: [pad("y")], label: t("sudoku.controls.pencil") },
      { keys: [key("Del")], label: t("sudoku.controls.erase") },
    ],
  ]
}
