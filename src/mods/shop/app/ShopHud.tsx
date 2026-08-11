import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { useProgression } from "@/app/state/useProgression"
import { ShopBalance } from "@/ui/atoms/ShopBalance"

// The shop mod's HUD widget: the money balance. Reads money from the ledger via progression, so
// core renders it through the HUD registry without naming `money`.
export const ShopHud: FC = () => {
  const { t } = useTranslation("common")
  const progression = useProgression()
  return <ShopBalance amount={progression.ledger.get("money")} label={t("money.label")} />
}
