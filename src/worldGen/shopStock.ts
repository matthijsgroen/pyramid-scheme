import type { SiteConfig, SubSection } from "./types"

// A mod's request to sell one of its currency pieces at a specific shop: place a fragmentSlot
// sentinel (tagged with the mod's own `prefers` bucket) into that shop's stock. The existing
// capped/gating currency pass then fills it exactly as it fills any other loot slot — so the
// shop's stock is a real, counted, detectable currency instance (moved out of the free-world
// spread, not added on top). Core places the sentinel but names no currency: `prefers` is
// mod-supplied data. `nth` disambiguates when a journey has more than one shop (default 0).
export type ShopStockAssignment = { journeyId: string; prefers: string; nth?: number }

// A shop section is a node whose gen-time-resolved encounter is fez-shop; assignEncounters seeded
// its `rewards[]` to the shop's capacity. Collect them in walk order so `nth` is stable.
// `levels` is a journey's SiteConfig[] (each SiteConfig is one level's FloorConfig[]).
const shopSectionsOf = (levels: SiteConfig[]): SubSection[] => {
  const shops: SubSection[] = []
  const walk = (section: SubSection & { sideSections?: SubSection[] }) => {
    if (section.encounter === "fez-shop") shops.push(section)
    section.sideSections?.forEach(walk)
  }
  for (const level of levels) for (const floor of level) for (const section of floor.sideSections) walk(section)
  return shops
}

// Places every mod's shop-stock sentinels into the next free slot of the addressed shop's stock
// array. Runs after assignEncounters (shops resolved + stock seeded) and before slot collection
// (so the sentinel is collected as a currency-fillable end slot). A missing shop (mod off / no
// shop authored at that address) drops the assignment silently — the piece stays in the free-world
// capped spread instead (the fallback the design calls for).
export const placeShopStock = (
  allConfigs: Record<string, SiteConfig[]>,
  assignments: readonly ShopStockAssignment[]
): void => {
  for (const { journeyId, prefers, nth = 0 } of assignments) {
    const shops = shopSectionsOf(allConfigs[journeyId] ?? [])
    const shop = shops[nth]
    if (!shop?.rewards) continue
    const free = shop.rewards.findIndex(r => r === undefined)
    if (free < 0) continue // shop full — over-subscribed; drop (design: author more capacity)
    shop.rewards[free] = { type: "fragmentSlot", prefers }
  }
}
