import { describe, it, expect } from "vitest"
import { createLedger, type LedgerState } from "./ledger"

describe("createLedger", () => {
  it("get returns 0 for an id that was never granted", () => {
    const ledger = createLedger({}, () => {})
    expect(ledger.get("money")).toBe(0)
  })

  it("grant increases the value under that id via setState", () => {
    let state: LedgerState = { money: 10 }
    const ledger = createLedger(state, updater => {
      state = updater(state)
    })
    ledger.grant("money", 5)
    expect(state.money).toBe(15)
  })

  it("grant on an unset id starts from 0", () => {
    let state: Record<string, number> = {}
    const ledger = createLedger(state, updater => {
      state = updater(state)
    })
    ledger.grant("mosaicPiece", 2)
    expect(state.mosaicPiece).toBe(2)
  })

  it("spend succeeds and deducts when funds are sufficient", () => {
    let state: LedgerState = { money: 10 }
    const ledger = createLedger(state, updater => {
      state = updater(state)
    })
    const ok = ledger.spend("money", 4)
    expect(ok).toBe(true)
    expect(state.money).toBe(6)
  })

  it("spend fails and leaves state untouched when funds are insufficient", () => {
    let state: LedgerState = { money: 3 }
    const ledger = createLedger(state, updater => {
      state = updater(state)
    })
    const ok = ledger.spend("money", 4)
    expect(ok).toBe(false)
    expect(state.money).toBe(3)
  })

  it("grant/spend only ever touch the id they're given, leaving other ids untouched", () => {
    let state: LedgerState = { money: 10, health: 6 }
    const ledger = createLedger(state, updater => {
      state = updater(state)
    })
    ledger.grant("money", 1)
    expect(state.health).toBe(6)
  })
})
