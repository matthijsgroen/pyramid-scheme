// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, renderHook } from "@testing-library/react"
import { HIEROGLYPH_SYMBOLS } from "./hieroglyphSymbols"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const state = {
  inventory: {} as Record<string, number | undefined>,
  inventoryLoaded: true,
  fragments: {} as Record<string, number>,
  loaded: true,
}
const [a, b, c] = Object.keys(HIEROGLYPH_SYMBOLS)
vi.mock("@/app/Inventory/useInventory", () => ({
  useInventory: () => ({ inventory: state.inventory, loaded: state.inventoryLoaded }),
}))
vi.mock("./useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({
    hieroglyphFragments: state.fragments,
    hieroglyphProgress: (id: string) => ({ found: state.fragments[id] ?? 0, required: 3 }),
    loaded: state.loaded,
  }),
}))

const { useHieroglyphTab } = await import("./collectionTab")

const reset = () => Object.assign(state, { inventory: {}, inventoryLoaded: true, fragments: {}, loaded: true })
afterEach(() => {
  cleanup()
  reset()
})

describe("useHieroglyphTab", () => {
  it("is not shown and holds nothing with no fragment found", () => {
    const { result } = renderHook(() => useHieroglyphTab())
    expect(result.current.shown).toBe(false)
    expect(result.current.ids).toEqual([])
    expect(result.current.label).toBe("collection.tabs.hieroglyphs")
  })

  it("is shown for a partial hieroglyph but only lists the completed ones", () => {
    state.fragments = { [a]: 1 }
    const { result } = renderHook(() => useHieroglyphTab())
    expect(result.current.shown).toBe(true)
    expect(result.current.ids).toEqual([])
  })

  it("lists a hieroglyph with all its fragments and one held as an item", () => {
    state.fragments = { [a]: 3, [b]: 1 }
    state.inventory = { [c]: 1 }
    const { result } = renderHook(() => useHieroglyphTab())
    expect([...result.current.ids].sort()).toEqual([a, c].sort())
  })

  it("is loaded only once both its progress and the inventory are read", () => {
    state.loaded = false
    expect(renderHook(() => useHieroglyphTab()).result.current.loaded).toBe(false)
    state.loaded = true
    state.inventoryLoaded = false
    expect(renderHook(() => useHieroglyphTab()).result.current.loaded).toBe(false)
    state.inventoryLoaded = true
    expect(renderHook(() => useHieroglyphTab()).result.current.loaded).toBe(true)
  })
})
