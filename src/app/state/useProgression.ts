import { useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { createLedger, type Ledger, type LedgerState } from "@/game/ledger/ledger"

// No perk is stored here any more. Core owns the corridor detector's MEANING (a hidden corridor is
// core map structure — see collection-and-detector-design.md §7.1), but its level is derived from
// the treasures held, in mods/core/app/index.ts. Same for every other perk, each in its owning mod.
// See game/perkTotals.ts for why a perk is never banked in save state.

// The ledger starts empty and creates currency keys lazily on first grant — core seeds no
// currency id, so a mod owns which ids exist (shop's money, mosaic's mosaicPiece, …) while core
// owns the bucket. Health is NOT a ledger currency: it's trap-only, in the trap mod's own state.
const DEFAULT_LEDGER: LedgerState = {}

// The tomb-treasure loop (map pieces, tomb keys, tomb discovery) is NOT here — it's the
// tomb-treasure mod's own state (src/mods/tombTreasure/app/useTombTreasureProgress), so toggling
// that mod off drops all of it and core progression names none of its vocabulary.
type ProgressionState = {
  ledger: LedgerState
}

const initialState: ProgressionState = {
  ledger: DEFAULT_LEDGER,
}

export type ProgressionAPI = {
  // Generic id-keyed currency store — a mod grants/spends its own currency ids; core seeds none.
  ledger: Ledger
}

export const useProgression = (): ProgressionAPI => {
  const [state, setState] = useGameStorage<ProgressionState>("pyramid-scheme-progression-v4", initialState)

  return useMemo(() => {
    const ledger = createLedger(state.ledger ?? DEFAULT_LEDGER, updater =>
      setState(prev => ({ ...prev, ledger: updater(prev.ledger ?? DEFAULT_LEDGER) }))
    )
    return { ledger }
  }, [state, setState])
}
