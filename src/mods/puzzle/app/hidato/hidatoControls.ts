import { useTranslation } from "react-i18next"
import type { ControlStep } from "@/ui/molecules/ControlsBlock"
import { arrows, key, pad } from "@/ui/atoms/glyphs"

/** The keys and pad buttons for the controls block: the comb's six neighbours, then one run carried on. */
export const useHidatoControls = (): ControlStep[] => {
  const { t } = useTranslation("common")
  return [
    { keys: [arrows], pad: [pad("dpad")], label: t("hidato.controls.move") },
    { keys: [key("E"), key("X")], label: t("hidato.controls.right") },
    {
      keys: [key("Shift"), "+", key("↑"), key("↓")],
      pad: [pad("y"), "+", pad("dpad")],
      label: t("hidato.controls.right"),
    },
    { keys: [key("Enter")], pad: [pad("a")], label: t("hidato.controls.grab") },
    { keys: [arrows], pad: [pad("dpad")], label: t("hidato.controls.carry") },
    { keys: [key("Esc")], pad: [pad("b")], label: t("hidato.controls.drop") },
  ]
}
