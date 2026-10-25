// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, renderHook } from "@testing-library/react"
import { ALL_SELLABLES } from "@/data/sellables"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => (key === "collection.categories.junk" ? "🔷 Junk" : key) }),
}))

let inventory: Record<string, number | undefined> = {}
let loaded = true
vi.mock("@/app/Inventory/useInventory", () => ({ useInventory: () => ({ inventory, loaded }) }))

const { useShopTab } = await import("./collectionTab")

afterEach(cleanup)

describe("useShopTab", () => {
  it("is not shown and holds nothing with no sellable owned", () => {
    inventory = {}
    const { result } = renderHook(() => useShopTab())
    expect(result.current.shown).toBe(false)
    expect(result.current.ids).toEqual([])
  })

  it("lists the owned sellables and names itself without the emoji", () => {
    inventory = { [ALL_SELLABLES[0].id]: 1, [ALL_SELLABLES[1].id]: 3, "made-up-item": 2 }
    const { result } = renderHook(() => useShopTab())
    expect(result.current.shown).toBe(true)
    expect(result.current.ids).toEqual([ALL_SELLABLES[0].id, ALL_SELLABLES[1].id])
    expect(result.current.label).toBe("Junk")
  })

  it("follows the inventory's loaded flag", () => {
    loaded = false
    expect(renderHook(() => useShopTab()).result.current.loaded).toBe(false)
    loaded = true
    expect(renderHook(() => useShopTab()).result.current.loaded).toBe(true)
  })
})
