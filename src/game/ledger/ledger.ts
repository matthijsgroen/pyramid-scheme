export type LedgerState = Record<string, number>

export type Ledger = {
  get: (id: string) => number
  grant: (id: string, amount: number) => void
  spend: (id: string, amount: number) => boolean // false if insufficient funds
}

// Wraps whatever flat state/setState pair a caller already has (e.g. one field of a
// larger React state blob) into id-keyed grant/spend — no currency-specific logic here.
export const createLedger = (
  state: LedgerState,
  setState: (updater: (prev: LedgerState) => LedgerState) => void
): Ledger => ({
  get: id => state[id] ?? 0,
  grant: (id, amount) => setState(prev => ({ ...prev, [id]: (prev[id] ?? 0) + amount })),
  spend: (id, amount) => {
    if ((state[id] ?? 0) < amount) return false
    setState(prev => ({ ...prev, [id]: (prev[id] ?? 0) - amount }))
    return true
  },
})
