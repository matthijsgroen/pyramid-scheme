import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Gate } from "@/app/pages/allJourneys"
import type { GateNeed } from "@/app/pages/gateNeeds"
import type { TFn } from "@/app/SiteMap/rewardHandlerRegistry"
import { PURCHASES, requirementsFor, type PurchaseTable } from "@/mods/shop/game/purchases"

// The needs on a gate are the purchases world-gen gates it with (requirementsFor), so Alle reizen asks for
// exactly what the bake proved: one need per purchase opening the gate, met by holding its fact. The hint
// names the tomb whose Fez sells it.
export const purchaseGateNeeds = (table: PurchaseTable, t: TFn): ((gate: Gate) => GateNeed[]) => {
  const requirements = requirementsFor(table)
  return gate => {
    const facts =
      "tier" in gate
        ? requirements.tierGroups(gate.tier).flat()
        : requirements.entryLocks(gate.journeyId).map(lock => lock.bucket)
    return table
      .filter(p => facts.includes(p.fact))
      .map(p => ({
        key: p.fact,
        label: t(`purchases.${p.id}.need`),
        hint: t("purchases.hint", { place: t(`${p.soldAt.journeyId}.name`, { ns: "journeys" }) }),
      }))
  }
}

// One reader per table and language: the stable-reader contract of registerGateNeeds.
export const usePurchaseGateNeeds = (table: PurchaseTable = PURCHASES): ((gate: Gate) => GateNeed[]) => {
  const { t } = useTranslation(["common", "journeys"])
  return useMemo(() => purchaseGateNeeds(table, t), [table, t])
}
