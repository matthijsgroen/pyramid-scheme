import { describe, expect, it } from "vitest"
import { sellableArtFrom } from "./sellableArt"

describe("sellableArtFrom", () => {
  const files = { "../../../assets/sellables/sell_stone_1.webp": "/sell_stone_1.webp" }

  it("returns the painted file of a sellable that has one", () => {
    expect(sellableArtFrom(files, "sell_stone_1")).toBe("/sell_stone_1.webp")
  })
  it("returns nothing for a sellable without one", () => {
    expect(sellableArtFrom(files, "sell_stone_2")).toBeUndefined()
  })
  it("returns nothing when no file is painted at all", () => {
    expect(sellableArtFrom({}, "sell_stone_1")).toBeUndefined()
  })
})
