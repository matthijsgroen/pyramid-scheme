import { use, type FC } from "react"
import { useTranslation } from "react-i18next"
import { useProgression } from "@/app/state/useProgression"
import { DevelopContext } from "@/contexts/DevelopMode"
import { ShopBalance } from "@/ui/atoms/ShopBalance"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"

// The shop mod's HUD widget: the money balance (plus a dev top-up). Reads money from the ledger
// via progression, so core renders it through the HUD registry without naming `money`.
export const ShopHud: FC = () => {
  const { t } = useTranslation("common")
  const { isDevelopMode } = use(DevelopContext)
  const progression = useProgression()
  return (
    <>
      <ShopBalance amount={progression.ledger.get("money")} label={t("money.label")} />
      {isDevelopMode && <DeveloperButton onClick={() => progression.ledger.grant("money", 1000)} label="+1000 Coins" />}
    </>
  )
}
