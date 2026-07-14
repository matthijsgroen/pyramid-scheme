import { useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { createLedger, type Ledger, type LedgerState } from "@/game/ledger/ledger"

export type PerkState = {
  armorStacks: number // 0–2
  trapInsightStacks: number // 0–2
  packMuleLevel: number // 0–1
  compassLevel: number // 0–3
  consumableDetectorLevel: number // 0–3
  detectionLevel: number // 0–4
  scribesEyeLevel: number // 0–3
}

// Perks split by consuming mod (see src/game/perks) — trap keeps its own stacks plus the
// health cap, puzzle keeps scribesEye, core keeps the three detector perks. ProgressionAPI
// still exposes one merged `perks`/`maxHealth` shape; only the internal storage is split.
type TrapPerks = { armorStacks: number; trapInsightStacks: number; packMuleLevel: number; maxHealth: number }
type PuzzlePerks = { scribesEyeLevel: number }
type CorePerks = { compassLevel: number; consumableDetectorLevel: number; detectionLevel: number }

const INITIAL_TRAP_PERKS: TrapPerks = { armorStacks: 0, trapInsightStacks: 0, packMuleLevel: 0, maxHealth: 6 }
const INITIAL_PUZZLE_PERKS: PuzzlePerks = { scribesEyeLevel: 0 }
const INITIAL_CORE_PERKS: CorePerks = { compassLevel: 0, consumableDetectorLevel: 0, detectionLevel: 0 }

// The ledger starts empty and creates currency keys lazily on first grant — core seeds no
// currency id, so a mod owns which ids exist (shop's money, mosaic's mosaicPiece, …) while core
// owns the bucket. Health is NOT a ledger currency: it's trap-only, in the trap mod's own state.
const DEFAULT_LEDGER: LedgerState = {}

// The tomb-treasure loop (map pieces, tomb keys, tomb discovery) is NOT here — it's the
// tomb-treasure mod's own state (src/mods/tombTreasure/app/useTombTreasureProgress), so toggling
// that mod off drops all of it and core progression names none of its vocabulary.
type ProgressionState = {
  trapPerks: TrapPerks
  puzzlePerks: PuzzlePerks
  corePerks: CorePerks
  ledger: LedgerState
}

const initialState: ProgressionState = {
  trapPerks: INITIAL_TRAP_PERKS,
  puzzlePerks: INITIAL_PUZZLE_PERKS,
  corePerks: INITIAL_CORE_PERKS,
  ledger: DEFAULT_LEDGER,
}

export type ProgressionAPI = {
  perks: PerkState
  // Generic id-keyed currency store — a mod grants/spends its own currency ids; core seeds none.
  ledger: Ledger
}

export const useProgression = (): ProgressionAPI => {
  const [state, setState] = useGameStorage<ProgressionState>("pyramid-scheme-progression-v4", initialState)

  return useMemo(() => {
    const ledger = createLedger(state.ledger ?? DEFAULT_LEDGER, updater =>
      setState(prev => ({ ...prev, ledger: updater(prev.ledger ?? DEFAULT_LEDGER) }))
    )
    const trapPerks = state.trapPerks ?? INITIAL_TRAP_PERKS
    const puzzlePerks = state.puzzlePerks ?? INITIAL_PUZZLE_PERKS
    const corePerks = state.corePerks ?? INITIAL_CORE_PERKS

    return {
      // The perk system is disregarded pending its redesign (user decision): treasure-granted
      // stat perks (armor/max-health/pack-mule/trap-insight, compass/detector/detection,
      // scribes-eye) do nothing, so every perk stays at its baseline (maxHealth 6, armor 0, …).
      // The perk registry (src/game/perks) + registerPerks stay as dormant anchors for the
      // redesign. The tomb-key claim's applyTreasurePerk (now on the tomb-treasure mod) is the
      // stubbed grant; revive by restoring a registry-driven bump there.
      perks: {
        armorStacks: trapPerks.armorStacks,
        trapInsightStacks: trapPerks.trapInsightStacks,
        packMuleLevel: trapPerks.packMuleLevel,
        compassLevel: corePerks.compassLevel,
        consumableDetectorLevel: corePerks.consumableDetectorLevel,
        detectionLevel: corePerks.detectionLevel,
        scribesEyeLevel: puzzlePerks.scribesEyeLevel,
      },
      ledger,
    }
  }, [state, setState])
}
