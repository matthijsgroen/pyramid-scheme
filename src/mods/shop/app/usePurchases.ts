import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
import type { RewardContribution } from "@/app/SiteMap/rewardContributions"
import { PURCHASES, type PurchaseTable } from "@/mods/shop/game/purchases"
import {
  emptyPurchaseSave,
  heldFacts,
  isWritablePurchaseSave,
  readPurchaseSave,
  recordPurchase,
  updatePurchaseSave,
  type PurchaseSave,
} from "@/mods/shop/game/purchaseState"
import { purchaseRewardSchema } from "@/mods/shop/game/rewardSchemas"

export type PurchasesAPI = {
  /** True once the shop's own save has been read. */
  loaded: boolean
  /** True once the save is read and a purchase recorded now would be kept: only then is a purchase for sale. */
  ready: boolean
  save: PurchaseSave
  has: (id: string) => boolean
  record: (id: string) => Promise<unknown>
  /** The facts the purchases hold, one identity until the save changes. */
  facts: ReadonlySet<string>
}

// The shop's own store. Every read goes through readPurchaseSave, so a stored value of another shape reads
// as nothing bought; every change goes through updatePurchaseSave, which leaves such a value untouched.
export const usePurchases = (table: PurchaseTable = PURCHASES): PurchasesAPI => {
  const [stored, setStored, loaded] = useModState<unknown>("shop", emptyPurchaseSave)

  return useMemo(() => {
    const save = readPurchaseSave(stored)
    return {
      loaded,
      ready: loaded && isWritablePurchaseSave(stored),
      save,
      has: id => save.purchases.includes(id),
      record: id => setStored((prev: unknown) => updatePurchaseSave(prev, current => recordPurchase(current, id))),
      facts: heldFacts(save, table),
    }
  }, [stored, setStored, table, loaded])
}

// Buying a purchase records it. One already recorded is skipped, so Fez shows it sold out and it is never
// bought twice; so is every purchase while the save is unread or unreadable, so no money is taken for a
// purchase the save could not keep.
export const purchaseRewardContribution = (
  purchases: Pick<PurchasesAPI, "ready" | "has" | "record">
): RewardContribution => ({
  effects: { purchase: reward => void purchases.record(purchaseRewardSchema.parse(reward).id) },
  skip: reward =>
    reward.type === "purchase" && (!purchases.ready || purchases.has(purchaseRewardSchema.parse(reward).id)),
})
