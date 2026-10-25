// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { readModState } from "@/app/state/useModState"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import type { PurchaseTable } from "@/mods/shop/game/purchases"
import { usePurchases } from "./usePurchases"

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
})

describe("the shop's held keys", () => {
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
    vi.doUnmock("@/mods/shop/game/purchases")
  })
})
