import { describe, it, expect } from "vitest"
import { registerCurrency, getCurrencyMeta, allCurrencies } from "./currencyRegistry"

describe("currencyRegistry", () => {
  it("registers a currency and retrieves it by id", () => {
    registerCurrency({
      id: "testCoin",
      ownerMod: "test",
      displayName: "currency.testCoin",
      icon: "🪙",
      kind: "counter",
    })
    expect(getCurrencyMeta("testCoin")).toEqual({
      id: "testCoin",
      ownerMod: "test",
      displayName: "currency.testCoin",
      icon: "🪙",
      kind: "counter",
    })
  })

  it("returns undefined for an unregistered id", () => {
    expect(getCurrencyMeta("doesNotExist")).toBeUndefined()
  })

  it("allCurrencies lists every registered currency", () => {
    registerCurrency({
      id: "testGem",
      ownerMod: "test",
      displayName: "currency.testGem",
      icon: "💎",
      kind: "capped",
      total: 10,
    })
    expect(allCurrencies().some(c => c.id === "testGem")).toBe(true)
  })

  it("registering the same id again overwrites the previous entry", () => {
    registerCurrency({
      id: "testCoin",
      ownerMod: "test",
      displayName: "currency.testCoin",
      icon: "🪙",
      kind: "counter",
    })
    registerCurrency({
      id: "testCoin",
      ownerMod: "test2",
      displayName: "currency.testCoin2",
      icon: "🥇",
      kind: "counter",
    })
    expect(getCurrencyMeta("testCoin")?.ownerMod).toBe("test2")
  })
})
