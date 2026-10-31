import { describe, expect, it, vi } from "vitest"
import { buyStockSlot } from "./buyStockSlot"

const slot = (over: Partial<Parameters<typeof buyStockSlot>[0]> = {}) => {
  const calls: string[] = []
  const input = {
    price: 10,
    balance: 20,
    soldOut: false,
    apply: vi.fn(() => void calls.push("apply")),
    spend: vi.fn(() => (calls.push("spend"), true)),
    claim: vi.fn(() => void calls.push("claim")),
    ...over,
  }
  return { input, calls }
}

describe(buyStockSlot, () => {
  it("applies the reward before it takes the money, then sells the slot out", () => {
    const { input, calls } = slot()
    expect(buyStockSlot(input)).toBe(true)
    expect(calls).toEqual(["apply", "spend", "claim"])
  })

  it("refuses a sold-out slot and writes nothing", () => {
    const { input, calls } = slot({ soldOut: true })
    expect(buyStockSlot(input)).toBe(false)
    expect(calls).toEqual([])
  })

  it("refuses a slot the balance cannot pay and writes nothing", () => {
    const { input, calls } = slot({ balance: 9 })
    expect(buyStockSlot(input)).toBe(false)
    expect(calls).toEqual([])
  })
})
