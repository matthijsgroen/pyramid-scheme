import { useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { createLedger, type Ledger, type LedgerState } from "@/game/ledger/ledger"

// The only perk core owns is the corridor detector (a hidden corridor is core map structure — see
// collection-and-detector-design.md §7.1). The other perks live with their owning mod (trap owns
// max-health/armor/trap-insight/pack-mule/consumable-detector, hieroglyph owns compass, puzzle owns
// scribes-eye) so toggling a mod off drops its perks. `perks` here exposes only detection.
export type PerkState = { detectionLevel: number }

const DETECTION_CAP = 4

type CorePerks = { detectionLevel: number }
const INITIAL_CORE_PERKS: CorePerks = { detectionLevel: 0 }

// The ledger starts empty and creates currency keys lazily on first grant — core seeds no
// currency id, so a mod owns which ids exist (shop's money, mosaic's mosaicPiece, …) while core
// owns the bucket. Health is NOT a ledger currency: it's trap-only, in the trap mod's own state.
const DEFAULT_LEDGER: LedgerState = {}

// The tomb-treasure loop (map pieces, tomb keys, tomb discovery) is NOT here — it's the
// tomb-treasure mod's own state (src/mods/tombTreasure/app/useTombTreasureProgress), so toggling
// that mod off drops all of it and core progression names none of its vocabulary.
type ProgressionState = {
  corePerks: CorePerks
  ledger: LedgerState
}

const initialState: ProgressionState = {
  corePerks: INITIAL_CORE_PERKS,
  ledger: DEFAULT_LEDGER,
}

export type ProgressionAPI = {
  perks: PerkState
  // Grants the corridor-detector perk (toLevel bump, cap 4). Consumed by core's perk contribution.
  bumpDetection: (level: number) => void
  // Generic id-keyed currency store — a mod grants/spends its own currency ids; core seeds none.
  ledger: Ledger
}

export const useProgression = (): ProgressionAPI => {
  const [state, setState] = useGameStorage<ProgressionState>("pyramid-scheme-progression-v4", initialState)

  return useMemo(() => {
    const ledger = createLedger(state.ledger ?? DEFAULT_LEDGER, updater =>
      setState(prev => ({ ...prev, ledger: updater(prev.ledger ?? DEFAULT_LEDGER) }))
    )
    const corePerks = state.corePerks ?? INITIAL_CORE_PERKS

    return {
      perks: { detectionLevel: corePerks.detectionLevel ?? 0 },
      bumpDetection: level =>
        setState(prev => ({
          ...prev,
          corePerks: {
            detectionLevel: Math.min(
              DETECTION_CAP,
              Math.max((prev.corePerks ?? INITIAL_CORE_PERKS).detectionLevel ?? 0, level)
            ),
          },
        })),
      ledger,
    }
  }, [state, setState])
}
