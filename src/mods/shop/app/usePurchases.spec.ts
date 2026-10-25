// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { readModState } from "@/app/state/useModState"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import type { PurchaseTable } from "@/mods/shop/game/purchases"
import { mergeContributions } from "@/app/SiteMap/rewardContributions"
import { buyStockSlot } from "./fezShop/buyStockSlot"
import { purchaseRewardContribution, usePurchases } from "./usePurchases"

const table: PurchaseTable = [
  { id: "mule", fact: "purchase:mule", price: 10, soldAt: { journeyId: "tomb_a" }, opens: { tier: "expert" } },
  { id: "flag", fact: "purchase:flag", price: 20, soldAt: { journeyId: "tomb_b" } },
]

beforeEach(async () => {
  await clearGameData()
})

describe("usePurchases", () => {
  it("holds a recorded purchase's fact", async () => {
    const { result } = renderHook(() => usePurchases(table))
    await act(async () => result.current.record("mule"))
    expect(result.current.has("mule")).toBe(true)
    expect([...result.current.facts]).toEqual(["purchase:mule"])
  })

  it("stores version 1 and purchase ids only, each once", async () => {
    const { result } = renderHook(() => usePurchases(table))
    await act(async () => result.current.record("mule"))
    await act(async () => result.current.record("mule"))
    expect(readModState("shop")).toEqual({ version: 1, purchases: ["mule"] })
  })

  it("keeps the facts' identity while the save is unchanged", async () => {
    const { result, rerender } = renderHook(() => usePurchases(table))
    await act(async () => result.current.record("mule"))
    const facts = result.current.facts
    rerender()
    expect(result.current.facts).toBe(facts)
  })
})

describe("a save this build cannot read", () => {
  it("reads as nothing bought and survives a record untouched", async () => {
    const newer = { version: 2, purchases: ["mule"] }
    await writeGameData({ "pyramid-scheme-mod-shop": newer })
    const { result } = renderHook(() => usePurchases(table))
    await act(async () => result.current.record("flag"))
    expect(result.current.has("mule")).toBe(false)
    expect(result.current.facts.size).toBe(0)
    expect(readModState("shop")).toEqual(newer)
  })

  it("offers no purchase for sale, so a buy is refused and no money is taken", async () => {
    await writeGameData({ "pyramid-scheme-mod-shop": { version: 2, purchases: [] } })
    const { result } = renderHook(() => usePurchases(table))
    await act(async () => {})
    expect(result.current.loaded).toBe(true)
    expect(result.current.ready).toBe(false)
    const merged = mergeContributions([purchaseRewardContribution(result.current)])
    const reward = { type: "purchase", id: "mule" }
    expect(merged.skip(reward)).toBe(true)
    const spend = vi.fn(() => true)
    const apply = vi.fn()
    const bought = buyStockSlot({ price: 10, balance: 100, soldOut: merged.skip(reward), apply, spend, claim: vi.fn() })
    expect(bought).toBe(false)
    expect(spend).not.toHaveBeenCalled()
    expect(apply).not.toHaveBeenCalled()
  })
})

describe("a readable save", () => {
  it("is ready once read, so a purchase is for sale", async () => {
    const { result } = renderHook(() => usePurchases(table))
    await act(async () => {})
    expect(result.current.ready).toBe(true)
    expect(
      mergeContributions([purchaseRewardContribution(result.current)]).skip({ type: "purchase", id: "mule" })
    ).toBe(false)
  })
})

describe("the shop's held keys", () => {
  afterEach(() => {
    vi.doUnmock("@/mods/shop/game/purchases")
  })

  it("hold a recorded purchase's fact through the merged held keys", async () => {
    vi.resetModules()
    vi.doMock("@/mods/shop/game/purchases", async importOriginal => ({
      ...(await importOriginal<typeof import("@/mods/shop/game/purchases")>()),
      PURCHASES: table,
    }))
    await import("./index")
    const { useMergedHeldKeys } = await import("@/app/SiteMap/keyProviders")
    const { usePurchases: useShopPurchases } = await import("./usePurchases")
    const { result } = renderHook(() => ({ held: useMergedHeldKeys(), purchases: useShopPurchases() }))
    expect(result.current.held.has("purchase:mule")).toBe(false)
    await act(async () => result.current.purchases.record("mule"))
    expect(result.current.held.has("purchase:mule")).toBe(true)
  })
})
